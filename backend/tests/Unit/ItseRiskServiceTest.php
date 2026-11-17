<?php

namespace Tests\Unit;

use App\Services\ItseRiskService;
use PHPUnit\Framework\TestCase;

class ItseRiskServiceTest extends TestCase
{
    private ItseRiskService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new ItseRiskService;
    }

    private function item(string $codigo, bool $cumple, string $estado, bool $critico): array
    {
        return [
            'codigo' => $codigo,
            'cumple' => $cumple,
            'estado' => $estado,
            'es_critico' => $critico,
        ];
    }

    // ---------------------------------------------------------------------
    // Catálogo de checklist
    // ---------------------------------------------------------------------

    public function test_catalogo_checklist_es_arreglo_no_vacio(): void
    {
        $catalogo = $this->service->getCatalogoChecklist();

        $this->assertIsArray($catalogo);
        $this->assertNotEmpty($catalogo);
    }

    public function test_catalogo_checklist_cada_item_tiene_claves_requeridas(): void
    {
        $catalogo = $this->service->getCatalogoChecklist();

        foreach ($catalogo as $item) {
            $this->assertArrayHasKey('codigo', $item);
            $this->assertArrayHasKey('nombre', $item);
            $this->assertArrayHasKey('es_critico', $item);
            $this->assertArrayHasKey('norma', $item);
            $this->assertNotEmpty($item['codigo']);
            $this->assertNotEmpty($item['nombre']);
            $this->assertNotEmpty($item['norma']);
        }
    }

    public function test_catalogo_checklist_codigos_unicos(): void
    {
        $codigos = array_column($this->service->getCatalogoChecklist(), 'codigo');

        $this->assertSame(count($codigos), count(array_unique($codigos)));
    }

    public function test_catalogo_checklist_es_critico_es_booleano(): void
    {
        foreach ($this->service->getCatalogoChecklist() as $item) {
            $this->assertIsBool($item['es_critico']);
        }
    }

    // ---------------------------------------------------------------------
    // Motor 1: clasificación de trámite
    // ---------------------------------------------------------------------

    public function test_clasificar_comercio_pequeno_es_ex_post_bajo_medio(): void
    {
        $resultado = $this->service->clasificarTramite('Comercio', 120.5, 1, 25, false, 0.0, false, false);

        $this->assertSame('EX_POST', $resultado['tipo_tramite']);
        $this->assertSame('BAJO_MEDIO', $resultado['nivel_riesgo']);
        $this->assertFalse($resultado['es_bloqueante']);
        $this->assertEmpty($resultado['motivos']);
    }

    public function test_clasificar_comercio_limite_750_m2_sigue_ex_post(): void
    {
        $resultado = $this->service->clasificarTramite('Comercio', 750.0, 2, 30, false, 0.0, false, false);

        $this->assertSame('EX_POST', $resultado['tipo_tramite']);
        $this->assertFalse($resultado['es_bloqueante']);
    }

    public function test_clasificar_comercio_limite_3_pisos_sigue_ex_post(): void
    {
        $resultado = $this->service->clasificarTramite('Comercio', 700.0, 3, 30, false, 0.0, false, false);

        $this->assertSame('EX_POST', $resultado['tipo_tramite']);
        $this->assertFalse($resultado['es_bloqueante']);
    }

    public function test_clasificar_comercio_supera_750_m2_ex_ante(): void
    {
        $resultado = $this->service->clasificarTramite('Comercio', 750.01, 1, 25, false, 0.0, false, false);

        $this->assertSame('EX_ANTE', $resultado['tipo_tramite']);
        $this->assertSame('ALTO_MUY_ALTO', $resultado['nivel_riesgo']);
        $this->assertTrue($resultado['es_bloqueante']);
    }

    public function test_clasificar_comercio_supera_3_pisos_ex_ante(): void
    {
        $resultado = $this->service->clasificarTramite('Comercio', 200.0, 4, 25, false, 0.0, false, false);

        $this->assertSame('EX_ANTE', $resultado['tipo_tramite']);
        $this->assertSame('ALTO_MUY_ALTO', $resultado['nivel_riesgo']);
        $this->assertTrue($resultado['es_bloqueante']);
    }

    public function test_clasificar_agravante_caldero_fuerza_ex_ante(): void
    {
        $resultado = $this->service->clasificarTramite('Comercio', 120.0, 1, 25, false, 0.0, true, false);

        $this->assertSame('EX_ANTE', $resultado['tipo_tramite']);
        $this->assertTrue($resultado['es_bloqueante']);
        $this->assertStringContainsString('caldero', implode(' ', $resultado['motivos']));
    }

    public function test_clasificar_agravante_glp_superior_118_galones_fuerza_ex_ante(): void
    {
        $resultado = $this->service->clasificarTramite('Comercio', 120.0, 1, 25, true, 200.0, false, false);

        $this->assertSame('EX_ANTE', $resultado['tipo_tramite']);
        $this->assertTrue($resultado['es_bloqueante']);
        $this->assertStringContainsString('GLP', implode(' ', $resultado['motivos']));
    }

    public function test_clasificar_agravante_liquidos_inflamables_fuerza_ex_ante(): void
    {
        $resultado = $this->service->clasificarTramite('Comercio', 120.0, 1, 25, false, 0.0, false, true);

        $this->assertSame('EX_ANTE', $resultado['tipo_tramite']);
        $this->assertTrue($resultado['es_bloqueante']);
        $this->assertStringContainsString('inflamables', implode(' ', $resultado['motivos']));
    }

    public function test_clasificar_hospedaje_aforo_alto_ex_ante(): void
    {
        $resultado = $this->service->clasificarTramite('Hospedaje', 300.0, 1, 150, false, 0.0, false, false);

        $this->assertSame('EX_ANTE', $resultado['tipo_tramite']);
        $this->assertSame('ALTO_MUY_ALTO', $resultado['nivel_riesgo']);
    }

    public function test_clasificar_salud_aforo_alto_ex_ante(): void
    {
        $resultado = $this->service->clasificarTramite('Salud', 400.0, 2, 101, false, 0.0, false, false);

        $this->assertSame('EX_ANTE', $resultado['tipo_tramite']);
    }

    public function test_clasificar_funcion_especial_aforo_bajo_ex_post(): void
    {
        $resultado = $this->service->clasificarTramite('Hospedaje', 400.0, 2, 100, false, 0.0, false, false);

        $this->assertSame('EX_POST', $resultado['tipo_tramite']);
        $this->assertFalse($resultado['es_bloqueante']);
    }

    public function test_clasificar_ex_ante_reporta_motivos(): void
    {
        $resultado = $this->service->clasificarTramite('Comercio', 800.0, 1, 25, false, 0.0, false, false);

        $this->assertNotEmpty($resultado['motivos']);
        $this->assertTrue($resultado['es_bloqueante']);
    }

    // ---------------------------------------------------------------------
    // Motor 2: semáforo de conformidad
    // ---------------------------------------------------------------------

    public function test_conformidad_todo_cumple_verde_cien_porciento(): void
    {
        $checklist = [
            $this->item('EXTINTOR', true, 'CUMPLE', true),
            $this->item('TERMOMAGNETICO', true, 'CUMPLE', true),
            $this->item('EVACUACION', true, 'CUMPLE', true),
            $this->item('LUCES_EMERG', true, 'CUMPLE', false),
            $this->item('BOTIQUIN', true, 'CUMPLE', false),
        ];

        $resultado = $this->service->calcularConformidad($checklist);

        $this->assertSame(100.0, $resultado['porcentaje']);
        $this->assertSame('VERDE', $resultado['semaforo']);
        $this->assertFalse($resultado['tiene_falla_critica']);
        $this->assertSame(5, $resultado['total_evaluables']);
        $this->assertSame(5, $resultado['total_cumple']);
    }

    public function test_conformidad_falla_critica_rojo_inmediato(): void
    {
        $checklist = [
            $this->item('EXTINTOR', true, 'CUMPLE', true),
            $this->item('TERMOMAGNETICO', false, 'NO_CUMPLE', true),
            $this->item('EVACUACION', true, 'CUMPLE', true),
            $this->item('LUCES_EMERG', true, 'CUMPLE', false),
        ];

        $resultado = $this->service->calcularConformidad($checklist);

        $this->assertSame(75.0, $resultado['porcentaje']);
        $this->assertSame('ROJO', $resultado['semaforo']);
        $this->assertTrue($resultado['tiene_falla_critica']);
    }

    public function test_conformidad_ambar_entre_60_y_85_sin_falla_critica(): void
    {
        $checklist = [
            $this->item('EXTINTOR', true, 'CUMPLE', true),
            $this->item('TERMOMAGNETICO', true, 'CUMPLE', true),
            $this->item('EVACUACION', true, 'CUMPLE', true),
            $this->item('LUCES_EMERG', false, 'NO_CUMPLE', false),
            $this->item('BOTIQUIN', true, 'CUMPLE', false),
        ];

        $resultado = $this->service->calcularConformidad($checklist);

        $this->assertSame(80.0, $resultado['porcentaje']);
        $this->assertSame('AMBAR', $resultado['semaforo']);
        $this->assertFalse($resultado['tiene_falla_critica']);
    }

    public function test_conformidad_excluye_matematicamente_items_na(): void
    {
        $checklist = [
            $this->item('EXTINTOR', true, 'CUMPLE', true),
            $this->item('TERMOMAGNETICO', true, 'CUMPLE', true),
            $this->item('EVACUACION', true, 'CUMPLE', true),
            ['codigo' => 'POZO_TIERRA', 'cumple' => false, 'estado' => 'NA', 'es_critico' => true],
            ['codigo' => 'BOTIQUIN', 'cumple' => false, 'estado' => 'NA', 'es_critico' => false],
        ];

        $resultado = $this->service->calcularConformidad($checklist);

        $this->assertSame(100.0, $resultado['porcentaje']);
        $this->assertSame('VERDE', $resultado['semaforo']);
        $this->assertSame(3, $resultado['total_evaluables']);
        $this->assertSame(3, $resultado['total_cumple']);
        $this->assertFalse($resultado['tiene_falla_critica']);
    }

    public function test_conformidad_menor_60_rojo_sin_falla_critica(): void
    {
        $checklist = [
            $this->item('EXTINTOR', true, 'CUMPLE', false),
            $this->item('TERMOMAGNETICO', true, 'CUMPLE', false),
            $this->item('EVACUACION', false, 'NO_CUMPLE', false),
            $this->item('LUCES_EMERG', false, 'NO_CUMPLE', false),
            $this->item('BOTIQUIN', false, 'NO_CUMPLE', false),
            $this->item('SENALETICA', false, 'NO_CUMPLE', false),
        ];

        $resultado = $this->service->calcularConformidad($checklist);

        $this->assertSame(33.3, $resultado['porcentaje']);
        $this->assertSame('ROJO', $resultado['semaforo']);
        $this->assertFalse($resultado['tiene_falla_critica']);
    }

    public function test_conformidad_todo_por_revisar_rojo_sin_fallas_criticas(): void
    {
        $checklist = [
            $this->item('EXTINTOR', false, 'POR_REVISAR', true),
            $this->item('TERMOMAGNETICO', false, 'POR_REVISAR', true),
            $this->item('EVACUACION', false, 'POR_REVISAR', false),
            $this->item('BOTIQUIN', false, 'POR_REVISAR', false),
        ];

        $resultado = $this->service->calcularConformidad($checklist);

        $this->assertSame(0.0, $resultado['porcentaje']);
        $this->assertSame('ROJO', $resultado['semaforo']);
        $this->assertFalse($resultado['tiene_falla_critica']);
        $this->assertSame(4, $resultado['total_por_revisar']);
    }

    public function test_conformidad_por_revisar_no_se_cuenta_como_cumplido(): void
    {
        $checklist = [
            $this->item('EXTINTOR', true, 'CUMPLE', true),
            $this->item('TERMOMAGNETICO', true, 'CUMPLE', true),
            $this->item('EVACUACION', true, 'CUMPLE', true),
            $this->item('LUCES_EMERG', false, 'POR_REVISAR', false),
            $this->item('BOTIQUIN', false, 'POR_REVISAR', false),
        ];

        $resultado = $this->service->calcularConformidad($checklist);

        $this->assertSame(60.0, $resultado['porcentaje']);
        $this->assertSame('AMBAR', $resultado['semaforo']);
        $this->assertSame(3, $resultado['total_cumple']);
        $this->assertSame(2, $resultado['total_por_revisar']);
        $this->assertFalse($resultado['tiene_falla_critica']);
    }

    public function test_conformidad_checklist_vacio_verde(): void
    {
        $resultado = $this->service->calcularConformidad([]);

        $this->assertSame(100.0, $resultado['porcentaje']);
        $this->assertSame('VERDE', $resultado['semaforo']);
        $this->assertSame(0, $resultado['total_evaluables']);
    }

    // ---------------------------------------------------------------------
    // Motor 3: plan de acción
    // ---------------------------------------------------------------------

    public function test_plan_vacio_si_todo_cumple(): void
    {
        $checklist = [
            $this->item('EXTINTOR', true, 'CUMPLE', true),
            $this->item('EVACUACION', true, 'CUMPLE', true),
            $this->item('BOTIQUIN', true, 'CUMPLE', false),
        ];

        $plan = $this->service->generarPlanDeAccion($checklist);

        $this->assertSame([], $plan['tareas']);
        $this->assertSame(0, $plan['total_items']);
        $this->assertSame(0.0, $plan['costo_total']);
    }

    public function test_plan_calcula_costo_total_en_soles(): void
    {
        $checklist = [
            $this->item('EXTINTOR', false, 'NO_CUMPLE', true),   // 65.00
            $this->item('EXTINTOR_K', false, 'NO_CUMPLE', true), // 280.00
            $this->item('POZO_TIERRA', false, 'NO_CUMPLE', true), // 180.00
            $this->item('SENALETICA', false, 'NO_CUMPLE', false), // 55.00
            $this->item('EVACUACION', true, 'CUMPLE', true),     // excluido
        ];

        $plan = $this->service->generarPlanDeAccion($checklist);

        $this->assertSame(580.0, $plan['costo_total']);
        $this->assertSame(4, $plan['total_items']);
        $this->assertSame(4, count($plan['tareas']));
    }

    public function test_plan_se_ordena_por_prioridad_alta_media_baja(): void
    {
        $checklist = [
            $this->item('SENALETICA', false, 'NO_CUMPLE', false), // Baja
            $this->item('EXTINTOR', false, 'NO_CUMPLE', true),    // Alta
            $this->item('POZO_TIERRA', false, 'NO_CUMPLE', true), // Media
            $this->item('EXTINTOR_K', false, 'NO_CUMPLE', true),  // Alta
        ];

        $plan = $this->service->generarPlanDeAccion($checklist);

        $this->assertSame(['Alta', 'Alta', 'Media', 'Baja'], array_column($plan['tareas'], 'prioridad'));
        $this->assertSame(
            ['EXTINTOR', 'EXTINTOR_K', 'POZO_TIERRA', 'SENALETICA'],
            array_column($plan['tareas'], 'codigo')
        );
    }

    public function test_plan_incluye_dias_plazo_norma_y_costo_referencial(): void
    {
        $checklist = [
            $this->item('EXTINTOR', false, 'NO_CUMPLE', true),
            $this->item('EXTINTOR_K', false, 'NO_CUMPLE', true),
        ];

        $plan = $this->service->generarPlanDeAccion($checklist);

        $extintor = $plan['tareas'][0];
        $this->assertArrayHasKey('codigo', $extintor);
        $this->assertArrayHasKey('tarea', $extintor);
        $this->assertArrayHasKey('norma', $extintor);
        $this->assertSame(2, $extintor['dias_plazo']);
        $this->assertSame(65.0, $extintor['costo_soles']);
        $this->assertSame(3, $plan['tareas'][1]['dias_plazo']);
        $this->assertSame(280.0, $plan['tareas'][1]['costo_soles']);
    }

    public function test_plan_codigo_desconocido_usa_costo_por_defecto(): void
    {
        $checklist = [
            $this->item('SISTEMA_UNKNOWN', false, 'NO_CUMPLE', true),
        ];

        $plan = $this->service->generarPlanDeAccion($checklist);

        $this->assertSame(50.0, $plan['tareas'][0]['costo_soles']);
        $this->assertSame('Alta', $plan['tareas'][0]['prioridad']);
        $this->assertSame(2, $plan['tareas'][0]['dias_plazo']);
    }

    public function test_plan_excluye_items_por_revisar(): void
    {
        $checklist = [
            $this->item('EXTINTOR', false, 'NO_CUMPLE', true),
            $this->item('EVACUACION', false, 'POR_REVISAR', true),
            $this->item('LUCES_EMERG', false, 'POR_REVISAR', false),
            $this->item('BOTIQUIN', true, 'CUMPLE', false),
        ];

        $plan = $this->service->generarPlanDeAccion($checklist);

        $this->assertSame(['EXTINTOR'], array_column($plan['tareas'], 'codigo'));
        $this->assertSame(1, $plan['total_items']);
    }

    public function test_plan_excluye_items_cumple_y_na(): void
    {
        $checklist = [
            $this->item('EXTINTOR', true, 'CUMPLE', true),
            $this->item('EVACUACION', false, 'NA', true),
            $this->item('LUCES_EMERG', false, 'POR_REVISAR', false),
        ];

        $plan = $this->service->generarPlanDeAccion($checklist);

        $this->assertSame([], $plan['tareas']);
        $this->assertSame(0, $plan['total_items']);
        $this->assertSame(0.0, $plan['costo_total']);
    }

    public function test_plan_total_cero_cuando_solo_hay_por_revisar(): void
    {
        $checklist = [
            $this->item('EXTINTOR', false, 'POR_REVISAR', true),
            $this->item('TERMOMAGNETICO', false, 'POR_REVISAR', true),
            $this->item('EVACUACION', false, 'POR_REVISAR', false),
        ];

        $plan = $this->service->generarPlanDeAccion($checklist);

        $this->assertSame(0, $plan['total_items']);
        $this->assertSame(0.0, $plan['costo_total']);
    }

    // ---------------------------------------------------------------------
    // Motor 4: métrica GAP
    // ---------------------------------------------------------------------

    public function test_metrica_gap_positiva_declarado_mayor_verificado(): void
    {
        $this->assertSame(20.0, $this->service->calcularMetricaGap(90.0, 70.0));
    }

    public function test_metrica_gap_cero_concordancia_total(): void
    {
        $this->assertSame(0.0, $this->service->calcularMetricaGap(80.0, 80.0));
    }

    public function test_metrica_gap_negativa_verificado_mayor_declarado(): void
    {
        $this->assertSame(-25.0, $this->service->calcularMetricaGap(60.0, 85.0));
    }

    public function test_metrica_gap_redondea_a_un_decimal(): void
    {
        $this->assertSame(14.5, $this->service->calcularMetricaGap(80.0, 65.5));
    }
}
