<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use App\Services\ItseRiskService;

function payloadPaso1Base(array $overrides = []): array
{
    return array_merge([
        'nombre_comercio' => 'Librería Central Huancayo',
        'funcion_economica' => 'Comercio',
        'sector' => 'Huancayo Centro',
        'ruc' => null,
        'direccion' => null,
        'referencia' => null,
        'area_m2' => null,
        'pisos' => null,
        'aforo' => null,
        'usa_glp' => false,
        'galones_glp' => null,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ],
    ], $overrides);
}

it('permite registrar la autoevaluacion sin RUC y no inventa datos de RUC', function () {
    $response = $this->post(route('autoevaluacion.store'), payloadPaso1Base(['ruc' => null]));

    $response->assertSessionHasNoErrors();
    $evaluacion = Autoevaluacion::firstOrFail();

    expect($evaluacion->ruc)->toBeNull()
        ->and($evaluacion->nombre_comercio)->toBe('Librería Central Huancayo');
});

it('permite registrar la autoevaluacion con RUC valido de 11 digitos que inicia con 10 o 20', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base(['ruc' => '20601234567']))
        ->assertSessionHasNoErrors();

    expect(Autoevaluacion::firstOrFail()->ruc)->toBe('20601234567');
});

it('rechaza el envio si se ingresa un RUC invalido', function () {
    $response = $this->post(route('autoevaluacion.store'), payloadPaso1Base(['ruc' => '12345678901']));

    $response->assertSessionHasErrors(['ruc']);
    expect(Autoevaluacion::count())->toBe(0);
});

it('permite guardar la autoevaluacion sin area, pisos ni aforo y no inventa valores por defecto', function () {
    $response = $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'area_m2' => null,
        'pisos' => null,
        'aforo' => null,
    ]));

    $response->assertSessionHasNoErrors();
    $evaluacion = Autoevaluacion::firstOrFail();

    expect($evaluacion->area_m2)->toBeNull()
        ->and($evaluacion->pisos)->toBeNull()
        ->and($evaluacion->aforo)->toBeNull();
});

it('persiste correctamente las caracteristicas fisicas cuando el ciudadano las declara voluntariamente', function () {
    $response = $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'area_m2' => 85.5,
        'pisos' => 2,
        'aforo' => 20,
        'usa_glp' => true,
        'galones_glp' => 10,
    ]));

    $response->assertSessionHasNoErrors();
    $evaluacion = Autoevaluacion::firstOrFail();

    expect((float) $evaluacion->area_m2)->toBe(85.5)
        ->and($evaluacion->pisos)->toBe(2)
        ->and($evaluacion->aforo)->toBe(20)
        ->and($evaluacion->caracteristicas_declaradas)->toBeArray()
        ->and($evaluacion->caracteristicas_declaradas['area_m2'])->toBe(85.5)
        ->and($evaluacion->caracteristicas_declaradas['pisos'])->toBe(2)
        ->and($evaluacion->caracteristicas_declaradas['aforo'])->toBe(20)
        ->and($evaluacion->caracteristicas_declaradas['usa_glp'])->toBeTrue();
});

it('exige el nombre del establecimiento comercial de forma obligatoria', function () {
    $response = $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'nombre_comercio' => '',
    ]));

    $response->assertSessionHasErrors(['nombre_comercio']);
    expect(Autoevaluacion::count())->toBe(0);
});

it('acepta direccion y referencia como campos opcionales sin obligatoriedad', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'direccion' => null,
        'referencia' => null,
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::firstOrFail();
    expect($evaluacion->direccion)->toBeNull()
        ->and($evaluacion->referencia)->toBeNull();
});

it('permite registrar la autoevaluacion sin sector territorial y no inventa datos de sector', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'sector' => null,
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::firstOrFail();
    expect($evaluacion->sector_huancayo)->toBeNull();
});

it('trata cadenas vacias de campos opcionales como null y no genera ceros ni textos por defecto', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'ruc' => '',
        'sector' => '',
        'direccion' => '',
        'referencia' => '',
        'area_m2' => '',
        'pisos' => '',
        'aforo' => '',
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::firstOrFail();
    expect($evaluacion->ruc)->toBeNull()
        ->and($evaluacion->sector_huancayo)->toBeNull()
        ->and($evaluacion->direccion)->toBeNull()
        ->and($evaluacion->referencia)->toBeNull()
        ->and($evaluacion->area_m2)->toBeNull()
        ->and($evaluacion->pisos)->toBeNull()
        ->and($evaluacion->aforo)->toBeNull();
});

it('permite registrar sin responder caracteristicas especiales y conserva null sin inventar false o cero', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'usa_glp' => null,
        'galones_glp' => null,
        'usa_caldero' => null,
        'usa_liquidos_inflamables' => null,
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::firstOrFail();
    expect($evaluacion->usa_glp)->toBeNull()
        ->and($evaluacion->galones_glp)->toBeNull()
        ->and($evaluacion->usa_caldero)->toBeNull()
        ->and($evaluacion->usa_liquidos_inflamables)->toBeNull();
});

it('distingue correctamente declaracion afirmativa, negativa y no respondida de caracteristicas especiales', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'usa_glp' => true,
        'galones_glp' => 15.5,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => null,
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::firstOrFail();
    expect($evaluacion->usa_glp)->toBeTrue()
        ->and((float) $evaluacion->galones_glp)->toBe(15.5)
        ->and($evaluacion->usa_caldero)->toBeFalse()
        ->and($evaluacion->usa_liquidos_inflamables)->toBeNull();
});

it('mantiene la inmutabilidad de la evaluacion A y asegura la topologia de estrella A -> [B, C] prohibiendo encadenamiento A -> B -> C', function () {
    $token = 'invitado_estrella_123456';

    // 1. Crear evaluación raíz A
    $this->withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.store'), payloadPaso1Base([
            'nombre_comercio' => 'Comercio Estrella',
            'checklist' => [
                ['codigo' => 'EXTINTOR_PQS', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => true],
            ],
        ]))->assertSessionHasNoErrors();

    $evaluacionA = Autoevaluacion::latest('id')->firstOrFail();
    $evaluacionA->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
    ]);
    $aHashOriginal = $evaluacionA->hash_integridad;
    $aDetalleOriginal = $evaluacionA->detalle_checklist;

    // 2. Crear reevaluación B a partir de A
    $this->withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadPaso1Base([
            'checklist' => [
                ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ],
        ]))->assertSessionHasNoErrors();

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();
    $evaluacionB->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
    ]);

    // 3. Crear reevaluación C a partir de B (NO debe encadenarse A -> B -> C, sino apuntar a la raíz A -> C)
    $this->withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionB->uuid_trazabilidad]), payloadPaso1Base([
            'checklist' => [
                ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ],
        ]))->assertSessionHasNoErrors();

    $evaluacionC = Autoevaluacion::latest('id')->firstOrFail();

    // Verificaciones de inmutabilidad y topología de estrella
    $aRecargada = $evaluacionA->fresh();
    $bRecargada = $evaluacionB->fresh();

    expect($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id)
        ->and($evaluacionC->evaluacion_origen_id)->toBe($evaluacionA->id) // Estrella: C apunta a A, NO a B
        ->and($evaluacionC->evaluacion_origen_id)->not->toBe($evaluacionB->id) // Prohibición de encadenamiento
        ->and($aRecargada->hash_integridad)->toBe($aHashOriginal) // Inmutabilidad de A
        ->and($aRecargada->detalle_checklist)->toBe($aDetalleOriginal)
        ->and($bRecargada->id)->toBe($evaluacionB->id);
});

it('rechaza con 403 la reevaluacion de usuarios no autorizados por session_token o user_id', function () {
    $tokenAutorizado = 'token_autorizado_789';
    $tokenNoAutorizado = 'token_impostor_999';

    // Evaluación con token de invitado
    $this->withCookie('guest_session_token', $tokenAutorizado)
        ->post(route('autoevaluacion.store'), payloadPaso1Base())
        ->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();

    // Intento con token distinto
    $this->withCookie('guest_session_token', $tokenNoAutorizado)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacion->uuid_trazabilidad]), payloadPaso1Base())
        ->assertForbidden();

    // Intento sin token
    $this->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacion->uuid_trazabilidad]), payloadPaso1Base())
        ->assertForbidden();
});

it('precarga en reevaluacion sin inventar datos que la evaluacion original no tenia', function () {
    $token = 'token_precarga_sin_inventar';

    $this->withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.store'), payloadPaso1Base([
            'ruc' => null,
            'area_m2' => null,
            'pisos' => null,
            'aforo' => null,
            'direccion' => null,
            'referencia' => null,
            'usa_glp' => null,
            'galones_glp' => null,
            'usa_caldero' => null,
            'usa_liquidos_inflamables' => null,
        ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();
    $evaluacion->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
    ]);

    $response = $this->withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.reevaluar', ['uuid' => $evaluacion->uuid_trazabilidad]));

    $response->assertOk();
    $pageProps = $response->viewData('page')['props']['reevaluacionDe'];

    expect($pageProps['ruc'])->toBeNull()
        ->and($pageProps['area_m2'])->toBeNull()
        ->and($pageProps['pisos'])->toBeNull()
        ->and($pageProps['aforo'])->toBeNull()
        ->and($pageProps['direccion'])->toBeNull()
        ->and($pageProps['referencia'])->toBeNull()
        ->and($pageProps['usa_glp'])->toBeNull()
        ->and($pageProps['galones_glp'])->toBeNull()
        ->and($pageProps['usa_caldero'])->toBeNull()
        ->and($pageProps['usa_liquidos_inflamables'])->toBeNull();
});

it('audita coherencia entre la declaracion de uso de GLP y la cantidad declarada', function (
    array $payload,
    ?bool $esperado_usa_glp,
    ?float $esperado_galones,
    bool $declara_usa_glp,
    bool $declara_galones
) {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base($payload))
        ->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();
    $declaradas = $evaluacion->caracteristicas_declaradas ?? [];
    $galones = $evaluacion->galones_glp;

    expect($evaluacion->usa_glp)->toBe($esperado_usa_glp)
        ->and($galones === null ? null : (float) $galones)->toBe($esperado_galones);

    if ($declara_usa_glp) {
        expect($declaradas['usa_glp'])->toBe($esperado_usa_glp);
    } else {
        expect(array_key_exists('usa_glp', $declaradas))->toBeFalse();
    }

    if ($declara_galones) {
        expect((float) $declaradas['galones_glp'])->toBe($esperado_galones);
    } else {
        expect(array_key_exists('galones_glp', $declaradas))->toBeFalse();
    }
})->with([
    'usa_glp null y galones null' => [
        'payload' => ['usa_glp' => null, 'galones_glp' => null],
        'esperado_usa_glp' => null,
        'esperado_galones' => null,
        'declara_usa_glp' => false,
        'declara_galones' => false,
    ],
    'usa_glp false y galones null' => [
        'payload' => ['usa_glp' => false, 'galones_glp' => null],
        'esperado_usa_glp' => false,
        'esperado_galones' => null,
        'declara_usa_glp' => true,
        'declara_galones' => false,
    ],
    'usa_glp true y galones null' => [
        'payload' => ['usa_glp' => true, 'galones_glp' => null],
        'esperado_usa_glp' => true,
        'esperado_galones' => null,
        'declara_usa_glp' => true,
        'declara_galones' => false,
    ],
    'usa_glp true con cantidad positiva' => [
        'payload' => ['usa_glp' => true, 'galones_glp' => 25.5],
        'esperado_usa_glp' => true,
        'esperado_galones' => 25.5,
        'declara_usa_glp' => true,
        'declara_galones' => true,
    ],
    'usa_glp false con cantidad positiva se normaliza a null evitando contradicciones' => [
        'payload' => ['usa_glp' => false, 'galones_glp' => 20.0],
        'esperado_usa_glp' => false,
        'esperado_galones' => null,
        'declara_usa_glp' => true,
        'declara_galones' => false,
    ],
]);

it('audita coherencia de GLP: caso 6 (cambio de true a false durante una reevaluacion limpia galones_glp a null)', function () {
    $token = 'token_reevaluacion_glp_coherencia';

    // 1. Evaluación A: usa_glp = true con 50 galones
    $this->withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.store'), payloadPaso1Base([
            'usa_glp' => true,
            'galones_glp' => 50.0,
        ]))->assertSessionHasNoErrors();

    $evaluacionA = Autoevaluacion::latest('id')->firstOrFail();
    $evaluacionA->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
    ]);
    expect($evaluacionA->usa_glp)->toBeTrue()
        ->and((float) $evaluacionA->galones_glp)->toBe(50.0);

    // 2. Reevaluación B: el ciudadano declara que ya no usa GLP (usa_glp = false)
    $this->withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadPaso1Base([
            'usa_glp' => false,
            'galones_glp' => 50.0, // Payload residual que debe descartarse
        ]))->assertSessionHasNoErrors();

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    // Verificaciones:
    // A permanece inmutable con sus 50 galones
    $aRecargada = $evaluacionA->fresh();
    expect($aRecargada->usa_glp)->toBeTrue()
        ->and((float) $aRecargada->galones_glp)->toBe(50.0);

    // B tiene usa_glp = false y galones_glp = null
    expect($evaluacionB->usa_glp)->toBeFalse()
        ->and($evaluacionB->galones_glp)->toBeNull()
        ->and($evaluacionB->caracteristicas_declaradas['usa_glp'])->toBeFalse()
        ->and(array_key_exists('galones_glp', $evaluacionB->caracteristicas_declaradas ?? []))->toBeFalse();
});

it('persiste tipo_tramite y nivel_riesgo como null en nuevas autoevaluaciones sin ejecutar clasificarTramite', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'area_m2' => 120.0,
        'pisos' => 1,
        'aforo' => 20,
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();

    expect($evaluacion->tipo_tramite)->toBeNull()
        ->and($evaluacion->nivel_riesgo)->toBeNull();

    $this->assertDatabaseHas('autoevaluaciones', [
        'id' => $evaluacion->id,
        'tipo_tramite' => null,
        'nivel_riesgo' => null,
    ]);
});

it('no genera clasificacion administrativa ni de riesgo independientemente de escala o caracteristicas agravantes', function () {
    // Escala grande y factores que antes disparaban EX_ANTE y ALTO_MUY_ALTO:
    // area > 750, pisos > 3, aforo > 100, glp > 118 gal, caldero = true, liquidos = true
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'area_m2' => 1500.0,
        'pisos' => 5,
        'aforo' => 350,
        'usa_glp' => true,
        'galones_glp' => 250.0,
        'usa_caldero' => true,
        'usa_liquidos_inflamables' => true,
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();

    // Verificamos que NUNCA se clasificó administrativamente
    expect($evaluacion->tipo_tramite)->toBeNull()
        ->and($evaluacion->nivel_riesgo)->toBeNull()
        ->and($evaluacion->tipo_tramite)->not->toBe('EX_ANTE')
        ->and($evaluacion->nivel_riesgo)->not->toBe('ALTO_MUY_ALTO');
});

it('las reevaluaciones tampoco ejecutan clasificacion heredada y persisten tipo_tramite y nivel_riesgo como null', function () {
    $token = 'token_reevaluacion_sin_clasificacion';

    // 1. Evaluación original
    $this->withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.store'), payloadPaso1Base([
            'area_m2' => 100.0,
        ]))->assertSessionHasNoErrors();

    $evaluacionA = Autoevaluacion::latest('id')->firstOrFail();
    $evaluacionA->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
    ]);
    expect($evaluacionA->tipo_tramite)->toBeNull()
        ->and($evaluacionA->nivel_riesgo)->toBeNull();

    // 2. Reevaluación con escala mayor
    $this->withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadPaso1Base([
            'area_m2' => 900.0,
            'pisos' => 4,
        ]))->assertSessionHasNoErrors();

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    expect($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id)
        ->and($evaluacionB->tipo_tramite)->toBeNull()
        ->and($evaluacionB->nivel_riesgo)->toBeNull();
});

it('mantiene clasificarTramite aislado en ItseRiskService como metodo de servicio sin dependencia en el flujo activo', function () {
    $service = new ItseRiskService;

    // El servicio calcula de forma pura y aislada cuando es invocado explícitamente
    $exPost = $service->clasificarTramite('Comercio', 100.0, 1, 20);
    expect($exPost['tipo_tramite'])->toBe('EX_POST')
        ->and($exPost['nivel_riesgo'])->toBe('BAJO_MEDIO');

    $exAnte = $service->clasificarTramite('Comercio', 900.0, 4, 150);
    expect($exAnte['tipo_tramite'])->toBe('EX_ANTE')
        ->and($exAnte['nivel_riesgo'])->toBe('ALTO_MUY_ALTO');
});

it('persiste plan_accion_costos como null en nuevas autoevaluaciones sin generar presupuestos ni plazos', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => true],
            ['codigo' => 'SENALETICA', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
        ],
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();

    // No traslada costos, presupuestos ni plazos oficiales al nuevo alcance cívico
    expect($evaluacion->plan_accion_costos)->toBeNull();

    $this->assertDatabaseHas('autoevaluaciones', [
        'id' => $evaluacion->id,
        'plan_accion_costos' => null,
    ]);
});

it('acepta los nuevos estados de la plataforma civica CUMPLE_DECLARADO, PENDIENTE_ATENDER, POR_REVISAR y NO_APLICA', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE_DECLARADO', 'es_critico' => true],
            ['codigo' => 'BOTIQUIN', 'cumple' => false, 'estado' => 'PENDIENTE_ATENDER', 'es_critico' => false],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'POR_REVISAR', 'es_critico' => false],
            ['codigo' => 'EXTINTOR_K', 'cumple' => true, 'estado' => 'NO_APLICA', 'es_critico' => false],
        ],
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();

    // NO_APLICA no es evaluable: total evaluables = 3 (EXTINTOR_PQS, BOTIQUIN, LUCES_EMERG).
    // Cumplidos = 1 (EXTINTOR_PQS). Porcentaje = 1/3 = 33.3% -> ROJO
    expect($evaluacion->porcentaje_cumplimiento)->toBe(33.3)
        ->and($evaluacion->semaforo)->toBe('ROJO')
        ->and($evaluacion->plan_accion_costos)->toBeNull();
});

it('mantiene generarPlanDeAccion aislado en ItseRiskService como metodo de servicio legado', function () {
    $service = new ItseRiskService;

    $plan = $service->generarPlanDeAccion([
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => true],
    ]);

    expect($plan['total_items'])->toBe(1)
        ->and($plan['costo_total'])->toBe(65.0);
});

it('persiste correctamente las variables canonicas de condicion fisica en caracteristicas_declaradas y no inventa datos cuando son null', function () {
    // 1. Envío declarando valores específicos
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => null,
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();

    expect($evaluacion->tiene_equipos_fritura)->toBeTrue()
        ->and($evaluacion->tiene_escaleras)->toBeFalse()
        ->and($evaluacion->tiene_estanterias_altas)->toBeNull()
        ->and($evaluacion->caracteristicas_declaradas['tiene_equipos_fritura'])->toBeTrue()
        ->and($evaluacion->caracteristicas_declaradas['tiene_escaleras'])->toBeFalse()
        ->and(array_key_exists('tiene_estanterias_altas', $evaluacion->caracteristicas_declaradas ?? []))->toBeFalse();
});

it('valida estrictamente true, false y null para cada variable de condicion fisica', function () {
    // 1. tiene_equipos_fritura = false, tiene_escaleras = true, tiene_estanterias_altas = false
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'tiene_equipos_fritura' => false,
        'tiene_escaleras' => true,
        'tiene_estanterias_altas' => false,
    ]))->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();
    expect($evaluacion->tiene_equipos_fritura)->toBeFalse()
        ->and($evaluacion->tiene_escaleras)->toBeTrue()
        ->and($evaluacion->tiene_estanterias_altas)->toBeFalse();

    // 2. Todas en null (ausencia legítima de información)
    $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'tiene_equipos_fritura' => null,
        'tiene_escaleras' => null,
        'tiene_estanterias_altas' => null,
    ]))->assertSessionHasNoErrors();

    $evaluacionNull = Autoevaluacion::latest('id')->firstOrFail();
    expect($evaluacionNull->tiene_equipos_fritura)->toBeNull()
        ->and($evaluacionNull->tiene_escaleras)->toBeNull()
        ->and($evaluacionNull->tiene_estanterias_altas)->toBeNull()
        ->and(array_key_exists('tiene_equipos_fritura', $evaluacionNull->caracteristicas_declaradas ?? []))->toBeFalse()
        ->and(array_key_exists('tiene_escaleras', $evaluacionNull->caracteristicas_declaradas ?? []))->toBeFalse()
        ->and(array_key_exists('tiene_estanterias_altas', $evaluacionNull->caracteristicas_declaradas ?? []))->toBeFalse();
});

it('rechaza valores arbitrarios o invalidos como "abc" para las variables de condicion fisica y no los convierte a null', function () {
    // 1. tiene_equipos_fritura = "abc"
    $responseFritura = $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'tiene_equipos_fritura' => 'abc',
    ]));
    $responseFritura->assertSessionHasErrors(['tiene_equipos_fritura']);

    // 2. tiene_escaleras = "foo"
    $responseEscaleras = $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'tiene_escaleras' => 'foo',
    ]));
    $responseEscaleras->assertSessionHasErrors(['tiene_escaleras']);

    // 3. tiene_estanterias_altas = "invalido"
    $responseEstanterias = $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'tiene_estanterias_altas' => 'invalido',
    ]));
    $responseEstanterias->assertSessionHasErrors(['tiene_estanterias_altas']);

    $responseTexto = $this->post(route('autoevaluacion.store'), payloadPaso1Base([
        'tiene_equipos_fritura' => 'si',
        'tiene_escaleras' => 'no',
    ]));
    $responseTexto->assertSessionHasErrors(['tiene_equipos_fritura', 'tiene_escaleras']);
});

it('genera automaticamente un codigo_acceso con formato CHK-XXXXXX y alfabeto de 31 caracteres al crear autoevaluacion', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base())
        ->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();

    expect($evaluacion->codigo_acceso)->not->toBeNull()
        ->and(strlen($evaluacion->codigo_acceso))->toBe(10)
        ->and($evaluacion->codigo_acceso)->toStartWith('CHK-');

    $sufijo = substr($evaluacion->codigo_acceso, 4);
    expect(strlen($sufijo))->toBe(6);

    // Alfabeto permitido: 31 caracteres (excluye 0, 1, I, L, O)
    $alfabetoPermitido = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    for ($i = 0; $i < strlen($sufijo); $i++) {
        expect(str_contains($alfabetoPermitido, $sufijo[$i]))->toBeTrue();
    }

    // Exclusiones explícitas
    expect($sufijo)->not->toContain('0')
        ->and($sufijo)->not->toContain('1')
        ->and($sufijo)->not->toContain('I')
        ->and($sufijo)->not->toContain('L')
        ->and($sufijo)->not->toContain('O');
});

it('garantiza la unicidad de codigo_acceso entre diferentes autoevaluaciones', function () {
    $codigos = [];
    for ($i = 0; $i < 5; $i++) {
        $this->post(route('autoevaluacion.store'), payloadPaso1Base([
            'nombre_comercio' => 'Comercio Unicidad '.$i,
        ]))->assertSessionHasNoErrors();

        $evaluacion = Autoevaluacion::latest('id')->firstOrFail();
        $codigos[] = $evaluacion->codigo_acceso;
    }

    expect(count($codigos))->toBe(5)
        ->and(count(array_unique($codigos)))->toBe(5);
});

it('codigo_acceso permanece inmutable al actualizar o registrar la autoevaluacion', function () {
    $this->post(route('autoevaluacion.store'), payloadPaso1Base())
        ->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();
    $codigoOriginal = $evaluacion->codigo_acceso;

    // Simular registro y vinculación
    $evaluacion->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
        'user_id' => User::factory()->create()->id,
    ]);

    $evaluacionRecargada = $evaluacion->fresh();
    expect($evaluacionRecargada->codigo_acceso)->toBe($codigoOriginal);
});
