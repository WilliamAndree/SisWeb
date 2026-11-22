<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use Database\Seeders\DemoCuentasSeeder;
use Database\Seeders\DemoImpactoSeeder;
use Database\Seeders\NormativaCatalogSeeder;
use Database\Seeders\ProveedorRecursoSeeder;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Módulo de reportes de impacto: indicadores calculados con los registros de la base
 * de datos, filtros por fecha / distrito / giro / estado / origen y exportación a CSV.
 */
beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
    $this->seed(DemoImpactoSeeder::class);
    $this->admin = User::factory()->create(['tipo_cuenta' => User::TIPO_ADMIN]);
});

function reporte(array $filtros = []): array
{
    $datos = null;
    test()->get(route('admin.reportes', $filtros))
        ->assertOk()
        ->assertInertia(function (Assert $page) use (&$datos) {
            $page->component('Admin/Reportes');
            $datos = $page->toArray()['props'];
        });

    return $datos;
}

test('solo la administración puede ver los reportes', function () {
    $this->get(route('admin.reportes'))->assertRedirect();
    $this->actingAs(User::factory()->create(['tipo_cuenta' => User::TIPO_CLIENTE]))
        ->get(route('admin.reportes'))->assertForbidden();
});

test('los indicadores salen de los registros guardados, no de valores fijos', function () {
    $this->actingAs($this->admin);
    $esperados = Autoevaluacion::where('estado', Autoevaluacion::ESTADO_REGISTRADA)->get();

    $r = reporte(['desde' => now()->subYear()->toDateString()]);

    expect($r['indicadores']['locales'])->toBe($esperados->count())
        ->and($r['indicadores']['listos'])->toBe($esperados->where('semaforo', 'VERDE')->count())
        ->and($r['indicadores']['preparacion_actual'])->toBe(round((float) $esperados->avg('porcentaje_cumplimiento'), 1))
        // Corregir sube la preparación: después es mayor o igual que al evaluar.
        ->and($r['indicadores']['preparacion_actual'])->toBeGreaterThanOrEqual($r['indicadores']['preparacion_inicial'])
        ->and($r['indicadores']['corregidas'])->toBeGreaterThan(0)
        ->and(collect($r['por_mes'])->sum('evaluados'))->toBe($esperados->count())
        ->and($r['condiciones'])->not->toBeEmpty();
});

test('los filtros por distrito, estado y origen cambian el resultado', function () {
    $this->actingAs($this->admin);
    $desde = now()->subYear()->toDateString();

    $tambo = reporte(['desde' => $desde, 'distrito' => 'El Tambo']);
    $verdes = reporte(['desde' => $desde, 'estado' => 'VERDE']);
    $reales = reporte(['desde' => $desde, 'origen' => 'reales']);

    expect($tambo['indicadores']['locales'])->toBe(Autoevaluacion::where('distrito', 'El Tambo')->where('estado', 'REGISTRADA')->count())
        ->and(collect($tambo['por_distrito'])->pluck('distrito')->all())->toBe(['El Tambo'])
        ->and($verdes['indicadores']['locales'])->toBe($verdes['indicadores']['listos'])
        // Sin usuarios reales en esta base de prueba: el filtro excluye los DEMO-.
        ->and($reales['indicadores']['locales'])->toBe(0);
});

test('el reporte se descarga en CSV con una fila por local', function () {
    $this->actingAs($this->admin);

    $respuesta = $this->get(route('admin.reportes.exportar', ['desde' => now()->subYear()->toDateString(), 'distrito' => 'Chilca']));

    $respuesta->assertOk()->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    $lineas = array_filter(explode("\n", trim($respuesta->streamedContent())));
    expect(count($lineas) - 1)->toBe(Autoevaluacion::where('distrito', 'Chilca')->where('estado', 'REGISTRADA')->count())
        ->and($lineas[0])->toContain('Preparación al evaluar (%)');
});

test('los contactos por WhatsApp respetan el filtro de origen (cuentas de demostración aparte)', function () {
    $this->seed(ProveedorRecursoSeeder::class);
    $this->seed(DemoCuentasSeeder::class);
    $this->actingAs($this->admin);
    $desde = now()->subYear()->toDateString();

    $todos = reporte(['desde' => $desde])['indicadores']['contactos_whatsapp'];
    $demo = reporte(['desde' => $desde, 'origen' => 'demo'])['indicadores']['contactos_whatsapp'];
    $reales = reporte(['desde' => $desde, 'origen' => 'reales'])['indicadores']['contactos_whatsapp'];

    expect($todos)->toBeGreaterThan(0)
        ->and($demo)->toBe($todos)
        ->and($reales)->toBe(0);
});
