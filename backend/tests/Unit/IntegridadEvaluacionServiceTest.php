<?php

use App\Models\Autoevaluacion;
use App\Services\Evaluacion\IntegridadEvaluacionService;

test('HASH-01 ordena objetos recursivamente y conserva listas unicode y barras', function () {
    $service = new IntegridadEvaluacionService;
    $payload = ['z' => [['b' => 2, 'a' => 1], 'ñ/á'], 'a' => false];
    $canonical = '{"a":false,"z":[{"a":1,"b":2},"ñ/á"]}';

    expect($service->generarJsonCanonico($payload))->toBe($canonical);
    expect($service->calcularHashIntegridad($payload))->toBe(hash('sha256', $canonical));
    expect($payload['z'][0])->toBe(['b' => 2, 'a' => 1]);
    expect($service->calcularHashIntegridad(['z' => ['ñ/á', ['a' => 1, 'b' => 2]], 'a' => false]))
        ->not->toBe(hash('sha256', $canonical));
});

test('HASH-02 rechaza datos no serializables sin generar la huella de una cadena vacia', function (array $payload) {
    $service = new IntegridadEvaluacionService;

    expect(fn () => $service->calcularHashIntegridad($payload))->toThrow(JsonException::class);
})->with([
    'utf8 invalido' => [['nombre' => "\xB1\x31"]],
    'infinito' => [['area' => INF]],
    'nan' => [['area' => NAN]],
]);

test('HASH-03 no acredita snapshots malformados aunque coincida una huella de array vacio', function (mixed $payload) {
    $evaluacion = new Autoevaluacion;
    $evaluacion->setRawAttributes([
        'payload_canonico' => json_encode($payload),
        'hash_integridad' => hash('sha256', '[]'),
    ]);

    $result = (new IntegridadEvaluacionService)->verificarIntegridadHash($evaluacion);

    expect($result['estado'])->toBe(IntegridadEvaluacionService::ESTADO_NO_VERIFICABLE);
    expect($result['hash_calculado'])->toBeNull();
})->with(['json roto' => ['{roto'], 'null serializado' => ['null'], 'numero' => ['42'], 'booleano' => ['false'], 'texto' => ['"texto"']]);

test('HASH-04 conserva la lectura de snapshots JSON historicos validos', function () {
    $evaluacion = new Autoevaluacion;
    $evaluacion->setRawAttributes([
        'payload_canonico' => json_encode('{"b":2,"a":1}'),
        'hash_integridad' => hash('sha256', '{"a":1,"b":2}'),
    ]);

    $result = (new IntegridadEvaluacionService)->verificarIntegridadHash($evaluacion);

    expect($result['estado'])->toBe('VALIDO');
    expect($result['metodo'])->toBe('CANONICO_ESTRICTO');
});

test('HASH-05 no verifica registros sin hash o sin snapshot', function (?string $hash, ?array $payload) {
    $evaluacion = new Autoevaluacion(['hash_integridad' => $hash, 'payload_canonico' => $payload]);

    $result = (new IntegridadEvaluacionService)->verificarIntegridadHash($evaluacion);

    expect($result['estado'])->toBe('NO_VERIFICABLE');
    expect($result['hash_calculado'])->toBeNull();
})->with([
    'sin hash' => [null, ['dato' => 1]],
    'sin snapshot' => [hash('sha256', '{"dato":1}'), null],
    'sin ambos' => [null, null],
]);

test('HASH-06 compatibilidad de metricas no oculta cambios de datos sellados', function (int $dato, string $estado, string $metodo) {
    $evaluacion = new Autoevaluacion([
        'hash_integridad' => hash('sha256', '{"dato":1}'),
        'payload_canonico' => ['dato' => $dato, 'metricas' => ['cumplimiento' => 100]],
    ]);

    $result = (new IntegridadEvaluacionService)->verificarIntegridadHash($evaluacion);

    expect($result['estado'])->toBe($estado);
    expect($result['metodo'])->toBe($metodo);
})->with([
    'historico legitimo' => [1, 'VALIDO', 'COMPATIBILIDAD_HISTORICA_METRICAS'],
    'dato alterado' => [2, 'NO_COINCIDE', 'DISCREPANCIA_DETECTADA'],
]);
