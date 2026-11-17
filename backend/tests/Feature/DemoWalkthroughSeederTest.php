<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use Database\Seeders\DemoWalkthroughSeeder;
use Database\Seeders\NormativaCatalogSeeder;
use Database\Seeders\ProveedorRecursoSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
    $this->seed(ProveedorRecursoSeeder::class);
    $this->seed(DemoWalkthroughSeeder::class);
});

test('Don Lucho: caso 100% conforme y sellado con SHA-256 listo para descarga de anexos CENEPRED', function () {
    $userLucho = User::where('email', 'donlucho@huancayo.pe')->firstOrFail();

    $this->actingAs($userLucho);

    // 1. Dashboard en verde con 100%
    $responseDashboard = $this->get(route('dashboard'));
    $responseDashboard->assertOk();
    $responseDashboard->assertInertia(fn (Assert $page) => $page
        ->component('Dashboard/Dashboard')
        ->has('records', 1)
        ->where('records.0.nombre_comercio', 'Pollería El Brasero')
        ->where('records.0.porcentaje_cumplimiento', 100)
        ->where('records.0.semaforo', 'VERDE')
        ->where('records.0.distrito', 'El Tambo')
        ->where('kpis.total_locales', 1)
        ->where('kpis.aprobados', 1)
        ->where('kpis.observados', 0)
    );

    $autoevaluacion = Autoevaluacion::where('user_id', $userLucho->id)->firstOrFail();
    expect($autoevaluacion->hash_integridad)->toMatch('/^[a-f0-9]{64}$/')
        ->and($autoevaluacion->estado)->toBe(Autoevaluacion::ESTADO_REGISTRADA);

    // 2. Acceso a Anexos Oficiales CENEPRED (Anexo 4, etc.)
    $responseAnexo = $this->get(route('autoevaluacion.anexo', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $responseAnexo->assertOk();
    $responseAnexo->assertInertia(fn (Assert $page) => $page
        ->component('Evaluacion/AnexoOficial')
        ->where('autoevaluacion.nombre_comercio', 'Pollería El Brasero')
        ->where('autoevaluacion.hash_integridad', $autoevaluacion->hash_integridad)
    );
});

test('Doña María: caso observado con 2 condiciones pendientes de subsanación y acceso al panel de subsanación', function () {
    $userMaria = User::where('email', 'donamaria@huancayo.pe')->firstOrFail();

    $this->actingAs($userMaria);

    // 1. Dashboard en ámbar con observaciones
    $responseDashboard = $this->get(route('dashboard'));
    $responseDashboard->assertOk();
    $responseDashboard->assertInertia(fn (Assert $page) => $page
        ->component('Dashboard/Dashboard')
        ->has('records', 1)
        ->where('records.0.nombre_comercio', 'Minimarket El Carmen')
        ->where('records.0.semaforo', 'AMBAR')
        ->where('records.0.resumen_subsanaciones.pendientes', 2)
        ->where('kpis.total_locales', 1)
        ->where('kpis.aprobados', 0)
        ->where('kpis.observados', 1)
    );

    $autoevaluacion = Autoevaluacion::where('user_id', $userMaria->id)->firstOrFail();

    // 2. Acceso a Panel de Subsanación
    $responseSubsanacion = $this->get(route('autoevaluacion.subsanacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $responseSubsanacion->assertOk();
    $responseSubsanacion->assertInertia(fn (Assert $page) => $page
        ->component('Evaluacion/Subsanacion')
        ->where('autoevaluacion.nombre_comercio', 'Minimarket El Carmen')
        ->where('ultimaRevision.total_observaciones', 2)
        ->has('ultimaRevision.subsanaciones', 2)
    );
});

test('Comerciante Nuevo: usuario sin locales que visualiza el estado vacío y botón para nuevo registro', function () {
    $userNuevo = User::where('email', 'nuevo@huancayo.pe')->firstOrFail();

    $this->actingAs($userNuevo);

    // 1. Dashboard con 0 locales
    $responseDashboard = $this->get(route('dashboard'));
    $responseDashboard->assertOk();
    $responseDashboard->assertInertia(fn (Assert $page) => $page
        ->component('Dashboard/Dashboard')
        ->has('records', 0)
        ->where('kpis.total_locales', 0)
        ->where('kpis.aprobados', 0)
        ->where('kpis.observados', 0)
    );

    // 2. Acceso a la ruta de nueva autoevaluación
    $responseNueva = $this->get(route('autoevaluacion.nueva'));
    $responseNueva->assertOk();
});
