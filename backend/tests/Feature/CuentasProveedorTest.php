<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\OfertaProveedor;
use App\Models\ProveedorRecurso;
use App\Models\RespuestaAutoevaluacion;
use App\Models\User;
use App\Services\ApplicabilityEngineService;
use App\Services\DirectorioAliadosService;
use Database\Seeders\NormativaCatalogSeeder;
use Database\Seeders\ProveedorRecursoSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
    $this->seed(ProveedorRecursoSeeder::class);
});

function proveedorConPerfil(): User
{
    $usuario = User::factory()->create(['tipo_cuenta' => User::TIPO_PROVEEDOR]);
    actingAs($usuario)->put(route('proveedor.perfil'), [
        'nombre_comercial' => 'Extintores Wanka',
        'especialidad' => 'incendios',
        'telefono' => '964 112 233',
        'distrito' => 'El Tambo',
        'direccion' => 'Jr. Puno 450',
        'latitud' => -12.0581,
        'longitud' => -75.2153,
    ])->assertSessionHasNoErrors();

    return $usuario;
}

test('el registro guarda el tipo de cuenta y envía al proveedor a su panel', function () {
    $this->post(route('register.store'), [
        'tipo_cuenta' => 'proveedor',
        'name' => 'Rosa Quispe',
        'email' => 'rosa@example.test',
        'password' => 'Proveedor2026!Segura',
    ])->assertRedirect(route('proveedor.panel'));

    expect(User::where('email', 'rosa@example.test')->value('tipo_cuenta'))->toBe('proveedor');
});

test('un emprendedor nuevo empieza simulando su local', function () {
    $this->post(route('register.store'), [
        'name' => 'Billy Quispe',
        'email' => 'billy@example.test',
        'password' => 'Emprendedor2026!Segura',
    ])->assertRedirect(route('autoevaluacion.nueva'));

    expect(User::where('email', 'billy@example.test')->value('tipo_cuenta'))->toBe('cliente');
});

test('un emprendedor no puede entrar al panel de proveedor', function () {
    actingAs(User::factory()->create())->get(route('proveedor.panel'))->assertForbidden();
});

test('el proveedor publica su perfil con ubicación y su producto con precio', function () {
    $usuario = proveedorConPerfil();
    $perfil = $usuario->fresh()->proveedor;

    expect($perfil)->not->toBeNull()
        ->and($perfil->categoria->codigo)->toBe('EXTINTOR')
        ->and((float) $perfil->latitud)->toBe(-12.0581);

    actingAs($usuario)->post(route('proveedor.ofertas.store'), [
        'criterio_codigo' => 'CRIT-01',
        'nombre' => 'Extintor PQS 6 kg',
        'precio_soles' => 130,
        'unidad' => 'unidad',
    ])->assertSessionHasNoErrors();

    actingAs($usuario)->get(route('proveedor.productos'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Proveedor/Productos')
            ->where('perfil.nombre_comercial', 'Extintores Wanka')
            ->where('perfil.estado_revision', 'pendiente')
            ->has('ofertas', 1)
            ->where('ofertas.0.precio_soles', 130)
            ->where('ofertas.0.uso', 'incendios')
            ->where('ofertas.0.zona', 'Todo Huancayo')
        );
});

test('un proveedor no puede editar ni borrar productos de otro', function () {
    $dueno = proveedorConPerfil();
    actingAs($dueno)->post(route('proveedor.ofertas.store'), [
        'criterio_codigo' => 'CRIT-08', 'nombre' => 'Luz LED', 'precio_soles' => 80, 'unidad' => 'unidad',
    ]);
    $oferta = OfertaProveedor::firstOrFail();

    $otro = User::factory()->create(['tipo_cuenta' => User::TIPO_PROVEEDOR]);
    actingAs($otro)->put(route('proveedor.perfil'), [
        'nombre_comercial' => 'Otro negocio', 'especialidad' => 'incendios', 'telefono' => '964000111', 'distrito' => 'Chilca',
    ]);

    actingAs($otro)->delete(route('proveedor.ofertas.destroy', ['oferta' => $oferta->id]))->assertNotFound();
    expect(OfertaProveedor::count())->toBe(1);
});

test('las ofertas llegan a "Lo que te falta" con el costo calculado desde sus precios', function () {
    $proveedor = proveedorConPerfil();
    $proveedor->proveedor->update(['estado_revision' => ProveedorRecurso::ESTADO_APROBADO]);
    foreach ([[90, 'Recarga PQS'], [150, 'Extintor nuevo']] as [$precio, $nombre]) {
        actingAs($proveedor)->post(route('proveedor.ofertas.store'), [
            'criterio_codigo' => 'CRIT-01', 'nombre' => $nombre, 'precio_soles' => $precio, 'unidad' => 'unidad',
        ]);
    }

    $cliente = User::factory()->create();
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(), 'user_id' => $cliente->id, 'nombre_comercio' => 'Perfumería Billy',
        'funcion_economica' => 'Comercio', 'estado' => Autoevaluacion::ESTADO_REGISTRADA, 'semaforo' => 'AMARILLO',
        'porcentaje_cumplimiento' => 80.0, 'detalle_checklist' => [],
    ]);
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => CriterioNormativo::where('codigo_criterio', 'CRIT-01')->value('id'),
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_POR_REVISAR,
    ]);

    actingAs($cliente)->get(route('autoevaluacion.subsanar_items', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('items.0.asistencia.ofertas', 2)
            ->where('items.0.asistencia.ofertas.0.precio_soles', 90)
            ->where('items.0.asistencia.ofertas.0.proveedor.ubicacion_exacta', true)
            ->where('items.0.asistencia.rango_costo.minimo_soles', 90)
            ->where('items.0.asistencia.rango_costo.maximo_soles', 150)
            ->where('items.0.asistencia.rango_costo.fuente', 'proveedores')
        );
});

test('los proveedores del catálogo de ejemplo no exponen ubicación exacta', function () {
    $ejemplo = ProveedorRecurso::whereNull('user_id')->firstOrFail();
    OfertaProveedor::create(['proveedor_recurso_id' => $ejemplo->id, 'criterio_codigo' => 'CRIT-09', 'nombre' => 'Botiquín', 'precio_soles' => 70]);

    $oferta = app(DirectorioAliadosService::class)->ofertasPorCriterio('CRIT-09')[0];

    expect($oferta['proveedor']['ubicacion_exacta'])->toBeFalse()
        ->and($oferta['proveedor']['latitud'])->toBeNull();
});

test('un emprendedor que quiere vender sale de su cuenta y llega al registro de proveedor', function () {
    actingAs(User::factory()->create())
        ->post(route('logout'), ['destino' => 'registro_proveedor'])
        ->assertRedirect(route('register', ['tipo' => 'proveedor']));

    $this->assertGuest();
    $this->get(route('register', ['tipo' => 'proveedor']))->assertOk();
});
