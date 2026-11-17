<?php

use App\Http\Controllers\EvaluacionController;
use App\Models\Autoevaluacion;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\put;

test('Visitante no autenticado es redirigido a login al intentar acceder al panel ciudadano', function () {
    get(route('dashboard'))
        ->assertRedirect(route('login'));
});

test('Usuario autenticado accede al panel ciudadano con sus locales y KPIs', function () {
    $user = User::factory()->create();

    Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $user->id,
        'nombre_comercio' => 'Boutique Andina',
        'funcion_economica' => 'Comercio',
        'ruc' => '20123456789',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'VERDE',
        'porcentaje_cumplimiento' => 100.0,
        'detalle_checklist' => [],
    ]);

    actingAs($user);

    get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Dashboard')
            ->has('records', 1)
            ->where('records.0.nombre_comercio', 'Boutique Andina')
            ->where('kpis.total_locales', 1)
            ->where('kpis.aprobados', 1)
            ->where('kpis.observados', 0)
            ->where('kpis.en_proceso', 0)
            ->where('kpis.riesgo_dominante', fn ($val) => is_string($val))
        );
});

test('Visitante no autenticado es redirigido a login al consultar el perfil', function () {
    get(route('perfil.show'))
        ->assertRedirect(route('login'));
});

test('Usuario autenticado consulta su perfil de contribuyente con Inertia', function () {
    $user = User::factory()->create([
        'name' => 'Comerciante Huancayo',
        'email' => 'comercio@huancayo.pe',
        'telefono' => '964112233',
    ]);

    actingAs($user);

    get(route('perfil.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Perfil/PerfilUsuario')
            ->where('user.id', $user->id)
            ->where('user.name', 'Comerciante Huancayo')
            ->where('user.email', 'comercio@huancayo.pe')
            ->where('user.telefono', '964112233')
        );
});

test('Usuario autenticado actualiza sus datos de contacto en mi-cuenta', function () {
    $user = User::factory()->create([
        'name' => 'Nombre Inicial',
        'email' => 'inicial@huancayo.pe',
        'telefono' => '999888777',
    ]);

    actingAs($user);

    put(route('perfil.update'), [
        'name' => 'Nombre Actualizado',
        'email' => 'nuevo@huancayo.pe',
        'telefono' => '964555666',
        'nombre_comercial' => 'Nuevo Nombre Comercial',
        'direccion_fiscal' => 'Jr. Real 500',
    ])
        ->assertRedirect(route('perfil.show'))
        ->assertSessionHas('success', 'Perfil actualizado correctamente.');

    $user->refresh();
    expect($user->name)->toBe('Nombre Actualizado')
        ->and($user->email)->toBe('nuevo@huancayo.pe')
        ->and($user->telefono)->toBe('964555666');
});

test('Usuario autenticado actualiza su contraseña exitosamente desde mi-cuenta', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password_antiguo_123'),
    ]);

    actingAs($user);

    put(route('perfil.update'), [
        'name' => $user->name,
        'email' => $user->email,
        'current_password' => 'password_antiguo_123',
        'password' => 'password_nuevo_456',
        'password_confirmation' => 'password_nuevo_456',
    ])
        ->assertRedirect(route('perfil.show'))
        ->assertSessionHas('success', 'Perfil actualizado correctamente.');

    $user->refresh();
    expect(Hash::check('password_nuevo_456', $user->password))->toBeTrue();
});

test('Usuario no puede actualizar contraseña si la contraseña actual es incorrecta', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password_correcto_123'),
    ]);

    actingAs($user);

    put(route('perfil.update'), [
        'name' => $user->name,
        'email' => $user->email,
        'current_password' => 'password_incorrecto',
        'password' => 'password_nuevo_456',
        'password_confirmation' => 'password_nuevo_456',
    ])
        ->assertSessionHasErrors(['current_password']);

    $user->refresh();
    expect(Hash::check('password_correcto_123', $user->password))->toBeTrue();
});

test('clasificarEstadoLocal: finalizada al 100% sin condiciones pendientes clasifica como CONFORME', function () {
    $estado = EvaluacionController::clasificarEstadoLocal([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'porcentaje_cumplimiento' => 100.0,
        'resumen_subsanaciones' => ['pendientes' => 0],
    ]);

    expect($estado)->toBe('CONFORME');
});

test('clasificarEstadoLocal: finalizada con menos de 100% clasifica como OBSERVADO', function () {
    $estado = EvaluacionController::clasificarEstadoLocal([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'porcentaje_cumplimiento' => 85.0,
        'resumen_subsanaciones' => ['pendientes' => 0],
    ]);

    expect($estado)->toBe('OBSERVADO');
});

test('clasificarEstadoLocal: finalizada al 100% pero con condiciones pendientes clasifica como OBSERVADO', function () {
    $estado = EvaluacionController::clasificarEstadoLocal([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'porcentaje_cumplimiento' => 100.0,
        'resumen_subsanaciones' => ['pendientes' => 2],
    ]);

    expect($estado)->toBe('OBSERVADO');
});

test('clasificarEstadoLocal: iniciada y no finalizada clasifica como EN_PROCESO', function () {
    $estado = EvaluacionController::clasificarEstadoLocal([
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'porcentaje_cumplimiento' => 50.0,
        'resumen_subsanaciones' => ['pendientes' => 0],
    ]);

    expect($estado)->toBe('EN_PROCESO');
});

test('Dashboard integración: la suma de conformes, observados y en proceso es igual al total y los conteos coinciden con los KPIs', function () {
    $user = User::factory()->create();

    // 1. Conforme: Registrada, 100% cumplimiento, sin observaciones pendientes
    Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $user->id,
        'nombre_comercio' => 'Local Conforme Alfa',
        'funcion_economica' => 'Comercio',
        'ruc' => '20123456781',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'VERDE',
        'porcentaje_cumplimiento' => 100.0,
        'detalle_checklist' => [],
    ]);

    // 2. Observado: Registrada, 80% cumplimiento
    Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $user->id,
        'nombre_comercio' => 'Local Observado Beta',
        'funcion_economica' => 'Restaurante',
        'ruc' => '20123456782',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'AMARILLO',
        'porcentaje_cumplimiento' => 80.0,
        'detalle_checklist' => [],
    ]);

    // 3. En Proceso: Iniciada, no finalizada
    Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $user->id,
        'nombre_comercio' => 'Local En Proceso Gamma',
        'funcion_economica' => 'Oficina',
        'ruc' => '20123456783',
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'semaforo' => 'PENDIENTE',
        'porcentaje_cumplimiento' => 40.0,
        'detalle_checklist' => [],
    ]);

    actingAs($user);

    get(route('dashboard'))
        ->assertOk()
        ->assertInertia(function (Assert $page) {
            $page->component('Dashboard/Dashboard')
                ->has('records', 3)
                ->where('kpis.total_locales', 3)
                ->where('kpis.aprobados', 1)
                ->where('kpis.observados', 1)
                ->where('kpis.en_proceso', 1);

            $kpis = $page->toArray()['props']['kpis'];
            $records = collect($page->toArray()['props']['records']);

            // La suma de conformes, observados y en proceso es igual al total
            expect($kpis['total_locales'])->toBe($kpis['aprobados'] + $kpis['observados'] + $kpis['en_proceso'])
                ->and($kpis['total_locales'])->toBe(3);

            // Los conteos de los filtros coinciden con los KPIs
            $conformesCount = $records->where('clasificacion_estado', 'CONFORME')->count();
            $observadosCount = $records->where('clasificacion_estado', 'OBSERVADO')->count();
            $enProcesoCount = $records->where('clasificacion_estado', 'EN_PROCESO')->count();

            expect($conformesCount)->toBe($kpis['aprobados'])
                ->and($observadosCount)->toBe($kpis['observados'])
                ->and($enProcesoCount)->toBe($kpis['en_proceso']);
        });
});

test('regla de seguridad (H-20): cuando un invitado crea una autoevaluación a través de store(), el registro queda con session_token no vacío', function () {
    // Protege el riesgo residual H-20, aceptado por el propietario: la creación pública por store() siempre asigna session_token mediante HandleGuestSession.
    $payload = [
        'nombre_comercio' => 'Bodega Don Pepe',
        'funcion_economica' => 'Comercio',
        'ruc' => '20609876543',
        'sector' => 'San Carlos (Huancayo Centro)',
        'area_m2' => '75.00',
        'pisos' => 1,
        'aforo' => 12,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
    ];

    post(route('autoevaluacion.store'), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $autoevaluacion = Autoevaluacion::where('ruc', '20609876543')->latest('id')->firstOrFail();

    expect($autoevaluacion->user_id)->toBeNull()
        ->and($autoevaluacion->session_token)->not->toBeEmpty();
});
