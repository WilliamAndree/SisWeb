<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\EvaluacionHelperTrait;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Http\Requests\StoreAutoevaluacionRequest;
use App\Http\Requests\StoreChecklistDeclaracionesRequest;
use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\EventoProveedor;
use App\Models\HistorialSubsanacion;
use App\Models\RespuestaAutoevaluacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Services\AI\AnalisisEvidenciaService;
use App\Services\ApplicabilityEngineService;
use App\Services\DirectorioAliadosService;
use App\Services\EstadisticasProveedorService;
use App\Services\Evaluacion\EvaluacionSyncService;
use App\Services\Evaluacion\EvidenciaPrivadaService;
use App\Services\Evaluacion\IntegridadEvaluacionService;
use App\Services\Evaluacion\SubsanacionSyncService;
use App\Services\GeoLocationService;
use App\Services\ItseRiskService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EvaluacionController extends Controller
{
    use EvaluacionHelperTrait;

    public const MSG_NO_AUTORIZADO_EVIDENCIA = 'No autorizado para consultar esta evidencia.';

    public const FORMATO_FECHA_HORA = 'd/m/Y H:i';

    public function __construct(
        protected ItseRiskService $riskService,
        protected GeoLocationService $geoLocationService,
        protected ApplicabilityEngineService $applicabilityEngine,
        protected DirectorioAliadosService $directorioAliados,
        protected EvaluacionSyncService $evaluacionSyncService,
        protected ?IntegridadEvaluacionService $integridadService = null,
        protected ?AnalisisEvidenciaService $analisisService = null
    ) {
        $this->integridadService ??= app(IntegridadEvaluacionService::class);
        $this->analisisService ??= app(AnalisisEvidenciaService::class);
    }

    private function subsanacionSync(): SubsanacionSyncService
    {
        return app(SubsanacionSyncService::class);
    }

    public function index(): Response
    {
        return Inertia::render('Evaluacion/Home', [
            'catalogo' => $this->riskService->getCatalogoChecklist(),
        ]);
    }

    public function nueva(): Response
    {
        return Inertia::render('Evaluacion/Nueva', [
            'catalogo' => $this->riskService->getCatalogoChecklist(),
        ]);
    }

    public function iniciarReevaluacion(Request $request, string $uuid): Response|RedirectResponse|JsonResponse
    {
        $evaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();

        $this->validarAutorizacionReevaluacion($request, $evaluacion);

        $respuestaEstado = $this->verificarEstadoRegistradaParaReevaluacion($request, $evaluacion);
        if ($respuestaEstado !== null) {
            return $respuestaEstado;
        }

        // Si se solicita reevaluar sobre una evaluación que ya es una reevaluación,
        // se resuelve la referencia hacia la evaluación original raíz para evitar encadenamiento
        $origenRaiz = $evaluacion->evaluacion_origen_id ? ($evaluacion->evaluacionOrigen ?? $evaluacion) : $evaluacion;

        return Inertia::render('Evaluacion/Nueva', [
            'catalogo' => $this->riskService->getCatalogoChecklist(),
            'reevaluacionDe' => $this->construirDatosReevaluacion($evaluacion, $origenRaiz),
        ]);
    }

    public function store(StoreAutoevaluacionRequest $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validated();

        $evaluacionOrigenId = $this->resolverEvaluacionOrigenId($request, $validated);
        if ($evaluacionOrigenId instanceof RedirectResponse || $evaluacionOrigenId instanceof JsonResponse) {
            return $evaluacionOrigenId;
        }

        // Normalización: los estados declarados son la fuente de verdad; la
        // marca booleana `cumple` se deriva para evitar inconsistencias entre
        // ambos campos cuando el cliente los envía contradictorios.
        $checklist = collect($request->input('checklist', []))->map(function (array $item): array {
            $estado = (string) ($item['estado'] ?? '');

            return array_merge($item, ['cumple' => $estado === 'CUMPLE']);
        })->values()->all();

        $porcentajeCumplimiento = 0.0;
        $semaforo = 'PENDIENTE';

        // En el nuevo flujo dinámico (Bloque 3), no se calcula conformidad ni semáforo en la creación.
        // Soporte transicional legacy: solo si la petición incluye explícitamente una checklist antigua con ítems,
        // se calcula conformidad para preservar módulos y tests históricos aislados.
        if (! empty($checklist)) {
            $conformidad = $this->riskService->calcularConformidad($checklist);
            $porcentajeCumplimiento = $conformidad['porcentaje'];
            $semaforo = $conformidad['semaforo'];
        }

        $uuid = (string) Str::uuid();
        $hashIntegridad = ! empty($checklist) ? hash('sha256', $uuid.($validated['ruc'] ?? '').Carbon::now()->timestamp) : null;

        $caracteristicasDeclaradas = $this->extraerCaracteristicasDeclaradas($validated);

        $datosCreacion = [
            'uuid' => $uuid,
            'hash_integridad' => $hashIntegridad,
            'caracteristicas_declaradas' => $caracteristicasDeclaradas,
            'porcentaje_cumplimiento' => $porcentajeCumplimiento,
            'semaforo' => $semaforo,
            'checklist' => $checklist,
        ];

        $autoevaluacion = $this->crearAutoevaluacionConReintentos(
            $request,
            $validated,
            $evaluacionOrigenId,
            $datosCreacion
        );

        if (Auth::guest()) {
            $request->session()->put('guest_authorized_uuid', $autoevaluacion->uuid_trazabilidad);
            if ($autoevaluacion->session_token) {
                $request->session()->put('guest_session_token', $autoevaluacion->session_token);
            }
        }

        $mensaje = $evaluacionOrigenId !== null
            ? 'Reevaluación preventiva iniciada. Actualiza tus declaraciones para el local.'
            : 'Autoevaluación iniciada correctamente.';

        return redirect()->route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad])
            ->with('success', $mensaje);
    }

    public function resultado(Request $request, string $uuid): Response|RedirectResponse
    {
        $autoevaluacion = Autoevaluacion::with(['simulaciones.subsanaciones', 'evaluacionOrigen', 'reevaluaciones'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        $this->validarAutorizacionConsulta($request, $autoevaluacion);

        // Desacoplamiento UX-06.2: Si la autoevaluación pertenece al flujo V2 normativo,
        // se redirige dinámicamente con HTTP 302 hacia la pantalla oficial de resumen descriptivo,
        // evitando la exposición indebida de semáforos, porcentajes, costos y simulación in situ.
        if ($autoevaluacion->esFlujoNuevo()) {
            return redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad], 302);
        }

        return Inertia::render('Evaluacion/Resultado', [
            'autoevaluacion' => $autoevaluacion,
            'catalogo' => $this->riskService->getCatalogoChecklist(),
        ]);
    }

    public function simulacionRevision(Request $request, string $uuid): Response
    {
        $autoevaluacion = Autoevaluacion::with(['simulaciones.subsanaciones'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        return Inertia::render('Evaluacion/SimulacionRevision', [
            'autoevaluacion' => $autoevaluacion,
        ]);
    }

    public function guardarSimulacion(Request $request, string $uuid): RedirectResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $validated = $request->validate([
            'verificaciones' => 'required|array',
            'discrepancias' => 'required|integer|min:0',
        ]);

        $verificaciones = $validated['verificaciones'];
        $checklist = $autoevaluacion->detalle_checklist;

        $totalEvaluables = 0;
        $totalConformeEnRevision = 0;

        foreach ($checklist as $item) {
            $codigo = $item['codigo'];
            $estadoDeclarado = $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE');

            if ($estadoDeclarado !== 'NA') {
                $totalEvaluables++;
                $conformeEnCampo = ! empty($verificaciones[$codigo]);
                if ($conformeEnCampo) {
                    $totalConformeEnRevision++;
                }
            }
        }

        $porcentajeRevision = $totalEvaluables > 0
            ? round(($totalConformeEnRevision / $totalEvaluables) * 100, 1)
            : 100.0;

        $metricaGap = $this->riskService->calcularMetricaGap(
            $autoevaluacion->porcentaje_cumplimiento,
            $porcentajeRevision
        );

        $resultado = $validated['discrepancias'] === 0 ? 'SIN_OBSERVACIONES' : 'CON_OBSERVACIONES';
        $codigoRevision = 'PREV-ITSE-'.date('Y').'-'.strtoupper(Str::random(6));

        SimulacionRevision::create([
            'autoevaluacion_id' => $autoevaluacion->id,
            'codigo_revision' => $codigoRevision,
            'total_observaciones' => (int) $validated['discrepancias'],
            'porcentaje_revision' => $porcentajeRevision,
            'metrica_gap' => $metricaGap,
            'resultado' => $resultado,
            'detalle_revision' => $verificaciones,
        ]);

        return redirect()->route('autoevaluacion.simulacion', ['uuid' => $uuid]);
    }

    /**
     * La antigua pantalla de subsanación se unificó en "Subsanar" (subsanar-items),
     * que muestra lo que falta con fotos, proveedores y evidencias. La dirección
     * vieja se conserva solo como redirección para no romper enlaces guardados.
     */
    public function panelSubsanacion(Request $request, string $uuid): RedirectResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        return redirect()->route('autoevaluacion.subsanar_items', ['uuid' => $uuid], 301);
    }

    public function guardarSubsanacion(Request $request, string $uuid): RedirectResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);
        $revision = $autoevaluacion->simulaciones()->latest()->first();

        $validated = $request->validate([
            'codigo_item' => ['required', 'string', 'max:64', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'descripcion_subsanacion' => 'required|string|min:5|max:1000',
            'estado' => 'nullable|in:PENDIENTE,EN_PROCESO,SUBSANADO_DECLARADO',
            'observacion' => 'nullable|string|max:1000',
            'evidencia' => ['nullable', 'file', 'mimes:jpeg,png,webp,pdf', 'max:5120', function (string $attribute, mixed $value, \Closure $fail): void {
                if ($value instanceof UploadedFile && $value->getSize() === 0) {
                    $fail('El archivo de evidencia no puede estar vacío.');
                }
            }],
        ], [
            'evidencia.file' => 'El archivo de evidencia no es válido.',
            'evidencia.mimes' => 'Este formato de archivo no está permitido. Solo se admiten imágenes JPG, PNG, WEBP o documentos PDF.',
            'evidencia.max' => 'El archivo supera el tamaño máximo permitido (5 MB).',
            'evidencia.uploaded' => 'El archivo de evidencia no pudo subirse correctamente.',
        ]);

        $estadoSubsanacion = $validated['estado'] ?? 'PENDIENTE';

        $subsanacion = $revision
            ? Subsanacion::firstOrNew([
                'simulacion_revision_id' => $revision->id,
                'codigo_item' => $validated['codigo_item'],
            ])
            : Subsanacion::firstOrNew([
                'autoevaluacion_id' => $autoevaluacion->id,
                'codigo_item' => $validated['codigo_item'],
            ]);

        $estadoAnterior = $subsanacion->exists ? $subsanacion->estado : 'PENDIENTE';

        $evidenciaUrl = null;
        $hashSha256 = null;
        if ($request->hasFile('evidencia')) {
            $archivo = $request->file('evidencia');
            $hashSha256 = hash_file('sha256', $archivo->getRealPath());
            $sha12 = substr($hashSha256, 0, 12);
            $timestamp = time();
            $uuid8 = substr((string) Str::uuid(), 0, 8);
            $ext = $archivo->getClientOriginalExtension() ?: ($archivo->guessExtension() ?: 'bin');
            $nombreArchivo = "{$validated['codigo_item']}_{$sha12}_{$timestamp}_{$uuid8}.{$ext}";

            $directorio = "evidencias/subsanaciones/{$autoevaluacion->uuid_trazabilidad}";
            $evidenciaUrl = Storage::disk('local')->putFileAs($directorio, $archivo, $nombreArchivo);
            // Custodia histórica: NO se elimina la evidencia previa del almacenamiento.
        }

        $criterio = CriterioNormativo::where('codigo_criterio', $validated['codigo_item'])->first();

        try {
            DB::transaction(function () use (
                $subsanacion,
                $autoevaluacion,
                $revision,
                $criterio,
                $validated,
                $estadoSubsanacion,
                $estadoAnterior,
                $evidenciaUrl,
                $hashSha256,
                $request
            ) {
                $subsanacion->autoevaluacion_id = $autoevaluacion->id;
                if ($criterio) {
                    $subsanacion->criterio_id = $criterio->id;
                }
                if ($revision) {
                    $subsanacion->simulacion_revision_id = $revision->id;
                }

                $subsanacion->fill([
                    'descripcion' => $validated['descripcion_subsanacion'],
                    'observacion' => $validated['observacion'] ?? null,
                    'estado' => $estadoSubsanacion,
                    'fecha_subsanacion' => $estadoSubsanacion === 'SUBSANADO_DECLARADO' ? now() : null,
                ]);

                if ($evidenciaUrl !== null) {
                    $subsanacion->evidencia_url = $evidenciaUrl;
                    $subsanacion->hash_sha256 = $hashSha256;
                }

                $subsanacion->save();

                // Trazabilidad histórica append-only
                if ($estadoAnterior !== $estadoSubsanacion || $evidenciaUrl !== null
                    || (! $subsanacion->wasRecentlyCreated && $subsanacion->wasChanged(['descripcion', 'observacion']))) {
                    HistorialSubsanacion::create([
                        'subsanacion_id' => $subsanacion->id,
                        'user_id' => Auth::id(),
                        'estado_anterior' => $estadoAnterior,
                        'estado_nuevo' => $estadoSubsanacion,
                        'evidencia_url' => $evidenciaUrl ?? $subsanacion->evidencia_url,
                        'hash_sha256' => $hashSha256 ?? $subsanacion->hash_sha256,
                        'comentario' => $validated['descripcion_subsanacion']
                            .(filled($validated['observacion'] ?? null) ? "\nObservación: ".$validated['observacion'] : ''),
                        'ip_address' => $request->ip(),
                    ]);
                }

                // Recálculo dinámico del ciclo de autoevaluación preventiva para simulaciones
                if ($revision) {
                    $verificaciones = $revision->detalle_revision ?? [];
                    $codigosObservados = array_keys(array_filter($verificaciones, fn ($v) => $v === false));

                    $subsanacionesDeclaradas = Subsanacion::where('simulacion_revision_id', $revision->id)
                        ->where('estado', 'SUBSANADO_DECLARADO')
                        ->pluck('codigo_item')
                        ->toArray();

                    $todasSubsanadas = count($codigosObservados) > 0 &&
                                       empty(array_diff($codigosObservados, $subsanacionesDeclaradas));

                    if ($todasSubsanadas) {
                        $checklistActualizado = collect($autoevaluacion->detalle_checklist ?? [])->map(function (array $item) use ($subsanacionesDeclaradas): array {
                            if (in_array($item['codigo'] ?? '', $subsanacionesDeclaradas, true)) {
                                $item['estado'] = 'CUMPLE';
                                $item['cumple'] = true;
                            }

                            return $item;
                        })->values()->all();

                        $autoevaluacion->update([
                            'semaforo' => 'VERDE',
                            'porcentaje_cumplimiento' => 100.0,
                            'detalle_checklist' => $checklistActualizado,
                            'total_pendiente_atender' => 0,
                        ]);

                        $revision->update([
                            'resultado' => 'SIN_OBSERVACIONES',
                            'porcentaje_revision' => 100.0,
                            'metrica_gap' => 0.0,
                            'total_observaciones' => 0,
                        ]);
                    }
                }

                // La corrección se refleja en el estado del local (resumen, panel, anexos),
                // sea que se compró a un aliado o por cuenta propia.
                if ($autoevaluacion->respuestas()->exists()) {
                    $this->subsanacionSync()->sincronizar($autoevaluacion);
                }
            });
        } catch (\Throwable $e) {
            // Limpieza compensatoria: revertir únicamente el archivo subido si falló la persistencia
            if ($evidenciaUrl !== null) {
                Storage::disk('local')->delete($evidenciaUrl);
            }

            throw $e;
        }

        return redirect()->route('autoevaluacion.subsanar_items', ['uuid' => $uuid])
            ->with('success', 'Plan de subsanación preventiva actualizado.');
    }

    /**
     * Muestra la vista limpia de subsanación directa donde SOLO aparecen los criterios observados
     * o por subsanar (PENDIENTE_ATENDER o POR_REVISAR).
     */
    public function subsanarItems(Request $request, string $uuid): Response
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        // Inicializar respuestas si no existen
        if ($autoevaluacion->respuestas()->count() === 0 && empty($autoevaluacion->detalle_checklist)) {
            $this->applicabilityEngine->inicializarRespuestas($autoevaluacion);
        }

        $criteriosNormativos = CriterioNormativo::with('recursosEducativos')->get()->keyBy('codigo_criterio');
        $criteriosPorId = CriterioNormativo::with('recursosEducativos')->get()->keyBy('id');

        $itemsObservados = collect();

        // Lo ya corregido sigue en la lista (marcado como listo) para que el emprendedor
        // pueda ver su prueba o deshacer la corrección.
        $codigosCorregidos = $autoevaluacion->subsanaciones()->pluck('codigo_item')
            ->concat($autoevaluacion->simulaciones->flatMap->subsanaciones->pluck('codigo_item'))
            ->unique()
            ->all();

        // 1. Respuestas normativas registradas (V2)
        $respuestas = $autoevaluacion->respuestas()->with('criterioNormativo.recursosEducativos')->get();
        if ($respuestas->isNotEmpty()) {
            foreach ($respuestas as $resp) {
                $criterio = $resp->criterioNormativo ?? $criteriosPorId->get($resp->criterio_id);
                $codigo = $criterio?->codigo_criterio ?? "CRIT-{$resp->criterio_id}";
                $sigueObservado = in_array($resp->estado_respuesta, [
                    ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
                    ApplicabilityEngineService::ESTADO_POR_REVISAR,
                ], true);

                if ($sigueObservado || in_array($codigo, $codigosCorregidos, true)) {

                    $itemsObservados->put($codigo, [
                        'id' => $resp->id,
                        'criterio_id' => $resp->criterio_id,
                        'codigo' => $codigo,
                        'titulo' => $criterio?->titulo ?? 'Condición ITSE observada',
                        'categoria' => $criterio?->categoria ?? 'GENERAL',
                        'norma_base' => $criterio?->norma_base ?? 'D.S. 002-2018-PCM / RNC',
                        'articulo_referencia' => $criterio?->articulo_referencia,
                        'pregunta_ciudadana' => $criterio?->pregunta_ciudadana,
                        'que_observar' => $criterio?->que_observar ?? $criterio?->titulo,
                        'accion_mejora_orientativa' => $criterio?->accion_mejora_orientativa ?? 'Corregir la condición técnica observada antes de solicitar la inspección.',
                        'estado' => $resp->estado_respuesta,
                        'notas' => $resp->notas_ciudadano,
                        'recursos_educativos' => $criterio?->recursosEducativos->map(fn ($r) => [
                            'id' => $r->id,
                            'titulo' => $r->titulo,
                            'descripcion_corta' => $r->descripcion_corta,
                            'tipo' => $r->tipo,
                            'url' => $r->url,
                        ])->values()->all() ?? [],
                    ]);
                }
            }
        }

        // 2. Evaluaciones legadas basadas en detalle_checklist
        if (! empty($autoevaluacion->detalle_checklist) && is_array($autoevaluacion->detalle_checklist)) {
            foreach ($autoevaluacion->detalle_checklist as $item) {
                $estado = $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE');
                if (in_array($estado, ['NO_CUMPLE', 'POR_REVISAR', 'PENDIENTE_ATENDER'], true)) {
                    $codigo = $item['codigo'] ?? '';
                    if (! $itemsObservados->has($codigo)) {
                        $criterio = $criteriosNormativos->get($codigo);
                        $itemsObservados->put($codigo, [
                            'id' => null,
                            'criterio_id' => $criterio?->id,
                            'codigo' => $codigo,
                            'titulo' => $criterio?->titulo ?? ($item['nombre'] ?? $item['pregunta'] ?? $codigo),
                            'categoria' => $criterio?->categoria ?? ($item['categoria'] ?? 'GENERAL'),
                            'norma_base' => $criterio?->norma_base ?? ($item['norma'] ?? 'D.S. 002-2018-PCM'),
                            'articulo_referencia' => $criterio?->articulo_referencia ?? ($item['articulo'] ?? null),
                            'pregunta_ciudadana' => $criterio?->pregunta_ciudadana ?? ($item['pregunta'] ?? null),
                            'que_observar' => $criterio?->que_observar ?? ($item['descripcion'] ?? $item['observacion'] ?? null),
                            'accion_mejora_orientativa' => $criterio?->accion_mejora_orientativa ?? 'Corregir la condición técnica observada.',
                            'estado' => $estado === 'POR_REVISAR' ? 'POR_REVISAR' : 'PENDIENTE_ATENDER',
                            'notas' => $item['observacion'] ?? null,
                            'recursos_educativos' => $criterio?->recursosEducativos->map(fn ($r) => [
                                'id' => $r->id,
                                'titulo' => $r->titulo,
                                'descripcion_corta' => $r->descripcion_corta,
                                'tipo' => $r->tipo,
                                'url' => $r->url,
                            ])->values()->all() ?? [],
                        ]);
                    }
                }
            }
        }

        // 3. Subsanaciones de simulaciones pendientes
        $subsanacionesPendientes = $autoevaluacion->simulaciones
            ->flatMap->subsanaciones
            ->whereIn('estado', ['PENDIENTE', 'EN_PROCESO']);

        foreach ($subsanacionesPendientes as $sub) {
            $codigo = $sub->codigo_item;
            if (! $itemsObservados->has($codigo)) {
                $criterio = $criteriosNormativos->get($codigo);
                $itemsObservados->put($codigo, [
                    'id' => null,
                    'subsanacion_id' => $sub->id,
                    'criterio_id' => $criterio?->id,
                    'codigo' => $codigo,
                    'titulo' => $criterio?->titulo ?? $codigo,
                    'categoria' => $criterio?->categoria ?? 'GENERAL',
                    'norma_base' => $criterio?->norma_base ?? 'D.S. 002-2018-PCM',
                    'articulo_referencia' => $criterio?->articulo_referencia,
                    'pregunta_ciudadana' => $criterio?->pregunta_ciudadana,
                    'que_observar' => $sub->descripcion ?? $criterio?->que_observar,
                    'accion_mejora_orientativa' => $criterio?->accion_mejora_orientativa ?? 'Corregir la condición técnica observada.',
                    'estado' => 'PENDIENTE_ATENDER',
                    'notas' => $sub->observacion,
                    'recursos_educativos' => $criterio?->recursosEducativos->map(fn ($r) => [
                        'id' => $r->id,
                        'titulo' => $r->titulo,
                        'descripcion_corta' => $r->descripcion_corta,
                        'tipo' => $r->tipo,
                        'url' => $r->url,
                    ])->values()->all() ?? [],
                ]);
            }
        }

        // 4. Enlazar evidencias y subsanaciones existentes a los ítems observados
        $subsanacionesDirectas = $autoevaluacion->subsanaciones()
            ->with(['analisisEvidencias.resultado'])
            ->get();
        $subsanacionesSimulaciones = $autoevaluacion->simulaciones
            ->flatMap(fn ($sim) => $sim->subsanaciones()->with(['analisisEvidencias.resultado'])->get());

        $todasSubsanaciones = $subsanacionesDirectas->concat($subsanacionesSimulaciones)->keyBy('codigo_item');

        foreach ($todasSubsanaciones as $codigo => $sub) {
            if ($itemsObservados->has($codigo)) {
                $item = $itemsObservados->get($codigo);
                $item['subsanacion_id'] = $sub->id;
                $item['mime_type'] = $sub->mime_type;
                $item['es_imagen'] = ! empty($sub->mime_type) && str_starts_with($sub->mime_type, 'image/');
                $item['es_pdf'] = ($sub->mime_type === 'application/pdf');

                if (! empty($sub->evidencia_url)) {
                    $item['evidencia_url'] = route('autoevaluacion.evidencia', [
                        'uuid' => $autoevaluacion->uuid_trazabilidad,
                        'subsanacion' => $sub->id,
                    ]);
                }
                if (! empty($sub->descripcion)) {
                    $item['notas'] = $sub->descripcion;
                }
                if ($sub->estado === 'SUBSANADO_DECLARADO') {
                    $item['estado'] = ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO;
                }

                $ultimoAnalisis = $sub->analisisEvidencias->sortByDesc('id')->first();
                if ($ultimoAnalisis) {
                    $item['ultimo_analisis'] = [
                        'id' => $ultimoAnalisis->id,
                        'uuid' => $ultimoAnalisis->uuid_analisis,
                        'estado' => $ultimoAnalisis->estado_analisis,
                        'mensaje_error' => $ultimoAnalisis->mensaje_error,
                        'created_at' => $ultimoAnalisis->created_at?->toIso8601String(),
                        'resultado' => $ultimoAnalisis->resultado ? [
                            'calidad_imagen' => $ultimoAnalisis->resultado->calidad_imagen,
                            'nivel_incertidumbre' => $ultimoAnalisis->resultado->nivel_incertidumbre,
                            'elementos_detectados' => $ultimoAnalisis->resultado->elementos_detectados,
                            'visual_observations' => $ultimoAnalisis->resultado->observaciones_visuales,
                            'not_observable' => $ultimoAnalisis->resultado->no_observable,
                            'photo_improvement_recommendations' => $ultimoAnalisis->resultado->recomendaciones_captura,
                            'resumen_pedagogico' => $ultimoAnalisis->resultado->resumen_pedagogico,
                            'advertencia_legal' => $ultimoAnalisis->resultado->advertencia_legal,
                            'version_motor' => $ultimoAnalisis->resultado->version_motor,
                        ] : null,
                    ];
                } else {
                    $item['ultimo_analisis'] = null;
                }

                $itemsObservados->put($codigo, $item);
            }
        }

        // Proveedores, costo estimado y guía de cada ítem, para el panel "Lo que te falta".
        $itemsObservados = $itemsObservados->map(fn (array $item): array => $item + [
            'asistencia' => $this->construirAsistenciaTecnica($item['codigo'] ?? null, $item['titulo'] ?? null, $item['norma_base'] ?? null),
        ]);

        // Cada producto mostrado cuenta como una aparición para su proveedor.
        app(EstadisticasProveedorService::class)->registrarVarios(
            EventoProveedor::APARICION,
            $itemsObservados->flatMap(fn (array $item): array => $item['asistencia']['ofertas'] ?? [])
                ->filter(fn (array $oferta): bool => isset($oferta['proveedor_id']))
                ->map(fn (array $oferta): array => [(int) $oferta['proveedor_id'], (int) $oferta['id']])
                ->values()
                ->all(),
        );

        return Inertia::render('Evaluacion/SubsanacionDirecta', [
            'autoevaluacion' => [
                'id' => $autoevaluacion->id,
                'uuid' => $autoevaluacion->uuid_trazabilidad,
                'nombre_comercio' => $autoevaluacion->nombre_comercio,
                'funcion_economica' => $autoevaluacion->funcion_economica,
                'ruc' => $autoevaluacion->ruc,
                'direccion' => $autoevaluacion->direccion,
                'sector_huancayo' => $autoevaluacion->sector_huancayo,
                'estado' => $autoevaluacion->estado,
                'porcentaje_cumplimiento' => (float) ($autoevaluacion->porcentaje_cumplimiento ?? 0),
                'semaforo' => $autoevaluacion->semaforo,
            ],
            'items' => $itemsObservados->values()->all(),
            'total_observaciones' => $itemsObservados->count(),
        ]);
    }

    /**
     * Declara una condición subsanada y conforme, actualizando el estado de la respuesta
     * a CUMPLE_DECLARADO y recalculando el porcentaje de cumplimiento y contadores.
     *
     * Protege estrictamente la inmutabilidad de payload_canonico y hash_integridad.
     */
    public function declararSubsanado(Request $request, string $uuid): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'criterio_id' => 'nullable|integer',
            'codigo_criterio' => 'nullable|string',
            'nota' => 'nullable|string|max:1000',
        ]);

        $criterioId = $validated['criterio_id'] ?? null;
        $codigoCriterio = $validated['codigo_criterio'] ?? null;
        $nota = $validated['nota'] ?? null;

        if (! $criterioId && ! $codigoCriterio) {
            return response()->json([
                'error' => 'parametro_requerido',
                'mensaje' => 'Se requiere criterio_id o codigo_criterio.',
            ], 422);
        }

        $criterio = null;
        if ($criterioId) {
            $criterio = CriterioNormativo::find($criterioId);
        }
        if (! $criterio && $codigoCriterio) {
            $criterio = CriterioNormativo::where('codigo_criterio', $codigoCriterio)->first();
        }

        $codigo = $criterio?->codigo_criterio ?? $codigoCriterio;
        $idCriterio = $criterio?->id ?? $criterioId;

        // Transacción atómica con bloqueo pesimista
        $resultado = DB::transaction(function () use ($uuid, $request, $criterio, $codigo, $idCriterio, $nota) {
            /** @var Autoevaluacion $autoevaluacion */
            $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)
                ->lockForUpdate()
                ->firstOrFail();

            $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

            // Validar que el criterio sea aplicable si el modelo cuenta con reglas activas
            if ($criterio) {
                $evaluacionCriterio = $this->applicabilityEngine->evaluarCriterio($criterio, $autoevaluacion);
                if ($evaluacionCriterio['aplicable'] === false) {
                    throw new \InvalidArgumentException("El criterio [{$codigo}] no aplica a este establecimiento y no requiere subsanación.");
                }
            }

            // 1. Actualizar respuesta en respuestas_autoevaluacion
            if ($idCriterio) {
                RespuestaAutoevaluacion::updateOrCreate(
                    [
                        'autoevaluacion_id' => $autoevaluacion->id,
                        'criterio_id' => $idCriterio,
                    ],
                    [
                        'estado_respuesta' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
                        'notas_ciudadano' => $nota ?: 'Subsanado y declarado en regla por el titular.',
                    ]
                );
            }

            // 2. Si tiene detalle_checklist (legacy o snapshot), actualizar el ítem
            if (! empty($autoevaluacion->detalle_checklist) && is_array($autoevaluacion->detalle_checklist)) {
                $checklistActualizada = collect($autoevaluacion->detalle_checklist)->map(function ($item) use ($codigo) {
                    if (($item['codigo'] ?? '') === $codigo) {
                        $item['cumple'] = true;
                        $item['estado'] = 'CUMPLE';
                    }

                    return $item;
                })->values()->all();

                $autoevaluacion->detalle_checklist = $checklistActualizada;
            }

            // 3. Crear o actualizar Subsanacion directa y registrar en HistorialSubsanacion
            $subsanacion = Subsanacion::firstOrNew([
                'autoevaluacion_id' => $autoevaluacion->id,
                'codigo_item' => $codigo,
            ]);

            $estadoAnteriorSub = $subsanacion->exists ? $subsanacion->estado : 'PENDIENTE';

            $subsanacion->fill([
                'autoevaluacion_id' => $autoevaluacion->id,
                'criterio_id' => $idCriterio,
                'descripcion' => $nota ?: 'Subsanado directamente por el titular.',
                'estado' => 'SUBSANADO_DECLARADO',
                'fecha_subsanacion' => now(),
                'notas_ciudadano' => $nota ?: 'Subsanado directamente por el titular.',
            ]);
            $subsanacion->save();

            HistorialSubsanacion::create([
                'subsanacion_id' => $subsanacion->id,
                'user_id' => Auth::id(),
                'estado_anterior' => $estadoAnteriorSub,
                'estado_nuevo' => 'SUBSANADO_DECLARADO',
                'evidencia_url' => $subsanacion->evidencia_url,
                'hash_sha256' => $subsanacion->hash_sha256,
                'comentario' => $nota ?: 'Subsanación directa declarada conforme por el titular.',
                'ip_address' => $request->ip(),
            ]);

            // Si existen simulaciones asociadas, actualizar también sus subsanaciones
            foreach ($autoevaluacion->simulaciones as $simulacion) {
                $simulacion->subsanaciones()
                    ->where('codigo_item', $codigo)
                    ->update([
                        'autoevaluacion_id' => $autoevaluacion->id,
                        'criterio_id' => $idCriterio,
                        'estado' => 'SUBSANADO_DECLARADO',
                        'fecha_subsanacion' => now(),
                        'notas_ciudadano' => $nota ?: 'Subsanado directamente por el titular.',
                    ]);
            }

            // 4. Recálculo de totales (el mismo que usa el panel de corrección).
            // NOTA CRÍTICA C.3: payload_canonico y hash_integridad NO SE MODIFICAN.
            $datos = $this->subsanacionSync()->recalcularTotales($autoevaluacion);

            return [
                'autoevaluacion' => $autoevaluacion,
                'datos' => $datos,
            ];
        });

        $datos = $resultado['datos'];

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'mensaje' => 'Condición técnica subsanada y declarada conforme.',
                'codigo' => $codigo,
                'estado' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
                'porcentaje_cumplimiento' => $datos['porcentaje_cumplimiento'],
                'pendientes_restantes' => $datos['por_subsanar'] + $datos['por_revisar'],
                'es_conforme' => ($datos['porcentaje_cumplimiento'] >= 100.0 && $datos['por_subsanar'] === 0 && $datos['por_revisar'] === 0),
            ]);
        }

        return back()->with('success', 'Condición subsanada y declarada como conforme.');
    }

    /**
     * Descarga o visualiza una evidencia declarada por el ciudadano.
     *
     * Restringido por propiedad: si la autoevaluación pertenece a una cuenta
     * registrada solo su titular puede acceder; si aún es de invitado, debe
     * presentar el guest_session_token que originó el registro. El archivo vive
     * en almacenamiento privado y nunca se sirve por URL pública directa.
     */
    public function descargarEvidencia(Request $request, string $uuid, Subsanacion $subsanacion): StreamedResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();

        // Si la subsanación está vinculada a una simulación, debe pertenecer a la última revisión activa
        if ($subsanacion->simulacion_revision_id !== null) {
            $revision = $autoevaluacion->simulacionRevision;
            if ($revision === null || (int) $subsanacion->simulacion_revision_id !== (int) $revision->id) {
                abort(404);
            }
        } elseif ((int) $subsanacion->autoevaluacion_id !== (int) $autoevaluacion->id) {
            abort(404);
        }

        // Autorización de descarga de evidencia privada:
        // Titular autenticado si está vinculada a cuenta, o cookie guest_session_token si es anónima.
        if ($autoevaluacion->user_id !== null) {
            $autenticado = $request->user();
            if ($autenticado === null || (int) $autenticado->id !== (int) $autoevaluacion->user_id) {
                abort(403, self::MSG_NO_AUTORIZADO_EVIDENCIA);
            }
        } else {
            $tokenCookie = $request->cookie('guest_session_token');
            if (! filled($autoevaluacion->session_token)
                || ! filled($tokenCookie)
                || ! hash_equals((string) $autoevaluacion->session_token, (string) $tokenCookie)) {
                abort(403, self::MSG_NO_AUTORIZADO_EVIDENCIA);
            }
        }

        $path = $subsanacion->evidencia_url;

        if (! filled($path) || ! app(EvidenciaPrivadaService::class)->rutaPermitida($path)) {
            abort(404);
        }

        /** @var FilesystemAdapter $disco */
        $disco = Storage::disk('local');

        if (! $disco->exists($path)) {
            abort(404);
        }

        if (filled($subsanacion->hash_sha256)
            && ! hash_equals($subsanacion->hash_sha256, hash('sha256', $disco->get($path)))) {
            abort(409, 'La integridad del archivo de evidencia no coincide con el registro.');
        }

        return $disco->response($path);
    }

    /**
     * Solicita voluntariamente un análisis multimodal con IA para la evidencia física adjunta.
     */
    public function solicitarAnalisisEvidencia(Request $request, string $uuid, Subsanacion $subsanacion): JsonResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        if ((int) $subsanacion->autoevaluacion_id !== (int) $autoevaluacion->id) {
            abort(404);
        }

        try {
            $analisis = $this->analisisService->solicitarAnalisis($autoevaluacion, $subsanacion, $request->user());

            return response()->json([
                'success' => true,
                'mensaje' => 'Solicitud de análisis multimodal encolada correctamente.',
                'analisis_uuid' => $analisis->uuid_analisis,
                'estado' => $analisis->estado_analisis,
            ], 202);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'archivo_invalido',
                'mensaje' => $e->getMessage(),
            ], 422);
        } catch (\RuntimeException $e) {
            return response()->json([
                'error' => 'error_analisis',
                'mensaje' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Consulta el estado de procesamiento y el resultado de un análisis multimodal.
     */
    public function consultarEstadoAnalisis(Request $request, string $uuid, string $analisisUuid): JsonResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $analisis = $this->analisisService->consultarEstado($analisisUuid);

        if ((int) $analisis->autoevaluacion_id !== (int) $autoevaluacion->id) {
            abort(404);
        }

        return response()->json([
            'uuid_analisis' => $analisis->uuid_analisis,
            'estado' => $analisis->estado_analisis,
            'modelo' => $analisis->modelo_solicitado,
            'iniciado_at' => $analisis->iniciado_at?->format(self::FORMATO_FECHA_HORA),
            'completado_at' => $analisis->completado_at?->format(self::FORMATO_FECHA_HORA),
            'mensaje_error' => $analisis->mensaje_error,
            'resultado' => $analisis->resultado,
        ]);
    }

    /**
     * Consulta el historial de análisis multimodales vinculados a una subsanación.
     */
    public function historialAnalisisEvidencia(Request $request, string $uuid, Subsanacion $subsanacion): JsonResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        if ((int) $subsanacion->autoevaluacion_id !== (int) $autoevaluacion->id) {
            abort(404);
        }

        $historial = $this->analisisService->obtenerHistorialSubsanacion($subsanacion);

        return response()->json([
            'historial' => $historial,
        ]);
    }

    /**
     * Informe de autoevaluación preventiva integral.
     *
     * Consolida la trazabilidad completa del ciclo preventivo (subsanaciones e
     * historial de cambios de estado), las métricas de cierre y la huella
     * criptográfica SHA-256 del payload final. El documento conserva la
     * nomenclatura cívico-preventiva: nunca se titula certificado, acta ni
     * dictamen oficial.
     */
    public function informe(Request $request, string $uuid): Response
    {
        $autoevaluacion = Autoevaluacion::with([
            'simulacionRevision.subsanaciones.historial',
            'subsanaciones.historial',
            'evaluacionOrigen',
            'respuestas.criterioNormativo',
        ])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);
        $this->validarAutorizacionInforme($request, $autoevaluacion);

        $datos = $this->evaluacionSyncService->obtenerDatosCompletos($autoevaluacion);

        $revision = $autoevaluacion->simulacionRevision;
        $subsanacionesDirectas = $autoevaluacion->subsanaciones ?? collect();
        $subsanacionesRevision = collect($revision?->subsanaciones ?? []);
        $subsanaciones = $subsanacionesDirectas->concat($subsanacionesRevision)->unique('codigo_item')->values();
        $nombresPorCodigo = collect($this->riskService->getCatalogoChecklist())->keyBy('codigo');

        $matriz = $subsanaciones->map(function (Subsanacion $subsanacion) use ($nombresPorCodigo, $uuid): array {
            $item = $nombresPorCodigo->get($subsanacion->codigo_item);

            $evidenciaUrl = filled($subsanacion->evidencia_url)
                ? route('autoevaluacion.evidencia', ['uuid' => $uuid, 'subsanacion' => $subsanacion])
                : null;

            return [
                'codigo_item' => $subsanacion->codigo_item,
                'nombre_condicion' => $item['nombre'] ?? $subsanacion->codigo_item,
                'deficiencia_inicial' => $item['nombre'] ?? $subsanacion->codigo_item,
                'accion_realizada' => $subsanacion->descripcion,
                'estado' => $subsanacion->estado,
                'evidencia_url' => $evidenciaUrl,
                'evidencia_archivo' => $subsanacion->evidencia_url,
                'fecha_subsanacion' => $subsanacion->fecha_subsanacion?->format(self::FORMATO_FECHA),
            ];
        })->values();

        $subsanadasDeclaradas = $subsanaciones->where('estado', 'SUBSANADO_DECLARADO')->count();
        $conformesIniciales = max(0, $datos['cumplen'] - $subsanadasDeclaradas);
        $porcentajeSubsanado = ($datos['observados'] === 0 && $datos['por_revisar'] === 0 && $datos['total_aplicables'] > 0)
            ? 100
            : (int) round($datos['porcentaje_cumplimiento']);
        $gapFinal = ($subsanadasDeclaradas > 0 && $datos['observados'] === 0 && $datos['por_revisar'] === 0)
            ? 0.0
            : round(max(0.0, 100.0 - $datos['porcentaje_cumplimiento']), 1);

        $resumen = [
            'total_condiciones' => $datos['total_aplicables'],
            'conformes_iniciales' => $conformesIniciales,
            'subsanadas_declaradas' => $subsanadasDeclaradas,
            'en_proceso' => $subsanaciones->where('estado', 'EN_PROCESO')->count(),
            'pendientes' => $datos['observados'],
            'gap_final' => $gapFinal,
            'porcentaje_subsanado' => $porcentajeSubsanado,
        ];

        $conteoEstados = [
            'total' => count($datos['condiciones_evaluadas']),
            'cumple' => $datos['cumplen'],
            'no_cumple' => $datos['observados'],
            'por_revisar' => $datos['por_revisar'],
            'na' => $datos['no_aplica'] ?? 0,
        ];

        $detalleChecklist = collect($datos['condiciones_evaluadas'])->map(function (array $condicion) use ($nombresPorCodigo): array {
            $cat = $nombresPorCodigo->get($condicion['codigo']);
            $estado = match ($condicion['estado_actual']) {
                'CUMPLE_DECLARADO' => 'CUMPLE',
                'PENDIENTE_ATENDER' => 'NO_CUMPLE',
                'POR_REVISAR' => 'POR_REVISAR',
                'NO_APLICA' => 'NA',
                default => $condicion['estado_actual'],
            };

            return [
                'codigo' => $condicion['codigo'],
                'nombre' => $condicion['titulo'],
                'categoria' => $condicion['especialidad'] ?: ($cat['categoria'] ?? 'Seguridad General'),
                'estado' => $estado,
                'cumple' => $estado === 'CUMPLE',
                'es_critico' => (bool) ($cat['es_critico'] ?? false),
                'norma' => $condicion['norma_referencial'],
            ];
        })->values()->all();

        $codigoInforme = 'INF-PREV-'.date('Y').'-'.strtoupper(Str::random(6));

        $payloadConsolidado = [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
            'ruc' => $datos['ruc'],
            'nombre_comercio' => $datos['nombre_comercial'] ?: $autoevaluacion->nombre_comercio,
            'sector_huancayo' => $autoevaluacion->sector_huancayo,
            'semaforo' => $datos['estado_semaforo'],
            'porcentaje_cumplimiento' => $datos['porcentaje_cumplimiento'],
            'resumen' => $resumen,
            'evidencias' => $matriz->pluck('evidencia_url')->filter()->values()->all(),
            'matriz' => $matriz
                ->map(fn ($fila) => array_intersect_key($fila, array_flip(['codigo_item', 'estado', 'evidencia_url'])))
                ->values()
                ->all(),
        ];

        $hashFinal = hash('sha256', json_encode($payloadConsolidado));

        $esReevaluacion = $autoevaluacion->evaluacion_origen_id !== null;
        $evaluacionOrigen = $autoevaluacion->evaluacionOrigen ? [
            'uuid_trazabilidad' => $autoevaluacion->evaluacionOrigen->uuid_trazabilidad,
            'fecha' => $autoevaluacion->evaluacionOrigen->created_at?->format(self::FORMATO_FECHA_HORA) ?? $autoevaluacion->evaluacionOrigen->created_at?->format(self::FORMATO_FECHA),
            'semaforo' => $autoevaluacion->evaluacionOrigen->semaforo,
            'porcentaje_cumplimiento' => $autoevaluacion->evaluacionOrigen->porcentaje_cumplimiento,
        ] : null;

        $autoevaluacionHydrated = array_merge($autoevaluacion->paraInforme(), [
            'area_techada' => $datos['area_techada'],
            'area_m2' => $autoevaluacion->area_m2 ?? ($datos['area_techada'] !== null ? (float) $datos['area_techada'] : null),
            'aforo_estimado' => $datos['aforo_estimado'],
            'aforo' => $datos['aforo_estimado'] ?: $autoevaluacion->aforo,
            'numero_pisos' => $datos['numero_pisos'],
            'pisos' => $datos['numero_pisos'] ?: $autoevaluacion->pisos,
            'giro' => $datos['giro'],
            'funcion_economica' => $datos['giro'] ?: $autoevaluacion->funcion_economica,
            'nombre_comercial' => $datos['nombre_comercial'] ?: $autoevaluacion->nombre_comercio,
            'nombre_comercio' => $datos['nombre_comercial'] ?: $autoevaluacion->nombre_comercio,
            'ruc' => $datos['ruc'] ?: $autoevaluacion->ruc,
            'direccion' => $datos['direccion'] ?: $autoevaluacion->direccion,
            // Código corto que el emprendedor reconoce (en lugar del UUID).
            'codigo_acceso' => $autoevaluacion->codigo_acceso,
            'semaforo' => $datos['estado_semaforo'],
            'porcentaje_cumplimiento' => $datos['porcentaje_cumplimiento'],
            'condiciones_evaluadas' => $datos['condiciones_evaluadas'],
        ]);

        return Inertia::render('Evaluacion/InformePreventivo', [
            'autoevaluacion' => $autoevaluacionHydrated,
            'evaluacion' => $autoevaluacionHydrated,
            'condiciones_evaluadas' => $datos['condiciones_evaluadas'],
            'esReevaluacion' => $esReevaluacion,
            'evaluacionOrigen' => $evaluacionOrigen,
            'codigoInforme' => $codigoInforme,
            'fechaEmision' => now()->format(self::FORMATO_FECHA_HORA),
            'resumen' => $resumen,
            'detalleChecklist' => $detalleChecklist,
            'conteoEstados' => $conteoEstados,
            'matrizSubsanaciones' => $matriz,
            'hashFinal' => $hashFinal,
            'hashIntegridad' => $autoevaluacion->hash_integridad,
        ]);
    }

    /**
     * Asocia de forma atómica una autoevaluación iniciada como invitado a la
     * cuenta del usuario recién registrado o que inicia sesión.
     *
     * Protección contra secuestro de sesión: solo el titular del
     * guest_session_token que originó el registro (o un usuario autenticado cuyo
     * user_id ya figura en el registro) puede vincular el UUID.
     */
    public function vincularCuenta(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'uuid' => ['required', 'string', 'exists:autoevaluaciones,uuid_trazabilidad'],
            'destino' => ['nullable', 'string', 'in:checklist,resumen'],
        ]);

        if (Auth::guest()) {
            abort(403, 'Debes iniciar sesión para guardar tu autoevaluación.');
        }

        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $validated['uuid'])->firstOrFail();

        $resolverRedireccion = function (string $mensaje) use ($autoevaluacion, $validated): RedirectResponse {
            $destino = $validated['destino'] ?? null;

            $redirect = match ($destino) {
                'checklist' => redirect()->route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]),
                'resumen' => redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad]),
                default => $autoevaluacion->estaRegistrada()
                    ? redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad])
                    : back(),
            };

            return $redirect->with('success', $mensaje);
        };

        if ($autoevaluacion->user_id === null) {
            $tokenSesion = $request->cookie('guest_session_token');

            $esTitularLegitimo = filled($autoevaluacion->session_token)
                && filled($tokenSesion)
                && hash_equals((string) $autoevaluacion->session_token, (string) $tokenSesion);

            if (! $esTitularLegitimo) {
                abort(403, 'No autorizado para vincular esta autoevaluación.');
            }

            $asociado = DB::transaction(function () use ($autoevaluacion): int {
                $registro = Autoevaluacion::whereKey($autoevaluacion->id)
                    ->lockForUpdate()
                    ->first();

                if (! $registro || $registro->user_id !== null) {
                    return 0;
                }

                $registro->update(['user_id' => Auth::id()]);

                return 1;
            });

            if ($asociado === 0) {
                abort(403, 'Esta autoevaluación ya fue vinculada o pertenece a otra cuenta.');
            }

            $request->session()->forget('guest_authorized_uuid');

            return $resolverRedireccion('Tu autoevaluación ha sido guardada en tu cuenta exitosamente.');
        }

        if ((int) $autoevaluacion->user_id === (int) Auth::id()) {
            return $resolverRedireccion('Tu autoevaluación ya está vinculada a tu cuenta.');
        }

        abort(403, 'Esta autoevaluación pertenece a otra cuenta.');
    }

    /**
     * Panel Principal del Contribuyente (Dashboard Ciudadano).
     * Presenta los KPIs de seguridad del negocio y la cartera de locales comerciales.
     */
    public function dashboard(Request $request): Response
    {
        $user = $request->user();
        $autoevaluaciones = Autoevaluacion::where('user_id', $user->id)
            ->with(['simulacionRevision', 'simulaciones.subsanaciones', 'evaluacionOrigen', 'respuestas'])
            ->latest('id')
            ->get();

        $records = $autoevaluaciones
            ->map(function (Autoevaluacion $item): array {
                $data = $this->formatearItemMisEvaluaciones($item);
                $data['sector_huancayo'] = $item->sector_huancayo;
                $data['usa_glp'] = (bool) $item->usa_glp;
                $data['galones_glp'] = $item->galones_glp;

                return $data;
            })
            ->values();

        $kpis = $this->calcularKpisDashboard($records);

        return Inertia::render('Dashboard/Dashboard', [
            'records' => $records,
            'kpis' => $kpis,
        ]);
    }

    /**
     * Clasifica un local comercial en una de tres categorías mutuamente excluyentes:
     * - CONFORME: finalizado (REGISTRADA) y con cumplimiento al 100% (sin subsanaciones pendientes).
     * - OBSERVADO: finalizado (REGISTRADA) con cumplimiento menor al 100% o con condiciones por subsanar.
     * - EN_PROCESO: iniciado y no finalizado (INICIADA u otro distinto de REGISTRADA).
     *
     * @param  array<string, mixed>|Autoevaluacion  $item
     * @return string 'CONFORME'|'OBSERVADO'|'EN_PROCESO'
     */
    public static function clasificarEstadoLocal(array|Autoevaluacion $item): string
    {
        $estado = $item instanceof Autoevaluacion
            ? ($item->estado ?? Autoevaluacion::ESTADO_INICIADA)
            : ($item['estado'] ?? Autoevaluacion::ESTADO_INICIADA);

        if ($estado !== Autoevaluacion::ESTADO_REGISTRADA) {
            return 'EN_PROCESO';
        }

        $porcentaje = $item instanceof Autoevaluacion
            ? (float) ($item->porcentaje_cumplimiento ?? 0)
            : (float) ($item['porcentaje_cumplimiento'] ?? 0);

        $pendientes = $item instanceof Autoevaluacion
            ? (int) ($item->simulaciones->flatMap->subsanaciones->where('estado', 'PENDIENTE')->count())
            : (int) ($item['resumen_subsanaciones']['pendientes'] ?? 0);

        if ($porcentaje >= 100.0 && $pendientes === 0) {
            return 'CONFORME';
        }

        return 'OBSERVADO';
    }

    /**
     * Calcula los KPIs consolidados del dashboard ciudadano.
     *
     * @param  Collection<int, array<string, mixed>>  $records
     * @return array<string, mixed>
     */
    private function calcularKpisDashboard(Collection $records): array
    {
        $totalLocales = $records->count();

        $aprobados = $records->filter(function (array $r): bool {
            return ($r['clasificacion_estado'] ?? self::clasificarEstadoLocal($r)) === 'CONFORME';
        })->count();

        $observados = $records->filter(function (array $r): bool {
            return ($r['clasificacion_estado'] ?? self::clasificarEstadoLocal($r)) === 'OBSERVADO';
        })->count();

        $enProceso = $records->filter(function (array $r): bool {
            return ($r['clasificacion_estado'] ?? self::clasificarEstadoLocal($r)) === 'EN_PROCESO';
        })->count();

        $riesgos = $records->pluck('nivel_riesgo')->filter()->countBy();
        $riesgoDominante = $riesgos->sortDesc()->keys()->first() ?? 'MEDIO';

        return [
            'total_locales' => $totalLocales,
            'aprobados' => $aprobados,
            'sin_observaciones' => $aprobados,
            'observados' => $observados,
            'en_proceso' => $enProceso,
            'riesgo_dominante' => (string) $riesgoDominante,
        ];
    }

    /**
     * Muestra la vista de perfil de usuario contribuyente.
     */
    public function perfil(Request $request): Response
    {
        $user = $request->user();
        $ultima = Autoevaluacion::where('user_id', $user->id)->latest('id')->first();

        $user->setAttribute('razon_social', $ultima?->nombre_comercio ?? '');
        $user->setAttribute('nombre_comercial', $ultima?->nombre_comercio ?? '');
        $user->setAttribute('direccion_fiscal', $ultima?->direccion ?? '');

        return Inertia::render('Perfil/PerfilUsuario', [
            'user' => $user,
        ]);
    }

    /**
     * Actualiza los datos de perfil y contacto del usuario contribuyente.
     */
    public function updatePerfil(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        $datosValidados = $request->validated();
        $user->name = $datosValidados['name'];
        $user->email = $datosValidados['email'];

        if ($request->has('telefono')) {
            $user->telefono = $request->input('telefono');
        }

        if ($request->filled('password')) {
            $user->password = Hash::make($request->input('password'));
        }

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($request->hasAny(['nombre_comercial', 'direccion_fiscal', 'razon_social'])) {
            $ultima = Autoevaluacion::where('user_id', $user->id)->latest('id')->first();
            if ($ultima !== null && ! $ultima->estaRegistrada()) {
                $nombre = $request->input('nombre_comercial') ?? $request->input('razon_social');
                $actualizaciones = array_filter([
                    'nombre_comercio' => $nombre,
                    'direccion' => $request->input('direccion_fiscal'),
                ], fn ($val) => filled($val));

                if (! empty($actualizaciones)) {
                    $ultima->update($actualizaciones);
                }
            }
        }

        return redirect()->route('perfil.show')->with('success', 'Perfil actualizado correctamente.');
    }

    /**
     * Panel de retención ciudadana e historial preventivo: lista las autoevaluaciones
     * guardadas por el usuario autenticado con su estado del ciclo de vida, conteos
     * descriptivos normativos, trazabilidad criptográfica y soporte transicional legacy.
     */
    public function misEvaluaciones(Request $request): Response|JsonResponse
    {
        $autoevaluaciones = Autoevaluacion::with(['simulaciones.subsanaciones', 'evaluacionOrigen', 'respuestas'])
            ->where('user_id', Auth::id())
            ->latest('id')
            ->get()
            ->map(fn (Autoevaluacion $autoevaluacion): array => $this->formatearItemMisEvaluaciones($autoevaluacion))
            ->values();

        if ($request->wantsJson() || $request->is(self::RUTA_API_PATTERN)) {
            return response()->json([
                'autoevaluaciones' => $autoevaluaciones,
            ], 200, [
                'Cache-Control' => self::CACHE_CONTROL_NO_STORE,
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]);
        }

        $kpis = $this->calcularKpisDashboard($autoevaluaciones);

        return Inertia::render('Evaluacion/MisAutoevaluaciones', [
            'autoevaluaciones' => $autoevaluaciones,
            'records' => $autoevaluaciones,
            'kpis' => $kpis,
        ]);
    }

    private function formatearItemMisEvaluaciones(Autoevaluacion $autoevaluacion): array
    {
        $subsanaciones = $autoevaluacion->simulaciones
            ->flatMap(fn ($revision) => $revision->subsanaciones);

        $checklist = $autoevaluacion->detalle_checklist ?? [];
        $esFlujoNuevo = $autoevaluacion->esFlujoNuevo();
        $conteoCondiciones = $this->contarCondicionesChecklist($checklist);

        $datosNormativos = $this->resolverConteosYDesglose($autoevaluacion, $esFlujoNuevo, $conteoCondiciones);
        $conteoCondiciones = $datosNormativos['conteo_condiciones'];
        $conteosNormativos = $datosNormativos['conteos_normativos'];
        $desgloseEspecialidades = $datosNormativos['desglose_especialidades'];

        $metricas = $this->resolverMetricasCumplimientoItem($autoevaluacion, $esFlujoNuevo, $conteoCondiciones);
        $porcentaje = $metricas['porcentaje'];
        $semaforo = $metricas['semaforo'];

        $clasificacionTramite = $this->clasificarModalidadTramite($autoevaluacion);

        $resumenSubsanaciones = [
            'total' => $subsanaciones->count(),
            'subsanadas' => $subsanaciones->where('estado', 'SUBSANADO_DECLARADO')->count(),
            'en_proceso' => $subsanaciones->where('estado', 'EN_PROCESO')->count(),
            'pendientes' => $subsanaciones->where('estado', 'PENDIENTE')->count(),
        ];

        $clasificacionEstado = self::clasificarEstadoLocal([
            'estado' => $autoevaluacion->estado ?? Autoevaluacion::ESTADO_INICIADA,
            'porcentaje_cumplimiento' => $porcentaje,
            'resumen_subsanaciones' => $resumenSubsanaciones,
        ]);

        return [
            'id' => $autoevaluacion->id,
            'uuid_trazabilidad' => $autoevaluacion->uuid_trazabilidad,
            'codigo_acceso' => $autoevaluacion->codigo_acceso,
            'evaluacion_origen_id' => $autoevaluacion->evaluacion_origen_id,
            'evaluacion_origen_uuid' => $autoevaluacion->evaluacionOrigen?->uuid_trazabilidad,
            'nombre_comercio' => $autoevaluacion->nombre_comercio,
            'funcion_economica' => $autoevaluacion->funcion_economica,
            'ruc' => $autoevaluacion->ruc,
            'distrito' => $autoevaluacion->distrito,
            'direccion' => $autoevaluacion->direccion,
            'area_m2' => $autoevaluacion->area_m2,
            'pisos' => $autoevaluacion->pisos,
            'aforo' => $autoevaluacion->aforo,
            'tipo_tramite' => $clasificacionTramite['tipo_tramite'],
            'nivel_riesgo' => $clasificacionTramite['nivel_riesgo'],
            'clasificacion_tramite' => $clasificacionTramite,
            'estado' => $autoevaluacion->estado ?? Autoevaluacion::ESTADO_INICIADA,
            'clasificacion_estado' => $clasificacionEstado,
            'registrada_at' => $autoevaluacion->registrada_at?->format(self::FORMATO_FECHA_HORA),
            'es_flujo_nuevo' => $esFlujoNuevo,
            'conteos_normativos' => $conteosNormativos,
            'desglose_especialidades' => $desgloseEspecialidades,
            'semaforo' => $semaforo,
            'porcentaje_cumplimiento' => $porcentaje,
            'fecha' => $autoevaluacion->created_at?->format(self::FORMATO_FECHA_HORA),
            'fecha_corta' => $autoevaluacion->created_at?->format(self::FORMATO_FECHA),
            'created_at' => $autoevaluacion->created_at?->toIso8601String(),
            'hash_integridad' => $autoevaluacion->hash_integridad,
            'conteo_condiciones' => $conteoCondiciones,
            'resumen_subsanaciones' => $resumenSubsanaciones,
        ];
    }

    private function contarCondicionesChecklist(array $checklist): array
    {
        return [
            'total' => count($checklist),
            'cumple' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? ($i['cumple'] ? 'CUMPLE' : 'NO_CUMPLE')) === 'CUMPLE')),
            'no_cumple' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? ($i['cumple'] ? 'CUMPLE' : 'NO_CUMPLE')) === 'NO_CUMPLE')),
            'por_revisar' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? '') === 'POR_REVISAR')),
            'na' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? '') === 'NA')),
        ];
    }

    private function resolverConteosYDesglose(Autoevaluacion $autoevaluacion, bool $esFlujoNuevo, array $conteoCondiciones): array
    {
        if ($esFlujoNuevo) {
            return $this->resolverConteosYDesgloseFlujoNuevo($autoevaluacion);
        }

        $checklist = $autoevaluacion->detalle_checklist ?? [];
        if (! empty($checklist)) {
            return $this->resolverConteosYDesgloseLegacy($checklist, $conteoCondiciones);
        }

        return [
            'conteos_normativos' => null,
            'desglose_especialidades' => null,
            'conteo_condiciones' => $conteoCondiciones,
        ];
    }

    private function resolverConteosYDesgloseFlujoNuevo(Autoevaluacion $autoevaluacion): array
    {
        $resumenData = $this->applicabilityEngine->generarResumenDescriptivo($autoevaluacion);

        if ($autoevaluacion->estaRegistrada() && $autoevaluacion->total_condiciones_evaluadas !== null) {
            $conteosNormativos = [
                'total_criterios_aplicables' => (int) $autoevaluacion->total_condiciones_evaluadas,
                'cumple_declarado' => (int) $autoevaluacion->total_cumple_declarado,
                'pendiente_atender' => (int) $autoevaluacion->total_pendiente_atender,
                'por_revisar' => (int) $autoevaluacion->total_por_revisar,
                'no_aplica' => (int) $autoevaluacion->total_no_aplica,
            ];
        } else {
            $conteos = $resumenData['conteos'];
            $conteosNormativos = [
                'total_criterios_aplicables' => (int) $conteos['total_criterios_aplicables'],
                'cumple_declarado' => (int) $conteos['total_cumple_declarado'],
                'pendiente_atender' => (int) $conteos['total_pendiente_atender'],
                'por_revisar' => (int) $conteos['total_por_revisar'],
                'no_aplica' => (int) $conteos['total_no_aplica'],
            ];
        }

        $conteoCondiciones = [
            'total' => $conteosNormativos['total_criterios_aplicables'],
            'cumple' => $conteosNormativos['cumple_declarado'],
            'no_cumple' => $conteosNormativos['pendiente_atender'],
            'por_revisar' => $conteosNormativos['por_revisar'],
            'na' => $conteosNormativos['no_aplica'],
        ];

        $desgloseEspecialidades = $this->adjuntarDesgloseEspecialidadesAResumen($resumenData)['desglose_especialidades'];

        return [
            'conteos_normativos' => $conteosNormativos,
            'desglose_especialidades' => $desgloseEspecialidades,
            'conteo_condiciones' => $conteoCondiciones,
        ];
    }

    private function resolverConteosYDesgloseLegacy(array $checklist, array $conteoCondiciones): array
    {
        $totalAplicables = $conteoCondiciones['total'] - $conteoCondiciones['na'];
        $conteosNormativos = [
            'total_criterios_aplicables' => $totalAplicables,
            'cumple_declarado' => $conteoCondiciones['cumple'],
            'pendiente_atender' => $conteoCondiciones['no_cumple'],
            'por_revisar' => $conteoCondiciones['por_revisar'],
            'no_aplica' => $conteoCondiciones['na'],
        ];

        $condicionesAdaptadas = [];
        foreach ($checklist as $item) {
            $est = $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE');
            if ($est === 'NA') {
                continue;
            }
            $condicionesAdaptadas[] = [
                'codigo' => $item['codigo'] ?? '',
                'estado' => match ($est) {
                    'CUMPLE' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
                    'POR_REVISAR' => ApplicabilityEngineService::ESTADO_POR_REVISAR,
                    default => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
                },
            ];
        }

        $desgloseEspecialidades = $this->directorioAliados->desglosePorEspecialidad($condicionesAdaptadas);

        return [
            'conteos_normativos' => $conteosNormativos,
            'desglose_especialidades' => $desgloseEspecialidades,
            'conteo_condiciones' => $conteoCondiciones,
        ];
    }

    private function resolverMetricasCumplimientoItem(Autoevaluacion $autoevaluacion, bool $esFlujoNuevo, array $conteoCondiciones): array
    {
        $porcentaje = (float) $autoevaluacion->porcentaje_cumplimiento;
        $semaforo = $autoevaluacion->semaforo;

        $debeRecalcular = ! $autoevaluacion->estaRegistrada()
            || $porcentaje <= 0.0
            || empty($semaforo)
            || $semaforo === 'PENDIENTE';

        if ($esFlujoNuevo && $conteoCondiciones['total'] > 0 && $debeRecalcular) {
            $metricas = $this->riskService->calcularMetricasCumplimiento(
                $conteoCondiciones['total'],
                $conteoCondiciones['cumple']
            );
            $porcentaje = $metricas['porcentaje'];
            $semaforo = $metricas['semaforo'];
        }

        return [
            'porcentaje' => $porcentaje,
            'semaforo' => $semaforo,
        ];
    }

    /**
     * Retorna el checklist dinámico de autoevaluación generado por el motor de aplicabilidad.
     */
    public function checklistDinamico(Request $request, string $uuid): Response|JsonResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $checklist = $this->applicabilityEngine->generarChecklistDinamico($autoevaluacion);
        $checklist = $this->adjuntarRecursosEducativosAChecklist($checklist);

        if (! $request->wantsJson() && ! $request->is(self::RUTA_API_PATTERN)) {
            return Inertia::render('Evaluacion/Checklist', [
                'autoevaluacion' => [
                    'id' => $autoevaluacion->id,
                    'uuid' => $autoevaluacion->uuid_trazabilidad,
                    'nombre_comercio' => $autoevaluacion->nombre_comercio,
                    'direccion' => $autoevaluacion->direccion,
                    'estado' => $autoevaluacion->estado,
                    'registrada_at' => $autoevaluacion->registrada_at?->format(self::FORMATO_FECHA_HORA),
                    'hash_integridad' => $autoevaluacion->hash_integridad,
                ],
                'checklist' => $checklist,
            ]);
        }

        return response()->json($checklist, 200, [
            'Cache-Control' => self::CACHE_CONTROL_NO_STORE,
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Registra las declaraciones ciudadanas sobre los criterios evaluables del checklist dinámico.
     * Rechaza de forma estricta el estado NO_APLICA como respuesta ciudadana y bloquea modificaciones
     * si la autoevaluación ya se encuentra REGISTRADA.
     */
    public function guardarDeclaracionesChecklist(StoreChecklistDeclaracionesRequest $request, string $uuid): JsonResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        if ($autoevaluacion->estaRegistrada()) {
            return response()->json([
                'error' => 'autoevaluacion_registrada',
                'mensaje' => 'La autoevaluación ya se encuentra registrada y protegida contra modificaciones. No se pueden modificar las declaraciones.',
            ], 409);
        }

        $respuestasInput = $request->validated('respuestas');
        $respuestasGuardadas = [];

        try {
            DB::transaction(function () use ($autoevaluacion, $respuestasInput, &$respuestasGuardadas) {
                foreach ($respuestasInput as $item) {
                    $codigo = $item['codigo'];
                    $estado = $item['estado'];
                    $notas = $item['notas'] ?? null;

                    $respuesta = $this->applicabilityEngine->registrarRespuestaCiudadana(
                        $autoevaluacion,
                        $codigo,
                        $estado,
                        $notas
                    );

                    $respuestasGuardadas[] = [
                        'id' => $respuesta->id,
                        'codigo' => $codigo,
                        'estado' => $respuesta->estado_respuesta,
                        'notas' => $respuesta->notas_ciudadano,
                    ];
                }
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'declaracion_invalida',
                'mensaje' => $e->getMessage(),
            ], 422);
        }

        // Actualización inmediata de métricas agregadas en la entidad padre (MySQL)
        $resumenData = $this->applicabilityEngine->generarResumenDescriptivo($autoevaluacion);
        $conteos = $resumenData['conteos'];
        $metricas = $this->riskService->calcularMetricasCumplimiento(
            (int) ($conteos['total_criterios_aplicables'] ?? 0),
            (int) ($conteos['total_cumple_declarado'] ?? 0)
        );

        $autoevaluacion->update([
            'total_condiciones_evaluadas' => $conteos['total_criterios_aplicables'],
            'total_cumple_declarado' => $conteos['total_cumple_declarado'],
            'total_pendiente_atender' => $conteos['total_pendiente_atender'],
            'total_por_revisar' => $conteos['total_por_revisar'],
            'total_no_aplica' => $conteos['total_no_aplica'],
            'porcentaje_cumplimiento' => $metricas['porcentaje'],
            'semaforo' => $metricas['semaforo'],
        ]);

        $checklistActualizado = $this->applicabilityEngine->generarChecklistDinamico($autoevaluacion);
        $checklistActualizado = $this->adjuntarRecursosEducativosAChecklist($checklistActualizado);

        return response()->json([
            'mensaje' => 'Declaraciones registradas exitosamente.',
            'guardadas' => $respuestasGuardadas,
            'checklist' => $checklistActualizado,
        ], 200, [
            'Cache-Control' => self::CACHE_CONTROL_NO_STORE,
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Cierre formal e integridad de la autoevaluación (Bloque 3 — Paso 8).
     * Sella las declaraciones ciudadanas, calcula el hash determinístico SHA-256
     * y transiciona el estado de INICIADA a REGISTRADA.
     */
    public function finalizar(Request $request, string $uuid): JsonResponse|RedirectResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        // 1. Idempotencia: si ya está registrada, no recalcular ni alterar
        if ($autoevaluacion->estaRegistrada()) {
            return $this->respuestaAutoevaluacionYaRegistrada($request, $autoevaluacion);
        }

        // 2. Reconstruir checklist y validar que todos los criterios aplicables tengan declaración
        $checklist = $this->applicabilityEngine->generarChecklistDinamico($autoevaluacion);
        $pendientes = $this->obtenerCriteriosPendientesParaCierre($checklist);

        if (count($pendientes) > 0) {
            return $this->respuestaCriteriosPendientesCierre($request, $autoevaluacion, $pendientes);
        }

        // 3. Generar snapshot canónico normalizado y hash determinístico SHA-256
        $payloadCanonico = $this->applicabilityEngine->generarPayloadCanonico($autoevaluacion);
        $this->applicabilityEngine->normalizarArrayDeterminista($payloadCanonico);
        $hashIntegridad = $this->integridadService->calcularHashIntegridad($payloadCanonico);

        $resumenData = $this->applicabilityEngine->generarResumenDescriptivo($autoevaluacion);
        $conteos = $resumenData['conteos'];

        $metricas = $this->riskService->calcularMetricasCumplimiento(
            (int) ($conteos['total_criterios_aplicables'] ?? 0),
            (int) ($conteos['total_cumple_declarado'] ?? 0)
        );
        $porcentajeCumplimiento = $metricas['porcentaje'];
        $semaforo = $metricas['semaforo'];

        // 4. Transacción atómica para sellar la autoevaluación con su snapshot inmutable
        DB::transaction(function () use ($autoevaluacion, $payloadCanonico, $hashIntegridad, $conteos, $porcentajeCumplimiento, $semaforo) {
            $autoevaluacion->update([
                'estado' => Autoevaluacion::ESTADO_REGISTRADA,
                'registrada_at' => now(),
                'hash_integridad' => $hashIntegridad,
                'payload_canonico' => $payloadCanonico,
                'porcentaje_cumplimiento' => $porcentajeCumplimiento,
                'semaforo' => $semaforo,
                'total_condiciones_evaluadas' => $conteos['total_criterios_aplicables'],
                'total_cumple_declarado' => $conteos['total_cumple_declarado'],
                'total_pendiente_atender' => $conteos['total_pendiente_atender'],
                'total_por_revisar' => $conteos['total_por_revisar'],
                'total_no_aplica' => $conteos['total_no_aplica'],
            ]);
        });

        $request->session()->forget('guest_authorized_uuid');

        if ($request->wantsJson() || $request->is(self::RUTA_API_PATTERN)) {
            $resultado = response()->json([
                'mensaje' => 'Autoevaluación registrada correctamente y protegida contra modificaciones.',
                'estado' => Autoevaluacion::ESTADO_REGISTRADA,
                'registrada_at' => $autoevaluacion->fresh()->registrada_at?->toIso8601String(),
                'hash_integridad' => $hashIntegridad,
                'uuid' => $autoevaluacion->uuid_trazabilidad,
                'porcentaje_cumplimiento' => $porcentajeCumplimiento,
                'semaforo' => $semaforo,
            ], 200);
        } elseif (Auth::check()) {
            $resultado = redirect()->route('mis-autoevaluaciones')
                ->with('success', 'Autoevaluación actualizada correctamente');
        } else {
            $resultado = redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad])
                ->with('success', 'Autoevaluación registrada correctamente y protegida contra modificaciones.');
        }

        return $resultado;
    }

    /**
     * Muestra el resumen descriptivo y orientativo de la autoevaluación (Bloque 3 — Paso 5).
     * Proporciona los conteos absolutos y la clasificación de criterios declarados,
     * sin calcular porcentajes, semáforos ni puntuaciones oficiales.
     */
    public function resumen(Request $request, string $uuid): Response|JsonResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $datos = $this->evaluacionSyncService->obtenerDatosCompletos($autoevaluacion);

        $resumenData = $this->applicabilityEngine->generarResumenDescriptivo($autoevaluacion);
        $resumenData = $this->adjuntarRecursosEducativosAResumen($resumenData);
        $resumenData = $this->adjuntarAsistenciaTecnicaAResumen($resumenData);
        $resumenData = $this->adjuntarDesgloseEspecialidadesAResumen($resumenData);

        $datosAutoevaluacion = [
            'id' => $autoevaluacion->id,
            'uuid' => $autoevaluacion->uuid_trazabilidad,
            'nombre_comercio' => $datos['nombre_comercial'] ?: $autoevaluacion->nombre_comercio,
            'nombre_comercial' => $datos['nombre_comercial'] ?: $autoevaluacion->nombre_comercio,
            'funcion_economica' => $datos['giro'] ?: $autoevaluacion->funcion_economica,
            'giro' => $datos['giro'] ?: $autoevaluacion->funcion_economica,
            'ruc' => $datos['ruc'] ?: $autoevaluacion->ruc,
            'distrito' => $autoevaluacion->distrito,
            'direccion' => $datos['direccion'] ?: $autoevaluacion->direccion,
            // Código corto que el emprendedor reconoce (en lugar del UUID).
            'codigo_acceso' => $autoevaluacion->codigo_acceso,
            'area_techada' => $datos['area_techada'],
            'area_m2' => $autoevaluacion->area_m2 ?? ($datos['area_techada'] !== null ? (float) $datos['area_techada'] : null),
            'aforo_estimado' => $datos['aforo_estimado'],
            'aforo' => $datos['aforo_estimado'] ?: $autoevaluacion->aforo,
            'numero_pisos' => $datos['numero_pisos'],
            'pisos' => $datos['numero_pisos'] ?: $autoevaluacion->pisos,
            'codigo_acceso' => $autoevaluacion->codigo_acceso,
            'caracteristicas_declaradas' => $autoevaluacion->caracteristicas_declaradas,
            'estado' => $autoevaluacion->estado,
            'registrada_at' => $autoevaluacion->registrada_at?->format(self::FORMATO_FECHA_HORA),
            'hash_integridad' => $autoevaluacion->hash_integridad,
            'condiciones_evaluadas' => $datos['condiciones_evaluadas'],
        ];

        $payload = [
            'autoevaluacion' => $datosAutoevaluacion,
            'evaluacion' => $datosAutoevaluacion,
            'condiciones_evaluadas' => $datos['condiciones_evaluadas'],
            'resumen' => $resumenData['conteos'],
            'pendiente_atender' => $resumenData['pendiente_atender'],
            'por_revisar' => $resumenData['por_revisar'],
            'cumple_declarado' => $resumenData['cumple_declarado'],
            'no_aplica' => $resumenData['no_aplica'],
            'desglose_especialidades' => $resumenData['desglose_especialidades'],
            'clasificacion_tramite' => $this->clasificarModalidadTramite($autoevaluacion),
            // Cuántas condiciones corrigió el emprendedor después de evaluar (con foto o descripción).
            'corregidas' => $this->subsanacionSync()->codigosCorregidos($autoevaluacion)->count(),
        ];

        if (! $request->wantsJson() && ! $request->is(self::RUTA_API_PATTERN)) {
            return Inertia::render('Evaluacion/Resumen', $payload);
        }

        return response()->json($payload, 200, [
            'Cache-Control' => self::CACHE_CONTROL_NO_STORE,
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Muestra el expediente técnico digital consolidado del establecimiento comercial.
     *
     * Agrupa la autoevaluación raíz inmutable junto con su serie histórica de reevaluaciones
     * vinculadas (A -> B, C), desgloses técnicos y cálculo de variaciones netas.
     */
    public function expediente(Request $request, string $uuid): Response|JsonResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $proceso = $this->construirProcesoPreventivo($autoevaluacion);

        if ($request->wantsJson()) {
            return response()->json([
                'proceso' => $proceso,
                'uuidSeleccionado' => $uuid,
            ]);
        }

        return Inertia::render('Evaluacion/ExpedienteLocal', [
            'proceso' => $proceso,
            'uuidSeleccionado' => $uuid,
        ]);
    }

    /**
     * Construye la estructura agregada ProcesoPreventivo para la vista de Expediente Local.
     *
     * @return array<string, mixed>
     */
    private function construirProcesoPreventivo(Autoevaluacion $autoevaluacion): array
    {
        // 1. Resolver el nodo raíz original inmutable
        $root = $autoevaluacion;
        while ($root->evaluacion_origen_id !== null && $root->evaluacionOrigen !== null) {
            $root = $root->evaluacionOrigen;
        }

        $root->loadMissing(['simulaciones.subsanaciones', 'respuestas', 'reevaluaciones']);

        // 2. Obtener todas las reevaluaciones de la serie en orden cronológico
        $reevaluaciones = Autoevaluacion::with(['simulaciones.subsanaciones', 'evaluacionOrigen', 'respuestas'])
            ->where('evaluacion_origen_id', $root->id)
            ->orderBy('id', 'asc')
            ->get();

        // 3. Determinar la última evaluación de la serie
        $ultimaEvaluacion = $reevaluaciones->isNotEmpty() ? $reevaluaciones->last() : $root;

        $originalItem = $this->formatearItemMisEvaluaciones($root);
        $reevaluacionesItems = $reevaluaciones->map(fn (Autoevaluacion $r) => $this->formatearItemMisEvaluaciones($r))->values()->all();
        $ultimaItem = $this->formatearItemMisEvaluaciones($ultimaEvaluacion);

        $origCumple = (int) ($originalItem['conteo_condiciones']['cumple'] ?? 0);
        $origNoCumple = (int) ($originalItem['conteo_condiciones']['no_cumple'] ?? 0);
        $origPorRevisar = (int) ($originalItem['conteo_condiciones']['por_revisar'] ?? 0);
        $origNa = (int) ($originalItem['conteo_condiciones']['na'] ?? 0);
        $origPct = (float) ($originalItem['porcentaje_cumplimiento'] ?? 0);

        $ultCumple = (int) ($ultimaItem['conteo_condiciones']['cumple'] ?? 0);
        $ultNoCumple = (int) ($ultimaItem['conteo_condiciones']['no_cumple'] ?? 0);
        $ultPorRevisar = (int) ($ultimaItem['conteo_condiciones']['por_revisar'] ?? 0);
        $ultNa = (int) ($ultimaItem['conteo_condiciones']['na'] ?? 0);
        $ultPct = (float) ($ultimaItem['porcentaje_cumplimiento'] ?? 0);

        return [
            'id' => $root->id,
            'nombre_comercio' => $root->nombre_comercio,
            'funcion_economica' => $root->funcion_economica,
            'ruc' => $root->ruc,
            'direccion' => $root->direccion,
            'original' => $originalItem,
            'reevaluaciones' => $reevaluacionesItems,
            'ultimaEvaluacion' => $ultimaItem,
            'tieneReevaluaciones' => count($reevaluacionesItems) > 0,
            'difPorcentaje' => round($ultPct - $origPct, 1),
            'difCumple' => $ultCumple - $origCumple,
            'difNoCumple' => $ultNoCumple - $origNoCumple,
            'difPorRevisar' => $ultPorRevisar - $origPorRevisar,
            'difNa' => $ultNa - $origNa,
        ];
    }

    public function anexoOficial(string $uuid, Request $request): Response
    {
        $evaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        $this->autorizarAccesoAutoevaluacion($request, $evaluacion);

        $numero = $request->query('numero', '4');
        $esExAnte = in_array(strtoupper($evaluacion->nivel_riesgo ?? ''), ['ALTO', 'MUY ALTO', 'MUY_ALTO']);

        $condiciones = $this->condicionesParaAnexo($evaluacion);

        $cumplen = $condiciones->filter(fn ($c) => in_array($c['estado'], ['CUMPLE', 'CUMPLE_DECLARADO']))->count();
        $total = $condiciones->count();

        return inertia('Evaluacion/AnexoOficial', [
            'numero' => (string) $numero,
            'autoevaluacion' => $evaluacion,
            'titular' => [
                'nombre_comercial' => $evaluacion->nombre_comercio ?? '',
                'razon_social' => $evaluacion->nombre_comercio ?? '',
                'ruc' => $evaluacion->ruc ?? '',
                'direccion' => $evaluacion->direccion ?: ($evaluacion->sector_huancayo ?? ''),
                'giro' => $evaluacion->funcion_economica ?? '',
            ],
            'riesgoTramite' => [
                'nivel_riesgo' => $evaluacion->nivel_riesgo ?? 'MEDIO',
                'es_ex_ante' => $esExAnte,
                'tipo_tramite' => $evaluacion->tipo_tramite ?? ($esExAnte ? 'EX_ANTE' : 'EX_POST'),
            ],
            'clasificacion' => [
                'nivel' => $evaluacion->nivel_riesgo ?? 'MEDIO',
                'es_previa' => $esExAnte,
            ],
            'condiciones' => $condiciones,
            'conteo' => [
                'total' => $total,
                'cumple' => $cumplen,
                'no_cumple' => $condiciones->where('estado', 'NO_CUMPLE')->count(),
                'por_revisar' => $condiciones->where('estado', 'POR_REVISAR')->count(),
                'porcentaje' => (float) ($evaluacion->porcentaje_cumplimiento ?? 0),
            ],
            // El mismo código corto que el emprendedor ve en su resumen (no un trozo del UUID).
            'codigoDocumento' => $evaluacion->codigo_acceso ?: 'ITSE-'.substr($evaluacion->uuid_trazabilidad, 0, 8),
            'fechaEmision' => optional($evaluacion->created_at)->format(self::FORMATO_FECHA) ?? date(self::FORMATO_FECHA),
            'urlResumen' => route('autoevaluacion.resumen', ['uuid' => $uuid]),
        ]);
    }

    /**
     * Condiciones que se listan en la declaración jurada. Las evaluaciones actuales
     * guardan sus respuestas en `respuestas_autoevaluacion`; las antiguas, en
     * `detalle_checklist`. Antes solo se leía el formato antiguo y el Anexo 4 salía
     * con "0 condiciones" para cualquier evaluación nueva.
     *
     * @return Collection<int, array{codigo: string, nombre: string, estado: string, observacion: string, es_critico: bool}>
     */
    private function condicionesParaAnexo(Autoevaluacion $evaluacion): Collection
    {
        if ($evaluacion->respuestas()->exists()) {
            $datos = $this->evaluacionSyncService->obtenerDatosCompletos($evaluacion);

            return collect($datos['condiciones_evaluadas'])
                ->reject(fn (array $condicion): bool => $condicion['estado_actual'] === 'NO_APLICA')
                ->map(fn (array $condicion): array => [
                    'codigo' => (string) $condicion['codigo'],
                    'nombre' => (string) $condicion['titulo'],
                    'estado' => match ($condicion['estado_actual']) {
                        'CUMPLE_DECLARADO' => 'CUMPLE',
                        'PENDIENTE_ATENDER' => 'NO_CUMPLE',
                        default => (string) $condicion['estado_actual'],
                    },
                    'observacion' => '',
                    'es_critico' => false,
                ])
                ->values();
        }

        return collect($evaluacion->detalle_checklist ?? [])->map(fn (array $item): array => [
            'codigo' => $item['codigo'] ?? '',
            'nombre' => $item['nombre'] ?? $item['pregunta'] ?? $item['codigo'] ?? '',
            'estado' => $item['estado'] ?? (($item['cumple'] ?? false) ? 'CUMPLE' : 'NO_CUMPLE'),
            'observacion' => $item['observacion'] ?? '',
            'es_critico' => (bool) ($item['es_critico'] ?? false),
        ])->values();
    }
}
