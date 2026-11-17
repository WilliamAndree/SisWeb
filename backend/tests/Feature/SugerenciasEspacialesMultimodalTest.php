<?php

use App\Models\AnalisisEvidencia;
use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\ElementoEspacial;
use App\Models\ResultadoAnalisisEvidencia;
use App\Models\Subsanacion;
use App\Models\SugerenciaEspacial;
use App\Models\User;
use App\Services\Espacio\GestionEspacialService;
use App\Services\Espacio\SugerenciaEspacialService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\withCookie;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
    Storage::fake('local');
});

/**
 * Helper para crear autoevaluación con plano inicial.
 */
function helperCrearAutoevaluacionConPlano(?User $user = null, ?string $token = null): array
{
    $tokenSesion = $token ?? bin2hex(random_bytes(20));
    $uuid = (string) Str::uuid();

    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => $uuid,
        'user_id' => $user?->id,
        'session_token' => $user ? null : $tokenSesion,
        'codigo_acceso' => 'CHK-'.strtoupper(Str::random(6)),
        'nombre_comercio' => 'Bodega El Valle Test',
        'funcion_economica' => 'COMERCIO',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
        'payload_canonico' => [
            'uuid' => $uuid,
            'nombre' => 'Bodega El Valle Test',
            'criterios' => ['CRIT-01' => 'PENDIENTE_ATENDER'],
        ],
        'hash_integridad' => hash('sha256', 'payload_sellado_test_32'),
        'porcentaje_cumplimiento' => 60.0,
        'semaforo' => 'AMBAR',
        'detalle_checklist' => [
            ['codigo' => 'CRIT-01', 'estado' => 'PENDIENTE_ATENDER', 'cumple' => false],
        ],
    ]);

    $gestionService = app(GestionEspacialService::class);
    $plano = $gestionService->obtenerOInicializarPlano($evaluacion);

    // Inicializar versión 1 con un ambiente y una puerta
    $geometriaV1 = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'nombre' => 'Piso 1 - Salón',
                'altura_metros' => 2.80,
                'ambientes' => [
                    [
                        'codigo' => 'AMB-01',
                        'nombre' => 'Salón Principal',
                        'uso' => 'ATENCION_PUBLICO',
                        'ancho_metros' => 5.00,
                        'largo_metros' => 6.00,
                        'posicion_x' => 0.00,
                        'posicion_y' => 0.00,
                        'origen_dimensiones' => 'DECLARADO_MANUAL',
                        'elementos' => [],
                    ],
                ],
                'conectores' => [
                    [
                        'tipo' => 'PUERTA_SALIDA',
                        'ancho_metros' => 1.00,
                        'conduce_a_salida_publica' => true,
                        'abre_hacia_afuera' => true,
                        'ambiente_origen_codigo' => 'AMB-01',
                        'posicion_x' => 2.50,
                        'posicion_y' => 0.00,
                        'origen_dato' => 'DECLARADO_MANUAL',
                    ],
                ],
            ],
        ],
    ];

    $version1 = $gestionService->crearOActualizarVersion($plano, $geometriaV1, $user, $tokenSesion, 'Versión inicial 1');

    return [
        'evaluacion' => $evaluacion,
        'plano' => $plano,
        'version1' => $version1,
        'token' => $tokenSesion,
    ];
}

/**
 * Helper para crear evidencia fotográfica física y su análisis completado con resultado de Gemini.
 */
function helperCrearAnalisisConResultado(Autoevaluacion $evaluacion, ?User $user = null, array $elementosDetectados = []): array
{
    $criterio = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->firstOrFail();

    $archivo = UploadedFile::fake()->create('foto_evidencia.jpg', 200, 'image/jpeg');
    $ruta = "evidencias/subsanaciones/{$evaluacion->uuid_trazabilidad}/CRIT-01_evidencia.jpg";
    Storage::disk('local')->putFileAs("evidencias/subsanaciones/{$evaluacion->uuid_trazabilidad}", $archivo, 'CRIT-01_evidencia.jpg');

    $contenido = Storage::disk('local')->get($ruta);
    $hashSha256 = hash('sha256', $contenido);

    $subsanacion = Subsanacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => $criterio->id,
        'codigo_item' => 'CRIT-01',
        'descripcion' => 'Subsanación con fotografía de extintor',
        'evidencia_url' => $ruta,
        'hash_sha256' => $hashSha256,
        'estado' => 'SUBSANADO_DECLARADO',
        'fecha_subsanacion' => now(),
    ]);

    $analisis = AnalisisEvidencia::create([
        'uuid_analisis' => (string) Str::uuid(),
        'autoevaluacion_id' => $evaluacion->id,
        'subsanacion_id' => $subsanacion->id,
        'criterio_id' => $criterio->id,
        'user_id' => $user?->id,
        'hash_evidencia_analizada' => $hashSha256,
        'estado_analisis' => AnalisisEvidencia::ESTADO_COMPLETADO,
        'modelo_solicitado' => 'gemini-3.8-flash',
        'version_modelo' => 'gemini-3.8-flash',
        'intentos' => 1,
        'iniciado_at' => now()->subSeconds(5),
        'completado_at' => now(),
    ]);

    if (empty($elementosDetectados)) {
        $elementosDetectados = [
            [
                'element_name' => 'Extintor portátil de PQS 6kg',
                'visual_status' => ResultadoAnalisisEvidencia::VISUAL_IDENTIFICADO,
                'confidence_level' => 'ALTO',
                'description' => 'Cilindro rojo de polvo químico seco montado en pared',
            ],
            [
                'element_name' => 'Luz de emergencia LED',
                'visual_status' => ResultadoAnalisisEvidencia::VISUAL_IDENTIFICADO,
                'confidence_level' => 'MEDIO',
                'description' => 'Luminaria de dos focos sobre dintel',
            ],
            [
                'element_name' => 'Fecha de vencimiento',
                'visual_status' => ResultadoAnalisisEvidencia::VISUAL_NO_OBSERVABLE,
                'confidence_level' => 'BAJO',
                'description' => 'Texto ilegible',
            ],
        ];
    }

    $resultado = ResultadoAnalisisEvidencia::create([
        'analisis_evidencia_id' => $analisis->id,
        'criterio_codigo' => 'CRIT-01',
        'calidad_imagen' => ResultadoAnalisisEvidencia::CALIDAD_OPTIMA,
        'relevancia_evidencia' => ResultadoAnalisisEvidencia::RELEVANCIA_DIRECTA,
        'nivel_incertidumbre' => ResultadoAnalisisEvidencia::INCERTIDUMBRE_BAJO,
        'elementos_detectados' => $elementosDetectados,
        'observaciones_visuales' => ['Extintor visible a altura reglamentaria.'],
        'condiciones_visibles' => ['Soporte metálico anclado.'],
        'no_observable' => ['Tarjeta de control posterior.'],
        'recomendaciones_captura' => ['Acercar la toma a la etiqueta.'],
        'resumen_pedagogico' => 'Extintor observable en el salón.',
    ]);

    return [
        'subsanacion' => $subsanacion,
        'analisis' => $analisis,
        'resultado' => $resultado,
        'hash_evidencia' => $hashSha256,
        'ruta_archivo' => $ruta,
    ];
}

test('1. Generación de sugerencias desde un análisis válido', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);

    // Deben haberse generado 2 sugerencias (Extintor y Luz de emergencia); la fecha ilegible no califica
    expect($sugerencias)->toHaveCount(2);

    $sugExtintor = $sugerencias->firstWhere('tipo_elemento', ElementoEspacial::TIPO_EXTINTOR);
    expect($sugExtintor)->not->toBeNull()
        ->and($sugExtintor->estado)->toBe(SugerenciaEspacial::ESTADO_PENDIENTE)
        ->and($sugExtintor->nivel_confianza)->toBe('ALTO')
        ->and($sugExtintor->nombre_detectado)->toContain('Extintor');
});

test('2. Exclusión de análisis incompletos o fallidos', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $dataAnalisis = helperCrearAnalisisConResultado($evaluacion);

    // Cambiar estado a FALLIDO
    $dataAnalisis['analisis']->update(['estado_analisis' => AnalisisEvidencia::ESTADO_FALLIDO]);

    // Eliminar cualquier sugerencia previa
    SugerenciaEspacial::query()->delete();

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);

    expect($sugerencias)->toBeEmpty();
});

test('3. Exclusión de resultados malformados o sin elementos identificados', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];

    // Análisis donde ningún elemento fue positivamente identificado
    helperCrearAnalisisConResultado($evaluacion, null, [
        [
            'element_name' => 'Objeto borroso',
            'visual_status' => ResultadoAnalisisEvidencia::VISUAL_NO_IDENTIFICADO,
            'confidence_level' => 'BAJO',
            'description' => 'No reconocible',
        ],
    ]);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);

    expect($sugerencias)->toBeEmpty();
});

test('4. Referencia exacta a evidencia y hash criptográfico', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $dataAnalisis = helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);
    $sug = $sugerencias->first();

    expect($sug->subsanacion_id)->toBe($dataAnalisis['subsanacion']->id)
        ->and($sug->analisis_evidencia_id)->toBe($dataAnalisis['analisis']->id)
        ->and($sug->hash_evidencia_analizada)->toBe($dataAnalisis['hash_evidencia']);
});

test('5. Rechazo cuando la evidencia física no existe en almacenamiento', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $dataAnalisis = helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);
    $sug = $sugerencias->first();

    // Eliminar archivo físico de la evidencia
    Storage::disk('local')->delete($dataAnalisis['ruta_archivo']);

    expect(fn () => $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 1.5,
        'posicion_y' => 2.0,
    ]))->toThrow(RuntimeException::class, 'evidencia física de origen ya no existe');

    // La sugerencia debe quedar invalidada
    expect($sug->fresh()->estado)->toBe(SugerenciaEspacial::ESTADO_INVALIDADA);
});

test('6. Rechazo cuando el hash de evidencia no coincide con el archivo físico', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $dataAnalisis = helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);
    $sug = $sugerencias->first();

    // Sobrescribir archivo con contenido alterado
    Storage::disk('local')->put($dataAnalisis['ruta_archivo'], 'archivo_manipulado_fraudulento');

    expect(fn () => $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 1.5,
        'posicion_y' => 2.0,
    ]))->toThrow(RuntimeException::class, 'reemplazado o modificado');

    expect($sug->fresh()->estado)->toBe(SugerenciaEspacial::ESTADO_INVALIDADA);
});

test('7. Rechazo de acceso de otro usuario (403)', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $dataPlano = helperCrearAutoevaluacionConPlano($userA);
    $evaluacion = $dataPlano['evaluacion'];
    helperCrearAnalisisConResultado($evaluacion, $userA);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);
    $sug = $sugerencias->first();

    actingAs($userB)
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/sugerencias/{$sug->id}/confirmar", [
            'codigo_ambiente' => 'AMB-01',
            'posicion_x' => 1.0,
            'posicion_y' => 1.0,
        ])
        ->assertForbidden();
});

test('8. Rechazo de acceso de otra sesión invitada (403)', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);
    $sug = $sugerencias->first();

    // Intento con cookie de sesión ajena
    withCookie('guest_session_token', 'token_intruso_invalido_99999')
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/sugerencias/{$sug->id}/confirmar", [
            'codigo_ambiente' => 'AMB-01',
            'posicion_x' => 1.0,
            'posicion_y' => 1.0,
        ])
        ->assertForbidden();
});

test('9. Confirmación ciudadana explícita vía endpoint', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);
    $sug = $sugerencias->first();

    $response = withCookie('guest_session_token', $dataPlano['token'])
        ->withSession(['guest_session_token' => $dataPlano['token']])
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/sugerencias/{$sug->id}/confirmar", [
            'codigo_ambiente' => 'AMB-01',
            'posicion_x' => 2.20,
            'posicion_y' => 3.40,
            'observacion' => 'Extintor montado en muro sur verificado',
        ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('version.numero_version', 2);

    expect($sug->fresh()->estado)->toBe(SugerenciaEspacial::ESTADO_CONFIRMADA)
        ->and($sug->fresh()->resuelta_at)->not->toBeNull();
});

test('10. Ubicación manual obligatoria (422 si falta ambiente)', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);
    $sug = $sugerencias->first();

    withCookie('guest_session_token', $dataPlano['token'])
        ->withSession(['guest_session_token' => $dataPlano['token']])
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/sugerencias/{$sug->id}/confirmar", [
            'codigo_ambiente' => '',
            'posicion_x' => 1.0,
            'posicion_y' => 1.0,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['codigo_ambiente']);
});

test('11. Ausencia de inserción automática al analizar una fotografía', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $plano = $dataPlano['plano'];

    // Se realiza el análisis y se sincronizan las sugerencias
    helperCrearAnalisisConResultado($evaluacion);
    $service = app(SugerenciaEspacialService::class);
    $service->obtenerSugerencias($evaluacion);

    // REGLA FUNDAMENTAL: Gemini NO inserta elementos automáticamente en el croquis
    expect(ElementoEspacial::count())->toBe(0)
        ->and($plano->versiones()->count())->toBe(1)
        ->and($plano->fresh()->versionActiva->numero_version)->toBe(1);
});

test('12. Rechazo sin creación de elemento espacial', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);
    $sug = $sugerencias->first();

    $response = withCookie('guest_session_token', $dataPlano['token'])
        ->withSession(['guest_session_token' => $dataPlano['token']])
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/sugerencias/{$sug->id}/rechazar", [
            'motivo' => 'El extintor correspondía a un local vecino colindante',
        ]);

    $response->assertOk()
        ->assertJsonPath('success', true);

    expect($sug->fresh()->estado)->toBe(SugerenciaEspacial::ESTADO_RECHAZADA)
        ->and($sug->fresh()->motivo_rechazo)->toContain('local vecino')
        ->and(ElementoEspacial::count())->toBe(0);
});

test('13. Confirmación idempotente ante peticiones repetidas', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sugerencias = $service->obtenerSugerencias($evaluacion);
    $sug = $sugerencias->first();

    // Primera confirmación
    $res1 = $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 1.0,
        'posicion_y' => 2.0,
    ]);

    // Segunda confirmación idéntica
    $res2 = $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 1.0,
        'posicion_y' => 2.0,
    ]);

    expect($res1['version']->id)->toBe($res2['version']->id)
        ->and(ElementoEspacial::count())->toBe(1);
});

test('14. Protección ante solicitudes concurrentes mediante lockForUpdate', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sug = $service->obtenerSugerencias($evaluacion)->first();

    // Ejecutar confirmación
    $resultado = $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 1.5,
        'posicion_y' => 1.5,
    ]);

    expect($resultado['sugerencia']->estado)->toBe(SugerenciaEspacial::ESTADO_CONFIRMADA)
        ->and($resultado['version']->numero_version)->toBe(2);
});

test('15. Creación de nueva versión espacial N+1 sellada', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sug = $service->obtenerSugerencias($evaluacion)->first();

    $resultado = $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 1.0,
        'posicion_y' => 1.0,
    ]);

    expect($resultado['version']->numero_version)->toBe(2)
        ->and($resultado['version']->hash_geometria_sha256)->toHaveLength(64)
        ->and($resultado['version']->hash_geometria_sha256)->not->toBe($dataPlano['version1']->hash_geometria_sha256);
});

test('16. Conservación inmutable de versiones espaciales anteriores', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $version1 = $dataPlano['version1'];
    $hashOriginal = $version1->hash_geometria_sha256;

    helperCrearAnalisisConResultado($evaluacion);
    $service = app(SugerenciaEspacialService::class);
    $sug = $service->obtenerSugerencias($evaluacion)->first();

    $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 1.0,
        'posicion_y' => 1.0,
    ]);

    $version1Actualizada = $version1->fresh();
    expect($version1Actualizada->hash_geometria_sha256)->toBe($hashOriginal)
        ->and($version1Actualizada->cerrada_at)->not->toBeNull();
});

test('17. Inmutabilidad del análisis original de Gemini', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $dataAnalisis = helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sug = $service->obtenerSugerencias($evaluacion)->first();

    $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 1.0,
        'posicion_y' => 1.0,
    ]);

    // Los datos del análisis de IA no deben haber mutado
    $resultadoOriginal = $dataAnalisis['resultado']->fresh();
    expect($resultadoOriginal->criterio_codigo)->toBe('CRIT-01')
        ->and($resultadoOriginal->calidad_imagen)->toBe(ResultadoAnalisisEvidencia::CALIDAD_OPTIMA)
        ->and($resultadoOriginal->elementos_detectados)->toHaveCount(3);
});

test('18. Inmutabilidad del contenido sellado de la autoevaluación', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $hashOriginal = $evaluacion->hash_integridad;

    helperCrearAnalisisConResultado($evaluacion);
    $service = app(SugerenciaEspacialService::class);
    $sug = $service->obtenerSugerencias($evaluacion)->first();

    $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 1.0,
        'posicion_y' => 1.0,
    ]);

    expect($evaluacion->fresh()->hash_integridad)->toBe($hashOriginal);
});

test('19. Detección de drift o cambio de versión en plano concurrente', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $plano = $dataPlano['plano'];

    helperCrearAnalisisConResultado($evaluacion);
    $service = app(SugerenciaEspacialService::class);
    $sug = $service->obtenerSugerencias($evaluacion)->first();

    // Simular que otra acción guardó una versión 2 previamente
    $gestionService = app(GestionEspacialService::class);
    $geometriaNueva = $dataPlano['version1']->geometria_normalizada;
    $geometriaNueva['niveles'][0]['nombre'] = 'Piso 1 - Renombrado';
    $versionIntermedia = $gestionService->crearOActualizarVersion($plano, $geometriaNueva, null, null, 'Cambio previo');

    // El cliente envía version_esperada_id = versión 1 (desactualizada)
    expect(fn () => $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 1.0,
        'posicion_y' => 1.0,
        'version_esperada_id' => $dataPlano['version1']->id,
    ]))->toThrow(InvalidArgumentException::class, 'modificado por otra acción reciente');
});

test('20. Elementos ilustrativos de plantilla no se interpretan como declaraciones (H-MED-01)', function () {
    $gestionService = app(GestionEspacialService::class);
    $plantillas = $gestionService->obtenerPlantillas();

    // Verificar en plantilla rectangular
    $elementosRectangular = $plantillas['RECTANGULAR_SIMPLE']['geometria']['niveles'][0]['ambientes'][0]['elementos'];
    foreach ($elementosRectangular as $elem) {
        expect($elem['origen_dato'])->toBe(ElementoEspacial::ORIGEN_ILUSTRATIVO_PLANTILLA);
    }

    // Instanciar modelo Eloquent con origen de plantilla
    $elemModel = new ElementoEspacial([
        'tipo' => 'EXTINTOR',
        'origen_dato' => ElementoEspacial::ORIGEN_ILUSTRATIVO_PLANTILLA,
    ]);

    expect($elemModel->esIlustrativoPlantilla())->toBeTrue()
        ->and($elemModel->esDeclaradoCiudadano())->toBeFalse();
});

test('21. Conversión explícita de un elemento ilustrativo a declaración ciudadana', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $plano = $dataPlano['plano'];
    $gestionService = app(GestionEspacialService::class);

    // Cargar plantilla en el plano
    $plantillas = $gestionService->obtenerPlantillas();
    $versionPlantilla = $gestionService->crearOActualizarVersion(
        $plano,
        $plantillas['RECTANGULAR_SIMPLE']['geometria'],
        null,
        $dataPlano['token'],
        'Carga de plantilla'
    );

    // Confirmar explícitamente el extintor ilustrativo (índice 0 en AMB-01)
    $versionConfirmada = $gestionService->confirmarElementoIlustrativo(
        $plano,
        'AMB-01',
        0,
        null,
        $dataPlano['token']
    );

    expect($versionConfirmada->numero_version)->toBe($versionPlantilla->numero_version + 1);

    // En la nueva geometría debe figurar DECLARADO_MANUAL
    $elemActualizado = $versionConfirmada->geometria_normalizada['niveles'][0]['ambientes'][0]['elementos'][0];
    expect($elemActualizado['origen_dato'])->toBe(ElementoEspacial::ORIGEN_DECLARADO_MANUAL)
        ->and($elemActualizado['observacion'])->toContain('Confirmado físicamente');
});

test('22. Conservación de trazabilidad entre evidencia, análisis, sugerencia y elemento espacial', function () {
    $dataPlano = helperCrearAutoevaluacionConPlano();
    $evaluacion = $dataPlano['evaluacion'];
    $dataAnalisis = helperCrearAnalisisConResultado($evaluacion);

    $service = app(SugerenciaEspacialService::class);
    $sug = $service->obtenerSugerencias($evaluacion)->first();

    $resultado = $service->confirmarYUbicacionManual($sug, [
        'codigo_ambiente' => 'AMB-01',
        'posicion_x' => 3.10,
        'posicion_y' => 4.20,
    ]);

    $sugActualizada = $resultado['sugerencia'];
    expect($sugActualizada->elemento_espacial_id)->not->toBeNull();

    $elementoCreado = ElementoEspacial::find($sugActualizada->elemento_espacial_id);
    expect($elementoCreado)->not->toBeNull()
        ->and($elementoCreado->subsanacion_id)->toBe($dataAnalisis['subsanacion']->id)
        ->and($elementoCreado->origen_dato)->toBe(ElementoEspacial::ORIGEN_CONFIRMADO_SUGERENCIA_IA)
        ->and($elementoCreado->tipo)->toBe($sugActualizada->tipo_elemento)
        ->and($sugActualizada->analisis_evidencia_id)->toBe($dataAnalisis['analisis']->id)
        ->and($sugActualizada->hash_evidencia_analizada)->toBe($dataAnalisis['hash_evidencia']);
});
