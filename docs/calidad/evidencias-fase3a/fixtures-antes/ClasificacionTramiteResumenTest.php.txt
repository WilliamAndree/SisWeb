<?php

use App\Models\Autoevaluacion;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

function crearEvaluacionParaClasificacion(array $overrides = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Bodega Test Huancayo',
        'ruc' => '20987654321',
        'direccion' => 'Av. Ejemplo 456',
        'funcion_economica' => 'Comercio',
        'area_m2' => 120,
        'pisos' => 1,
        'aforo' => 30,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ], $overrides));
}

test('el resumen clasifica en ITSE Posterior cuando el riesgo declarado es bajo o medio', function () {
    $evaluacion = crearEvaluacionParaClasificacion();

    $this->getJson(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->assertJsonPath('clasificacion_tramite.tipo_tramite', 'EX_POST')
        ->assertJsonPath('clasificacion_tramite.nivel_riesgo', 'BAJO_MEDIO')
        ->assertJsonPath('clasificacion_tramite.es_previa', false)
        ->assertJsonPath('clasificacion_tramite.fuente', 'recalculado')
        ->assertJsonPath('clasificacion_tramite.motivos', []);
});

test('el resumen clasifica en ITSE Previa cuando un factor agravante declara riesgo alto', function () {
    $evaluacion = crearEvaluacionParaClasificacion([
        'area_m2' => 900,
        'pisos' => 4,
    ]);

    $this->getJson(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->assertJsonPath('clasificacion_tramite.tipo_tramite', 'EX_ANTE')
        ->assertJsonPath('clasificacion_tramite.nivel_riesgo', 'ALTO_MUY_ALTO')
        ->assertJsonPath('clasificacion_tramite.es_previa', true);
});

test('el resumen respeta la modalidad ya persistida en lugar de recalcularla', function () {
    $evaluacion = crearEvaluacionParaClasificacion([
        'tipo_tramite' => 'EX_ANTE',
        'nivel_riesgo' => 'ALTO_MUY_ALTO',
    ]);

    $this->getJson(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->assertJsonPath('clasificacion_tramite.tipo_tramite', 'EX_ANTE')
        ->assertJsonPath('clasificacion_tramite.nivel_riesgo', 'ALTO_MUY_ALTO')
        ->assertJsonPath('clasificacion_tramite.fuente', 'registro');
});

test('la clasificacion de tramite no altera el semaforo ni los conteos descriptivos del resumen', function () {
    $evaluacion = crearEvaluacionParaClasificacion(['usa_caldero' => true]);

    $data = $this->getJson(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->json();

    expect($data['clasificacion_tramite']['tipo_tramite'])->toBe('EX_ANTE')
        ->and($data['resumen'])->toHaveKeys([
            'total_criterios_aplicables',
            'total_cumple_declarado',
            'total_pendiente_atender',
            'total_por_revisar',
            'total_no_aplica',
        ])
        ->and($data['resumen'])->not->toHaveKey('nivel_riesgo')
        ->and($data['resumen'])->not->toHaveKey('tipo_tramite')
        ->and($data['autoevaluacion'])->not->toHaveKey('semaforo')
        ->and($data['autoevaluacion'])->not->toHaveKey('nivel_riesgo');

    $evaluacion->refresh();
    expect($evaluacion->tipo_tramite)->toBeNull()
        ->and($evaluacion->nivel_riesgo)->toBeNull();
});
