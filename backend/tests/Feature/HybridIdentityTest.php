<?php

use App\Models\Autoevaluacion;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertAuthenticated;
use function Pest\Laravel\assertGuest;
use function Pest\Laravel\get;
use function Pest\Laravel\getJson;
use function Pest\Laravel\post;
use function Pest\Laravel\postJson;

function payloadAutoevaluacionHibrida(): array
{
    return [
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
    ];
}

test('la autoevaluacion publica permanece accesible sin autenticacion', function () {
    get(route('autoevaluacion.index'))
        ->assertOk()
        ->assertCookie('guest_session_token');
});

test('un invitado persiste la autoevaluacion con session_token y sin user_id', function () {
    post(route('autoevaluacion.store'), payloadAutoevaluacionHibrida())
        ->assertSessionHasNoErrors();

    $autoevaluacion = Autoevaluacion::first();

    expect($autoevaluacion)->not->toBeNull()
        ->and($autoevaluacion->user_id)->toBeNull()
        ->and($autoevaluacion->session_token)->not->toBeNull()
        ->and(strlen((string) $autoevaluacion->session_token))->toBe(40);
});

test('un usuario autenticado vincula la autoevaluacion a su cuenta', function () {
    $user = User::factory()->create();

    actingAs($user)
        ->post(route('autoevaluacion.store'), payloadAutoevaluacionHibrida())
        ->assertSessionHasNoErrors();

    expect(Autoevaluacion::first()->user_id)->toBe($user->id);
});

test('el registro crea el usuario, inicia sesion y acepta telefono opcional', function () {
    postJson('/registro', [
        'name' => 'Ana Quispe',
        'email' => 'ana@example.com',
        'password' => 'password',
        'telefono' => '987654321',
    ])->assertOk()
        ->assertJsonPath('user.email', 'ana@example.com')
        ->assertJsonPath('user.telefono', '987654321');

    assertAuthenticated();
    $this->assertDatabaseHas('users', [
        'email' => 'ana@example.com',
        'telefono' => '987654321',
    ]);
});

test('el login autentica con credenciales validas y rechaza las invalidas', function () {
    $user = User::factory()->create([
        'email' => 'login@example.com',
        'password' => 'password',
    ]);

    postJson('/login', [
        'email' => 'login@example.com',
        'password' => 'password',
    ])->assertOk()
        ->assertJsonPath('user.id', $user->id);

    assertAuthenticated();

    postJson('/logout')->assertOk()->assertJsonPath('user', null);
    assertGuest();

    postJson('/login', [
        'email' => 'login@example.com',
        'password' => 'incorrecta',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('el endpoint de usuario retorna null para invitados y el perfil autenticado', function () {
    getJson('/usuario')->assertOk()->assertJsonPath('user', null);

    $user = User::factory()->create();

    actingAs($user)
        ->getJson('/usuario')
        ->assertOk()
        ->assertJsonPath('user.id', $user->id);
});
