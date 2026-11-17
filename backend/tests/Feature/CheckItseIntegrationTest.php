<?php

use App\Models\Autoevaluacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\get;
use function Pest\Laravel\post;

uses(RefreshDatabase::class);

test('flujo completo: autoevaluacion, simulacion de revision in situ, plan preventivo y cierre', function () {
    // -------------------------------------------------------------------------
    // 1. Registro del formulario del comerciante (Paso 1 y 2 del asistente cívico)
    // -------------------------------------------------------------------------
    $payloadAutoevaluacion = [
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
            ['codigo' => 'EXTINTOR',       'nombre' => 'Extintor PQS',         'cumple' => true,  'estado' => 'CUMPLE',    'es_critico' => false],
            ['codigo' => 'TERMOMAGNETICO', 'nombre' => 'Tablero eléctrico',    'cumple' => true,  'estado' => 'CUMPLE',    'es_critico' => false],
            ['codigo' => 'EVACUACION',     'nombre' => 'Rutas de escape',      'cumple' => true,  'estado' => 'CUMPLE',    'es_critico' => false],
            ['codigo' => 'BOTIQUIN',       'nombre' => 'Botiquín',             'cumple' => true,  'estado' => 'CUMPLE',    'es_critico' => false],
            ['codigo' => 'LUCES_EMERG',    'nombre' => 'Luces de emergencia',  'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
        ],
    ];

    $responseAutoevaluacion = post(route('autoevaluacion.store'), $payloadAutoevaluacion);
    $responseAutoevaluacion->assertSessionHasNoErrors();

    // -------------------------------------------------------------------------
    // 2. Verificación de cálculo, trazabilidad SHA-256 y redirección
    // -------------------------------------------------------------------------
    $autoevaluacion = Autoevaluacion::first();
    expect($autoevaluacion)->not->toBeNull()
        ->and($autoevaluacion->tipo_tramite)->toBeNull()
        ->and($autoevaluacion->nivel_riesgo)->toBeNull()
        ->and($autoevaluacion->porcentaje_cumplimiento)->toBe(80.0)
        ->and($autoevaluacion->semaforo)->toBe('AMBAR')
        ->and(strlen($autoevaluacion->hash_integridad))->toBe(64)
        ->and(strlen($autoevaluacion->uuid_trazabilidad))->toBe(36);

    $responseAutoevaluacion->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));

    // -------------------------------------------------------------------------
    // 3. Consulta de Resultado (Status 200)
    // -------------------------------------------------------------------------
    $responseResultado = get(route('autoevaluacion.resultado', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $responseResultado->assertOk();

    // -------------------------------------------------------------------------
    // 4. Simulación de revisión in situ (registro de código PREV-ITSE y GAP)
    // -------------------------------------------------------------------------
    $payloadSimulacion = [
        'verificaciones' => [
            'EXTINTOR' => true,
            'TERMOMAGNETICO' => true,
            'EVACUACION' => true,
            'BOTIQUIN' => true,
            'LUCES_EMERG' => false, // Observación detectada en la simulación
        ],
        'discrepancias' => 1,
    ];

    $responseSimulacion = post(
        route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]),
        $payloadSimulacion
    );
    $responseSimulacion->assertSessionHasNoErrors();

    $simulacion = SimulacionRevision::where('autoevaluacion_id', $autoevaluacion->id)->first();
    expect($simulacion)->not->toBeNull()
        ->and($simulacion->total_observaciones)->toBe(1)
        ->and($simulacion->resultado)->toBe('CON_OBSERVACIONES')
        ->and($simulacion->porcentaje_revision)->toBe(80.0)
        ->and($simulacion->metrica_gap)->toBe(0.0)
        ->and($simulacion->codigo_revision)->toStartWith('PREV-ITSE-');

    // -------------------------------------------------------------------------
    // 5. Plan de subsanación preventiva (declaración del ciudadano)
    // -------------------------------------------------------------------------
    $payloadSubsanacion = [
        'codigo_item' => 'LUCES_EMERG',
        'descripcion_subsanacion' => 'Instalación de lámpara autónoma LED con batería de 90 min según RNE A.130.',
        'estado' => 'SUBSANADO_DECLARADO',
    ];

    $responseSubsanacion = post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]),
        $payloadSubsanacion
    );
    $responseSubsanacion->assertSessionHasNoErrors();

    $subsanacion = Subsanacion::where('simulacion_revision_id', $simulacion->id)->first();
    expect($subsanacion)->not->toBeNull()
        ->and($subsanacion->codigo_item)->toBe('LUCES_EMERG')
        ->and($subsanacion->estado)->toBe('SUBSANADO_DECLARADO');

    // -------------------------------------------------------------------------
    // 6. Recálculo reactivo a semáforo VERDE y cierre del ciclo preventivo
    // -------------------------------------------------------------------------
    $autoevaluacion->refresh();
    $simulacion->refresh();

    expect($autoevaluacion->semaforo)->toBe('VERDE')
        ->and($autoevaluacion->porcentaje_cumplimiento)->toBe(100.0)
        ->and($simulacion->resultado)->toBe('SIN_OBSERVACIONES')
        ->and($simulacion->porcentaje_revision)->toBe(100.0)
        ->and($simulacion->metrica_gap)->toBe(0.0);

    // -------------------------------------------------------------------------
    // 7. Acceso al Informe de Autoevaluación Preventiva
    // -------------------------------------------------------------------------
    $responseInforme = get(route('autoevaluacion.informe', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $responseInforme->assertOk();
});
