<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

/**
 * Helper para crear una autoevaluación con parámetros específicos.
 */
function crearAutoevaluacionTest(array $params = []): Autoevaluacion
{
    return Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => $params['nombre'] ?? 'Local de Prueba Huancayo',
        'sector_huancayo' => 'Huancayo Centro',
        'usa_glp' => array_key_exists('usa_glp', $params) ? $params['usa_glp'] : true,
        'tiene_equipos_fritura' => array_key_exists('tiene_equipos_fritura', $params) ? $params['tiene_equipos_fritura'] : true,
        'tiene_escaleras' => array_key_exists('tiene_escaleras', $params) ? $params['tiene_escaleras'] : true,
        'tiene_estanterias_altas' => array_key_exists('tiene_estanterias_altas', $params) ? $params['tiene_estanterias_altas'] : true,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);
}

/**
 * Verifica la clasificación de un criterio dentro de `no_aplican` por su contrato
 * estructural, sin depender del texto del `motivo` generado por el motor.
 */
function esperarCriterioNoAplica(array $data, string $codigo): array
{
    $criterio = collect($data['no_aplican'])->firstWhere('codigo', $codigo);

    expect($criterio)->not->toBeNull()
        ->and($criterio['estado'])->toBe('NO_APLICA')
        ->and($criterio['aplicable'])->toBeFalse()
        ->and($criterio['requiere_informacion'])->toBeFalse()
        ->and($criterio['motivo'])->toBeString()->not->toBeEmpty();

    return $criterio;
}

// CASO 1: Consulta del checklist con toda la información disponible (todas las variables = true)
test('Caso 1: consulta del checklist con toda la informacion disponible (13 aplicables, 0 no aplican, 0 pendientes)', function () {
    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    $response = $this->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist");

    $response->assertStatus(200)
        ->assertJson([
            'autoevaluacion_id' => $evaluacion->id,
            'resumen' => [
                'total_criterios_catalogo' => 19,
                'total_activos' => 13,
                'total_suspendidos' => 6,
                'criterios_aplicables' => 13,
                'criterios_no_aplican' => 0,
                'criterios_requieren_informacion' => 0,
            ],
        ]);

    $data = $response->json();
    expect($data['criterios'])->toHaveCount(13)
        ->and($data['no_aplican'])->toHaveCount(0)
        ->and($data['informacion_pendiente'])->toHaveCount(0);

    // Verificar que la metadata normativa se devuelve congelada desde el catálogo,
    // sin depender del texto literal sembrado por el seeder.
    $crit06 = collect($data['criterios'])->firstWhere('codigo', 'CRIT-06');
    expect($crit06['titulo'])->toBe(CriterioNormativo::where('codigo_criterio', 'CRIT-06')->value('titulo'))
        ->and($crit06['titulo'])->not->toBeEmpty();

    $crit07 = collect($data['criterios'])->firstWhere('codigo', 'CRIT-07');
    expect($crit07['titulo'])->toBe(CriterioNormativo::where('codigo_criterio', 'CRIT-07')->value('titulo'))
        ->and($crit07['titulo'])->not->toBeEmpty();

    // Verificar que todas las opciones de respuesta no contengan NO_APLICA
    foreach ($data['criterios'] as $criterio) {
        expect($criterio['opciones_respuesta'])->toBe(['CUMPLE_DECLARADO', 'PENDIENTE_ATENDER', 'POR_REVISAR'])
            ->and($criterio['opciones_respuesta'])->not->toContain('NO_APLICA');
    }
});

// CASO 2: Consulta cuando usa_glp = false
test('Caso 2: consulta cuando usa_glp = false clasifica CRIT-10 en no_aplican con estado NO_APLICA', function () {
    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => false,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    $response = $this->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist");

    $response->assertStatus(200);
    $data = $response->json();

    $codigosNoAplican = collect($data['no_aplican'])->pluck('codigo')->all();
    expect($codigosNoAplican)->toContain('CRIT-10');

    esperarCriterioNoAplica($data, 'CRIT-10');

    $codigosCriterios = collect($data['criterios'])->pluck('codigo')->all();
    expect($codigosCriterios)->not->toContain('CRIT-10');
});

// CASO 3: Consulta cuando usa_glp = null
test('Caso 3: consulta cuando usa_glp = null clasifica CRIT-10 en informacion_pendiente', function () {
    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => null,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    $response = $this->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist");

    $response->assertStatus(200);
    $data = $response->json();

    $codigosPendientes = collect($data['informacion_pendiente'])->pluck('codigo')->all();
    expect($codigosPendientes)->toContain('CRIT-10');

    $crit10 = collect($data['informacion_pendiente'])->firstWhere('codigo', 'CRIT-10');
    expect($crit10['requiere_informacion'])->toBeTrue()
        ->and($crit10['variable_faltante'])->toBe('usa_glp');
});

// CASO 4: Consulta cuando tiene_equipos_fritura = false
test('Caso 4: consulta cuando tiene_equipos_fritura = false clasifica CRIT-02A en no_aplican', function () {
    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => true,
        'tiene_equipos_fritura' => false,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    $response = $this->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist");

    $response->assertStatus(200);
    $data = $response->json();

    $codigosNoAplican = collect($data['no_aplican'])->pluck('codigo')->all();
    expect($codigosNoAplican)->toContain('CRIT-02A');

    esperarCriterioNoAplica($data, 'CRIT-02A');
});

// CASO 5: Consulta cuando tiene_equipos_fritura = null
test('Caso 5: consulta cuando tiene_equipos_fritura = null clasifica CRIT-02A en informacion_pendiente', function () {
    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => true,
        'tiene_equipos_fritura' => null,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    $response = $this->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist");

    $response->assertStatus(200);
    $data = $response->json();

    $codigosPendientes = collect($data['informacion_pendiente'])->pluck('codigo')->all();
    expect($codigosPendientes)->toContain('CRIT-02A');

    $crit02a = collect($data['informacion_pendiente'])->firstWhere('codigo', 'CRIT-02A');
    expect($crit02a['requiere_informacion'])->toBeTrue()
        ->and($crit02a['variable_faltante'])->toBe('tiene_equipos_fritura');
});

// CASO 6: Consulta cuando tiene_escaleras = false
test('Caso 6: consulta cuando tiene_escaleras = false clasifica CRIT-11 en no_aplican sin inferir pisos', function () {
    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => true,
    ]);

    $response = $this->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist");

    $response->assertStatus(200);
    $data = $response->json();

    $codigosNoAplican = collect($data['no_aplican'])->pluck('codigo')->all();
    expect($codigosNoAplican)->toContain('CRIT-11');

    esperarCriterioNoAplica($data, 'CRIT-11');
});

// CASO 7: Consulta cuando tiene_estanterias_altas = false
test('Caso 7: consulta cuando tiene_estanterias_altas = false clasifica CRIT-13 en no_aplican sin regla de 1.50m', function () {
    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => false,
    ]);

    $response = $this->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist");

    $response->assertStatus(200);
    $data = $response->json();

    $codigosNoAplican = collect($data['no_aplican'])->pluck('codigo')->all();
    expect($codigosNoAplican)->toContain('CRIT-13');

    esperarCriterioNoAplica($data, 'CRIT-13');
});

// CASO 8: Exclusión total de los 6 criterios suspendidos
test('Caso 8: exclusion total de los 6 criterios suspendidos del checklist dinamico', function () {
    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    $response = $this->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist");
    $data = $response->json();

    $codigosSuspendidos = ['CRIT-09', 'CRIT-12', 'CRIT-14B', 'CRIT-15', 'CRIT-16', 'CRIT-17'];

    $todosEnChecklist = collect($data['criterios'])->pluck('codigo')
        ->merge(collect($data['no_aplican'])->pluck('codigo'))
        ->merge(collect($data['informacion_pendiente'])->pluck('codigo'))
        ->all();

    foreach ($codigosSuspendidos as $codigo) {
        expect($todosEnChecklist)->not->toContain($codigo);
    }

    expect($data['resumen']['total_suspendidos'])->toBe(6);
});

// CASO 9: Integridad de los 13 criterios activos en el catálogo
test('Caso 9: integridad de los 13 criterios activos en el catalogo y resumen normativo', function () {
    $totalCatalogo = CriterioNormativo::count();
    $activos = CriterioNormativo::activos()->count();
    $suspendidos = CriterioNormativo::suspendidos()->count();

    expect($totalCatalogo)->toBe(19)
        ->and($activos)->toBe(13)
        ->and($suspendidos)->toBe(6);

    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    $response = $this->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist");

    $response->assertJson([
        'resumen' => [
            'total_criterios_catalogo' => 19,
            'total_activos' => 13,
            'total_suspendidos' => 6,
        ],
    ]);
});

// CASO 10: Intento de enviar NO_APLICA como respuesta ciudadana
test('Caso 10: rechaza con 422 el intento de enviar NO_APLICA como declaracion ciudadana', function () {
    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => true,
    ]);

    $payload = [
        'respuestas' => [
            [
                'codigo' => 'CRIT-01',
                'estado' => 'NO_APLICA',
                'notas' => 'El ciudadano intenta marcar no aplica',
            ],
        ],
    ];

    $response = $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['respuestas.0.estado']);

    // Verificar que el mensaje descriptivo mencione que NO_APLICA no es seleccionable
    $errors = $response->json('errors')['respuestas.0.estado'] ?? [];
    expect($errors[0])->toContain('NO_APLICA no es seleccionable');

    // Comprobar que en la base de datos no se persistió ninguna respuesta inválida
    $count = RespuestaAutoevaluacion::where('autoevaluacion_id', $evaluacion->id)
        ->where('estado_respuesta', 'NO_APLICA')
        ->count();
    expect($count)->toBe(0);
});

// PRUEBA COMPLEMENTARIA: Registro de respuestas válidas y acceso via ruta API
test('permite registrar declaraciones ciudadanas validas y consultarlas via api y web', function () {
    $evaluacion = crearAutoevaluacionTest([
        'usa_glp' => true,
    ]);

    $payload = [
        'respuestas' => [
            [
                'codigo' => 'CRIT-01',
                'estado' => 'CUMPLE_DECLARADO',
                'notas' => 'Extintores operativos al día',
            ],
            [
                'codigo' => 'CRIT-04',
                'estado' => 'PENDIENTE_ATENDER',
                'notas' => 'Puerta requiere despejar traba',
            ],
            [
                'codigo' => 'CRIT-06',
                'estado' => 'POR_REVISAR',
                'notas' => 'Revisar con electricista el tablero',
            ],
        ],
    ];

    $postResponse = $this->postJson("/api/autoevaluaciones/{$evaluacion->uuid_trazabilidad}/checklist", $payload);

    $postResponse->assertStatus(200)
        ->assertJson([
            'mensaje' => 'Declaraciones registradas exitosamente.',
        ]);

    // Verificar que el GET refleja los estados declarados en el checklist
    $getResponse = $this->getJson("/api/autoevaluaciones/{$evaluacion->uuid_trazabilidad}/checklist");
    $getResponse->assertStatus(200);
    $data = $getResponse->json();

    $crit01 = collect($data['criterios'])->firstWhere('codigo', 'CRIT-01');
    expect($crit01['estado'])->toBe('CUMPLE_DECLARADO');

    $crit04 = collect($data['criterios'])->firstWhere('codigo', 'CRIT-04');
    expect($crit04['estado'])->toBe('PENDIENTE_ATENDER');

    $crit06 = collect($data['criterios'])->firstWhere('codigo', 'CRIT-06');
    expect($crit06['estado'])->toBe('POR_REVISAR');
});
