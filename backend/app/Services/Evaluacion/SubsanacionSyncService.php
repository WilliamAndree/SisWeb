<?php

namespace App\Services\Evaluacion;

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use App\Models\Subsanacion;
use App\Services\ApplicabilityEngineService;
use Illuminate\Support\Collection;

/**
 * Única fuente de verdad entre lo que el emprendedor corrigió y el estado de su local.
 *
 * El emprendedor puede corregir una condición como quiera: comprando a un aliado de
 * CheckITSE o por su cuenta, y lo demuestra con una foto o con una descripción. Cada
 * corrección queda en `subsanaciones` (con su historial). Este servicio refleja esas
 * correcciones en las respuestas vivas (`respuestas_autoevaluacion`), que son las que
 * leen el resumen, el panel, el expediente y los anexos, y recalcula los totales.
 *
 * - Corrección declarada (SUBSANADO_DECLARADO) → la condición pasa a "cumple".
 * - Corrección que vuelve a "en proceso" o "pendiente" → la condición recupera su
 *   estado original, tomado de la foto sellada del registro (`payload_canonico`).
 *
 * La foto sellada y su hash nunca se modifican: siguen probando qué se declaró al inicio.
 */
class SubsanacionSyncService
{
    public const ESTADO_SUBSANADO = 'SUBSANADO_DECLARADO';

    public function __construct(private readonly EvaluacionSyncService $evaluacionSync) {}

    /**
     * @return array<string, mixed> Los datos completos ya recalculados (ver EvaluacionSyncService).
     */
    public function sincronizar(Autoevaluacion $autoevaluacion): array
    {
        $originales = $this->estadosOriginales($autoevaluacion);
        $respuestas = $autoevaluacion->respuestas()->get()->keyBy('criterio_id');

        foreach ($this->ultimaSubsanacionPorCondicion($autoevaluacion) as $codigo => $subsanacion) {
            $criterioId = $subsanacion->criterio_id ?? CriterioNormativo::where('codigo_criterio', $codigo)->value('id');
            if ($criterioId === null) {
                continue; // Ítems antiguos sin criterio normativo: viven solo en detalle_checklist.
            }

            $respuesta = $respuestas->get($criterioId);

            if ($subsanacion->estado === self::ESTADO_SUBSANADO) {
                $this->marcarCumple($autoevaluacion, (int) $criterioId, $respuesta, $subsanacion);
            } elseif ($respuesta?->estado_respuesta === ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO) {
                $this->restaurarOriginal($respuesta, $originales[$codigo] ?? null);
            }
        }

        return $this->recalcularTotales($autoevaluacion);
    }

    /**
     * Condiciones corregidas: una por código, según su corrección más reciente. Una misma
     * condición puede tener dos filas (corrección directa y la de la simulación): se cuenta una
     * vez, y si después se deshizo, ya no cuenta.
     *
     * @return Collection<int, string>
     */
    public function codigosCorregidos(Autoevaluacion $autoevaluacion): Collection
    {
        return $this->ultimaSubsanacionPorCondicion($autoevaluacion)
            ->filter(fn (Subsanacion $subsanacion): bool => $subsanacion->estado === self::ESTADO_SUBSANADO)
            ->keys()
            ->values();
    }

    /**
     * Guarda en la autoevaluación los totales que muestran el panel y el listado de locales.
     *
     * @return array<string, mixed>
     */
    public function recalcularTotales(Autoevaluacion $autoevaluacion): array
    {
        $autoevaluacion->unsetRelation('respuestas');
        $datos = $this->evaluacionSync->obtenerDatosCompletos($autoevaluacion);

        $autoevaluacion->forceFill([
            'total_condiciones_evaluadas' => $datos['total_aplicables'],
            'total_cumple_declarado' => $datos['cumplen'],
            'total_pendiente_atender' => $datos['por_subsanar'],
            'total_por_revisar' => $datos['por_revisar'],
            'total_no_aplica' => $datos['no_aplica'],
            'porcentaje_cumplimiento' => $datos['porcentaje_cumplimiento'],
            'semaforo' => $datos['estado_semaforo'],
        ])->save();

        return $datos;
    }

    /**
     * Si una condición se corrigió varias veces (por ejemplo, en el panel directo y en
     * la simulación), cuenta la corrección más reciente.
     *
     * @return Collection<string, Subsanacion>
     */
    private function ultimaSubsanacionPorCondicion(Autoevaluacion $autoevaluacion): Collection
    {
        $idsSimulaciones = $autoevaluacion->simulaciones()->pluck('id');

        return Subsanacion::query()
            ->where(fn ($consulta) => $consulta
                ->where('autoevaluacion_id', $autoevaluacion->id)
                ->orWhereIn('simulacion_revision_id', $idsSimulaciones))
            ->orderBy('updated_at')
            ->orderBy('id')
            ->get()
            ->keyBy('codigo_item');
    }

    /**
     * Estado con que se declaró cada condición al registrar la evaluación.
     *
     * @return array<string, string>
     */
    private function estadosOriginales(Autoevaluacion $autoevaluacion): array
    {
        $payload = is_array($autoevaluacion->payload_canonico)
            ? $autoevaluacion->payload_canonico
            : (array) json_decode((string) $autoevaluacion->payload_canonico, true);

        return collect($payload['criterios'] ?? [])
            ->filter(fn ($criterio): bool => is_array($criterio) && isset($criterio['codigo'], $criterio['estado_declarado']))
            ->mapWithKeys(fn (array $criterio): array => [$criterio['codigo'] => $criterio['estado_declarado']])
            ->all();
    }

    private function marcarCumple(Autoevaluacion $autoevaluacion, int $criterioId, ?RespuestaAutoevaluacion $respuesta, Subsanacion $subsanacion): void
    {
        $nota = 'Corregido: '.($subsanacion->descripcion ?: 'declarado por el titular.');

        if ($respuesta === null) {
            RespuestaAutoevaluacion::create([
                'autoevaluacion_id' => $autoevaluacion->id,
                'criterio_id' => $criterioId,
                'estado_respuesta' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
                'notas_ciudadano' => $nota,
            ]);

            return;
        }

        if ($respuesta->estado_respuesta !== ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO) {
            $respuesta->update([
                'estado_respuesta' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
                'notas_ciudadano' => $nota,
            ]);
        }
    }

    /**
     * Solo se revierte lo que estaba pendiente o por revisar al inicio: una condición que
     * ya cumplía desde el registro no se toca.
     */
    private function restaurarOriginal(RespuestaAutoevaluacion $respuesta, ?string $estadoOriginal): void
    {
        $pendientes = [ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER, ApplicabilityEngineService::ESTADO_POR_REVISAR];
        if (! in_array($estadoOriginal, $pendientes, true)) {
            return;
        }

        $respuesta->update(['estado_respuesta' => $estadoOriginal, 'notas_ciudadano' => null]);
    }
}
