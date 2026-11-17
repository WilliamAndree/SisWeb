<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\withCookie;
use function Pest\Laravel\withSession;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

function crearEvaluacionPaso9(array $overrides = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Bodega Central Huancayo',
        'funcion_economica' => 'Comercio',
        'ruc' => '20123456789',
        'direccion' => 'Av. Giráldez 321',
        'area_m2' => 80.0,
        'pisos' => 1,
        'aforo' => 20,
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'PENDIENTE',
        'detalle_checklist' => [],
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'registrada_at' => null,
        'hash_integridad' => null,
    ], $overrides));
}

function generarDeclaracionesNormativas(Autoevaluacion $evaluacion, string $estado = 'CUMPLE_DECLARADO'): array
{
    $service = app(ApplicabilityEngineService::class);
    $checklist = $service->generarChecklistDinamico($evaluacion);
    $respuestas = [];

    foreach ($checklist['criterios'] as $criterio) {
        $respuestas[] = [
            'codigo' => $criterio['codigo'],
            'estado' => $estado,
            'notas' => 'Declaración de prueba para '.$criterio['codigo'],
        ];
    }

    return $respuestas;
}

// =========================================================================
// 1. SEGURIDAD DE ACCESO Y AUTORIZACIÓN ESTRICTA
// =========================================================================

test('1.1 Seguridad de Acceso: autoevaluación anónima sin cookie ni sesión rechaza con 403 en checklist, resumen y finalizar', function () {
    $tokenInvitado = 'token_anonimo_seguro_'.Str::random(16);
    $evaluacion = crearEvaluacionPaso9([
        'session_token' => $tokenInvitado,
        'user_id' => null,
    ]);

    // a) GET checklist
    $this->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist")
        ->assertForbidden();

    // b) GET resumen
    $this->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/resumen")
        ->assertForbidden();

    // c) POST checklist declaraciones
    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", [
        'respuestas' => [
            ['codigo' => 'CRIT-01', 'estado' => 'CUMPLE_DECLARADO'],
        ],
    ])->assertForbidden();

    // d) POST finalizar
    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/finalizar")
        ->assertForbidden();
});

test('1.2 Seguridad de Acceso: autoevaluación anónima con cookie legítima permite acceso 200 en checklist y resumen', function () {
    $tokenInvitado = 'token_anonimo_legitimo_'.Str::random(16);
    $evaluacion = crearEvaluacionPaso9([
        'session_token' => $tokenInvitado,
        'user_id' => null,
    ]);

    // GET checklist con cookie válida
    withCookie('guest_session_token', $tokenInvitado)
        ->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist")
        ->assertOk();

    // GET resumen con cookie válida
    withCookie('guest_session_token', $tokenInvitado)
        ->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/resumen")
        ->assertOk();
});

test('1.3 Seguridad de Acceso: autoevaluación de usuario autenticado rechaza con 403 a otro usuario', function () {
    $titular = User::factory()->create();
    $intruso = User::factory()->create();

    $evaluacion = crearEvaluacionPaso9([
        'user_id' => $titular->id,
    ]);

    actingAs($intruso)
        ->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist")
        ->assertForbidden();

    actingAs($intruso)
        ->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/resumen")
        ->assertForbidden();

    actingAs($intruso)
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", [
            'respuestas' => [['codigo' => 'CRIT-01', 'estado' => 'CUMPLE_DECLARADO']],
        ])->assertForbidden();

    actingAs($intruso)
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/finalizar")
        ->assertForbidden();
});

test('1.4 Seguridad de Acceso: autoevaluación de usuario autenticado permite acceso 200 a su legítimo titular', function () {
    $titular = User::factory()->create();

    $evaluacion = crearEvaluacionPaso9([
        'user_id' => $titular->id,
    ]);

    actingAs($titular)
        ->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist")
        ->assertOk();

    actingAs($titular)
        ->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/resumen")
        ->assertOk();
});

test('1.5 Seguridad de Acceso: autoevaluación anónima con sesión inmediata recién creada permite acceso', function () {
    $evaluacion = crearEvaluacionPaso9([
        'session_token' => 'token_invitado_remoto',
        'user_id' => null,
    ]);

    withSession(['guest_authorized_uuid' => $evaluacion->uuid_trazabilidad])
        ->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist")
        ->assertOk();

    withSession(['guest_authorized_uuid' => $evaluacion->uuid_trazabilidad])
        ->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/resumen")
        ->assertOk();
});

// =========================================================================
// 2. HISTORIAL DE AUTOEVALUACIONES (mis-autoevaluaciones)
// =========================================================================

test('2.1 Historial: usuario autenticado con autoevaluación INICIADA la visualiza con estado INICIADA y datos del establecimiento', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionPaso9([
        'user_id' => $usuario->id,
        'nombre_comercio' => 'Cafetería San Carlos Huancayo',
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'registrada_at' => null,
    ]);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 1)
            ->where('autoevaluaciones.0.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluaciones.0.nombre_comercio', 'Cafetería San Carlos Huancayo')
            ->where('autoevaluaciones.0.estado', Autoevaluacion::ESTADO_INICIADA)
            ->where('autoevaluaciones.0.es_flujo_nuevo', true)
            ->where('autoevaluaciones.0.registrada_at', null)
        );
});

test('2.2 Historial: usuario autenticado con autoevaluación REGISTRADA la visualiza con estado REGISTRADA y fecha registrada_at', function () {
    $usuario = User::factory()->create();
    $fechaRegistro = Carbon::parse('2026-09-25 14:30:00');

    $evaluacion = crearEvaluacionPaso9([
        'user_id' => $usuario->id,
        'nombre_comercio' => 'Ferretería El Sol',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => $fechaRegistro,
        'hash_integridad' => hash('sha256', 'hash_test_historico'),
        'total_condiciones_evaluadas' => 10,
        'total_cumple_declarado' => 7,
        'total_pendiente_atender' => 2,
        'total_por_revisar' => 1,
        'total_no_aplica' => 4,
    ]);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 1)
            ->where('autoevaluaciones.0.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluaciones.0.estado', Autoevaluacion::ESTADO_REGISTRADA)
            ->where('autoevaluaciones.0.es_flujo_nuevo', true)
            ->where('autoevaluaciones.0.registrada_at', $fechaRegistro->format('d/m/Y H:i'))
        );
});

test('2.3 Historial: autoevaluación con respuestas normativas expone conteos descriptivos absolutos correctos', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionPaso9([
        'user_id' => $usuario->id,
    ]);

    // Declaramos respuestas en BD usando el motor de aplicabilidad
    $engine = app(ApplicabilityEngineService::class);
    $engine->registrarRespuestaCiudadana($evaluacion, 'CRIT-01', 'CUMPLE_DECLARADO', 'Notas 1');
    $engine->registrarRespuestaCiudadana($evaluacion, 'CRIT-02A', 'PENDIENTE_ATENDER', 'Notas 2');
    $engine->registrarRespuestaCiudadana($evaluacion, 'CRIT-03', 'POR_REVISAR', 'Notas 3');

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones.0.conteos_normativos', fn (Assert $conteos) => $conteos
                ->where('cumple_declarado', 1)
                ->where('pendiente_atender', 1)
                ->where('por_revisar', 1)
                ->etc()
            )
        );
});

test('2.4 Historial: aislamiento estricto entre usuarios, el usuario B no puede ver evaluaciones del usuario A', function () {
    $usuarioA = User::factory()->create();
    $usuarioB = User::factory()->create();

    $evaluacionA = crearEvaluacionPaso9(['user_id' => $usuarioA->id]);

    actingAs($usuarioB)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 0)
        );
});

test('2.5 Historial: autoevaluación legacy no rompe el historial y mantiene fallback controlado con es_flujo_nuevo false', function () {
    $usuario = User::factory()->create();

    $evaluacionLegacy = Autoevaluacion::create([
        'user_id' => $usuario->id,
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Bodega Antigua Legacy',
        'funcion_economica' => 'Comercio',
        'direccion' => 'Jr. Ancash 123',
        'area_m2' => 50,
        'pisos' => 1,
        'aforo' => 10,
        'porcentaje_cumplimiento' => 80.0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR', 'estado' => 'CUMPLE', 'cumple' => true],
            ['codigo' => 'BOTIQUIN', 'estado' => 'NO_CUMPLE', 'cumple' => false],
        ],
        'estado' => Autoevaluacion::ESTADO_INICIADA,
    ]);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 1)
            ->where('autoevaluaciones.0.uuid_trazabilidad', $evaluacionLegacy->uuid_trazabilidad)
            ->where('autoevaluaciones.0.es_flujo_nuevo', false)
            ->where('autoevaluaciones.0.semaforo', 'VERDE')
            ->where('autoevaluaciones.0.conteo_condiciones.cumple', 1)
            ->where('autoevaluaciones.0.conteo_condiciones.no_cumple', 1)
        );
});

// =========================================================================
// 3. VINCULACIÓN DE CUENTA Y PRESERVACIÓN DE INTEGRIDAD
// =========================================================================

test('3.1 Vinculación de Cuenta: usuario invitado vincula autoevaluación INICIADA, asigna user_id y redirige al destino indicado', function () {
    $usuario = User::factory()->create();
    $tokenInvitado = 'token_invitado_test_'.Str::random(12);

    $evaluacion = crearEvaluacionPaso9([
        'user_id' => null,
        'session_token' => $tokenInvitado,
        'estado' => Autoevaluacion::ESTADO_INICIADA,
    ]);

    $idOriginal = $evaluacion->id;
    $uuidOriginal = $evaluacion->uuid_trazabilidad;

    // Vinculación enviando destino 'checklist'
    $response = actingAs($usuario)
        ->withCookie('guest_session_token', $tokenInvitado)
        ->post(route('autoevaluacion.vincular-cuenta'), [
            'uuid' => $uuidOriginal,
            'destino' => 'checklist',
        ]);

    $response->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $uuidOriginal]));

    // Se verifica que NO se creó una segunda autoevaluación y se actualizó la misma
    expect(Autoevaluacion::where('uuid_trazabilidad', $uuidOriginal)->count())->toBe(1);
    $evaluacionActualizada = Autoevaluacion::findOrFail($idOriginal);
    expect($evaluacionActualizada->user_id)->toBe($usuario->id)
        ->and($evaluacionActualizada->estado)->toBe(Autoevaluacion::ESTADO_INICIADA);
});

test('3.2 Vinculación de Cuenta: vinculación con destino resumen redirige a la ruta de resumen', function () {
    $usuario = User::factory()->create();
    $tokenInvitado = 'token_invitado_resumen_'.Str::random(12);

    $evaluacion = crearEvaluacionPaso9([
        'user_id' => null,
        'session_token' => $tokenInvitado,
        'estado' => Autoevaluacion::ESTADO_INICIADA,
    ]);

    $response = actingAs($usuario)
        ->withCookie('guest_session_token', $tokenInvitado)
        ->post(route('autoevaluacion.vincular-cuenta'), [
            'uuid' => $evaluacion->uuid_trazabilidad,
            'destino' => 'resumen',
        ]);

    $response->assertRedirect(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]));
});

test('3.3 Vinculación de Cuenta: destino no permitido o malicioso es rechazado por validación estricta', function () {
    $usuario = User::factory()->create();
    $tokenInvitado = 'token_invitado_seguro_'.Str::random(12);

    $evaluacion = crearEvaluacionPaso9([
        'user_id' => null,
        'session_token' => $tokenInvitado,
    ]);

    $response = actingAs($usuario)
        ->withCookie('guest_session_token', $tokenInvitado)
        ->post(route('autoevaluacion.vincular-cuenta'), [
            'uuid' => $evaluacion->uuid_trazabilidad,
            'destino' => 'https://sitio-malicioso.com',
        ]);

    $response->assertSessionHasErrors(['destino']);
});

test('3.4 Vinculación de Cuenta: tras vincularse, la autoevaluación aparece inmediatamente en mis-autoevaluaciones', function () {
    $usuario = User::factory()->create();
    $tokenInvitado = 'token_invitado_historial_'.Str::random(12);

    $evaluacion = crearEvaluacionPaso9([
        'user_id' => null,
        'session_token' => $tokenInvitado,
        'nombre_comercio' => 'Librería Huancayo Vinculada',
    ]);

    actingAs($usuario)
        ->withCookie('guest_session_token', $tokenInvitado)
        ->post(route('autoevaluacion.vincular-cuenta'), [
            'uuid' => $evaluacion->uuid_trazabilidad,
            'destino' => 'checklist',
        ])
        ->assertSessionHasNoErrors();

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 1)
            ->where('autoevaluaciones.0.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluaciones.0.nombre_comercio', 'Librería Huancayo Vinculada')
        );
});

test('3.5 Preservación de Integridad Criptográfica: autoevaluación REGISTRADA conserva exactamente su snapshot y hash tras vincularse', function () {
    $usuario = User::factory()->create();
    $tokenInvitado = 'token_invitado_integridad_'.Str::random(12);

    $evaluacion = crearEvaluacionPaso9([
        'user_id' => null,
        'session_token' => $tokenInvitado,
    ]);

    // Declarar respuestas y finalizar para que quede REGISTRADA con snapshot y hash
    $declaraciones = generarDeclaracionesNormativas($evaluacion, 'CUMPLE_DECLARADO');
    withCookie('guest_session_token', $tokenInvitado)
        ->withCredentials()
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", [
            'respuestas' => $declaraciones,
        ])->assertOk();

    withCookie('guest_session_token', $tokenInvitado)
        ->withCredentials()
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/finalizar")
        ->assertOk();

    $evaluacionSellada = $evaluacion->fresh();
    expect($evaluacionSellada->estaRegistrada())->toBeTrue();

    $payloadOriginal = $evaluacionSellada->payload_canonico;
    $hashOriginal = $evaluacionSellada->hash_integridad;
    $fechaRegistroOriginal = $evaluacionSellada->registrada_at;
    $estadoOriginal = $evaluacionSellada->estado;

    // Vinculamos la autoevaluación a la cuenta del usuario
    actingAs($usuario)
        ->withCookie('guest_session_token', $tokenInvitado)
        ->post(route('autoevaluacion.vincular-cuenta'), [
            'uuid' => $evaluacion->uuid_trazabilidad,
            'destino' => 'resumen',
        ])
        ->assertSessionHasNoErrors();

    $evaluacionPostVinculacion = $evaluacionSellada->fresh();

    // Verificamos que user_id se actualizó
    expect($evaluacionPostVinculacion->user_id)->toBe($usuario->id)
        // Y que TODO lo relativo a la integridad quedó 100% inalterado
        ->and($evaluacionPostVinculacion->payload_canonico)->toEqual($payloadOriginal)
        ->and($evaluacionPostVinculacion->hash_integridad)->toBe($hashOriginal)
        ->and($evaluacionPostVinculacion->estado)->toBe($estadoOriginal)
        ->and($evaluacionPostVinculacion->registrada_at->toIso8601String())->toBe($fechaRegistroOriginal->toIso8601String());

    // Verificación criptográfica del snapshot persistido
    $engine = app(ApplicabilityEngineService::class);
    $payloadRecalculado = $evaluacionPostVinculacion->payload_canonico;
    $engine->normalizarArrayDeterminista($payloadRecalculado);
    $jsonRecalculado = (string) json_encode($payloadRecalculado, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $hashRecalculado = hash('sha256', $jsonRecalculado);

    expect($hashRecalculado)->toBe($hashOriginal);
});

// =========================================================================
// 4. REEVALUACIÓN Y TOPOLOGÍA ESTRELLA
// =========================================================================

test('4.1 Reevaluación: crear reevaluación desde A crea nueva autoevaluación B con parent_id = A->id y estado INICIADA', function () {
    $usuario = User::factory()->create();

    $evaluacionA = crearEvaluacionPaso9([
        'user_id' => $usuario->id,
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
        'hash_integridad' => hash('sha256', 'hash_a'),
    ]);

    $response = actingAs($usuario)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), [
            'nombre_comercio' => 'Bodega Central Modificada',
            'funcion_economica' => 'Comercio',
            'ruc' => '20123456789',
            'direccion' => 'Av. Giráldez 321',
            'area_m2' => 90.0,
            'pisos' => 1,
            'aforo' => 25,
            'usa_glp' => true,
        ]);

    $response->assertSessionHasNoErrors();

    $evaluacionB = Autoevaluacion::where('evaluacion_origen_id', $evaluacionA->id)->latest('id')->firstOrFail();

    expect($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id)
        ->and($evaluacionB->estado)->toBe(Autoevaluacion::ESTADO_INICIADA)
        ->and($evaluacionB->registrada_at)->toBeNull()
        ->and($evaluacionB->hash_integridad)->toBeNull()
        ->and($evaluacionB->user_id)->toBe($usuario->id);

    $response->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $evaluacionB->uuid_trazabilidad]));
});

test('4.2 Reevaluación: topología estrella estricta, reevaluación sobre B asigna parent_id = A->id y no crea cadena lineal', function () {
    $usuario = User::factory()->create();

    $evaluacionA = crearEvaluacionPaso9([
        'user_id' => $usuario->id,
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
        'hash_integridad' => hash('sha256', 'hash_a'),
    ]);

    // Creamos B como reevaluación de A
    $evaluacionB = crearEvaluacionPaso9([
        'user_id' => $usuario->id,
        'evaluacion_origen_id' => $evaluacionA->id,
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
        'hash_integridad' => hash('sha256', 'hash_b'),
    ]);

    // Solicitamos reevaluación referenciando a B
    actingAs($usuario)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionB->uuid_trazabilidad]), [
            'nombre_comercio' => 'Bodega Central Versión C',
            'funcion_economica' => 'Comercio',
            'ruc' => '20123456789',
            'area_m2' => 95.0,
            'pisos' => 1,
            'aforo' => 28,
        ])
        ->assertSessionHasNoErrors();

    $evaluacionC = Autoevaluacion::where('nombre_comercio', 'Bodega Central Versión C')->firstOrFail();

    // Comprobamos que evaluacion_origen_id de C es A y NO B (modelo estrella: A -> [B, C])
    expect($evaluacionC->evaluacion_origen_id)->toBe($evaluacionA->id)
        ->and($evaluacionC->evaluacion_origen_id)->not->toBe($evaluacionB->id)
        ->and($evaluacionC->estado)->toBe(Autoevaluacion::ESTADO_INICIADA);
});

test('4.3 Reevaluación: la autoevaluación origen A no sufre alteraciones tras reevaluaciones', function () {
    $usuario = User::factory()->create();
    $hashA = hash('sha256', 'hash_origen_a_intacto');
    $fechaRegistroA = Carbon::parse('2026-09-20 10:00:00');

    $evaluacionA = crearEvaluacionPaso9([
        'user_id' => $usuario->id,
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => $fechaRegistroA,
        'hash_integridad' => $hashA,
    ]);

    actingAs($usuario)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), [
            'nombre_comercio' => 'Bodega Central Versión Reevaluada',
            'funcion_economica' => 'Comercio',
            'ruc' => '20123456789',
            'area_m2' => 100.0,
            'pisos' => 1,
            'aforo' => 30,
        ])
        ->assertSessionHasNoErrors();

    $evaluacionAFresh = $evaluacionA->fresh();

    expect($evaluacionAFresh->estado)->toBe(Autoevaluacion::ESTADO_REGISTRADA)
        ->and($evaluacionAFresh->hash_integridad)->toBe($hashA)
        ->and($evaluacionAFresh->registrada_at->toIso8601String())->toBe($fechaRegistroA->toIso8601String())
        ->and($evaluacionAFresh->evaluacion_origen_id)->toBeNull();
});
