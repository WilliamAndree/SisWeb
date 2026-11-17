<?php

use App\Models\Autoevaluacion;
use App\Models\RespuestaAutoevaluacion;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

function crearEvaluacionParaChecklist(array $overrides = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'nombre_comercio' => 'Bodega Los Rosales Huancayo',
        'sector_huancayo' => 'San Carlos',
        'direccion' => 'Jr. Puno 450',
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ], $overrides));
}

test('1. La pagina Checklist se renderiza correctamente como componente Inertia Evaluacion/Checklist', function () {
    $evaluacion = crearEvaluacionParaChecklist();

    $response = $this->get(route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad]));

    $response->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Checklist')
            ->has('autoevaluacion')
            ->has('checklist')
            ->where('autoevaluacion.uuid', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluacion.nombre_comercio', 'Bodega Los Rosales Huancayo')
        );
});

test('2 y 3. Se consumen los datos del backend y se muestran unicamente los criterios aplicables', function () {
    // Comercio con todo aplicable
    $evaluacion = crearEvaluacionParaChecklist([
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
    ]);

    $this->get(route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Checklist')
            ->has('checklist.criterios', 13)
            ->has('checklist.no_aplican', 0)
            ->has('checklist.informacion_pendiente', 0)
        );
});

test('4. Los criterios no_aplican aparecen como informativos sin controles de respuesta', function () {
    // Comercio donde GLP y escaleras son false
    $evaluacion = crearEvaluacionParaChecklist([
        'usa_glp' => false,
        'tiene_escaleras' => false,
    ]);

    $this->get(route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->assertInertia(function (Assert $page) {
            $page->component('Evaluacion/Checklist')
                ->where('checklist.resumen.criterios_no_aplican', 2);

            $noAplican = $page->toArray()['props']['checklist']['no_aplican'];
            $codigos = collect($noAplican)->pluck('codigo')->all();

            expect($codigos)->toContain('CRIT-10', 'CRIT-11');

            // Verificar que no poseen opciones de respuesta ciudadana
            foreach ($noAplican as $item) {
                expect($item)->not->toHaveKey('opciones_respuesta')
                    ->and($item['estado'])->toBe('NO_APLICA')
                    ->and($item['motivo'])->toBeString()->not->toBeEmpty();
            }
        });
});

test('5. informacion_pendiente aparece como informativa y bloqueada para respuesta ciudadana', function () {
    // Comercio donde fritura y estanterias son null
    $evaluacion = crearEvaluacionParaChecklist([
        'tiene_equipos_fritura' => null,
        'tiene_estanterias_altas' => null,
    ]);

    $this->get(route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->assertInertia(function (Assert $page) {
            $page->component('Evaluacion/Checklist')
                ->where('checklist.resumen.criterios_requieren_informacion', 2);

            $pendientes = $page->toArray()['props']['checklist']['informacion_pendiente'];
            $codigos = collect($pendientes)->pluck('codigo')->all();

            expect($codigos)->toContain('CRIT-02A', 'CRIT-13');

            foreach ($pendientes as $item) {
                expect($item)->not->toHaveKey('opciones_respuesta')
                    ->and($item['requiere_informacion'])->toBeTrue()
                    ->and($item['variable_faltante'])->not->toBeNull();
            }
        });
});

test('6 y 7. NO_APLICA no aparece como opcion y solo se presentan las tres respuestas ciudadanas permitidas', function () {
    $evaluacion = crearEvaluacionParaChecklist();

    $this->get(route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->assertInertia(function (Assert $page) {
            $criterios = $page->toArray()['props']['checklist']['criterios'];

            expect($criterios)->not->toBeEmpty();

            foreach ($criterios as $criterio) {
                expect($criterio['opciones_respuesta'])->toBe([
                    'CUMPLE_DECLARADO',
                    'PENDIENTE_ATENDER',
                    'POR_REVISAR',
                ])
                    ->and($criterio['opciones_respuesta'])->not->toContain('NO_APLICA');
            }
        });
});

test('8 y 9. El conteo de progreso considera exclusivamente criterios aplicables evaluables', function () {
    $evaluacion = crearEvaluacionParaChecklist([
        'usa_glp' => false, // 1 en no_aplican
        'tiene_escaleras' => false, // 1 en no_aplican
        'tiene_equipos_fritura' => null, // 1 en pendientes
    ]);

    // Total activos = 13: 2 no aplican, 1 pendiente -> 10 evaluables
    $this->get(route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Checklist')
            ->where('checklist.resumen.criterios_aplicables', 10)
            ->where('checklist.resumen.criterios_no_aplican', 2)
            ->where('checklist.resumen.criterios_requieren_informacion', 1)
        );
});

test('10 y 14. El POST utiliza el contrato real y la respuesta exitosa devuelve confirmacion', function () {
    $evaluacion = crearEvaluacionParaChecklist();

    $payload = [
        'respuestas' => [
            [
                'codigo' => 'CRIT-01',
                'estado' => 'CUMPLE_DECLARADO',
            ],
            [
                'codigo' => 'CRIT-06',
                'estado' => 'PENDIENTE_ATENDER',
            ],
        ],
    ];

    $response = $this->postJson(route('autoevaluacion.checklist.store', ['uuid' => $evaluacion->uuid_trazabilidad]), $payload);

    $response->assertStatus(200)
        ->assertJson([
            'mensaje' => 'Declaraciones registradas exitosamente.',
        ])
        ->assertJsonStructure([
            'mensaje',
            'guardadas',
            'checklist',
        ]);

    // Verificar persistencia en base de datos
    expect(RespuestaAutoevaluacion::where('autoevaluacion_id', $evaluacion->id)->count())->toBe(2);
});

test('11 y 12. Un error 422 por envio de NO_APLICA o campos invalidos es rechazado amigablemente', function () {
    $evaluacion = crearEvaluacionParaChecklist();

    // Intento con NO_APLICA
    $responseNoAplica = $this->postJson(route('autoevaluacion.checklist.store', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'respuestas' => [
            ['codigo' => 'CRIT-01', 'estado' => 'NO_APLICA'],
        ],
    ]);

    $responseNoAplica->assertStatus(422)
        ->assertJsonValidationErrors(['respuestas.0.estado']);

    // Intento con array vacio
    $responseVacio = $this->postJson(route('autoevaluacion.checklist.store', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'respuestas' => [],
    ]);

    $responseVacio->assertStatus(422)
        ->assertJsonValidationErrors(['respuestas']);
});

test('15. Ningun criterio suspendido aparece en la pantalla del checklist', function () {
    $evaluacion = crearEvaluacionParaChecklist();

    $this->get(route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->assertInertia(function (Assert $page) {
            $checklist = $page->toArray()['props']['checklist'];
            $codigosSuspendidos = ['CRIT-09', 'CRIT-12', 'CRIT-14B', 'CRIT-15', 'CRIT-16', 'CRIT-17'];

            $todosCodigos = collect($checklist['criterios'])->pluck('codigo')
                ->merge(collect($checklist['no_aplican'])->pluck('codigo'))
                ->merge(collect($checklist['informacion_pendiente'])->pluck('codigo'))
                ->all();

            foreach ($codigosSuspendidos as $suspendido) {
                expect($todosCodigos)->not->toContain($suspendido);
            }

            expect($checklist['resumen']['total_suspendidos'])->toBe(6);
        });
});

test('16. No se muestran resultados globales, porcentajes, riesgo, semaforos ni aprobacion', function () {
    $evaluacion = crearEvaluacionParaChecklist();

    $this->get(route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertStatus(200)
        ->assertInertia(function (Assert $page) {
            $props = $page->toArray()['props'];

            // No debe existir porcentaje de cumplimiento ni nivel de riesgo en la entrega
            expect($props)->not->toHaveKey('porcentaje_cumplimiento')
                ->and($props)->not->toHaveKey('semaforo')
                ->and($props)->not->toHaveKey('nivel_riesgo')
                ->and($props)->not->toHaveKey('tipo_tramite')
                ->and($props)->not->toHaveKey('plan_accion');
        });
});
