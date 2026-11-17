<?php

use App\Models\ActividadComercial;
use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\ReglaAplicabilidad;
use App\Models\RespuestaAutoevaluacion;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('persiste actividades comerciales con sus estados de validacion normativa y scopes', function () {
    $actividadValidada = ActividadComercial::create([
        'nombre_actividad' => 'Bodega y Abarrotes',
        'ciiu_codigo' => '4711',
        'ciiu_descripcion' => 'Venta al por menor en comercios no especializados',
        'funcion_itse' => 'Comercio',
        'estado_validacion' => 'VALIDADO',
        'activo' => true,
    ]);

    $actividadEnValidacion = ActividadComercial::create([
        'nombre_actividad' => 'Gimnasio con sauna',
        'ciiu_codigo' => null,
        'ciiu_descripcion' => null,
        'funcion_itse' => 'Encuentro',
        'estado_validacion' => 'EN_VALIDACION',
        'activo' => true,
    ]);

    $actividadInactiva = ActividadComercial::create([
        'nombre_actividad' => 'Actividad Descontinuada',
        'estado_validacion' => 'VALIDADO',
        'activo' => false,
    ]);

    expect(ActividadComercial::activas()->count())->toBe(2)
        ->and(ActividadComercial::validadas()->count())->toBe(2)
        ->and(ActividadComercial::activas()->validadas()->pluck('id'))->toContain($actividadValidada->id)
        ->and(ActividadComercial::activas()->validadas()->pluck('id'))->not->toContain($actividadEnValidacion->id);
});

it('persiste criterios normativos y respeta la exclusion ciudadana de TIPO_D', function () {
    $criterioA = CriterioNormativo::create([
        'codigo_criterio' => 'EXT-01',
        'categoria' => 'Medios de Protección y Evacuación',
        'norma_base' => 'NTP 350.043-1',
        'articulo_referencia' => 'Art. 7',
        'tipo_criterio' => 'TIPO_A',
        'estado_normativo' => 'VIGENTE',
        'pregunta_ciudadana' => '¿Cuenta con extintor operativo y con carga vigente?',
        'que_observar' => 'Verificar manómetro en franja verde y tarjeta de inspección.',
        'accion_mejora_orientativa' => 'Llevar a recargar o adquirir extintor PQS de 6kg.',
        'activo' => true,
    ]);

    $criterioD = CriterioNormativo::create([
        'codigo_criterio' => 'EST-01',
        'categoria' => 'Estructuras',
        'norma_base' => 'RNE E.030',
        'tipo_criterio' => 'TIPO_D',
        'estado_normativo' => 'VIGENTE',
        'pregunta_ciudadana' => 'Cálculo de vulnerabilidad estructural',
        'activo' => true,
    ]);

    expect(CriterioNormativo::ciudadanos()->pluck('codigo_criterio'))->toContain('EXT-01')
        ->and(CriterioNormativo::ciudadanos()->pluck('codigo_criterio'))->not->toContain('EST-01');
});

it('persiste reglas de aplicabilidad con condiciones estructuradas en JSON', function () {
    $criterio = CriterioNormativo::create([
        'codigo_criterio' => 'GLP-01',
        'categoria' => 'Instalaciones Especiales',
        'norma_base' => 'DS 027-94-EM',
        'tipo_criterio' => 'TIPO_B',
        'pregunta_ciudadana' => '¿Los balones de gas cuentan con manguera reforzada y regulador?',
    ]);

    $regla = ReglaAplicabilidad::create([
        'criterio_id' => $criterio->id,
        'condicion_activacion' => 'USA_GLP',
        'operador_logico' => 'AND',
        'condiciones_compuestas' => [
            'campo' => 'usa_glp',
            'operador' => '==',
            'valor' => true,
        ],
        'estado_regla' => 'ACTIVA',
    ]);

    expect($regla->condiciones_compuestas)->toBeArray()
        ->and($regla->condiciones_compuestas['campo'])->toBe('usa_glp')
        ->and($regla->criterioNormativo->codigo_criterio)->toBe('GLP-01');
});

it('persiste respuestas de autoevaluacion y previene duplicados con restriccion unica', function () {
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Mi Tiendita',
        'tipo_tramite' => 'EX_POST',
        'nivel_riesgo' => 'BAJO_MEDIO',
        'porcentaje_cumplimiento' => 100,
        'semaforo' => 'VERDE',
        'sector_huancayo' => 'Centro',
        'area_m2' => 30,
        'detalle_checklist' => [],
    ]);

    $criterio = CriterioNormativo::create([
        'codigo_criterio' => 'BOT-01',
        'categoria' => 'Primeros Auxilios',
        'norma_base' => 'RNE A.130',
        'pregunta_ciudadana' => '¿Tiene botiquín implementado?',
    ]);

    $respuesta = RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => $criterio->id,
        'estado_respuesta' => 'CUMPLE_DECLARADO',
        'notas_ciudadano' => 'Implementado cerca del mostrador',
    ]);

    expect($respuesta->estado_respuesta)->toBe('CUMPLE_DECLARADO')
        ->and($evaluacion->respuestas)->toHaveCount(1)
        ->and($evaluacion->respuestas->first()->criterioNormativo->codigo_criterio)->toBe('BOT-01');

    // Debe lanzar excepción si se intenta duplicar la respuesta para el mismo criterio en la misma autoevaluación
    expect(function () use ($evaluacion, $criterio) {
        RespuestaAutoevaluacion::create([
            'autoevaluacion_id' => $evaluacion->id,
            'criterio_id' => $criterio->id,
            'estado_respuesta' => 'PENDIENTE_ATENDER',
        ]);
    })->toThrow(QueryException::class);
});

it('almacena en autoevaluacion los nuevos campos normativos, contadores facticos y relacion de actividad', function () {
    $actividad = ActividadComercial::create([
        'nombre_actividad' => 'Restaurante / Cafetería',
        'funcion_itse' => 'Encuentro',
        'estado_validacion' => 'VALIDADO',
    ]);

    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'codigo_acceso' => 'ACC-12345678',
        'token_seguridad' => 'SEC-ABCD-9876',
        'actividad_comercial_id' => $actividad->id,
        'nombre_comercio' => 'El Café Huancaíno',
        'ruc' => null, // RUC opcional
        'sector_huancayo' => 'El Tambo',
        'area_m2' => 85.5,
        'pisos' => 1,
        'aforo' => 30,
        'caracteristicas_declaradas' => [
            'area_m2' => 85.5,
            'pisos' => 1,
            'aforo' => 30,
            'usa_glp' => true,
            'galones_glp' => 10,
        ],
        'total_condiciones_evaluadas' => 8,
        'total_cumple_declarado' => 6,
        'total_pendiente_atender' => 1,
        'total_por_revisar' => 1,
        'total_no_aplica' => 2,
        'tipo_tramite' => 'EX_POST',
        'nivel_riesgo' => 'BAJO_MEDIO',
        'porcentaje_cumplimiento' => 75.0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    $evaluacionRecargada = Autoevaluacion::find($evaluacion->id);

    expect($evaluacionRecargada->actividadComercial->nombre_actividad)->toBe('Restaurante / Cafetería')
        ->and($evaluacionRecargada->ruc)->toBeNull()
        ->and($evaluacionRecargada->codigo_acceso)->toBe('ACC-12345678')
        ->and($evaluacionRecargada->token_seguridad)->toBe('SEC-ABCD-9876')
        ->and($evaluacionRecargada->caracteristicas_declaradas)->toBeArray()
        ->and($evaluacionRecargada->caracteristicas_declaradas['usa_glp'])->toBeTrue()
        ->and($evaluacionRecargada->total_condiciones_evaluadas)->toBe(8)
        ->and($evaluacionRecargada->total_cumple_declarado)->toBe(6)
        ->and($evaluacionRecargada->total_pendiente_atender)->toBe(1)
        ->and($evaluacionRecargada->total_por_revisar)->toBe(1)
        ->and($evaluacionRecargada->total_no_aplica)->toBe(2);
});
