<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\HistorialSubsanacion;
use App\Models\RespuestaAutoevaluacion;
use App\Models\Subsanacion;
use App\Models\User;
use App\Services\ApplicabilityEngineService;
use App\Services\Evaluacion\IntegridadEvaluacionService;
use Database\Seeders\NormativaCatalogSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\withCookie;

beforeEach(function () {
    $this->seed(NormativaCatalogSeeder::class);
});

function helperCrearAutoevaluacionRegistrada(array $overrides = []): Autoevaluacion
{
    $token = (string) Str::random(40);
    $payloadCanonico = [
        'caracteristicas' => [
            'aforo' => 20,
            'area_m2' => 80.0,
            'galones_glp' => null,
            'pisos' => 1,
            'tiene_equipos_fritura' => null,
            'tiene_escaleras' => null,
            'tiene_estanterias_altas' => null,
            'usa_caldero' => null,
            'usa_glp' => false,
            'usa_liquidos_inflamables' => null,
        ],
        'criterios' => [
            ['aplicabilidad' => 'APLICA', 'codigo' => 'CRIT-01', 'estado_declarado' => 'CUMPLE_DECLARADO', 'notas' => null],
            ['aplicabilidad' => 'APLICA', 'codigo' => 'CRIT-05', 'estado_declarado' => 'PENDIENTE_ATENDER', 'notas' => null],
        ],
        'establecimiento' => [
            'direccion' => 'Av. Real 456',
            'funcion_economica' => 'Comercio',
            'nombre_comercio' => 'Tienda Huancayo Test',
            'referencia' => null,
            'ruc' => '20123456789',
        ],
    ];

    $integridadSvc = app(IntegridadEvaluacionService::class);
    $hash = $integridadSvc->calcularHashIntegridad($payloadCanonico);

    return Autoevaluacion::create(array_merge([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'session_token' => $token,
        'nombre_comercio' => 'Tienda Huancayo Test',
        'funcion_economica' => 'Comercio',
        'sector_huancayo' => 'Huancayo Centro',
        'ruc' => '20123456789',
        'direccion' => 'Av. Real 456',
        'area_m2' => 80.0,
        'pisos' => 1,
        'aforo' => 20,
        'usa_glp' => false,
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
        'payload_canonico' => $payloadCanonico,
        'hash_integridad' => $hash,
        'semaforo' => 'AMARILLO',
        'porcentaje_cumplimiento' => 50.0,
        'total_condiciones_evaluadas' => 2,
        'total_cumple_declarado' => 1,
        'total_pendiente_atender' => 1,
        'total_por_revisar' => 0,
        'total_no_aplica' => 0,
        'detalle_checklist' => [],
    ], $overrides));
}

// Escenario 1: declararSubsanado() canónico no muta payload_canonico
test('1. declararSubsanado no muta el payload_canonico inmutable de la autoevaluacion registrada', function () {
    $user = User::factory()->create();
    $evaluacion = helperCrearAutoevaluacionRegistrada(['user_id' => $user->id]);
    $payloadOriginal = $evaluacion->payload_canonico;

    $crit05 = CriterioNormativo::where('codigo_criterio', 'CRIT-05')->firstOrFail();
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => $crit05->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
    ]);

    actingAs($user);
    post(route('autoevaluacion.declarar_subsanado', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'codigo_criterio' => 'CRIT-05',
        'nota' => 'Pozo a tierra subsanado con protocolo CIP',
    ])->assertRedirect();

    $evaluacion->refresh();

    expect($evaluacion->payload_canonico)->toEqual($payloadOriginal)
        ->and(array_key_exists('metricas', $evaluacion->payload_canonico))->toBeFalse();
});

// Escenario 2: declararSubsanado() no muta hash_integridad
test('2. declararSubsanado no muta el hash_integridad criptografico original', function () {
    $user = User::factory()->create();
    $evaluacion = helperCrearAutoevaluacionRegistrada(['user_id' => $user->id]);
    $hashOriginal = $evaluacion->hash_integridad;

    $crit05 = CriterioNormativo::where('codigo_criterio', 'CRIT-05')->firstOrFail();
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => $crit05->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
    ]);

    actingAs($user);
    post(route('autoevaluacion.declarar_subsanado', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'codigo_criterio' => 'CRIT-05',
        'nota' => 'Pozo a tierra subsanado',
    ])->assertRedirect();

    $evaluacion->refresh();

    expect($evaluacion->hash_integridad)->toBe($hashOriginal);
});

// Escenario 3: declararSubsanado() genera registro en subsanaciones con autoevaluacion_id y criterio_id
test('3. declararSubsanado genera registro en subsanaciones vinculado directamente con autoevaluacion_id y criterio_id', function () {
    $user = User::factory()->create();
    $evaluacion = helperCrearAutoevaluacionRegistrada(['user_id' => $user->id]);

    $crit05 = CriterioNormativo::where('codigo_criterio', 'CRIT-05')->firstOrFail();
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => $crit05->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
    ]);

    actingAs($user);
    post(route('autoevaluacion.declarar_subsanado', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'codigo_criterio' => 'CRIT-05',
        'nota' => 'Subsanación directa de pozo a tierra',
    ])->assertRedirect();

    $subsanacion = Subsanacion::where('autoevaluacion_id', $evaluacion->id)
        ->where('codigo_item', 'CRIT-05')
        ->first();

    expect($subsanacion)->not->toBeNull()
        ->and($subsanacion->criterio_id)->toBe($crit05->id)
        ->and($subsanacion->estado)->toBe('SUBSANADO_DECLARADO')
        ->and($subsanacion->descripcion)->toBe('Subsanación directa de pozo a tierra');
});

// Escenario 4: declararSubsanado() genera registro en historial_subsanaciones
test('4. declararSubsanado genera registro en historial_subsanaciones con user_id y estados', function () {
    $user = User::factory()->create();
    $evaluacion = helperCrearAutoevaluacionRegistrada(['user_id' => $user->id]);

    $crit05 = CriterioNormativo::where('codigo_criterio', 'CRIT-05')->firstOrFail();
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => $crit05->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
    ]);

    actingAs($user);
    post(route('autoevaluacion.declarar_subsanado', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'codigo_criterio' => 'CRIT-05',
        'nota' => 'Registro en bitacora historica',
    ])->assertRedirect();

    $subsanacion = Subsanacion::where('autoevaluacion_id', $evaluacion->id)
        ->where('codigo_item', 'CRIT-05')
        ->firstOrFail();

    $historial = HistorialSubsanacion::where('subsanacion_id', $subsanacion->id)->first();

    expect($historial)->not->toBeNull()
        ->and($historial->user_id)->toBe($user->id)
        ->and($historial->estado_nuevo)->toBe('SUBSANADO_DECLARADO');
});

// Escenario 5: declararSubsanado() actualiza métricas operativas
test('5. declararSubsanado actualiza reactivamente contadores operacionales y semaforo', function () {
    $user = User::factory()->create();
    $evaluacion = helperCrearAutoevaluacionRegistrada([
        'user_id' => $user->id,
        'total_cumple_declarado' => 0,
        'total_pendiente_atender' => 1,
        'porcentaje_cumplimiento' => 0.0,
        'semaforo' => 'ROJO',
    ]);

    $crit01 = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->firstOrFail();
    RespuestaAutoevaluacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'criterio_id' => $crit01->id,
        'estado_respuesta' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
    ]);

    actingAs($user);
    post(route('autoevaluacion.declarar_subsanado', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'codigo_criterio' => 'CRIT-01',
        'nota' => 'Extintor instalado y cargado',
    ])->assertRedirect();

    $evaluacion->refresh();

    expect($evaluacion->total_cumple_declarado)->toBeGreaterThanOrEqual(1)
        ->and($evaluacion->porcentaje_cumplimiento)->toBeGreaterThan(0.0);
});

// Escenario 6: IntegridadEvaluacionService::verificarIntegridadHash() retorna VALIDO y CANONICO_ESTRICTO
test('6. verificarIntegridadHash retorna VALIDO y CANONICO_ESTRICTO para autoevaluaciones no adulteradas', function () {
    $evaluacion = helperCrearAutoevaluacionRegistrada();
    $service = app(IntegridadEvaluacionService::class);

    $resultado = $service->verificarIntegridadHash($evaluacion);

    expect($resultado['estado'])->toBe(IntegridadEvaluacionService::ESTADO_VALIDO)
        ->and($resultado['metodo'])->toBe(IntegridadEvaluacionService::METODO_CANONICO_ESTRICTO)
        ->and($resultado['hash_almacenado'])->toBe($evaluacion->hash_integridad)
        ->and($resultado['hash_calculado'])->toBe($evaluacion->hash_integridad);
});

// Escenario 7: IntegridadEvaluacionService::verificarIntegridadHash() detecta discrepancia ante alteración
test('7. verificarIntegridadHash detecta discrepancia NO_COINCIDE ante alteracion deliberada de payload_canonico', function () {
    $evaluacion = helperCrearAutoevaluacionRegistrada();
    $service = app(IntegridadEvaluacionService::class);

    // Adulterar directamente en base de datos para simular manipulación no autorizada
    $payloadAdulterado = $evaluacion->payload_canonico;
    $payloadAdulterado['establecimiento']['nombre_comercio'] = 'Nombre Forzado Maliciosamente';

    DB::table('autoevaluaciones')
        ->where('id', $evaluacion->id)
        ->update(['payload_canonico' => json_encode($payloadAdulterado)]);

    $evaluacion->refresh();
    $resultado = $service->verificarIntegridadHash($evaluacion);

    expect($resultado['estado'])->toBe(IntegridadEvaluacionService::ESTADO_NO_COINCIDE)
        ->and($resultado['metodo'])->toBe(IntegridadEvaluacionService::METODO_DISCREPANCIA);
});

// Escenario 8: Fallback estricto de compatibilidad para ID 22 (metricas presente) retorna VALIDO y COMPATIBILIDAD_HISTORICA_METRICAS
test('8. verificarIntegridadHash ejecuta fallback para registros contaminados con metricas retornando COMPATIBILIDAD_HISTORICA_METRICAS', function () {
    $evaluacion = helperCrearAutoevaluacionRegistrada();
    $service = app(IntegridadEvaluacionService::class);

    // Inyectar 'metricas' en la base de datos (simulando contaminación previa a C.3 como en ID 22)
    $payloadConMetricas = $evaluacion->payload_canonico;
    $payloadConMetricas['metricas'] = [
        'total_criterios_aplicables' => 2,
        'cumple_declarado' => 2,
        'pendiente_atender' => 0,
        'porcentaje_cumplimiento' => 100.0,
        'semaforo' => 'VERDE',
    ];

    DB::table('autoevaluaciones')
        ->where('id', $evaluacion->id)
        ->update(['payload_canonico' => json_encode($payloadConMetricas)]);

    $evaluacion->refresh();
    $resultado = $service->verificarIntegridadHash($evaluacion);

    expect($resultado['estado'])->toBe(IntegridadEvaluacionService::ESTADO_VALIDO)
        ->and($resultado['metodo'])->toBe(IntegridadEvaluacionService::METODO_COMPATIBILIDAD_HISTORICA_METRICAS);
});

// Escenario 9: Autoevaluacion en estado REGISTRADA arroja LogicException al intentar modificar campos sellados
test('9. Autoevaluacion en estado REGISTRADA arroja LogicException al intentar modificar campos sellados', function () {
    $evaluacion = helperCrearAutoevaluacionRegistrada();

    // Intentar alterar hash_integridad
    expect(function () use ($evaluacion) {
        $evaluacion->hash_integridad = 'hash_alterado_0123456789abcdef0123456789abcdef0123456789abcdef01234567';
        $evaluacion->save();
    })->toThrow(LogicException::class);

    // Intentar alterar payload_canonico
    $evaluacion->refresh();
    expect(function () use ($evaluacion) {
        $evaluacion->payload_canonico = ['nuevo' => 'dato'];
        $evaluacion->save();
    })->toThrow(LogicException::class);

    // Intentar alterar uuid_trazabilidad
    $evaluacion->refresh();
    expect(function () use ($evaluacion) {
        $evaluacion->uuid_trazabilidad = (string) Str::uuid();
        $evaluacion->save();
    })->toThrow(LogicException::class);
});

// Escenario 10: Autoevaluacion en estado REGISTRADA sí permite actualizar campos operativos permitidos
test('10. Autoevaluacion en estado REGISTRADA permite actualizar campos operacionales y dinamicos', function () {
    $evaluacion = helperCrearAutoevaluacionRegistrada();

    $evaluacion->total_cumple_declarado = 10;
    $evaluacion->porcentaje_cumplimiento = 100.0;
    $evaluacion->semaforo = 'VERDE';
    $evaluacion->save();

    $evaluacion->refresh();

    expect($evaluacion->total_cumple_declarado)->toBe(10)
        ->and($evaluacion->porcentaje_cumplimiento)->toBe(100.0)
        ->and($evaluacion->semaforo)->toBe('VERDE');
});

// Escenario 11: HistorialSubsanacion arroja LogicException ante intento de update()
test('11. HistorialSubsanacion arroja LogicException ante intento de update (append-only)', function () {
    $evaluacion = helperCrearAutoevaluacionRegistrada();
    $subsanacion = Subsanacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'codigo_item' => 'CRIT-01',
        'descripcion' => 'Subsanación inicial',
        'estado' => 'SUBSANADO_DECLARADO',
    ]);

    $historial = HistorialSubsanacion::create([
        'subsanacion_id' => $subsanacion->id,
        'estado_anterior' => 'PENDIENTE',
        'estado_nuevo' => 'SUBSANADO_DECLARADO',
        'comentario' => 'Comentario de prueba',
    ]);

    expect(function () use ($historial) {
        $historial->update(['comentario' => 'Comentario alterado indebidamente']);
    })->toThrow(LogicException::class);
});

// Escenario 12: HistorialSubsanacion arroja LogicException ante intento de delete()
test('12. HistorialSubsanacion arroja LogicException ante intento de delete (append-only)', function () {
    $evaluacion = helperCrearAutoevaluacionRegistrada();
    $subsanacion = Subsanacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'codigo_item' => 'CRIT-01',
        'descripcion' => 'Subsanación inicial',
        'estado' => 'SUBSANADO_DECLARADO',
    ]);

    $historial = HistorialSubsanacion::create([
        'subsanacion_id' => $subsanacion->id,
        'estado_anterior' => 'PENDIENTE',
        'estado_nuevo' => 'SUBSANADO_DECLARADO',
        'comentario' => 'Comentario de prueba',
    ]);

    expect(function () use ($historial) {
        $historial->delete();
    })->toThrow(LogicException::class);
});

// Escenario 13: guardarSubsanacion() conserva archivo anterior en disco privado cuando se sube nueva evidencia
test('13. guardarSubsanacion conserva archivo anterior en disco privado para custodia historica', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $evaluacion = helperCrearAutoevaluacionRegistrada(['user_id' => $user->id]);

    actingAs($user);

    // Primera subida
    post(route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'codigo_item' => 'CRIT-01',
        'descripcion_subsanacion' => 'Primera fotografía de evidencia',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia' => UploadedFile::fake()->create('foto1.png', 100),
    ])->assertRedirect();

    $subsanacion = Subsanacion::where('autoevaluacion_id', $evaluacion->id)
        ->where('codigo_item', 'CRIT-01')
        ->firstOrFail();

    $rutaV1 = $subsanacion->evidencia_url;
    Storage::disk('local')->assertExists($rutaV1);

    // Segunda subida (reemplazo)
    post(route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'codigo_item' => 'CRIT-01',
        'descripcion_subsanacion' => 'Segunda fotografía de evidencia actualizada',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia' => UploadedFile::fake()->create('foto2.png', 120),
    ])->assertRedirect();

    $subsanacion->refresh();
    $rutaV2 = $subsanacion->evidencia_url;

    expect($rutaV2)->not->toBe($rutaV1);
    // Ambos archivos deben existir en custodia
    Storage::disk('local')->assertExists($rutaV1);
    Storage::disk('local')->assertExists($rutaV2);
});

// Escenario 14: guardarSubsanacion() genera nombre no colisionante y hash SHA-256 de 64 caracteres
test('14. guardarSubsanacion genera nombre no colisionante y almacena hash_sha256 de 64 caracteres', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $evaluacion = helperCrearAutoevaluacionRegistrada(['user_id' => $user->id]);

    actingAs($user);
    $archivo = UploadedFile::fake()->create('evidencia_doc.pdf', 80);

    post(route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]), [
        'codigo_item' => 'CRIT-01',
        'descripcion_subsanacion' => 'Certificado de extintor vigente',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia' => $archivo,
    ])->assertRedirect();

    $subsanacion = Subsanacion::where('autoevaluacion_id', $evaluacion->id)
        ->where('codigo_item', 'CRIT-01')
        ->firstOrFail();

    expect($subsanacion->hash_sha256)->not->toBeNull()
        ->and(strlen($subsanacion->hash_sha256))->toBe(64)
        ->and($subsanacion->evidencia_url)->toMatch('/evidencias\/subsanaciones\/[a-f0-9\-]+\/CRIT-01_[a-f0-9]{12}_\d+_[a-f0-9\-]{8}\.pdf/i');

    $historial = HistorialSubsanacion::where('subsanacion_id', $subsanacion->id)->firstOrFail();
    expect($historial->hash_sha256)->toBe($subsanacion->hash_sha256);
});

// Escenario 15: guardarSubsanacion() ejecuta rollback y eliminación compensatoria del nuevo archivo si BD falla
test('15. guardarSubsanacion ejecuta eliminacion compensatoria del archivo fisico si falla la base de datos', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $evaluacion = helperCrearAutoevaluacionRegistrada(['user_id' => $user->id]);

    actingAs($user);

    // Forzar fallo dentro de la transacción de base de datos sin contaminar el facade DB
    Subsanacion::saving(function () {
        throw new RuntimeException('Fallo simulado de base de datos');
    });

    $archivo = UploadedFile::fake()->create('foto_fallo.jpg', 50);

    try {
        post(route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]), [
            'codigo_item' => 'CRIT-01',
            'descripcion_subsanacion' => 'Intento con fallo de base de datos',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => $archivo,
        ]);
    } catch (Throwable $e) {
        // Excepción esperada por el fallo simulado
    } finally {
        Subsanacion::flushEventListeners();
    }

    // Verificar que el disco privado no retiene archivos huérfanos tras el error
    $archivosRestantes = Storage::disk('local')->allFiles("evidencias/subsanaciones/{$evaluacion->uuid_trazabilidad}");
    expect($archivosRestantes)->toBeEmpty();
});

// Escenario 16: descargarEvidencia() permite descarga para subsanación directa (autoevaluacion_id) sin simulación
test('16. descargarEvidencia permite descarga al titular para subsanacion directa con autoevaluacion_id sin simulacion previa', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $evaluacion = helperCrearAutoevaluacionRegistrada(['user_id' => $user->id]);

    $rutaArchivo = Storage::disk('local')->putFile('evidencias/subsanaciones', UploadedFile::fake()->create('foto_directa.png', 50));

    $subsanacion = Subsanacion::create([
        'autoevaluacion_id' => $evaluacion->id,
        'simulacion_revision_id' => null,
        'codigo_item' => 'CRIT-01',
        'descripcion' => 'Subsanación directa sin simulación',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia_url' => $rutaArchivo,
    ]);

    actingAs($user);
    get(route('autoevaluacion.evidencia', [
        'uuid' => $evaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]))->assertOk();
});

// Escenario 17: descargarEvidencia() deniega con 403 a usuarios no autorizados o invitados sin guest_session_token
test('17. descargarEvidencia deniega con 403 a usuarios no autorizados o invitados sin cookie legitima', function () {
    Storage::fake('local');
    $titular = User::factory()->create();
    $intruso = User::factory()->create();

    $evaluacionUsuario = helperCrearAutoevaluacionRegistrada(['user_id' => $titular->id]);
    $rutaArchivo = Storage::disk('local')->putFile('evidencias/subsanaciones', UploadedFile::fake()->create('doc.pdf', 50));

    $subsanacionUsuario = Subsanacion::create([
        'autoevaluacion_id' => $evaluacionUsuario->id,
        'simulacion_revision_id' => null,
        'codigo_item' => 'CRIT-01',
        'descripcion' => 'Evidencia privada del titular',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia_url' => $rutaArchivo,
    ]);

    $urlUsuario = route('autoevaluacion.evidencia', [
        'uuid' => $evaluacionUsuario->uuid_trazabilidad,
        'subsanacion' => $subsanacionUsuario->id,
    ]);

    // Intruso autenticado recibe 403
    actingAs($intruso)->get($urlUsuario)->assertForbidden();

    // Invitado sin autenticación a evaluación vinculada recibe 403
    get($urlUsuario)->assertForbidden();

    // Caso de autoevaluación anónima: exige cookie guest_session_token legítima
    $tokenReal = 'token_invitado_valido_987654';
    $evaluacionInvitado = helperCrearAutoevaluacionRegistrada([
        'user_id' => null,
        'session_token' => $tokenReal,
    ]);

    $subsanacionInvitado = Subsanacion::create([
        'autoevaluacion_id' => $evaluacionInvitado->id,
        'simulacion_revision_id' => null,
        'codigo_item' => 'CRIT-01',
        'descripcion' => 'Evidencia de invitado',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia_url' => $rutaArchivo,
    ]);

    $urlInvitado = route('autoevaluacion.evidencia', [
        'uuid' => $evaluacionInvitado->uuid_trazabilidad,
        'subsanacion' => $subsanacionInvitado->id,
    ]);

    // Sin cookie -> 403
    get($urlInvitado)->assertForbidden();

    // Con cookie ajena -> 403
    withCookie('guest_session_token', 'token_falso_000000')->get($urlInvitado)->assertForbidden();

    // Con cookie legítima -> 200
    withCookie('guest_session_token', $tokenReal)->get($urlInvitado)->assertOk();
});
