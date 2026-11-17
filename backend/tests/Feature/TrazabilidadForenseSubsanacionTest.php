<?php

use App\Models\Autoevaluacion;
use App\Models\HistorialSubsanacion;
use App\Models\SimulacionRevision;
use App\Models\User;
use Illuminate\Support\Str;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\get;
use function Pest\Laravel\post;

test('registra user_id e ip_address en historial_subsanaciones para trazabilidad forense', function () {
    $user = User::factory()->create();

    $autoevaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $user->id,
        'nombre_comercio' => 'Ferretería Central',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'ROJO',
        'porcentaje_cumplimiento' => 50.0,
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => false, 'estado' => 'NO_CUMPLE'],
        ],
    ]);

    $simulacion = SimulacionRevision::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'codigo_revision' => 'REV-2026-001',
        'resultado' => 'CON_OBSERVACIONES',
        'detalle_revision' => ['EXTINTOR' => false],
        'porcentaje_revision' => 50.0,
        'metrica_gap' => 50.0,
        'total_observaciones' => 1,
    ]);

    actingAs($user);

    // Primera declaración: estado PENDIENTE
    post(route('autoevaluacion.subsanacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), [
        'codigo_item' => 'EXTINTOR',
        'descripcion_subsanacion' => 'Pendiente de cotización de recarga',
        'estado' => 'PENDIENTE',
    ], ['REMOTE_ADDR' => '192.168.1.105'])->assertSessionHasNoErrors();

    // Segunda declaración: cambia a SUBSANADO_DECLARADO -> dispara HistorialSubsanacion
    post(route('autoevaluacion.subsanacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), [
        'codigo_item' => 'EXTINTOR',
        'descripcion_subsanacion' => 'Extintor recargado con tarjeta de control vigente',
        'estado' => 'SUBSANADO_DECLARADO',
    ], ['REMOTE_ADDR' => '192.168.1.105'])->assertSessionHasNoErrors();

    assertDatabaseHas('historial_subsanaciones', [
        'user_id' => $user->id,
        'estado_anterior' => 'PENDIENTE',
        'estado_nuevo' => 'SUBSANADO_DECLARADO',
    ]);

    $historial = HistorialSubsanacion::latest('id')->firstOrFail();
    expect($historial->user_id)->toBe($user->id)
        ->and($historial->user)->not->toBeNull()
        ->and($historial->user->id)->toBe($user->id)
        ->and($historial->ip_address)->not->toBeNull();
});

test('rechaza con 403 a un usuario ajeno que intenta acceder al panel de subsanación (SEC-05 IDOR)', function () {
    $titular = User::factory()->create();
    $intruso = User::factory()->create();

    $autoevaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $titular->id,
        'nombre_comercio' => 'Botica La Merced',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'VERDE',
        'porcentaje_cumplimiento' => 100.0,
        'detalle_checklist' => [],
    ]);

    actingAs($intruso);

    get(route('autoevaluacion.subsanacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('rechaza con 403 a un usuario ajeno que intenta guardar una subsanación (SEC-05 IDOR)', function () {
    $titular = User::factory()->create();
    $intruso = User::factory()->create();

    $autoevaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $titular->id,
        'nombre_comercio' => 'Panadería El Mantaro',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'VERDE',
        'porcentaje_cumplimiento' => 100.0,
        'detalle_checklist' => [],
    ]);

    actingAs($intruso);

    post(route('autoevaluacion.subsanacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), [
        'codigo_item' => 'EXTINTOR',
        'descripcion_subsanacion' => 'Intento no autorizado de subsanación',
        'estado' => 'SUBSANADO_DECLARADO',
    ])->assertForbidden();
});

test('rechaza con 403 a un usuario ajeno que intenta consultar el anexo oficial CENEPRED (SEC-05 IDOR)', function () {
    $titular = User::factory()->create();
    $intruso = User::factory()->create();

    $autoevaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $titular->id,
        'nombre_comercio' => 'Librería Huancayo',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'VERDE',
        'porcentaje_cumplimiento' => 100.0,
        'detalle_checklist' => [],
    ]);

    actingAs($intruso);

    get(route('autoevaluacion.anexo', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});
