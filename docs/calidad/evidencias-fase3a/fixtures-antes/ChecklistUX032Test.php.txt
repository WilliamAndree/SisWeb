<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RecursoEducativo;
use App\Models\RespuestaAutoevaluacion;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
});

function crearEvaluacionUX03(array $overrides = []): Autoevaluacion
{
    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'nombre_comercio' => 'Bodega Central Huancayo',
        'sector_huancayo' => 'Huancayo Centro',
        'direccion' => 'Calle Real 540',
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'VERDE',
        'detalle_checklist' => [],
    ], $overrides));
}

test('1. Guardado parcial: permite guardar una sola respuesta y mantiene el estado INICIADA', function () {
    $autoevaluacion = crearEvaluacionUX03();

    $payload = [
        'respuestas' => [
            [
                'codigo' => 'CRIT-01',
                'estado' => 'CUMPLE_DECLARADO',
                'notas' => 'Extintor verificado con manómetro en verde.',
            ],
        ],
    ];

    $response = $this->postJson(route('autoevaluacion.checklist.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), $payload);

    $response->assertStatus(200)
        ->assertJson([
            'mensaje' => 'Declaraciones registradas exitosamente.',
        ]);

    expect($autoevaluacion->fresh()->estado)->toBe(Autoevaluacion::ESTADO_INICIADA)
        ->and(RespuestaAutoevaluacion::where('autoevaluacion_id', $autoevaluacion->id)->count())->toBe(1);

    $respuesta = RespuestaAutoevaluacion::where('autoevaluacion_id', $autoevaluacion->id)->first();
    expect($respuesta->estado_respuesta)->toBe('CUMPLE_DECLARADO')
        ->and($respuesta->notas_ciudadano)->toBe('Extintor verificado con manómetro en verde.');
});

test('2. Guardado parcial: permite guardar multiples respuestas parciales (ej. 3 de 13) y mantiene INICIADA', function () {
    $autoevaluacion = crearEvaluacionUX03();

    $payload = [
        'respuestas' => [
            ['codigo' => 'CRIT-01', 'estado' => 'CUMPLE_DECLARADO', 'notas' => null],
            ['codigo' => 'CRIT-06', 'estado' => 'PENDIENTE_ATENDER', 'notas' => 'Falta diferencial 30mA'],
            ['codigo' => 'CRIT-08', 'estado' => 'POR_REVISAR', 'notas' => 'Comprobar luz de emergencia'],
        ],
    ];

    $response = $this->postJson(route('autoevaluacion.checklist.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), $payload);

    $response->assertStatus(200);

    expect($autoevaluacion->fresh()->estado)->toBe(Autoevaluacion::ESTADO_INICIADA)
        ->and(RespuestaAutoevaluacion::where('autoevaluacion_id', $autoevaluacion->id)->count())->toBe(3);
});

test('3. Persistencia de notas: el campo notas_ciudadano admite hasta 1000 caracteres y se preserva en el checklist dinamico', function () {
    $autoevaluacion = crearEvaluacionUX03();
    $notaLarga = str_repeat('A', 1000);

    $payload = [
        'respuestas' => [
            [
                'codigo' => 'CRIT-01',
                'estado' => 'CUMPLE_DECLARADO',
                'notas' => $notaLarga,
            ],
        ],
    ];

    $response = $this->postJson(route('autoevaluacion.checklist.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), $payload);
    $response->assertStatus(200);

    // Consultar el checklist y comprobar que el criterio incluye la nota previamente guardada
    $getChecklist = $this->getJson(route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    $getChecklist->assertStatus(200);

    $crit01 = collect($getChecklist->json('criterios'))->firstWhere('codigo', 'CRIT-01');
    expect($crit01)->not->toBeNull()
        ->and($crit01['notas'])->toBe($notaLarga);
});

test('4. Notas ciudadanas rechaza textos mayores a 1000 caracteres con 422', function () {
    $autoevaluacion = crearEvaluacionUX03();
    $notaInvalida = str_repeat('B', 1001);

    $payload = [
        'respuestas' => [
            [
                'codigo' => 'CRIT-01',
                'estado' => 'CUMPLE_DECLARADO',
                'notas' => $notaInvalida,
            ],
        ],
    ];

    $response = $this->postJson(route('autoevaluacion.checklist.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), $payload);
    $response->assertStatus(422)
        ->assertJsonValidationErrors(['respuestas.0.notas']);
});

test('5. Recursos educativos: CRIT-08 y CRIT-06 tienen sus recursos asignados y rutas de evacuacion permanece huerfano', function () {
    $crit08 = CriterioNormativo::where('codigo_criterio', 'CRIT-08')->firstOrFail();
    $crit06 = CriterioNormativo::where('codigo_criterio', 'CRIT-06')->firstOrFail();

    $recurso08 = RecursoEducativo::where('criterio_normativo_id', $crit08->id)->first();
    expect($recurso08)->not->toBeNull()
        ->and($recurso08->titulo)->toContain('Luz de emergencia');

    $recurso06 = RecursoEducativo::where('criterio_normativo_id', $crit06->id)->first();
    expect($recurso06)->not->toBeNull()
        ->and($recurso06->titulo)->toContain('Diferencia entre llave termomagnética y diferencial');

    // El recurso de rutas de evacuación permanece sin criterio asociado por ambigüedad normativa
    $recursoRutas = RecursoEducativo::where('titulo', 'like', '%Rutas de evacuación%')->first();
    expect($recursoRutas)->not->toBeNull()
        ->and($recursoRutas->criterio_normativo_id)->toBeNull();
});

test('6. Integridad: ApplicabilityEngineService no acopla RecursoEducativo y no altera el hash ni el payload canonico', function () {
    $service = app(ApplicabilityEngineService::class);
    $reflection = new ReflectionClass($service);
    $contents = file_get_contents($reflection->getFileName());

    expect($contents)->not->toContain('RecursoEducativo')
        ->and($contents)->not->toContain('recursos_educativos');

    $autoevaluacion = crearEvaluacionUX03();
    $payloadCanonico = $service->generarPayloadCanonico($autoevaluacion);

    // Verificar que los criterios en payloadCanonico solo tienen las claves normativas autorizadas
    foreach ($payloadCanonico['criterios'] as $criterio) {
        expect($criterio)->not->toHaveKey('recursos_educativos');
    }
});

test('7. Bloqueo de modificacion en estado REGISTRADA para declaraciones y notas', function () {
    $token = 'token_guest_ux032_12345';
    $autoevaluacion = crearEvaluacionUX03([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
        'session_token' => $token,
    ]);

    $payload = [
        'respuestas' => [
            [
                'codigo' => 'CRIT-01',
                'estado' => 'CUMPLE_DECLARADO',
                'notas' => 'Intento de modificar cuando ya está registrada',
            ],
        ],
    ];

    $response = $this->withSession(['guest_session_token' => $token])
        ->withCookie('guest_session_token', $token)
        ->postJson(route('autoevaluacion.checklist.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), $payload);

    $response->assertStatus(409)
        ->assertJson([
            'error' => 'autoevaluacion_registrada',
        ]);
});
