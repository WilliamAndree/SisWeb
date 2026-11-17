<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

const CREDENCIALES_FASE_0 = ['session_token', 'token_seguridad', 'user_id'];

function crearEvaluacionConCredenciales(User $titular, array $overrides = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Bodega El Portal Fase 0',
        'funcion_economica' => 'Comercio',
        'ruc' => '20661234567',
        'sector_huancayo' => 'Huancayo Centro',
        'direccion' => 'Jr. Lima 455',
        'area_m2' => 95.5,
        'pisos' => 1,
        'aforo' => 18,
        'porcentaje_cumplimiento' => 80.0,
        'semaforo' => 'AMBAR',
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'nombre' => 'Extintor PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'nombre' => 'Luces de emergencia', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
        ],
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'user_id' => $titular->id,
        'session_token' => 'sesion_secreta_'.Str::random(24),
        'token_seguridad' => 'seguridad_secreta_'.Str::random(24),
    ], $overrides));
}

function propsInformeFase0(Autoevaluacion $evaluacion): array
{
    $props = null;

    actingAs($evaluacion->user)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(function (Assert $page) use (&$props) {
            $page->component('Evaluacion/InformePreventivo');
            $props = $page->toArray()['props'];
        });

    return $props;
}

test('el informe no expone las credenciales de control de acceso en sus props', function () {
    $evaluacion = crearEvaluacionConCredenciales(User::factory()->create());

    $props = propsInformeFase0($evaluacion);

    foreach (CREDENCIALES_FASE_0 as $columna) {
        expect($props['autoevaluacion'])->not->toHaveKey($columna);
    }

    // La cabecera pública sí conserva los datos declarativos del establecimiento.
    expect($props['autoevaluacion']['nombre_comercio'])->toBe('Bodega El Portal Fase 0')
        ->and($props['autoevaluacion']['ruc'])->toBe('20661234567');
});

test('el informe no expone las credenciales de control de acceso en el HTML inicial', function () {
    $evaluacion = crearEvaluacionConCredenciales(User::factory()->create());

    $contenido = actingAs($evaluacion->user)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->getContent();

    expect($contenido)
        ->not->toContain($evaluacion->session_token)
        ->not->toContain($evaluacion->token_seguridad);
});

test('el hash de integridad del informe es estable entre emisiones del mismo estado', function () {
    $evaluacion = crearEvaluacionConCredenciales(User::factory()->create());

    $primera = propsInformeFase0($evaluacion);
    $segunda = propsInformeFase0($evaluacion);

    // El código de emisión es aleatorio por informe, así que no puede formar parte
    // de la huella; de lo contrario la misma evaluación produciría un hash distinto
    // en cada recarga y la verificación de integridad no sería reproducible.
    expect($segunda['codigoInforme'])->not->toBe($primera['codigoInforme'])
        ->and($segunda['hashFinal'])->toBe($primera['hashFinal'])
        ->and($primera['hashFinal'])->toMatch('/^[a-f0-9]{64}$/');
});

test('el hash de integridad del informe cambia cuando cambia el estado declarado', function () {
    $evaluacion = crearEvaluacionConCredenciales(User::factory()->create());

    $antes = propsInformeFase0($evaluacion)['hashFinal'];

    $evaluacion->update([
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'nombre' => 'Extintor PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'nombre' => 'Luces de emergencia', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ],
    ]);

    expect(propsInformeFase0($evaluacion)['hashFinal'])->not->toBe($antes);
});
