<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RecursoEducativo;
use App\Models\RespuestaAutoevaluacion;
use App\Services\ApplicabilityEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function payloadRecursoEducativo(array $overrides = []): array
{
    return array_merge([
        'criterio_normativo_id' => null,
        'titulo' => 'Extintor PQS: cómo verificar el manómetro y la operatividad',
        'descripcion_corta' => 'Video educativo que enseña a revisar la aguja del manómetro en la zona verde.',
        'tipo' => RecursoEducativo::TIPO_VIDEO,
        'url' => 'https://www.youtube.com/watch?v=HjS1NE54ap0',
        'fuente_autor' => 'CGBVP / Indeci',
        'duracion_estimada' => '3 min',
        'activo' => true,
        'fecha_revision' => '2026-09-26',
    ], $overrides);
}

it('permite asociar un recurso educativo a un criterio normativo mediante relacion belongsTo', function () {
    $criterio = CriterioNormativo::create([
        'codigo_criterio' => 'CRIT-01',
        'categoria' => 'Protección Contra Incendios',
        'titulo' => 'Extintor portátil adecuado y vigente',
        'norma_base' => 'NTP 350.043-1',
        'pregunta_ciudadana' => '¿Cuenta con extintor?',
        'activo' => true,
    ]);

    $recurso = RecursoEducativo::create(payloadRecursoEducativo([
        'criterio_normativo_id' => $criterio->id,
    ]));

    expect($recurso->criterioNormativo)->not->toBeNull()
        ->and($recurso->criterioNormativo->id)->toBe($criterio->id)
        ->and($recurso->criterioNormativo->codigo_criterio)->toBe('CRIT-01');
});

it('permite que un criterio normativo tenga multiples recursos educativos asociados (1:N)', function () {
    $criterio = CriterioNormativo::create([
        'codigo_criterio' => 'CRIT-01',
        'categoria' => 'Protección Contra Incendios',
        'titulo' => 'Extintor portátil adecuado y vigente',
        'norma_base' => 'NTP 350.043-1',
        'pregunta_ciudadana' => '¿Cuenta con extintor?',
        'activo' => true,
    ]);

    RecursoEducativo::create(payloadRecursoEducativo([
        'criterio_normativo_id' => $criterio->id,
        'titulo' => 'Video: Inspección de manómetro',
        'url' => 'https://www.youtube.com/watch?v=video1',
    ]));

    RecursoEducativo::create(payloadRecursoEducativo([
        'criterio_normativo_id' => $criterio->id,
        'titulo' => 'Guía: Clasificación de tipos de fuego',
        'tipo' => RecursoEducativo::TIPO_GUIA_DIGITAL,
        'url' => 'https://www.gob.pe/guia-extintores',
    ]));

    expect($criterio->recursosEducativos)->toHaveCount(2)
        ->and($criterio->recursosEducativos->pluck('titulo')->toArray())->toContain(
            'Video: Inspección de manómetro',
            'Guía: Clasificación de tipos de fuego'
        );
});

it('filtra solo los recursos educativos activos con scopeActivos', function () {
    RecursoEducativo::create(payloadRecursoEducativo([
        'titulo' => 'Recurso Activo',
        'url' => 'https://www.youtube.com/watch?v=activo',
        'activo' => true,
    ]));

    RecursoEducativo::create(payloadRecursoEducativo([
        'titulo' => 'Recurso Inactivo',
        'url' => 'https://www.youtube.com/watch?v=inactivo',
        'activo' => false,
    ]));

    $activos = RecursoEducativo::activos()->get();

    expect($activos)->toHaveCount(1)
        ->and($activos->first()->titulo)->toBe('Recurso Activo');
});

it('admite conceptualmente los tipos aprobados: VIDEO, GUIA_DIGITAL, ENLACE_EXTERNO', function () {
    expect(RecursoEducativo::TIPOS_PERMITIDOS)->toBe([
        'VIDEO',
        'GUIA_DIGITAL',
        'ENLACE_EXTERNO',
    ]);

    $video = RecursoEducativo::create(payloadRecursoEducativo([
        'tipo' => RecursoEducativo::TIPO_VIDEO,
        'url' => 'https://youtube.com/watch?v=v1',
    ]));

    $guia = RecursoEducativo::create(payloadRecursoEducativo([
        'tipo' => RecursoEducativo::TIPO_GUIA_DIGITAL,
        'url' => 'https://gob.pe/guia',
    ]));

    $enlace = RecursoEducativo::create(payloadRecursoEducativo([
        'tipo' => RecursoEducativo::TIPO_ENLACE_EXTERNO,
        'url' => 'https://indeci.gob.pe/orientacion',
    ]));

    expect($video->tipo)->toBe('VIDEO')
        ->and($guia->tipo)->toBe('GUIA_DIGITAL')
        ->and($enlace->tipo)->toBe('ENLACE_EXTERNO');
});

it('confirma que la tabla y modelo no dependen de campos obsoletos (codigo_normativo, base_legal, evidencia_sugerida)', function () {
    expect(Schema::hasColumn('recursos_educativos', 'codigo_normativo'))->toBeFalse()
        ->and(Schema::hasColumn('recursos_educativos', 'base_legal'))->toBeFalse()
        ->and(Schema::hasColumn('recursos_educativos', 'evidencia_sugerida'))->toBeFalse()
        ->and(Schema::hasColumn('recursos_educativos', 'criterio_normativo_id'))->toBeTrue()
        ->and(Schema::hasColumn('recursos_educativos', 'descripcion_corta'))->toBeTrue()
        ->and(Schema::hasColumn('recursos_educativos', 'fuente_autor'))->toBeTrue()
        ->and(Schema::hasColumn('recursos_educativos', 'duracion_estimada'))->toBeTrue()
        ->and(Schema::hasColumn('recursos_educativos', 'fecha_revision'))->toBeTrue();
});

it('valida la integridad referencial y permite recursos legacy no mapeados como nullable', function () {
    $recursoSinCriterio = RecursoEducativo::create(payloadRecursoEducativo([
        'criterio_normativo_id' => null,
        'titulo' => 'Recurso legacy en transición sin mapeo asignado',
    ]));

    expect($recursoSinCriterio->criterio_normativo_id)->toBeNull()
        ->and($recursoSinCriterio->criterioNormativo)->toBeNull();
});

it('garantiza que generarPayloadCanonico y el hash no incorporan recursos educativos', function () {
    $criterio = CriterioNormativo::create([
        'codigo_criterio' => 'CRIT-01',
        'categoria' => 'Protección Contra Incendios',
        'titulo' => 'Extintor portátil adecuado y vigente',
        'norma_base' => 'NTP 350.043-1',
        'pregunta_ciudadana' => '¿Cuenta con extintor?',
        'activo' => true,
    ]);

    $autoevaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'nombre_comercio' => 'Bodega San Carlos',
        'funcion_economica' => 'Comercio',
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'PENDIENTE',
        'detalle_checklist' => [],
        'caracteristicas_declaradas' => [
            'area_m2' => 50,
            'pisos' => 1,
            'aforo' => 10,
        ],
    ]);

    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $criterio->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
    ]);

    $service = new ApplicabilityEngineService;

    // 1. Payload inicial sin recursos educativos
    $payloadInicial = $service->generarPayloadCanonico($autoevaluacion);
    $hashInicial = $service->calcularHashIntegridad($autoevaluacion);

    // 2. Insertamos múltiples recursos educativos asociados al criterio
    RecursoEducativo::create(payloadRecursoEducativo([
        'criterio_normativo_id' => $criterio->id,
        'titulo' => 'Video Didáctico Sobre Manómetro',
        'tipo' => RecursoEducativo::TIPO_VIDEO,
        'url' => 'https://www.youtube.com/watch?v=recurso1',
    ]));

    RecursoEducativo::create(payloadRecursoEducativo([
        'criterio_normativo_id' => $criterio->id,
        'titulo' => 'Guía de Mantenimiento Preventivo',
        'tipo' => RecursoEducativo::TIPO_GUIA_DIGITAL,
        'url' => 'https://www.gob.pe/guia-preventiva',
    ]));

    // 3. Regeneramos el payload y hash: deben permanecer EXACTAMENTE idénticos
    $payloadPosterior = $service->generarPayloadCanonico($autoevaluacion);
    $hashPosterior = $service->calcularHashIntegridad($autoevaluacion);

    expect($payloadPosterior)->toEqual($payloadInicial)
        ->and($hashPosterior)->toBe($hashInicial)
        ->and(json_encode($payloadPosterior))->not->toContain('recurso')
        ->and(json_encode($payloadPosterior))->not->toContain('Video Didáctico Sobre Manómetro');
});
