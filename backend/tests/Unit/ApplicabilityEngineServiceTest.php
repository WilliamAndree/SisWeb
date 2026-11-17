<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\ReglaAplicabilidad;
use App\Models\RespuestaAutoevaluacion;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
    $this->engine = app(ApplicabilityEngineService::class);
});

it('contiene exactamente los 19 codigos normativos del catalogo congelado', function () {
    $catalogo = $this->engine->getCatalogoCompleto();

    expect($catalogo)->toHaveCount(19);

    $codigos = $catalogo->pluck('codigo_criterio')->all();

    $codigosEsperados = [
        'CRIT-01', 'CRIT-02A', 'CRIT-02B', 'CRIT-03', 'CRIT-04',
        'CRIT-05', 'CRIT-06', 'CRIT-07', 'CRIT-08', 'CRIT-10',
        'CRIT-11', 'CRIT-13', 'CRIT-14A',
        'CRIT-09', 'CRIT-12', 'CRIT-14B', 'CRIT-15', 'CRIT-16', 'CRIT-17',
    ];

    expect($codigos)->toEqualCanonicalizing($codigosEsperados);
});

it('contiene exactamente 13 criterios activos y 6 suspendidos, y ningun suspendido aparece como activo', function () {
    $activos = $this->engine->getCriteriosActivos();
    $suspendidos = $this->engine->getCriteriosSuspendidos();

    expect($activos)->toHaveCount(13)
        ->and($suspendidos)->toHaveCount(6);

    $codigosActivos = $activos->pluck('codigo_criterio')->all();
    $codigosSuspendidos = $suspendidos->pluck('codigo_criterio')->all();

    expect($codigosActivos)->toEqualCanonicalizing(ApplicabilityEngineService::CODIGOS_ACTIVOS)
        ->and($codigosSuspendidos)->toEqualCanonicalizing(ApplicabilityEngineService::CODIGOS_SUSPENDIDOS);

    // Ningún criterio suspendido puede figurar en la lista de activos
    foreach (ApplicabilityEngineService::CODIGOS_SUSPENDIDOS as $suspendido) {
        expect($codigosActivos)->not->toContain($suspendido);
    }

    // Comprobar persistencia de los 6 suspendidos en base de datos
    $criteriosSuspendidosDb = CriterioNormativo::whereIn('codigo_criterio', ApplicabilityEngineService::CODIGOS_SUSPENDIDOS)->get();
    foreach ($criteriosSuspendidosDb as $criterio) {
        expect($criterio->activo)->toBeFalse()
            ->and($criterio->estado_normativo)->toBe('SUSPENDIDO');
    }
});

it('reconoce y valida exclusivamente los cuatro estados canonicos autorizados', function () {
    $estados = $this->engine->getEstadosCanonicos();

    expect($estados)->toBe([
        'CUMPLE_DECLARADO',
        'PENDIENTE_ATENDER',
        'POR_REVISAR',
        'NO_APLICA',
    ]);

    expect($this->engine->esEstadoCanonico('CUMPLE_DECLARADO'))->toBeTrue()
        ->and($this->engine->esEstadoCanonico('PENDIENTE_ATENDER'))->toBeTrue()
        ->and($this->engine->esEstadoCanonico('POR_REVISAR'))->toBeTrue()
        ->and($this->engine->esEstadoCanonico('NO_APLICA'))->toBeTrue()
        ->and($this->engine->esEstadoCanonico('CUMPLE'))->toBeFalse()
        ->and($this->engine->esEstadoCanonico('NO_CUMPLE'))->toBeFalse()
        ->and($this->engine->esEstadoCanonico('PENDIENTE'))->toBeFalse()
        ->and($this->engine->esEstadoCanonico('REEVALUADA'))->toBeFalse();
});

it('evalua CRIT-10 exclusivamente mediante usa_glp respetando NULL != false != NO_APLICA', function () {
    $criterioGlp = CriterioNormativo::where('codigo_criterio', 'CRIT-10')->firstOrFail();

    // 1. usa_glp = true -> CRIT-10 aplicable
    $evalTrue = $this->engine->evaluarCriterio($criterioGlp, ['usa_glp' => true]);
    expect($evalTrue['aplicable'])->toBeTrue()
        ->and($evalTrue['estado_sugerido'])->toBeNull()
        ->and($evalTrue['requiere_informacion'])->toBeFalse()
        ->and($evalTrue['motivo'])->toBeString()->not->toBeEmpty();

    // 2. usa_glp = false -> CRIT-10 NO_APLICA
    $evalFalse = $this->engine->evaluarCriterio($criterioGlp, ['usa_glp' => false]);
    expect($evalFalse['aplicable'])->toBeFalse()
        ->and($evalFalse['estado_sugerido'])->toBe('NO_APLICA')
        ->and($evalFalse['requiere_informacion'])->toBeFalse()
        ->and($evalFalse['motivo'])->toBeString()->not->toBeEmpty();

    // 3. usa_glp = null -> informacion insuficiente (NO convertir a false, NO convertir a NO_APLICA)
    $evalNull = $this->engine->evaluarCriterio($criterioGlp, ['usa_glp' => null]);
    expect($evalNull['aplicable'])->toBeNull()
        ->and($evalNull['estado_sugerido'])->toBeNull()
        ->and($evalNull['requiere_informacion'])->toBeTrue()
        ->and($evalNull['motivo'])->toBeString()->not->toBeEmpty();
});

it('evalua CRIT-02A condicionalmente mediante tiene_equipos_fritura respetando NULL != false != NO_APLICA', function () {
    $criterioClaseK = CriterioNormativo::where('codigo_criterio', 'CRIT-02A')->firstOrFail();

    expect($criterioClaseK->activo)->toBeTrue();

    // 1. tiene_equipos_fritura = true -> aplicable
    $evalTrue = $this->engine->evaluarCriterio($criterioClaseK, ['tiene_equipos_fritura' => true]);
    expect($evalTrue['activo'])->toBeTrue()
        ->and($evalTrue['aplicable'])->toBeTrue()
        ->and($evalTrue['estado_sugerido'])->toBeNull()
        ->and($evalTrue['requiere_informacion'])->toBeFalse()
        ->and($evalTrue['motivo'])->toBeString()->not->toBeEmpty();

    // 2. tiene_equipos_fritura = false -> NO_APLICA
    $evalFalse = $this->engine->evaluarCriterio($criterioClaseK, ['tiene_equipos_fritura' => false]);
    expect($evalFalse['activo'])->toBeTrue()
        ->and($evalFalse['aplicable'])->toBeFalse()
        ->and($evalFalse['estado_sugerido'])->toBe('NO_APLICA')
        ->and($evalFalse['requiere_informacion'])->toBeFalse()
        ->and($evalFalse['motivo'])->toBeString()->not->toBeEmpty();

    // 3. tiene_equipos_fritura = null -> requiere informacion (NULL ≠ false ≠ NO_APLICA)
    $evalNull = $this->engine->evaluarCriterio($criterioClaseK, ['tiene_equipos_fritura' => null]);
    expect($evalNull['activo'])->toBeTrue()
        ->and($evalNull['aplicable'])->toBeNull()
        ->and($evalNull['estado_sugerido'])->toBeNull()
        ->and($evalNull['requiere_informacion'])->toBeTrue()
        ->and($evalNull['motivo'])->toBeString()->not->toBeEmpty();

    // 4. No se infiere de usa_glp ni de actividades
    $evalInferencia = $this->engine->evaluarCriterio($criterioClaseK, ['usa_glp' => true, 'actividad_comercial_id' => 2]);
    expect($evalInferencia['aplicable'])->toBeNull()
        ->and($evalInferencia['requiere_informacion'])->toBeTrue();

    // 5. Regla activa en BD
    $regla = ReglaAplicabilidad::where('criterio_id', $criterioClaseK->id)->firstOrFail();
    expect($regla->estado_regla)->toBe('ACTIVA')
        ->and($regla->condicion_activacion)->toBe('TIENE_EQUIPOS_FRITURA')
        ->and($regla->condiciones_compuestas['campo'])->toBe('tiene_equipos_fritura');
});

it('evalua CRIT-11 condicionalmente mediante tiene_escaleras sin depender de pisos', function () {
    $criterioEscaleras = CriterioNormativo::where('codigo_criterio', 'CRIT-11')->firstOrFail();

    expect($criterioEscaleras->activo)->toBeTrue();

    // 1. tiene_escaleras = true -> aplicable
    $evalTrue = $this->engine->evaluarCriterio($criterioEscaleras, ['tiene_escaleras' => true]);
    expect($evalTrue['activo'])->toBeTrue()
        ->and($evalTrue['aplicable'])->toBeTrue()
        ->and($evalTrue['estado_sugerido'])->toBeNull()
        ->and($evalTrue['requiere_informacion'])->toBeFalse()
        ->and($evalTrue['motivo'])->toBeString()->not->toBeEmpty();

    // 2. tiene_escaleras = false -> NO_APLICA
    $evalFalse = $this->engine->evaluarCriterio($criterioEscaleras, ['tiene_escaleras' => false]);
    expect($evalFalse['activo'])->toBeTrue()
        ->and($evalFalse['aplicable'])->toBeFalse()
        ->and($evalFalse['estado_sugerido'])->toBe('NO_APLICA')
        ->and($evalFalse['requiere_informacion'])->toBeFalse()
        ->and($evalFalse['motivo'])->toBeString()->not->toBeEmpty();

    // 3. tiene_escaleras = null -> requiere informacion
    $evalNull = $this->engine->evaluarCriterio($criterioEscaleras, ['tiene_escaleras' => null]);
    expect($evalNull['activo'])->toBeTrue()
        ->and($evalNull['aplicable'])->toBeNull()
        ->and($evalNull['estado_sugerido'])->toBeNull()
        ->and($evalNull['requiere_informacion'])->toBeTrue()
        ->and($evalNull['motivo'])->toBeString()->not->toBeEmpty();

    // 4. Independencia de pisos: pisos = 2 pero tiene_escaleras = null -> requiere informacion (NO aplicable directo)
    $evalPisosSinVariable = $this->engine->evaluarCriterio($criterioEscaleras, ['pisos' => 2, 'tiene_escaleras' => null]);
    expect($evalPisosSinVariable['aplicable'])->toBeNull()
        ->and($evalPisosSinVariable['requiere_informacion'])->toBeTrue();

    // 5. Independencia de pisos: pisos = 1 pero tiene_escaleras = null -> requiere informacion (NO NO_APLICA)
    $evalPisoUnoSinVariable = $this->engine->evaluarCriterio($criterioEscaleras, ['pisos' => 1, 'tiene_escaleras' => null]);
    expect($evalPisoUnoSinVariable['estado_sugerido'])->not->toBe('NO_APLICA')
        ->and($evalPisoUnoSinVariable['requiere_informacion'])->toBeTrue();

    // 6. Independencia de pisos: pisos = 1 pero tiene_escaleras = true (desniveles/altillos) -> aplicable
    $evalPisoUnoConEscaleras = $this->engine->evaluarCriterio($criterioEscaleras, ['pisos' => 1, 'tiene_escaleras' => true]);
    expect($evalPisoUnoConEscaleras['aplicable'])->toBeTrue()
        ->and($evalPisoUnoConEscaleras['requiere_informacion'])->toBeFalse();

    // 7. Independencia de pisos: pisos = 3 pero tiene_escaleras = false -> NO_APLICA manda la declaracion fisica
    $evalPisosTresSinEscaleras = $this->engine->evaluarCriterio($criterioEscaleras, ['pisos' => 3, 'tiene_escaleras' => false]);
    expect($evalPisosTresSinEscaleras['aplicable'])->toBeFalse()
        ->and($evalPisosTresSinEscaleras['estado_sugerido'])->toBe('NO_APLICA');

    // 8. Regla activa en BD
    $regla = ReglaAplicabilidad::where('criterio_id', $criterioEscaleras->id)->firstOrFail();
    expect($regla->estado_regla)->toBe('ACTIVA')
        ->and($regla->condicion_activacion)->toBe('TIENE_ESCALERAS')
        ->and($regla->condiciones_compuestas['campo'])->toBe('tiene_escaleras');
});

it('evalua CRIT-13 condicionalmente mediante tiene_estanterias_altas sin umbral de 1.50 m ni inferencia de area/aforo', function () {
    $criterioEstanterias = CriterioNormativo::where('codigo_criterio', 'CRIT-13')->firstOrFail();

    expect($criterioEstanterias->activo)->toBeTrue();

    // 1. tiene_estanterias_altas = true -> aplicable
    $evalTrue = $this->engine->evaluarCriterio($criterioEstanterias, ['tiene_estanterias_altas' => true]);
    expect($evalTrue['activo'])->toBeTrue()
        ->and($evalTrue['aplicable'])->toBeTrue()
        ->and($evalTrue['estado_sugerido'])->toBeNull()
        ->and($evalTrue['requiere_informacion'])->toBeFalse()
        ->and($evalTrue['motivo'])->toBeString()->not->toBeEmpty();

    // 2. tiene_estanterias_altas = false -> NO_APLICA
    $evalFalse = $this->engine->evaluarCriterio($criterioEstanterias, ['tiene_estanterias_altas' => false]);
    expect($evalFalse['activo'])->toBeTrue()
        ->and($evalFalse['aplicable'])->toBeFalse()
        ->and($evalFalse['estado_sugerido'])->toBe('NO_APLICA')
        ->and($evalFalse['requiere_informacion'])->toBeFalse()
        ->and($evalFalse['motivo'])->toBeString()->not->toBeEmpty();

    // 3. tiene_estanterias_altas = null -> requiere informacion
    $evalNull = $this->engine->evaluarCriterio($criterioEstanterias, ['tiene_estanterias_altas' => null]);
    expect($evalNull['activo'])->toBeTrue()
        ->and($evalNull['aplicable'])->toBeNull()
        ->and($evalNull['estado_sugerido'])->toBeNull()
        ->and($evalNull['requiere_informacion'])->toBeTrue()
        ->and($evalNull['motivo'])->toBeString()->not->toBeEmpty()
        ->and($evalNull['motivo'])->not->toContain('1.50')
        ->and($evalNull['motivo'])->not->toContain('1.5');

    // 4. Sin inferencia de area_m2, pisos o aforo
    $evalSinInferencia = $this->engine->evaluarCriterio($criterioEstanterias, [
        'area_m2' => 500,
        'pisos' => 4,
        'aforo' => 100,
        'tiene_estanterias_altas' => null,
    ]);
    expect($evalSinInferencia['aplicable'])->toBeNull()
        ->and($evalSinInferencia['requiere_informacion'])->toBeTrue();

    // 5. Verificar que ninguna regla en base de datos contenga 1.5 o 1.50
    $regla = ReglaAplicabilidad::where('criterio_id', $criterioEstanterias->id)->firstOrFail();
    expect($regla->estado_regla)->toBe('ACTIVA')
        ->and($regla->condicion_activacion)->toBe('TIENE_ESTANTERIAS_ALTAS')
        ->and($regla->condiciones_compuestas['campo'])->toBe('tiene_estanterias_altas');

    $json = json_encode($regla->condiciones_compuestas);
    expect($json)->not->toContain('1.5');
});

it('mantiene CRIT-05 como Tipo C declarativo documental sin medicion fisica', function () {
    $criterioPozo = CriterioNormativo::where('codigo_criterio', 'CRIT-05')->firstOrFail();

    expect($criterioPozo->tipo_criterio)->toBe('TIPO_C')
        ->and($criterioPozo->tipo_verificacion)->toBe('TIPO_C')
        ->and($criterioPozo->pregunta_ciudadana)->toBeString()->not->toBeEmpty()
        ->and($criterioPozo->que_observar)->toBeString()->not->toBeEmpty();

    $eval = $this->engine->evaluarCriterio($criterioPozo, []);
    expect($eval['tipo_criterio'])->toBe('TIPO_C')
        ->and($eval['motivo'])->toBeString()->not->toBeEmpty();
});

it('permite leer y mutar variables de condicion fisica en el modelo Autoevaluacion mediante caracteristicas_declaradas', function () {
    $evaluacion = new Autoevaluacion([
        'caracteristicas_declaradas' => [
            'tiene_equipos_fritura' => true,
            'tiene_escaleras' => false,
        ],
    ]);

    expect($evaluacion->tiene_equipos_fritura)->toBeTrue()
        ->and($evaluacion->tiene_escaleras)->toBeFalse()
        ->and($evaluacion->tiene_estanterias_altas)->toBeNull();

    // Mutar mediante accesores
    $evaluacion->tiene_estanterias_altas = true;
    expect($evaluacion->tiene_estanterias_altas)->toBeTrue()
        ->and($evaluacion->caracteristicas_declaradas['tiene_estanterias_altas'])->toBeTrue();

    $evaluacion->tiene_equipos_fritura = null;
    expect($evaluacion->tiene_equipos_fritura)->toBeNull()
        ->and(array_key_exists('tiene_equipos_fritura', $evaluacion->caracteristicas_declaradas))->toBeFalse();
});

it('inicializa respuestas en autoevaluacion asignando NO_APLICA o POR_REVISAR segun determinismo normativo', function () {
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Boutique Huancayo',
        'sector_huancayo' => 'El Tambo',
        'area_m2' => 45,
        'pisos' => 1,
        'aforo' => 12,
        'usa_glp' => false, // Expresamente NO usa GLP -> NO_APLICA
        'caracteristicas_declaradas' => [
            'tiene_equipos_fritura' => false, // Expresamente NO equipos fritura -> NO_APLICA
            'tiene_escaleras' => true, // Expresamente TIENE escaleras -> PENDIENTE_ATENDER
            'tiene_estanterias_altas' => null, // Pendiente -> POR_REVISAR
        ],
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    $respuestas = $this->engine->inicializarRespuestas($evaluacion);

    // Debe generar respuestas para los 13 criterios activos
    expect($respuestas)->toHaveCount(13);

    // CRIT-10 (GLP) debe quedar registrado como NO_APLICA
    $criterioGlp = CriterioNormativo::where('codigo_criterio', 'CRIT-10')->firstOrFail();
    $respGlp = $respuestas->firstWhere('criterio_id', $criterioGlp->id);
    expect($respGlp)->not->toBeNull()
        ->and($respGlp->estado_respuesta)->toBe('NO_APLICA')
        ->and($respGlp->notas_ciudadano)->toBeString()->not->toBeEmpty();

    // CRIT-02A (Clase K) debe quedar registrado como NO_APLICA
    $criterioClaseK = CriterioNormativo::where('codigo_criterio', 'CRIT-02A')->firstOrFail();
    $respClaseK = $respuestas->firstWhere('criterio_id', $criterioClaseK->id);
    expect($respClaseK)->not->toBeNull()
        ->and($respClaseK->estado_respuesta)->toBe('NO_APLICA')
        ->and($respClaseK->notas_ciudadano)->toBeString()->not->toBeEmpty();

    // CRIT-11 (Escaleras) debe quedar registrado como PENDIENTE_ATENDER (porque es aplicable)
    $criterioEscaleras = CriterioNormativo::where('codigo_criterio', 'CRIT-11')->firstOrFail();
    $respEscaleras = $respuestas->firstWhere('criterio_id', $criterioEscaleras->id);
    expect($respEscaleras)->not->toBeNull()
        ->and($respEscaleras->estado_respuesta)->toBe('PENDIENTE_ATENDER');

    // CRIT-13 (Estanterías) debe quedar registrado como POR_REVISAR (porque requiere_informacion = true)
    $criterioEstanterias = CriterioNormativo::where('codigo_criterio', 'CRIT-13')->firstOrFail();
    $respEstanterias = $respuestas->firstWhere('criterio_id', $criterioEstanterias->id);
    expect($respEstanterias)->not->toBeNull()
        ->and($respEstanterias->estado_respuesta)->toBe('POR_REVISAR');

    // Ningún criterio suspendido debe tener respuesta inicializada
    $criteriosSuspendidosIds = CriterioNormativo::suspendidos()->pluck('id')->all();
    $respuestasSuspendidas = RespuestaAutoevaluacion::where('autoevaluacion_id', $evaluacion->id)
        ->whereIn('criterio_id', $criteriosSuspendidosIds)
        ->get();

    expect($respuestasSuspendidas)->toBeEmpty();
});

it('excluye totalmente los 6 criterios suspendidos de la evaluacion activa y garantiza que no generan NO_APLICA ni ninguna respuesta', function () {
    $activos = $this->engine->getCriteriosActivos();
    $suspendidos = $this->engine->getCriteriosSuspendidos();

    expect($activos)->toHaveCount(13)
        ->and($suspendidos)->toHaveCount(6);

    // 1. Evaluar aplicabilidad sobre un contexto completo
    $evaluaciones = $this->engine->evaluarAplicabilidad([
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    expect($evaluaciones)->toHaveCount(13);

    // 2. Ningún criterio suspendido puede figurar en el mapa de evaluaciones del motor
    foreach ($suspendidos as $criterioSuspendido) {
        $codigo = $criterioSuspendido->codigo_criterio;
        expect($evaluaciones->has($codigo))->toBeFalse();
        expect($this->engine->esCriterioEvaluable($criterioSuspendido))->toBeFalse();

        // Si se intenta evaluar directamente, el motor rechaza su evaluación con excepción
        expect(fn () => $this->engine->evaluarCriterio($criterioSuspendido, []))
            ->toThrow(InvalidArgumentException::class, "El criterio [{$codigo}] está suspendido normativamente");
    }

    // 3. Inicializar respuestas sobre una autoevaluación
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Comercio Auditoria Suspendidos',
        'sector_huancayo' => 'El Tambo',
        'usa_glp' => false,
        'caracteristicas_declaradas' => [
            'tiene_equipos_fritura' => false,
            'tiene_escaleras' => false,
            'tiene_estanterias_altas' => false,
        ],
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    $respuestas = $this->engine->inicializarRespuestas($evaluacion);
    expect($respuestas)->toHaveCount(13);

    // 4. Comprobar que los suspendidos NO generan NO_APLICA, NO generan POR_REVISAR, NO generan CUMPLE_DECLARADO, NO generan PENDIENTE_ATENDER
    $suspendidosIds = $suspendidos->pluck('id')->all();
    $respuestasSuspendidas = RespuestaAutoevaluacion::where('autoevaluacion_id', $evaluacion->id)
        ->whereIn('criterio_id', $suspendidosIds)
        ->get();

    expect($respuestasSuspendidas)->toBeEmpty();

    $estadosCanonicos = ['NO_APLICA', 'POR_REVISAR', 'CUMPLE_DECLARADO', 'PENDIENTE_ATENDER'];
    foreach ($estadosCanonicos as $estado) {
        $count = RespuestaAutoevaluacion::where('autoevaluacion_id', $evaluacion->id)
            ->whereIn('criterio_id', $suspendidosIds)
            ->where('estado_respuesta', $estado)
            ->count();
        expect($count)->toBe(0);
    }
});

it('genera el checklist dinamico correctamente con todas las condiciones aplicables', function () {
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Restaurante El Valle Completo',
        'sector_huancayo' => 'Huancayo Centro',
        'usa_glp' => true,
        'caracteristicas_declaradas' => [
            'tiene_equipos_fritura' => true,
            'tiene_escaleras' => true,
            'tiene_estanterias_altas' => true,
        ],
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    $checklist = $this->engine->generarChecklistDinamico($evaluacion);

    expect($checklist['autoevaluacion_id'])->toBe($evaluacion->id)
        ->and($checklist['resumen']['total_activos'])->toBe(13)
        ->and($checklist['resumen']['total_suspendidos'])->toBe(6)
        ->and($checklist['resumen']['criterios_aplicables'])->toBe(13)
        ->and($checklist['resumen']['criterios_no_aplican'])->toBe(0)
        ->and($checklist['resumen']['criterios_requieren_informacion'])->toBe(0)
        ->and($checklist['criterios'])->toHaveCount(13)
        ->and($checklist['no_aplican'])->toHaveCount(0)
        ->and($checklist['informacion_pendiente'])->toHaveCount(0);

    // Verificar que todas las opciones de respuesta ciudadana excluyan estrictamente NO_APLICA
    foreach ($checklist['criterios'] as $item) {
        expect($item['opciones_respuesta'])->toBe(['CUMPLE_DECLARADO', 'PENDIENTE_ATENDER', 'POR_REVISAR'])
            ->and($item['opciones_respuesta'])->not->toContain('NO_APLICA');
    }
});

it('genera el checklist dinamico clasificando criterios condicionales en no_aplican cuando se declaran false', function () {
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Consultorio Dental Sin Riesgos Especiales',
        'sector_huancayo' => 'San Carlos',
        'usa_glp' => false,
        'caracteristicas_declaradas' => [
            'tiene_equipos_fritura' => false,
            'tiene_escaleras' => false,
            'tiene_estanterias_altas' => false,
        ],
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    $checklist = $this->engine->generarChecklistDinamico($evaluacion);

    // 9 criterios base aplicables, 4 no aplicables (CRIT-02A, CRIT-10, CRIT-11, CRIT-13)
    expect($checklist['criterios'])->toHaveCount(9)
        ->and($checklist['no_aplican'])->toHaveCount(4)
        ->and($checklist['informacion_pendiente'])->toHaveCount(0)
        ->and($checklist['resumen']['criterios_aplicables'])->toBe(9)
        ->and($checklist['resumen']['criterios_no_aplican'])->toBe(4);

    $codigosNoAplican = collect($checklist['no_aplican'])->pluck('codigo')->all();
    expect($codigosNoAplican)->toContain('CRIT-02A', 'CRIT-10', 'CRIT-11', 'CRIT-13');

    foreach ($checklist['no_aplican'] as $noAplica) {
        expect($noAplica['estado'])->toBe('NO_APLICA')
            ->and($noAplica['motivo'])->toBeString()->not->toBeEmpty();
    }
});

it('genera el checklist dinamico clasificando criterios en informacion_pendiente cuando variables son null', function () {
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Comercio Nuevo Datos Incompletos',
        'sector_huancayo' => 'Chilca',
        'usa_glp' => null,
        'caracteristicas_declaradas' => [
            'tiene_equipos_fritura' => null,
            'tiene_escaleras' => null,
            'tiene_estanterias_altas' => null,
        ],
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    $checklist = $this->engine->generarChecklistDinamico($evaluacion);

    // 9 aplicables base, 0 no aplican, 4 requieren información
    expect($checklist['criterios'])->toHaveCount(9)
        ->and($checklist['no_aplican'])->toHaveCount(0)
        ->and($checklist['informacion_pendiente'])->toHaveCount(4)
        ->and($checklist['resumen']['criterios_requieren_informacion'])->toBe(4);

    $codigosPendientes = collect($checklist['informacion_pendiente'])->pluck('codigo')->all();
    expect($codigosPendientes)->toContain('CRIT-02A', 'CRIT-10', 'CRIT-11', 'CRIT-13');

    foreach ($checklist['informacion_pendiente'] as $item) {
        expect($item['requiere_informacion'])->toBeTrue()
            ->and($item['variable_faltante'])->not->toBeNull()
            ->and($item['mensaje'])->toBeString()->not->toBeEmpty();
    }
});

it('aisla los 6 criterios suspendidos de todas las categorias del checklist dinamico', function () {
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Verificacion Suspendidos Checklist',
        'sector_huancayo' => 'El Tambo',
        'usa_glp' => true,
        'caracteristicas_declaradas' => [
            'tiene_equipos_fritura' => true,
            'tiene_escaleras' => true,
            'tiene_estanterias_altas' => true,
        ],
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    $checklist = $this->engine->generarChecklistDinamico($evaluacion);
    $codigosSuspendidos = ['CRIT-09', 'CRIT-12', 'CRIT-14B', 'CRIT-15', 'CRIT-16', 'CRIT-17'];

    $todosCodigos = collect($checklist['criterios'])->pluck('codigo')
        ->merge(collect($checklist['no_aplican'])->pluck('codigo'))
        ->merge(collect($checklist['informacion_pendiente'])->pluck('codigo'))
        ->all();

    foreach ($codigosSuspendidos as $suspendido) {
        expect($todosCodigos)->not->toContain($suspendido);
    }

    expect($checklist['resumen']['total_suspendidos'])->toBe(6);
});

it('valida respuestas ciudadanas permitidas y prohibe estrictamente NO_APLICA', function () {
    expect($this->engine->esRespuestaCiudadanaValida('CUMPLE_DECLARADO'))->toBeTrue()
        ->and($this->engine->esRespuestaCiudadanaValida('PENDIENTE_ATENDER'))->toBeTrue()
        ->and($this->engine->esRespuestaCiudadanaValida('POR_REVISAR'))->toBeTrue()
        ->and($this->engine->esRespuestaCiudadanaValida('NO_APLICA'))->toBeFalse()
        ->and($this->engine->esRespuestaCiudadanaValida('OTRO_ESTADO'))->toBeFalse();
});

it('rechaza con excepcion al intentar registrar NO_APLICA como declaracion ciudadana', function () {
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Prueba Rechazo NO_APLICA',
        'sector_huancayo' => 'Huancayo Centro',
        'usa_glp' => true,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    expect(fn () => $this->engine->registrarRespuestaCiudadana(
        $evaluacion,
        'CRIT-01',
        'NO_APLICA'
    ))->toThrow(InvalidArgumentException::class, 'El estado NO_APLICA es asignado exclusivamente por el sistema');
});

it('rechaza registrar respuesta sobre criterios suspendidos o no aplicables', function () {
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Prueba Rechazo No Aplicable',
        'sector_huancayo' => 'Huancayo Centro',
        'usa_glp' => false, // GLP no aplica
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    // Intento en criterio suspendido
    expect(fn () => $this->engine->registrarRespuestaCiudadana(
        $evaluacion,
        'CRIT-17',
        'CUMPLE_DECLARADO'
    ))->toThrow(InvalidArgumentException::class, 'está suspendido normativamente');

    // Intento en criterio no aplicable al establecimiento (CRIT-10 requiere usa_glp = true)
    expect(fn () => $this->engine->registrarRespuestaCiudadana(
        $evaluacion,
        'CRIT-10',
        'CUMPLE_DECLARADO'
    ))->toThrow(InvalidArgumentException::class, 'no aplica a este establecimiento');
});

it('registra y actualiza correctamente declaraciones ciudadanas validas', function () {
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Prueba Registro Exitoso',
        'sector_huancayo' => 'Huancayo Centro',
        'usa_glp' => true,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ]);

    // Primera declaración: PENDIENTE_ATENDER
    $resp1 = $this->engine->registrarRespuestaCiudadana(
        $evaluacion,
        'CRIT-01',
        'PENDIENTE_ATENDER',
        'Extintor pendiente de recarga anual'
    );

    expect($resp1->estado_respuesta)->toBe('PENDIENTE_ATENDER')
        ->and($resp1->notas_ciudadano)->toBe('Extintor pendiente de recarga anual');

    // Actualización a CUMPLE_DECLARADO
    $resp2 = $this->engine->registrarRespuestaCiudadana(
        $evaluacion,
        'CRIT-01',
        'CUMPLE_DECLARADO',
        'Extintor recargado con certificado'
    );

    expect($resp2->id)->toBe($resp1->id)
        ->and($resp2->estado_respuesta)->toBe('CUMPLE_DECLARADO')
        ->and($resp2->notas_ciudadano)->toBe('Extintor recargado con certificado');
});
