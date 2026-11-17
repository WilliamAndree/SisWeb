<?php

use App\Services\Espacio\Geometria\GeometriaPuntoSegmento;

test('Punto exactamente sobre un segmento horizontal o vertical da distancia cero', function () {
    $a = ['x' => 0.0, 'y' => 0.0];
    $b = ['x' => 10.0, 'y' => 0.0];

    // Punto medio del segmento
    $p1 = ['x' => 5.0, 'y' => 0.0];
    expect(GeometriaPuntoSegmento::distanciaPuntoASegmento($p1, $a, $b))->toBe(0.0);

    // Punto extremo A
    expect(GeometriaPuntoSegmento::distanciaPuntoASegmento($a, $a, $b))->toBe(0.0);

    // Punto extremo B
    expect(GeometriaPuntoSegmento::distanciaPuntoASegmento($b, $a, $b))->toBe(0.0);
});

test('Punto situado cerca del segmento dentro de tolerancia de 0.20m', function () {
    $a = ['x' => 2.0, 'y' => 4.0];
    $b = ['x' => 8.0, 'y' => 4.0];

    // Punto a 0.15m perpendicular del segmento
    $p = ['x' => 5.0, 'y' => 4.15];
    $distancia = GeometriaPuntoSegmento::distanciaPuntoASegmento($p, $a, $b);

    expect($distancia)->toBe(0.15)
        ->and($distancia <= GeometriaPuntoSegmento::TOLERANCIA_METROS_DEFAULT)->toBeTrue();
});

test('Punto situado fuera de tolerancia (> 0.20m)', function () {
    $a = ['x' => 0.0, 'y' => 0.0];
    $b = ['x' => 6.0, 'y' => 0.0];

    // Punto a 0.50m del segmento
    $p = ['x' => 3.0, 'y' => 0.50];
    $distancia = GeometriaPuntoSegmento::distanciaPuntoASegmento($p, $a, $b);

    expect($distancia)->toBe(0.50)
        ->and($distancia <= GeometriaPuntoSegmento::TOLERANCIA_METROS_DEFAULT)->toBeFalse();
});

test('Segmento de longitud cero (punto A y B coinciden)', function () {
    $a = ['x' => 3.0, 'y' => 3.0];
    $b = ['x' => 3.0, 'y' => 3.0]; // Longitud cero

    $pCoincidente = ['x' => 3.0, 'y' => 3.0];
    expect(GeometriaPuntoSegmento::distanciaPuntoASegmento($pCoincidente, $a, $b))->toBe(0.0);

    $pDistante = ['x' => 3.0, 'y' => 6.0];
    expect(GeometriaPuntoSegmento::distanciaPuntoASegmento($pDistante, $a, $b))->toBe(3.0);
});

test('Distancia al perímetro de ambientes con polígonos irregulares en L', function () {
    // Polígono en L ortogonal:
    // (0,0) -> (7,0) -> (7,4) -> (4,4) -> (4,9) -> (0,9)
    $verticesL = [
        ['x' => 0.0, 'y' => 0.0],
        ['x' => 7.0, 'y' => 0.0],
        ['x' => 7.0, 'y' => 4.0],
        ['x' => 4.0, 'y' => 4.0],
        ['x' => 4.0, 'y' => 9.0],
        ['x' => 0.0, 'y' => 9.0],
    ];

    $ambienteL = [
        'codigo' => 'AMB-L',
        'vertices_poligono' => $verticesL,
    ];

    // Punto en la pared vertical interna de la L (x=4, y=6)
    $puntoEnPared = ['x' => 4.0, 'y' => 6.0];
    expect(GeometriaPuntoSegmento::distanciaPuntoAPolígono($puntoEnPared, $verticesL))->toBe(0.0)
        ->and(GeometriaPuntoSegmento::estaProximoAPerimetro($puntoEnPared, $ambienteL))->toBeTrue();

    // Punto desplazado 0.10m de la pared
    $puntoCercano = ['x' => 4.10, 'y' => 6.0];
    expect(GeometriaPuntoSegmento::distanciaPuntoAPolígono($puntoCercano, $verticesL))->toBe(0.10)
        ->and(GeometriaPuntoSegmento::estaProximoAPerimetro($puntoCercano, $ambienteL))->toBeTrue();

    // Punto en el centro del salón, lejos de cualquier pared
    $puntoCentro = ['x' => 2.0, 'y' => 2.0];
    $distCentro = GeometriaPuntoSegmento::distanciaPuntoAPolígono($puntoCentro, $verticesL);
    expect($distCentro)->toBe(2.0)
        ->and(GeometriaPuntoSegmento::estaProximoAPerimetro($puntoCentro, $ambienteL))->toBeFalse();
});
