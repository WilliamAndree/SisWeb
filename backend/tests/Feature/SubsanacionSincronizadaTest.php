<?php

use App\Models\Autoevaluacion;
use App\Models\RespuestaAutoevaluacion;
use App\Models\Subsanacion;
use App\Models\User;
use Database\Seeders\DemoWalkthroughSeeder;
use Database\Seeders\NormativaCatalogSeeder;
use Database\Seeders\ProveedorRecursoSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\artisan;

/** Imagen PNG de 1×1 px (no requiere la extensión GD). */
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

/**
 * El emprendedor puede corregir lo que le falta comprando a un aliado o por su cuenta,
 * y lo demuestra con una foto o con una descripción. La corrección debe verse en su
 * resumen, su panel y su informe; y si la deshace, la condición vuelve a estar pendiente.
 * Caso de prueba: Doña María (Minimarket El Carmen), registrada con 2 condiciones pendientes.
 */
beforeEach(function () {
    Storage::fake('local');
    $this->seed(NormativaCatalogSeeder::class);
    $this->seed(ProveedorRecursoSeeder::class);
    $this->seed(DemoWalkthroughSeeder::class);

    $this->maria = User::where('email', 'donamaria@huancayo.pe')->firstOrFail();
    $this->evaluacion = Autoevaluacion::where('user_id', $this->maria->id)->firstOrFail();
    $this->pendientes = RespuestaAutoevaluacion::query()
        ->where('autoevaluacion_id', $this->evaluacion->id)
        ->where('estado_respuesta', 'PENDIENTE_ATENDER')
        ->with('criterioNormativo')
        ->get()
        ->map(fn (RespuestaAutoevaluacion $respuesta) => $respuesta->criterioNormativo->codigo_criterio)
        ->values();
});

function corregir(string $uuid, string $codigo, string $estado, ?UploadedFile $foto = null): void
{
    test()->post(route('autoevaluacion.subsanacion.store', ['uuid' => $uuid]), array_filter([
        'codigo_item' => $codigo,
        'descripcion_subsanacion' => 'Lo compré por mi cuenta en una ferretería del centro.',
        'estado' => $estado,
        'evidencia' => $foto,
    ]))->assertRedirect();
}

function pendientesEnResumen(string $uuid): int
{
    $total = null;
    test()->get(route('autoevaluacion.resumen', ['uuid' => $uuid]))
        ->assertOk()
        ->assertInertia(function (Assert $page) use (&$total) {
            $page->component('Evaluacion/Resumen');
            $total = $page->toArray()['props']['resumen']['total_pendiente_atender'];
        });

    return (int) $total;
}

test('una corrección declarada solo con texto (sin comprar en CheckITSE) cuenta como lista en el resumen y en el panel', function () {
    expect($this->pendientes)->toHaveCount(2);
    $hashOriginal = $this->evaluacion->hash_integridad;
    $this->actingAs($this->maria);

    corregir($this->evaluacion->uuid_trazabilidad, $this->pendientes[0], 'SUBSANADO_DECLARADO');

    expect(pendientesEnResumen($this->evaluacion->uuid_trazabilidad))->toBe(1);
    $evaluacion = $this->evaluacion->fresh();
    expect($evaluacion->total_pendiente_atender)->toBe(1)
        // La foto sellada del registro no cambia: sigue probando lo que se declaró al inicio.
        ->and($evaluacion->hash_integridad)->toBe($hashOriginal);
});

test('con una foto como prueba, al corregir todo el local queda listo', function () {
    $this->actingAs($this->maria);

    corregir($this->evaluacion->uuid_trazabilidad, $this->pendientes[0], 'SUBSANADO_DECLARADO');
    corregir($this->evaluacion->uuid_trazabilidad, $this->pendientes[1], 'SUBSANADO_DECLARADO', UploadedFile::fake()->createWithContent('extintor.png', base64_decode(PNG_1PX)));

    expect(pendientesEnResumen($this->evaluacion->uuid_trazabilidad))->toBe(0);
    $evaluacion = $this->evaluacion->fresh();
    expect($evaluacion->total_pendiente_atender)->toBe(0)
        ->and((float) $evaluacion->porcentaje_cumplimiento)->toBe(100.0)
        ->and(Subsanacion::where('autoevaluacion_id', $evaluacion->id)->whereNotNull('evidencia_url')->count())->toBe(1);
});

test('si la corrección vuelve a "en proceso", la condición vuelve a estar pendiente', function () {
    $this->actingAs($this->maria);
    $codigo = $this->pendientes[0];

    corregir($this->evaluacion->uuid_trazabilidad, $codigo, 'SUBSANADO_DECLARADO');
    corregir($this->evaluacion->uuid_trazabilidad, $codigo, 'EN_PROCESO');

    expect(pendientesEnResumen($this->evaluacion->uuid_trazabilidad))->toBe(2)
        ->and($this->evaluacion->fresh()->total_pendiente_atender)->toBe(2);
});

test('el comando corrige las cuentas que ya tenían correcciones guardadas sin reflejar', function () {
    // Así quedaban los datos antes: la corrección guardada, pero la respuesta pendiente.
    Subsanacion::create([
        'autoevaluacion_id' => $this->evaluacion->id,
        'codigo_item' => $this->pendientes[0],
        'descripcion' => 'Compré el extintor a otro proveedor.',
        'estado' => 'SUBSANADO_DECLARADO',
        'fecha_subsanacion' => now(),
    ]);

    artisan('checkitse:sincronizar-subsanaciones')->assertSuccessful();
    artisan('checkitse:sincronizar-subsanaciones')->assertSuccessful(); // Idempotente.

    $this->actingAs($this->maria);
    expect(pendientesEnResumen($this->evaluacion->uuid_trazabilidad))->toBe(1)
        ->and($this->evaluacion->fresh()->total_pendiente_atender)->toBe(1);
});

test('lo ya corregido sigue visible en "Corregir lo que falta", marcado como listo', function () {
    $this->actingAs($this->maria);
    corregir($this->evaluacion->uuid_trazabilidad, $this->pendientes[0], 'SUBSANADO_DECLARADO');

    $this->get(route('autoevaluacion.subsanar_items', ['uuid' => $this->evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/SubsanacionDirecta')
            ->has('items', 2)
            ->where('items', fn ($items) => collect($items)->firstWhere('codigo', $this->pendientes[0])['estado'] === 'CUMPLE_DECLARADO'
                && collect($items)->firstWhere('codigo', $this->pendientes[1])['estado'] === 'PENDIENTE_ATENDER')
        );
});
