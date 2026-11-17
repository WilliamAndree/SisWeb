<?php

use App\Http\Controllers\EvaluacionController;
use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use App\Models\User;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\withCookie;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

function crearAutoevaluacionSubsanacion(array $overrides = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Comercio Huancayo',
        'funcion_economica' => 'Comercio',
        'sector_huancayo' => 'Huancayo Centro',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'AMARILLO',
        'porcentaje_cumplimiento' => 80.0,
        'detalle_checklist' => [],
    ], $overrides));
}

test('propietario autenticado accede a subsanar-items y solo recibe criterios observados', function () {
    $user = User::factory()->create();

    $autoevaluacion = crearAutoevaluacionSubsanacion([
        'user_id' => $user->id,
        'nombre_comercio' => 'Cafetería Mantaro',
        'funcion_economica' => 'Restaurante',
        'porcentaje_cumplimiento' => 85.0,
    ]);

    $crit01 = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->firstOrFail();
    $crit05 = CriterioNormativo::where('codigo_criterio', 'CRIT-05')->firstOrFail();

    // CRIT-01: Ya cumple (no debe aparecer en la lista de subsanación)
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $crit01->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
    ]);

    // CRIT-05: Pendiente (debe aparecer en la lista de subsanación)
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $crit05->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
        'notas_ciudadano' => 'Falta medición de pozo a tierra',
    ]);

    actingAs($user);

    get(route('autoevaluacion.subsanar_items', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/SubsanacionDirecta')
            ->where('autoevaluacion.uuid', $autoevaluacion->uuid_trazabilidad)
            ->where('autoevaluacion.nombre_comercio', 'Cafetería Mantaro')
            ->has('items', 1)
            ->where('items.0.codigo', 'CRIT-05')
            ->where('items.0.estado', ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER)
            ->where('total_observaciones', 1)
        );
});

test('usuario no autorizado recibe 403 al acceder a subsanar-items', function () {
    $propietario = User::factory()->create();
    $otroUsuario = User::factory()->create();

    $autoevaluacion = crearAutoevaluacionSubsanacion([
        'user_id' => $propietario->id,
        'nombre_comercio' => 'Bodega Central',
    ]);

    actingAs($otroUsuario);

    get(route('autoevaluacion.subsanar_items', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('invitado sin autorización recibe 403 en subsanar-items', function () {
    $autoevaluacion = crearAutoevaluacionSubsanacion([
        'session_token' => 'token-secreto-invitado-123',
        'nombre_comercio' => 'Librería Huancayo',
    ]);

    get(route('autoevaluacion.subsanar_items', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('invitado con cookie válida accede a subsanar-items', function () {
    $token = 'token-invitado-valido-abc';

    $autoevaluacion = crearAutoevaluacionSubsanacion([
        'session_token' => $token,
        'nombre_comercio' => 'Boutique Huancavelica',
    ]);

    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.subsanar_items', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/SubsanacionDirecta')
            ->where('autoevaluacion.uuid', $autoevaluacion->uuid_trazabilidad)
        );
});

test('declarar-subsanado actualiza respuesta a CUMPLE_DECLARADO con notas', function () {
    $user = User::factory()->create();

    $autoevaluacion = crearAutoevaluacionSubsanacion([
        'user_id' => $user->id,
        'nombre_comercio' => 'Pollería Central',
    ]);

    $crit05 = CriterioNormativo::where('codigo_criterio', 'CRIT-05')->firstOrFail();

    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $crit05->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
    ]);

    actingAs($user);

    post(route('autoevaluacion.declarar_subsanado', ['uuid' => $autoevaluacion->uuid_trazabilidad]), [
        'codigo_criterio' => 'CRIT-05',
        'nota' => 'Pozo a tierra medido a 7.8 ohmios con protocolo de ingeniero CIP',
    ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    assertDatabaseHas('respuestas_autoevaluacion', [
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $crit05->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
        'notas_ciudadano' => 'Pozo a tierra medido a 7.8 ohmios con protocolo de ingeniero CIP',
    ]);
});

test('al subsanar todas las observaciones, la autoevaluacion queda al 100% y en estado CONFORME en el Dashboard', function () {
    $user = User::factory()->create();

    // Evaluación registrada con 1 sola condición pendiente
    $autoevaluacion = crearAutoevaluacionSubsanacion([
        'user_id' => $user->id,
        'nombre_comercio' => 'Zapatería Real',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'AMARILLO',
        'porcentaje_cumplimiento' => 80.0,
        'detalle_checklist' => [
            ['codigo' => 'CRIT-01', 'cumple' => true, 'estado' => 'CUMPLE'],
            ['codigo' => 'CRIT-05', 'cumple' => false, 'estado' => 'NO_CUMPLE'],
        ],
    ]);

    // Estado inicial en Dashboard: OBSERVADO
    expect(EvaluacionController::clasificarEstadoLocal($autoevaluacion))->toBe('OBSERVADO');

    actingAs($user);

    // Verificación de Dashboard inicial: 1 local observado
    get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Dashboard')
            ->where('kpis.observados', 1)
            ->where('kpis.aprobados', 0)
        );

    // Subsanar la única observación restante
    post(route('autoevaluacion.declarar_subsanado', ['uuid' => $autoevaluacion->uuid_trazabilidad]), [
        'codigo_criterio' => 'CRIT-05',
        'nota' => 'Mantenimiento preventivo completado',
    ])->assertRedirect();

    $autoevaluacion->refresh();

    // Verificación de actualización en base de datos: 100% y VERDE
    expect($autoevaluacion->porcentaje_cumplimiento)->toBe(100.0)
        ->and($autoevaluacion->semaforo)->toBe('VERDE')
        ->and(EvaluacionController::clasificarEstadoLocal($autoevaluacion))->toBe('CONFORME');

    // Verificación en Dashboard: local pasa a CONFORME y se actualizan los KPIs
    get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Dashboard')
            ->where('kpis.observados', 0)
            ->where('kpis.aprobados', 1)
            ->where('records.0.clasificacion_estado', 'CONFORME')
        );
});
