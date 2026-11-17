<?php

use App\Models\Autoevaluacion;
use App\Models\DocumentoExpediente;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use function Pest\Laravel\actingAs;

function registroDe(User $user, array $datos = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(), 'user_id' => $user->id, 'nombre_comercio' => 'Local antiguo',
        'funcion_economica' => 'Comercio', 'estado' => Autoevaluacion::ESTADO_REGISTRADA, 'semaforo' => 'AMARILLO',
        'porcentaje_cumplimiento' => 70.0, 'detalle_checklist' => [],
    ], $datos));
}

test('el dueño elimina su registro antiguo y sus archivos', function () {
    $user = User::factory()->create();
    $registro = registroDe($user);
    Storage::disk('local')->put('expedientes/'.$registro->id.'/dj.pdf', 'pdf');
    DocumentoExpediente::create([
        'autoevaluacion_id' => $registro->id, 'tipo' => 'declaracion_jurada', 'nombre_original' => 'dj.pdf',
        'ruta' => 'expedientes/'.$registro->id.'/dj.pdf', 'mime_type' => 'application/pdf', 'tamano_bytes' => 3, 'hash_sha256' => str_repeat('a', 64),
    ]);

    actingAs($user)->delete(route('mis-autoevaluaciones.destroy', ['uuid' => $registro->uuid_trazabilidad]))
        ->assertRedirect(route('dashboard'))
        ->assertSessionHas('success');

    expect(Autoevaluacion::find($registro->id))->toBeNull()
        ->and(DocumentoExpediente::count())->toBe(0)
        ->and(Storage::disk('local')->exists('expedientes/'.$registro->id.'/dj.pdf'))->toBeFalse();
});

test('nadie más puede eliminar el registro', function () {
    $registro = registroDe(User::factory()->create());

    actingAs(User::factory()->create())
        ->delete(route('mis-autoevaluaciones.destroy', ['uuid' => $registro->uuid_trazabilidad]))
        ->assertNotFound();

    expect(Autoevaluacion::find($registro->id))->not->toBeNull();
});

test('sin sesión no se puede eliminar', function () {
    $registro = registroDe(User::factory()->create());

    $this->delete(route('mis-autoevaluaciones.destroy', ['uuid' => $registro->uuid_trazabilidad]))->assertRedirect();
    expect(Autoevaluacion::find($registro->id))->not->toBeNull();
});

test('las reevaluaciones del registro eliminado se conservan', function () {
    $user = User::factory()->create();
    $original = registroDe($user);
    $reevaluacion = registroDe($user, ['nombre_comercio' => 'Local actual', 'evaluacion_origen_id' => $original->id]);

    actingAs($user)->delete(route('mis-autoevaluaciones.destroy', ['uuid' => $original->uuid_trazabilidad]));

    expect($reevaluacion->fresh())->not->toBeNull()
        ->and($reevaluacion->fresh()->evaluacion_origen_id)->toBeNull();
});
