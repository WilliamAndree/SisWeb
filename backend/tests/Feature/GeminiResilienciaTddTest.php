<?php

use App\Jobs\AnalisisEvidenciaJob;
use App\Models\AnalisisEvidencia;
use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\Subsanacion;
use App\Models\User;
use App\Services\AI\AnalisisEvidenciaService;
use App\Services\AI\GeminiMultimodalService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Contracts\Queue\Job;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Sleep;
use Illuminate\Support\Str;
use Tests\Support\GeminiFixture;

function analisisSintetico3c(): AnalisisEvidencia
{
    test()->seed(NormativaCatalogSeeder::class);
    Storage::fake('local');
    Queue::fake([AnalisisEvidenciaJob::class]);
    $evaluacion = Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(), 'nombre_comercio' => 'Local sintético IA',
        'porcentaje_cumplimiento' => 0, 'semaforo' => 'PENDIENTE', 'detalle_checklist' => [],
    ]);
    $image = UploadedFile::fake()->createWithContent('sintetica.png', GeminiFixture::imagen());
    $path = Storage::disk('local')->putFileAs('evidencias', $image, 'sintetica.png');
    $subsanacion = Subsanacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => CriterioNormativo::where('codigo_criterio', 'CRIT-01')->value('id'),
        'codigo_item' => 'CRIT-01', 'descripcion' => 'Prueba sintética', 'estado' => 'PENDIENTE',
        'evidencia_url' => $path, 'hash_sha256' => hash('sha256', Storage::disk('local')->get($path)),
    ]);
    $analisis = app(AnalisisEvidenciaService::class)->solicitarAnalisis($evaluacion, $subsanacion);
    Queue::assertPushed(AnalisisEvidenciaJob::class, 1);

    return $analisis;
}

test('IA-3C-02 no acredita respuestas de un criterio diferente al solicitado', function () {
    $analisis = analisisSintetico3c();
    Http::fake(['generativelanguage.googleapis.com/*' => Http::response(GeminiFixture::respuesta(['criterion_code' => 'CRIT-10']))]);

    expect(fn () => app(AnalisisEvidenciaService::class)->procesarAnalisis($analisis))->toThrow(InvalidArgumentException::class);

    $this->assertDatabaseCount('resultados_analisis_evidencias', 0);
    expect($analisis->fresh()->estado_analisis)->toBe('FALLIDO');
    Http::assertSentCount(1);
});

test('IA-3C-03 incertidumbre alta o relevancia indeterminada requiere revision', function (array $override) {
    $analisis = analisisSintetico3c();
    Http::fake(['generativelanguage.googleapis.com/*' => Http::response(GeminiFixture::respuesta($override))]);

    $result = app(AnalisisEvidenciaService::class)->procesarAnalisis($analisis);

    expect($result->estado_analisis)->toBe('REQUIERE_REVISION');
    Http::assertSentCount(1);
})->with(['incertidumbre alta' => [['uncertainty_level' => 'ALTO']], 'no determinable' => [['evidence_relevance' => 'INDETERMINADA']]]);

test('IA-3C-04 evidencia vacia o corrupta no se encola para analisis', function (string $bytes) {
    $analisis = analisisSintetico3c();
    $subsanacion = $analisis->subsanacion;
    Storage::disk('local')->put($subsanacion->evidencia_url, $bytes);
    $subsanacion->update(['hash_sha256' => hash('sha256', $bytes)]);

    expect(fn () => app(AnalisisEvidenciaService::class)->solicitarAnalisis($analisis->autoevaluacion, $subsanacion))
        ->toThrow(InvalidArgumentException::class);

    $this->assertDatabaseCount('analisis_evidencias', 1);
    Http::assertNothingSent();
})->with(['vacia' => [''], 'cabecera incompleta' => ["\x89PNG\r\n\x1a\n"]]);

test('IA-3C-05 job puede reintentar un fallo transitorio y conservar trazabilidad', function () {
    $analisis = analisisSintetico3c();
    Http::fakeSequence('generativelanguage.googleapis.com/*')->push(['error' => ['message' => 'Fallo sintético']], 503)->push(GeminiFixture::respuesta());
    $service = app(AnalisisEvidenciaService::class);
    $job = new AnalisisEvidenciaJob($analisis->id);
    $queueJob = Mockery::mock(Job::class);
    $queueJob->shouldReceive('attempts')->andReturn(1, 2);
    $job->setJob($queueJob);
    expect(fn () => $job->handle($service))->toThrow(RuntimeException::class);

    $job->handle($service);

    expect($analisis->fresh()->estado_analisis)->toBe('COMPLETADO');
    expect($analisis->fresh()->intentos)->toBe(2);
    Http::assertSentCount(2);
});

test('IA-3C-07 rechaza JSON generado demasiado extenso antes de procesarlo', function () {
    Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['candidates' => [['content' => ['parts' => [[
        'text' => json_encode(['dato' => str_repeat('x', 70000)]),
    ]]]]]])]);

    expect(fn () => (new GeminiMultimodalService(apiKey: 'testing', maxRetries: 0))->analizarImagen('c2ludGV0aWNh', 'image/png', ['codigo' => 'CRIT-01']))
        ->toThrow(RuntimeException::class);
    Http::assertSentCount(1);
});

test('IA-3C-10 errores HTTP simulados no persisten un resultado favorable', function (int $status) {
    $analisis = analisisSintetico3c();
    Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['error' => ['message' => 'Error sintético']], $status)]);

    expect(fn () => app(AnalisisEvidenciaService::class)->procesarAnalisis($analisis))->toThrow(RuntimeException::class);

    expect($analisis->fresh()->estado_analisis)->toBe('FALLIDO');
    $this->assertDatabaseCount('resultados_analisis_evidencias', 0);
    Http::assertSentCount(1);
})->with([401, 403, 429, 500, 503]);

test('IA-3C-11 respuestas vacias o JSON roto no completan el analisis', function (array $respuesta) {
    $analisis = analisisSintetico3c();
    Http::fake(['generativelanguage.googleapis.com/*' => Http::response($respuesta)]);

    expect(fn () => app(AnalisisEvidenciaService::class)->procesarAnalisis($analisis))->toThrow(RuntimeException::class);

    expect($analisis->fresh()->estado_analisis)->toBe('FALLIDO');
    $this->assertDatabaseCount('resultados_analisis_evidencias', 0);
    Http::assertSentCount(1);
})->with([
    'sin candidatos' => [[]],
    'texto vacio' => [['candidates' => [['content' => ['parts' => [['text' => '']]]]]]],
    'JSON roto' => [['candidates' => [['content' => ['parts' => [['text' => '{roto']]]]]]],
]);

test('IA-3C-12 timeout simulado registra fallo sin resultado', function () {
    $analisis = analisisSintetico3c();
    Http::fake(['generativelanguage.googleapis.com/*' => Http::failedConnection('Timeout sintético')]);

    expect(fn () => app(AnalisisEvidenciaService::class)->procesarAnalisis($analisis))->toThrow(RuntimeException::class);

    expect($analisis->fresh()->estado_analisis)->toBe('FALLIDO');
    $this->assertDatabaseCount('resultados_analisis_evidencias', 0);
    Http::assertSentCount(1);
});

test('IA-3C-13 reintenta HTTP transitorio simulado con espera falsa y timeout configurado', function (int $status) {
    Sleep::fake();
    Http::fakeSequence('generativelanguage.googleapis.com/*')->push(['error' => ['message' => 'Temporal']], $status)->push(GeminiFixture::respuesta());

    try {
        $result = (new GeminiMultimodalService(apiKey: 'testing', timeout: 2, maxRetries: 2))
            ->analizarImagen(base64_encode(GeminiFixture::imagen()), 'image/png', ['codigo' => 'CRIT-01']);

        expect($result['datos']['criterion_code'])->toBe('CRIT-01');
        Http::assertSentCount(2);
    } finally {
        Sleep::fake(false);
    }
})->with([429, 503]);

test('IA-3C-14 job no repite un analisis terminal', function (string $estado) {
    $analisis = analisisSintetico3c();
    $analisis->update(['estado_analisis' => $estado]);

    (new AnalisisEvidenciaJob($analisis->id))->handle(app(AnalisisEvidenciaService::class));

    expect($analisis->fresh()->estado_analisis)->toBe($estado);
    expect($analisis->fresh()->intentos)->toBe(0);
    Http::assertNothingSent();
})->with(['COMPLETADO', 'REQUIERE_REVISION', 'FALLIDO']);

test('IA-3C-15 estado publico omite payload crudo sin perder la trazabilidad privada', function () {
    $analisis = analisisSintetico3c();
    $user = User::factory()->create();
    $analisis->autoevaluacion->update(['user_id' => $user->id]);
    Http::fake(['generativelanguage.googleapis.com/*' => Http::response(GeminiFixture::respuesta(['pedagogical_summary' => 'Equipo certificado']))]);
    $service = app(AnalisisEvidenciaService::class);
    $service->procesarAnalisis($analisis);

    $this->actingAs($user)->getJson(route('autoevaluacion.analisis.estado', [
        'uuid' => $analisis->autoevaluacion->uuid_trazabilidad, 'analisisUuid' => $analisis->uuid_analisis,
    ]))->assertOk()->assertJsonPath('resultado.resumen_pedagogico', 'Equipo declarado')->assertJsonMissingPath('resultado.raw_payload_salida');

    expect($analisis->fresh()->resultado->raw_payload_salida['pedagogical_summary'])->toBe('Equipo certificado');
    Http::assertSentCount(1);
});
