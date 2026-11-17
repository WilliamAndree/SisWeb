<?php

use App\Jobs\AnalisisEvidenciaJob;
use App\Models\AnalisisEvidencia;
use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\ResultadoAnalisisEvidencia;
use App\Models\Subsanacion;
use App\Models\User;
use App\Services\AI\AnalisisEvidenciaService;
use App\Services\AI\ValidacionResultadoIAService;
use App\Services\Evaluacion\IntegridadEvaluacionService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\GeminiFixture;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\withCookie;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
    Storage::fake('local');
    Config::set('services.gemini.api_key', 'test_gemini_api_key_valid_12345');
    Config::set('services.gemini.model', 'gemini-3.8-flash');
    Config::set('services.gemini.max_retries', 0);
});

function helperCrearAutoevaluacionParaIA(?User $user = null, ?string $token = null): Autoevaluacion
{
    $tokenSesion = $token ?? (string) Str::random(40);
    $payloadCanonico = [
        'caracteristicas' => ['area_m2' => 80.0, 'pisos' => 1, 'usa_glp' => false],
        'criterios' => [
            ['codigo' => 'CRIT-01', 'estado_declarado' => 'PENDIENTE_ATENDER'],
        ],
        'establecimiento' => ['nombre_comercio' => 'Bodega IA Test'],
    ];

    $integridadSvc = app(IntegridadEvaluacionService::class);
    $hash = $integridadSvc->calcularHashIntegridad($payloadCanonico);

    return Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $user?->id,
        'session_token' => $user ? null : $tokenSesion,
        'codigo_acceso' => 'CHK-'.strtoupper(Str::random(6)),
        'nombre_comercio' => 'Bodega IA Test',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
        'hash_integridad' => $hash,
        'payload_canonico' => $payloadCanonico,
        'porcentaje_cumplimiento' => 50.0,
        'semaforo' => 'AMBAR',
        'total_condiciones_evaluadas' => 13,
        'total_cumple_declarado' => 6,
        'total_pendiente_atender' => 7,
        'total_por_revisar' => 0,
        'total_no_aplica' => 0,
        'detalle_checklist' => [
            ['codigo' => 'CRIT-01', 'estado' => 'PENDIENTE', 'cumple' => false],
        ],
    ]);
}

function helperCrearSubsanacionConArchivo(Autoevaluacion $autoevaluacion, string $extension = 'jpg', int $tamanoKb = 100): Subsanacion
{
    $criterio = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->firstOrFail();

    $archivo = in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)
        ? UploadedFile::fake()->createWithContent("evidencia_test.{$extension}", GeminiFixture::imagen())
        : UploadedFile::fake()->create("evidencia_test.{$extension}", $tamanoKb);
    $ruta = "evidencias/subsanaciones/{$autoevaluacion->uuid_trazabilidad}/CRIT-01_test.{$extension}";
    Storage::disk('local')->putFileAs("evidencias/subsanaciones/{$autoevaluacion->uuid_trazabilidad}", $archivo, "CRIT-01_test.{$extension}");

    $hashSha256 = hash('sha256', Storage::disk('local')->get($ruta));

    return Subsanacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $criterio->id,
        'codigo_item' => 'CRIT-01',
        'descripcion' => 'Subsanación de extintor con fotografía',
        'evidencia_url' => $ruta,
        'hash_sha256' => $hashSha256,
        'estado' => 'SUBSANADO_DECLARADO',
        'fecha_subsanacion' => now(),
    ]);
}

function mockRespuestaGeminiValida(): array
{
    $datos = [
        'criterion_code' => 'CRIT-01',
        'image_quality' => 'OPTIMA',
        'evidence_relevance' => 'DIRECTAMENTE_PERTINENTE',
        'detected_elements' => [
            [
                'element_name' => 'Extintor portátil de PQS',
                'visual_status' => 'IDENTIFICADO_VISUALMENTE',
                'confidence_level' => 'ALTO',
                'description' => 'Cilindro rojo de polvo químico seco montado en soporte de pared.',
            ],
            [
                'element_name' => 'Tarjeta de recarga anual',
                'visual_status' => 'NO_OBSERVABLE_CON_CLARIDAD',
                'confidence_level' => 'MEDIO',
                'description' => 'Tarjeta visible pero texto ilegible por distancia.',
            ],
        ],
        'visual_observations' => [
            'Extintor ubicado a altura reglamentaria.',
            'Acceso frontal despejado.',
        ],
        'visible_conditions' => [
            'Equipo instalado en soporte adecuado.',
        ],
        'not_observable' => [
            'Fecha exacta de recarga en tarjeta.',
            'Cartel de señalización superior.',
        ],
        'uncertainty_level' => 'BAJO',
        'photo_improvement_recommendations' => [
            'Tomar una foto en primer plano de la tarjeta de recarga.',
        ],
        'pedagogical_summary' => 'Tu extintor se encuentra montado y accesible. Se recomienda verificar la fecha de vencimiento de la tarjeta.',
    ];

    return [
        'candidates' => [
            [
                'content' => [
                    'parts' => [
                        [
                            'text' => json_encode($datos),
                        ],
                    ],
                ],
            ],
        ],
        'usageMetadata' => [
            'promptTokenCount' => 280,
            'candidatesTokenCount' => 210,
        ],
    ];
}

/*
|--------------------------------------------------------------------------
| Pruebas de Autorización y Acceso
|--------------------------------------------------------------------------
*/

test('1. Propietario autenticado solicita análisis y recibe 202 con job encolado', function () {
    Queue::fake();
    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    actingAs($user);

    $url = route('autoevaluacion.evidencia.analizar', [
        'uuid' => $autoevaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]);

    $response = postJson($url);

    $response->assertStatus(202)
        ->assertJson([
            'success' => true,
            'estado' => AnalisisEvidencia::ESTADO_PENDIENTE,
        ])
        ->assertJsonStructure(['success', 'mensaje', 'analisis_uuid', 'estado']);

    Queue::assertPushed(AnalisisEvidenciaJob::class);
    expect(AnalisisEvidencia::where('subsanacion_id', $subsanacion->id)->count())->toBe(1);
});

test('2. Usuario no autorizado (intruso) recibe 403 Forbidden al solicitar análisis', function () {
    Queue::fake();
    $propietario = User::factory()->create();
    $intruso = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($propietario);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    actingAs($intruso);

    $url = route('autoevaluacion.evidencia.analizar', [
        'uuid' => $autoevaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]);

    postJson($url)->assertForbidden();
    Queue::assertNothingPushed();
});

test('3. Invitado titular con su cookie legítima puede solicitar análisis con 202', function () {
    Queue::fake();
    $token = 'guest_token_ia_1234567890';
    $autoevaluacion = helperCrearAutoevaluacionParaIA(null, $token);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'png');

    $url = route('autoevaluacion.evidencia.analizar', [
        'uuid' => $autoevaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]);

    withCookie('guest_session_token', $token)
        ->withSession(['guest_session_token' => $token])
        ->postJson($url)
        ->assertStatus(202);

    Queue::assertPushed(AnalisisEvidenciaJob::class);
});

test('4. Invitado sin cookie o con cookie ajena recibe 403 Forbidden', function () {
    Queue::fake();
    $tokenReal = 'token_real_legitimo_123';
    $tokenAtacante = 'token_atacante_ajeno_999';
    $autoevaluacion = helperCrearAutoevaluacionParaIA(null, $tokenReal);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    $url = route('autoevaluacion.evidencia.analizar', [
        'uuid' => $autoevaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]);

    // Sin cookie -> 403
    postJson($url)->assertForbidden();

    // Con cookie ajena -> 403
    withCookie('guest_session_token', $tokenAtacante)
        ->postJson($url)
        ->assertForbidden();

    Queue::assertNothingPushed();
});

test('5. Acceso a subsanación que pertenece a otra evaluación retorna 404', function () {
    $user = User::factory()->create();
    $autoevaluacion1 = helperCrearAutoevaluacionParaIA($user);
    $autoevaluacion2 = helperCrearAutoevaluacionParaIA($user);
    $subsanacionAjena = helperCrearSubsanacionConArchivo($autoevaluacion2, 'jpg');

    actingAs($user);

    $url = route('autoevaluacion.evidencia.analizar', [
        'uuid' => $autoevaluacion1->uuid_trazabilidad,
        'subsanacion' => $subsanacionAjena->id,
    ]);

    postJson($url)->assertNotFound();
});

/*
|--------------------------------------------------------------------------
| Validaciones de Entrada e Idempotencia
|--------------------------------------------------------------------------
*/

test('6. Idempotencia: solicitudes repetidas devuelven el análisis activo existente sin duplicar Jobs', function () {
    Queue::fake();
    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    actingAs($user);

    $url = route('autoevaluacion.evidencia.analizar', [
        'uuid' => $autoevaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]);

    $res1 = postJson($url)->assertStatus(202);
    $uuid1 = $res1->json('analisis_uuid');

    $res2 = postJson($url)->assertStatus(202);
    $uuid2 = $res2->json('analisis_uuid');

    expect($uuid1)->toBe($uuid2)
        ->and(AnalisisEvidencia::where('subsanacion_id', $subsanacion->id)->count())->toBe(1);

    Queue::assertPushed(AnalisisEvidenciaJob::class, 1);
});

test('7. Documento PDF es rechazado amigablemente con 422 para análisis visual', function () {
    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'pdf');

    actingAs($user);

    $url = route('autoevaluacion.evidencia.analizar', [
        'uuid' => $autoevaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]);

    $response = postJson($url);

    $response->assertStatus(422)
        ->assertJson([
            'error' => 'archivo_invalido',
        ]);

    expect($response->json('mensaje'))->toContain('PDF');
});

test('8. Archivo inexistente en almacenamiento retorna 400', function () {
    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    // Forzamos eliminación del archivo físico en storage fake
    Storage::disk('local')->delete($subsanacion->evidencia_url);

    actingAs($user);

    $url = route('autoevaluacion.evidencia.analizar', [
        'uuid' => $autoevaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]);

    postJson($url)->assertStatus(400)
        ->assertJson([
            'error' => 'error_analisis',
        ]);
});

/*
|--------------------------------------------------------------------------
| Procesamiento del Job y Comunicación con Gemini (Http::fake)
|--------------------------------------------------------------------------
*/

test('9. Procesamiento exitoso del Job persiste resultado y marca COMPLETADO', function () {
    Queue::fake();
    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response(mockRespuestaGeminiValida(), 200),
    ]);

    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    $service = app(AnalisisEvidenciaService::class);
    $analisis = $service->solicitarAnalisis($autoevaluacion, $subsanacion, $user);

    $job = new AnalisisEvidenciaJob($analisis->id);
    $job->handle($service);

    $analisis->refresh();
    expect($analisis->estado_analisis)->toBe(AnalisisEvidencia::ESTADO_COMPLETADO)
        ->and($analisis->completado_at)->not->toBeNull()
        ->and($analisis->resultado)->not->toBeNull()
        ->and($analisis->resultado->criterio_codigo)->toBe('CRIT-01')
        ->and($analisis->resultado->calidad_imagen)->toBe('OPTIMA')
        ->and($analisis->resultado->elementos_detectados)->toHaveCount(2)
        ->and($analisis->resultado->tokens_entrada)->toBe(280)
        ->and($analisis->resultado->tokens_salida)->toBe(210);
});

test('10. Detección de discrepancia de hash al procesar el Job marca REQUIERE_REVISION sin enviar foto', function () {
    Queue::fake();
    Http::fake(); // No debe llamarse a Gemini

    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    $service = app(AnalisisEvidenciaService::class);
    $analisis = $service->solicitarAnalisis($autoevaluacion, $subsanacion, $user);

    // Simulamos que el archivo en disco fue reemplazado con contenido diferente
    Storage::disk('local')->put($subsanacion->evidencia_url, 'nuevo_contenido_modificado_diferente');

    $job = new AnalisisEvidenciaJob($analisis->id);
    $job->handle($service);

    $analisis->refresh();
    expect($analisis->estado_analisis)->toBe(AnalisisEvidencia::ESTADO_REQUIERE_REVISION)
        ->and($analisis->mensaje_error)->toContain('reemplazada o modificada');

    Http::assertNothingSent();
});

test('11. Error HTTP 429 de cuota en Gemini es manejado limpiamente', function () {
    Queue::fake();
    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response(['error' => ['message' => 'Resource has been exhausted (e.g. check quota).']], 429),
    ]);

    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    $service = app(AnalisisEvidenciaService::class);
    $analisis = $service->solicitarAnalisis($autoevaluacion, $subsanacion, $user);

    $job = new AnalisisEvidenciaJob($analisis->id);
    try {
        $job->handle($service);
    } catch (Throwable $e) {
        // El job captura o re-lanza para reintento
    }

    $analisis->refresh();
    expect($analisis->estado_analisis)->toBe(AnalisisEvidencia::ESTADO_FALLIDO)
        ->and($analisis->mensaje_error)->toContain('cuota');
});

test('12. Respuesta con imagen ILEGIBLE marca estado REQUIERE_REVISION', function () {
    Queue::fake();
    $datosIlegible = mockRespuestaGeminiValida();
    $datosObj = json_decode($datosIlegible['candidates'][0]['content']['parts'][0]['text'], true);
    $datosObj['image_quality'] = 'ILEGIBLE';
    $datosObj['detected_elements'] = [];
    $datosIlegible['candidates'][0]['content']['parts'][0]['text'] = json_encode($datosObj);

    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response($datosIlegible, 200),
    ]);

    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    $service = app(AnalisisEvidenciaService::class);
    $analisis = $service->solicitarAnalisis($autoevaluacion, $subsanacion, $user);

    $job = new AnalisisEvidenciaJob($analisis->id);
    $job->handle($service);

    $analisis->refresh();
    expect($analisis->estado_analisis)->toBe(AnalisisEvidencia::ESTADO_REQUIERE_REVISION)
        ->and($analisis->resultado->calidad_imagen)->toBe('ILEGIBLE');
});

/*
|--------------------------------------------------------------------------
| Integridad Criptográfica y Ausencia de Mutación del Diagnóstico Sellado
|--------------------------------------------------------------------------
*/

test('13. El análisis de IA NO altera el payload_canonico ni el hash_integridad sellados', function () {
    Queue::fake();
    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response(mockRespuestaGeminiValida(), 200),
    ]);

    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $hashOriginal = $autoevaluacion->hash_integridad;
    $payloadOriginal = $autoevaluacion->payload_canonico;

    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    $service = app(AnalisisEvidenciaService::class);
    $analisis = $service->solicitarAnalisis($autoevaluacion, $subsanacion, $user);

    $job = new AnalisisEvidenciaJob($analisis->id);
    $job->handle($service);

    $autoevaluacion->refresh();

    expect($autoevaluacion->hash_integridad)->toBe($hashOriginal)
        ->and($autoevaluacion->payload_canonico)->toBe($payloadOriginal)
        ->and($autoevaluacion->estado)->toBe(Autoevaluacion::ESTADO_REGISTRADA);
});

/*
|--------------------------------------------------------------------------
| Endpoints de Consulta de Estado e Historial
|--------------------------------------------------------------------------
*/

test('14. Consulta de estado GET /analisis/{uuid}/estado retorna resultado completo al titular', function () {
    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    $analisis = AnalisisEvidencia::create([
        'uuid_analisis' => (string) Str::uuid(),
        'autoevaluacion_id' => $autoevaluacion->id,
        'subsanacion_id' => $subsanacion->id,
        'criterio_id' => $subsanacion->criterio_id,
        'hash_evidencia_analizada' => $subsanacion->hash_sha256,
        'estado_analisis' => AnalisisEvidencia::ESTADO_COMPLETADO,
        'modelo_solicitado' => 'gemini-3.8-flash',
        'completado_at' => now(),
    ]);

    ResultadoAnalisisEvidencia::create([
        'analisis_evidencia_id' => $analisis->id,
        'criterio_codigo' => 'CRIT-01',
        'calidad_imagen' => 'OPTIMA',
        'relevancia_evidencia' => 'DIRECTAMENTE_PERTINENTE',
        'nivel_incertidumbre' => 'BAJO',
        'elementos_detectados' => [['element_name' => 'Extintor', 'visual_status' => 'IDENTIFICADO_VISUALMENTE']],
        'resumen_pedagogico' => 'Extintor verificado correctamente.',
    ]);

    actingAs($user);

    $url = route('autoevaluacion.analisis.estado', [
        'uuid' => $autoevaluacion->uuid_trazabilidad,
        'analisisUuid' => $analisis->uuid_analisis,
    ]);

    $response = getJson($url);

    $response->assertOk()
        ->assertJson([
            'uuid_analisis' => $analisis->uuid_analisis,
            'estado' => 'COMPLETADO',
            'resultado' => [
                'criterio_codigo' => 'CRIT-01',
                'calidad_imagen' => 'OPTIMA',
            ],
        ]);
});

test('15. Historial de análisis GET /evidencias/{subsanacion}/analisis lista análisis vinculados', function () {
    $user = User::factory()->create();
    $autoevaluacion = helperCrearAutoevaluacionParaIA($user);
    $subsanacion = helperCrearSubsanacionConArchivo($autoevaluacion, 'jpg');

    $analisis1 = AnalisisEvidencia::create([
        'uuid_analisis' => (string) Str::uuid(),
        'autoevaluacion_id' => $autoevaluacion->id,
        'subsanacion_id' => $subsanacion->id,
        'hash_evidencia_analizada' => $subsanacion->hash_sha256,
        'estado_analisis' => AnalisisEvidencia::ESTADO_COMPLETADO,
    ]);

    $analisis2 = AnalisisEvidencia::create([
        'uuid_analisis' => (string) Str::uuid(),
        'autoevaluacion_id' => $autoevaluacion->id,
        'subsanacion_id' => $subsanacion->id,
        'hash_evidencia_analizada' => $subsanacion->hash_sha256,
        'estado_analisis' => AnalisisEvidencia::ESTADO_REQUIERE_REVISION,
    ]);

    actingAs($user);

    $url = route('autoevaluacion.evidencia.analisis.historial', [
        'uuid' => $autoevaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]);

    $response = getJson($url);

    $response->assertOk();
    $historial = $response->json('historial');
    expect($historial)->toHaveCount(2);
});

/*
|--------------------------------------------------------------------------
| Validaciones Semánticas y Saneamiento de Expresiones Categóricas
|--------------------------------------------------------------------------
*/

test('16. ValidacionResultadoIAService sanea términos categóricos prohibidos', function () {
    $servicio = app(ValidacionResultadoIAService::class);

    $raw = [
        'criterion_code' => 'CRIT-01',
        'image_quality' => 'OPTIMA',
        'evidence_relevance' => 'DIRECTAMENTE_PERTINENTE',
        'detected_elements' => [
            [
                'element_name' => 'Extintor aprobado',
                'visual_status' => 'IDENTIFICADO_VISUALMENTE',
                'confidence_level' => 'ALTO',
                'description' => 'El extintor cumple con la norma y está certificado para inspección.',
            ],
        ],
        'visual_observations' => ['El comercio está inmune a clausura'],
        'visible_conditions' => ['conforme para inspección'],
        'not_observable' => [],
        'uncertainty_level' => 'BAJO',
        'photo_improvement_recommendations' => [],
        'pedagogical_summary' => 'Su extintor cumple la norma y está garantizado.',
    ];

    $saneado = $servicio->validarYSanear($raw);

    expect($saneado['visual_observations'][0])->not->toContain('inmune a clausura')
        ->and($saneado['visible_conditions'][0])->not->toContain('conforme para inspección')
        ->and($saneado['pedagogical_summary'])->not->toContain('garantizado')
        ->and($saneado['detected_elements'][0]['description'])->not->toContain('cumple con la norma');
});

test('17. ValidacionResultadoIAService rechaza payloads con campos faltantes arrojando InvalidArgumentException', function () {
    $servicio = app(ValidacionResultadoIAService::class);
    $incompleto = ['criterion_code' => 'CRIT-01'];

    expect(fn () => $servicio->validarYSanear($incompleto))->toThrow(InvalidArgumentException::class);
});
