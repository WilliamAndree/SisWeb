<?php

use App\Models\CategoriaSubsanacion;

function recursoCercano(array $overrides = []): array
{
    return array_merge([
        'razon_social' => 'Proveedor referencial de prueba',
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

it('expone el directorio referencial de recursos cercanos sin requerir autenticación', function () {
    $categoria = CategoriaSubsanacion::create([
        'codigo' => 'SENALETICA',
        'nombre' => 'Señalética y medios de evacuación',
    ]);

    $categoria->proveedoresRecursos()->create(recursoCercano([
        'razon_social' => 'Señalética Andina E.I.R.L.',
        'latitud' => -12.0660,
        'longitud' => -75.2075,
    ]));

    $this->getJson('/autoevaluacion/recursos-cercanos/SENALETICA')
        ->assertOk()
        ->assertJsonPath('categoria', 'SENALETICA')
        ->assertJsonPath('nombre_categoria', 'Señalética y medios de evacuación')
        ->assertJsonCount(1, 'proveedores')
        ->assertJsonPath('proveedores.0.razon_social', 'Señalética Andina E.I.R.L.')
        ->assertJsonPath('proveedores.0.telefono', '+51999999999');
});

it('devuelve un estado vacío honesto cuando no existen recursos para el aspecto', function () {
    $this->getJson('/autoevaluacion/recursos-cercanos/POZO_TIERRA')
        ->assertOk()
        ->assertJsonPath('categoria', 'ARQUITECTURA')
        ->assertJsonPath('nombre_categoria', 'ARQUITECTURA')
        ->assertJsonPath('proveedores', [])
        ->assertJsonPath('radio_extendido', false);
});

it('rechaza coordenadas fuera del rango válido', function () {
    $this->getJson('/autoevaluacion/recursos-cercanos/SENALETICA?lat=999&lon=-75.21')
        ->assertUnprocessable();
});
