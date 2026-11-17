<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use Database\Seeders\NormativaCatalogSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

test('1. GET / responde 200 y renderiza el componente Inertia Evaluacion/Home', function () {
    $response = $this->get('/');

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Home')
            ->has('catalogo')
        );
});

test('2. GET /autoevaluacion redirige con 302 a /autoevaluacion/nueva', function () {
    $response = $this->get('/autoevaluacion');

    $response->assertRedirect(route('autoevaluacion.nueva'));
});

test('3. GET /autoevaluacion/nueva responde 200 y renderiza el componente Inertia Evaluacion/Nueva', function () {
    $response = $this->get(route('autoevaluacion.nueva'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Nueva')
            ->has('catalogo')
        );
});

test('4. POST /autoevaluacion crea la autoevaluación en estado INICIADA y redirige al checklist dinámico', function () {
    $payload = [
        'nombre_comercio' => 'Bodega Central Huancayo',
        'funcion_economica' => 'Comercio',
        'ruc' => '20123456789',
        'direccion' => 'Calle Real 123',
        'referencia' => 'A media cuadra de la plaza Constitución',
        'area_m2' => 70,
        'pisos' => 1,
        'aforo' => 10,
        'usa_glp' => true,
        'galones_glp' => 5,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'tiene_equipos_fritura' => false,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => true,
    ];

    $response = $this->post(route('autoevaluacion.store'), $payload);

    $response->assertSessionHasNoErrors();
    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();

    expect($evaluacion->estado)->toBe('INICIADA')
        ->and($evaluacion->nombre_comercio)->toBe('Bodega Central Huancayo')
        ->and($evaluacion->caracteristicas_declaradas['usa_glp'])->toBeTrue()
        ->and($evaluacion->caracteristicas_declaradas['tiene_estanterias_altas'])->toBeTrue();

    $response->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad]));
});

test('5. GET /autoevaluacion/reevaluar/{uuid} carga Evaluacion/Nueva con datos precargados', function () {
    $user = User::factory()->create();

    $evaluacionA = Autoevaluacion::create([
        'user_id' => $user->id,
        'uuid_trazabilidad' => (string) str()->uuid(),
        'hash_integridad' => hash('sha256', 'hash-test-reeval-ux02'),
        'nombre_comercio' => 'Restaurante Mantaro',
        'funcion_economica' => 'Encuentro',
        'ruc' => '20987654321',
        'sector_huancayo' => 'San Carlos (Huancayo Centro)',
        'direccion' => 'Av. Giráldez 456',
        'area_m2' => 120,
        'pisos' => 2,
        'aforo' => 35,
        'usa_glp' => true,
        'galones_glp' => 15,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => false,
        'estado' => 'REGISTRADA',
        'tipo_tramite' => 'EX_POST',
        'nivel_riesgo' => 'MEDIO',
        'porcentaje_cumplimiento' => 80.0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    $this->actingAs($user)
        ->get(route('autoevaluacion.reevaluar', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Nueva')
            ->has('reevaluacionDe')
            ->where('reevaluacionDe.nombre_comercio', 'Restaurante Mantaro')
            ->where('reevaluacionDe.ruc', '20987654321')
            ->where('reevaluacionDe.usa_glp', true)
            ->where('reevaluacionDe.tiene_equipos_fritura', true)
        );
});
