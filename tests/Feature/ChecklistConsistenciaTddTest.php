<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Services\ApplicabilityEngineService;
use App\Services\Evaluacion\IntegridadEvaluacionService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

function crearChecklistFase3b(array $overrides = []): Autoevaluacion
{
    test()->seed(NormativaCatalogSeeder::class);
    $evaluacion = Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'session_token' => 'token_legitimo_fase3b',
        'nombre_comercio' => 'Local de pruebas 3B',
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'PENDIENTE',
        'detalle_checklist' => [],
        'total_cumple_declarado' => 0,
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ], $overrides));
    test()->withSession(['guest_session_token' => $evaluacion->session_token]);

    return $evaluacion;
}

test('CHECK-3B-01 persiste false null y true sin confundir aplicabilidad', function (string $campo, string $codigo, ?bool $valor, string $grupo, string $estado) {
    $evaluacion = crearChecklistFase3b([$campo => $valor]);
    app(ApplicabilityEngineService::class)->inicializarRespuestas($evaluacion);

    $response = $this->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist")->assertOk();

    $item = collect($response->json($grupo))->firstWhere('codigo', $codigo);
    expect($item)->not->toBeNull();
    expect($item['aplicable'])->toBe($valor);
    expect($item['estado'])->toBe($estado);
    expect($evaluacion->fresh()->{$campo})->toBe($valor);
    $this->assertDatabaseHas('respuestas_autoevaluacion', [
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => CriterioNormativo::where('codigo_criterio', $codigo)->value('id'),
        'estado_respuesta' => $estado,
    ]);
})->with([
    'GLP false' => ['usa_glp', 'CRIT-10', false, 'no_aplican', 'NO_APLICA'],
    'GLP null' => ['usa_glp', 'CRIT-10', null, 'informacion_pendiente', 'POR_REVISAR'],
    'GLP true' => ['usa_glp', 'CRIT-10', true, 'criterios', 'PENDIENTE_ATENDER'],
    'fritura false' => ['tiene_equipos_fritura', 'CRIT-02A', false, 'no_aplican', 'NO_APLICA'],
    'fritura null' => ['tiene_equipos_fritura', 'CRIT-02A', null, 'informacion_pendiente', 'POR_REVISAR'],
    'fritura true' => ['tiene_equipos_fritura', 'CRIT-02A', true, 'criterios', 'PENDIENTE_ATENDER'],
    'escaleras false' => ['tiene_escaleras', 'CRIT-11', false, 'no_aplican', 'NO_APLICA'],
    'escaleras null' => ['tiene_escaleras', 'CRIT-11', null, 'informacion_pendiente', 'POR_REVISAR'],
    'escaleras true' => ['tiene_escaleras', 'CRIT-11', true, 'criterios', 'PENDIENTE_ATENDER'],
    'estanterias false' => ['tiene_estanterias_altas', 'CRIT-13', false, 'no_aplican', 'NO_APLICA'],
    'estanterias null' => ['tiene_estanterias_altas', 'CRIT-13', null, 'informacion_pendiente', 'POR_REVISAR'],
    'estanterias true' => ['tiene_estanterias_altas', 'CRIT-13', true, 'criterios', 'PENDIENTE_ATENDER'],
]);

test('CHECK-3B-02 revierte todo el lote con 422 si incluye un criterio suspendido', function (string $codigo) {
    $evaluacion = crearChecklistFase3b();
    app(ApplicabilityEngineService::class)->registrarRespuestaCiudadana($evaluacion, 'CRIT-01', 'POR_REVISAR', 'Nota original');

    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", ['respuestas' => [
        ['codigo' => 'CRIT-01', 'estado' => 'CUMPLE_DECLARADO', 'notas' => 'No debe persistir'],
        ['codigo' => $codigo, 'estado' => 'CUMPLE_DECLARADO'],
    ]])->assertUnprocessable()->assertJsonPath('error', 'declaracion_invalida');

    $this->assertDatabaseHas('respuestas_autoevaluacion', [
        'autoevaluacion_id' => $evaluacion->id,
        'estado_respuesta' => 'POR_REVISAR',
        'notas_ciudadano' => 'Nota original',
    ]);
    expect($evaluacion->respuestas()->count())->toBe(1);
    expect($evaluacion->fresh()->total_cumple_declarado)->toBe(0);
})->with(['CRIT-09', 'CRIT-12', 'CRIT-14B', 'CRIT-15', 'CRIT-16', 'CRIT-17']);

test('CHECK-3B-03 cierre real sella SHA256 y detecta manipulacion persistida', function () {
    $evaluacion = crearChecklistFase3b();
    $declaraciones = array_map(fn (string $codigo): array => ['codigo' => $codigo, 'estado' => 'CUMPLE_DECLARADO'], [
        'CRIT-01', 'CRIT-02A', 'CRIT-02B', 'CRIT-03', 'CRIT-04', 'CRIT-05', 'CRIT-06',
        'CRIT-07', 'CRIT-08', 'CRIT-10', 'CRIT-11', 'CRIT-13', 'CRIT-14A',
    ]);
    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", ['respuestas' => $declaraciones])->assertOk();

    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/finalizar")
        ->assertOk()->assertJsonPath('estado', 'REGISTRADA');

    $evaluacion->refresh();
    $hashOriginal = $evaluacion->hash_integridad;
    $snapshot = $evaluacion->payload_canonico;
    expect($hashOriginal)->toBe(hash('sha256', json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)));
    expect(app(IntegridadEvaluacionService::class)->verificarIntegridadHash($evaluacion)['estado'])->toBe('VALIDO');
    expect($evaluacion->total_cumple_declarado)->toBe(13);
    expect($evaluacion->total_pendiente_atender)->toBe(0);

    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", ['respuestas' => [
        ['codigo' => 'CRIT-01', 'estado' => 'PENDIENTE_ATENDER'],
    ]])->assertConflict();
    expect($evaluacion->fresh()->hash_integridad)->toBe($hashOriginal);
    expect($evaluacion->fresh()->payload_canonico)->toBe($snapshot);
    expect($evaluacion->respuestas()->where('estado_respuesta', 'CUMPLE_DECLARADO')->count())->toBe(13);

    $snapshot['establecimiento']['nombre_comercio'] = 'Alteracion sintetica';
    DB::table('autoevaluaciones')->where('id', $evaluacion->id)->update(['payload_canonico' => json_encode($snapshot)]);

    expect(app(IntegridadEvaluacionService::class)->verificarIntegridadHash($evaluacion->fresh())['estado'])->toBe('NO_COINCIDE');
    expect($evaluacion->fresh()->hash_integridad)->toBe($hashOriginal);
});
