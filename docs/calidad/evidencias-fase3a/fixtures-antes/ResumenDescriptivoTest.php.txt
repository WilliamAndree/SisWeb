<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

function crearEvaluacionParaResumen(array $overrides = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Cafetería Real Huancayo',
        'ruc' => '20123456789',
        'direccion' => 'Calle Real 123',
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => true,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ], $overrides));
}

test('1. La ruta GET /autoevaluacion/{uuid}/resumen responde 200 y renderiza el componente Inertia Evaluacion/Resumen', function () {
    $evaluacion = crearEvaluacionParaResumen();

    $response = $this->get(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]));

    $response->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resumen')
            ->has('autoevaluacion')
            ->has('resumen')
            ->has('pendiente_atender')
            ->has('por_revisar')
            ->has('cumple_declarado')
            ->has('no_aplica')
            ->where('autoevaluacion.uuid', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluacion.nombre_comercio', 'Cafetería Real Huancayo')
            ->where('autoevaluacion.ruc', '20123456789')
            ->where('autoevaluacion.direccion', 'Calle Real 123')
        );
});

test('2. El resumen entrega exclusivamente conteos absolutos sin porcentajes, semaforos ni calificaciones', function () {
    $evaluacion = crearEvaluacionParaResumen();

    $response = $this->getJson(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]));

    $response->assertStatus(200);
    $data = $response->json();

    // Verificación de conteos absolutos
    expect($data['resumen'])->toHaveKeys([
        'total_criterios_aplicables',
        'total_cumple_declarado',
        'total_pendiente_atender',
        'total_por_revisar',
        'total_no_aplica',
    ]);

    // Verificación de que son enteros y suman correctamente
    expect($data['resumen']['total_criterios_aplicables'])->toBeInt()
        ->and($data['resumen']['total_no_aplica'])->toBe(1) // CRIT-11 no aplica porque tiene_escaleras = false
        ->and($data['resumen']['total_criterios_aplicables'])->toBe(12);

    // Verificación estricta de que NO existen campos prohibidos
    expect($data['resumen'])->not->toHaveKey('porcentaje_cumplimiento')
        ->and($data['resumen'])->not->toHaveKey('porcentaje')
        ->and($data['resumen'])->not->toHaveKey('semaforo')
        ->and($data['resumen'])->not->toHaveKey('nivel_riesgo')
        ->and($data['resumen'])->not->toHaveKey('calificacion')
        ->and($data['resumen'])->not->toHaveKey('puntuacion')
        ->and($data['resumen'])->not->toHaveKey('costo_total');
});

test('3. Separa correctamente las cuatro colecciones descriptivas de criterios', function () {
    $evaluacion = crearEvaluacionParaResumen([
        'usa_glp' => false, // CRIT-10 -> NO_APLICA
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    /** @var ApplicabilityEngineService $engine */
    $engine = app(ApplicabilityEngineService::class);

    // Registramos declaraciones ciudadanas:
    // CRIT-01: CUMPLE_DECLARADO
    $engine->registrarRespuestaCiudadana($evaluacion, 'CRIT-01', 'CUMPLE_DECLARADO');
    // CRIT-02A: PENDIENTE_ATENDER
    $engine->registrarRespuestaCiudadana($evaluacion, 'CRIT-02A', 'PENDIENTE_ATENDER');
    // CRIT-03: POR_REVISAR
    $engine->registrarRespuestaCiudadana($evaluacion, 'CRIT-03', 'POR_REVISAR');

    $response = $this->getJson(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]));

    $response->assertStatus(200);
    $data = $response->json();

    // 1. PENDIENTE_ATENDER
    expect($data['pendiente_atender'])->toHaveCount(1)
        ->and($data['pendiente_atender'][0]['codigo'])->toBe('CRIT-02A')
        ->and($data['pendiente_atender'][0])->toHaveKeys([
            'codigo',
            'titulo',
            'que_observar',
            'accion_mejora_orientativa',
            'norma_base',
        ]);

    // 2. POR_REVISAR
    expect($data['por_revisar'])->toHaveCount(1)
        ->and($data['por_revisar'][0]['codigo'])->toBe('CRIT-03')
        ->and($data['por_revisar'][0])->toHaveKeys([
            'codigo',
            'titulo',
            'que_observar',
            'orientacion',
        ]);

    // 3. CUMPLE_DECLARADO
    expect($data['cumple_declarado'])->toHaveCount(1)
        ->and($data['cumple_declarado'][0]['codigo'])->toBe('CRIT-01')
        ->and($data['cumple_declarado'][0]['declaracion'])->toBeString()->not->toBeEmpty();

    // 4. NO_APLICA
    expect($data['no_aplica'])->toHaveCount(1)
        ->and($data['no_aplica'][0]['codigo'])->toBe('CRIT-10')
        ->and($data['no_aplica'][0]['motivo'])->toBeString()->not->toBeEmpty();

    // Conteos
    expect($data['resumen']['total_cumple_declarado'])->toBe(1)
        ->and($data['resumen']['total_pendiente_atender'])->toBe(1)
        ->and($data['resumen']['total_por_revisar'])->toBe(1)
        ->and($data['resumen']['total_no_aplica'])->toBe(1)
        ->and($data['resumen']['total_criterios_aplicables'])->toBe(12);
});

test('4. Control de acceso: usuario registrado solo puede consultar sus propias autoevaluaciones', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    $evaluacion = crearEvaluacionParaResumen(['user_id' => $user1->id]);

    // Usuario titular -> 200
    $this->actingAs($user1)
        ->get(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200);

    // Otro usuario autenticado -> 403
    $this->actingAs($user2)
        ->get(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(403);
});

test('5. Control de acceso: token de sesión de invitado', function () {
    $evaluacion = crearEvaluacionParaResumen([
        'user_id' => null,
        'session_token' => 'token_invitado_valido_123',
    ]);

    // Con cookie coincidente -> 200
    $this->withCookie('guest_session_token', 'token_invitado_valido_123')
        ->get(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200);

    // Con cookie diferente -> 403
    $this->withCookie('guest_session_token', 'token_invalido_999')
        ->get(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(403);
});

test('6. UUID inexistente retorna 404', function () {
    $this->get(route('autoevaluacion.resumen', ['uuid' => (string) Str::uuid()]))
        ->assertStatus(404);
});

test('7. Flujo completo: guardar declaraciones en checklist y consultar resumen descriptivo', function () {
    $evaluacion = crearEvaluacionParaResumen([
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    // 1. Guardar declaraciones en POST /autoevaluacion/{uuid}/checklist
    $postResponse = $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", [
        'respuestas' => [
            ['codigo' => 'CRIT-01', 'estado' => 'CUMPLE_DECLARADO'],
            ['codigo' => 'CRIT-02A', 'estado' => 'PENDIENTE_ATENDER'],
            ['codigo' => 'CRIT-04', 'estado' => 'POR_REVISAR'],
        ],
    ]);

    $postResponse->assertStatus(200)
        ->assertJson([
            'mensaje' => 'Declaraciones registradas exitosamente.',
        ]);

    // 2. Acceder al resumen: GET /autoevaluacion/{uuid}/resumen
    $resumenResponse = $this->get(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]));

    $resumenResponse->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resumen')
            ->where('resumen.total_criterios_aplicables', 13)
            ->where('resumen.total_cumple_declarado', 1)
            ->where('resumen.total_pendiente_atender', 1)
            ->where('resumen.total_por_revisar', 1)
            ->where('resumen.total_no_aplica', 0)
            ->has('pendiente_atender', 1)
            ->where('pendiente_atender.0.codigo', 'CRIT-02A')
            ->has('por_revisar', 1)
            ->where('por_revisar.0.codigo', 'CRIT-04')
            ->has('cumple_declarado', 1)
            ->where('cumple_declarado.0.codigo', 'CRIT-01')
        );
});

test('8. UX-04.2: El resumen incluye funcion_economica, codigo_acceso y proyecta notas personales en los criterios', function () {
    $evaluacion = crearEvaluacionParaResumen([
        'funcion_economica' => 'Comercio (Bodegas, Farmacias)',
        'codigo_acceso' => 'CHK-7890',
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    // Guardar declaraciones con nota en CRIT-02A y sin nota en CRIT-01
    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", [
        'respuestas' => [
            ['codigo' => 'CRIT-01', 'estado' => 'CUMPLE_DECLARADO', 'notas' => null],
            ['codigo' => 'CRIT-02A', 'estado' => 'PENDIENTE_ATENDER', 'notas' => 'Revisar con electricista el lunes'],
            ['codigo' => 'CRIT-04', 'estado' => 'POR_REVISAR', 'notas' => 'Consultar si el extintor está vigente'],
        ],
    ])->assertStatus(200);

    $response = $this->get(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]));

    $response->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resumen')
            ->where('autoevaluacion.funcion_economica', 'Comercio (Bodegas, Farmacias)')
            ->where('autoevaluacion.codigo_acceso', 'CHK-7890')
            ->where('pendiente_atender.0.codigo', 'CRIT-02A')
            ->where('pendiente_atender.0.notas', 'Revisar con electricista el lunes')
            ->where('por_revisar.0.codigo', 'CRIT-04')
            ->where('por_revisar.0.notas', 'Consultar si el extintor está vigente')
            ->where('cumple_declarado.0.codigo', 'CRIT-01')
            ->where('cumple_declarado.0.notas', null)
        );
});

test('9. UX-04.2: En estado REGISTRADA la evaluación es inmutable y permite iniciar reevaluación en topología estrella', function () {
    $user = User::factory()->create();
    $evaluacion = crearEvaluacionParaResumen([
        'user_id' => $user->id,
        'usa_glp' => false,
        'tiene_equipos_fritura' => false,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => false,
    ]);

    /** @var ApplicabilityEngineService $engine */
    $engine = app(ApplicabilityEngineService::class);
    $checklist = $engine->generarChecklistDinamico($evaluacion);
    foreach ($checklist['criterios'] as $criterio) {
        $engine->registrarRespuestaCiudadana($evaluacion, $criterio['codigo'], 'CUMPLE_DECLARADO');
    }

    // Finalizar formalmente
    $this->actingAs($user)
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/finalizar")
        ->assertStatus(200);

    $evaluacion->refresh();
    expect($evaluacion->estaRegistrada())->toBeTrue()
        ->and($evaluacion->hash_integridad)->not->toBeNull();

    $hashOriginal = $evaluacion->hash_integridad;

    // Consultar resumen en estado REGISTRADA
    $response = $this->actingAs($user)
        ->get(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]));
    $response->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resumen')
            ->where('autoevaluacion.estado', 'REGISTRADA')
            ->where('autoevaluacion.hash_integridad', $hashOriginal)
        );

    // Acceder a la ruta de reevaluación preventiva
    $reevaluarResponse = $this->actingAs($user)
        ->get(route('autoevaluacion.reevaluar', ['uuid' => $evaluacion->uuid_trazabilidad]));
    $reevaluarResponse->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Nueva')
            ->has('reevaluacionDe')
            ->where('reevaluacionDe.uuid', $evaluacion->uuid_trazabilidad)
            ->where('reevaluacionDe.nombre_comercio', $evaluacion->nombre_comercio)
        );

    // Verificar que la evaluación original no ha sufrido mutación
    $evaluacion->refresh();
    expect($evaluacion->hash_integridad)->toBe($hashOriginal)
        ->and($evaluacion->estaRegistrada())->toBeTrue();
});
