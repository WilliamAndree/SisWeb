<?php

use App\Models\Autoevaluacion;
use App\Models\PlanoEstablecimiento;
use App\Models\User;
use App\Models\VersionPlano;
use App\Services\Espacio\GestionEspacialService;
use Illuminate\Support\Str;

/**
 * Helper para crear una autoevaluación válida con hash inicial sellado.
 */
function helperCrearEvaluacionConSello(array $atributos = []): Autoevaluacion
{
    $uuid = (string) Str::uuid();
    $sessionToken = bin2hex(random_bytes(32));

    $evaluacion = Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => $uuid,
        'session_token' => $sessionToken,
        'codigo_acceso' => 'CHK-'.strtoupper(Str::random(6)),
        'nombre_comercio' => 'Bodega Mantaro Test',
        'funcion_economica' => 'COMERCIO_ABARROTES',
        'ruc' => '20123456789',
        'distrito' => 'Huancayo',
        'direccion' => 'Jr. Real 450',
        'sector_huancayo' => 'Huancayo Cercado',
        'area_m2' => 85.00,
        'pisos' => 1,
        'aforo' => 15,
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'porcentaje_cumplimiento' => 80.0,
        'semaforo' => 'AMBAR',
        'registrada_at' => now(),
        'payload_canonico' => [
            'uuid' => $uuid,
            'nombre' => 'Bodega Mantaro Test',
            'version' => 1,
        ],
        'hash_integridad' => hash('sha256', 'mock_payload_canonico_fase3'),
        'detalle_checklist' => [
            ['codigo' => 'CRIT-01', 'estado' => 'PENDIENTE_ATENDER', 'cumple' => false],
        ],
    ], $atributos));

    return $evaluacion;
}

test('1. Inicializar y crear plano asociado a autoevaluación', function () {
    $evaluacion = helperCrearEvaluacionConSello();
    $service = app(GestionEspacialService::class);

    $plano = $service->obtenerOInicializarPlano($evaluacion);

    expect($plano)->toBeInstanceOf(PlanoEstablecimiento::class)
        ->and($plano->autoevaluacion_id)->toBe($evaluacion->id)
        ->and($plano->uuid_plano)->not->toBeEmpty()
        ->and($plano->estado)->toBe(PlanoEstablecimiento::ESTADO_BORRADOR);
});

test('2. Crear niveles y ambientes rectangulares con cálculo automático de área', function () {
    $evaluacion = helperCrearEvaluacionConSello();
    $service = app(GestionEspacialService::class);
    $plano = $service->obtenerOInicializarPlano($evaluacion);

    $geometria = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'nombre' => 'Piso 1 - Ventas',
                'altura_metros' => 2.80,
                'ambientes' => [
                    [
                        'codigo' => 'AMB-01',
                        'nombre' => 'Salón Comercial',
                        'uso' => 'ATENCION_PUBLICO',
                        'ancho_metros' => 5.00,
                        'largo_metros' => 8.00,
                        'posicion_x' => 0.00,
                        'posicion_y' => 0.00,
                        'origen_dimensiones' => 'MEDIDO_HUINCHA',
                    ],
                ],
                'conectores' => [
                    [
                        'tipo' => 'PUERTA_SALIDA',
                        'ancho_metros' => 1.00,
                        'conduce_a_salida_publica' => true,
                        'ambiente_origen_codigo' => 'AMB-01',
                        'posicion_x' => 2.50,
                        'posicion_y' => 0.00,
                    ],
                ],
            ],
        ],
    ];

    $version = $service->crearOActualizarVersion($plano, $geometria);

    expect($version)->toBeInstanceOf(VersionPlano::class)
        ->and($version->numero_version)->toBe(1)
        ->and($version->niveles)->toHaveCount(1);

    $nivel = $version->niveles->first();
    expect($nivel->numero_piso)->toBe(1)
        ->and($nivel->ambientes)->toHaveCount(1);

    $ambiente = $nivel->ambientes->first();
    expect($ambiente->codigo)->toBe('AMB-01')
        ->and($ambiente->area_m2)->toBe(40.00) // 5.00 * 8.00
        ->and($ambiente->vertices_poligono)->toHaveCount(4);
});

test('3. Crear ambientes con geometría poligonal en L mediante fórmula de Shoelace', function () {
    $service = app(GestionEspacialService::class);

    // Polígono en forma de L ortogonal:
    // (0,0) -> (7,0) -> (7,4) -> (4,4) -> (4,9) -> (0,9)
    // Área teórica = (7x4) + (4x5) = 28 + 20 = 48 m²
    $verticesL = [
        ['x' => 0.0, 'y' => 0.0],
        ['x' => 7.0, 'y' => 0.0],
        ['x' => 7.0, 'y' => 4.0],
        ['x' => 4.0, 'y' => 4.0],
        ['x' => 4.0, 'y' => 9.0],
        ['x' => 0.0, 'y' => 9.0],
    ];

    $areaCalculada = GestionEspacialService::calcularAreaPoligono($verticesL);
    expect($areaCalculada)->toBe(48.00);

    $evaluacion = helperCrearEvaluacionConSello();
    $plano = $service->obtenerOInicializarPlano($evaluacion);

    $geometria = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'nombre' => 'Piso 1 - Galería',
                'ambientes' => [
                    [
                        'codigo' => 'AMB-L',
                        'nombre' => 'Salón en L',
                        'uso' => 'ATENCION_PUBLICO',
                        'posicion_x' => 0.0,
                        'posicion_y' => 0.0,
                        'vertices_poligono' => $verticesL,
                    ],
                ],
            ],
        ],
    ];

    $version = $service->crearOActualizarVersion($plano, $geometria);
    $amb = $version->niveles->first()->ambientes->first();

    expect($amb->area_m2)->toBe(48.00)
        ->and($amb->vertices_poligono)->toHaveCount(6);
});

test('4. Rechazar geometría inválida con dimensiones negativas o polígonos autointersecados', function () {
    $service = app(GestionEspacialService::class);
    $evaluacion = helperCrearEvaluacionConSello();
    $plano = $service->obtenerOInicializarPlano($evaluacion);

    // Dimensiones negativas
    $geometriaInvalida1 = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'ambientes' => [
                    [
                        'codigo' => 'AMB-NEG',
                        'nombre' => 'Negativo',
                        'ancho_metros' => -4.0,
                        'largo_metros' => 5.0,
                    ],
                ],
            ],
        ],
    ];

    expect(fn () => $service->crearOActualizarVersion($plano, $geometriaInvalida1))
        ->toThrow(InvalidArgumentException::class);

    // Polígono con autointersección (forma de ocho en moño)
    $verticesAutointerseccion = [
        ['x' => 0.0, 'y' => 0.0],
        ['x' => 4.0, 'y' => 4.0],
        ['x' => 0.0, 'y' => 4.0],
        ['x' => 4.0, 'y' => 0.0],
    ];

    $geometriaInvalida2 = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'ambientes' => [
                    [
                        'codigo' => 'AMB-CRUZ',
                        'nombre' => 'Cruzado',
                        'vertices_poligono' => $verticesAutointerseccion,
                    ],
                ],
            ],
        ],
    ];

    expect(fn () => $service->crearOActualizarVersion($plano, $geometriaInvalida2))
        ->toThrow(InvalidArgumentException::class);
});

test('5. Guardar conectores de circulación distinguiendo puertas interiores y salidas públicas', function () {
    $service = app(GestionEspacialService::class);
    $evaluacion = helperCrearEvaluacionConSello();
    $plano = $service->obtenerOInicializarPlano($evaluacion);

    $plantillaTrastienda = $service->obtenerPlantillas()['CON_TRASTIENDA']['geometria'];
    $version = $service->crearOActualizarVersion($plano, $plantillaTrastienda);

    $conectores = $version->niveles->first()->conectores;
    expect($conectores)->toHaveCount(2);

    $salida = $conectores->firstWhere('tipo', 'PUERTA_SALIDA');
    $interior = $conectores->firstWhere('tipo', 'PUERTA_INTERIOR');

    expect($salida)->not->toBeNull()
        ->and($salida->esSalidaExterior())->toBeTrue()
        ->and($salida->ancho_metros)->toBe(1.20)
        ->and($interior)->not->toBeNull()
        ->and($interior->esSalidaExterior())->toBeFalse()
        ->and($interior->ancho_metros)->toBe(0.90);
});

test('6. Crear y asociar elementos espaciales (extintores, luces, tableros, obstáculos)', function () {
    $service = app(GestionEspacialService::class);
    $evaluacion = helperCrearEvaluacionConSello();
    $plano = $service->obtenerOInicializarPlano($evaluacion);

    $geometria = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'ambientes' => [
                    [
                        'codigo' => 'AMB-SEG',
                        'nombre' => 'Salón Protegido',
                        'ancho_metros' => 6.0,
                        'largo_metros' => 6.0,
                        'elementos' => [
                            ['tipo' => 'EXTINTOR', 'posicion_x' => 1.0, 'posicion_y' => 0.5, 'observacion' => 'PQS 6kg'],
                            ['tipo' => 'LUZ_EMERGENCIA', 'posicion_x' => 3.0, 'posicion_y' => 0.1, 'observacion' => 'Autónoma LED'],
                            ['tipo' => 'TABLERO_ELECTRICO', 'posicion_x' => 5.5, 'posicion_y' => 2.0, 'observacion' => 'TG con diferencial'],
                            ['tipo' => 'OBSTACULO', 'posicion_x' => 2.0, 'posicion_y' => 4.0, 'observacion' => 'Fardo mercadería temporal'],
                        ],
                    ],
                ],
            ],
        ],
    ];

    $version = $service->crearOActualizarVersion($plano, $geometria);
    $amb = $version->niveles->first()->ambientes->first();

    expect($amb->elementos)->toHaveCount(4);
    expect($amb->elementos->pluck('tipo')->all())->toContain('EXTINTOR', 'LUZ_EMERGENCIA', 'TABLERO_ELECTRICO', 'OBSTACULO');
});

test('7. Versionado inmutable: modificación de versión cerrada arroja LogicException', function () {
    $service = app(GestionEspacialService::class);
    $evaluacion = helperCrearEvaluacionConSello();
    $plano = $service->obtenerOInicializarPlano($evaluacion);

    $plantilla1 = $service->obtenerPlantillas()['RECTANGULAR_SIMPLE']['geometria'];
    $version1 = $service->crearOActualizarVersion($plano, $plantilla1);

    // Guardar una segunda versión distinta para que la primera se cierre
    $plantilla2 = $service->obtenerPlantillas()['CON_TRASTIENDA']['geometria'];
    $version2 = $service->crearOActualizarVersion($plano, $plantilla2);

    $version1Refrescada = VersionPlano::find($version1->id);
    expect($version1Refrescada->estaCerrada())->toBeTrue()
        ->and($version2->numero_version)->toBe(2);

    // Intentar modificar directamente la geometría de la versión cerrada 1
    expect(function () use ($version1Refrescada) {
        $version1Refrescada->geometria_normalizada = ['hack' => true];
        $version1Refrescada->save();
    })->toThrow(LogicException::class);
});

test('8. Idempotencia y cálculo determinista de hash SHA-256', function () {
    $service = app(GestionEspacialService::class);
    $evaluacion = helperCrearEvaluacionConSello();
    $plano = $service->obtenerOInicializarPlano($evaluacion);

    $plantilla = $service->obtenerPlantillas()['RECTANGULAR_SIMPLE']['geometria'];

    $v1 = $service->crearOActualizarVersion($plano, $plantilla);
    $hash1 = $v1->hash_geometria_sha256;

    expect($service->verificarIntegridadVersion($v1))->toBeTrue();

    // Guardar exactamente la misma geometría no duplica versiones
    $v2 = $service->crearOActualizarVersion($plano, $plantilla);

    expect($v2->id)->toBe($v1->id)
        ->and($v2->numero_version)->toBe(1)
        ->and($v2->hash_geometria_sha256)->toBe($hash1);
});

test('9. El croquis y su versionado NO alteran el payload_canonico ni el hash_integridad inicial', function () {
    $evaluacion = helperCrearEvaluacionConSello();
    $hashOriginal = $evaluacion->hash_integridad;
    $payloadOriginal = $evaluacion->payload_canonico;

    $service = app(GestionEspacialService::class);
    $plano = $service->obtenerOInicializarPlano($evaluacion);

    $service->crearOActualizarVersion($plano, $service->obtenerPlantillas()['RECTANGULAR_SIMPLE']['geometria']);
    $service->crearOActualizarVersion($plano, $service->obtenerPlantillas()['CON_TRASTIENDA']['geometria']);

    $evaluacionRefrescada = Autoevaluacion::find($evaluacion->id);

    expect($evaluacionRefrescada->hash_integridad)->toBe($hashOriginal)
        ->and($evaluacionRefrescada->payload_canonico)->toBe($payloadOriginal);
});

test('10. Endpoint GET /autoevaluacion/{uuid}/croquis muestra editor al titular autenticado', function () {
    $user = User::factory()->create();
    $evaluacion = helperCrearEvaluacionConSello(['user_id' => $user->id]);

    $response = $this->actingAs($user)->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis");

    $response->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->component('Evaluacion/CroquisEditor')
            ->has('autoevaluacion')
            ->has('plantillas')
            ->has('plano')
        );
});

test('11. Intruso recibe 403 Forbidden al intentar acceder al croquis de otra cuenta', function () {
    $propietario = User::factory()->create();
    $intruso = User::factory()->create();
    $evaluacion = helperCrearEvaluacionConSello(['user_id' => $propietario->id]);

    $response = $this->actingAs($intruso)->get("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis");

    $response->assertStatus(403);
});

test('12. Invitado titular con su cookie legítima puede guardar nueva versión del croquis (POST)', function () {
    $evaluacion = helperCrearEvaluacionConSello(['user_id' => null]);
    $service = app(GestionEspacialService::class);
    $plantilla = $service->obtenerPlantillas()['RECTANGULAR_SIMPLE']['geometria'];

    $response = $this->withCookie('guest_session_token', $evaluacion->session_token)
        ->withSession(['guest_session_token' => $evaluacion->session_token])
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/guardar", [
            'geometria' => $plantilla,
            'descripcion_cambio' => 'Guardado inicial por comerciante invitado',
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'version' => [
                'numero_version' => 1,
            ],
        ]);

    $this->assertDatabaseHas('versiones_planos', [
        'numero_version' => 1,
        'descripcion_cambio' => 'Guardado inicial por comerciante invitado',
    ]);
});

test('13. Invitado sin cookie o con cookie ajena recibe 403 Forbidden al intentar guardar croquis', function () {
    $evaluacion = helperCrearEvaluacionConSello(['user_id' => null]);
    $service = app(GestionEspacialService::class);
    $plantilla = $service->obtenerPlantillas()['RECTANGULAR_SIMPLE']['geometria'];

    $response = $this->withCookie('guest_session_token', 'token_falso_intruso_123')
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/guardar", [
            'geometria' => $plantilla,
        ]);

    $response->assertStatus(403);
});

test('14. Consulta de versión activa GET /croquis/datos retorna la geometría completa', function () {
    $user = User::factory()->create();
    $evaluacion = helperCrearEvaluacionConSello(['user_id' => $user->id]);
    $service = app(GestionEspacialService::class);
    $plano = $service->obtenerOInicializarPlano($evaluacion);
    $service->crearOActualizarVersion($plano, $service->obtenerPlantillas()['RECTANGULAR_SIMPLE']['geometria']);

    $response = $this->actingAs($user)->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/datos");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'plano' => ['uuid', 'estado'],
            'version_activa' => ['plano_uuid', 'numero_version', 'hash_geometria_sha256', 'geometria'],
            'plantillas',
        ]);
});

test('15. Consulta histórica GET /croquis/versiones/{versionId} recupera versión anterior', function () {
    $user = User::factory()->create();
    $evaluacion = helperCrearEvaluacionConSello(['user_id' => $user->id]);
    $service = app(GestionEspacialService::class);
    $plano = $service->obtenerOInicializarPlano($evaluacion);

    $v1 = $service->crearOActualizarVersion($plano, $service->obtenerPlantillas()['RECTANGULAR_SIMPLE']['geometria']);
    $v2 = $service->crearOActualizarVersion($plano, $service->obtenerPlantillas()['CON_TRASTIENDA']['geometria']);

    $response = $this->actingAs($user)->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/versiones/{$v1->id}");

    $response->assertStatus(200)
        ->assertJson([
            'id' => $v1->id,
            'numero_version' => 1,
            'hash_geometria_sha256' => $v1->hash_geometria_sha256,
        ]);
});
