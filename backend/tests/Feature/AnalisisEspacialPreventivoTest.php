<?php

use App\Models\AnalisisEspacial;
use App\Models\Autoevaluacion;
use App\Models\User;
use App\Models\VersionPlano;
use App\Services\Espacio\AnalisisEspacialService;
use App\Services\Espacio\GestionEspacialService;
use Illuminate\Support\Str;

/**
 * Helper para crear una autoevaluación con plano y versión activa válida.
 */
function helperCrearAutoevaluacionParaAnalisis(array $attrs = [], ?array $geometria = null): array
{
    $uuid = (string) Str::uuid();
    $sessionToken = bin2hex(random_bytes(32));

    $evaluacion = Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => $uuid,
        'session_token' => $sessionToken,
        'codigo_acceso' => 'CHK-'.strtoupper(Str::random(6)),
        'nombre_comercio' => 'Comercio Test Huancayo',
        'funcion_economica' => 'COMERCIO_ABARROTES',
        'ruc' => '20123456789',
        'distrito' => 'Huancayo',
        'direccion' => 'Calle Real 500',
        'sector_huancayo' => 'Huancayo Cercado',
        'area_m2' => 80.00,
        'pisos' => 1,
        'aforo' => 20,
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'porcentaje_cumplimiento' => 85.0,
        'semaforo' => 'VERDE',
        'registrada_at' => now(),
        'payload_canonico' => [
            'uuid' => $uuid,
            'nombre' => 'Comercio Test Huancayo',
            'version' => 1,
        ],
        'hash_integridad' => hash('sha256', 'payload_mock_fase33'),
        'detalle_checklist' => [
            ['codigo' => 'CRIT-03', 'estado' => 'CUMPLE', 'cumple' => true],
        ],
    ], $attrs));

    $gestionService = app(GestionEspacialService::class);
    $plano = $gestionService->obtenerOInicializarPlano($evaluacion);

    $geo = $geometria ?? $gestionService->obtenerPlantillas()['CON_TRASTIENDA']['geometria'];
    $version = $gestionService->crearOActualizarVersion($plano, $geo);

    return [$evaluacion, $plano, $version];
}

test('1. Una versión íntegra permite iniciar y completar el análisis exitosamente', function () {
    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis();
    $service = app(AnalisisEspacialService::class);

    $analisis = $service->ejecutarAnalisis($version);

    expect($analisis)->toBeInstanceOf(AnalisisEspacial::class)
        ->and($analisis->estado_ejecucion)->toBe(AnalisisEspacial::ESTADO_COMPLETADO)
        ->and($analisis->version_plano_id)->toBe($version->id)
        ->and($analisis->hash_geometria_analizada)->toBe($version->hash_geometria_sha256)
        ->and($analisis->resultado_preventivo['es_integro'])->toBeTrue()
        ->and($analisis->esVigente())->toBeTrue();
});

test('2. Una alteración del JSON geométrico provoca un error de integridad que detiene el análisis', function () {
    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis();
    $service = app(AnalisisEspacialService::class);

    // Alterar la geometría en la instancia de memoria simulando una alteración/corrupción
    $geoCorrupta = $version->geometria_normalizada;
    $geoCorrupta['niveles'][0]['ambientes'][0]['ancho_metros'] = 999.0;
    $version->geometria_normalizada = $geoCorrupta;

    $analisis = $service->ejecutarAnalisis($version);

    expect($analisis->estado_ejecucion)->toBe(AnalisisEspacial::ESTADO_ERROR_INTEGRIDAD)
        ->and($analisis->resultado_preventivo['es_integro'])->toBeFalse()
        ->and($analisis->errores_integridad)->not->toBeEmpty();
});

test('3. Un conector correctamente relacionado forma una conexión confirmada', function () {
    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis();
    $service = app(AnalisisEspacialService::class);

    $analisis = $service->ejecutarAnalisis($version);

    $conectores = $analisis->resumen_conectividad['conectores'];
    $salidaConfirmada = collect($conectores)->firstWhere('tipo', 'PUERTA_SALIDA');

    expect($salidaConfirmada)->not->toBeNull()
        ->and($salidaConfirmada['clasificacion'])->toBe(AnalisisEspacialService::ESTADO_CON_CONFIRMADA)
        ->and($salidaConfirmada['es_salida_publica'])->toBeTrue();
});

test('4. Un conector próximo al perímetro, pero sin relaciones suficientes, no se confirma automáticamente', function () {
    $gestionService = app(GestionEspacialService::class);

    // Geometría con puerta interior que solo declara origen pero no destino
    $geometriaIncompleta = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'nombre' => 'Piso 1',
                'ambientes' => [
                    [
                        'codigo' => 'AMB-01',
                        'nombre' => 'Salón',
                        'ancho_metros' => 5.0,
                        'largo_metros' => 5.0,
                        'posicion_x' => 0.0,
                        'posicion_y' => 0.0,
                    ],
                    [
                        'codigo' => 'AMB-02',
                        'nombre' => 'Almacén',
                        'ancho_metros' => 5.0,
                        'largo_metros' => 5.0,
                        'posicion_x' => 5.0,
                        'posicion_y' => 0.0,
                    ],
                ],
                'conectores' => [
                    [
                        'tipo' => 'PUERTA_INTERIOR',
                        'ancho_metros' => 0.90,
                        'conduce_a_salida_publica' => false,
                        'ambiente_origen_codigo' => 'AMB-01',
                        'ambiente_destino_codigo' => null, // No declarado
                        'posicion_x' => 5.0,
                        'posicion_y' => 2.5, // Sobre el muro compartido
                    ],
                ],
            ],
        ],
    ];

    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis([], $geometriaIncompleta);
    $service = app(AnalisisEspacialService::class);

    $analisis = $service->ejecutarAnalisis($version);
    $conector = $analisis->resumen_conectividad['conectores'][0];

    // No se confirma automáticamente: queda como sugerida
    expect($conector['clasificacion'])->toBe(AnalisisEspacialService::ESTADO_CON_SUGERIDA)
        ->and($conector['clasificacion'])->not->toBe(AnalisisEspacialService::ESTADO_CON_CONFIRMADA);
});

test('5. Un conector flotante genera una advertencia pedagógica', function () {
    $geometriaFlotante = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'ambientes' => [
                    [
                        'codigo' => 'AMB-01',
                        'nombre' => 'Salón Principal',
                        'ancho_metros' => 6.0,
                        'largo_metros' => 6.0,
                        'posicion_x' => 0.0,
                        'posicion_y' => 0.0,
                    ],
                ],
                'conectores' => [
                    [
                        'tipo' => 'PUERTA_SALIDA',
                        'ancho_metros' => 1.0,
                        'conduce_a_salida_publica' => true,
                        'ambiente_origen_codigo' => 'AMB-01',
                        'posicion_x' => 3.0,
                        'posicion_y' => 3.0, // Flotando en el centro del cuarto (distancia a muros = 3m > 0.20m)
                    ],
                ],
            ],
        ],
    ];

    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis([], $geometriaFlotante);
    $service = app(AnalisisEspacialService::class);

    $analisis = $service->ejecutarAnalisis($version);
    $conector = $analisis->resumen_conectividad['conectores'][0];

    expect($conector['clasificacion'])->toBe(AnalisisEspacialService::ESTADO_CONECTOR_FLOTANTE)
        ->and($analisis->total_conectores_flotantes)->toBe(1)
        ->and(collect($analisis->resultado_preventivo['advertencias'])->pluck('tipo'))->toContain(AnalisisEspacialService::ESTADO_CONECTOR_FLOTANTE);
});

test('6. Un conector que referencia un ambiente inexistente se identifica como inconsistente', function () {
    $geometriaInexistente = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'ambientes' => [
                    [
                        'codigo' => 'AMB-01',
                        'nombre' => 'Salón Principal',
                        'ancho_metros' => 4.0,
                        'largo_metros' => 4.0,
                        'posicion_x' => 0.0,
                        'posicion_y' => 0.0,
                    ],
                ],
                'conectores' => [
                    [
                        'tipo' => 'PUERTA_INTERIOR',
                        'ancho_metros' => 0.90,
                        'ambiente_origen_codigo' => 'AMB-01',
                        'ambiente_destino_codigo' => 'AMB-FANTASMA', // No existe
                        'posicion_x' => 4.0,
                        'posicion_y' => 2.0,
                    ],
                ],
            ],
        ],
    ];

    // Desactivar temporalmente la validación previa de normalización para simular referencia rota
    $serviceGestion = app(GestionEspacialService::class);
    [$evaluacion, $plano, $versionOriginal] = helperCrearAutoevaluacionParaAnalisis();

    // Guardar versión directamente con conector apuntando a ambiente inexistente
    $rawVersion = VersionPlano::create([
        'plano_establecimiento_id' => $plano->id,
        'numero_version' => 99,
        'hash_geometria_sha256' => $serviceGestion->calcularHashGeometria($geometriaInexistente),
        'esquema_version' => 'v1.0',
        'geometria_normalizada' => $geometriaInexistente,
    ]);

    $serviceAnalisis = app(AnalisisEspacialService::class);
    $analisis = $serviceAnalisis->ejecutarAnalisis($rawVersion);

    $conector = $analisis->resumen_conectividad['conectores'][0];

    expect($conector['clasificacion'])->toBe(AnalisisEspacialService::ESTADO_CON_INDETERMINADA)
        ->and($conector['advertencia'])->toContain('AMB-FANTASMA');
});

test('7. Un ambiente sin conexión declarada a una salida se identifica en el resultado', function () {
    // Local con dos ambientes, pero sin puerta entre ellos y el segundo sin salida a calle
    $geometriaAmbienteAislado = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'ambientes' => [
                    [
                        'codigo' => 'AMB-01',
                        'nombre' => 'Salón con Salida',
                        'ancho_metros' => 5.0,
                        'largo_metros' => 5.0,
                        'posicion_x' => 0.0,
                        'posicion_y' => 0.0,
                    ],
                    [
                        'codigo' => 'AMB-02',
                        'nombre' => 'Cuarto Ciego',
                        'ancho_metros' => 4.0,
                        'largo_metros' => 4.0,
                        'posicion_x' => 6.0,
                        'posicion_y' => 0.0,
                    ],
                ],
                'conectores' => [
                    [
                        'tipo' => 'PUERTA_SALIDA',
                        'ancho_metros' => 1.0,
                        'conduce_a_salida_publica' => true,
                        'ambiente_origen_codigo' => 'AMB-01',
                        'posicion_x' => 2.5,
                        'posicion_y' => 0.0,
                    ],
                ],
            ],
        ],
    ];

    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis([], $geometriaAmbienteAislado);
    $service = app(AnalisisEspacialService::class);

    $analisis = $service->ejecutarAnalisis($version);

    expect($analisis->todos_ambientes_conectados)->toBeFalse()
        ->and($analisis->resumen_conectividad['ambientes_no_conectados'])->toContain('AMB-02')
        ->and($analisis->resumen_conectividad['ambientes_conectados'])->toContain('AMB-01');
});

test('8. Una sugerencia de conectividad no se incorpora como conexión confirmada', function () {
    // Si la conexión es solo sugerida, no debe permitir que el ambiente destino alcance la salida en el grafo
    $geometriaSugerida = [
        'niveles' => [
            [
                'numero_piso' => 1,
                'ambientes' => [
                    [
                        'codigo' => 'AMB-01',
                        'nombre' => 'Salón Principal',
                        'ancho_metros' => 5.0,
                        'largo_metros' => 5.0,
                        'posicion_x' => 0.0,
                        'posicion_y' => 0.0,
                    ],
                    [
                        'codigo' => 'AMB-02',
                        'nombre' => 'Trastienda',
                        'ancho_metros' => 5.0,
                        'largo_metros' => 4.0,
                        'posicion_x' => 0.0,
                        'posicion_y' => 5.0,
                    ],
                ],
                'conectores' => [
                    // Salida en AMB-01
                    [
                        'tipo' => 'PUERTA_SALIDA',
                        'ancho_metros' => 1.0,
                        'conduce_a_salida_publica' => true,
                        'ambiente_origen_codigo' => 'AMB-01',
                        'posicion_x' => 2.5,
                        'posicion_y' => 0.0,
                    ],
                    // Puerta entre AMB-01 y AMB-02 pero con destino NULL (queda sugerida, NO confirmada)
                    [
                        'tipo' => 'PUERTA_INTERIOR',
                        'ancho_metros' => 0.90,
                        'conduce_a_salida_publica' => false,
                        'ambiente_origen_codigo' => 'AMB-01',
                        'ambiente_destino_codigo' => null,
                        'posicion_x' => 2.5,
                        'posicion_y' => 5.0,
                    ],
                ],
            ],
        ],
    ];

    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis([], $geometriaSugerida);
    $service = app(AnalisisEspacialService::class);

    $analisis = $service->ejecutarAnalisis($version);

    // AMB-02 no debe considerarse conectado a la salida pública porque la conexión es sugerida y no confirmada
    expect($analisis->resumen_conectividad['ambientes_no_conectados'])->toContain('AMB-02')
        ->and($analisis->todos_ambientes_conectados)->toBeFalse();
});

test('9. Los elementos ILUSTRATIVO_PLANTILLA no se cuentan como elementos declarados', function () {
    $serviceGestion = app(GestionEspacialService::class);
    $plantilla = $serviceGestion->obtenerPlantillas()['RECTANGULAR_SIMPLE']['geometria'];

    // Esta plantilla tiene 2 elementos ILUSTRATIVO_PLANTILLA
    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis([], $plantilla);
    $service = app(AnalisisEspacialService::class);

    $analisis = $service->ejecutarAnalisis($version);

    expect($analisis->elementos_declarados)->toBeEmpty()
        ->and($analisis->resumen_conectividad['elementos_plantilla_excluidos'])->toBe(2);
});

test('10. Un nuevo análisis no modifica el registro histórico anterior (inmutabilidad estricta)', function () {
    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis();
    $service = app(AnalisisEspacialService::class);

    $analisis1 = $service->ejecutarAnalisis($version);
    $id1 = $analisis1->id;
    $uuid1 = $analisis1->uuid_analisis;

    // Ejecutar un segundo análisis
    $analisis2 = $service->ejecutarAnalisis($version);

    expect($analisis2->id)->not->toBe($id1)
        ->and($analisis2->uuid_analisis)->not->toBe($uuid1);

    // El primer registro permanece intacto en base de datos
    $analisis1Refrescado = AnalisisEspacial::find($id1);
    expect($analisis1Refrescado)->not->toBeNull()
        ->and($analisis1Refrescado->uuid_analisis)->toBe($uuid1);

    // Intentar modificar el registro histórico arroja LogicException
    expect(function () use ($analisis1Refrescado) {
        $analisis1Refrescado->estado_ejecucion = 'MODIFICADO';
        $analisis1Refrescado->save();
    })->toThrow(LogicException::class);
});

test('11. Un análisis de una versión anterior se identifica como no vigente cuando cambia la versión activa', function () {
    $serviceGestion = app(GestionEspacialService::class);
    [$evaluacion, $plano, $version1] = helperCrearAutoevaluacionParaAnalisis();

    $serviceAnalisis = app(AnalisisEspacialService::class);
    $analisisV1 = $serviceAnalisis->ejecutarAnalisis($version1);

    expect($analisisV1->esVigente())->toBeTrue();

    // Crear y activar la versión 2 del plano
    $plantilla2 = $serviceGestion->obtenerPlantillas()['EN_FORMA_L']['geometria'];
    $version2 = $serviceGestion->crearOActualizarVersion($plano, $plantilla2);

    expect($plano->fresh()->version_activa_id)->toBe($version2->id);

    // El análisis anterior ahora debe reportar esVigente() === false
    expect($analisisV1->fresh()->esVigente())->toBeFalse();
});

test('12. Un usuario no autorizado no puede consultar ni ejecutar el análisis de otra autoevaluación (403)', function () {
    $propietario = User::factory()->create();
    $intruso = User::factory()->create();

    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis(['user_id' => $propietario->id]);

    // Intruso intenta ejecutar análisis POST
    $resPost = $this->actingAs($intruso)
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/analisis");

    $resPost->assertStatus(403);

    // Intruso intenta consultar último análisis GET
    $resGet = $this->actingAs($intruso)
        ->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/analisis/ultimo");

    $resGet->assertStatus(403);
});

test('13. Titular legítimo puede ejecutar el análisis espacial preventivo vía HTTP POST', function () {
    $propietario = User::factory()->create();
    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis(['user_id' => $propietario->id]);

    $response = $this->actingAs($propietario)
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/analisis");

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'analisis' => [
                'version_plano_id' => $version->id,
                'estado_ejecucion' => AnalisisEspacial::ESTADO_COMPLETADO,
                'es_vigente' => true,
            ],
        ]);
});

test('14. Invitado titular con su cookie puede consultar y ejecutar análisis preventivo', function () {
    [$evaluacion, $plano, $version] = helperCrearAutoevaluacionParaAnalisis(['user_id' => null]);

    $response = $this->withCookie('guest_session_token', $evaluacion->session_token)
        ->withSession(['guest_session_token' => $evaluacion->session_token])
        ->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/analisis");

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'analisis' => [
                'es_vigente' => true,
            ],
        ]);
});
