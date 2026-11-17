<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use App\Models\User;
use App\Services\ApplicabilityEngineService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

function crearEvaluacionTest(array $overrides = []): Autoevaluacion
{
    $sessionToken = 'token_test_fijo_cierre';

    $eval = Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'session_token' => $sessionToken,
        'nombre_comercio' => 'Comercio Dinamico Huancayo',
        'ruc' => '20123456789',
        'direccion' => 'Av. Giráldez 321',
        'area_m2' => 80.0,
        'pisos' => 1,
        'aforo' => 20,
        'usa_glp' => true,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => true,
        'porcentaje_cumplimiento' => 0,
        'semaforo' => 'PENDIENTE',
        'detalle_checklist' => [],
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'registrada_at' => null,
        'hash_integridad' => null,
    ], $overrides));

    test()->withSession([
        'guest_session_token' => $sessionToken,
    ]);
    test()->withCookie('guest_session_token', $sessionToken);

    return $eval;
}

function generarDeclaracionesCompletas(Autoevaluacion $evaluacion, string $estado = 'CUMPLE_DECLARADO'): array
{
    $service = app(ApplicabilityEngineService::class);
    $checklist = $service->generarChecklistDinamico($evaluacion);
    $respuestas = [];

    foreach ($checklist['criterios'] as $criterio) {
        $respuestas[] = [
            'codigo' => $criterio['codigo'],
            'estado' => $estado,
            'notas' => 'Declaración de prueba para '.$criterio['codigo'],
        ];
    }

    return $respuestas;
}

// 1. Creación inicial: estado INICIADA, registrada_at null, hash_integridad null
test('1. Creación inicial: una autoevaluación nueva nace con estado INICIADA, registrada_at null y hash_integridad null', function () {
    $response = $this->post(route('autoevaluacion.store'), [
        'nombre_comercio' => 'Bodega Central Huancayo',
        'funcion_economica' => 'Comercio',
        'ruc' => '20789654123',
        'direccion' => 'Jr. Puno 100',
        'area_m2' => 60.0,
        'pisos' => 1,
        'aforo' => 15,
        'usa_glp' => false,
        'tiene_equipos_fritura' => false,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => true,
    ]);

    $response->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();
    expect($evaluacion->estado)->toBe(Autoevaluacion::ESTADO_INICIADA)
        ->and($evaluacion->estaIniciada())->toBeTrue()
        ->and($evaluacion->estaRegistrada())->toBeFalse()
        ->and($evaluacion->registrada_at)->toBeNull()
        ->and($evaluacion->hash_integridad)->toBeNull()
        ->and($evaluacion->payload_canonico)->toBeNull();
});

// 2. Modificación permitida mientras estado = INICIADA
test('2. Modificación permitida: mientras estado = INICIADA se pueden actualizar respuestas repetidamente', function () {
    $evaluacion = crearEvaluacionTest();

    $payload1 = [
        'respuestas' => [
            ['codigo' => 'CRIT-01', 'estado' => 'CUMPLE_DECLARADO', 'notas' => 'Primera versión'],
        ],
    ];

    $res1 = $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", $payload1);
    $res1->assertStatus(200);

    $criterioCrit01 = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->firstOrFail();

    $respuestaDb1 = RespuestaAutoevaluacion::where('autoevaluacion_id', $evaluacion->id)
        ->where('criterio_id', $criterioCrit01->id)
        ->firstOrFail();
    expect($respuestaDb1->estado_respuesta)->toBe('CUMPLE_DECLARADO')
        ->and($respuestaDb1->notas_ciudadano)->toBe('Primera versión');

    // Modificación posterior
    $payload2 = [
        'respuestas' => [
            ['codigo' => 'CRIT-01', 'estado' => 'PENDIENTE_ATENDER', 'notas' => 'Segunda versión modificada'],
        ],
    ];

    $res2 = $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", $payload2);
    $res2->assertStatus(200);

    $respuestaDb2 = RespuestaAutoevaluacion::where('autoevaluacion_id', $evaluacion->id)
        ->where('criterio_id', $criterioCrit01->id)
        ->firstOrFail();
    expect($respuestaDb2->estado_respuesta)->toBe('PENDIENTE_ATENDER')
        ->and($respuestaDb2->notas_ciudadano)->toBe('Segunda versión modificada');
});

// 3. Intento de cierre incompleto es rechazado con 422
test('3. Intento de cierre incompleto: si falta responder un criterio aplicable, se rechaza con 422', function () {
    $evaluacion = crearEvaluacionTest();

    // Solo declaramos 1 criterio de los 13 aplicables
    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", [
        'respuestas' => [
            ['codigo' => 'CRIT-01', 'estado' => 'CUMPLE_DECLARADO'],
        ],
    ])->assertStatus(200);

    $response = $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/finalizar");

    $response->assertStatus(422)
        ->assertJsonStructure([
            'error',
            'mensaje',
            'pendientes',
        ]);

    $data = $response->json();
    expect($data['error'])->toBe('criterios_pendientes')
        ->and(count($data['pendientes']))->toBe(12); // Faltan 12 aplicables

    // La evaluación sigue INICIADA y sin hash
    $evaluacion->refresh();
    expect($evaluacion->estado)->toBe(Autoevaluacion::ESTADO_INICIADA)
        ->and($evaluacion->registrada_at)->toBeNull()
        ->and($evaluacion->hash_integridad)->toBeNull();
});

// 4. Cierre formal exitoso: transiciona a REGISTRADA, registrada_at y hash_integridad SHA-256 (64 hex)
test('4. Cierre formal exitoso: con todos los aplicables respondidos, transiciona a REGISTRADA y genera SHA-256', function () {
    $evaluacion = crearEvaluacionTest();

    $declaraciones = generarDeclaracionesCompletas($evaluacion, 'CUMPLE_DECLARADO');
    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", [
        'respuestas' => $declaraciones,
    ])->assertStatus(200);

    $antes = Carbon::now()->subSecond();
    $response = $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/finalizar");

    $response->assertStatus(200)
        ->assertJson([
            'mensaje' => 'Autoevaluación registrada correctamente y protegida contra modificaciones.',
            'estado' => 'REGISTRADA',
            'uuid' => $evaluacion->uuid_trazabilidad,
        ])
        ->assertJsonStructure(['hash_integridad', 'registrada_at']);

    $evaluacion->refresh();
    expect($evaluacion->estado)->toBe(Autoevaluacion::ESTADO_REGISTRADA)
        ->and($evaluacion->estaRegistrada())->toBeTrue()
        ->and($evaluacion->registrada_at)->not->toBeNull()
        ->and($evaluacion->registrada_at->greaterThanOrEqualTo($antes))->toBeTrue()
        ->and(strlen($evaluacion->hash_integridad))->toBe(64)
        ->and(preg_match('/^[a-f0-9]{64}$/i', $evaluacion->hash_integridad))->toBe(1)
        ->and($evaluacion->payload_canonico)->not->toBeNull()
        ->and(is_array($evaluacion->payload_canonico))->toBeTrue();
});

// 5. Idempotencia: segundo POST a finalizar no altera registrada_at ni hash_integridad
test('5. Idempotencia: llamar a finalizar sobre una evaluación ya REGISTRADA devuelve 200 sin alterar datos', function () {
    $evaluacion = crearEvaluacionTest();
    $declaraciones = generarDeclaracionesCompletas($evaluacion, 'CUMPLE_DECLARADO');
    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", [
        'respuestas' => $declaraciones,
    ])->assertStatus(200);

    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/finalizar")->assertStatus(200);

    $evaluacion->refresh();
    $fechaOriginal = $evaluacion->registrada_at;
    $hashOriginal = $evaluacion->hash_integridad;
    $payloadOriginal = $evaluacion->payload_canonico;

    // Segundo POST después de avanzar el tiempo simulado
    $this->travel(10)->minutes();

    $res2 = $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/finalizar");
    $res2->assertStatus(200)
        ->assertJson([
            'estado' => 'REGISTRADA',
            'hash_integridad' => $hashOriginal,
        ]);

    $evaluacion->refresh();
    expect($evaluacion->registrada_at->toIso8601String())->toBe($fechaOriginal->toIso8601String())
        ->and($evaluacion->hash_integridad)->toBe($hashOriginal)
        ->and($evaluacion->payload_canonico)->toEqual($payloadOriginal);
});

// 6. Bloqueo de modificación: POST checklist sobre REGISTRADA retorna 409 Conflict
test('6. Bloqueo de modificación: POST checklist sobre una autoevaluación REGISTRADA retorna 409 Conflict', function () {
    $evaluacion = crearEvaluacionTest();
    $declaraciones = generarDeclaracionesCompletas($evaluacion, 'CUMPLE_DECLARADO');
    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", [
        'respuestas' => $declaraciones,
    ])->assertStatus(200);

    $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/finalizar")->assertStatus(200);

    // Intento de modificar el checklist
    $intentoModificacion = [
        'respuestas' => [
            ['codigo' => 'CRIT-01', 'estado' => 'PENDIENTE_ATENDER', 'notas' => 'Intento ilegal'],
        ],
    ];

    $response = $this->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/checklist", $intentoModificacion);

    $response->assertStatus(409)
        ->assertJsonStructure(['error', 'mensaje']);

    $data = $response->json();
    expect($data['error'])->toBe('autoevaluacion_registrada');

    // Comprobar que en la base de datos no cambió
    $respuestaDb = RespuestaAutoevaluacion::where('autoevaluacion_id', $evaluacion->id)
        ->where('criterio_id', CriterioNormativo::where('codigo_criterio', 'CRIT-01')->value('id'))
        ->firstOrFail();
    expect($respuestaDb->estado_respuesta)->toBe('CUMPLE_DECLARADO')
        ->and($respuestaDb->notas_ciudadano)->not->toContain('Intento ilegal');
});

// 7. Hash no depende de user_id
test('7. Hash no depende de user_id: mismo contenido genera el mismo hash sin importar usuario o anónimo', function () {
    $service = app(ApplicabilityEngineService::class);

    $evalAnonima = crearEvaluacionTest([
        'user_id' => null,
    ]);
    $declaraciones = generarDeclaracionesCompletas($evalAnonima, 'CUMPLE_DECLARADO');
    $this->postJson("/autoevaluacion/{$evalAnonima->uuid_trazabilidad}/checklist", [
        'respuestas' => $declaraciones,
    ])->assertStatus(200);

    $hashAnonimo = $service->calcularHashIntegridad($evalAnonima);

    // Simular que la autoevaluación pertenece a un usuario (con su propio UUID único)
    $user = User::factory()->create();
    $evalConUsuario = crearEvaluacionTest([
        'user_id' => $user->id,
    ]);
    // Asignar mismas respuestas
    foreach (RespuestaAutoevaluacion::where('autoevaluacion_id', $evalAnonima->id)->get() as $resp) {
        RespuestaAutoevaluacion::create([
            'autoevaluacion_id' => $evalConUsuario->id,
            'criterio_id' => $resp->criterio_id,
            'estado_respuesta' => $resp->estado_respuesta,
            'notas_ciudadano' => $resp->notas_ciudadano,
        ]);
    }

    $hashUsuario = $service->calcularHashIntegridad($evalConUsuario);

    expect($hashAnonimo)->toBe($hashUsuario);
});

// 8. Hash no depende de guest_session_token
test('8. Hash no depende de guest_session_token: tokens diferentes no alteran el hash', function () {
    $service = app(ApplicabilityEngineService::class);

    $eval1 = crearEvaluacionTest([
        'session_token' => 'token_sesion_alfa_123',
    ]);
    $eval2 = crearEvaluacionTest([
        'session_token' => 'token_sesion_beta_999_completamente_diferente',
    ]);

    $criterios = CriterioNormativo::activos()->get();
    foreach ($criterios as $criterio) {
        RespuestaAutoevaluacion::create([
            'autoevaluacion_id' => $eval1->id,
            'criterio_id' => $criterio->id,
            'estado_respuesta' => 'CUMPLE_DECLARADO',
            'notas_ciudadano' => null,
        ]);
        RespuestaAutoevaluacion::create([
            'autoevaluacion_id' => $eval2->id,
            'criterio_id' => $criterio->id,
            'estado_respuesta' => 'CUMPLE_DECLARADO',
            'notas_ciudadano' => null,
        ]);
    }

    $hash1 = $service->calcularHashIntegridad($eval1);
    $hash2 = $service->calcularHashIntegridad($eval2);

    expect($hash1)->toBe($hash2)
        ->and(strlen($hash1))->toBe(64);
});

// 9. Determinismo del hash: mismo contenido genera exactamente el mismo SHA-256
test('9. Determinismo del hash: dos evaluaciones con idénticos datos y respuestas generan idéntico hash', function () {
    $service = app(ApplicabilityEngineService::class);

    $evalA = crearEvaluacionTest();
    $evalB = crearEvaluacionTest();

    $declaraciones = generarDeclaracionesCompletas($evalA, 'CUMPLE_DECLARADO');

    // Registrar en A
    $this->postJson("/autoevaluacion/{$evalA->uuid_trazabilidad}/checklist", ['respuestas' => $declaraciones])->assertStatus(200);

    // Replicar idénticas respuestas en B
    foreach (RespuestaAutoevaluacion::where('autoevaluacion_id', $evalA->id)->get() as $resp) {
        RespuestaAutoevaluacion::create([
            'autoevaluacion_id' => $evalB->id,
            'criterio_id' => $resp->criterio_id,
            'estado_respuesta' => $resp->estado_respuesta,
            'notas_ciudadano' => $resp->notas_ciudadano,
        ]);
    }

    $hashA = $service->calcularHashIntegridad($evalA);
    $hashB = $service->calcularHashIntegridad($evalB);

    expect($hashA)->toBe($hashB)
        ->and(strlen($hashA))->toBe(64);
});

// 10. Reevaluación no altera la evaluación original ni sus respuestas ni su hash
test('10. Reevaluación no altera la original: crear o registrar reevaluación no modifica la evaluación original registrada', function () {
    $evalOriginal = crearEvaluacionTest();
    $declaracionesOriginales = generarDeclaracionesCompletas($evalOriginal, 'CUMPLE_DECLARADO');

    $this->postJson("/autoevaluacion/{$evalOriginal->uuid_trazabilidad}/checklist", [
        'respuestas' => $declaracionesOriginales,
    ])->assertStatus(200);

    // Cierre formal de la original
    $this->postJson("/autoevaluacion/{$evalOriginal->uuid_trazabilidad}/finalizar")->assertStatus(200);

    $evalOriginal->refresh();
    $hashOriginal = $evalOriginal->hash_integridad;
    $fechaOriginal = $evalOriginal->registrada_at;
    $estadoOriginal = $evalOriginal->estado;

    // Crear una reevaluación referenciando la original
    $evalReevaluacion = crearEvaluacionTest([
        'evaluacion_origen_id' => $evalOriginal->id,
        'nombre_comercio' => 'Comercio Dinamico Huancayo - Reevaluación',
    ]);

    // Responder con estados diferentes en la reevaluación
    $declaracionesNuevas = generarDeclaracionesCompletas($evalReevaluacion, 'PENDIENTE_ATENDER');
    $this->postJson("/autoevaluacion/{$evalReevaluacion->uuid_trazabilidad}/checklist", [
        'respuestas' => $declaracionesNuevas,
    ])->assertStatus(200);

    // Finalizar la reevaluación
    $this->postJson("/autoevaluacion/{$evalReevaluacion->uuid_trazabilidad}/finalizar")->assertStatus(200);

    // Verificar que la evaluación original permanece 100% intacta
    $evalOriginal->refresh();
    expect($evalOriginal->estado)->toBe($estadoOriginal)
        ->and($evalOriginal->hash_integridad)->toBe($hashOriginal)
        ->and($evalOriginal->registrada_at->toIso8601String())->toBe($fechaOriginal->toIso8601String());

    // Verificar que las respuestas de la evaluación original no fueron sobreescritas
    $respuestasOriginales = RespuestaAutoevaluacion::where('autoevaluacion_id', $evalOriginal->id)->get();
    foreach ($respuestasOriginales as $resp) {
        expect($resp->estado_respuesta)->toBe('CUMPLE_DECLARADO');
    }

    // Verificar que la reevaluación tiene sus propios datos
    $evalReevaluacion->refresh();
    expect($evalReevaluacion->estado)->toBe(Autoevaluacion::ESTADO_REGISTRADA)
        ->and($evalReevaluacion->hash_integridad)->not->toBe($hashOriginal)
        ->and($evalReevaluacion->evaluacion_origen_id)->toBe($evalOriginal->id);
});

// TEST A: Snapshot persistido
test('Test A. Snapshot persistido: al finalizar se almacena payload_canonico, hash_integridad y estado REGISTRADA', function () {
    $eval = crearEvaluacionTest();
    $declaraciones = generarDeclaracionesCompletas($eval, 'CUMPLE_DECLARADO');
    $this->postJson("/autoevaluacion/{$eval->uuid_trazabilidad}/checklist", ['respuestas' => $declaraciones])->assertStatus(200);

    $this->postJson("/autoevaluacion/{$eval->uuid_trazabilidad}/finalizar")->assertStatus(200);

    $eval->refresh();
    expect($eval->estado)->toBe(Autoevaluacion::ESTADO_REGISTRADA)
        ->and($eval->payload_canonico)->not->toBeNull()
        ->and($eval->hash_integridad)->not->toBeNull()
        ->and(isset($eval->payload_canonico['establecimiento']))->toBeTrue()
        ->and(isset($eval->payload_canonico['caracteristicas']))->toBeTrue()
        ->and(isset($eval->payload_canonico['criterios']))->toBeTrue()
        ->and(count($eval->payload_canonico['criterios']))->toBe(13);
});

// TEST B: Hash corresponde exactamente al snapshot
test('Test B. Hash corresponde exactamente al snapshot: hash_integridad es SHA-256 del payload_canonico normalizado', function () {
    $service = app(ApplicabilityEngineService::class);
    $eval = crearEvaluacionTest();
    $declaraciones = generarDeclaracionesCompletas($eval, 'CUMPLE_DECLARADO');
    $this->postJson("/autoevaluacion/{$eval->uuid_trazabilidad}/checklist", ['respuestas' => $declaraciones])->assertStatus(200);

    $this->postJson("/autoevaluacion/{$eval->uuid_trazabilidad}/finalizar")->assertStatus(200);

    $eval->refresh();
    $payloadAlmacenado = $eval->payload_canonico;
    $service->normalizarArrayDeterminista($payloadAlmacenado);
    $json = (string) json_encode($payloadAlmacenado, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    expect(hash('sha256', $json))->toBe($eval->hash_integridad);
});

// TEST C: Distinto orden de inserción
test('Test C. Distinto orden de inserción: insertar respuestas en diferente orden produce idéntico snapshot y hash', function () {
    $eval1 = crearEvaluacionTest();
    $eval2 = crearEvaluacionTest();

    $declaraciones1 = generarDeclaracionesCompletas($eval1, 'CUMPLE_DECLARADO');
    // Invertir el orden de las declaraciones para la segunda evaluación
    $declaraciones2 = array_reverse($declaraciones1);

    $this->postJson("/autoevaluacion/{$eval1->uuid_trazabilidad}/checklist", ['respuestas' => $declaraciones1])->assertStatus(200);
    $this->postJson("/autoevaluacion/{$eval2->uuid_trazabilidad}/checklist", ['respuestas' => $declaraciones2])->assertStatus(200);

    $this->postJson("/autoevaluacion/{$eval1->uuid_trazabilidad}/finalizar")->assertStatus(200);
    $this->postJson("/autoevaluacion/{$eval2->uuid_trazabilidad}/finalizar")->assertStatus(200);

    $eval1->refresh();
    $eval2->refresh();

    expect($eval1->hash_integridad)->toBe($eval2->hash_integridad)
        ->and($eval1->payload_canonico)->toEqual($eval2->payload_canonico);
});

// TEST D: Distinta nota
test('Test D. Distinta nota: dos evaluaciones idénticas con distinta nota generan hashes diferentes', function () {
    $evalA = crearEvaluacionTest();
    $evalB = crearEvaluacionTest();

    $declA = generarDeclaracionesCompletas($evalA, 'CUMPLE_DECLARADO');
    $declB = generarDeclaracionesCompletas($evalB, 'CUMPLE_DECLARADO');

    // Modificar nota de CRIT-01 en B
    $declA[0]['notas'] = 'Extintor operativo';
    $declB[0]['notas'] = 'Extintor pendiente';

    $this->postJson("/autoevaluacion/{$evalA->uuid_trazabilidad}/checklist", ['respuestas' => $declA])->assertStatus(200);
    $this->postJson("/autoevaluacion/{$evalB->uuid_trazabilidad}/checklist", ['respuestas' => $declB])->assertStatus(200);

    $this->postJson("/autoevaluacion/{$evalA->uuid_trazabilidad}/finalizar")->assertStatus(200);
    $this->postJson("/autoevaluacion/{$evalB->uuid_trazabilidad}/finalizar")->assertStatus(200);

    $evalA->refresh();
    $evalB->refresh();

    expect($evalA->hash_integridad)->not->toBe($evalB->hash_integridad);
});

// TEST E: Distinta característica física
test('Test E. Distinta característica física: variar una variable condicional (usa_glp) genera hashes diferentes', function () {
    $evalConGlp = crearEvaluacionTest(['usa_glp' => true]);
    $evalSinGlp = crearEvaluacionTest(['usa_glp' => false]);

    $decl1 = generarDeclaracionesCompletas($evalConGlp, 'CUMPLE_DECLARADO');
    $decl2 = generarDeclaracionesCompletas($evalSinGlp, 'CUMPLE_DECLARADO');

    $this->postJson("/autoevaluacion/{$evalConGlp->uuid_trazabilidad}/checklist", ['respuestas' => $decl1])->assertStatus(200);
    $this->postJson("/autoevaluacion/{$evalSinGlp->uuid_trazabilidad}/checklist", ['respuestas' => $decl2])->assertStatus(200);

    $this->postJson("/autoevaluacion/{$evalConGlp->uuid_trazabilidad}/finalizar")->assertStatus(200);
    $this->postJson("/autoevaluacion/{$evalSinGlp->uuid_trazabilidad}/finalizar")->assertStatus(200);

    $evalConGlp->refresh();
    $evalSinGlp->refresh();

    expect($evalConGlp->hash_integridad)->not->toBe($evalSinGlp->hash_integridad);
});

// TEST F: Fechas diferentes
test('Test F. Fechas diferentes: evaluaciones idénticas registradas en momentos distintos generan idéntico hash', function () {
    Carbon::setTestNow('2026-01-15 09:00:00');
    $eval1 = crearEvaluacionTest();
    $decl1 = generarDeclaracionesCompletas($eval1, 'CUMPLE_DECLARADO');
    $this->postJson("/autoevaluacion/{$eval1->uuid_trazabilidad}/checklist", ['respuestas' => $decl1])->assertStatus(200);
    $this->postJson("/autoevaluacion/{$eval1->uuid_trazabilidad}/finalizar")->assertStatus(200);

    Carbon::setTestNow('2026-08-20 18:30:00');
    $eval2 = crearEvaluacionTest();
    $decl2 = generarDeclaracionesCompletas($eval2, 'CUMPLE_DECLARADO');
    $this->postJson("/autoevaluacion/{$eval2->uuid_trazabilidad}/checklist", ['respuestas' => $decl2])->assertStatus(200);
    $this->postJson("/autoevaluacion/{$eval2->uuid_trazabilidad}/finalizar")->assertStatus(200);

    Carbon::setTestNow(); // Restaurar reloj

    $eval1->refresh();
    $eval2->refresh();

    expect($eval1->registrada_at->toIso8601String())->not->toBe($eval2->registrada_at->toIso8601String())
        ->and($eval1->hash_integridad)->toBe($eval2->hash_integridad);
});

// TEST G: Snapshot independiente del catálogo futuro
test('Test G. Snapshot independiente del catálogo futuro: el snapshot persistido permite reconstruir el payload y hash sin reevaluar', function () {
    $service = app(ApplicabilityEngineService::class);
    $eval = crearEvaluacionTest();
    $declaraciones = generarDeclaracionesCompletas($eval, 'CUMPLE_DECLARADO');
    $this->postJson("/autoevaluacion/{$eval->uuid_trazabilidad}/checklist", ['respuestas' => $declaraciones])->assertStatus(200);
    $this->postJson("/autoevaluacion/{$eval->uuid_trazabilidad}/finalizar")->assertStatus(200);

    $eval->refresh();
    $hashOriginal = $eval->hash_integridad;
    $snapshotOriginal = $eval->payload_canonico;

    // Verificar que generarPayloadCanonico para una autoevaluación REGISTRADA
    // devuelve el snapshot persistido sin depender de una nueva evaluación
    $payloadRecuperado = $service->generarPayloadCanonico($eval);
    expect($payloadRecuperado)->toEqual($snapshotOriginal);

    // Y el cálculo de hash sobre la autoevaluación registrada reproduce con total exactitud el hash_integridad
    $hashRecalculado = $service->calcularHashIntegridad($eval);
    expect($hashRecalculado)->toBe($hashOriginal);
});
