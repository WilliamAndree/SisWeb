<?php

use App\Models\CategoriaSubsanacion;
use App\Services\GeoLocationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function proveedorSubsanacion(array $overrides = []): array
{
    return array_merge([
        'razon_social' => 'Proveedor de prueba',
        'nombre_comercial' => 'Proveedor',
        'telefono' => '+51999999999',
        'whatsapp' => '+51999999999',
        'direccion' => 'Av. de prueba 100',
        'distrito' => 'Huancayo',
        'latitud' => -12.0675,
        'longitud' => -75.2090,
        'servicios_ofrecidos' => 'Servicios de adecuación preventiva.',
        'activo' => true,
    ], $overrides);
}

it('calcula la distancia Haversine entre El Tambo y Huancayo Centro', function () {
    $distancia = (new GeoLocationService)->calcularDistanciaKm(-12.0550, -75.2200, -12.0675, -75.2090);

    expect(abs($distancia - 1.8338))->toBeLessThan(0.001);
});

it('busca proveedores por deficiencia, los ordena por proximidad y excluye inactivos', function () {
    $categoria = CategoriaSubsanacion::create([
        'codigo' => 'ELECTRICO',
        'nombre' => 'Materiales e instalaciones eléctricas',
    ]);

    $cercano = $categoria->proveedoresRecursos()->create(proveedorSubsanacion([
        'razon_social' => 'Electro Cercanías E.I.R.L.',
        'latitud' => -12.0640,
        'longitud' => -75.2100,
    ]));

    $lejano = $categoria->proveedoresRecursos()->create(proveedorSubsanacion([
        'razon_social' => 'Electro Distancias S.A.C.',
        'latitud' => -12.0500,
        'longitud' => -75.2200,
    ]));

    $categoria->proveedoresRecursos()->create(proveedorSubsanacion([
        'razon_social' => 'Electro Inactiva S.A.C.',
        'latitud' => -12.0610,
        'longitud' => -75.2120,
        'activo' => false,
    ]));

    $arquitectura = CategoriaSubsanacion::create([
        'codigo' => 'ARQUITECTURA',
        'nombre' => 'Arquitectura y remodelaciones',
    ]);

    $arquitectura->proveedoresRecursos()->create(proveedorSubsanacion([
        'razon_social' => 'Estudio Arquitectónico Andino',
        'latitud' => -12.0620,
        'longitud' => -75.2080,
    ]));

    $servicio = new GeoLocationService;

    $resultado = $servicio->buscarProveedoresPorDeficiencia('LUCES_EMERG', -12.0680, -75.2100);

    expect($resultado['categoria'])->toBe('ELECTRICO')
        ->and($resultado['nombre_categoria'])->toBe('Materiales e instalaciones eléctricas')
        ->and($resultado['proveedores'])->toHaveCount(2)
        ->and(array_column($resultado['proveedores'], 'razon_social'))
        ->toBe([$cercano->razon_social, $lejano->razon_social])
        ->and($resultado['proveedores'][0]['distancia_km'])
        ->toBeLessThan($resultado['proveedores'][1]['distancia_km']);
});

it('extiende el radio cuando no hay resultados y mapea códigos por defecto a arquitectura', function () {
    $senaletica = CategoriaSubsanacion::create([
        'codigo' => 'SENALETICA',
        'nombre' => 'Señalética y medios de evacuación',
    ]);

    $senaletica->proveedoresRecursos()->create(proveedorSubsanacion([
        'razon_social' => 'Señalética Andina E.I.R.L.',
        'latitud' => -12.0640,
        'longitud' => -75.2120,
    ]));

    $servicio = new GeoLocationService;

    $resultado = $servicio->buscarProveedoresPorDeficiencia('EVACUACION', -12.0680, -75.2100, 0.1);

    expect($resultado['categoria'])->toBe('SENALETICA')
        ->and($resultado['radio_extendido'])->toBeTrue()
        ->and($resultado['proveedores'])->toHaveCount(1)
        ->and($resultado['proveedores'][0]['razon_social'])->toBe('Señalética Andina E.I.R.L.');

    $mapeado = $servicio->buscarProveedoresPorDeficiencia('POZO_TIERRA', -12.0680, -75.2100, 5.0);

    expect($mapeado['categoria'])->toBe('ARQUITECTURA')
        ->and($mapeado['proveedores'])->toBeEmpty();
});
