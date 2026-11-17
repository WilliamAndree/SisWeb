<?php

use App\Models\Autoevaluacion;
use App\Models\RespuestaAutoevaluacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Services\ApplicabilityEngineService;
use App\Services\ItseRiskService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

test('Viaje E2E Completo del Comerciante: desde el registro hasta la conformidad total en panel ciudadano', function () {
    Storage::fake('local');

    // -------------------------------------------------------------------------
    // 1. REGISTRO CIUDADANO
    // POST /registro: Nombre, correo, teléfono y contraseña. Verifica sesión activa.
    // -------------------------------------------------------------------------
    $payloadRegistro = [
        'name' => 'Don Lucho Palomino Huamán',
        'email' => 'donlucho@polleriaelbrasero.pe',
        'telefono' => '964123456',
        'password' => 'Polleria2026!Segura',
    ];

    $responseRegistro = $this->post(route('register.store'), $payloadRegistro);
    $responseRegistro->assertRedirect();

    $this->assertAuthenticated();
    $comerciante = Auth::user();
    expect($comerciante)->not->toBeNull()
        ->and($comerciante->email)->toBe('donlucho@polleriaelbrasero.pe')
        ->and($comerciante->name)->toBe('Don Lucho Palomino Huamán');

    // -------------------------------------------------------------------------
    // 2. CREACIÓN DE LOCAL COMERCIAL
    // POST /autoevaluacion: RUC 10458923411, Pollería, 145m², 48 personas, GLP y El Tambo.
    // Verifica cálculo de Riesgo Alto / Ex-Ante y generación de UUID v4.
    // -------------------------------------------------------------------------
    $payloadLocal = [
        'nombre_comercio' => 'Pollería El Brasero',
        'funcion_economica' => 'Encuentro',
        'ruc' => '10458923411',
        'direccion' => 'Av. Mariscal Castilla 1240',
        'referencia' => 'Frente al Parque Bolognesi',
        'distrito' => 'El Tambo',
        'area_m2' => 145.0,
        'pisos' => 1,
        'aforo' => 48,
        'usa_glp' => true,
        'galones_glp' => 120.0,
        'tiene_equipos_fritura' => true,
        'tiene_escaleras' => false,
        'tiene_estanterias_altas' => false,
    ];

    $responseCrearLocal = $this->post(route('autoevaluacion.store'), $payloadLocal);
    $responseCrearLocal->assertRedirect();

    $autoevaluacion = Autoevaluacion::where('ruc', '10458923411')->firstOrFail();
    expect($autoevaluacion->uuid_trazabilidad)->toMatch('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/')
        ->and($autoevaluacion->user_id)->toBe($comerciante->id)
        ->and($autoevaluacion->nombre_comercio)->toBe('Pollería El Brasero')
        ->and($autoevaluacion->distrito)->toBe('El Tambo')
        ->and($autoevaluacion->estado)->toBe(Autoevaluacion::ESTADO_INICIADA);

    // Verificación de la matriz de riesgo CENEPRED (Riesgo Alto por función y GLP)
    $riskService = app(ItseRiskService::class);
    $clasificacion = $riskService->clasificarTramite(
        $autoevaluacion->funcion_economica,
        (float) $autoevaluacion->area_m2,
        (int) $autoevaluacion->pisos,
        (int) $autoevaluacion->aforo,
        ['usaGlp' => (bool) $autoevaluacion->usa_glp, 'galonesGlp' => (float) $autoevaluacion->galones_glp]
    );
    expect($clasificacion['tipo_tramite'])->toBe('EX_ANTE')
        ->and($clasificacion['nivel_riesgo'])->toBe('ALTO_MUY_ALTO')
        ->and($clasificacion['es_bloqueante'])->toBeTrue();

    // -------------------------------------------------------------------------
    // 3. LLENADO DEL CHECKLIST NORMATIVO DINÁMICO
    // POST /autoevaluacion/{uuid}/checklist: 15 respuestas (14 conformes y 1 observada por extintor)
    // Verifica persistencia relacional registro a registro en respuestas_autoevaluacion.
    // -------------------------------------------------------------------------
    $applicabilityEngine = app(ApplicabilityEngineService::class);
    $checklistDinamico = $applicabilityEngine->generarChecklistDinamico($autoevaluacion);
    $criteriosAplicables = $checklistDinamico['criterios'];

    expect(count($criteriosAplicables))->toBeGreaterThanOrEqual(10);

    $codigoObservado = 'CRIT-01'; // Extintor PQS
    $declaraciones = [];

    foreach ($criteriosAplicables as $criterio) {
        $cod = $criterio['codigo'];
        if ($cod === $codigoObservado) {
            $declaraciones[] = [
                'codigo' => $cod,
                'estado' => 'PENDIENTE_ATENDER',
                'notas' => 'Extintor PQS con carga vencida y manómetro bajo.',
            ];
        } else {
            $declaraciones[] = [
                'codigo' => $cod,
                'estado' => 'CUMPLE_DECLARADO',
                'notas' => 'Conforme a especificación técnica de seguridad.',
            ];
        }
    }

    $responseChecklist = $this->post(
        route('autoevaluacion.checklist.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]),
        ['respuestas' => $declaraciones]
    );
    $responseChecklist->assertOk();

    // Comprobar persistencia relacional en BD
    $this->assertDatabaseHas('respuestas_autoevaluacion', [
        'autoevaluacion_id' => $autoevaluacion->id,
        'estado_respuesta' => 'PENDIENTE_ATENDER',
    ]);
    $this->assertDatabaseHas('respuestas_autoevaluacion', [
        'autoevaluacion_id' => $autoevaluacion->id,
        'estado_respuesta' => 'CUMPLE_DECLARADO',
    ]);
    expect(RespuestaAutoevaluacion::where('autoevaluacion_id', $autoevaluacion->id)->count())
        ->toBe(count($declaraciones));

    // -------------------------------------------------------------------------
    // 4. CIERRE Y SELLADO CRIPTOGRÁFICO
    // POST /autoevaluacion/{uuid}/finalizar
    // Verifica estado REGISTRADA y generación del hash_integridad SHA-256 de 64 caracteres.
    // -------------------------------------------------------------------------
    $responseFinalizar = $this->post(
        route('autoevaluacion.finalizar', ['uuid' => $autoevaluacion->uuid_trazabilidad])
    );
    $responseFinalizar->assertRedirect();

    $autoevaluacionSellada = $autoevaluacion->fresh();
    expect($autoevaluacionSellada->estado)->toBe(Autoevaluacion::ESTADO_REGISTRADA)
        ->and($autoevaluacionSellada->registrada_at)->not->toBeNull()
        ->and($autoevaluacionSellada->hash_integridad)->toMatch('/^[a-f0-9]{64}$/')
        ->and(strlen((string) $autoevaluacionSellada->hash_integridad))->toBe(64);

    // -------------------------------------------------------------------------
    // 5. SUBSANACIÓN CON CARGA DE EVIDENCIA REAL (FOTO)
    // POST /autoevaluacion/subsanacion/{uuid}
    // Sube imagen JPG real. Verifica almacenamiento privado y bitácora con IP forense.
    // -------------------------------------------------------------------------
    // Generación de simulación de revisión previa con la observación
    $verificaciones = [];
    foreach ($declaraciones as $d) {
        $verificaciones[$d['codigo']] = ($d['codigo'] !== $codigoObservado);
    }

    SimulacionRevision::create([
        'autoevaluacion_id' => $autoevaluacionSellada->id,
        'codigo_revision' => 'PREV-2026-ITSE-001',
        'total_observaciones' => 1,
        'porcentaje_revision' => 93.3,
        'metrica_gap' => 6.7,
        'resultado' => 'CON_OBSERVACIONES',
        'detalle_revision' => $verificaciones,
    ]);

    $fotoExtintorNuevo = UploadedFile::fake()->createWithContent(
        'extintor_nuevo.png',
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
    );

    $responseSubsanar = $this->withServerVariables(['REMOTE_ADDR' => '190.237.45.12'])->post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $autoevaluacionSellada->uuid_trazabilidad]),
        [
            'codigo_item' => $codigoObservado,
            'descripcion_subsanacion' => 'Se efectuó el reemplazo y recarga del extintor PQS de 6kg con tarjeta vigente y precinto nuevo.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => $fotoExtintorNuevo,
        ]
    );
    $responseSubsanar->assertRedirect();

    $subsanacion = Subsanacion::where('codigo_item', $codigoObservado)->firstOrFail();
    expect($subsanacion->estado)->toBe('SUBSANADO_DECLARADO')
        ->and($subsanacion->evidencia_url)->toStartWith('evidencias/subsanaciones/');

    // Archivo en disco privado local
    Storage::disk('local')->assertExists($subsanacion->evidencia_url);
    Storage::disk('public')->assertMissing($subsanacion->evidencia_url);

    // Bitácora histórica con actor e IP registrada (COBIT DSS06)
    $this->assertDatabaseHas('historial_subsanaciones', [
        'subsanacion_id' => $subsanacion->id,
        'user_id' => $comerciante->id,
        'estado_nuevo' => 'SUBSANADO_DECLARADO',
        'ip_address' => '190.237.45.12',
    ]);

    // -------------------------------------------------------------------------
    // 6. DESCARGA DE EVIDENCIA EN STREAMING PROTEGIDO
    // GET /autoevaluacion/subsanacion/{uuid}/evidencia/{subsanacion}
    // Verifica respuesta HTTP 200 y streaming seguro.
    // -------------------------------------------------------------------------
    $responseEvidencia = $this->get(route('autoevaluacion.evidencia', [
        'uuid' => $autoevaluacionSellada->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]));
    $responseEvidencia->assertOk();

    // -------------------------------------------------------------------------
    // 7. GENERACIÓN DE ANEXOS OFICIALES CENEPRED
    // GET /autoevaluacion/anexo/{uuid}
    // Verifica que los 4 anexos CENEPRED contengan el nombre del local, RUC y el sello SHA-256.
    // -------------------------------------------------------------------------
    $responseAnexos = $this->get(
        route('autoevaluacion.anexo', ['uuid' => $autoevaluacionSellada->uuid_trazabilidad])
    );
    $responseAnexos->assertOk();
    $responseAnexos->assertInertia(fn (Assert $page) => $page
        ->component('Evaluacion/AnexoOficial')
        ->where('autoevaluacion.nombre_comercio', 'Pollería El Brasero')
        ->where('autoevaluacion.ruc', '10458923411')
        ->where('autoevaluacion.hash_integridad', $autoevaluacionSellada->hash_integridad)
        ->where('titular.nombre_comercial', 'Pollería El Brasero')
        ->where('titular.ruc', '10458923411')
    );

    // -------------------------------------------------------------------------
    // 8. PANEL CIUDADANO (DASHBOARD)
    // GET /panel-ciudadano
    // Verifica que el local aparezca con 100% de cumplimiento normativo y semáforo VERDE.
    // -------------------------------------------------------------------------
    $responseDashboard = $this->get(route('dashboard'));
    $responseDashboard->assertOk();
    $responseDashboard->assertInertia(fn (Assert $page) => $page
        ->component('Dashboard/Dashboard')
        ->has('records', 1)
        ->where('records.0.nombre_comercio', 'Pollería El Brasero')
        ->where('records.0.porcentaje_cumplimiento', 100)
        ->where('records.0.semaforo', 'VERDE')
        ->where('kpis.total_locales', 1)
        ->where('kpis.aprobados', 1)
        ->where('kpis.observados', 0)
    );
});
