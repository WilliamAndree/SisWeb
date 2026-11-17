<?php

namespace App\Services;

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use App\Services\Evaluacion\IntegridadEvaluacionService;
use App\Services\Traits\ApplicabilityEvaluationHelpersTrait;
use Illuminate\Support\Collection;

class ApplicabilityEngineService
{
    use ApplicabilityEvaluationHelpersTrait;

    public function __construct(
        protected ?IntegridadEvaluacionService $integridadService = null
    ) {
        $this->integridadService ??= app(IntegridadEvaluacionService::class);
    }

    /**
     * Estados canónicos de respuesta autorizados por el modelo cerrado de CheckITSE.
     */
    public const ESTADO_CUMPLE_DECLARADO = 'CUMPLE_DECLARADO';

    public const ESTADO_PENDIENTE_ATENDER = 'PENDIENTE_ATENDER';

    public const ESTADO_POR_REVISAR = 'POR_REVISAR';

    public const ESTADO_NO_APLICA = 'NO_APLICA';

    public const ESTADOS_CANONICOS = [
        self::ESTADO_CUMPLE_DECLARADO,
        self::ESTADO_PENDIENTE_ATENDER,
        self::ESTADO_POR_REVISAR,
        self::ESTADO_NO_APLICA,
    ];

    /**
     * Estados que el ciudadano puede declarar directamente en su autoevaluación.
     * Recordatorio estricto: NO_APLICA NO es una opción seleccionable por el ciudadano;
     * es un estado asignado exclusivamente por el sistema.
     */
    public const RESPUESTAS_CIUDADANAS_PERMITIDAS = [
        self::ESTADO_CUMPLE_DECLARADO,
        self::ESTADO_PENDIENTE_ATENDER,
        self::ESTADO_POR_REVISAR,
    ];

    /**
     * Códigos oficiales congelados para el catálogo normativo de Huancayo.
     */
    public const CODIGOS_ACTIVOS = [
        'CRIT-01',
        'CRIT-02A',
        'CRIT-02B',
        'CRIT-03',
        'CRIT-04',
        'CRIT-05',
        'CRIT-06',
        'CRIT-07',
        'CRIT-08',
        'CRIT-10',
        'CRIT-11',
        'CRIT-13',
        'CRIT-14A',
    ];

    public const CODIGOS_SUSPENDIDOS = [
        'CRIT-09',
        'CRIT-12',
        'CRIT-14B',
        'CRIT-15',
        'CRIT-16',
        'CRIT-17',
    ];

    /**
     * Reglas declarativas para criterios condicionales gobernados por variables booleanas.
     *
     * @var array<string, array{campo: string, motivo_false: string, motivo_true: string, motivo_null: string}>
     */
    private const REGLAS_CRITERIOS_CONDICIONALES = [
        'CRIT-10' => [
            'campo' => 'usa_glp',
            'motivo_false' => 'El establecimiento declaró expresamente no utilizar GLP (usa_glp = false).',
            'motivo_true' => 'Aplica por declaración expresa de uso de GLP (usa_glp = true).',
            'motivo_null' => 'Información sobre GLP pendiente de declaración (usa_glp = null). NULL ≠ false y NULL ≠ NO_APLICA; se requiere información para determinar aplicabilidad.',
        ],
        'CRIT-02A' => [
            'campo' => 'tiene_equipos_fritura',
            'motivo_false' => 'El establecimiento declaró expresamente no contar con equipos de fritura ni cocción con aceites/grasas (tiene_equipos_fritura = false).',
            'motivo_true' => 'Aplica por declaración expresa de uso de equipos de fritura o cocción con aceites/grasas (tiene_equipos_fritura = true).',
            'motivo_null' => 'Información sobre equipos de fritura o cocción pendiente de declaración (tiene_equipos_fritura = null). NULL ≠ false y NULL ≠ NO_APLICA; se requiere información para determinar aplicabilidad.',
        ],
        'CRIT-11' => [
            'campo' => 'tiene_escaleras',
            'motivo_false' => 'El establecimiento declaró expresamente no contar con escaleras de circulación (tiene_escaleras = false).',
            'motivo_true' => 'Aplica por declaración expresa de existencia física de escaleras de circulación en el establecimiento (tiene_escaleras = true).',
            'motivo_null' => 'Información sobre existencia de escaleras de circulación pendiente de declaración (tiene_escaleras = null). NULL ≠ false y NULL ≠ NO_APLICA; no se infiere de pisos ni se asume aplicable automáticamente.',
        ],
        'CRIT-13' => [
            'campo' => 'tiene_estanterias_altas',
            'motivo_false' => 'El establecimiento declaró expresamente no contar con estanterías altas ni mobiliario con riesgo de volteo (tiene_estanterias_altas = false).',
            'motivo_true' => 'Aplica por declaración expresa de uso de estanterías, anaqueles o mobiliario alto con riesgo de volteo (tiene_estanterias_altas = true).',
            'motivo_null' => 'Información sobre estanterías o mobiliario alto pendiente de declaración (tiene_estanterias_altas = null). NULL ≠ false y NULL ≠ NO_APLICA; sin regla de altura métrica arbitraria ni aplicabilidad universal automática.',
        ],
    ];

    /**
     * Obtiene la lista oficial de estados canónicos.
     *
     * @return array<string>
     */
    public function getEstadosCanonicos(): array
    {
        return self::ESTADOS_CANONICOS;
    }

    /**
     * Verifica si una cadena corresponde a un estado canónico autorizado.
     */
    public function esEstadoCanonico(string $estado): bool
    {
        return in_array($estado, self::ESTADOS_CANONICOS, true);
    }

    /**
     * Verifica si un estado corresponde a una opción declarable por el ciudadano.
     * NO_APLICA retorna siempre false.
     */
    public function esRespuestaCiudadanaValida(string $estado): bool
    {
        return in_array($estado, self::RESPUESTAS_CIUDADANAS_PERMITIDAS, true);
    }

    /**
     * Obtiene los 19 criterios normativos del catálogo congelado.
     *
     * @return Collection<int, CriterioNormativo>
     */
    public function getCatalogoCompleto(): Collection
    {
        return CriterioNormativo::orderBy('orden')->orderBy('id')->get();
    }

    /**
     * Cache en memoria para los criterios activos.
     *
     * @var Collection<int, CriterioNormativo>|null
     */
    protected ?Collection $criteriosActivosCache = null;

    /**
     * Obtiene exclusivamente los 13 criterios normativos activos para autoevaluación.
     * Los 6 criterios suspendidos quedan excluidos de forma estricta.
     *
     * @return Collection<int, CriterioNormativo>
     */
    public function getCriteriosActivos(): Collection
    {
        if ($this->criteriosActivosCache !== null) {
            return $this->criteriosActivosCache;
        }

        return $this->criteriosActivosCache = CriterioNormativo::activos()
            ->ciudadanos()
            ->whereNotIn('codigo_criterio', self::CODIGOS_SUSPENDIDOS)
            ->orderBy('orden')
            ->orderBy('id')
            ->get();
    }

    /**
     * Limpia la caché en memoria de criterios activos.
     */
    public function clearCriteriosCache(): void
    {
        $this->criteriosActivosCache = null;
    }

    /**
     * Obtiene los 6 criterios suspendidos normativamente (fuera del checklist activo).
     *
     * @return Collection<int, CriterioNormativo>
     */
    public function getCriteriosSuspendidos(): Collection
    {
        return CriterioNormativo::suspendidos()
            ->orderBy('orden')
            ->orderBy('id')
            ->get();
    }

    /**
     * Determina si un criterio es evaluable por el motor de aplicabilidad.
     * Los 6 criterios suspendidos (activo = false) quedan totalmente excluidos del motor:
     * NO se evalúan, NO generan respuesta y NO deben convertirse en NO_APLICA.
     */
    public function esCriterioEvaluable(CriterioNormativo|string $criterio): bool
    {
        $codigo = $criterio instanceof CriterioNormativo ? $criterio->codigo_criterio : $criterio;
        $activo = $criterio instanceof CriterioNormativo ? (bool) $criterio->activo : true;

        if (! $activo || in_array($codigo, self::CODIGOS_SUSPENDIDOS, true)) {
            return false;
        }

        return in_array($codigo, self::CODIGOS_ACTIVOS, true);
    }

    /**
     * Evalúa la aplicabilidad de un criterio normativo frente al contexto del establecimiento.
     *
     * Reglas fundamentales de aplicabilidad:
     * 1. Separación de conceptos: "criterio activo" ≠ "criterio aplicable".
     * 2. Regla de valores desconocidos: NULL ≠ false ≠ NO_APLICA.
     * 3. CRIT-10 (GLP):
     *    - usa_glp === true  => aplicable
     *    - usa_glp === false => NO_APLICA
     *    - usa_glp === null  => requiere información (NO convertir a false ni a NO_APLICA)
     * 4. CRIT-02A (Clase K): Condicional gobernado por 'tiene_equipos_fritura' (?bool).
     * 5. CRIT-11 (Escaleras): Condicional gobernado por 'tiene_escaleras' (?bool). NO depende de 'pisos'.
     * 6. CRIT-13 (Estanterías): Condicional gobernado por 'tiene_estanterias_altas' (?bool). PROHIBIDA regla de 1.50 m.
     * 7. CRIT-05 (Puesta a tierra): Tipo C (declaración de constancia ≤25 Ω, sin medición física).
     * 8. Criterios suspendidos (activo = false): Quedan excluidos del motor antes de evaluar;
     *    no se evalúan, no generan respuesta y NO generan NO_APLICA.
     *
     * @param  Autoevaluacion|array<string, mixed>  $contexto
     * @return array<string, mixed>
     */
    public function evaluarCriterio(CriterioNormativo $criterio, Autoevaluacion|array $contexto): array
    {
        $codigo = $criterio->codigo_criterio;

        // Criterios suspendidos (activo = false):
        // NO se evalúan, NO generan respuesta y NO deben convertirse en NO_APLICA.
        if (! $this->esCriterioEvaluable($criterio)) {
            throw new \InvalidArgumentException("El criterio [{$codigo}] está suspendido normativamente (activo = false) y no forma parte del conjunto evaluable. No se evalúa ni genera NO_APLICA.");
        }

        $params = $this->normalizarContexto($contexto);

        if (isset(self::REGLAS_CRITERIOS_CONDICIONALES[$codigo])) {
            $regla = self::REGLAS_CRITERIOS_CONDICIONALES[$codigo];

            return $this->evaluarCriterioCondicional($criterio, $params[$regla['campo']], $regla);
        }

        if ($codigo === 'CRIT-05') {
            return $this->construirResultadoEvaluacion(
                $criterio,
                true,
                null,
                false,
                'Aplica universalmente a establecimientos con suministro eléctrico (Tipo C: declaración de constancia ≤25 Ω, sin medición física ni validación técnica por el sistema).',
                'TIPO_C'
            );
        }

        return $this->construirResultadoEvaluacion(
            $criterio,
            true,
            null,
            false,
            'Criterio de aplicación universal para establecimientos comerciales.'
        );
    }

    /**
     * Evalúa la aplicabilidad de los 13 criterios activos para una autoevaluación o contexto dado.
     *
     * @param  Autoevaluacion|array<string, mixed>  $contexto
     * @return Collection<string, array<string, mixed>>
     */
    public function evaluarAplicabilidad(Autoevaluacion|array $contexto): Collection
    {
        $criteriosActivos = $this->getCriteriosActivos();

        return $criteriosActivos->mapWithKeys(function (CriterioNormativo $criterio) use ($contexto) {
            return [$criterio->codigo_criterio => $this->evaluarCriterio($criterio, $contexto)];
        });
    }

    /**
     * Inicializa las respuestas de autoevaluación para los criterios activos evaluados.
     *
     * @return Collection<int, RespuestaAutoevaluacion>
     */
    public function inicializarRespuestas(Autoevaluacion $autoevaluacion): Collection
    {
        $evaluaciones = $this->evaluarAplicabilidad($autoevaluacion);
        $respuestas = collect();

        foreach ($evaluaciones as $eval) {
            if ($eval['aplicable'] === false && $eval['estado_sugerido'] === self::ESTADO_NO_APLICA) {
                $estadoInicial = self::ESTADO_NO_APLICA;
            } elseif ($eval['requiere_informacion'] === true) {
                $estadoInicial = self::ESTADO_POR_REVISAR;
            } else {
                $estadoInicial = self::ESTADO_PENDIENTE_ATENDER;
            }

            $respuesta = RespuestaAutoevaluacion::updateOrCreate(
                [
                    'autoevaluacion_id' => $autoevaluacion->id,
                    'criterio_id' => $eval['criterio_id'],
                ],
                [
                    'estado_respuesta' => $estadoInicial,
                    'notas_ciudadano' => ($estadoInicial === self::ESTADO_NO_APLICA || $estadoInicial === self::ESTADO_POR_REVISAR) ? $eval['motivo'] : null,
                ]
            );

            $respuestas->push($respuesta);
        }

        return $respuestas;
    }

    /**
     * Genera la estructura del checklist dinámico de autoevaluación clasificando
     * los 13 criterios activos en:
     * - criterios: evaluables con aplicable === true que deben ser mostrados al ciudadano.
     * - no_aplican: con aplicable === false, no se preguntan y quedan con estado NO_APLICA.
     * - informacion_pendiente: con aplicable === null (requiere_informacion = true).
     *
     * Los 6 criterios suspendidos quedan totalmente excluidos de las tres listas.
     *
     * @param  Autoevaluacion|array<string, mixed>  $contexto
     * @return array<string, mixed>
     */
    public function generarChecklistDinamico(Autoevaluacion|array $contexto): array
    {
        $evaluaciones = $this->evaluarAplicabilidad($contexto);
        $criteriosActivos = $this->getCriteriosActivos()->keyBy('codigo_criterio');
        $respuestasPrevias = $this->obtenerRespuestasIndexadas($contexto);

        $criteriosEvaluables = [];
        $noAplican = [];
        $informacionPendiente = [];

        foreach ($evaluaciones as $codigo => $eval) {
            /** @var CriterioNormativo|null $criterio */
            $criterio = $criteriosActivos->get($codigo);
            if (! $criterio) {
                continue;
            }

            $respuestaPrevia = $respuestasPrevias->get($criterio->id);

            if ($eval['aplicable'] === true) {
                $criteriosEvaluables[] = $this->construirItemCriterioEvaluable($criterio, $respuestaPrevia);
            } elseif ($eval['aplicable'] === false) {
                $noAplican[] = $this->construirItemCriterioNoAplica($criterio, $eval['motivo']);
            } else {
                $informacionPendiente[] = $this->construirItemInformacionPendiente($criterio, $eval['motivo'], $respuestaPrevia?->estado_respuesta);
            }
        }

        $autoevaluacionId = $contexto instanceof Autoevaluacion ? $contexto->id : ($contexto['autoevaluacion_id'] ?? null);
        $uuid = $contexto instanceof Autoevaluacion ? $contexto->uuid_trazabilidad : ($contexto['uuid'] ?? null);

        return [
            'autoevaluacion_id' => $autoevaluacionId,
            'uuid' => $uuid,
            'criterios' => $criteriosEvaluables,
            'no_aplican' => $noAplican,
            'informacion_pendiente' => $informacionPendiente,
            'resumen' => [
                'total_criterios_catalogo' => 19,
                'total_catalogo' => 19,
                'total_activos' => 13,
                'total_suspendidos' => 6,
                'criterios_aplicables' => count($criteriosEvaluables),
                'total_evaluables' => count($criteriosEvaluables),
                'criterios_no_aplican' => count($noAplican),
                'total_no_aplican' => count($noAplican),
                'criterios_requieren_informacion' => count($informacionPendiente),
                'total_pendientes' => count($informacionPendiente),
            ],
        ];
    }

    /**
     * Construye el resumen descriptivo y orientativo de la autoevaluación,
     * organizando las declaraciones ciudadanas en colecciones canónicas
     * y calculando conteos absolutos sin generar porcentajes, semáforos ni puntuaciones.
     *
     * @return array<string, mixed>
     */
    public function generarResumenDescriptivo(Autoevaluacion $autoevaluacion): array
    {
        $checklist = $this->generarChecklistDinamico($autoevaluacion);

        $pendienteAtender = [];
        $porRevisar = [];
        $cumpleDeclarado = [];

        foreach ($checklist['criterios'] as $criterio) {
            $estado = $criterio['estado'] ?? null;

            if ($estado === self::ESTADO_PENDIENTE_ATENDER) {
                $pendienteAtender[] = [
                    'codigo' => $criterio['codigo'],
                    'titulo' => $criterio['titulo'],
                    'pregunta_ciudadana' => $criterio['pregunta_ciudadana'] ?? null,
                    'que_observar' => $criterio['que_observar'] ?? $criterio['descripcion'],
                    'accion_mejora_orientativa' => $criterio['accion_mejora_orientativa'] ?? 'Revisar la condición técnica preventiva.',
                    'norma_base' => $criterio['norma_base'] ?? null,
                    'articulo_referencia' => $criterio['articulo_referencia'] ?? null,
                    'notas' => $criterio['notas'] ?? null,
                ];
            } elseif ($estado === self::ESTADO_POR_REVISAR) {
                $porRevisar[] = [
                    'codigo' => $criterio['codigo'],
                    'titulo' => $criterio['titulo'],
                    'que_observar' => $criterio['que_observar'] ?? $criterio['descripcion'],
                    'orientacion' => $criterio['accion_mejora_orientativa'] ?? 'Verificar las condiciones físicas o consultar con personal técnico competente.',
                    'norma_base' => $criterio['norma_base'] ?? null,
                    'articulo_referencia' => $criterio['articulo_referencia'] ?? null,
                    'notas' => $criterio['notas'] ?? null,
                ];
            } elseif ($estado === self::ESTADO_CUMPLE_DECLARADO) {
                $cumpleDeclarado[] = [
                    'codigo' => $criterio['codigo'],
                    'titulo' => $criterio['titulo'],
                    'declaracion' => 'Declarado por el ciudadano como cumplido.',
                    'norma_base' => $criterio['norma_base'] ?? null,
                    'articulo_referencia' => $criterio['articulo_referencia'] ?? null,
                    'notas' => $criterio['notas'] ?? null,
                ];
            }
        }

        $noAplica = [];
        foreach ($checklist['no_aplican'] as $cna) {
            $noAplica[] = [
                'codigo' => $cna['codigo'],
                'titulo' => $cna['titulo'],
                'motivo' => $cna['motivo'] ?? 'Condición no aplicable según las características físicas declaradas del establecimiento.',
                'norma_base' => $cna['norma_base'] ?? null,
                'articulo_referencia' => $cna['articulo_referencia'] ?? null,
            ];
        }

        return [
            'conteos' => [
                'total_criterios_aplicables' => count($checklist['criterios']),
                'total_cumple_declarado' => count($cumpleDeclarado),
                'total_pendiente_atender' => count($pendienteAtender),
                'total_por_revisar' => count($porRevisar),
                'total_no_aplica' => count($noAplica),
            ],
            'pendiente_atender' => $pendienteAtender,
            'por_revisar' => $porRevisar,
            'cumple_declarado' => $cumpleDeclarado,
            'no_aplica' => $noAplica,
        ];
    }

    /**
     * Registra o actualiza la declaración de un ciudadano sobre un criterio evaluable.
     *
     * Reglas estrictas:
     * - NO_APLICA no es una opción seleccionable por el ciudadano (arroja excepción si se envía).
     * - Criterios suspendidos no aceptan respuestas.
     * - Criterios no aplicables al establecimiento no aceptan respuestas ciudadanas.
     *
     * @throws \InvalidArgumentException
     */
    public function registrarRespuestaCiudadana(
        Autoevaluacion $autoevaluacion,
        string $codigoCriterio,
        string $estado,
        ?string $notas = null
    ): RespuestaAutoevaluacion {
        // 1. Prohibición estricta de NO_APLICA por el ciudadano
        if ($estado === self::ESTADO_NO_APLICA) {
            throw new \InvalidArgumentException('El estado NO_APLICA es asignado exclusivamente por el sistema y no puede ser seleccionado por el ciudadano.');
        }

        // 2. Validación de estado canónico ciudadano permitido
        if (! $this->esRespuestaCiudadanaValida($estado)) {
            throw new \InvalidArgumentException("Estado de respuesta no autorizado para declaración ciudadana: {$estado}.");
        }

        // 3. Obtener el criterio normativo
        /** @var CriterioNormativo $criterio */
        $criterio = CriterioNormativo::where('codigo_criterio', $codigoCriterio)->firstOrFail();

        // 4. Verificar que no esté suspendido
        if (! $this->esCriterioEvaluable($criterio)) {
            throw new \InvalidArgumentException("El criterio [{$codigoCriterio}] está suspendido normativamente y no acepta respuestas.");
        }

        // 5. Evaluar aplicabilidad frente al contexto del establecimiento
        $eval = $this->evaluarCriterio($criterio, $autoevaluacion);
        if ($eval['aplicable'] === false) {
            throw new \InvalidArgumentException("El criterio [{$codigoCriterio}] no aplica a este establecimiento ({$eval['motivo']}) y no puede ser respondido por el ciudadano.");
        }

        return RespuestaAutoevaluacion::updateOrCreate(
            [
                'autoevaluacion_id' => $autoevaluacion->id,
                'criterio_id' => $criterio->id,
            ],
            [
                'estado_respuesta' => $estado,
                'notas_ciudadano' => $notas,
            ]
        );
    }

    /**
     * Construye el contenido canónico estructurado y determinístico de una autoevaluación.
     * Excluye expresamente user_id, tokens de sesión y timestamps volátiles.
     *
     * @return array<string, mixed>
     */
    public function generarPayloadCanonico(Autoevaluacion $autoevaluacion): array
    {
        // Si la autoevaluación ya está registrada y posee snapshot histórico persistido,
        // este snapshot es la única fuente de verdad inmutable para el payload canónico.
        $snapshot = $this->obtenerSnapshotRegistrado($autoevaluacion);
        if ($snapshot !== null) {
            return $snapshot;
        }

        $payload = [
            'establecimiento' => $this->construirDatosEstablecimientoCanonico($autoevaluacion),
            'caracteristicas' => $this->construirCaracteristicasCanonicas($autoevaluacion),
            'criterios' => $this->construirListaCriteriosCanonicos($autoevaluacion),
        ];

        $this->normalizarArrayDeterminista($payload);

        return $payload;
    }

    /**
     * Serializa de forma canónica y determinística el payload de la autoevaluación.
     */
    public function generarJsonCanonico(Autoevaluacion $autoevaluacion): string
    {
        $payload = $this->generarPayloadCanonico($autoevaluacion);

        return $this->integridadService->generarJsonCanonico($payload);
    }

    /**
     * Calcula la huella criptográfica SHA-256 canónica de la autoevaluación registrada.
     */
    public function calcularHashIntegridad(Autoevaluacion $autoevaluacion): string
    {
        $payload = $this->generarPayloadCanonico($autoevaluacion);

        return $this->integridadService->calcularHashIntegridad($payload);
    }

    /**
     * Normaliza recursivamente las claves de arrays asociativos en orden alfabético estricto.
     */
    public function normalizarArrayDeterminista(array &$data): void
    {
        $this->integridadService->normalizarArrayDeterminista($data);
    }
}
