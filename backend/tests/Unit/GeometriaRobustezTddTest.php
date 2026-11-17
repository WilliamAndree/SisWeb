<?php

use App\Services\Espacio\Geometria\GeometriaPuntoSegmento;
use App\Services\Espacio\GestionEspacialService;

test('GEO-3D-01 no redondea un punto exterior para incluirlo dentro de la tolerancia', function () {
    $ambiente = ['posicion_x' => 0, 'posicion_y' => 0, 'ancho_metros' => 4, 'largo_metros' => 4];

    expect(GeometriaPuntoSegmento::estaProximoAPerimetro(['x' => 2, 'y' => -0.20004], $ambiente))->toBeFalse();
    expect(GeometriaPuntoSegmento::estaProximoAPerimetro(['x' => 2, 'y' => -0.2], $ambiente))->toBeTrue();
});

test('GEO-3D-02 rechaza puntos sin coordenadas numericas finitas', function (array $punto) {
    expect(fn () => GeometriaPuntoSegmento::distanciaPuntoASegmento($punto, ['x' => 0, 'y' => 0], ['x' => 4, 'y' => 0]))
        ->toThrow(InvalidArgumentException::class);
})->with(['texto' => [['x' => 'abc', 'y' => 1]], 'ausente' => [['x' => 1]], 'infinito' => [['x' => INF, 'y' => 1]]]);

test('GEO-3D-05 frontera de tolerancia es estable al trasladar coordenadas', function (float $origen) {
    $ambiente = ['posicion_x' => $origen, 'posicion_y' => $origen, 'ancho_metros' => 4, 'largo_metros' => 4];

    expect(GeometriaPuntoSegmento::estaProximoAPerimetro(['x' => $origen + 2, 'y' => $origen - 0.2], $ambiente))->toBeTrue();
    expect(GeometriaPuntoSegmento::estaProximoAPerimetro(['x' => $origen + 2, 'y' => $origen - 0.20004], $ambiente))->toBeFalse();
})->with([4.0, 100.0]);

test('GEO-3D-08 shoelace conserva area al trasladar un cuadrado lejos del origen', function (float $base) {
    $vertices = [['x' => $base, 'y' => $base], ['x' => $base + 1, 'y' => $base], ['x' => $base + 1, 'y' => $base + 1], ['x' => $base, 'y' => $base + 1]];

    expect(GestionEspacialService::calcularAreaPoligono($vertices))->toBe(1.0);
})->with([1000000000.0, -1000000000.0]);
