<?php

namespace App\Services\Evaluacion;

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use App\Services\ApplicabilityEngineService;
use App\Services\ItseRiskService;
use Illuminate\Support\Collection;

class EvaluacionSyncService
{
    public const ESTADO_CUMPLE_DECLARADO = ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO;

    public const ESTADO_PENDIENTE_ATENDER = ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER;

    public const ESTADO_POR_REVISAR = ApplicabilityEngineService::ESTADO_POR_REVISAR;

    public const ESTADO_NO_APLICA = ApplicabilityEngineService::ESTADO_NO_APLICA;

    public function __construct(
        protected ItseRiskService $riskService
    ) {}

    /**
     * Obtiene los datos consolidados y normalizados de la autoevaluación,
     * calculando en caliente las métricas normativas y contadores relacionales.
     *
     * @return array{
     *     area_techada: ?string,
     *     area_m2: ?float,
     *     aforo_estimado: ?int,
     *     aforo: ?int,
     *     numero_pisos: int,
     *     pisos: int,
     *     giro: ?string,
     *     funcion_economica: ?string,
     *     nombre_comercial: string,
     *     nombre_comercio: string,
     *     ruc: ?string,
     *     direccion: ?string,
     *     sector_huancayo: ?string,
     *     distrito: string,
     *     referencia: ?string,
     *     tipo_tramite: ?string,
     *     nivel_riesgo: ?string,
     *     uuid: string,
     *     uuid_trazabilidad: string,
     *     hash_integridad: ?string,
     *     estado: ?string,
     *     total_aplicables: int,
     *     total_condiciones: int,
     *     cumplen: int,
     *     conformes_iniciales: int,
     *     observados: int,
     *     por_subsanar: int,
     *     por_revisar: int,
     *     no_aplica: int,
     *     porcentaje_cumplimiento: float,
     *     estado_semaforo: string,
     *     semaforo: string,
     *     condiciones_evaluadas: list<array{
     *         codigo: string,
     *         titulo: string,
     *         especialidad: string,
     *         norma_referencial: string,
     *         estado_actual: string,
     *         notas: ?string
     *     }>,
     *     conteo_estados: array{
     *         total: int,
     *         cumple: int,
     *         no_cumple: int,
     *         por_revisar: int,
     *         na: int
     *     },
     *     resumen: array{
     *         total_condiciones: int,
     *         conformes_iniciales: int,
     *         subsanadas_declaradas: int,
     *         en_proceso: int,
     *         pendientes: int,
     *         gap_final: float,
     *         porcentaje_subsanado: int
     *     }
     * }
     */
    public function obtenerDatosCompletos(Autoevaluacion $autoevaluacion): array
    {
        $autoevaluacion->loadMissing(['respuestas.criterioNormativo']);

        $caracteristicas = is_array($autoevaluacion->caracteristicas_declaradas)
            ? $autoevaluacion->caracteristicas_declaradas
            : [];

        $datosFisicos = $this->extraerDatosFisicos($autoevaluacion, $caracteristicas);
        $metricas = $this->calcularMetricas($autoevaluacion);

        $uuid = (string) $autoevaluacion->uuid_trazabilidad;
        $gapFinal = round(max(0.0, 100.0 - $metricas['porcentaje_cumplimiento']), 1);
        $porcentajeSubsanado = ($metricas['observados'] === 0 && $metricas['por_revisar'] === 0 && $metricas['total_aplicables'] > 0)
            ? 100
            : (int) round($metricas['porcentaje_cumplimiento']);

        return [
            ...$datosFisicos,
            'uuid' => $uuid,
            'uuid_trazabilidad' => $uuid,
            'hash_integridad' => $autoevaluacion->hash_integridad,
            'estado' => $autoevaluacion->estado,
            'tipo_tramite' => $autoevaluacion->tipo_tramite,
            'nivel_riesgo' => $autoevaluacion->nivel_riesgo,
            'distrito' => $autoevaluacion->distrito ?? 'Huancayo',
            'sector_huancayo' => $autoevaluacion->sector_huancayo,
            'referencia' => $autoevaluacion->referencia,
            'total_aplicables' => $metricas['total_aplicables'],
            'total_condiciones' => $metricas['total_aplicables'],
            'cumplen' => $metricas['cumplen'],
            'conformes_iniciales' => $metricas['cumplen'],
            'observados' => $metricas['observados'],
            'por_subsanar' => $metricas['observados'],
            'por_revisar' => $metricas['por_revisar'],
            'no_aplica' => $metricas['no_aplica'],
            'porcentaje_cumplimiento' => $metricas['porcentaje_cumplimiento'],
            'estado_semaforo' => $metricas['estado_semaforo'],
            'semaforo' => $metricas['estado_semaforo'],
            'condiciones_evaluadas' => $metricas['condiciones_evaluadas'],
            'conteo_estados' => [
                'total' => count($metricas['condiciones_evaluadas']),
                'cumple' => $metricas['cumplen'],
                'no_cumple' => $metricas['observados'],
                'por_revisar' => $metricas['por_revisar'],
                'na' => $metricas['no_aplica'],
            ],
            'resumen' => [
                'total_condiciones' => $metricas['total_aplicables'],
                'conformes_iniciales' => $metricas['cumplen'],
                'subsanadas_declaradas' => 0,
                'en_proceso' => 0,
                'pendientes' => $metricas['observados'],
                'gap_final' => $gapFinal,
                'porcentaje_subsanado' => $porcentajeSubsanado,
            ],
        ];
    }

    /**
     * Extrae los datos físicos del establecimiento con sanitización y fallbacks.
     *
     * @param  array<string, mixed>  $caracteristicas
     * @return array<string, mixed>
     */
    private function extraerDatosFisicos(Autoevaluacion $autoevaluacion, array $caracteristicas): array
    {
        $areaTechada = $this->resolverAreaTechada($autoevaluacion, $caracteristicas);
        $aforoEstimado = $this->resolverAforoEstimado($autoevaluacion, $caracteristicas);
        $numeroPisos = $this->resolverNumeroPisos($autoevaluacion, $caracteristicas);

        $giro = $autoevaluacion->funcion_economica
            ?? $caracteristicas['giro']
            ?? $caracteristicas['funcion_economica']
            ?? null;

        $nombreComercial = (string) ($autoevaluacion->nombre_comercio
            ?? $caracteristicas['nombre_comercial']
            ?? $caracteristicas['nombre_comercio']
            ?? '');

        $ruc = $autoevaluacion->ruc ?? $caracteristicas['ruc'] ?? null;
        $direccion = $autoevaluacion->direccion ?? $caracteristicas['direccion'] ?? null;

        return [
            'area_techada' => $areaTechada,
            'area_m2' => $areaTechada !== null ? (float) $areaTechada : null,
            'aforo_estimado' => $aforoEstimado,
            'aforo' => $aforoEstimado,
            'numero_pisos' => $numeroPisos,
            'pisos' => $numeroPisos,
            'giro' => $giro ? (string) $giro : null,
            'funcion_economica' => $giro ? (string) $giro : null,
            'nombre_comercial' => $nombreComercial,
            'nombre_comercio' => $nombreComercial,
            'ruc' => $ruc ? (string) $ruc : null,
            'direccion' => $direccion ? (string) $direccion : null,
        ];
    }

    /**
     * Resuelve el área techada formateada sin literales 'null'.
     *
     * @param  array<string, mixed>  $caracteristicas
     */
    private function resolverAreaTechada(Autoevaluacion $autoevaluacion, array $caracteristicas): ?string
    {
        $raw = $autoevaluacion->area_m2
            ?? $caracteristicas['area_techada']
            ?? $caracteristicas['area_m2']
            ?? null;

        if ($raw === null || $raw === '' || $raw === 'null') {
            return null;
        }

        if (is_numeric($raw)) {
            $num = (float) $raw;

            return ((float) (int) $num === $num) ? (string) (int) $num : (string) $num;
        }

        return (string) $raw;
    }

    /**
     * Resuelve el aforo estimado sin literales 'null'.
     *
     * @param  array<string, mixed>  $caracteristicas
     */
    private function resolverAforoEstimado(Autoevaluacion $autoevaluacion, array $caracteristicas): ?int
    {
        $raw = $autoevaluacion->aforo
            ?? $caracteristicas['aforo_estimado']
            ?? $caracteristicas['aforo']
            ?? null;

        if ($raw === null || $raw === '' || $raw === 'null' || ! is_numeric($raw)) {
            return null;
        }

        return (int) $raw;
    }

    /**
     * Resuelve el número de pisos con fallback mínimo de 1.
     *
     * @param  array<string, mixed>  $caracteristicas
     */
    private function resolverNumeroPisos(Autoevaluacion $autoevaluacion, array $caracteristicas): int
    {
        $raw = $autoevaluacion->pisos
            ?? $caracteristicas['numero_pisos']
            ?? $caracteristicas['pisos']
            ?? 1;

        if ($raw === null || $raw === '' || $raw === 'null' || ! is_numeric($raw)) {
            return 1;
        }

        $pisos = (int) $raw;

        return $pisos > 0 ? $pisos : 1;
    }

    /**
     * Calcula contadores de la matriz de inspección y lista de condiciones.
     *
     * @return array{
     *     total_aplicables: int,
     *     cumplen: int,
     *     observados: int,
     *     por_revisar: int,
     *     no_aplica: int,
     *     porcentaje_cumplimiento: float,
     *     estado_semaforo: string,
     *     condiciones_evaluadas: list<array{
     *         codigo: string,
     *         titulo: string,
     *         especialidad: string,
     *         norma_referencial: string,
     *         estado_actual: string,
     *         notas: ?string
     *     }>
     * }
     */
    private function calcularMetricas(Autoevaluacion $autoevaluacion): array
    {
        $respuestas = $autoevaluacion->respuestas;

        if ($respuestas->isNotEmpty()) {
            return $this->procesarRespuestasVivas($respuestas);
        }

        $checklistRaw = is_array($autoevaluacion->detalle_checklist) ? $autoevaluacion->detalle_checklist : [];

        return $this->procesarChecklistLegacy($checklistRaw, $autoevaluacion);
    }

    /**
     * Procesa las respuestas vivas relacionales en respuestas_autoevaluacion.
     *
     * @param  Collection<int, RespuestaAutoevaluacion>  $respuestas
     * @return array<string, mixed>
     */
    private function procesarRespuestasVivas(Collection $respuestas): array
    {
        $cumplen = 0;
        $observados = 0;
        $porRevisar = 0;
        $noAplica = 0;
        $tieneRiesgoAlto = false;
        $condiciones = [];

        foreach ($respuestas as $resp) {
            $criterio = $resp->criterioNormativo;
            $estado = (string) $resp->estado_respuesta;
            $codigo = $criterio?->codigo_criterio ?? (string) ($resp->criterio_id ?? '');
            $titulo = $criterio?->titulo ?? $criterio?->pregunta_ciudadana ?? $codigo;
            $especialidad = $criterio?->categoria ?? 'Seguridad General';
            $norma = trim(($criterio?->norma_base ?? '').' '.($criterio?->articulo_referencia ?? ''));

            $condiciones[] = [
                'codigo' => $codigo,
                'titulo' => $titulo,
                'especialidad' => $especialidad,
                'norma_referencial' => $norma ?: 'Normativa ITSE / CENEPRED',
                'estado_actual' => $estado,
                'notas' => $resp->notas_ciudadano,
            ];

            if ($estado === self::ESTADO_CUMPLE_DECLARADO) {
                $cumplen++;
            } elseif ($estado === self::ESTADO_PENDIENTE_ATENDER) {
                $observados++;
                if ($this->esCriterioRiesgoAlto($criterio)) {
                    $tieneRiesgoAlto = true;
                }
            } elseif ($estado === self::ESTADO_POR_REVISAR) {
                $porRevisar++;
            } elseif ($estado === self::ESTADO_NO_APLICA) {
                $noAplica++;
            }
        }

        $totalAplicables = $cumplen + $observados + $porRevisar;
        $porcentaje = $totalAplicables > 0
            ? round(($cumplen / $totalAplicables) * 100, 1)
            : 100.0;

        $estadoSemaforo = $this->determinarSemaforo($porcentaje, $observados, $porRevisar, $tieneRiesgoAlto);

        return [
            'total_aplicables' => $totalAplicables,
            'cumplen' => $cumplen,
            'observados' => $observados,
            'por_revisar' => $porRevisar,
            'no_aplica' => $noAplica,
            'porcentaje_cumplimiento' => $porcentaje,
            'estado_semaforo' => $estadoSemaforo,
            'condiciones_evaluadas' => $condiciones,
        ];
    }

    /**
     * Procesa la matriz legacy de detalle_checklist cuando aún no existen respuestas relacionales.
     *
     * @param  list<array<string, mixed>>  $checklist
     * @return array<string, mixed>
     */
    private function procesarChecklistLegacy(array $checklist, Autoevaluacion $autoevaluacion): array
    {
        $categoriaPorCodigo = [
            'EXTINTOR_PQS' => 'INCENDIOS',
            'EXTINTOR_K' => 'INCENDIOS',
            'DETECTORES_HUMO' => 'INCENDIOS',
            'CAMPANA_EXTRACCION' => 'INCENDIOS',
            'DIFERENCIAL' => 'ELECTRICIDAD',
            'TERMOMAGNETICO' => 'ELECTRICIDAD',
            'TABLERO_MANDIL' => 'ELECTRICIDAD',
            'POZO_TIERRA' => 'ELECTRICIDAD',
            'CABLEADO_CANALIZADO' => 'ELECTRICIDAD',
            'EVACUACION' => 'EVACUACION',
            'PUERTAS_ESCAPE' => 'EVACUACION',
            'LUCES_EMERG' => 'EVACUACION',
            'SENALETICA' => 'EVACUACION',
            'AFORO_CARTEL' => 'EVACUACION',
            'BOTIQUIN' => 'ESTRUCTURAL_AUXILIOS',
            'ANCLAJE_ESTANTERIAS' => 'ESTRUCTURAL_AUXILIOS',
            'LAMINADO_VIDRIOS' => 'ESTRUCTURAL_AUXILIOS',
        ];

        $cumplen = 0;
        $observados = 0;
        $porRevisar = 0;
        $noAplica = 0;
        $tieneRiesgoAlto = false;
        $condiciones = [];

        foreach ($checklist as $item) {
            $estadoNormalizado = $this->normalizarEstadoLegacy($item);
            $codigo = (string) ($item['codigo'] ?? '');
            $titulo = (string) ($item['nombre'] ?? $item['titulo'] ?? $item['pregunta'] ?? $codigo);
            $especialidad = (string) ($item['categoria'] ?? ($categoriaPorCodigo[$codigo] ?? 'Seguridad General'));
            $norma = (string) ($item['norma'] ?? 'Normativa ITSE / CENEPRED');

            $condiciones[] = [
                'codigo' => $codigo,
                'titulo' => $titulo,
                'especialidad' => $especialidad,
                'norma_referencial' => $norma,
                'estado_actual' => $estadoNormalizado,
                'notas' => isset($item['notas']) ? (string) $item['notas'] : null,
            ];

            if ($estadoNormalizado === self::ESTADO_CUMPLE_DECLARADO) {
                $cumplen++;
            } elseif ($estadoNormalizado === self::ESTADO_PENDIENTE_ATENDER) {
                $observados++;
                if (! empty($item['es_critico'])) {
                    $tieneRiesgoAlto = true;
                }
            } elseif ($estadoNormalizado === self::ESTADO_POR_REVISAR) {
                $porRevisar++;
            } elseif ($estadoNormalizado === self::ESTADO_NO_APLICA) {
                $noAplica++;
            }
        }

        $totalAplicables = $cumplen + $observados + $porRevisar;
        $porcentaje = $totalAplicables > 0
            ? round(($cumplen / $totalAplicables) * 100, 1)
            : 100.0;

        $estadoSemaforo = filled($autoevaluacion->semaforo)
            ? (string) $autoevaluacion->semaforo
            : $this->determinarSemaforo($porcentaje, $observados, $porRevisar, $tieneRiesgoAlto);

        return [
            'total_aplicables' => $totalAplicables,
            'cumplen' => $cumplen,
            'observados' => $observados,
            'por_revisar' => $porRevisar,
            'no_aplica' => $noAplica,
            'porcentaje_cumplimiento' => $porcentaje,
            'estado_semaforo' => $estadoSemaforo,
            'condiciones_evaluadas' => $condiciones,
        ];
    }

    /**
     * Normaliza un estado legacy al canon de respuestas vivas.
     *
     * @param  array<string, mixed>  $item
     */
    private function normalizarEstadoLegacy(array $item): string
    {
        $estado = strtoupper((string) ($item['estado'] ?? ''));

        if ($estado === 'CUMPLE' || $estado === 'CUMPLE_DECLARADO' || (! empty($item['cumple']) && $estado !== 'NO_CUMPLE')) {
            return self::ESTADO_CUMPLE_DECLARADO;
        }

        if ($estado === 'NO_CUMPLE' || $estado === 'PENDIENTE_ATENDER' || (isset($item['cumple']) && ! $item['cumple'] && $estado !== 'POR_REVISAR' && $estado !== 'NA')) {
            return self::ESTADO_PENDIENTE_ATENDER;
        }

        if ($estado === 'POR_REVISAR') {
            return self::ESTADO_POR_REVISAR;
        }

        return self::ESTADO_NO_APLICA;
    }

    /**
     * Determina si el criterio normativo califica como riesgo alto o crítico.
     */
    private function esCriterioRiesgoAlto(?CriterioNormativo $criterio): bool
    {
        if (! $criterio) {
            return false;
        }

        $riesgo = strtoupper((string) $criterio->riesgo_asociado);
        $tipo = strtoupper((string) $criterio->tipo_criterio);

        return str_contains($riesgo, 'ALTO') || $tipo === 'CRITICO';
    }

    /**
     * Determina el semáforo normativo según porcentaje y condiciones pendientes.
     * Regla de negocio:
     * - VERDE: 100% de cumplimiento sin observaciones ni revisiones pendientes.
     * - ROJO: Riesgo alto crítico o porcentaje menor a 60%.
     * - AMBAR: Con observaciones subsanables o en rango preventivo intermedio.
     */
    private function determinarSemaforo(float $porcentaje, int $observados, int $porRevisar, bool $tieneRiesgoAlto): string
    {
        if ($porcentaje >= 100.0 && $observados === 0 && $porRevisar === 0) {
            return 'VERDE';
        }

        if ($tieneRiesgoAlto || $porcentaje < 60.0) {
            return 'ROJO';
        }

        return 'AMBAR';
    }
}
