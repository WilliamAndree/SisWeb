<?php

namespace Tests\Feature;

use App\Models\Autoevaluacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Services\ItseRiskService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CheckItseModulosTest extends TestCase
{
    use RefreshDatabase;

    private function checklistConforme(): array
    {
        return [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ];
    }

    private function checklistMixto(): array
    {
        return [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ];
    }

    private function payloadBase(array $overrides = []): array
    {
        return array_merge([
            'nombre_comercio' => 'Comercio Andino Jewel',
            'funcion_economica' => 'Comercio',
            'ruc' => '20123456789',
            'sector' => 'Huancayo Centro',
            'area_m2' => '120.5',
            'pisos' => 1,
            'aforo' => 25,
            'usa_glp' => false,
            'galones_glp' => 0,
            'usa_caldero' => false,
            'usa_liquidos_inflamables' => false,
            'checklist' => $this->checklistMixto(),
        ], $overrides);
    }

    private function crearAutoevaluacion(array $overrides = []): Autoevaluacion
    {
        $this->post(route('autoevaluacion.store'), $this->payloadBase($overrides))
            ->assertSessionHasNoErrors();

        return Autoevaluacion::firstOrFail();
    }

    private function verificacionesMixtas(): array
    {
        return [
            'EXTINTOR' => true,
            'TERMOMAGNETICO' => true,
            'EVACUACION' => true,
            'LUCES_EMERG' => false,
            'BOTIQUIN' => true,
        ];
    }

    private function verificacionesConformes(): array
    {
        return [
            'EXTINTOR' => true,
            'TERMOMAGNETICO' => true,
            'EVACUACION' => true,
            'LUCES_EMERG' => true,
            'BOTIQUIN' => true,
        ];
    }

    private function registrarSimulacion(Autoevaluacion $evaluacion, array $verificaciones, int $discrepancias): void
    {
        $this->post(
            route('autoevaluacion.simulacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            ['verificaciones' => $verificaciones, 'discrepancias' => $discrepancias]
        )->assertSessionHasNoErrors();
    }

    // ---------------------------------------------------------------------
    // Autoevaluación
    // ---------------------------------------------------------------------

    public function test_get_autoevaluacion_retorna_200(): void
    {
        $this->get(route('autoevaluacion.index'))->assertOk();
    }

    public function test_post_autoevaluacion_valida_campos_requeridos(): void
    {
        $response = $this->post(route('autoevaluacion.store'), []);

        $response->assertSessionHasErrors([
            'nombre_comercio',
            'funcion_economica',
        ]);
        $response->assertSessionDoesntHaveErrors(['sector', 'checklist']);

        $this->assertDatabaseCount('autoevaluaciones', 0);
    }

    public function test_post_autoevaluacion_rechaza_ruc_invalido(): void
    {
        $rucsInvalidos = ['12345678901', '30123456789', '2012345678', '201234567890', '2012ABCD789'];

        foreach ($rucsInvalidos as $ruc) {
            $response = $this->post(route('autoevaluacion.store'), $this->payloadBase(['ruc' => $ruc]));

            $response->assertSessionHasErrors(['ruc']);
        }

        $this->assertDatabaseCount('autoevaluaciones', 0);
    }

    public function test_post_autoevaluacion_acepta_ruc_con_prefijo_10_y_20(): void
    {
        foreach (['10123456789', '20123456789'] as $indice => $ruc) {
            $response = $this->post(route('autoevaluacion.store'), $this->payloadBase(['ruc' => $ruc]));

            $response->assertSessionHasNoErrors();
            $this->assertDatabaseCount('autoevaluaciones', $indice + 1);
        }
    }

    public function test_post_autoevaluacion_guarda_direccion_y_referencia_opcionales(): void
    {
        $response = $this->post(route('autoevaluacion.store'), $this->payloadBase([
            'direccion' => 'Jr. Teniente Peña 245, segundo piso',
            'referencia' => 'Frente al mercado Modelo',
        ]));

        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('autoevaluaciones', [
            'ruc' => '20123456789',
            'direccion' => 'Jr. Teniente Peña 245, segundo piso',
            'referencia' => 'Frente al mercado Modelo',
        ]);
    }

    public function test_post_autoevaluacion_ubicacion_opcional_acepta_vacio(): void
    {
        $this->post(route('autoevaluacion.store'), $this->payloadBase())
            ->assertSessionHasNoErrors();

        $evaluacion = Autoevaluacion::firstOrFail();
        $this->assertNull($evaluacion->direccion);
        $this->assertNull($evaluacion->referencia);
    }

    public function test_post_autoevaluacion_error_ruc_en_espanol(): void
    {
        $response = $this->post(route('autoevaluacion.store'), $this->payloadBase(['ruc' => '12345678901']));

        $response->assertSessionHasErrors([
            'ruc' => 'El RUC debe tener 11 dígitos y comenzar con 10 o 20.',
        ]);
    }

    public function test_post_autoevaluacion_crea_registro_uuid_hash_y_redireccion(): void
    {
        $response = $this->post(route('autoevaluacion.store'), $this->payloadBase());

        $response->assertSessionHasNoErrors();

        $this->assertDatabaseCount('autoevaluaciones', 1);
        $this->assertDatabaseHas('autoevaluaciones', [
            'ruc' => '20123456789',
            'tipo_tramite' => null,
            'nivel_riesgo' => null,
            'semaforo' => 'AMBAR',
        ]);

        $evaluacion = Autoevaluacion::firstOrFail();
        $this->assertSame(36, strlen($evaluacion->uuid_trazabilidad));
        $this->assertSame(64, strlen($evaluacion->hash_integridad));
        $this->assertNull($evaluacion->tipo_tramite);
        $this->assertNull($evaluacion->nivel_riesgo);
        $this->assertSame(80.0, $evaluacion->porcentaje_cumplimiento);
        $this->assertSame('AMBAR', $evaluacion->semaforo);

        $response->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad]));
    }

    public function test_post_autoevaluacion_no_genera_clasificacion_administrativa_por_escala_o_caracteristicas(): void
    {
        $evaluacion = $this->crearAutoevaluacion([
            'area_m2' => '800.0',
            'pisos' => 4,
            'aforo' => 200,
            'usa_glp' => true,
            'galones_glp' => 250,
        ]);

        $this->assertNull($evaluacion->tipo_tramite);
        $this->assertNull($evaluacion->nivel_riesgo);
        $this->assertDatabaseHas('autoevaluaciones', ['ruc' => '20123456789', 'tipo_tramite' => null, 'nivel_riesgo' => null]);

        // Verifica que el método del servicio permanece aislado como lógica técnica sin ejecutarse en el flujo
        $clasificacionAislada = (new ItseRiskService)->clasificarTramite('Comercio', 800.0, 4, 200, true, 250);
        $this->assertSame('EX_ANTE', $clasificacionAislada['tipo_tramite']);
    }

    public function test_hash_integridad_es_sha256_consistente_64_hexadecimal(): void
    {
        $this->travelTo(Carbon::parse('2026-05-01 10:00:00'));
        $timestamp = Carbon::now()->timestamp;

        $this->post(route('autoevaluacion.store'), $this->payloadBase())->assertSessionHasNoErrors();

        $this->travelBack();

        $evaluacion = Autoevaluacion::firstOrFail();
        $this->assertSame(64, strlen($evaluacion->hash_integridad));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/i', $evaluacion->hash_integridad);
        $this->assertSame(
            hash('sha256', $evaluacion->uuid_trazabilidad.$evaluacion->ruc.$timestamp),
            $evaluacion->hash_integridad
        );
    }

    // ---------------------------------------------------------------------
    // Consulta de resultados
    // ---------------------------------------------------------------------

    public function test_resultado_con_uuid_existente_retorna_200(): void
    {
        $evaluacion = $this->crearAutoevaluacion();

        $this->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]))->assertOk();
    }

    public function test_resultado_con_uuid_inexistente_retorna_404(): void
    {
        $this->get(route('autoevaluacion.resultado', ['uuid' => '00000000-0000-4000-8000-000000000000']))
            ->assertNotFound();
    }

    // ---------------------------------------------------------------------
    // Simulación de revisión in situ
    // ---------------------------------------------------------------------

    public function test_simulacion_revision_con_uuid_existente_retorna_200(): void
    {
        $evaluacion = $this->crearAutoevaluacion();

        $this->get(route('autoevaluacion.simulacion', ['uuid' => $evaluacion->uuid_trazabilidad]))->assertOk();
    }

    public function test_simulacion_revision_con_uuid_inexistente_retorna_404(): void
    {
        $this->get(route('autoevaluacion.simulacion', ['uuid' => '00000000-0000-4000-8000-000000000000']))
            ->assertNotFound();
    }

    public function test_guardar_simulacion_registra_codigo_preventivo_y_calcula_observaciones(): void
    {
        $evaluacion = $this->crearAutoevaluacion();

        $response = $this->post(
            route('autoevaluacion.simulacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            ['verificaciones' => $this->verificacionesMixtas(), 'discrepancias' => 1]
        );

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('autoevaluacion.simulacion', ['uuid' => $evaluacion->uuid_trazabilidad]));

        $this->assertDatabaseHas('simulaciones_revision', [
            'autoevaluacion_id' => $evaluacion->id,
            'total_observaciones' => 1,
            'resultado' => 'CON_OBSERVACIONES',
        ]);

        $simulacion = SimulacionRevision::where('autoevaluacion_id', $evaluacion->id)->firstOrFail();
        $this->assertSame(80.0, $simulacion->porcentaje_revision);
        $this->assertSame(0.0, $simulacion->metrica_gap);
        $this->assertStringStartsWith('PREV-ITSE-', $simulacion->codigo_revision);
    }

    public function test_guardar_simulacion_sin_observaciones_gap_negativo(): void
    {
        $evaluacion = $this->crearAutoevaluacion();

        $this->registrarSimulacion($evaluacion, $this->verificacionesConformes(), 0);

        $simulacion = SimulacionRevision::where('autoevaluacion_id', $evaluacion->id)->firstOrFail();
        $this->assertSame(0, $simulacion->total_observaciones);
        $this->assertSame(100.0, $simulacion->porcentaje_revision);
        $this->assertSame(-20.0, $simulacion->metrica_gap);
        $this->assertSame('SIN_OBSERVACIONES', $simulacion->resultado);
    }

    // ---------------------------------------------------------------------
    // Subsanación preventiva
    // ---------------------------------------------------------------------

    public function test_panel_subsanacion_retorna_200(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $this->get(route('autoevaluacion.subsanacion', ['uuid' => $evaluacion->uuid_trazabilidad]))->assertOk();
    }

    public function test_subsanacion_persiste_estado_en_proceso_sin_recalculo(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $response = $this->post(
            route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            [
                'codigo_item' => 'LUCES_EMERG',
                'descripcion_subsanacion' => 'Instalada lámpara autónoma con batería de respaldo de 90 minutos.',
                'estado' => 'EN_PROCESO',
            ]
        );

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('subsanaciones', [
            'codigo_item' => 'LUCES_EMERG',
            'estado' => 'EN_PROCESO',
        ]);

        $this->assertSame('AMBAR', $evaluacion->fresh()->semaforo);
    }

    public function test_subsanacion_persiste_estado_pendiente(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $response = $this->post(
            route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            [
                'codigo_item' => 'EXTINTOR',
                'descripcion_subsanacion' => 'Se programa recarga y mantenimiento del extintor PQS.',
                'estado' => 'PENDIENTE',
            ]
        );

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('subsanaciones', [
            'codigo_item' => 'EXTINTOR',
            'estado' => 'PENDIENTE',
        ]);
    }

    public function test_subsanacion_declarada_recalcula_semaforo_a_verde(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $response = $this->post(
            route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            [
                'codigo_item' => 'LUCES_EMERG',
                'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
                'estado' => 'SUBSANADO_DECLARADO',
            ]
        );

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('subsanaciones', [
            'codigo_item' => 'LUCES_EMERG',
            'estado' => 'SUBSANADO_DECLARADO',
        ]);

        $this->assertSame('VERDE', $evaluacion->fresh()->semaforo);
        $this->assertSame(100.0, $evaluacion->fresh()->porcentaje_cumplimiento);

        $simulacion = $evaluacion->simulaciones()->firstOrFail();
        $this->assertSame('SIN_OBSERVACIONES', $simulacion->fresh()->resultado);
        $this->assertSame(100.0, $simulacion->fresh()->porcentaje_revision);
        $this->assertSame(0.0, $simulacion->fresh()->metrica_gap);
    }

    public function test_subsanacion_rechaza_estado_fuera_del_plan(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $response = $this->post(
            route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            [
                'codigo_item' => 'LUCES_EMERG',
                'descripcion_subsanacion' => 'Descripción de sustento técnico válida.',
                'estado' => 'ESTADO_NO_PERMITIDO',
            ]
        );

        $response->assertSessionHasErrors(['estado']);
        $this->assertDatabaseCount('subsanaciones', 0);
    }

    public function test_subsanacion_acepta_evidencia_de_imagen(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $response = $this->post(
            route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            [
                'codigo_item' => 'LUCES_EMERG',
                'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
                'estado' => 'SUBSANADO_DECLARADO',
                'evidencia' => UploadedFile::fake()->createWithContent(
                    'evidencia.png',
                    base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
                ),
            ]
        );

        $response->assertSessionHasNoErrors();
        $subsanacion = Subsanacion::where('codigo_item', 'LUCES_EMERG')->firstOrFail();
        $this->assertStringStartsWith('evidencias/subsanaciones/', (string) $subsanacion->evidencia_url);
    }

    // ---------------------------------------------------------------------
    // Informe de autoevaluación preventiva
    // ---------------------------------------------------------------------

    public function test_informe_disponible_para_cualquier_semaforo(): void
    {
        $evaluacion = $this->crearAutoevaluacion();

        $this->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
            ->assertOk();
    }

    public function test_informe_disponible_cuando_semaforo_es_verde(): void
    {
        $evaluacion = $this->crearAutoevaluacion(['checklist' => $this->checklistConforme()]);

        $this->assertSame('VERDE', $evaluacion->fresh()->semaforo);

        $this->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))->assertOk();
    }

    // ---------------------------------------------------------------------
    // Checklist: validación de estructura y valores de respuesta
    // ---------------------------------------------------------------------

    public function test_post_autoevaluacion_rechaza_estado_no_permitido(): void
    {
        $checklist = $this->checklistMixto();
        $checklist[1]['estado'] = 'SUPERADO';

        $response = $this->post(route('autoevaluacion.store'), $this->payloadBase(['checklist' => $checklist]));

        $response->assertSessionHasErrors(['checklist.1.estado']);
        $this->assertDatabaseCount('autoevaluaciones', 0);
    }

    public function test_post_autoevaluacion_rechaza_condiciones_duplicadas(): void
    {
        $checklist = $this->checklistMixto();
        $checklist[] = ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true];

        $response = $this->post(route('autoevaluacion.store'), $this->payloadBase(['checklist' => $checklist]));

        $response->assertSessionHasErrors(['checklist.2.codigo']);
        $this->assertDatabaseCount('autoevaluaciones', 0);
    }

    public function test_post_autoevaluacion_acepta_condiciones_sin_responder_por_revisar(): void
    {
        $checklist = array_map(static function (array $item): array {
            $item['estado'] = 'POR_REVISAR';
            $item['cumple'] = false;

            return $item;
        }, $this->checklistMixto());

        $response = $this->post(route('autoevaluacion.store'), $this->payloadBase(['checklist' => $checklist]));

        $response->assertSessionHasNoErrors();
        $evaluacion = Autoevaluacion::firstOrFail();
        $this->assertSame(0.0, $evaluacion->porcentaje_cumplimiento);
        $this->assertSame('ROJO', $evaluacion->semaforo);
    }

    public function test_post_autoevaluacion_normaliza_cumple_segun_estado(): void
    {
        $checklist = $this->checklistMixto();
        $checklist[0]['cumple'] = false;

        $response = $this->post(route('autoevaluacion.store'), $this->payloadBase(['checklist' => $checklist]));

        $response->assertSessionHasNoErrors();
        $evaluacion = Autoevaluacion::firstOrFail();
        $detalle = collect($evaluacion->detalle_checklist)->firstWhere('codigo', 'EXTINTOR');
        $this->assertSame('CUMPLE', $detalle['estado']);
        $this->assertTrue($detalle['cumple']);
    }
}
