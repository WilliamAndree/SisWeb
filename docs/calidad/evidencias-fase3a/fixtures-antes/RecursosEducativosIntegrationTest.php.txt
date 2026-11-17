<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RecursoEducativo;
use App\Models\RespuestaAutoevaluacion;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
});

function crearAutoevaluacionParaPruebas(array $overrides = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'nombre_comercio' => 'Librería Central',
        'funcion_economica' => 'Comercio',
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'PENDIENTE',
        'detalle_checklist' => [],
        'caracteristicas_declaradas' => [
            'area_m2' => 80,
            'pisos' => 1,
            'aforo' => 15,
            'usa_glp' => true,
            'galones_glp' => 15,
            'tiene_equipos_fritura' => false,
            'tiene_escaleras' => false,
            'tiene_estanterias_altas' => false,
        ],
    ], $overrides));
}

it('entrega recursos educativos activos en el checklist HTTP (Inertia y JSON) bajo criterio.recursos_educativos', function () {
    $autoevaluacion = crearAutoevaluacionParaPruebas();

    // 1. Verificación vía petición Inertia (Web)
    $responseInertia = $this->get(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $responseInertia->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Checklist')
            ->has('checklist.criterios')
            ->where('checklist.criterios.0.recursos_educativos.0.titulo', fn ($val) => str_contains($val, 'Extintor PQS'))
        );

    // 2. Verificación vía petición JSON (API)
    $responseJson = $this->getJson(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $responseJson->assertStatus(200);

    $crit01 = collect($responseJson->json('criterios'))->firstWhere('codigo', 'CRIT-01');
    expect($crit01)->not->toBeNull()
        ->and($crit01)->toHaveKey('recursos_educativos')
        ->and($crit01['recursos_educativos'])->toBeArray()
        ->and($crit01['recursos_educativos'])->not->toBeEmpty();

    $recurso = $crit01['recursos_educativos'][0];
    expect($recurso)->toHaveKeys([
        'id',
        'criterio_normativo_id',
        'titulo',
        'descripcion_corta',
        'tipo',
        'url',
        'fuente_autor',
        'duracion_estimada',
    ])
        ->and($recurso['titulo'])->toContain('Extintor PQS')
        ->and($recurso['tipo'])->toBe('VIDEO');
});

it('excluye recursos inactivos y recursos con criterio_normativo_id nulo de la respuesta HTTP del checklist', function () {
    $criterio = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->firstOrFail();

    // Crear recurso inactivo asignado a CRIT-01
    RecursoEducativo::create([
        'criterio_normativo_id' => $criterio->id,
        'titulo' => 'Recurso Inactivo Oculto',
        'descripcion_corta' => 'No debe verse en el checklist',
        'tipo' => RecursoEducativo::TIPO_VIDEO,
        'url' => 'https://youtube.com/watch?v=oculto',
        'activo' => false,
    ]);

    $autoevaluacion = crearAutoevaluacionParaPruebas();

    $response = $this->getJson(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $response->assertStatus(200);

    $crit01 = collect($response->json('criterios'))->firstWhere('codigo', 'CRIT-01');
    $titulos = collect($crit01['recursos_educativos'])->pluck('titulo')->all();
    expect($titulos)->not->toContain('Recurso Inactivo Oculto');

    // Verificar que los recursos formalmente mapeados a CRIT-08 y CRIT-06 aparecen, mientras que el recurso ambiguo sigue huérfano
    $todosLosRecursos = collect($response->json('criterios'))
        ->flatMap(fn ($c) => $c['recursos_educativos'] ?? [])
        ->pluck('titulo')
        ->all();

    expect($todosLosRecursos)->toContain('Luz de emergencia: botón de test y autonomía de batería')
        ->and($todosLosRecursos)->toContain('Diferencia entre llave termomagnética y diferencial de 30mA')
        ->and($todosLosRecursos)->not->toContain('Rutas de evacuación: señalización y ancho mínimo de pasillo');
});

it('entrega recursos educativos en resumen descriptivo HTTP para pendiente_atender, por_revisar y cumple_declarado, excluyendo no_aplica', function () {
    $criterio1 = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->firstOrFail();
    $criterio3 = CriterioNormativo::where('codigo_criterio', 'CRIT-03')->firstOrFail();
    $criterio4 = CriterioNormativo::where('codigo_criterio', 'CRIT-04')->firstOrFail();

    // Asignar recursos a CRIT-03 y CRIT-04
    RecursoEducativo::create([
        'criterio_normativo_id' => $criterio3->id,
        'titulo' => 'Guía de detección de fugas',
        'descripcion_corta' => 'Guía técnica para verificar conexiones de gas y mangueras.',
        'tipo' => RecursoEducativo::TIPO_GUIA_DIGITAL,
        'url' => 'https://gob.pe/guia-gas',
        'activo' => true,
    ]);

    RecursoEducativo::create([
        'criterio_normativo_id' => $criterio4->id,
        'titulo' => 'Señalización fotoluminiscente básica',
        'descripcion_corta' => 'Enlace informativo sobre alturas y ubicación de señales.',
        'tipo' => RecursoEducativo::TIPO_ENLACE_EXTERNO,
        'url' => 'https://cenepred.gob.pe/senales',
        'activo' => true,
    ]);

    $autoevaluacion = crearAutoevaluacionParaPruebas([
        'usa_glp' => true,
        'galones_glp' => 20,
        'tiene_escaleras' => false, // CRIT-11 -> NO_APLICA
    ]);

    // Declarar CRIT-01 como PENDIENTE_ATENDER
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $criterio1->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
    ]);

    // Declarar CRIT-03 como POR_REVISAR
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $criterio3->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_POR_REVISAR,
    ]);

    // Declarar CRIT-04 como CUMPLE_DECLARADO
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $criterio4->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
    ]);

    $response = $this->getJson(route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $response->assertStatus(200);

    // 1. Verificar pendiente_atender
    $itemPendiente = collect($response->json('pendiente_atender'))->firstWhere('codigo', 'CRIT-01');
    expect($itemPendiente)->not->toBeNull()
        ->and($itemPendiente)->toHaveKey('recursos_educativos')
        ->and($itemPendiente['recursos_educativos'])->toHaveCount(1)
        ->and($itemPendiente['recursos_educativos'][0]['titulo'])->toContain('Extintor PQS');

    // 2. Verificar por_revisar
    $itemPorRevisar = collect($response->json('por_revisar'))->firstWhere('codigo', 'CRIT-03');
    expect($itemPorRevisar)->not->toBeNull()
        ->and($itemPorRevisar)->toHaveKey('recursos_educativos')
        ->and($itemPorRevisar['recursos_educativos'])->toHaveCount(1)
        ->and($itemPorRevisar['recursos_educativos'][0]['tipo'])->toBe('GUIA_DIGITAL');

    // 3. Verificar cumple_declarado
    $itemCumple = collect($response->json('cumple_declarado'))->firstWhere('codigo', 'CRIT-04');
    expect($itemCumple)->not->toBeNull()
        ->and($itemCumple)->toHaveKey('recursos_educativos')
        ->and($itemCumple['recursos_educativos'])->toHaveCount(1)
        ->and($itemCumple['recursos_educativos'][0]['tipo'])->toBe('ENLACE_EXTERNO');

    // 4. Verificar no_aplica estrictamente SIN recursos educativos
    $noAplica = $response->json('no_aplica');
    expect($noAplica)->toBeArray();
    foreach ($noAplica as $itemNoAplica) {
        expect($itemNoAplica)->not->toHaveKey('recursos_educativos');
    }
});

it('soporta multiples recursos educativos por criterio en la respuesta HTTP', function () {
    $criterio = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->firstOrFail();

    // Añadir un segundo recurso a CRIT-01
    RecursoEducativo::create([
        'criterio_normativo_id' => $criterio->id,
        'titulo' => 'Guía rápida: Tipos de agentes extintores',
        'descripcion_corta' => 'Ficha técnica complementaria sobre PQS, Acetato y CO2.',
        'tipo' => RecursoEducativo::TIPO_GUIA_DIGITAL,
        'url' => 'https://gob.pe/guia-agentes',
        'activo' => true,
    ]);

    $autoevaluacion = crearAutoevaluacionParaPruebas();

    $response = $this->getJson(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $response->assertStatus(200);

    $crit01 = collect($response->json('criterios'))->firstWhere('codigo', 'CRIT-01');

    expect($crit01['recursos_educativos'])->toHaveCount(2)
        ->and(collect($crit01['recursos_educativos'])->pluck('tipo')->all())->toContain('VIDEO', 'GUIA_DIGITAL');
});

it('conserva los recursos educativos en el checklist actualizado devuelto al guardar declaraciones', function () {
    $autoevaluacion = crearAutoevaluacionParaPruebas();

    $payload = [
        'respuestas' => [
            [
                'codigo' => 'CRIT-01',
                'estado' => 'CUMPLE_DECLARADO',
                'notas' => 'Verificado manómetro',
            ],
        ],
    ];

    $response = $this->postJson(route('autoevaluacion.checklist.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), $payload);
    $response->assertStatus(200);

    $checklist = $response->json('checklist');
    expect($checklist)->toHaveKey('criterios');

    $crit01 = collect($checklist['criterios'])->firstWhere('codigo', 'CRIT-01');
    expect($crit01)->toHaveKey('recursos_educativos')
        ->and($crit01['recursos_educativos'])->not->toBeEmpty()
        ->and($crit01['recursos_educativos'][0]['titulo'])->toContain('Extintor PQS');
});

it('demuestra que ApplicabilityEngineService no incluye recursos educativos en generarChecklistDinamico ni generarResumenDescriptivo', function () {
    $autoevaluacion = crearAutoevaluacionParaPruebas();
    $service = app(ApplicabilityEngineService::class);

    // 1. Checklist en el Engine puro
    $checklist = $service->generarChecklistDinamico($autoevaluacion);
    $crit01 = collect($checklist['criterios'])->firstWhere('codigo', 'CRIT-01');
    expect($crit01)->not->toHaveKey('recursos_educativos');

    // 2. Resumen en el Engine puro
    $resumen = $service->generarResumenDescriptivo($autoevaluacion);
    foreach ($resumen['pendiente_atender'] as $item) {
        expect($item)->not->toHaveKey('recursos_educativos');
    }
    foreach ($resumen['por_revisar'] as $item) {
        expect($item)->not->toHaveKey('recursos_educativos');
    }
    foreach ($resumen['cumple_declarado'] as $item) {
        expect($item)->not->toHaveKey('recursos_educativos');
    }
});

it('demuestra que getCriteriosActivos no carga la relacion de recursos educativos y no ejecuta queries a esa tabla', function () {
    $service = app(ApplicabilityEngineService::class);

    DB::enableQueryLog();

    $criterios = $service->getCriteriosActivos();

    $queries = DB::getQueryLog();
    DB::disableQueryLog();

    // Solo se debe consultar criterios_normativos
    $tablasConsultadas = collect($queries)->pluck('query')->all();
    foreach ($tablasConsultadas as $q) {
        expect($q)->not->toContain('recursos_educativos');
    }

    // Ningún criterio debe tener la relación cargada
    foreach ($criterios as $criterio) {
        expect($criterio->relationLoaded('recursosEducativos'))->toBeFalse();
    }
});

it('no modifica el payload canonico ni el hash de integridad al existir recursos educativos', function () {
    $autoevaluacion = crearAutoevaluacionParaPruebas();

    $service = app(ApplicabilityEngineService::class);

    $payload1 = $service->generarPayloadCanonico($autoevaluacion);
    $hash1 = $service->calcularHashIntegridad($autoevaluacion);

    // Agregar nuevo recurso a CRIT-01
    $criterio = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->firstOrFail();
    RecursoEducativo::create([
        'criterio_normativo_id' => $criterio->id,
        'titulo' => 'Nuevo video preventivo',
        'descripcion_corta' => 'Video orientativo adicional',
        'tipo' => RecursoEducativo::TIPO_VIDEO,
        'url' => 'https://youtube.com/watch?v=nuevo',
        'activo' => true,
    ]);

    $payload2 = $service->generarPayloadCanonico($autoevaluacion);
    $hash2 = $service->calcularHashIntegridad($autoevaluacion);

    expect($payload2)->toEqual($payload1)
        ->and($hash2)->toBe($hash1);

    // Verificar además que generarPayloadCanonico no consulta recursos_educativos
    DB::enableQueryLog();
    $service->generarPayloadCanonico($autoevaluacion);
    $service->calcularHashIntegridad($autoevaluacion);
    $queries = DB::getQueryLog();
    DB::disableQueryLog();

    foreach (collect($queries)->pluck('query') as $sql) {
        expect($sql)->not->toContain('recursos_educativos');
    }
});
