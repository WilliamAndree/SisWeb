<?php

use App\Models\OfertaProveedor;
use App\Models\ProveedorRecurso;
use App\Models\SolicitudPlan;
use App\Models\User;
use App\Services\DirectorioAliadosService;
use Database\Seeders\NormativaCatalogSeeder;
use Database\Seeders\ProveedorRecursoSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
    $this->seed(ProveedorRecursoSeeder::class);
    Storage::fake('local');
});

function negocioProveedor(string $estado = ProveedorRecurso::ESTADO_PENDIENTE): User
{
    $usuario = User::factory()->create(['tipo_cuenta' => User::TIPO_PROVEEDOR]);
    actingAs($usuario)->put(route('proveedor.perfil'), [
        'nombre_comercial' => 'Extintores Wanka',
        'especialidad' => 'incendios',
        'telefono' => '964 112 233',
        'distrito' => 'El Tambo',
    ])->assertSessionHasNoErrors();
    ProveedorRecurso::where('user_id', $usuario->id)->update(['estado_revision' => $estado]);

    return $usuario->fresh();
}

function administrador(): User
{
    return User::factory()->create(['tipo_cuenta' => User::TIPO_ADMIN]);
}

/** @return array<string, mixed> */
function datosPago(array $cambios = []): array
{
    return array_merge([
        'plan_solicitado' => 'destacado',
        'meses' => 3,
        'metodo_pago' => 'yape',
        'numero_operacion' => '04512398',
        'fecha_pago' => now()->toDateString(),
        'evidencia' => UploadedFile::fake()->create('voucher.jpg', 80, 'image/jpeg'),
    ], $cambios);
}

test('el proveedor envía su comprobante y el monto lo calcula el servidor', function () {
    $proveedor = negocioProveedor();

    actingAs($proveedor)->post(route('proveedor.plan.solicitar'), datosPago(['monto_soles' => 1]))
        ->assertRedirect(route('proveedor.plan'))
        ->assertSessionHasNoErrors();

    $solicitud = SolicitudPlan::sole();
    expect($solicitud->estado)->toBe(SolicitudPlan::ESTADO_PENDIENTE)
        ->and((float) $solicitud->monto_soles)->toBe(132.0) // 49 × 3 con 10 % de descuento
        ->and($solicitud->plan_actual)->toBe('basico')
        ->and(Storage::disk('local')->exists($solicitud->evidencia_ruta))->toBeTrue()
        ->and($proveedor->proveedor->fresh()->plan)->toBe('basico');
});

test('no se puede enviar otro pago mientras uno está en revisión ni reusar un comprobante', function () {
    $proveedor = negocioProveedor();
    actingAs($proveedor)->post(route('proveedor.plan.solicitar'), datosPago());

    actingAs($proveedor)->post(route('proveedor.plan.solicitar'), datosPago(['numero_operacion' => '99999999']))
        ->assertSessionHasErrors('plan_solicitado');

    SolicitudPlan::query()->update(['estado' => SolicitudPlan::ESTADO_RECHAZADA]);
    actingAs($proveedor)->post(route('proveedor.plan.solicitar'), datosPago())
        ->assertSessionHasErrors('numero_operacion');

    expect(SolicitudPlan::count())->toBe(1);
});

test('el comprobante debe ser imagen o PDF y de los últimos 60 días', function () {
    $proveedor = negocioProveedor();

    actingAs($proveedor)->post(route('proveedor.plan.solicitar'), datosPago([
        'evidencia' => UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream'),
        'fecha_pago' => now()->subDays(90)->toDateString(),
        'plan_solicitado' => 'basico',
    ]))->assertSessionHasErrors(['evidencia', 'fecha_pago', 'plan_solicitado']);
});

test('el administrador aprueba el pago y el plan se activa con su vencimiento', function () {
    $proveedor = negocioProveedor(ProveedorRecurso::ESTADO_APROBADO);
    actingAs($proveedor)->post(route('proveedor.plan.solicitar'), datosPago());
    $admin = administrador();

    actingAs($admin)->post(route('admin.pagos.aprobar', ['solicitud' => SolicitudPlan::sole()->id]))
        ->assertSessionHas('success');

    $negocio = $proveedor->proveedor->fresh();
    $solicitud = SolicitudPlan::sole();
    expect($negocio->plan)->toBe('destacado')
        ->and($negocio->plan_vence_el->toDateString())->toBe(today()->addMonthsNoOverflow(3)->toDateString())
        ->and($solicitud->estado)->toBe(SolicitudPlan::ESTADO_APROBADA)
        ->and($solicitud->revisado_por)->toBe($admin->id);

    // Una solicitud ya revisada no se puede volver a aprobar.
    actingAs($admin)->post(route('admin.pagos.aprobar', ['solicitud' => $solicitud->id]))->assertStatus(409);
});

test('renovar el mismo plan suma los meses al final del periodo vigente', function () {
    $proveedor = negocioProveedor(ProveedorRecurso::ESTADO_APROBADO);
    $vence = today()->addDays(20);
    $proveedor->proveedor->update(['plan' => 'destacado', 'plan_vence_el' => $vence]);
    actingAs($proveedor)->post(route('proveedor.plan.solicitar'), datosPago(['meses' => 1]));

    actingAs(administrador())->post(route('admin.pagos.aprobar', ['solicitud' => SolicitudPlan::sole()->id]));

    expect($proveedor->proveedor->fresh()->plan_vence_el->toDateString())->toBe($vence->copy()->addMonthNoOverflow()->toDateString());
});

test('rechazar un pago exige el motivo y el proveedor lo ve', function () {
    $proveedor = negocioProveedor();
    actingAs($proveedor)->post(route('proveedor.plan.solicitar'), datosPago());
    $solicitud = SolicitudPlan::sole();

    actingAs(administrador())->post(route('admin.pagos.rechazar', ['solicitud' => $solicitud->id]), ['observacion' => ''])
        ->assertSessionHasErrors('observacion');
    actingAs(administrador())->post(route('admin.pagos.rechazar', ['solicitud' => $solicitud->id]), ['observacion' => 'El monto no coincide.']);

    actingAs($proveedor)->get(route('proveedor.plan'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Proveedor/Plan')
            ->where('solicitudes.0.estado', 'rechazada')
            ->where('solicitudes.0.observacion_admin', 'El monto no coincide.')
        );
    expect($proveedor->proveedor->fresh()->plan)->toBe('basico');
});

test('solo un administrador entra a la administración y ve los comprobantes', function () {
    $this->get(route('admin.panel'))->assertRedirect(route('login'));

    $proveedor = negocioProveedor();
    actingAs($proveedor)->post(route('proveedor.plan.solicitar'), datosPago());
    $solicitud = SolicitudPlan::sole();

    actingAs($proveedor)->get(route('admin.panel'))->assertForbidden();
    actingAs($proveedor)->post(route('admin.pagos.aprobar', ['solicitud' => $solicitud->id]))->assertForbidden();
    actingAs(User::factory()->create())->get(route('admin.pagos.comprobante', ['solicitud' => $solicitud->id]))->assertForbidden();
    actingAs(administrador())->get(route('admin.panel'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panel')
            ->where('resumen.pagos_pendientes', 1)
            ->where('resumen.negocios_pendientes', 1)
            ->has('solicitudes', 1)
            ->where('solicitudes.0.monto_soles', 132)
        );
    actingAs(administrador())->get(route('admin.pagos.comprobante', ['solicitud' => $solicitud->id]))->assertOk();
});

test('un negocio nuevo no aparece a los clientes hasta que el administrador lo aprueba', function () {
    $proveedor = negocioProveedor();
    actingAs($proveedor)->post(route('proveedor.ofertas.store'), [
        'criterio_codigo' => 'CRIT-09', 'nombre' => 'Botiquín completo', 'precio_soles' => 70, 'unidad' => 'unidad',
    ]);
    $servicio = app(DirectorioAliadosService::class);
    $nombres = fn (): array => array_column($servicio->todos(), 'nombre_comercial');

    expect($servicio->ofertasPorCriterio('CRIT-09'))->toBe([])
        ->and($nombres())->not->toContain('Extintores Wanka');

    actingAs(administrador())->post(route('admin.negocios.revisar', ['proveedor' => $proveedor->proveedor->id]), ['accion' => 'aprobar'])
        ->assertSessionHas('success');

    expect($servicio->ofertasPorCriterio('CRIT-09'))->toHaveCount(1)
        ->and($nombres())->toContain('Extintores Wanka')
        ->and($proveedor->proveedor->fresh()->verificado)->toBeTrue();
});

test('un negocio observado vuelve a revisión cuando el proveedor corrige sus datos', function () {
    $proveedor = negocioProveedor(ProveedorRecurso::ESTADO_APROBADO);
    actingAs(administrador())->post(route('admin.negocios.revisar', ['proveedor' => $proveedor->proveedor->id]), ['accion' => 'observar'])
        ->assertSessionHasErrors('observacion');
    actingAs(administrador())->post(route('admin.negocios.revisar', ['proveedor' => $proveedor->proveedor->id]), [
        'accion' => 'observar', 'observacion' => 'Falta la dirección del local.',
    ]);
    expect($proveedor->proveedor->fresh()->estado_revision)->toBe(ProveedorRecurso::ESTADO_OBSERVADO);

    actingAs($proveedor)->put(route('proveedor.perfil'), [
        'nombre_comercial' => 'Extintores Wanka', 'especialidad' => 'incendios', 'telefono' => '964 112 233',
        'distrito' => 'El Tambo', 'direccion' => 'Jr. Puno 450',
    ]);

    expect($proveedor->proveedor->fresh()->estado_revision)->toBe(ProveedorRecurso::ESTADO_PENDIENTE);
});

test('el plan Básico permite 5 productos y pide mejorar el plan para más', function () {
    $proveedor = negocioProveedor();
    foreach (range(1, 5) as $i) {
        actingAs($proveedor)->post(route('proveedor.ofertas.store'), [
            'criterio_codigo' => 'CRIT-01', 'nombre' => "Extintor {$i}", 'precio_soles' => 100, 'unidad' => 'unidad', 'zona' => 'Huancayo',
        ])->assertSessionHasNoErrors();
    }

    actingAs($proveedor)->post(route('proveedor.ofertas.store'), [
        'criterio_codigo' => 'CRIT-01', 'nombre' => 'Extintor 6', 'precio_soles' => 100, 'unidad' => 'unidad',
    ])->assertSessionHasErrors('limite');

    expect(OfertaProveedor::count())->toBe(5);
});

test('el proveedor pausa un producto y deja de verse para los clientes', function () {
    $proveedor = negocioProveedor(ProveedorRecurso::ESTADO_APROBADO);
    actingAs($proveedor)->post(route('proveedor.ofertas.store'), [
        'criterio_codigo' => 'CRIT-09', 'nombre' => 'Botiquín', 'precio_soles' => 70, 'unidad' => 'unidad', 'stock' => 4, 'marca' => 'Medik',
    ]);
    $oferta = OfertaProveedor::sole();

    actingAs($proveedor)->patch(route('proveedor.ofertas.alternar', ['oferta' => $oferta->id]));

    expect($oferta->fresh()->activo)->toBeFalse()
        ->and($oferta->fresh()->stock)->toBe(4)
        ->and(app(DirectorioAliadosService::class)->ofertasPorCriterio('CRIT-09'))->toBe([]);
});

test('un plan vencido vuelve a Básico', function () {
    $proveedor = negocioProveedor(ProveedorRecurso::ESTADO_APROBADO);
    $negocio = $proveedor->proveedor;
    $negocio->update(['plan' => 'premium', 'plan_vence_el' => today()->subDay()]);

    expect($negocio->fresh()->planVigente())->toBe('basico');

    $this->artisan('checkitse:vencer-planes')->assertSuccessful();
    expect($negocio->fresh()->plan)->toBe('basico');
});

test('el administrador se crea solo por comando y entra a su panel', function () {
    $this->artisan('checkitse:crear-admin', ['email' => 'admin@checkitse.test', '--password' => 'Admin2026Segura'])->assertSuccessful();

    expect(User::where('email', 'admin@checkitse.test')->value('tipo_cuenta'))->toBe(User::TIPO_ADMIN);

    $this->post(route('login.store'), ['email' => 'admin@checkitse.test', 'password' => 'Admin2026Segura'])
        ->assertRedirect(route('admin.panel'));
});

test('el registro público no permite crear administradores', function () {
    $this->post(route('register.store'), [
        'tipo_cuenta' => 'admin', 'name' => 'Intruso', 'email' => 'intruso@example.test', 'password' => 'Intruso2026!Segura',
    ])->assertSessionHasErrors('tipo_cuenta');

    expect(User::where('email', 'intruso@example.test')->exists())->toBeFalse();
});
