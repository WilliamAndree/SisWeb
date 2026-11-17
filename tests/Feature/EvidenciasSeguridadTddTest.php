<?php

use App\Models\Autoevaluacion;
use App\Models\HistorialSubsanacion;
use App\Models\Subsanacion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\GeminiFixture;

function propietarioEvidencias3c(): Autoevaluacion
{
    $user = User::factory()->create();
    test()->actingAs($user);

    return Autoevaluacion::create([
        'user_id' => $user->id, 'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Local sintético 3C', 'estado' => 'INICIADA',
        'porcentaje_cumplimiento' => 0, 'semaforo' => 'PENDIENTE', 'detalle_checklist' => [],
    ]);
}

test('SUB-3C-01 conserva historial de creacion y edicion sin cambiar de estado', function () {
    $evaluacion = propietarioEvidencias3c();
    $url = route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]);
    $this->post($url, ['codigo_item' => 'CRIT-01', 'descripcion_subsanacion' => 'Nota inicial', 'estado' => 'EN_PROCESO'])->assertRedirect();
    $this->post($url, ['codigo_item' => 'CRIT-01', 'descripcion_subsanacion' => 'Nota corregida', 'estado' => 'EN_PROCESO'])->assertRedirect();

    expect(HistorialSubsanacion::orderBy('id')->pluck('comentario')->all())->toBe(['Nota inicial', 'Nota corregida']);
    $this->assertDatabaseCount('subsanaciones', 1);
});

test('EVID-3C-01 rechaza codigo con traversal antes de guardar archivo', function (string $codigo) {
    Storage::fake('local');
    $evaluacion = propietarioEvidencias3c();
    $this->postJson(route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'codigo_item' => $codigo, 'descripcion_subsanacion' => 'Documento sintético',
        'evidencia' => UploadedFile::fake()->createWithContent('foto.png', GeminiFixture::imagen()),
    ])->assertUnprocessable()->assertJsonValidationErrors('codigo_item');

    $this->assertDatabaseCount('subsanaciones', 0);
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
})->with(['../fuera', '..\\fuera', 'CRIT/01']);

test('EVID-3C-02 no descarga bytes adulterados aunque el titular tenga acceso', function () {
    Storage::fake('local');
    $evaluacion = propietarioEvidencias3c();
    Storage::disk('local')->put('evidencias/foto.png', 'contenido alterado');
    $subsanacion = Subsanacion::create([
        'autoevaluacion_id' => $evaluacion->id, 'codigo_item' => 'CRIT-01', 'descripcion' => 'Prueba',
        'estado' => 'PENDIENTE', 'evidencia_url' => 'evidencias/foto.png', 'hash_sha256' => hash('sha256', 'contenido original'),
    ]);

    $this->get(route('autoevaluacion.evidencia', ['uuid' => $evaluacion->uuid_trazabilidad, 'subsanacion' => $subsanacion->id]))->assertConflict();
});

test('EVID-3C-03 rechaza rutas almacenadas fuera del espacio de evidencias', function (string $path) {
    Storage::fake('local');
    Storage::disk('local')->put('privado.txt', 'centinela sintético');
    $evaluacion = propietarioEvidencias3c();
    $subsanacion = Subsanacion::create([
        'autoevaluacion_id' => $evaluacion->id, 'codigo_item' => 'CRIT-01', 'descripcion' => 'Prueba',
        'estado' => 'PENDIENTE', 'evidencia_url' => $path,
    ]);

    $this->get(route('autoevaluacion.evidencia', ['uuid' => $evaluacion->uuid_trazabilidad, 'subsanacion' => $subsanacion->id]))->assertNotFound();
    expect(Storage::disk('local')->get('privado.txt'))->toBe('centinela sintético');
})->with(['privado.txt', 'evidencias/../privado.txt']);

test('EVID-3C-04 rechaza archivo vacio antes de almacenarlo', function () {
    Storage::fake('local');
    $evaluacion = propietarioEvidencias3c();
    $this->postJson(route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'codigo_item' => 'CRIT-01', 'descripcion_subsanacion' => 'Documento vacío',
        'evidencia' => UploadedFile::fake()->createWithContent('vacio.pdf', ''),
    ])->assertUnprocessable()->assertJsonValidationErrors('evidencia');

    expect(Storage::disk('local')->allFiles())->toBeEmpty();
    $this->assertDatabaseCount('subsanaciones', 0);
});

test('EVID-3C-05 MIME real rechaza HTML con nombre y tipo declarado de fotografia', function () {
    Storage::fake('local');
    $evaluacion = propietarioEvidencias3c();
    $input = tmpfile();
    fwrite($input, '<html><script>alert(1)</script></html>');
    $archivo = new UploadedFile(stream_get_meta_data($input)['uri'], 'fotografia.jpg', 'image/jpeg', null, true);

    try {
        $this->postJson(route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]), [
            'codigo_item' => 'CRIT-01', 'descripcion_subsanacion' => 'Archivo falso', 'evidencia' => $archivo,
        ])->assertUnprocessable()->assertJsonValidationErrors('evidencia');
    } finally {
        fclose($input);
    }

    $this->assertDatabaseCount('subsanaciones', 0);
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
});

test('EVID-3C-06 conserva foto anterior y PDF documental con huellas reales e historial sin duplicar cambios identicos', function () {
    Storage::fake('local');
    $evaluacion = propietarioEvidencias3c();
    $url = route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]);
    $payload = ['codigo_item' => 'CRIT-01', 'descripcion_subsanacion' => 'Primera evidencia', 'estado' => 'PENDIENTE'];
    $this->post($url, $payload + ['evidencia' => UploadedFile::fake()->createWithContent('foto.png', GeminiFixture::imagen())])->assertRedirect();
    $registro = Subsanacion::firstOrFail();
    $anterior = $registro->evidencia_url;
    $pdf = "%PDF-1.4\nDocumento sintetico\n%%EOF";
    $payload['descripcion_subsanacion'] = 'Documento actualizado';
    $payload['estado'] = 'EN_PROCESO';
    $this->post($url, $payload + ['evidencia' => UploadedFile::fake()->createWithContent('documento.pdf', $pdf)])->assertRedirect();
    $this->post($url, $payload)->assertRedirect();

    $registro->refresh();
    expect(Storage::disk('local')->get($anterior))->toBe(GeminiFixture::imagen());
    expect(Storage::disk('local')->get($registro->evidencia_url))->toBe($pdf);
    expect($registro->hash_sha256)->toBe(hash('sha256', $pdf));
    expect($registro->historial()->count())->toBe(2);
    expect($registro->historial()->first()->hash_sha256)->toBe(hash('sha256', GeminiFixture::imagen()));
    $this->get(route('autoevaluacion.evidencia', ['uuid' => $evaluacion->uuid_trazabilidad, 'subsanacion' => $registro->id]))
        ->assertOk()->assertStreamedContent($pdf);
});

test('SUB-3C-02 rechaza estados invalidos y exceso de 5 MB sin persistir', function (array $extra, string $campo) {
    Storage::fake('local');
    $evaluacion = propietarioEvidencias3c();
    $this->postJson(route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]), array_merge([
        'codigo_item' => 'CRIT-01', 'descripcion_subsanacion' => 'Prueba negativa',
    ], $extra))->assertUnprocessable()->assertJsonValidationErrors($campo);

    $this->assertDatabaseCount('subsanaciones', 0);
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
})->with([
    'estado' => [['estado' => 'APROBADO_OFICIAL'], 'estado'],
    'limite archivo' => [fn () => ['evidencia' => UploadedFile::fake()->create('foto.png', 5121)], 'evidencia'],
]);

test('SUB-3C-03 historial conserva el texto de la observacion editada', function () {
    $evaluacion = propietarioEvidencias3c();
    $url = route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]);
    $payload = ['codigo_item' => 'CRIT-01', 'descripcion_subsanacion' => 'Misma descripción', 'estado' => 'EN_PROCESO'];
    $this->post($url, $payload + ['observacion' => 'Observación inicial'])->assertRedirect();
    $this->post($url, $payload + ['observacion' => 'Observación corregida'])->assertRedirect();

    expect(HistorialSubsanacion::latest('id')->firstOrFail()->comentario)->toContain('Observación corregida');
    expect(HistorialSubsanacion::oldest('id')->firstOrFail()->comentario)->toContain('Observación inicial');
});
