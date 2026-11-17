<?php

use Inertia\Testing\AssertableInertia as Assert;

test('la página de respaldo científico es pública y renderiza su componente', function () {
    $this->get('/respaldo-cientifico')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('RespaldoCientifico/Index'));
});

test('la ruta de respaldo científico tiene nombre estable para la navegación', function () {
    expect(route('respaldo.index', absolute: false))->toBe('/respaldo-cientifico');
});
