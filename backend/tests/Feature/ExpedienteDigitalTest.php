<?php

use App\Models\Autoevaluacion;
use App\Models\DocumentoExpediente;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

function expedienteDe(User $user, array $datos = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $user->id,
        'nombre_comercio' => 'Perfumería Billy',
        'funcion_economica' => 'Comercio',
        'area_m2' => 60,
        'pisos' => 1,
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'AMARILLO',
        'porcentaje_cumplimiento' => 80.0,
        'detalle_checklist' => [],
    ], $datos));
}

test('riesgo bajo o medio: solo la declaración jurada es obligatoria', function () {
    $user = User::factory()->create();
    $evaluacion = expedienteDe($user);

    actingAs($user)->get(route('autoevaluacion.expediente_digital', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/ExpedienteDigital')
            ->where('modalidad', 'EX_POST')
            ->where('documentos', fn ($docs) => collect($docs)->where('obligatorio', true)->pluck('tipo')->all() === ['declaracion_jurada'])
        );
});

test('riesgo alto: se exigen los 6 documentos técnicos del art. 25.1', function () {
    $user = User::factory()->create();
    $evaluacion = expedienteDe($user, ['area_m2' => 900]);

    actingAs($user)->get(route('autoevaluacion.expediente_digital', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('modalidad', 'EX_ANTE')
            ->where('documentos', fn ($docs) => collect($docs)->where('obligatorio', true)->count() === 6)
        );
});

test('otra persona no puede ver el expediente', function () {
    $evaluacion = expedienteDe(User::factory()->create());

    actingAs(User::factory()->create())
        ->get(route('autoevaluacion.expediente_digital', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('subir un documento lo guarda en privado con su huella y reemplazarlo borra el anterior', function () {
    $user = User::factory()->create();
    $evaluacion = expedienteDe($user);
    $url = route('autoevaluacion.expediente_digital.store', ['uuid' => $evaluacion->uuid_trazabilidad, 'tipo' => 'declaracion_jurada']);

    actingAs($user)->post($url, ['archivo' => UploadedFile::fake()->create('dj.pdf', 120, 'application/pdf')])
        ->assertRedirect()->assertSessionHas('success');

    $primero = DocumentoExpediente::where('autoevaluacion_id', $evaluacion->id)->firstOrFail();
    expect($primero->hash_sha256)->toHaveLength(64)
        ->and(str_starts_with($primero->ruta, 'expedientes/'.$evaluacion->id.'/'))->toBeTrue()
        ->and(Storage::disk('local')->exists($primero->ruta))->toBeTrue();

    actingAs($user)->post($url, ['archivo' => UploadedFile::fake()->create('dj-firmada.jpg', 80, 'image/jpeg')])->assertRedirect();

    $segundo = DocumentoExpediente::where('autoevaluacion_id', $evaluacion->id)->sole();
    expect($segundo->nombre_original)->toBe('dj-firmada.jpg')
        ->and(Storage::disk('local')->exists($primero->ruta))->toBeFalse()
        ->and(Storage::disk('local')->exists($segundo->ruta))->toBeTrue();
});

test('se rechazan formatos no permitidos y tipos que no existen', function () {
    $user = User::factory()->create();
    $evaluacion = expedienteDe($user);

    actingAs($user)->post(
        route('autoevaluacion.expediente_digital.store', ['uuid' => $evaluacion->uuid_trazabilidad, 'tipo' => 'declaracion_jurada']),
        ['archivo' => UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream')],
    )->assertSessionHasErrors('archivo');

    actingAs($user)->post(
        route('autoevaluacion.expediente_digital.store', ['uuid' => $evaluacion->uuid_trazabilidad, 'tipo' => 'inventado']),
        ['archivo' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')],
    )->assertNotFound();

    expect(DocumentoExpediente::count())->toBe(0);
});

test('no se puede pedir el archivo de otro local con un UUID propio', function () {
    $user = User::factory()->create();
    $mia = expedienteDe($user);
    $ajena = expedienteDe($user, ['nombre_comercio' => 'Otro local']);
    $documento = DocumentoExpediente::create([
        'autoevaluacion_id' => $ajena->id, 'tipo' => 'declaracion_jurada', 'nombre_original' => 'x.pdf',
        'ruta' => 'expedientes/x.pdf', 'mime_type' => 'application/pdf', 'tamano_bytes' => 1, 'hash_sha256' => str_repeat('a', 64),
    ]);

    actingAs($user)
        ->get(route('autoevaluacion.expediente_digital.archivo', ['uuid' => $mia->uuid_trazabilidad, 'documento' => $documento->id]))
        ->assertNotFound();
});

test('el ZIP para revisión incluye los documentos numerados en orden', function () {
    $user = User::factory()->create();
    $evaluacion = expedienteDe($user, ['area_m2' => 900]);
    foreach (['plan_seguridad', 'croquis_ubicacion'] as $tipo) {
        actingAs($user)->post(
            route('autoevaluacion.expediente_digital.store', ['uuid' => $evaluacion->uuid_trazabilidad, 'tipo' => $tipo]),
            ['archivo' => UploadedFile::fake()->create("{$tipo}.pdf", 20, 'application/pdf')],
        );
    }

    $respuesta = actingAs($user)->get(route('autoevaluacion.expediente_digital.zip', ['uuid' => $evaluacion->uuid_trazabilidad]));
    $respuesta->assertOk();

    $zip = new ZipArchive;
    $zip->open($respuesta->baseResponse->getFile()->getPathname());
    $nombres = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $nombres[] = $zip->getNameIndex($i);
    }
    $zip->close();

    expect($nombres)->toBe(['01-croquis_ubicacion.pdf', '02-plan_seguridad.pdf']);
});
