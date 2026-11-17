<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\EvaluacionHelperTrait;
use App\Models\Autoevaluacion;
use App\Models\SugerenciaEspacial;
use App\Models\VersionPlano;
use App\Services\Espacio\AnalisisEspacialService;
use App\Services\Espacio\GestionEspacialService;
use App\Services\Espacio\SugerenciaEspacialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use RuntimeException;

class PlanoEstablecimientoController extends Controller
{
    use EvaluacionHelperTrait;

    public function __construct(
        protected GestionEspacialService $gestionEspacialService,
        protected SugerenciaEspacialService $sugerenciaEspacialService,
        protected AnalisisEspacialService $analisisEspacialService
    ) {}

    /**
     * Muestra la pantalla del editor interactivo 2D del croquis preventivo ciudadano.
     */
    public function editor(string $uuid, Request $request): Response
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $plano = $this->gestionEspacialService->obtenerOInicializarPlano($autoevaluacion);
        try {
            $detalleActiva = $this->gestionEspacialService->obtenerDetalleVersionActiva($autoevaluacion);
        } catch (RuntimeException $e) {
            abort(409, $e->getMessage());
        }
        $plantillas = $this->gestionEspacialService->obtenerPlantillas();
        $sugerencias = $this->sugerenciaEspacialService->obtenerSugerencias($autoevaluacion);

        $historialVersiones = $plano->versiones()
            ->orderBy('numero_version', 'desc')
            ->get(['id', 'numero_version', 'hash_geometria_sha256', 'descripcion_cambio', 'cerrada_at', 'created_at'])
            ->map(fn (VersionPlano $v) => [
                'id' => $v->id,
                'numero_version' => $v->numero_version,
                'hash_geometria_sha256' => $v->hash_geometria_sha256,
                'descripcion_cambio' => $v->descripcion_cambio,
                'cerrada_at' => $v->cerrada_at?->toIso8601String(),
                'created_at' => $v->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        $sugerenciasPayload = $sugerencias->map(function (SugerenciaEspacial $s) use ($autoevaluacion) {
            return [
                'id' => $s->id,
                'uuid' => $s->uuid_sugerencia,
                'tipo_elemento' => $s->tipo_elemento,
                'nombre_detectado' => $s->nombre_detectado,
                'descripcion_observacion' => $s->descripcion_observacion,
                'nivel_confianza' => $s->nivel_confianza,
                'estado' => $s->estado,
                'motivo_rechazo' => $s->motivo_rechazo,
                'subsanacion_id' => $s->subsanacion_id,
                'evidencia_url' => route('autoevaluacion.evidencia', ['uuid' => $autoevaluacion->uuid_trazabilidad, 'subsanacion' => $s->subsanacion_id]),
                'hash_evidencia' => $s->hash_evidencia_analizada,
                'elemento_espacial_id' => $s->elemento_espacial_id,
                'generada_at' => $s->generada_at?->toIso8601String(),
                'resuelta_at' => $s->resuelta_at?->toIso8601String(),
            ];
        })->values()->all();

        $ultimoAnalisisModel = $autoevaluacion->analisisEspaciales()->first();
        $ultimoAnalisis = $ultimoAnalisisModel ? [
            'id' => $ultimoAnalisisModel->id,
            'uuid' => $ultimoAnalisisModel->uuid_analisis,
            'version_plano_id' => $ultimoAnalisisModel->version_plano_id,
            'numero_version' => $ultimoAnalisisModel->versionPlano?->numero_version,
            'hash_geometria_analizada' => $ultimoAnalisisModel->hash_geometria_analizada,
            'estado_ejecucion' => $ultimoAnalisisModel->estado_ejecucion,
            'es_vigente' => $ultimoAnalisisModel->esVigente(),
            'todos_ambientes_conectados' => $ultimoAnalisisModel->todos_ambientes_conectados,
            'total_ambientes' => $ultimoAnalisisModel->total_ambientes,
            'total_ambientes_conectados' => $ultimoAnalisisModel->total_ambientes_conectados,
            'total_conectores' => $ultimoAnalisisModel->total_conectores,
            'total_conectores_confirmados' => $ultimoAnalisisModel->total_conectores_confirmados,
            'total_conectores_sugeridos' => $ultimoAnalisisModel->total_conectores_sugeridos,
            'total_conectores_flotantes' => $ultimoAnalisisModel->total_conectores_flotantes,
            'total_conectores_indeterminados' => $ultimoAnalisisModel->total_conectores_indeterminados,
            'total_advertencias' => $ultimoAnalisisModel->total_advertencias,
            'resumen_conectividad' => $ultimoAnalisisModel->resumen_conectividad,
            'resultado_preventivo' => $ultimoAnalisisModel->resultado_preventivo,
            'elementos_declarados' => $ultimoAnalisisModel->elementos_declarados,
            'errores_integridad' => $ultimoAnalisisModel->errores_integridad,
            'analizado_at' => $ultimoAnalisisModel->analizado_at?->toIso8601String(),
        ] : null;

        return Inertia::render('Evaluacion/CroquisEditor', [
            'autoevaluacion' => [
                'id' => $autoevaluacion->id,
                'uuid' => $autoevaluacion->uuid_trazabilidad,
                'nombre_comercio' => $autoevaluacion->nombre_comercio,
                'funcion_economica' => $autoevaluacion->funcion_economica,
                'ruc' => $autoevaluacion->ruc,
                'direccion' => $autoevaluacion->direccion,
                'sector_huancayo' => $autoevaluacion->sector_huancayo,
                'area_m2' => $autoevaluacion->area_m2,
                'pisos' => $autoevaluacion->pisos,
                'aforo' => $autoevaluacion->aforo,
                'estado' => $autoevaluacion->estado,
                'hash_integridad' => $autoevaluacion->hash_integridad,
            ],
            'plano' => [
                'id' => $plano->id,
                'uuid' => $plano->uuid_plano,
                'estado' => $plano->estado,
                'version_activa_id' => $plano->version_activa_id,
            ],
            'versionActiva' => $detalleActiva,
            'plantillas' => $plantillas,
            'historialVersiones' => $historialVersiones,
            'sugerencias' => $sugerenciasPayload,
            'ultimoAnalisis' => $ultimoAnalisis,
        ]);
    }

    /**
     * Devuelve los datos del croquis en formato JSON para el editor o consumidores API.
     */
    public function datos(string $uuid, Request $request): JsonResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $plano = $this->gestionEspacialService->obtenerOInicializarPlano($autoevaluacion);
        try {
            $detalleActiva = $this->gestionEspacialService->obtenerDetalleVersionActiva($autoevaluacion);
        } catch (RuntimeException $e) {
            abort(409, $e->getMessage());
        }
        $plantillas = $this->gestionEspacialService->obtenerPlantillas();
        $sugerencias = $this->sugerenciaEspacialService->obtenerSugerencias($autoevaluacion);

        return response()->json([
            'plano' => [
                'uuid' => $plano->uuid_plano,
                'estado' => $plano->estado,
            ],
            'version_activa' => $detalleActiva,
            'plantillas' => $plantillas,
            'sugerencias' => $sugerencias,
        ]);
    }

    /**
     * Guarda transaccionalmente una nueva versión inmutable del croquis.
     */
    public function guardar(string $uuid, Request $request): JsonResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $request->validate([
            'geometria' => ['required', 'array'],
            'descripcion_cambio' => ['nullable', 'string', 'max:255'],
        ]);

        $plano = $this->gestionEspacialService->obtenerOInicializarPlano($autoevaluacion);

        $user = $request->user();
        $sessionToken = $autoevaluacion->session_token ?? (string) ($request->cookie('guest_session_token') ?? $request->cookie('checkitse_guest_token'));

        try {
            $versionGuardada = $this->gestionEspacialService->crearOActualizarVersion(
                $plano,
                $request->input('geometria'),
                $user,
                $sessionToken,
                $request->input('descripcion_cambio')
            );

            return response()->json([
                'success' => true,
                'message' => "Versión {$versionGuardada->numero_version} del croquis guardada con éxito.",
                'version' => [
                    'id' => $versionGuardada->id,
                    'numero_version' => $versionGuardada->numero_version,
                    'hash_geometria_sha256' => $versionGuardada->hash_geometria_sha256,
                    'cerrada_at' => $versionGuardada->cerrada_at?->toIso8601String(),
                    'created_at' => $versionGuardada->created_at?->toIso8601String(),
                ],
            ], 200);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Consulta una versión histórica específica del plano.
     */
    public function version(string $uuid, int $versionId, Request $request): JsonResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $plano = $this->gestionEspacialService->obtenerOInicializarPlano($autoevaluacion);

        $version = VersionPlano::where('plano_establecimiento_id', $plano->id)
            ->where('id', $versionId)
            ->firstOrFail();

        if (! $this->gestionEspacialService->verificarIntegridadCompleta($version)['valido']) {
            abort(409, 'La versión histórica del croquis presenta un fallo de integridad.');
        }

        return response()->json([
            'id' => $version->id,
            'numero_version' => $version->numero_version,
            'hash_geometria_sha256' => $version->hash_geometria_sha256,
            'esquema_version' => $version->esquema_version,
            'descripcion_cambio' => $version->descripcion_cambio,
            'geometria' => $version->geometria_normalizada,
            'cerrada_at' => $version->cerrada_at?->toIso8601String(),
            'created_at' => $version->created_at?->toIso8601String(),
        ]);
    }

    /**
     * Retorna la bandeja de sugerencias espaciales derivadas de la IA para la autoevaluación.
     */
    public function listarSugerencias(string $uuid, Request $request): JsonResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $sugerencias = $this->sugerenciaEspacialService->obtenerSugerencias($autoevaluacion);

        return response()->json([
            'sugerencias' => $sugerencias,
        ]);
    }

    /**
     * Confirma explícitamente una sugerencia visual e incorpora el elemento con ubicación manual elegida por el ciudadano.
     */
    public function confirmarSugerencia(string $uuid, int $sugerenciaId, Request $request): JsonResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $sugerencia = SugerenciaEspacial::where('autoevaluacion_id', $autoevaluacion->id)
            ->where('id', $sugerenciaId)
            ->firstOrFail();

        $request->validate([
            'codigo_ambiente' => ['required', 'string'],
            'posicion_x' => ['required', 'numeric', 'min:0'],
            'posicion_y' => ['required', 'numeric', 'min:0'],
            'observacion' => ['nullable', 'string', 'max:255'],
            'version_esperada_id' => ['nullable', 'integer'],
        ]);

        $user = $request->user();
        $sessionToken = $autoevaluacion->session_token ?? (string) ($request->cookie('guest_session_token') ?? $request->cookie('checkitse_guest_token'));

        try {
            $resultado = $this->sugerenciaEspacialService->confirmarYUbicacionManual(
                $sugerencia,
                [
                    'codigo_ambiente' => (string) $request->input('codigo_ambiente'),
                    'posicion_x' => (float) $request->input('posicion_x'),
                    'posicion_y' => (float) $request->input('posicion_y'),
                    'observacion' => $request->input('observacion'),
                    'version_esperada_id' => $request->input('version_esperada_id'),
                ],
                $user,
                $sessionToken
            );

            return response()->json([
                'success' => true,
                'message' => "Elemento [{$sugerencia->tipo_elemento}] confirmado y ubicado manualmente en el croquis (Versión {$resultado['version']->numero_version}).",
                'sugerencia' => $resultado['sugerencia'],
                'version' => [
                    'id' => $resultado['version']->id,
                    'numero_version' => $resultado['version']->numero_version,
                    'hash_geometria_sha256' => $resultado['version']->hash_geometria_sha256,
                    'geometria' => $resultado['version']->geometria_normalizada,
                ],
            ], 200);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        } catch (RuntimeException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 409);
        }
    }

    /**
     * Rechaza una sugerencia espacial sin alterar el modelo espacial ni crear elementos.
     */
    public function rechazarSugerencia(string $uuid, int $sugerenciaId, Request $request): JsonResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $sugerencia = SugerenciaEspacial::where('autoevaluacion_id', $autoevaluacion->id)
            ->where('id', $sugerenciaId)
            ->firstOrFail();

        $request->validate([
            'motivo' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $sessionToken = $autoevaluacion->session_token ?? (string) ($request->cookie('guest_session_token') ?? $request->cookie('checkitse_guest_token'));

        try {
            $sugerenciaActualizada = $this->sugerenciaEspacialService->rechazarSugerencia(
                $sugerencia,
                $request->input('motivo'),
                $user,
                $sessionToken
            );

            return response()->json([
                'success' => true,
                'message' => 'Sugerencia rechazada correctamente.',
                'sugerencia' => $sugerenciaActualizada,
            ], 200);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Confirma explícitamente un elemento ilustrativo de plantilla convirtiéndolo a DECLARADO_MANUAL.
     */
    public function confirmarElementoPlantilla(string $uuid, Request $request): JsonResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $request->validate([
            'codigo_ambiente' => ['required', 'string'],
            'indice_elemento' => ['required', 'integer', 'min:0'],
        ]);

        $plano = $this->gestionEspacialService->obtenerOInicializarPlano($autoevaluacion);
        $user = $request->user();
        $sessionToken = $autoevaluacion->session_token ?? (string) ($request->cookie('guest_session_token') ?? $request->cookie('checkitse_guest_token'));

        try {
            $nuevaVersion = $this->gestionEspacialService->confirmarElementoIlustrativo(
                $plano,
                (string) $request->input('codigo_ambiente'),
                (int) $request->input('indice_elemento'),
                $user,
                $sessionToken
            );

            return response()->json([
                'success' => true,
                'message' => 'Elemento confirmado como declaración ciudadana de existencia física.',
                'version' => [
                    'id' => $nuevaVersion->id,
                    'numero_version' => $nuevaVersion->numero_version,
                    'hash_geometria_sha256' => $nuevaVersion->hash_geometria_sha256,
                    'geometria' => $nuevaVersion->geometria_normalizada,
                ],
            ], 200);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Ejecuta el análisis espacial preventivo de conectividad sobre la versión activa del croquis.
     */
    public function ejecutarAnalisis(string $uuid, Request $request): JsonResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $plano = $this->gestionEspacialService->obtenerOInicializarPlano($autoevaluacion);
        $versionActiva = $plano->versionActiva;

        if (! $versionActiva) {
            return response()->json([
                'success' => false,
                'error' => 'El plano no cuenta con una versión activa para analizar. Guarda una versión primero.',
            ], 422);
        }

        if ((int) $versionActiva->plano_establecimiento_id !== (int) $plano->id) {
            abort(409, 'La versión activa no pertenece al plano autorizado.');
        }

        try {
            $analisis = $this->analisisEspacialService->ejecutarAnalisis($versionActiva);

            return response()->json([
                'success' => true,
                'message' => 'Análisis espacial preventivo ejecutado correctamente.',
                'analisis' => [
                    'id' => $analisis->id,
                    'uuid' => $analisis->uuid_analisis,
                    'version_plano_id' => $analisis->version_plano_id,
                    'numero_version' => $versionActiva->numero_version,
                    'hash_geometria_analizada' => $analisis->hash_geometria_analizada,
                    'estado_ejecucion' => $analisis->estado_ejecucion,
                    'es_vigente' => $analisis->esVigente(),
                    'todos_ambientes_conectados' => $analisis->todos_ambientes_conectados,
                    'total_ambientes' => $analisis->total_ambientes,
                    'total_ambientes_conectados' => $analisis->total_ambientes_conectados,
                    'total_conectores' => $analisis->total_conectores,
                    'total_conectores_confirmados' => $analisis->total_conectores_confirmados,
                    'total_conectores_sugeridos' => $analisis->total_conectores_sugeridos,
                    'total_conectores_flotantes' => $analisis->total_conectores_flotantes,
                    'total_conectores_indeterminados' => $analisis->total_conectores_indeterminados,
                    'total_advertencias' => $analisis->total_advertencias,
                    'resumen_conectividad' => $analisis->resumen_conectividad,
                    'resultado_preventivo' => $analisis->resultado_preventivo,
                    'elementos_declarados' => $analisis->elementos_declarados,
                    'errores_integridad' => $analisis->errores_integridad,
                    'analizado_at' => $analisis->analizado_at?->toIso8601String(),
                ],
            ], 200);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => 'Ocurrió un error al procesar el análisis espacial: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Devuelve el último análisis espacial preventivo generado para la autoevaluación.
     */
    public function ultimoAnalisis(string $uuid, Request $request): JsonResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $analisis = $autoevaluacion->analisisEspaciales()->first();

        if (! $analisis) {
            return response()->json([
                'analisis' => null,
            ]);
        }

        return response()->json([
            'analisis' => [
                'id' => $analisis->id,
                'uuid' => $analisis->uuid_analisis,
                'version_plano_id' => $analisis->version_plano_id,
                'numero_version' => $analisis->versionPlano?->numero_version,
                'hash_geometria_analizada' => $analisis->hash_geometria_analizada,
                'estado_ejecucion' => $analisis->estado_ejecucion,
                'es_vigente' => $analisis->esVigente(),
                'todos_ambientes_conectados' => $analisis->todos_ambientes_conectados,
                'total_ambientes' => $analisis->total_ambientes,
                'total_ambientes_conectados' => $analisis->total_ambientes_conectados,
                'total_conectores' => $analisis->total_conectores,
                'total_conectores_confirmados' => $analisis->total_conectores_confirmados,
                'total_conectores_sugeridos' => $analisis->total_conectores_sugeridos,
                'total_conectores_flotantes' => $analisis->total_conectores_flotantes,
                'total_conectores_indeterminados' => $analisis->total_conectores_indeterminados,
                'total_advertencias' => $analisis->total_advertencias,
                'resumen_conectividad' => $analisis->resumen_conectividad,
                'resultado_preventivo' => $analisis->resultado_preventivo,
                'elementos_declarados' => $analisis->elementos_declarados,
                'errores_integridad' => $analisis->errores_integridad,
                'analizado_at' => $analisis->analizado_at?->toIso8601String(),
            ],
        ]);
    }
}
