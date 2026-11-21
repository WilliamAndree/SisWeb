<?php

use App\Models\Autoevaluacion;
use App\Models\Subsanacion;
use App\Models\User;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\NormativaCatalogSeeder;
use Database\Seeders\ProveedorRecursoSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Recorrido completo de un emprendedor nuevo, paso a paso y por las rutas reales:
 * crea su cuenta, evalúa su local, deja dos cosas pendientes, las corrige por su cuenta
 * (una solo escribiendo qué hizo, otra con una foto), arma su expediente y descarga sus
 * documentos. En cada paso se comprueba lo que queda guardado en la base de datos.
 */
const FOTO_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

beforeEach(function () {
    Storage::fake('local');
    $this->seed(NormativaCatalogSeeder::class);
    $this->seed(ProveedorRecursoSeeder::class);
});

test('un emprendedor nuevo evalúa su local, corrige lo que falta por su cuenta y llega al 100 %', function () {
    // 1. Crea su cuenta de emprendedor.
    $this->post('/registro', [
        'tipo_cuenta' => 'cliente',
        'name' => 'Rosa Huamán',
        'email' => 'rosa.bodega@ejemplo.pe',
        'telefono' => '964123456',
        'password' => 'ClaveSegura2026!',
        'password_confirmation' => 'ClaveSegura2026!',
    ])->assertSessionHasNoErrors();
    $usuario = User::where('email', 'rosa.bodega@ejemplo.pe')->firstOrFail();
    expect($usuario->tipo_cuenta)->toBe('cliente');
    $this->actingAs($usuario);

    // 2. Registra los datos de su local.
    $this->post(route('autoevaluacion.store'), [
        'nombre_comercio' => 'Bodega Doña Rosa',
        'funcion_economica' => 'Comercio',
        'ruc' => '10456789123',
        'direccion' => 'Jr. Puno 245, Huancayo',
        'area_m2' => 70,
        'pisos' => 1,
        'aforo' => 12,
        'usa_glp' => false,
        'tiene_equipos_fritura' => false,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => true,
    ])->assertSessionHasNoErrors();
    $evaluacion = Autoevaluacion::where('user_id', $usuario->id)->latest('id')->firstOrFail();
    $uuid = $evaluacion->uuid_trazabilidad;

    // 3. Responde la lista: todo cumple salvo las dos primeras condiciones.
    $criterios = app(ApplicabilityEngineService::class)->generarChecklistDinamico($evaluacion)['criterios'];
    expect(count($criterios))->toBeGreaterThan(2);
    $faltan = [$criterios[0]['codigo'], $criterios[1]['codigo']];
    $respuestas = collect($criterios)->map(fn (array $criterio): array => [
        'codigo' => $criterio['codigo'],
        'estado' => in_array($criterio['codigo'], $faltan, true) ? 'PENDIENTE_ATENDER' : 'CUMPLE_DECLARADO',
    ])->all();
    $this->postJson("/autoevaluacion/{$uuid}/checklist", ['respuestas' => $respuestas])->assertOk();

    // 4. Guarda (registra) su resultado.
    $this->postJson("/autoevaluacion/{$uuid}/finalizar")->assertOk();
    $evaluacion->refresh();
    expect($evaluacion->estado)->toBe(Autoevaluacion::ESTADO_REGISTRADA)
        ->and($evaluacion->total_pendiente_atender)->toBe(2)
        ->and($evaluacion->hash_integridad)->toMatch('/^[a-f0-9]{64}$/');
    $hashSellado = $evaluacion->hash_integridad;

    // 5. Su resumen muestra las 2 cosas que le faltan, con fecha válida y su código corto.
    $this->get(route('autoevaluacion.resumen', ['uuid' => $uuid]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resumen')
            ->where('resumen.total_pendiente_atender', 2)
            ->has('pendiente_atender', 2)
            ->where('corregidas', 0)
            ->where('autoevaluacion.codigo_acceso', $evaluacion->codigo_acceso)
            ->where('autoevaluacion.registrada_at', fn (string $fecha) => (bool) preg_match('#^\d{2}/\d{2}/\d{4} \d{2}:\d{2}$#', $fecha)));

    // 6. Corrige la primera por su cuenta, solo escribiendo qué hizo (no compró en CheckITSE).
    $this->post(route('autoevaluacion.subsanacion.store', ['uuid' => $uuid]), [
        'codigo_item' => $faltan[0],
        'descripcion_subsanacion' => 'Lo compré en una ferretería del centro y ya está instalado.',
        'estado' => 'SUBSANADO_DECLARADO',
    ])->assertRedirect();
    expect($evaluacion->fresh()->total_pendiente_atender)->toBe(1);

    // 7. Corrige la segunda con una foto como prueba.
    $this->post(route('autoevaluacion.subsanacion.store', ['uuid' => $uuid]), [
        'codigo_item' => $faltan[1],
        'descripcion_subsanacion' => 'Adjunto la foto de cómo quedó.',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia' => UploadedFile::fake()->createWithContent('arreglo.png', base64_decode(FOTO_PNG)),
    ])->assertRedirect();

    // 8. En la base de datos todo queda ordenado: 2 correcciones, 1 con foto, historial y totales al día.
    $evaluacion->refresh();
    $correcciones = Subsanacion::where('autoevaluacion_id', $evaluacion->id)->get();
    expect($correcciones)->toHaveCount(2)
        ->and($correcciones->every(fn (Subsanacion $s) => $s->estado === 'SUBSANADO_DECLARADO'))->toBeTrue()
        ->and($correcciones->whereNotNull('evidencia_url'))->toHaveCount(1)
        ->and($evaluacion->total_pendiente_atender)->toBe(0)
        ->and((float) $evaluacion->porcentaje_cumplimiento)->toBe(100.0)
        ->and($evaluacion->semaforo)->toBe('VERDE')
        // Lo que declaró al inicio sigue sellado, sin cambios.
        ->and($evaluacion->hash_integridad)->toBe($hashSellado);
    Storage::disk('local')->assertExists($correcciones->whereNotNull('evidencia_url')->first()->evidencia_url);

    // 9. Su resumen y su panel reflejan el 100 % y cuántas cosas corrigió.
    $this->get(route('autoevaluacion.resumen', ['uuid' => $uuid]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('resumen.total_pendiente_atender', 0)
            ->where('corregidas', 2));
    $this->get(route('dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('Dashboard/Dashboard')
        ->where('records.0.porcentaje_cumplimiento', 100));

    // 10. Arma su expediente: sube su declaración jurada firmada.
    $this->post(route('autoevaluacion.expediente_digital.store', ['uuid' => $uuid, 'tipo' => 'declaracion_jurada']), [
        'archivo' => UploadedFile::fake()->createWithContent('anexo4-firmado.png', base64_decode(FOTO_PNG)),
    ])->assertSessionHasNoErrors();

    // 11. Descarga su declaración jurada (lista sus condiciones) y su informe.
    $this->get(route('autoevaluacion.anexo', ['uuid' => $uuid]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/AnexoOficial')
            ->has('condiciones', count($criterios))
            ->where('conteo.no_cumple', 0)
            ->where('codigoDocumento', $evaluacion->codigo_acceso));
    $this->get(route('autoevaluacion.informe', ['uuid' => $uuid]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('resumen.subsanadas_declaradas', 2)
            ->has('matrizSubsanaciones', 2));
});
