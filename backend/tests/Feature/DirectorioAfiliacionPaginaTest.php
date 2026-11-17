<?php

use App\Models\SolicitudAfiliacion;
use Inertia\Testing\AssertableInertia as Assert;

test('la página de afiliación preselecciona un plan válido de la URL', function () {
    $this->get(route('directorio.afiliacion', ['plan' => 'premium']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Directorio/Afiliacion')
            ->where('planSeleccionado', 'premium')
            ->has('planes', count(config('aliados.planes')))
            ->has('rubros', 4)
            ->has('distritos', 3)
        );
});

test('un plan inexistente en la URL no se preselecciona', function () {
    $this->get(route('directorio.afiliacion', ['plan' => 'gratis-para-siempre']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('planSeleccionado', null));
});

test('la solicitud guarda el plan de interés en las notas y vuelve con mensaje de éxito', function () {
    $this->from(route('directorio.afiliacion', ['plan' => 'destacado']))
        ->post(route('directorio.afiliarse'), [
            'nombre_comercial' => 'Extintores Wanka',
            'contacto_nombre' => 'Rosa Quispe',
            'numero_documento' => '20601234567',
            'telefono' => '964 123 456',
            'email' => 'rosa@example.test',
            'rubro' => 'incendios',
            'distrito' => 'Huancayo',
            'notas' => 'Plan de interés: Destacado',
        ])
        ->assertRedirect(route('directorio.afiliacion', ['plan' => 'destacado']))
        ->assertSessionHas('success');

    expect(SolicitudAfiliacion::where('nombre_comercial', 'Extintores Wanka')->value('notas'))->toBe('Plan de interés: Destacado');
});
