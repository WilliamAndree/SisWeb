<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

function crearEvaluacionV2Desacople(array $overrides = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'codigo_acceso' => 'CHK-'.strtoupper(Str::random(6)),
        'nombre_comercio' => 'Bodega V2 Decoupled',
        'funcion_economica' => 'Comercio',
        'ruc' => '20123456789',
        'direccion' => 'Calle Real 100',
        'usa_glp' => false,
        'tiene_equipos_fritura' => false,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => false,
        'porcentaje_cumplimiento' => 0.0,
        'semaforo' => 'PENDIENTE',
        'detalle_checklist' => [],
        'estado' => Autoevaluacion::ESTADO_INICIADA,
    ], $overrides));
}

function crearEvaluacionLegacyDesacople(array $overrides = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Bodega V1 Legacy',
        'funcion_economica' => 'Comercio',
        'ruc' => '20987654321',
        'direccion' => 'Jr. Ancash 200',
        'porcentaje_cumplimiento' => 75.0,
        'semaforo' => 'AMBAR',
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR', 'estado' => 'CUMPLE', 'cumple' => true, 'es_critico' => true],
            ['codigo' => 'BOTIQUIN', 'estado' => 'NO_CUMPLE', 'cumple' => false, 'es_critico' => false],
        ],
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'payload_canonico' => null,
    ], $overrides));
}

test('UX06-01: acceso a autoevaluacion.resultado con evaluacion V2 iniciada redirige con 302 a autoevaluacion.resumen', function () {
    $evaluacion = crearEvaluacionV2Desacople();

    $response = $this->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]));

    $response->assertStatus(302);
    $response->assertRedirect(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]));
});

test('UX06-01: acceso a autoevaluacion.resultado con evaluacion V2 registrada redirige con 302 a autoevaluacion.resumen', function () {
    $token = 'token_guest_desacople_12345';
    $evaluacion = crearEvaluacionV2Desacople([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
        'payload_canonico' => ['criterios' => []],
        'total_condiciones_evaluadas' => 13,
        'session_token' => $token,
    ]);

    $response = $this->withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]));

    $response->assertStatus(302);
    $response->assertRedirect(route('autoevaluacion.resumen', ['uuid' => $evaluacion->uuid_trazabilidad]));
});

test('UX06-01: acceso a autoevaluacion.resultado con evaluacion V1 legacy conserva acceso 200 y renderiza Resultado.tsx', function () {
    $evaluacion = crearEvaluacionLegacyDesacople();

    $response = $this->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Evaluacion/Resultado')
        ->where('autoevaluacion.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
        ->where('autoevaluacion.nombre_comercio', 'Bodega V1 Legacy')
    );
});

test('UX06-03: en mis-autoevaluaciones las evaluaciones V2 exponen es_flujo_nuevo true', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionV2Desacople(['user_id' => $usuario->id]);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 1)
            ->where('autoevaluaciones.0.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluaciones.0.es_flujo_nuevo', true)
        );
});

test('UX06-03: en mis-autoevaluaciones las evaluaciones V1 legacy exponen es_flujo_nuevo false y preservan sus datos intactos', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionLegacyDesacople(['user_id' => $usuario->id]);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 1)
            ->where('autoevaluaciones.0.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluaciones.0.es_flujo_nuevo', false)
            ->where('autoevaluaciones.0.nombre_comercio', 'Bodega V1 Legacy')
        );
});

test('modelo Autoevaluacion: esFlujoNuevo distingue con precisión entre arquitectura V2 y V1 legacy', function () {
    $v2Iniciada = crearEvaluacionV2Desacople();
    expect($v2Iniciada->esFlujoNuevo())->toBeTrue();

    $v2Registrada = crearEvaluacionV2Desacople([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'payload_canonico' => ['normativa' => 'v2'],
    ]);
    expect($v2Registrada->esFlujoNuevo())->toBeTrue();

    $legacy = crearEvaluacionLegacyDesacople();
    expect($legacy->esFlujoNuevo())->toBeFalse();
});
