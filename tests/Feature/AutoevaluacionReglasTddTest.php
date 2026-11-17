<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use Illuminate\Support\Str;

test('AUTO-01 devuelve 422 para booleanos invalidos sin crear una evaluacion', function (string $field, mixed $value) {
    $this->postJson(route('autoevaluacion.store'), [
        'nombre_comercio' => 'Local QA',
        'funcion_economica' => 'Comercio',
        $field => $value,
    ])->assertUnprocessable()->assertJsonValidationErrors($field);

    $this->assertDatabaseCount('autoevaluaciones', 0);
})->with([
    'GLP texto' => ['usa_glp', 'desconocido'],
    'caldero numero' => ['usa_caldero', 2],
    'inflamables array' => ['usa_liquidos_inflamables', ['true']],
    'fritura texto' => ['tiene_equipos_fritura', 'desconocido'],
]);

test('AUTO-02 devuelve 422 para cantidad GLP no numerica sin convertirla en cero', function (mixed $value) {
    $this->postJson(route('autoevaluacion.store'), [
        'nombre_comercio' => 'Local QA',
        'funcion_economica' => 'Comercio',
        'usa_glp' => true,
        'galones_glp' => $value,
    ])->assertUnprocessable()->assertJsonValidationErrors('galones_glp');

    $this->assertDatabaseCount('autoevaluaciones', 0);
})->with(['texto' => ['muchos'], 'array' => [[10]]]);

test('AUTO-03 impide reabrir una evaluacion registrada para eludir el sello', function () {
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Local sellado',
        'porcentaje_cumplimiento' => 100,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'payload_canonico' => ['nombre' => 'Local sellado'],
        'hash_integridad' => hash('sha256', '{"nombre":"Local sellado"}'),
    ]);

    expect(fn () => $evaluacion->update(['estado' => Autoevaluacion::ESTADO_INICIADA]))
        ->toThrow(LogicException::class);

    $this->assertDatabaseHas('autoevaluaciones', ['id' => $evaluacion->id, 'estado' => 'REGISTRADA']);
    expect($evaluacion->fresh()->payload_canonico)->toBe(['nombre' => 'Local sellado']);
});

test('AUTO-04 ignora estado hash y propietario impuestos por el cliente', function () {
    $propietario = User::factory()->create();
    $intruso = User::factory()->create();

    $this->actingAs($propietario)->postJson(route('autoevaluacion.store'), [
        'nombre_comercio' => 'Local legitimo',
        'funcion_economica' => 'Comercio',
        'estado' => 'REGISTRADA',
        'hash_integridad' => str_repeat('a', 64),
        'payload_canonico' => ['falso' => true],
        'user_id' => $intruso->id,
    ])->assertRedirect();

    $this->assertDatabaseCount('autoevaluaciones', 1);
    $evaluacion = Autoevaluacion::firstOrFail();
    expect($evaluacion->estado)->toBe('INICIADA');
    expect($evaluacion->user_id)->toBe($propietario->id);
    expect($evaluacion->hash_integridad)->toBeNull();
    expect($evaluacion->payload_canonico)->toBeNull();
});

test('AUTO-05 conserva limites numericos y cero galones validos', function (float $area, int $pisos, int $aforo) {
    $this->postJson(route('autoevaluacion.store'), [
        'nombre_comercio' => 'Local limites',
        'funcion_economica' => 'Comercio',
        'area_m2' => $area,
        'pisos' => $pisos,
        'aforo' => $aforo,
        'usa_glp' => 'true',
        'galones_glp' => '0',
    ])->assertRedirect();

    $evaluacion = Autoevaluacion::firstOrFail();
    expect($evaluacion->area_m2)->toBe($area);
    expect($evaluacion->pisos)->toBe($pisos);
    expect($evaluacion->aforo)->toBe($aforo);
    expect($evaluacion->galones_glp)->toBe(0.0);
})->with(['minimos' => [0.1, 1, 1], 'maximos' => [100000.0, 100, 50000]]);
