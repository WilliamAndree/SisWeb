<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\EventoProveedor;
use App\Models\OfertaProveedor;
use App\Models\ProveedorRecurso;
use App\Models\RespuestaAutoevaluacion;
use App\Models\User;
use App\Models\VentaProveedor;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\DemoCuentasSeeder;
use Database\Seeders\NormativaCatalogSeeder;
use Database\Seeders\ProveedorRecursoSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
    $this->seed(ProveedorRecursoSeeder::class);
});

/**
 * @return array{0: User, 1: OfertaProveedor}
 */
function proveedorConProducto(string $estado = ProveedorRecurso::ESTADO_APROBADO): array
{
    $usuario = User::factory()->create(['tipo_cuenta' => User::TIPO_PROVEEDOR]);
    actingAs($usuario)->put(route('proveedor.perfil'), [
        'nombre_comercial' => 'Extintores Wanka', 'especialidad' => 'incendios', 'telefono' => '964 112 233', 'distrito' => 'El Tambo',
    ]);
    actingAs($usuario)->post(route('proveedor.ofertas.store'), [
        'criterio_codigo' => 'CRIT-01', 'nombre' => 'Extintor PQS 6 kg', 'precio_soles' => 130, 'unidad' => 'unidad', 'stock' => 10,
    ]);
    $negocio = ProveedorRecurso::where('user_id', $usuario->id)->firstOrFail();
    $negocio->update(['estado_revision' => $estado]);

    return [$usuario->fresh(), $negocio->ofertas()->firstOrFail()];
}

test('cada producto mostrado en "Lo que te falta" cuenta una aparición, una vez por visita', function () {
    [, $oferta] = proveedorConProducto();
    $cliente = User::factory()->create();
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(), 'user_id' => $cliente->id, 'nombre_comercio' => 'Bodega Mery',
        'funcion_economica' => 'Comercio', 'estado' => Autoevaluacion::ESTADO_REGISTRADA, 'semaforo' => 'AMARILLO',
        'porcentaje_cumplimiento' => 80.0, 'detalle_checklist' => [],
    ]);
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => CriterioNormativo::where('codigo_criterio', 'CRIT-01')->value('id'),
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_POR_REVISAR,
    ]);

    $url = route('autoevaluacion.subsanar_items', ['uuid' => $evaluacion->uuid_trazabilidad]);
    actingAs($cliente)->get($url)->assertOk();
    actingAs($cliente)->get($url)->assertOk();

    expect(EventoProveedor::where('tipo', EventoProveedor::APARICION)->where('oferta_proveedor_id', $oferta->id)->count())->toBe(1);
});

test('el navegador informa contactos y elecciones solo de negocios publicados', function () {
    [, $oferta] = proveedorConProducto();
    [, $ofertaPendiente] = proveedorConProducto(ProveedorRecurso::ESTADO_PENDIENTE);
    $codigo = 'PRV-'.str_pad((string) $oferta->proveedor_recurso_id, 3, '0', STR_PAD_LEFT);

    $this->postJson(route('eventos.proveedor'), ['tipo' => 'clic_whatsapp', 'oferta_id' => $oferta->id])->assertNoContent();
    $this->postJson(route('eventos.proveedor'), ['tipo' => 'eleccion', 'oferta_id' => $oferta->id])->assertNoContent();
    $this->postJson(route('eventos.proveedor'), ['tipo' => 'clic_whatsapp', 'oferta_id' => $ofertaPendiente->id])->assertNoContent();
    $this->postJson(route('eventos.proveedor'), ['tipo' => 'clic_mapa', 'proveedor' => $codigo])->assertNoContent();
    $this->postJson(route('eventos.proveedor'), ['tipo' => 'aparicion', 'oferta_id' => $oferta->id])->assertUnprocessable();

    expect(EventoProveedor::where('proveedor_recurso_id', $oferta->proveedor_recurso_id)->pluck('tipo')->sort()->values()->all())
        ->toBe(['clic_mapa', 'clic_whatsapp', 'eleccion'])
        ->and(EventoProveedor::where('proveedor_recurso_id', $ofertaPendiente->proveedor_recurso_id)->count())->toBe(0);
});

test('el proveedor ve en su resumen cuántos lo vieron, le escribieron y cuánto vendió', function () {
    [$proveedor, $oferta] = proveedorConProducto();
    foreach ([EventoProveedor::APARICION, EventoProveedor::APARICION, EventoProveedor::CLIC_WHATSAPP, EventoProveedor::ELECCION] as $tipo) {
        EventoProveedor::create(['proveedor_recurso_id' => $oferta->proveedor_recurso_id, 'oferta_proveedor_id' => $oferta->id, 'tipo' => $tipo]);
    }
    actingAs($proveedor)->post(route('proveedor.ventas.store'), [
        'oferta_id' => $oferta->id, 'cantidad' => 2, 'monto_soles' => 260, 'fecha' => today()->toDateString(), 'descontar_stock' => true,
    ])->assertSessionHasNoErrors();

    actingAs($proveedor)->get(route('proveedor.panel'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('estadisticas.ultimos_30_dias.apariciones', 2)
            ->where('estadisticas.ultimos_30_dias.contactos', 1)
            ->where('estadisticas.ultimos_30_dias.elecciones', 1)
            ->where('estadisticas.ventas_mes.monto', 260)
            ->where('estadisticas.top_productos.0.nombre', 'Extintor PQS 6 kg')
            ->has('estadisticas.meses', 6)
        );

    expect($oferta->fresh()->stock)->toBe(8);
});

test('las ventas se ordenan por mes y solo su dueño las borra', function () {
    [$proveedor, $oferta] = proveedorConProducto();
    actingAs($proveedor)->post(route('proveedor.ventas.store'), [
        'descripcion' => 'Instalación de luces', 'cantidad' => 1, 'monto_soles' => 150, 'fecha' => today()->toDateString(), 'cliente' => 'Bodega Mery',
    ])->assertSessionHasNoErrors();
    actingAs($proveedor)->post(route('proveedor.ventas.store'), ['cantidad' => 1, 'monto_soles' => 10, 'fecha' => today()->addDay()->toDateString()])
        ->assertSessionHasErrors(['descripcion', 'fecha']);

    actingAs($proveedor)->get(route('proveedor.ventas'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Proveedor/Ventas')
            ->has('ventas', 1)
            ->where('totales.mes', 150)
            ->where('ventas.0.cliente', 'Bodega Mery')
        );

    [$otro] = proveedorConProducto();
    $venta = VentaProveedor::sole();
    actingAs($otro)->delete(route('proveedor.ventas.destroy', ['venta' => $venta->id]))->assertNotFound();
    actingAs($proveedor)->delete(route('proveedor.ventas.destroy', ['venta' => $venta->id]))->assertSessionHas('success');

    expect(VentaProveedor::count())->toBe(0)
        ->and($oferta->fresh()->stock)->toBe(10);
});

test('las cuentas de demostración se crean y pueden reiniciarse', function () {
    $this->seed(DemoCuentasSeeder::class);
    $this->seed(DemoCuentasSeeder::class);

    $estadoDemo = ProveedorRecurso::whereHas('user', fn ($q) => $q->where('email', 'proveedor@checkitse.local'))->value('estado_revision');

    expect(User::where('email', 'admin@checkitse.local')->value('tipo_cuenta'))->toBe(User::TIPO_ADMIN)
        ->and($estadoDemo)->toBe('pendiente')
        ->and(VentaProveedor::count())->toBe(6);
});
