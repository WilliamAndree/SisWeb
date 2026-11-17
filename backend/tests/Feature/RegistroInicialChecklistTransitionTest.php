<?php

use App\Models\Autoevaluacion;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\NormativaCatalogSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

test('1. POST /autoevaluacion registra establecimiento sin enviar checklist y redirige a autoevaluacion.checklist', function () {
    $payload = [
        'nombre_comercio' => 'Bodega San Carlos Huancayo',
        'funcion_economica' => 'Comercio',
        'ruc' => '20123456789',
        'direccion' => 'Jr. Ancash 345',
        'referencia' => 'Frente al parque Huamanmarca',
        'area_m2' => 85.5,
        'pisos' => 2,
        'aforo' => 20,
        'usa_glp' => true,
        'galones_glp' => 10,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'tiene_equipos_fritura' => false,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => true,
    ];

    $response = $this->post(route('autoevaluacion.store'), $payload);

    $response->assertSessionHasNoErrors();

    $this->assertDatabaseCount('autoevaluaciones', 1);
    $autoevaluacion = Autoevaluacion::firstOrFail();

    expect($autoevaluacion->nombre_comercio)->toBe('Bodega San Carlos Huancayo')
        ->and($autoevaluacion->funcion_economica)->toBe('Comercio')
        ->and($autoevaluacion->ruc)->toBe('20123456789')
        ->and($autoevaluacion->direccion)->toBe('Jr. Ancash 345')
        ->and($autoevaluacion->referencia)->toBe('Frente al parque Huamanmarca')
        ->and((float) $autoevaluacion->area_m2)->toBe(85.5)
        ->and((int) $autoevaluacion->pisos)->toBe(2)
        ->and((int) $autoevaluacion->aforo)->toBe(20)
        ->and($autoevaluacion->usa_glp)->toBeTrue()
        ->and((float) $autoevaluacion->galones_glp)->toBe(10.0)
        ->and($autoevaluacion->usa_caldero)->toBeFalse()
        ->and($autoevaluacion->usa_liquidos_inflamables)->toBeFalse()
        ->and($autoevaluacion->tiene_equipos_fritura)->toBeFalse()
        ->and($autoevaluacion->tiene_escaleras)->toBeFalse()
        ->and($autoevaluacion->tiene_estanterias_altas)->toBeTrue()
        ->and($autoevaluacion->detalle_checklist)->toBe([]);

    // Redirección hacia la checklist dinámica usando el UUID de trazabilidad
    $response->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
});

test('2. La creación inicial está desacoplada del cálculo de semáforo y porcentaje de conformidad', function () {
    $payload = [
        'nombre_comercio' => 'Librería El Saber',
        'funcion_economica' => 'Comercio',
    ];

    $response = $this->post(route('autoevaluacion.store'), $payload);

    $response->assertSessionHasNoErrors();
    $autoevaluacion = Autoevaluacion::firstOrFail();

    // En el nuevo flujo dinámico normativo, la creación inicial no ejecuta calcularConformidad()
    expect($autoevaluacion->porcentaje_cumplimiento)->toBe(0.0)
        ->and($autoevaluacion->semaforo)->toBe('PENDIENTE')
        ->and($autoevaluacion->detalle_checklist)->toBe([]);
});

test('3. GET /autoevaluacion/{uuid}/checklist resuelve el checklist dinámico desde ApplicabilityEngineService', function () {
    $payload = [
        'nombre_comercio' => 'Restaurante Turístico El Tambo',
        'funcion_economica' => 'Encuentro',
        'ruc' => '20987654321',
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => true,
    ];

    $responseStore = $this->post(route('autoevaluacion.store'), $payload);
    $autoevaluacion = Autoevaluacion::firstOrFail();

    $responseStore->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));

    // Consulta del checklist dinámico renderizado por Inertia
    $responseChecklist = $this->get(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));

    $responseChecklist->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Checklist')
            ->has('autoevaluacion')
            ->has('checklist')
            ->where('autoevaluacion.uuid', $autoevaluacion->uuid_trazabilidad)
            ->where('autoevaluacion.nombre_comercio', 'Restaurante Turístico El Tambo')
            ->where('checklist.resumen.total_criterios_catalogo', 19)
            ->where('checklist.resumen.total_activos', 13)
            ->where('checklist.resumen.total_suspendidos', 6)
            ->where('checklist.resumen.criterios_aplicables', 12)
            ->where('checklist.resumen.criterios_no_aplican', 1) // CRIT-11 no aplica porque tiene_escaleras = false
            ->where('checklist.resumen.criterios_requieren_informacion', 0)
        );

    // Consulta JSON directa para validar que los criterios son los normativos congelados
    $responseJson = $this->getJson(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $data = $responseJson->json();

    $criteriosAplicables = collect($data['criterios']);
    $codigosAplicables = $criteriosAplicables->pluck('codigo')->all();

    // Verificación de códigos normativos oficiales aplicables (no checklist estática de 17)
    expect($codigosAplicables)->toContain('CRIT-01', 'CRIT-02A', 'CRIT-02B', 'CRIT-10', 'CRIT-13')
        ->and($codigosAplicables)->not->toContain('EXTINTOR_PQS', 'TABLERO_MANDIL', 'CAMPANA_EXTRACCION');

    // CRIT-11 no aplica porque tiene_escaleras = false (se clasifica en no_aplican)
    $noAplican = collect($data['no_aplican']);
    $codigosNoAplican = $noAplican->pluck('codigo')->all();
    expect($codigosNoAplican)->toContain('CRIT-11');

    $crit11 = $noAplican->firstWhere('codigo', 'CRIT-11');
    expect($crit11['estado'])->toBe(ApplicabilityEngineService::ESTADO_NO_APLICA);

    // CRIT-02A aplica porque tiene_equipos_fritura = true
    $crit02a = $criteriosAplicables->firstWhere('codigo', 'CRIT-02A');
    expect($crit02a['codigo'])->toBe('CRIT-02A');

    // CRIT-13 aplica porque tiene_estanterias_altas = true
    $crit13 = $criteriosAplicables->firstWhere('codigo', 'CRIT-13');
    expect($crit13['codigo'])->toBe('CRIT-13');
});

test('4. Usuario invitado mantiene autorización de acceso inmediato en el checklist recién creado', function () {
    $payload = [
        'nombre_comercio' => 'Zapatería Huancayo',
        'funcion_economica' => 'Comercio',
    ];

    $this->post(route('autoevaluacion.store'), $payload);
    $autoevaluacion = Autoevaluacion::firstOrFail();

    // El endpoint de checklist web y API autoriza de forma transparente por sesión inmediata
    $this->get(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
        ->assertStatus(200);

    $this->getJson(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
        ->assertStatus(200);
});

test('5. Flujo integral completo: Registro Inicial -> Checklist dinámico -> Guardar declaraciones -> Resumen descriptivo', function () {
    // 1. Registro inicial de datos y características físicas
    $payloadInicial = [
        'nombre_comercio' => 'Ferretería El Tornillo',
        'funcion_economica' => 'Comercio',
        'ruc' => '20555666777',
        'direccion' => 'Av. Ferrocarril 890',
        'usa_glp' => false,
        'tiene_equipos_fritura' => false,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => false,
    ];

    $responseStore = $this->post(route('autoevaluacion.store'), $payloadInicial);
    $autoevaluacion = Autoevaluacion::firstOrFail();

    // Redirección a autoevaluacion.checklist
    $responseStore->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));

    // 2. Consulta de checklist dinámico
    $responseChecklist = $this->getJson(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $responseChecklist->assertStatus(200);
    $checklistData = $responseChecklist->json();

    // 4 criterios no aplican (CRIT-10, CRIT-02A, CRIT-11, CRIT-13)
    expect($checklistData['resumen']['criterios_no_aplican'])->toBe(4)
        ->and($checklistData['resumen']['criterios_aplicables'])->toBe(9);

    // 3. El ciudadano declara los 9 criterios aplicables
    $declaraciones = [
        'respuestas' => [
            ['codigo' => 'CRIT-01', 'estado' => 'CUMPLE_DECLARADO'],
            ['codigo' => 'CRIT-02B', 'estado' => 'CUMPLE_DECLARADO'],
            ['codigo' => 'CRIT-03', 'estado' => 'CUMPLE_DECLARADO'],
            ['codigo' => 'CRIT-04', 'estado' => 'CUMPLE_DECLARADO'],
            ['codigo' => 'CRIT-05', 'estado' => 'PENDIENTE_ATENDER'],
            ['codigo' => 'CRIT-06', 'estado' => 'PENDIENTE_ATENDER'],
            ['codigo' => 'CRIT-07', 'estado' => 'POR_REVISAR'],
            ['codigo' => 'CRIT-08', 'estado' => 'CUMPLE_DECLARADO'],
            ['codigo' => 'CRIT-14A', 'estado' => 'CUMPLE_DECLARADO'],
        ],
    ];

    $responseDeclaraciones = $this->postJson(
        route('autoevaluacion.checklist.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]),
        $declaraciones
    );
    $responseDeclaraciones->assertStatus(200);

    // 4. Consulta del resumen descriptivo y orientativo
    $responseResumen = $this->get(route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $responseResumen->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resumen')
            ->where('resumen.total_criterios_aplicables', 9)
            ->where('resumen.total_cumple_declarado', 6)
            ->where('resumen.total_pendiente_atender', 2)
            ->where('resumen.total_por_revisar', 1)
            ->where('resumen.total_no_aplica', 4)
        );
});
