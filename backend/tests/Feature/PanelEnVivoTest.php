<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use App\Models\Subsanacion;
use App\Models\User;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Panel en vivo para la demostración en clase: muestra los locales recientes y lo que
 * respondieron o corrigieron, calculado en el momento desde sus respuestas.
 */
beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
    $this->admin = User::factory()->create(['tipo_cuenta' => User::TIPO_ADMIN]);
});

function localEnVivo(string $nombre, ?User $dueno = null): Autoevaluacion
{
    return Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $dueno?->id,
        'codigo_acceso' => 'CHK-'.strtoupper(Str::random(6)),
        'nombre_comercio' => $nombre,
        'funcion_economica' => 'Comercio',
        'distrito' => 'El Tambo',
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'PENDIENTE',
        'total_condiciones_evaluadas' => 0,
        'total_cumple_declarado' => 0,
        'total_pendiente_atender' => 0,
        'total_por_revisar' => 0,
        'total_no_aplica' => 0,
        'detalle_checklist' => [],
    ]);
}

function panelEnVivo(): array
{
    $datos = null;
    test()->get(route('admin.en_vivo'))
        ->assertOk()
        ->assertInertia(function (Assert $page) use (&$datos) {
            $page->component('Admin/PanelEnVivo');
            $datos = $page->toArray()['props'];
        });

    return $datos;
}

test('solo la administración puede ver el panel en vivo', function () {
    $this->get(route('admin.en_vivo'))->assertRedirect();
    $this->actingAs(User::factory()->create(['tipo_cuenta' => User::TIPO_CLIENTE]))
        ->get(route('admin.en_vivo'))->assertForbidden();
});

test('cuenta en vivo lo respondido y lo corregido de cada local reciente', function () {
    $dueno = User::factory()->create(['name' => 'Rosa Quispe Lazo', 'tipo_cuenta' => User::TIPO_CLIENTE]);
    $local = localEnVivo('Minimarket Rosa', $dueno);
    [$a, $b, $c, $d] = CriterioNormativo::query()->orderBy('id')->take(4)->get();
    foreach ([[$a, 'CUMPLE_DECLARADO'], [$b, 'CUMPLE_DECLARADO'], [$c, 'PENDIENTE_ATENDER'], [$d, 'NO_APLICA']] as [$criterio, $estado]) {
        RespuestaAutoevaluacion::create(['autoevaluacion_id' => $local->id, 'criterio_id' => $criterio->id, 'estado_respuesta' => $estado]);
    }
    Subsanacion::create([
        'autoevaluacion_id' => $local->id,
        'codigo_item' => $a->codigo_criterio,
        'descripcion' => 'Compré el extintor y lo colgué.',
        'estado' => 'SUBSANADO_DECLARADO',
    ]);

    // Un local de hace dos días no aparece: el panel muestra la sesión actual.
    $antiguo = localEnVivo('Bodega de ayer');
    $antiguo->forceFill(['created_at' => now()->subDays(2)])->save();

    $this->actingAs($this->admin);
    $panel = panelEnVivo();

    expect($panel['locales'])->toHaveCount(1)
        ->and($panel['locales'][0])->toMatchArray([
            'nombre_comercio' => 'Minimarket Rosa',
            'responsable' => 'Rosa',
            'distrito' => 'El Tambo',
            'respondidas' => 3,
            'listas' => 2,
            'faltan' => 1,
            'corregidas' => 1,
        ])
        ->and($panel['totales'])->toMatchArray(['locales' => 1, 'listos' => 0, 'faltan' => 1, 'corregidas' => 1]);
});
