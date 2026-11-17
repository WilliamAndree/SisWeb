<?php

use App\Services\Espacio\AnalisisEspacialService;
use Tests\Support\EspacioFixture;

test('GRAFO-3D-01 habitaciones con el mismo codigo en pisos diferentes no se sobrescriben', function () {
    $geometria = EspacioFixture::geometria();
    $segundo = $geometria['niveles'][0];
    $segundo['numero_piso'] = 2;
    $segundo['nombre'] = 'Piso 2';
    $segundo['conectores'] = [];
    $geometria['niveles'][] = $segundo;
    ['version' => $version] = EspacioFixture::persistir($geometria);

    $analisis = app(AnalisisEspacialService::class)->ejecutarAnalisis($version);

    expect($analisis->total_ambientes)->toBe(2);
    expect($analisis->total_ambientes_conectados)->toBe(1);
    expect($analisis->todos_ambientes_conectados)->toBeFalse();
});

test('GRAFO-3D-02 escalera sin ambiente de llegada no confirma una conexion', function () {
    $geometria = EspacioFixture::geometria();
    $segundo = $geometria['niveles'][0];
    $segundo['numero_piso'] = 2;
    $segundo['ambientes'][0]['codigo'] = 'B';
    $segundo['conectores'] = [];
    $geometria['niveles'][] = $segundo;
    $geometria['niveles'][0]['conectores'] = [[
        'tipo' => 'ESCALERA', 'ambiente_origen_codigo' => 'A', 'nivel_destino_numero' => 2,
        'posicion_x' => 2, 'posicion_y' => 0,
    ]];
    ['version' => $version] = EspacioFixture::persistir($geometria);

    $analisis = app(AnalisisEspacialService::class)->ejecutarAnalisis($version);

    expect($analisis->total_conectores_confirmados)->toBe(0);
    expect($analisis->total_conectores_indeterminados)->toBe(1);
});

test('GRAFO-3D-03 una conexion vertical explicita alcanza salida de otro piso', function (int $pisoDestino) {
    $geometria = EspacioFixture::geometria();
    $segundo = $geometria['niveles'][0];
    $segundo['numero_piso'] = $pisoDestino;
    $segundo['ambientes'][0]['codigo'] = 'B';
    $segundo['conectores'][0]['ambiente_origen_codigo'] = 'B';
    $geometria['niveles'][] = $segundo;
    $geometria['niveles'][0]['conectores'] = [[
        'tipo' => 'ESCALERA', 'ambiente_origen_codigo' => 'A', 'ambiente_destino_codigo' => 'B',
        'nivel_destino_numero' => $pisoDestino, 'posicion_x' => 2, 'posicion_y' => 0,
    ]];
    $evaluacion = EspacioFixture::evaluacion();
    $this->actingAs($evaluacion->user)->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/guardar", ['geometria' => $geometria])->assertOk();
    $version = $evaluacion->planoEstablecimiento->versionActiva;

    $resultado = app(AnalisisEspacialService::class)->ejecutarAnalisis($version);

    expect($resultado->total_ambientes_conectados)->toBe(2);
    expect($resultado->todos_ambientes_conectados)->toBeTrue();
    expect($version->niveles()->where('numero_piso', 1)->first()->conectores()->first()->nivelDestino->numero_piso)->toBe($pisoDestino);
})->with([2, 0, -1]);

test('GRAFO-3D-04 BFS alcanza rutas indirectas y cadenas extensas sin duplicar nodos', function (int $cantidad) {
    ['version' => $version] = EspacioFixture::persistir(EspacioFixture::cadena($cantidad));

    $analisis = app(AnalisisEspacialService::class)->ejecutarAnalisis($version);

    expect($analisis->total_ambientes)->toBe($cantidad);
    expect($analisis->total_ambientes_conectados)->toBe($cantidad);
    expect($analisis->todos_ambientes_conectados)->toBeTrue();
})->with([3, 100]);

test('GRAFO-3D-05 componentes separados solo alcanzan sus salidas declaradas', function (bool $segundaSalida, int $conectados) {
    $geometria = EspacioFixture::cadena(4);
    unset($geometria['niveles'][0]['conectores'][2]);
    $geometria['niveles'][0]['conectores'] = array_values($geometria['niveles'][0]['conectores']);
    if ($segundaSalida) {
        $geometria['niveles'][0]['conectores'][] = ['tipo' => 'PUERTA_SALIDA', 'conduce_a_salida_publica' => true, 'ambiente_origen_codigo' => 'N3', 'posicion_x' => 16, 'posicion_y' => 2];
    }
    ['version' => $version] = EspacioFixture::persistir($geometria);

    $analisis = app(AnalisisEspacialService::class)->ejecutarAnalisis($version);

    expect($analisis->total_ambientes_conectados)->toBe($conectados);
    expect($analisis->todos_ambientes_conectados)->toBe($segundaSalida);
})->with(['una salida' => [false, 2], 'varias salidas' => [true, 4]]);

test('GRAFO-3D-06 ciclo con o sin salida termina y conserva alcanzabilidad', function (bool $salida) {
    $geometria = EspacioFixture::geometria();
    $base = $geometria['niveles'][0]['ambientes'][0];
    $geometria['niveles'][0]['ambientes'] = [
        array_replace($base, ['codigo' => 'A']), array_replace($base, ['codigo' => 'B', 'posicion_x' => 4]),
        array_replace($base, ['codigo' => 'C', 'posicion_x' => 4, 'posicion_y' => 4]), array_replace($base, ['codigo' => 'D', 'posicion_y' => 4]),
    ];
    $geometria['niveles'][0]['conectores'] = $salida ? $geometria['niveles'][0]['conectores'] : [];
    foreach ([['A', 'B', 4, 2], ['B', 'C', 6, 4], ['C', 'D', 4, 6], ['D', 'A', 2, 4]] as [$origen, $destino, $x, $y]) {
        $geometria['niveles'][0]['conectores'][] = ['tipo' => 'PUERTA_INTERIOR', 'ambiente_origen_codigo' => $origen, 'ambiente_destino_codigo' => $destino, 'posicion_x' => $x, 'posicion_y' => $y];
    }
    ['version' => $version] = EspacioFixture::persistir($geometria);

    $analisis = app(AnalisisEspacialService::class)->ejecutarAnalisis($version);

    expect($analisis->todos_ambientes_conectados)->toBe($salida);
    expect($analisis->total_ambientes_conectados)->toBe($salida ? 4 : 0);
})->with([true, false]);

test('GRAFO-3D-07 conectores duplicados no duplican ambientes alcanzados', function () {
    $geometria = EspacioFixture::cadena(2);
    $geometria['niveles'][0]['conectores'][] = $geometria['niveles'][0]['conectores'][1];
    ['version' => $version] = EspacioFixture::persistir($geometria);

    $analisis = app(AnalisisEspacialService::class)->ejecutarAnalisis($version);

    expect($analisis->total_ambientes_conectados)->toBe(2);
    expect($analisis->total_conectores)->toBe(3);
});
