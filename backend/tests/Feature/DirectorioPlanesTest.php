<?php

use Inertia\Testing\AssertableInertia as Assert;

test('el directorio envía los planes para proveedores desde la configuración', function () {
    $this->get(route('directorio.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Directorio/Index')
            ->has('planes', count(config('aliados.planes')))
            ->has('planes.0', fn (Assert $plan) => $plan
                ->hasAll(['id', 'nombre', 'precio', 'descripcion', 'destacado', 'etiqueta', 'limite_productos', 'beneficios'])
            )
        );
});

test('solo un plan se marca como el más elegido', function () {
    $destacados = collect(config('aliados.planes'))->where('destacado', true);

    expect($destacados)->toHaveCount(1);
});
