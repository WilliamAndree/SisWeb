<?php

use App\Models\AnalisisEvidencia;
use App\Models\ResultadoAnalisisEvidencia;
use App\Models\Subsanacion;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\EspacioFixture;
use Tests\Support\GeminiFixture;

test('UX-CON-01 props iniciales conservan estado y listas del analisis persistido', function (string $estado) {
    $evaluacion = EspacioFixture::evaluacion();
    $evaluacion->detalle_checklist = [['codigo' => 'CRIT-01', 'estado' => 'PENDIENTE_ATENDER']];
    $evaluacion->save();
    $sub = Subsanacion::create([
        'autoevaluacion_id' => $evaluacion->id, 'codigo_item' => 'CRIT-01',
        'descripcion' => 'Caso sintético UX', 'estado' => 'PENDIENTE',
    ]);
    $analisis = AnalisisEvidencia::create([
        'uuid_analisis' => (string) Str::uuid(), 'autoevaluacion_id' => $evaluacion->id,
        'subsanacion_id' => $sub->id, 'estado_analisis' => $estado,
        'hash_evidencia_analizada' => hash('sha256', 'sintetico'), 'modelo_solicitado' => 'simulado',
    ]);
    ResultadoAnalisisEvidencia::create([
        'analisis_evidencia_id' => $analisis->id, 'criterio_codigo' => 'CRIT-01',
        'calidad_imagen' => 'OPTIMA', 'relevancia_evidencia' => 'DIRECTAMENTE_PERTINENTE',
        'nivel_incertidumbre' => 'BAJO', 'elementos_detectados' => GeminiFixture::datos()['detected_elements'],
        'observaciones_visuales' => ['Cilindro visible.'], 'no_observable' => ['Vigencia de la carga.'],
        'recomendaciones_captura' => ['Acercar la etiqueta.'], 'raw_payload_salida' => ['privado' => 'NO EXPONER'],
    ]);

    $this->actingAs($evaluacion->user)->get('/autoevaluacion/'.$evaluacion->uuid_trazabilidad.'/subsanar-items')
        ->assertInertia(fn (Assert $page) => $page->component('Evaluacion/SubsanacionDirecta')
            ->where('items.0.ultimo_analisis.estado', $estado)
            ->where('items.0.ultimo_analisis.resultado.visual_observations', ['Cilindro visible.'])
            ->where('items.0.ultimo_analisis.resultado.not_observable', ['Vigencia de la carga.'])
            ->where('items.0.ultimo_analisis.resultado.photo_improvement_recommendations', ['Acercar la etiqueta.'])
            ->missing('items.0.ultimo_analisis.resultado.raw_payload_salida'));

    $this->getJson('/autoevaluacion/'.$evaluacion->uuid_trazabilidad.'/analisis/'.$analisis->uuid_analisis.'/estado')
        ->assertJsonPath('uuid_analisis', $analisis->uuid_analisis)
        ->assertJsonPath('estado', $estado)
        ->assertJsonPath('resultado.observaciones_visuales', ['Cilindro visible.'])
        ->assertJsonMissingPath('resultado.raw_payload_salida');
    Http::assertNothingSent();
})->with(['COMPLETADO', 'REQUIERE_REVISION', 'EN_PROCESO']);
