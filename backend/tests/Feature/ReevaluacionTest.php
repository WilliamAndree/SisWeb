<?php

use App\Models\Autoevaluacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseCount;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\withCookie;

function payloadEstablecimientoInicial(array $overrides = []): array
{
    return array_merge([
        'nombre_comercio' => 'Ferretería El Mantaro',
        'funcion_economica' => 'Comercio',
        'ruc' => '20485963214',
        'sector' => 'San Carlos (Huancayo Centro)',
        'direccion' => 'Jr. Real 450',
        'referencia' => 'A media cuadra de la plaza',
        'area_m2' => '150.0',
        'pisos' => 2,
        'aforo' => 30,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => false, 'estado' => 'POR_REVISAR', 'es_critico' => false],
        ],
    ], $overrides);
}

function crearEvaluacionA(array $overrides = [], ?string $sessionToken = null): Autoevaluacion
{
    $token = $sessionToken ?? 'token_invitado_a_'.Str::random(12);

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.store'), payloadEstablecimientoInicial($overrides))
        ->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();
    $evaluacion->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
    ]);

    return $evaluacion;
}

function archivoEvidenciaPrueba(string $nombre = 'evidencia.png'): UploadedFile
{
    return UploadedFile::fake()->createWithContent(
        $nombre,
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
    );
}

function registrarSimulacionYSubsanacionEnA(Autoevaluacion $evaluacion): Subsanacion
{
    Storage::fake('local');

    $simulacion = SimulacionRevision::create([
        'autoevaluacion_id' => $evaluacion->id,
        'codigo_revision' => 'PREV-ITSE-2026-REV01',
        'total_observaciones' => 2,
        'porcentaje_revision' => 60.0,
        'metrica_gap' => 15.0,
        'resultado' => 'CON_OBSERVACIONES',
        'detalle_revision' => [
            'EXTINTOR_PQS' => false,
            'LUCES_EMERG' => false,
        ],
    ]);

    $archivo = archivoEvidenciaPrueba('evidencia_a.png');
    $path = Storage::disk('local')->putFile('evidencias/subsanaciones', $archivo);

    return Subsanacion::create([
        'simulacion_revision_id' => $simulacion->id,
        'codigo_item' => 'EXTINTOR_PQS',
        'descripcion' => 'Se recargó el extintor PQS de 6kg con empresa autorizada.',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia_url' => $path,
        'fecha_subsanacion' => now(),
    ]);
}

test('Caso 1 y 2: crea evaluacion inicial A y posterior reevaluacion B vinculada por origen', function () {
    $evaluacionA = crearEvaluacionA();
    $token = $evaluacionA->session_token;

    expect($evaluacionA->semaforo)->toBe('ROJO'); // Falla crítica en EXTINTOR_PQS

    // Reevaluación B: el ciudadano mejoró sus condiciones
    $payloadB = payloadEstablecimientoInicial([
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ],
    ]);

    $response = withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), $payloadB);

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    $response->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $evaluacionB->uuid_trazabilidad]));

    expect($evaluacionB->id)->not->toBe($evaluacionA->id)
        ->and($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id)
        ->and($evaluacionB->evaluacionOrigen->id)->toBe($evaluacionA->id)
        ->and($evaluacionA->reevaluaciones)->toHaveCount(1);
});

test('Caso 3 y 4: A y B tienen UUID diferentes y trazabilidad hash independiente', function () {
    $evaluacionA = crearEvaluacionA();
    $token = $evaluacionA->session_token;

    $payloadB = payloadEstablecimientoInicial();

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), $payloadB);

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    expect($evaluacionA->uuid_trazabilidad)->not->toBe($evaluacionB->uuid_trazabilidad)
        ->and(Str::isUuid($evaluacionA->uuid_trazabilidad))->toBeTrue()
        ->and(Str::isUuid($evaluacionB->uuid_trazabilidad))->toBeTrue()
        ->and($evaluacionA->hash_integridad)->not->toBe($evaluacionB->hash_integridad)
        ->and(strlen($evaluacionA->hash_integridad))->toBe(64)
        ->and(strlen($evaluacionB->hash_integridad))->toBe(64);
});

test('Caso 5 y 6: modificar respuestas y resultado de B no altera las respuestas ni resultado historico de A', function () {
    $evaluacionA = crearEvaluacionA();
    $token = $evaluacionA->session_token;

    expect($evaluacionA->semaforo)->toBe('ROJO');

    // B declara todas en CUMPLE (semáforo VERDE)
    $payloadB = payloadEstablecimientoInicial([
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ],
    ]);

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), $payloadB);

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    // Verificación de independencia
    expect($evaluacionB->semaforo)->toBe('VERDE')
        ->and($evaluacionB->porcentaje_cumplimiento)->toBe(100.0);

    $evaluacionARecargada = $evaluacionA->fresh();
    expect($evaluacionARecargada->semaforo)->toBe('ROJO')
        ->and($evaluacionARecargada->detalle_checklist[0]['estado'])->toBe('NO_CUMPLE')
        ->and($evaluacionB->detalle_checklist[0]['estado'])->toBe('CUMPLE');
});

test('Caso 7 y 8: subsanaciones y evidencias de A permanecen en A y no se duplican en B', function () {
    $evaluacionA = crearEvaluacionA();
    $token = $evaluacionA->session_token;
    $subsanacionA = registrarSimulacionYSubsanacionEnA($evaluacionA);

    $payloadB = payloadEstablecimientoInicial();

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), $payloadB);

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    // B inicia sin simulaciones ni subsanaciones heredadas
    expect($evaluacionB->simulaciones)->toHaveCount(0)
        ->and(Subsanacion::whereHas('revision', fn ($q) => $q->where('autoevaluacion_id', $evaluacionB->id))->count())->toBe(0);

    // A conserva sus subsanaciones intactas
    expect($evaluacionA->simulaciones)->toHaveCount(1)
        ->and($subsanacionA->fresh()->evidencia_url)->not->toBeNull();
});

test('Caso 9: crear nueva evidencia en B no altera A ni sus archivos', function () {
    Storage::fake('local');

    $evaluacionA = crearEvaluacionA();
    $token = $evaluacionA->session_token;
    $subsanacionA = registrarSimulacionYSubsanacionEnA($evaluacionA);
    $rutaEvidenciaA = $subsanacionA->evidencia_url;

    $payloadB = payloadEstablecimientoInicial();
    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), $payloadB);

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    // Se registra simulación en B
    $simulacionB = SimulacionRevision::create([
        'autoevaluacion_id' => $evaluacionB->id,
        'codigo_revision' => 'PREV-ITSE-2026-B001',
        'total_observaciones' => 1,
        'porcentaje_revision' => 80.0,
        'metrica_gap' => 0.0,
        'resultado' => 'CON_OBSERVACIONES',
        'detalle_revision' => ['LUCES_EMERG' => false],
    ]);

    // Subir evidencia en B
    $archivoB = archivoEvidenciaPrueba('evidencia_b.webp');

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacionB->uuid_trazabilidad]), [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Luminaria de emergencia autónoma instalada en pasadizo.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => $archivoB,
        ])->assertSessionHasNoErrors();

    // Verificación: la evidencia de A existe físicamente y la de B es distinta
    Storage::disk('local')->assertExists($rutaEvidenciaA);

    $subsanacionB = Subsanacion::where('simulacion_revision_id', $simulacionB->id)->firstOrFail();
    expect($subsanacionB->evidencia_url)->not->toBe($rutaEvidenciaA);
    Storage::disk('local')->assertExists($subsanacionB->evidencia_url);
});

test('Caso 10: usuario registrado puede iniciar y guardar una reevaluacion propia', function () {
    $user = User::factory()->create();

    $evaluacionA = Autoevaluacion::create(array_merge(
        payloadEstablecimientoInicial(),
        [
            'user_id' => $user->id,
            'estado' => Autoevaluacion::ESTADO_REGISTRADA,
            'registrada_at' => now(),
            'sector_huancayo' => 'San Carlos (Huancayo Centro)',
            'uuid_trazabilidad' => (string) Str::uuid(),
            'hash_integridad' => hash('sha256', 'hash_test_user'),
            'tipo_tramite' => 'EX_POST',
            'nivel_riesgo' => 'BAJO_MEDIO',
            'porcentaje_cumplimiento' => 60.0,
            'semaforo' => 'ROJO',
            'detalle_checklist' => payloadEstablecimientoInicial()['checklist'],
            'plan_accion_costos' => ['tareas' => []],
        ]
    ));

    // GET formulario de reevaluación
    actingAs($user)
        ->get(route('autoevaluacion.reevaluar', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Nueva')
            ->has('reevaluacionDe')
            ->where('reevaluacionDe.nombre_comercio', 'Ferretería El Mantaro')
            ->where('reevaluacionDe.ruc', '20485963214')
        );

    // POST guardar reevaluación
    actingAs($user)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadEstablecimientoInicial())
        ->assertSessionHasNoErrors();

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();
    expect($evaluacionB->user_id)->toBe($user->id)
        ->and($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id);
});

test('Caso 11: otro usuario registrado es rechazado con 403 al intentar reevaluar evaluacion ajena', function () {
    $titular = User::factory()->create();
    $intruso = User::factory()->create();

    $evaluacionA = Autoevaluacion::create(array_merge(
        payloadEstablecimientoInicial(),
        [
            'user_id' => $titular->id,
            'sector_huancayo' => 'San Carlos (Huancayo Centro)',
            'uuid_trazabilidad' => (string) Str::uuid(),
            'hash_integridad' => hash('sha256', 'hash_titular'),
            'tipo_tramite' => 'EX_POST',
            'nivel_riesgo' => 'BAJO_MEDIO',
            'porcentaje_cumplimiento' => 60.0,
            'semaforo' => 'ROJO',
            'detalle_checklist' => payloadEstablecimientoInicial()['checklist'],
        ]
    ));

    // Intruso intenta GET
    actingAs($intruso)
        ->get(route('autoevaluacion.reevaluar', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertForbidden();

    // Intruso intenta POST
    actingAs($intruso)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadEstablecimientoInicial())
        ->assertForbidden();
});

test('Caso 12: invitado puede reevaluar mediante su guest session token legítimo', function () {
    $token = 'invitado_token_valido_123';
    $evaluacionA = crearEvaluacionA([], $token);

    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.reevaluar', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Nueva')
            ->has('reevaluacionDe')
            ->where('reevaluacionDe.uuid', $evaluacionA->uuid_trazabilidad)
        );

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadEstablecimientoInicial())
        ->assertSessionHasNoErrors();

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();
    expect($evaluacionB->session_token)->toBe($token)
        ->and($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id);
});

test('Caso 13: otro guest session token no puede reevaluar la evaluacion de otro invitado', function () {
    $evaluacionA = crearEvaluacionA([], 'token_titular_original');

    // Con cookie diferente
    withCookie('guest_session_token', 'token_intruso_malicioso')
        ->get(route('autoevaluacion.reevaluar', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertForbidden();

    withCookie('guest_session_token', 'token_intruso_malicioso')
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadEstablecimientoInicial())
        ->assertForbidden();

    // Sin cookie
    get(route('autoevaluacion.reevaluar', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertForbidden();
});

test('Caso 14: datos generales del establecimiento se reutilizan correctamente en la nueva evaluacion', function () {
    $evaluacionA = crearEvaluacionA([
        'nombre_comercio' => 'Botica Central Junín',
        'funcion_economica' => 'Salud',
        'ruc' => '20999888777',
        'sector' => 'El Tambo',
        'direccion' => 'Av. Huancavelica 1020',
        'referencia' => 'Frente al parque',
        'area_m2' => '220.0',
        'pisos' => 3,
        'aforo' => 45,
    ]);

    $token = $evaluacionA->session_token;

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadEstablecimientoInicial([
            'nombre_comercio' => 'Botica Central Junín',
            'funcion_economica' => 'Salud',
            'ruc' => '20999888777',
            'sector' => 'El Tambo',
            'direccion' => 'Av. Huancavelica 1020',
            'referencia' => 'Frente al parque',
            'area_m2' => '220.0',
            'pisos' => 3,
            'aforo' => 45,
        ]));

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    expect($evaluacionB->nombre_comercio)->toBe('Botica Central Junín')
        ->and($evaluacionB->ruc)->toBe('20999888777')
        ->and($evaluacionB->funcion_economica)->toBe('Salud')
        ->and($evaluacionB->direccion)->toBe('Av. Huancavelica 1020')
        ->and($evaluacionB->referencia)->toBe('Frente al parque')
        ->and($evaluacionB->area_m2)->toBe(220.0)
        ->and($evaluacionB->pisos)->toBe(3)
        ->and($evaluacionB->aforo)->toBe(45);
});

test('Caso 15: el nuevo checklist inicia de manera independiente con su propio diagnostico', function () {
    $evaluacionA = crearEvaluacionA();
    $token = $evaluacionA->session_token;

    // B envía respuestas diferentes: solo 1 cumple y el resto en POR_REVISAR
    $payloadB = payloadEstablecimientoInicial([
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => false, 'estado' => 'POR_REVISAR', 'es_critico' => true],
            ['codigo' => 'DIFERENCIAL', 'cumple' => false, 'estado' => 'POR_REVISAR', 'es_critico' => true],
            ['codigo' => 'POZO_TIERRA', 'cumple' => false, 'estado' => 'POR_REVISAR', 'es_critico' => true],
        ],
    ]);

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), $payloadB);

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    expect($evaluacionB->detalle_checklist)->toHaveCount(4)
        ->and($evaluacionA->fresh()->detalle_checklist)->toHaveCount(8);
});

test('Caso 16, 17 y 18: evaluaciones anteriores permanecen y recargas conservan estado independiente', function () {
    $evaluacionA = crearEvaluacionA();
    $token = $evaluacionA->session_token;

    assertDatabaseCount('autoevaluaciones', 1);

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadEstablecimientoInicial());

    assertDatabaseCount('autoevaluaciones', 2);

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    // Recargar A y B desde base de datos
    $aRecargada = $evaluacionA->fresh();
    $bRecargada = $evaluacionB->fresh();

    expect($aRecargada->id)->toBe($evaluacionA->id)
        ->and($bRecargada->id)->toBe($evaluacionB->id)
        ->and($aRecargada->uuid_trazabilidad)->toBe($evaluacionA->uuid_trazabilidad)
        ->and($bRecargada->uuid_trazabilidad)->toBe($evaluacionB->uuid_trazabilidad)
        ->and($bRecargada->evaluacion_origen_id)->toBe($aRecargada->id);
});

test('Caso 19 y 20: no existe mezcla de evidencias ni de subsanaciones entre A y B', function () {
    Storage::fake('local');

    $evaluacionA = crearEvaluacionA();
    $token = $evaluacionA->session_token;
    $subsanacionA = registrarSimulacionYSubsanacionEnA($evaluacionA);

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadEstablecimientoInicial());

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    // Intento de descargar la evidencia de A usando el UUID de B es rechazado (404)
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.evidencia', [
            'uuid' => $evaluacionB->uuid_trazabilidad,
            'subsanacion' => $subsanacionA->id,
        ]))->assertNotFound();

    // El acceso legítimo sobre A sigue funcionando
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.evidencia', [
            'uuid' => $evaluacionA->uuid_trazabilidad,
            'subsanacion' => $subsanacionA->id,
        ]))->assertOk();
});

test('el endpoint POST autoevaluacion estandar tambien soporta evaluacion_origen_uuid de forma autorizada', function () {
    $evaluacionA = crearEvaluacionA();
    $token = $evaluacionA->session_token;

    $payload = payloadEstablecimientoInicial([
        'evaluacion_origen_uuid' => $evaluacionA->uuid_trazabilidad,
    ]);

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.store'), $payload)
        ->assertRedirect();

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();
    expect($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id);
});

test('bloqueo backend: rechaza iniciar reevaluacion via GET si la evaluacion de origen se encuentra en estado INICIADA', function () {
    $token = 'token_invitado_iniciada_'.Str::random(10);

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.store'), payloadEstablecimientoInicial())
        ->assertSessionHasNoErrors();

    $evaluacionIniciada = Autoevaluacion::latest('id')->firstOrFail();
    expect($evaluacionIniciada->estado)->toBe(Autoevaluacion::ESTADO_INICIADA);

    $response = withCookie('guest_session_token', $evaluacionIniciada->session_token)
        ->get(route('autoevaluacion.reevaluar', ['uuid' => $evaluacionIniciada->uuid_trazabilidad]));

    $response->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $evaluacionIniciada->uuid_trazabilidad]))
        ->assertSessionHas('error', 'Solo es posible iniciar una reevaluación a partir de una autoevaluación registrada.');
});

test('bloqueo backend: rechaza guardar reevaluacion via POST JSON si origen esta INICIADA con 422 y payload estructurado', function () {
    $user = User::factory()->create();

    actingAs($user)
        ->post(route('autoevaluacion.store'), payloadEstablecimientoInicial())
        ->assertSessionHasNoErrors();

    $evaluacionIniciada = Autoevaluacion::latest('id')->firstOrFail();

    $response = actingAs($user)
        ->postJson(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionIniciada->uuid_trazabilidad]), payloadEstablecimientoInicial());

    $response->assertStatus(422)
        ->assertJson([
            'error' => 'evaluacion_no_registrada',
            'mensaje' => 'Solo es posible iniciar una reevaluación a partir de una autoevaluación registrada.',
        ]);
});

test('bloqueo backend: rechaza guardar reevaluacion via POST Web si origen esta INICIADA redirigiendo con flash error', function () {
    $token = 'token_invitado_iniciada_'.Str::random(10);

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.store'), payloadEstablecimientoInicial())
        ->assertSessionHasNoErrors();

    $evaluacionIniciada = Autoevaluacion::latest('id')->firstOrFail();

    $response = withCookie('guest_session_token', $evaluacionIniciada->session_token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionIniciada->uuid_trazabilidad]), payloadEstablecimientoInicial());

    $response->assertRedirect(route('autoevaluacion.checklist', ['uuid' => $evaluacionIniciada->uuid_trazabilidad]))
        ->assertSessionHas('error', 'Solo es posible iniciar una reevaluación a partir de una autoevaluación registrada.');
});

test('reevaluacion exitosa genera un nuevo codigo_acceso independiente del origen', function () {
    $evaluacionA = crearEvaluacionA();
    $token = $evaluacionA->session_token;

    expect($evaluacionA->codigo_acceso)->toStartWith('CHK-')
        ->and(strlen($evaluacionA->codigo_acceso))->toBe(10);

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), payloadEstablecimientoInicial())
        ->assertSessionHasNoErrors();

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    expect($evaluacionB->codigo_acceso)->toStartWith('CHK-')
        ->and(strlen($evaluacionB->codigo_acceso))->toBe(10)
        ->and($evaluacionB->codigo_acceso)->not->toBe($evaluacionA->codigo_acceso);
});
