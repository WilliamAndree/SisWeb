<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('Fase 18 QA - La vista inicial de autoevaluacion carga correctamente el flujo de 4 pasos', function () {
    $response = $this->get(route('autoevaluacion.index'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Home')
            ->has('catalogo')
        );
});

test('Fase 18 QA - Un usuario registrado accede a su propio resultado e informe preventivo', function () {
    $user = User::factory()->create();

    $evaluacion = Autoevaluacion::create([
        'user_id' => $user->id,
        'uuid_trazabilidad' => (string) str()->uuid(),
        'hash_integridad' => hash('sha256', 'eval-fase18-test'),
        'nombre_comercio' => 'Ferretería El Valle',
        'funcion_economica' => 'Comercio',
        'ruc' => '20123456789',
        'sector_huancayo' => 'San Carlos (Huancayo Centro)',
        'area_m2' => 95,
        'pisos' => 1,
        'aforo' => 15,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'tipo_tramite' => 'EX_POST',
        'nivel_riesgo' => 'MEDIO',
        'porcentaje_cumplimiento' => 100.0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ],
    ]);

    // Usuario autenticado titular
    $this->actingAs($user)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resultado')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
        );

    $this->actingAs($user)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
        );
});

test('Fase 18 QA - Un usuario no autorizado recibe 403 al intentar acceder al resultado o informe ajeno', function () {
    $titular = User::factory()->create();
    $intruso = User::factory()->create();

    $evaluacion = Autoevaluacion::create([
        'user_id' => $titular->id,
        'uuid_trazabilidad' => (string) str()->uuid(),
        'hash_integridad' => hash('sha256', 'eval-fase18-privada'),
        'nombre_comercio' => 'Botica Central',
        'funcion_economica' => 'Comercio',
        'ruc' => '20987654321',
        'sector_huancayo' => 'El Tambo',
        'area_m2' => 50,
        'pisos' => 1,
        'aforo' => 10,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'tipo_tramite' => 'EX_POST',
        'nivel_riesgo' => 'MEDIO',
        'porcentaje_cumplimiento' => 80.0,
        'semaforo' => 'AMBAR',
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ],
    ]);

    $this->actingAs($intruso)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();

    $this->actingAs($intruso)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('Fase 18 QA - El invitado titular accede mediante su guest_session_token y otro invitado es rechazado', function () {
    $tokenTitular = (string) str()->uuid();
    $tokenAjeno = (string) str()->uuid();

    $evaluacion = Autoevaluacion::create([
        'user_id' => null,
        'session_token' => $tokenTitular,
        'uuid_trazabilidad' => (string) str()->uuid(),
        'hash_integridad' => hash('sha256', 'eval-fase18-guest'),
        'nombre_comercio' => 'Panadería Huancayo',
        'funcion_economica' => 'Comercio',
        'ruc' => '10456789012',
        'sector_huancayo' => 'Chilca',
        'area_m2' => 60,
        'pisos' => 1,
        'aforo' => 8,
        'usa_glp' => true,
        'galones_glp' => 10,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'tipo_tramite' => 'EX_POST',
        'nivel_riesgo' => 'MEDIO',
        'porcentaje_cumplimiento' => 60.0,
        'semaforo' => 'AMBAR',
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ],
    ]);

    // Invitado con cookie correcta
    $this->withCookie('guest_session_token', $tokenTitular)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk();

    $this->withCookie('guest_session_token', $tokenTitular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk();

    // Invitado con cookie ajena
    $this->withCookie('guest_session_token', $tokenAjeno)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();

    $this->withCookie('guest_session_token', $tokenAjeno)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('Fase 18 QA - Las reevaluaciones resuelven siempre el origen raiz garantizando topologia A -> [B, C]', function () {
    $user = User::factory()->create();

    $evaluacionA = Autoevaluacion::create([
        'user_id' => $user->id,
        'uuid_trazabilidad' => (string) str()->uuid(),
        'hash_integridad' => hash('sha256', 'A'),
        'nombre_comercio' => 'Librería Universitaria',
        'funcion_economica' => 'Comercio',
        'ruc' => '20456123789',
        'sector_huancayo' => 'San Carlos (Huancayo Centro)',
        'area_m2' => 120,
        'pisos' => 1,
        'aforo' => 20,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'tipo_tramite' => 'EX_POST',
        'nivel_riesgo' => 'MEDIO',
        'porcentaje_cumplimiento' => 50.0,
        'semaforo' => 'ROJO',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
        'detalle_checklist' => [],
    ]);

    // Crear reevaluación B referenciando A
    $responseB = $this->actingAs($user)->post(route('autoevaluacion.store'), [
        'evaluacion_origen_uuid' => $evaluacionA->uuid_trazabilidad,
        'nombre_comercio' => $evaluacionA->nombre_comercio,
        'funcion_economica' => $evaluacionA->funcion_economica,
        'ruc' => $evaluacionA->ruc,
        'sector' => $evaluacionA->sector_huancayo,
        'area_m2' => $evaluacionA->area_m2,
        'pisos' => $evaluacionA->pisos,
        'aforo' => $evaluacionA->aforo,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ],
    ]);

    $responseB->assertRedirect();
    $evaluacionB = Autoevaluacion::latest('id')->first();
    expect($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id);

    $evaluacionB->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
    ]);

    // Intentar crear C enviando el UUID de B: debe resolverse como hijo de A, no de B
    $responseC = $this->actingAs($user)->post(route('autoevaluacion.store'), [
        'evaluacion_origen_uuid' => $evaluacionB->uuid_trazabilidad,
        'nombre_comercio' => $evaluacionA->nombre_comercio,
        'funcion_economica' => $evaluacionA->funcion_economica,
        'ruc' => $evaluacionA->ruc,
        'sector' => $evaluacionA->sector_huancayo,
        'area_m2' => $evaluacionA->area_m2,
        'pisos' => $evaluacionA->pisos,
        'aforo' => $evaluacionA->aforo,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ],
    ]);

    $responseC->assertRedirect();
    $evaluacionC = Autoevaluacion::latest('id')->first();
    expect($evaluacionC->evaluacion_origen_id)->toBe($evaluacionA->id)
        ->and($evaluacionC->evaluacion_origen_id)->not->toBe($evaluacionB->id);
});
