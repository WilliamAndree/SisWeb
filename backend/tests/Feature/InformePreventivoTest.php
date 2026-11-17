<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use App\Models\User;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\post;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

test('informe_muestra_datos_reales_y_no_null_en_evaluacion_parcial', function () {
    $user = User::factory()->create();

    $autoevaluacion = Autoevaluacion::create([
        'user_id' => $user->id,
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Librería Huancayo',
        'funcion_economica' => 'Venta de libros',
        'ruc' => '20601234567',
        'sector_huancayo' => 'El Tambo',
        'direccion' => 'Jr. Puno 450',
        'area_m2' => 85.5,
        'pisos' => 2,
        'aforo' => 20,
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'AMBAR',
        'porcentaje_cumplimiento' => 50.0,
        'detalle_checklist' => [],
        'caracteristicas_declaradas' => [
            'area_techada' => '85.5',
            'aforo_estimado' => 20,
            'numero_pisos' => 2,
        ],
    ]);

    $crit01 = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->firstOrFail();
    $crit05 = CriterioNormativo::where('codigo_criterio', 'CRIT-05')->firstOrFail();

    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $crit01->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
        'notas_ciudadano' => 'Extintores certificados',
    ]);

    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $crit05->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
        'notas_ciudadano' => 'Falta medición de pozo a tierra',
    ]);

    actingAs($user);

    get(route('autoevaluacion.informe', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.nombre_comercio', 'Librería Huancayo')
            ->where('autoevaluacion.area_techada', '85.5')
            ->where('autoevaluacion.aforo_estimado', 20)
            ->where('autoevaluacion.numero_pisos', 2)
            ->has('condiciones_evaluadas', 2)
            ->where('condiciones_evaluadas.0.codigo', 'CRIT-01')
            ->where('condiciones_evaluadas.0.estado_actual', ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO)
            ->where('condiciones_evaluadas.1.codigo', 'CRIT-05')
            ->where('condiciones_evaluadas.1.estado_actual', ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER)
            ->where('conteoEstados.total', 2)
            ->where('conteoEstados.cumple', 1)
            ->where('conteoEstados.no_cumple', 1)
        );
});

test('informe_actualiza_matriz_despues_de_subsanar', function () {
    $user = User::factory()->create();

    $autoevaluacion = Autoevaluacion::create([
        'user_id' => $user->id,
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Pollería Central',
        'funcion_economica' => 'Restaurante',
        'ruc' => '20789123456',
        'area_m2' => 120.0,
        'pisos' => 1,
        'aforo' => 45,
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'AMBAR',
        'porcentaje_cumplimiento' => 0.0,
        'detalle_checklist' => [],
    ]);

    $crit05 = CriterioNormativo::where('codigo_criterio', 'CRIT-05')->firstOrFail();

    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $autoevaluacion->id,
        'criterio_id' => $crit05->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
        'notas_ciudadano' => 'Pendiente protocolo de puesta a tierra',
    ]);

    actingAs($user);

    // Subsanar la condición
    post(route('autoevaluacion.declarar_subsanado', ['uuid' => $autoevaluacion->uuid_trazabilidad]), [
        'codigo_criterio' => 'CRIT-05',
        'nota' => 'Protocolo de medición de pozo a tierra emitido por ingeniero electricista colegiado.',
    ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    // Consultar vista del informe y verificar que refleje CUMPLE_DECLARADO y 100%
    get(route('autoevaluacion.informe', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.porcentaje_cumplimiento', fn ($p) => (float) $p === 100.0)
            ->where('autoevaluacion.semaforo', 'VERDE')
            ->where('condiciones_evaluadas.0.codigo', 'CRIT-05')
            ->where('condiciones_evaluadas.0.estado_actual', ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO)
            ->where('conteoEstados.cumple', 1)
            ->where('conteoEstados.no_cumple', 0)
        );
});
