<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertAuthenticated;
use function Pest\Laravel\assertGuest;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\postJson;

uses(RefreshDatabase::class);

function payloadAutoevaluacionConversion(array $overrides = []): array
{
    return array_merge([
        'nombre_comercio' => 'Minimarket San Carlos',
        'funcion_economica' => 'Comercio',
        'ruc' => '20601234567',
        'sector' => 'San Carlos (Huancayo Centro)',
        'area_m2' => '120.50',
        'pisos' => 1,
        'aforo' => 20,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
        ],
    ], $overrides);
}

test('un invitado vincula exitosamente su autoevaluacion al registrarse', function () {
    post(route('autoevaluacion.store'), payloadAutoevaluacionConversion())
        ->assertSessionHasNoErrors();

    $autoevaluacion = Autoevaluacion::firstOrFail();
    expect($autoevaluacion->user_id)->toBeNull()
        ->and($autoevaluacion->session_token)->not->toBeNull();

    postJson('/registro', [
        'name' => 'Carlos Paredes',
        'email' => 'carlos@example.com',
        'password' => 'password',
    ])->assertOk();

    assertAuthenticated();
    $usuario = User::where('email', 'carlos@example.com')->firstOrFail();

    $response = $this->actingAs($usuario)
        ->withCookies(['guest_session_token' => $autoevaluacion->session_token])
        ->post(route('autoevaluacion.vincular-cuenta'), [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
        ]);

    $response->assertRedirect()->assertSessionHas('success');

    expect($autoevaluacion->fresh()->user_id)->toBe($usuario->id);
});

test('un intento de vincular el uuid de otra cuenta es rechazado con 403', function () {
    $usuarioDuenno = User::factory()->create();
    $usuarioAtacante = User::factory()->create();

    actingAs($usuarioDuenno)
        ->post(route('autoevaluacion.store'), payloadAutoevaluacionConversion())
        ->assertSessionHasNoErrors();

    $autoevaluacion = Autoevaluacion::firstOrFail();
    expect($autoevaluacion->user_id)->toBe($usuarioDuenno->id);

    actingAs($usuarioAtacante)
        ->post(route('autoevaluacion.vincular-cuenta'), [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
        ])
        ->assertForbidden();

    expect($autoevaluacion->fresh()->user_id)->toBe($usuarioDuenno->id);
});

test('el token de sesion no coincide al reclamar una autoevaluacion de invitado es rechazado', function () {
    post(route('autoevaluacion.store'), payloadAutoevaluacionConversion())
        ->assertSessionHasNoErrors();

    $autoevaluacion = Autoevaluacion::firstOrFail();
    expect($autoevaluacion->user_id)->toBeNull();

    $usuario = User::factory()->create();

    $this->actingAs($usuario)
        ->withCookies(['guest_session_token' => 'token-diferente-para-un-atacante'])
        ->post(route('autoevaluacion.vincular-cuenta'), [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
        ])
        ->assertForbidden();

    expect($autoevaluacion->fresh()->user_id)->toBeNull();
});

test('vincular una autoevaluacion ya asociada a la misma cuenta es idempotente', function () {
    $usuario = User::factory()->create();

    actingAs($usuario)
        ->post(route('autoevaluacion.store'), payloadAutoevaluacionConversion())
        ->assertSessionHasNoErrors();

    $autoevaluacion = Autoevaluacion::firstOrFail();
    expect($autoevaluacion->user_id)->toBe($usuario->id);

    $this->actingAs($usuario)
        ->post(route('autoevaluacion.vincular-cuenta'), [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($autoevaluacion->fresh()->user_id)->toBe($usuario->id);
});

test('un usuario autenticado lista solo sus autoevaluaciones con sus relaciones', function () {
    $usuario = User::factory()->create();

    $this->actingAs($usuario)
        ->post(route('autoevaluacion.store'), payloadAutoevaluacionConversion())
        ->assertSessionHasNoErrors();

    $autoevaluacion = Autoevaluacion::where('user_id', $usuario->id)->firstOrFail();

    $this->post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), [
        'verificaciones' => [
            'EXTINTOR' => true,
            'TERMOMAGNETICO' => true,
            'EVACUACION' => true,
            'BOTIQUIN' => true,
            'LUCES_EMERG' => false,
        ],
        'discrepancias' => 1,
    ])->assertSessionHasNoErrors();

    $this->post(route('autoevaluacion.subsanacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), [
        'codigo_item' => 'LUCES_EMERG',
        'descripcion_subsanacion' => 'Instalada lampara autonoma LED con bateria de respaldo.',
        'estado' => 'EN_PROCESO',
    ])->assertSessionHasNoErrors();

    $otroUsuario = User::factory()->create();
    $this->actingAs($otroUsuario)
        ->post(route('autoevaluacion.store'), payloadAutoevaluacionConversion([
            'nombre_comercio' => 'Bazar El Progreso',
            'ruc' => '20123456789',
        ]))
        ->assertSessionHasNoErrors();

    expect(Autoevaluacion::count())->toBe(2);

    $response = $this->actingAs($usuario)->get(route('mis-autoevaluaciones'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 1)
            ->where('autoevaluaciones.0.uuid_trazabilidad', $autoevaluacion->uuid_trazabilidad)
            ->where('autoevaluaciones.0.nombre_comercio', 'Minimarket San Carlos')
            ->where('autoevaluaciones.0.funcion_economica', 'Comercio')
            ->where('autoevaluaciones.0.semaforo', 'AMBAR')
            ->where('autoevaluaciones.0.porcentaje_cumplimiento', 80)
            ->where('autoevaluaciones.0.resumen_subsanaciones.en_proceso', 1)
            ->where('autoevaluaciones.0.resumen_subsanaciones.total', 1));
});

test('un invitado no autenticado es redirigido a mis autoevaluaciones', function () {
    get(route('mis-autoevaluaciones'))
        ->assertRedirect(route('login'));

    assertGuest();
});
