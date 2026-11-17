<?php

use App\Models\CategoriaSubsanacion;
use App\Models\ProveedorRecurso;
use App\Models\SolicitudAfiliacion;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\get;
use function Pest\Laravel\post;

test('rechaza la solicitud de afiliación si faltan los campos obligatorios', function () {
    post(route('directorio.afiliarse'), [])
        ->assertSessionHasErrors([
            'nombre_comercial',
            'contacto_nombre',
            'numero_documento',
            'email',
            'telefono',
            'rubro',
            'distrito',
        ]);
});

test('rechaza documento con longitud inválida que no sea DNI ni RUC', function () {
    post(route('directorio.afiliarse'), [
        'nombre_comercial' => 'Empresa Test',
        'contacto_nombre' => 'Contacto Test',
        'numero_documento' => '12345', // Inválido: debe ser 8 u 11 dígitos
        'email' => 'test@empresa.com',
        'telefono' => '976543210',
        'rubro' => 'electricas',
        'distrito' => 'Huancayo',
    ])->assertSessionHasErrors(['numero_documento']);
});

test('registra exitosamente una solicitud de afiliación en la base de datos', function () {
    $payload = [
        'nombre_comercial' => 'Ingeniería Mantaro S.A.C.',
        'contacto_nombre' => 'Ing. Juan Pérez Rojas',
        'numero_documento' => '20601234567',
        'email' => 'contacto@mantaro.pe',
        'telefono' => '976541230',
        'rubro' => 'electricas',
        'distrito' => 'Huancayo',
        'notas' => 'Especialistas colegiados en protocolos de pozo a tierra menor a 25 Ohmios.',
    ];

    $response = post(route('directorio.afiliarse'), $payload);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    assertDatabaseHas('solicitudes_afiliacion', [
        'nombre_comercial' => 'Ingeniería Mantaro S.A.C.',
        'contacto_nombre' => 'Ing. Juan Pérez Rojas',
        'numero_documento' => '20601234567',
        'email' => 'contacto@mantaro.pe',
        'telefono' => '976541230',
        'rubro' => 'electricas',
        'distrito' => 'Huancayo',
        'estado' => SolicitudAfiliacion::ESTADO_PENDIENTE,
    ]);
});

test('la consulta a directorio expone los aliados técnicos almacenados en la base de datos', function () {
    $categoria = CategoriaSubsanacion::updateOrCreate(
        ['codigo' => 'ELECTRICO'],
        ['nombre' => 'Materiales e instalaciones eléctricas']
    );

    ProveedorRecurso::updateOrCreate(
        ['razon_social' => 'Electro Servicios Mantaro S.A.C.'],
        [
            'categoria_id' => $categoria->id,
            'nombre_comercial' => 'Electro Mantaro',
            'telefono' => '+51987654321',
            'whatsapp' => '+51987654321',
            'direccion' => 'Av. Giráldez 350, Huancayo Centro',
            'distrito' => 'Huancayo',
            'latitud' => -12.06750000,
            'longitud' => -75.20900000,
            'servicios_ofrecidos' => 'Medición de puesta a tierra, tableros y mandiles',
            'activo' => true,
            'verificado' => true,
        ]
    );

    get(route('directorio.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Directorio/Index')
            ->has('aliados')
            ->where('aliados', fn ($aliados) => collect($aliados)->contains('nombre_comercial', 'Electro Mantaro'))
        );
});

test('el directorio permite filtrar aliados por categoría técnica', function () {
    $categoriaExtintor = CategoriaSubsanacion::updateOrCreate(
        ['codigo' => 'EXTINTOR'],
        ['nombre' => 'Extintores y recargas']
    );

    ProveedorRecurso::updateOrCreate(
        ['razon_social' => 'Extintores Especiales del Centro S.A.C.'],
        [
            'categoria_id' => $categoriaExtintor->id,
            'nombre_comercial' => 'Extintores Centro',
            'telefono' => '+51964112233',
            'direccion' => 'Jr. Puno 500',
            'distrito' => 'Huancayo',
            'latitud' => -12.067,
            'longitud' => -75.209,
            'servicios_ofrecidos' => 'Recarga PQS y acetato de potasio',
            'activo' => true,
            'verificado' => true,
        ]
    );

    get(route('directorio.index', ['categoria' => 'incendios']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Directorio/Index')
            ->where('filtros.categoria', 'incendios')
            ->where('aliados', fn ($aliados) => collect($aliados)->every(fn ($a) => $a['categoria'] === 'incendios'))
        );
});
