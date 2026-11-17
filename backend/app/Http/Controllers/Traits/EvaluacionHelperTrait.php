<?php

namespace App\Http\Controllers\Traits;

use App\Exceptions\CodigoAccesoGenerationException;
use App\Http\Requests\StoreAutoevaluacionRequest;
use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RecursoEducativo;
use App\Services\ApplicabilityEngineService;
use App\Services\GeoLocationService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

trait EvaluacionHelperTrait
{
    public const MSG_NO_AUTORIZADO_CONSULTAR = 'No está autorizado para consultar esta autoevaluación.';

    public const MSG_NO_AUTORIZADO_ACCESO = 'No está autorizado para acceder a esta autoevaluación.';

    public const MSG_NO_AUTORIZADO_INFORME = 'No está autorizado para acceder a este informe.';

    public const MSG_NO_AUTORIZADO_REEVALUACION = 'No está autorizado para reevaluar esta autoevaluación.';

    public const MSG_SOLO_REGISTRADA_REEVALUACION = 'Solo es posible iniciar una reevaluación a partir de una autoevaluación registrada.';

    public const RUTA_API_PATTERN = 'api/*';

    public const CODIGO_ACCESO_ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

    public const CODIGO_ACCESO_LONGITUD = 6;

    public const CODIGO_ACCESO_PREFIJO = 'CHK-';

    public const FORMATO_FECHA = 'd/m/Y';

    public const CACHE_CONTROL_NO_STORE = 'no-cache, no-store, must-revalidate, max-age=0';

    public function storeReevaluacion(StoreAutoevaluacionRequest $request, string $uuid): RedirectResponse|JsonResponse
    {
        $request->merge(['evaluacion_origen_uuid' => $uuid]);

        return $this->store($request);
    }

    public function recursosCercanos(Request $request, string $codigo): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lon' => ['nullable', 'numeric', 'between:-180,180'],
            'radio' => ['nullable', 'numeric', 'between:1,50'],
        ]);

        $lat = isset($validated['lat']) ? (float) $validated['lat'] : GeoLocationService::latitudBase();
        $lon = isset($validated['lon']) ? (float) $validated['lon'] : GeoLocationService::longitudBase();
        $radio = isset($validated['radio']) ? (float) $validated['radio'] : 5.0;

        return response()->json(
            $this->geoLocationService->buscarProveedoresPorDeficiencia($codigo, $lat, $lon, $radio)
        );
    }

    /**
     * Genera la respuesta idempotente cuando la autoevaluación ya se encuentra registrada.
     */
    private function respuestaAutoevaluacionYaRegistrada(Request $request, Autoevaluacion $autoevaluacion): JsonResponse|RedirectResponse
    {
        if ($request->wantsJson() || $request->is(self::RUTA_API_PATTERN)) {
            return response()->json([
                'mensaje' => 'La autoevaluación ya se encuentra registrada y protegida contra modificaciones.',
                'estado' => $autoevaluacion->estado,
                'registrada_at' => $autoevaluacion->registrada_at?->toIso8601String(),
                'hash_integridad' => $autoevaluacion->hash_integridad,
                'uuid' => $autoevaluacion->uuid_trazabilidad,
            ], 200);
        }

        return redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad])
            ->with('info', 'La autoevaluación ya se encuentra registrada y protegida contra modificaciones.');
    }

    /**
     * Obtiene la lista de criterios aplicables sin declaración válida o con información física pendiente.
     *
     * @param  array<string, mixed>  $checklist
     * @return array<int, array<string, string>>
     */
    private function obtenerCriteriosPendientesParaCierre(array $checklist): array
    {
        $pendientes = [];

        foreach ($checklist['criterios'] as $criterio) {
            $estado = $criterio['estado'] ?? null;
            if (! in_array($estado, ApplicabilityEngineService::RESPUESTAS_CIUDADANAS_PERMITIDAS, true)) {
                $pendientes[] = [
                    'codigo' => $criterio['codigo'],
                    'titulo' => $criterio['titulo'],
                ];
            }
        }

        foreach ($checklist['informacion_pendiente'] as $criterio) {
            $pendientes[] = [
                'codigo' => $criterio['codigo'],
                'titulo' => $criterio['titulo'],
                'motivo' => $criterio['mensaje'] ?? 'Información física pendiente',
            ];
        }

        return $pendientes;
    }

    /**
     * Genera la respuesta de error o redirección cuando existen criterios pendientes al cerrar.
     *
     * @param  array<int, array<string, string>>  $pendientes
     */
    private function respuestaCriteriosPendientesCierre(
        Request $request,
        Autoevaluacion $autoevaluacion,
        array $pendientes
    ): JsonResponse|RedirectResponse {
        if ($request->wantsJson() || $request->is(self::RUTA_API_PATTERN)) {
            return response()->json([
                'error' => 'criterios_pendientes',
                'mensaje' => 'No es posible registrar la autoevaluación porque existen condiciones aplicables sin declaración.',
                'pendientes' => $pendientes,
            ], 422);
        }

        return redirect()->route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad])
            ->with('error', 'Existen condiciones pendientes de declaración antes de registrar su autoevaluación.');
    }

    /**
     * Modalidad de trámite que tendría la evaluación ante la ITSE, según el
     * D.S. N° 002-2018-PCM y la R.J. N° 016-2018-CENEPRED/J.
     *
     * Respeta el par `tipo_tramite`/`nivel_riesgo` ya persistido. Como el
     * clasificador heredado dejó de ejecutarse en el paso 1, las evaluaciones
     * nuevas lo tienen en NULL; en ese caso se recalcula aquí con
     * `ItseRiskService::clasificarTramite()`, que es la única implementación de
     * esa regla normativa, para no inventar una segunda en el frontend.
     *
     * Es informativo y no altera el expediente: no escribe en la base de datos,
     * no participa del semáforo de cumplimiento y no se registra como
     * clasificación oficial, porque esa solo corresponde al órgano competente.
     */
    protected function clasificarModalidadTramite(Autoevaluacion $autoevaluacion): array
    {
        if ($autoevaluacion->tipo_tramite && $autoevaluacion->nivel_riesgo) {
            return [
                'tipo_tramite' => (string) $autoevaluacion->tipo_tramite,
                'nivel_riesgo' => (string) $autoevaluacion->nivel_riesgo,
                'es_previa' => $autoevaluacion->tipo_tramite === 'EX_ANTE',
                'motivos' => [],
                'fuente' => 'registro',
            ];
        }

        $clasificacion = $this->riskService->clasificarTramite(
            (string) ($autoevaluacion->funcion_economica ?: 'Comercio'),
            $autoevaluacion->area_m2 !== null ? (float) $autoevaluacion->area_m2 : null,
            $autoevaluacion->pisos !== null ? (int) $autoevaluacion->pisos : null,
            $autoevaluacion->aforo !== null ? (int) $autoevaluacion->aforo : null,
            [
                'usaGlp' => (bool) $autoevaluacion->usa_glp,
                'galonesGlp' => (float) ($autoevaluacion->galones_glp ?? 0),
                'usaCaldero' => (bool) $autoevaluacion->usa_caldero,
                'usaLiquidosInflamables' => (bool) $autoevaluacion->usa_liquidos_inflamables,
            ],
        );

        return [
            'tipo_tramite' => (string) $clasificacion['tipo_tramite'],
            'nivel_riesgo' => (string) $clasificacion['nivel_riesgo'],
            'es_previa' => (bool) $clasificacion['es_bloqueante'],
            'motivos' => array_values((array) $clasificacion['motivos']),
            'fuente' => 'recalculado',
        ];
    }

    /**
     * Resuelve una autoevaluación por su UUID de trazabilidad o ID numérico.
     */
    protected function resolverAutoevaluacion(string $uuid): Autoevaluacion
    {
        return Autoevaluacion::with(['respuestas'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();
    }

    /**
     * Control de autorización estricto y consistente para acceso a la autoevaluación.
     */
    protected function autorizarAccesoAutoevaluacion(Request $request, Autoevaluacion $autoevaluacion, ?string $mensaje = null): void
    {
        $mensajeDenegado = $mensaje ?? self::MSG_NO_AUTORIZADO_ACCESO;

        // A. Evaluación vinculada a una cuenta registrada: solo su propietario autenticado puede acceder.
        // La excepción temporal de sesión inmediata jamás debe anular la propiedad de una cuenta.
        if ($autoevaluacion->user_id !== null) {
            $user = $request->user();
            if ($user === null || (int) $user->id !== (int) $autoevaluacion->user_id) {
                abort(403, $mensajeDenegado);
            }

            return;
        }

        // B. Evaluación anónima (user_id === null):
        // Un usuario autenticado no puede acceder a evaluaciones creadas como invitado (debe vincularlas primero).
        if ($request->user() !== null) {
            abort(403, $mensajeDenegado);
        }

        // 1. Excepción legítima de sesión inmediata: permitida únicamente si la evaluación
        //    está en estado borrador (INICIADA) y su UUID coincide con el autorizado en sesión.
        $esSesionInmediata = $request->hasSession()
            && $request->session()->get('guest_authorized_uuid') === $autoevaluacion->uuid_trazabilidad
            && $autoevaluacion->estado === Autoevaluacion::ESTADO_INICIADA;

        if ($esSesionInmediata) {
            return;
        }

        // 2. Credencial persistida de invitado: exige que session_token esté presente y no vacío,
        //    y que coincida exactamente vía hash_equals con la cookie o el token en sesión.
        if (filled($autoevaluacion->session_token)) {
            $tokenCookie = $request->cookie('guest_session_token');
            $tokenSesion = $request->hasSession() ? $request->session()->get('guest_session_token') : null;

            $tokenValido = (filled($tokenCookie) && hash_equals((string) $autoevaluacion->session_token, (string) $tokenCookie))
                || (filled($tokenSesion) && hash_equals((string) $autoevaluacion->session_token, (string) $tokenSesion));

            if ($tokenValido) {
                return;
            }
        }

        // Si session_token es nulo, vacío o no coincide, y no existe sesión inmediata válida, denegar.
        abort(403, $mensajeDenegado);
    }

    /**
     * Mapea un modelo RecursoEducativo al contrato esperado por los componentes React.
     *
     * @return array<string, mixed>
     */
    private function formatearRecursoEducativo(RecursoEducativo $recurso): array
    {
        return [
            'id' => $recurso->id,
            'criterio_normativo_id' => $recurso->criterio_normativo_id,
            'titulo' => $recurso->titulo,
            'descripcion_corta' => $recurso->descripcion_corta,
            'tipo' => $recurso->tipo,
            'url' => $recurso->url,
            'fuente_autor' => $recurso->fuente_autor,
            'duracion_estimada' => $recurso->duracion_estimada,
        ];
    }

    /**
     * Obtiene los recursos educativos activos agrupados por ID de criterio normativo.
     *
     * @param  Collection<int, int>  $criterioIds
     * @return Collection<int, Collection<int, RecursoEducativo>>
     */
    private function obtenerRecursosPorCriterioIds($criterioIds)
    {
        if ($criterioIds->isEmpty()) {
            return collect();
        }

        return RecursoEducativo::activos()
            ->whereIn('criterio_normativo_id', $criterioIds)
            ->orderBy('id')
            ->get()
            ->groupBy('criterio_normativo_id');
    }

    /**
     * Adjunta los recursos educativos activos al checklist dinámico para la interfaz ciudadana.
     *
     * @param  array<string, mixed>  $checklist
     * @return array<string, mixed>
     */
    private function adjuntarRecursosEducativosAChecklist(array $checklist): array
    {
        if (empty($checklist['criterios'])) {
            return $checklist;
        }

        $criterioIds = collect($checklist['criterios'])
            ->pluck('criterio_id')
            ->filter()
            ->unique()
            ->values();

        $recursosPorCriterio = $this->obtenerRecursosPorCriterioIds($criterioIds);

        foreach ($checklist['criterios'] as &$criterio) {
            $criterioId = $criterio['criterio_id'] ?? null;
            $recursos = $recursosPorCriterio->get($criterioId, collect());

            $criterio['recursos_educativos'] = $recursos->map(
                fn (RecursoEducativo $r) => $this->formatearRecursoEducativo($r)
            )->values()->all();
        }
        unset($criterio);

        return $checklist;
    }

    /**
     * Agrega el desglose de condiciones por disciplina técnica ITSE al resumen.
     *
     * Es puramente aditivo: no toca ninguna clave existente. El estado de cada
     * condición se deduce de la colección de la que proviene, porque
     * `generarResumenDescriptivo()` no expone `estado` dentro de cada ítem.
     * Las condiciones `NO_APLICA` quedan fuera del desglose por definición: no
     * son condiciones evaluadas.
     *
     * @param  array<string, mixed>  $resumenData
     * @return array<string, mixed>
     */
    private function adjuntarDesgloseEspecialidadesAResumen(array $resumenData): array
    {
        $estadoPorColeccion = [
            'pendiente_atender' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
            'por_revisar' => ApplicabilityEngineService::ESTADO_POR_REVISAR,
            'cumple_declarado' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
        ];

        $condiciones = [];
        foreach ($estadoPorColeccion as $coleccion => $estado) {
            foreach ($resumenData[$coleccion] ?? [] as $item) {
                $codigo = $item['codigo'] ?? null;

                if ($codigo === null || $codigo === '') {
                    continue;
                }

                $condiciones[] = ['codigo' => $codigo, 'estado' => $estado];
            }
        }

        $resumenData['desglose_especialidades'] = $this->directorioAliados->desglosePorEspecialidad($condiciones);

        return $resumenData;
    }

    /**
     * Adjunta los recursos educativos activos al resumen descriptivo para la interfaz ciudadana.
     * Los recursos se asignan exclusivamente a pendiente_atender, por_revisar y cumple_declarado.
     * no_aplica se mantiene estrictamente sin recursos educativos.
     *
     * @param  array<string, mixed>  $resumenData
     * @return array<string, mixed>
     */
    private function adjuntarRecursosEducativosAResumen(array $resumenData): array
    {
        $coleccionesConRecursos = ['pendiente_atender', 'por_revisar', 'cumple_declarado'];

        $codigos = collect($coleccionesConRecursos)
            ->flatMap(fn ($col) => collect($resumenData[$col] ?? [])->pluck('codigo'))
            ->filter()
            ->unique()
            ->values();

        if ($codigos->isEmpty()) {
            return $resumenData;
        }

        $criteriosNormativos = CriterioNormativo::whereIn('codigo_criterio', $codigos)
            ->pluck('id', 'codigo_criterio');

        $recursosPorCriterio = $this->obtenerRecursosPorCriterioIds($criteriosNormativos->values());

        foreach ($coleccionesConRecursos as $coleccion) {
            if (empty($resumenData[$coleccion])) {
                continue;
            }

            foreach ($resumenData[$coleccion] as &$item) {
                $codigo = $item['codigo'] ?? null;
                $criterioId = $criteriosNormativos->get($codigo);
                $recursos = $criterioId ? $recursosPorCriterio->get($criterioId, collect()) : collect();

                $item['recursos_educativos'] = $recursos->map(
                    fn (RecursoEducativo $r) => $this->formatearRecursoEducativo($r)
                )->values()->all();
            }
            unset($item);
        }

        return $resumenData;
    }

    /**
     * Adjunta el bloque de asistencia técnica de DirectorioAliadosService al resumen
     * descriptivo. Es el gemelo de adjuntarRecursosEducativosAResumen(): comparte las
     * mismas colecciones (pendiente_atender, por_revisar y cumple_declarado) y respeta
     * la regla de no_aplica estrictamente sin contenido.
     *
     * El payload viaja embebido en la página porque el directorio es un catálogo estático
     * en memoria: no justifica un endpoint adicional ni una consulta por criterio.
     *
     * @param  array<string, mixed>  $resumenData
     * @return array<string, mixed>
     */
    private function adjuntarAsistenciaTecnicaAResumen(array $resumenData): array
    {
        $coleccionesConAsistencia = ['pendiente_atender', 'por_revisar', 'cumple_declarado'];

        foreach ($coleccionesConAsistencia as $coleccion) {
            if (empty($resumenData[$coleccion])) {
                continue;
            }

            foreach ($resumenData[$coleccion] as &$item) {
                $item['asistencia_tecnica'] = $this->construirAsistenciaTecnica(
                    $item['codigo'] ?? null,
                    $item['titulo'] ?? null,
                    $item['norma_base'] ?? null,
                );
            }
            unset($item);
        }

        return $resumenData;
    }

    /**
     * Traduce un criterio del checklist al contrato que consume
     * NubeAsistenciaModal: guía de autoayuda, rango de costo y aliados sugeridos.
     *
     * @return array<string, mixed>|null
     */
    private function construirAsistenciaTecnica(?string $codigo, ?string $titulo, ?string $norma): ?array
    {
        if (blank($codigo)) {
            return null;
        }

        // El código que viaja al frontend es el del catálogo normativo (CRIT-xx) para
        // que el modal muestre el mismo identificador que el resto del resumen;
        // el servicio internamente lo traduce al código técnico ITSE.
        $codigoOriginal = $codigo;
        $resumen = $this->directorioAliados->obtenerPorCriterio($codigo);

        // Ofertas con precio publicadas por proveedores para este criterio. Si existen,
        // el costo aproximado sale de esos precios reales y no del catálogo referencial.
        $ofertas = $this->directorioAliados->ofertasPorCriterio($codigoOriginal);
        $rangoReal = $this->directorioAliados->rangoDesdeOfertas($ofertas);

        // Un criterio sin equivalente en el directorio (p. ej. GLP o calderas) igual
        // puede mostrar su guía de autoayuda y las ofertas que existan.
        if (! $resumen['criterio_conocido']) {
            return [
                'codigo' => $codigoOriginal,
                'titulo' => $titulo ?? $codigoOriginal,
                'norma' => $norma,
                'guia_autoayuda' => [],
                'rango_costo' => $rangoReal,
                'aliados' => [],
                'ofertas' => $ofertas,
            ];
        }

        return [
            'codigo' => $codigoOriginal,
            'titulo' => $titulo ?? $resumen['criterio'],
            'norma' => $norma ?? $resumen['norma'],
            'guia_autoayuda' => $resumen['guia_autoayuda'],
            'rango_costo' => $rangoReal ?? $resumen['rango_costo'],
            'aliados' => array_merge([$resumen['aliado']], $resumen['alternativas']),
            'ofertas' => $ofertas,
        ];
    }

    /**
     * Genera un identificador ciudadano único CHK-XXXXXX usando un alfabeto legible de 31 caracteres
     * con entropía criptográfica (random_int) y verificación previa de existencia.
     */
    private function generarCodigoAccesoUnico(): string
    {
        $alfabeto = self::CODIGO_ACCESO_ALFABETO;
        $maxIndex = strlen($alfabeto) - 1;

        do {
            $sufijo = '';
            for ($i = 0; $i < self::CODIGO_ACCESO_LONGITUD; $i++) {
                $sufijo .= $alfabeto[random_int(0, $maxIndex)];
            }
            $codigo = self::CODIGO_ACCESO_PREFIJO.$sufijo;
        } while (Autoevaluacion::where('codigo_acceso', $codigo)->exists());

        return $codigo;
    }

    /**
     * Determina si una QueryException corresponde a una violación de unicidad de codigo_acceso.
     */
    private function esColisionCodigoAcceso(QueryException $e): bool
    {
        $mensaje = $e->getMessage();

        return str_contains($mensaje, 'codigo_acceso')
            || str_contains($mensaje, 'autoevaluaciones_codigo_acceso_unique');
    }

    /**
     * Valida los permisos de reevaluación para usuario autenticado o invitado con credencial válida.
     */
    private function validarAutorizacionReevaluacion(Request $request, Autoevaluacion $evaluacion): void
    {
        if ($evaluacion->user_id !== null) {
            $user = $request->user();
            if ($user === null || (int) $user->id !== (int) $evaluacion->user_id) {
                abort(403, self::MSG_NO_AUTORIZADO_REEVALUACION);
            }

            return;
        }

        $tokenCookie = $request->cookie('guest_session_token');
        if (! filled($tokenCookie) || ! filled($evaluacion->session_token) || ! hash_equals((string) $evaluacion->session_token, (string) $tokenCookie)) {
            abort(403, self::MSG_NO_AUTORIZADO_REEVALUACION);
        }
    }

    /**
     * Verifica que la autoevaluación a reevaluar se encuentre en estado REGISTRADA.
     */
    private function verificarEstadoRegistradaParaReevaluacion(Request $request, Autoevaluacion $evaluacion): RedirectResponse|JsonResponse|null
    {
        if (! $evaluacion->estaRegistrada()) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'error' => 'evaluacion_no_registrada',
                    'mensaje' => self::MSG_SOLO_REGISTRADA_REEVALUACION,
                ], 422);
            }

            return redirect()->route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad])
                ->with('error', self::MSG_SOLO_REGISTRADA_REEVALUACION);
        }

        return null;
    }

    /**
     * Construye la estructura de datos precargados para iniciar una reevaluación.
     *
     * @return array<string, mixed>
     */
    private function construirDatosReevaluacion(Autoevaluacion $evaluacion, Autoevaluacion $origenRaiz): array
    {
        return [
            'uuid' => $origenRaiz->uuid_trazabilidad,
            'nombre_comercio' => $evaluacion->nombre_comercio,
            'funcion_economica' => $evaluacion->funcion_economica,
            'ruc' => $evaluacion->ruc,
            'direccion' => $evaluacion->direccion,
            'referencia' => $evaluacion->referencia,
            'area_m2' => $evaluacion->area_m2 !== null ? (string) $evaluacion->area_m2 : null,
            'pisos' => $evaluacion->pisos !== null ? (int) $evaluacion->pisos : null,
            'aforo' => $evaluacion->aforo !== null ? (int) $evaluacion->aforo : null,
            'usa_glp' => $evaluacion->usa_glp !== null ? (bool) $evaluacion->usa_glp : null,
            'galones_glp' => $evaluacion->galones_glp !== null ? (float) $evaluacion->galones_glp : null,
            'usa_caldero' => $evaluacion->usa_caldero !== null ? (bool) $evaluacion->usa_caldero : null,
            'usa_liquidos_inflamables' => $evaluacion->usa_liquidos_inflamables !== null ? (bool) $evaluacion->usa_liquidos_inflamables : null,
            'tiene_equipos_fritura' => $evaluacion->tiene_equipos_fritura,
            'tiene_escaleras' => $evaluacion->tiene_escaleras,
            'tiene_estanterias_altas' => $evaluacion->tiene_estanterias_altas,
            'fecha_anterior' => $evaluacion->created_at?->format(self::FORMATO_FECHA),
            'semaforo_anterior' => $evaluacion->semaforo,
        ];
    }

    /**
     * Resuelve el ID de la autoevaluación raíz de origen si se está creando una reevaluación.
     */
    private function resolverEvaluacionOrigenId(Request $request, array $validated): RedirectResponse|JsonResponse|int|null
    {
        if (empty($validated['evaluacion_origen_uuid'])) {
            return null;
        }

        $evaluacionOrigen = Autoevaluacion::where('uuid_trazabilidad', $validated['evaluacion_origen_uuid'])->firstOrFail();

        $this->validarAutorizacionReevaluacion($request, $evaluacionOrigen);

        $respuestaEstado = $this->verificarEstadoRegistradaParaReevaluacion($request, $evaluacionOrigen);
        if ($respuestaEstado !== null) {
            return $respuestaEstado;
        }

        // Si la evaluación referenciada ya es una reevaluación, se enlaza directamente a la evaluación original raíz
        // para evitar el encadenamiento A -> B -> C -> D y mantener el modelo estrella: A -> [B, C, D].
        return $evaluacionOrigen->evaluacion_origen_id ?? $evaluacionOrigen->id;
    }

    /**
     * Extrae y normaliza las características declaradas del comercio.
     *
     * @return array<string, mixed>
     */
    private function extraerCaracteristicasDeclaradas(array $validated): array
    {
        $usaGlp = array_key_exists('usa_glp', $validated) && $validated['usa_glp'] !== null ? (bool) $validated['usa_glp'] : null;
        $galonesGlp = array_key_exists('galones_glp', $validated) && $validated['galones_glp'] !== null ? (float) $validated['galones_glp'] : null;
        $usaCaldero = array_key_exists('usa_caldero', $validated) && $validated['usa_caldero'] !== null ? (bool) $validated['usa_caldero'] : null;
        $usaLiquidosInflamables = array_key_exists('usa_liquidos_inflamables', $validated) && $validated['usa_liquidos_inflamables'] !== null ? (bool) $validated['usa_liquidos_inflamables'] : null;
        $tieneEquiposFritura = array_key_exists('tiene_equipos_fritura', $validated) && $validated['tiene_equipos_fritura'] !== null ? (bool) $validated['tiene_equipos_fritura'] : null;
        $tieneEscaleras = array_key_exists('tiene_escaleras', $validated) && $validated['tiene_escaleras'] !== null ? (bool) $validated['tiene_escaleras'] : null;
        $tieneEstanteriasAltas = array_key_exists('tiene_estanterias_altas', $validated) && $validated['tiene_estanterias_altas'] !== null ? (bool) $validated['tiene_estanterias_altas'] : null;

        return [
            'area_m2' => $validated['area_m2'] ?? null,
            'pisos' => $validated['pisos'] ?? null,
            'aforo' => $validated['aforo'] ?? null,
            'usa_glp' => $usaGlp,
            'galones_glp' => $galonesGlp,
            'usa_caldero' => $usaCaldero,
            'usa_liquidos_inflamables' => $usaLiquidosInflamables,
            'tiene_equipos_fritura' => $tieneEquiposFritura,
            'tiene_escaleras' => $tieneEscaleras,
            'tiene_estanterias_altas' => $tieneEstanteriasAltas,
        ];
    }

    /**
     * Persiste la nueva autoevaluación con control de reintentos por colisión de código de acceso único.
     */
    private function crearAutoevaluacionConReintentos(
        Request $request,
        array $validated,
        ?int $evaluacionOrigenId,
        array $datosCreacion
    ): Autoevaluacion {
        $caracteristicasFiltradas = array_filter(
            $datosCreacion['caracteristicas_declaradas'] ?? [],
            fn ($val) => $val !== null
        );

        $maxIntentos = 3;
        $intento = 0;

        while ($intento < $maxIntentos) {
            $intento++;
            $codigoAcceso = $this->generarCodigoAccesoUnico();

            try {
                return Autoevaluacion::create([
                    'user_id' => Auth::id(),
                    'session_token' => $request->cookie('guest_session_token'),
                    'evaluacion_origen_id' => $evaluacionOrigenId,
                    'uuid_trazabilidad' => $datosCreacion['uuid'],
                    'codigo_acceso' => $codigoAcceso,
                    'estado' => Autoevaluacion::ESTADO_INICIADA,
                    'registrada_at' => null,
                    'hash_integridad' => $datosCreacion['hash_integridad'],
                    'nombre_comercio' => $validated['nombre_comercio'],
                    'funcion_economica' => $validated['funcion_economica'],
                    'ruc' => $validated['ruc'] ?? null,
                    'distrito' => $validated['distrito'] ?? 'Huancayo',
                    'direccion' => $validated['direccion'] ?? null,
                    'referencia' => $validated['referencia'] ?? null,
                    'area_m2' => $validated['area_m2'] ?? null,
                    'pisos' => $validated['pisos'] ?? null,
                    'aforo' => $validated['aforo'] ?? null,
                    'caracteristicas_declaradas' => $caracteristicasFiltradas,
                    'usa_glp' => $caracteristicasFiltradas['usa_glp'] ?? null,
                    'galones_glp' => $caracteristicasFiltradas['galones_glp'] ?? null,
                    'usa_caldero' => $caracteristicasFiltradas['usa_caldero'] ?? null,
                    'usa_liquidos_inflamables' => $caracteristicasFiltradas['usa_liquidos_inflamables'] ?? null,
                    'tiene_equipos_fritura' => $caracteristicasFiltradas['tiene_equipos_fritura'] ?? null,
                    'tiene_escaleras' => $caracteristicasFiltradas['tiene_escaleras'] ?? null,
                    'tiene_estanterias_altas' => $caracteristicasFiltradas['tiene_estanterias_altas'] ?? null,
                    'tipo_tramite' => null,
                    'nivel_riesgo' => null,
                    'porcentaje_cumplimiento' => $datosCreacion['porcentaje_cumplimiento'],
                    'semaforo' => $datosCreacion['semaforo'],
                    'detalle_checklist' => $datosCreacion['checklist'],
                    'plan_accion_costos' => null,
                ]);
            } catch (QueryException $e) {
                if ($this->esColisionCodigoAcceso($e) && $intento < $maxIntentos) {
                    continue;
                }
                throw $e;
            }
        }

        throw new CodigoAccesoGenerationException('No se pudo generar un código de acceso único para la autoevaluación.');
    }

    /**
     * Valida los permisos de acceso al resultado de una autoevaluación.
     */
    private function validarAutorizacionConsulta(Request $request, Autoevaluacion $autoevaluacion): void
    {
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion, self::MSG_NO_AUTORIZADO_CONSULTAR);
    }

    /**
     * Valida los permisos de acceso al informe preventivo.
     */
    private function validarAutorizacionInforme(Request $request, Autoevaluacion $autoevaluacion): void
    {
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion, self::MSG_NO_AUTORIZADO_INFORME);
    }

    /**
     * Construye la matriz de detalle enriquecida de la checklist para el informe.
     *
     * @return array<int, array<string, mixed>>
     */
    private function construirDetalleChecklistInforme(array $checklistRaw, Collection $nombresPorCodigo): array
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

        return collect($checklistRaw)->map(function ($item) use ($nombresPorCodigo, $categoriaPorCodigo) {
            $codigo = $item['codigo'] ?? '';
            $catalogoItem = $nombresPorCodigo->get($codigo);
            $estado = (string) ($item['estado'] ?? ($item['cumple'] ?? true ? 'CUMPLE' : 'NO_CUMPLE'));

            return [
                'codigo' => $codigo,
                'nombre' => $item['nombre'] ?? ($catalogoItem['nombre'] ?? $codigo),
                'categoria' => $item['categoria'] ?? ($categoriaPorCodigo[$codigo] ?? 'GENERAL'),
                'estado' => $estado,
                'cumple' => $estado === 'CUMPLE',
                'es_critico' => (bool) ($item['es_critico'] ?? ($catalogoItem['es_critico'] ?? false)),
                'norma' => $item['norma'] ?? ($catalogoItem['norma'] ?? 'Normativa ITSE / CENEPRED'),
            ];
        })->values()->all();
    }
}
