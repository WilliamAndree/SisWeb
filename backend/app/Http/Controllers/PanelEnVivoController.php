<?php

namespace App\Http\Controllers;

use App\Models\Autoevaluacion;
use App\Models\RespuestaAutoevaluacion;
use App\Models\Subsanacion;
use App\Services\ApplicabilityEngineService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Panel en vivo para proyectar en clase o en una capacitación: los locales que se
 * registran en las últimas horas aparecen solos, con su semáforo, lo que les falta
 * y lo que ya corrigieron. La página se refresca cada pocos segundos.
 */
class PanelEnVivoController extends Controller
{
    /** Horas hacia atrás que muestra el panel por defecto (una sesión de clase). */
    private const HORAS_POR_DEFECTO = 3;

    private const MAXIMO_LOCALES = 24;

    public function index(Request $request): Response
    {
        $horas = min(max((int) $request->integer('horas', self::HORAS_POR_DEFECTO), 1), 72);
        $desde = now()->subHours($horas);

        $locales = Autoevaluacion::query()
            ->with('user:id,name')
            ->where('created_at', '>=', $desde)
            ->latest()
            ->limit(self::MAXIMO_LOCALES)
            ->get();

        $corregidasPorLocal = Subsanacion::query()
            ->whereIn('autoevaluacion_id', $locales->pluck('id'))
            ->where('estado', 'SUBSANADO_DECLARADO')
            ->selectRaw('autoevaluacion_id, COUNT(DISTINCT codigo_item) as total, MAX(updated_at) as ultima')
            ->groupBy('autoevaluacion_id')
            ->get()
            ->keyBy('autoevaluacion_id');

        $conteos = RespuestaAutoevaluacion::query()
            ->whereIn('autoevaluacion_id', $locales->pluck('id'))
            ->where('estado_respuesta', '!=', ApplicabilityEngineService::ESTADO_NO_APLICA)
            ->get(['autoevaluacion_id', 'estado_respuesta', 'updated_at'])
            ->groupBy('autoevaluacion_id')
            ->map(fn ($respuestas): array => [
                'ultima' => $respuestas->max('updated_at'),
                'respondidas' => $respuestas->count(),
                'listas' => $respuestas->where('estado_respuesta', ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO)->count(),
                'faltan' => $respuestas->whereIn('estado_respuesta', [
                    ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
                    ApplicabilityEngineService::ESTADO_POR_REVISAR,
                ])->count(),
            ]);

        $tarjetas = $locales->map(fn (Autoevaluacion $local): array => [
            'uuid' => $local->uuid_trazabilidad,
            'nombre_comercio' => $local->nombre_comercio,
            'funcion_economica' => $local->funcion_economica,
            'distrito' => $local->distrito ?: $local->sector_huancayo,
            // Solo el primer nombre: se proyecta frente a la clase.
            'responsable' => $local->user ? strtok((string) $local->user->name, ' ') : null,
            'semaforo' => $local->semaforo,
            'porcentaje' => (float) ($local->porcentaje_cumplimiento ?? 0),
            // Conteo en vivo desde las respuestas (los totales guardados se recalculan al ver el resumen).
            'respondidas' => (int) ($conteos[$local->id]['respondidas'] ?? 0),
            'total' => (int) ($local->total_condiciones_evaluadas ?? 0),
            'listas' => (int) ($conteos[$local->id]['listas'] ?? 0),
            'faltan' => (int) ($conteos[$local->id]['faltan'] ?? 0),
            'corregidas' => (int) ($corregidasPorLocal[$local->id]->total ?? 0),
            'estado' => $local->estado,
            'creado' => $local->created_at?->toIso8601String(),
            // Última actividad: el local, su última respuesta o su última corrección.
            'actualizado' => collect([$local->updated_at, $conteos[$local->id]['ultima'] ?? null, $corregidasPorLocal[$local->id]->ultima ?? null])
                ->filter()
                ->map(fn ($fecha) => Carbon::parse($fecha))
                ->max()
                ?->toIso8601String(),
        ])->values();

        return Inertia::render('Admin/PanelEnVivo', [
            'locales' => $tarjetas,
            'horas' => $horas,
            'totales' => [
                'locales' => $tarjetas->count(),
                'listos' => $tarjetas->where('faltan', 0)->where('respondidas', '>', 0)->count(),
                'faltan' => $tarjetas->sum('faltan'),
                'corregidas' => $tarjetas->sum('corregidas'),
            ],
            'actualizado_a_las' => now()->format('H:i:s'),
        ]);
    }
}
