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
use function Pest\Laravel\get;
use function Pest\Laravel\withCookie;

function payloadBaseResultado(array $overrides = []): array
{
    return array_merge([
        'nombre_comercio' => 'Bodega Central Huancayo',
        'funcion_economica' => 'Comercio',
        'ruc' => '20541236547',
        'sector' => 'San Carlos (Huancayo Centro)',
        'direccion' => 'Av. Giráldez 320',
        'referencia' => 'Frente al parque',
        'area_m2' => '95.0',
        'pisos' => 1,
        'aforo' => 18,
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

function crearEvaluacionAConToken(?string $token = null): array
{
    $tokenFinal = $token ?? 'token_guest_'.Str::random(16);

    withCookie('guest_session_token', $tokenFinal)
        ->post(route('autoevaluacion.store'), payloadBaseResultado())
        ->assertSessionHasNoErrors();

    $evaluacionA = Autoevaluacion::latest('id')->firstOrFail();
    $evaluacionA->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
    ]);

    return [$evaluacionA, $tokenFinal];
}

function crearReevaluacionBConChecklist(Autoevaluacion $evaluacionA, string $token, array $checklist): Autoevaluacion
{
    if (! $evaluacionA->estaRegistrada()) {
        $evaluacionA->update([
            'estado' => Autoevaluacion::ESTADO_REGISTRADA,
            'registrada_at' => now(),
        ]);
    }

    $payloadB = payloadBaseResultado([
        'checklist' => $checklist,
        'evaluacion_origen_uuid' => $evaluacionA->uuid_trazabilidad,
    ]);

    withCookie('guest_session_token', $token)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), $payloadB)
        ->assertSessionHasNoErrors();

    return Autoevaluacion::latest('id')->firstOrFail();
}

test('Caso 1, 4, 5 y 15: evaluacion A mantiene su resultado, porcentaje, semaforo y hash despues de crear B', function () {
    [$evaluacionA, $token] = crearEvaluacionAConToken();

    $porcentajeInicialA = $evaluacionA->porcentaje_cumplimiento;
    $semaforoInicialA = $evaluacionA->semaforo;
    $hashInicialA = $evaluacionA->hash_integridad;
    $checklistInicialA = $evaluacionA->detalle_checklist;

    // Crear B con todo CUMPLE (100% VERDE)
    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
    ];

    $evaluacionB = crearReevaluacionBConChecklist($evaluacionA, $token, $checklistB);

    expect($evaluacionB->id)->not->toBe($evaluacionA->id)
        ->and($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id)
        ->and($evaluacionB->porcentaje_cumplimiento)->toBe(100.0)
        ->and($evaluacionB->semaforo)->toBe('VERDE');

    // A permanece completamente intacta
    $evaluacionAFresh = $evaluacionA->fresh();
    expect($evaluacionAFresh->porcentaje_cumplimiento)->toBe($porcentajeInicialA)
        ->and($evaluacionAFresh->semaforo)->toBe($semaforoInicialA)
        ->and($evaluacionAFresh->hash_integridad)->toBe($hashInicialA)
        ->and($evaluacionAFresh->detalle_checklist)->toBe($checklistInicialA);
});

test('Caso 2 y 3: B muestra su propio resultado y A y B tienen resultados diferentes', function () {
    [$evaluacionA, $token] = crearEvaluacionAConToken();

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
    ];

    $evaluacionB = crearReevaluacionBConChecklist($evaluacionA, $token, $checklistB);

    // Consulta de resultado B retorna 200 e Inertia con los datos de B
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resultado')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionB->uuid_trazabilidad)
            ->where('autoevaluacion.semaforo', 'VERDE')
            ->where('autoevaluacion.porcentaje_cumplimiento', 100)
            ->where('autoevaluacion.evaluacion_origen_id', $evaluacionA->id)
        );

    // Consulta de resultado A retorna 200 e Inertia con los datos de A
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resultado')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionA->uuid_trazabilidad)
            ->where('autoevaluacion.semaforo', $evaluacionA->semaforo)
            ->where('autoevaluacion.porcentaje_cumplimiento', $evaluacionA->porcentaje_cumplimiento)
        );
});

test('Caso 6: los pendientes de B pertenecen exclusivamente a B', function () {
    [$evaluacionA, $token] = crearEvaluacionAConToken();

    // En B se solucionaron EXTINTOR_PQS y LUCES_EMERG, pero PUERTAS_ESCAPE no cumple
    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
    ];

    $evaluacionB = crearReevaluacionBConChecklist($evaluacionA, $token, $checklistB);

    $itemsB = collect($evaluacionB->detalle_checklist);
    $noCumpleB = $itemsB->where('estado', 'NO_CUMPLE')->pluck('codigo')->all();

    expect($noCumpleB)->toBe(['PUERTAS_ESCAPE'])
        ->and($noCumpleB)->not->toContain('EXTINTOR_PQS')
        ->and($noCumpleB)->not->toContain('LUCES_EMERG');

    // Comprobamos en el render de Inertia
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionB->uuid_trazabilidad)
            ->where('autoevaluacion.detalle_checklist.5.codigo', 'PUERTAS_ESCAPE')
            ->where('autoevaluacion.detalle_checklist.5.estado', 'NO_CUMPLE')
            ->where('autoevaluacion.detalle_checklist.0.codigo', 'EXTINTOR_PQS')
            ->where('autoevaluacion.detalle_checklist.0.estado', 'CUMPLE')
        );
});

test('Caso 7, 8, 19 y 20: subsanaciones y evidencias de A no aparecen en B y nuevas en B no modifican A', function () {
    Storage::fake('local');

    [$evaluacionA, $token] = crearEvaluacionAConToken();

    // 1. Simulación y subsanación en A
    $simulacionA = SimulacionRevision::create([
        'autoevaluacion_id' => $evaluacionA->id,
        'codigo_revision' => 'PREV-ITSE-A',
        'total_observaciones' => 1,
        'porcentaje_revision' => 80.0,
        'metrica_gap' => 10.0,
        'resultado' => 'CON_OBSERVACIONES',
        'detalle_revision' => ['EXTINTOR_PQS' => false],
    ]);

    $archivoA = UploadedFile::fake()->createWithContent(
        'evidencia_a.png',
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
    );
    $pathA = Storage::disk('local')->putFile('evidencias/subsanaciones', $archivoA);

    $subsanacionA = Subsanacion::create([
        'simulacion_revision_id' => $simulacionA->id,
        'codigo_item' => 'EXTINTOR_PQS',
        'descripcion' => 'Subsanación original de A',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia_url' => $pathA,
    ]);

    // 2. Crear B
    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
    ];

    $evaluacionB = crearReevaluacionBConChecklist($evaluacionA, $token, $checklistB);

    // B no tiene simulaciones ni subsanaciones de A
    expect($evaluacionB->simulaciones()->count())->toBe(0);

    // 3. Crear simulación y subsanación en B
    $simulacionB = SimulacionRevision::create([
        'autoevaluacion_id' => $evaluacionB->id,
        'codigo_revision' => 'PREV-ITSE-B',
        'total_observaciones' => 1,
        'porcentaje_revision' => 85.0,
        'metrica_gap' => 5.0,
        'resultado' => 'CON_OBSERVACIONES',
        'detalle_revision' => ['LUCES_EMERG' => false],
    ]);

    $archivoB = UploadedFile::fake()->createWithContent(
        'evidencia_b.png',
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
    );
    $pathB = Storage::disk('local')->putFile('evidencias/subsanaciones', $archivoB);

    $subsanacionB = Subsanacion::create([
        'simulacion_revision_id' => $simulacionB->id,
        'codigo_item' => 'LUCES_EMERG',
        'descripcion' => 'Subsanación independiente en B',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia_url' => $pathB,
    ]);

    // Verificar que la nueva subsanación y evidencia en B no afectaron a A
    $subsanacionesA = Subsanacion::where('simulacion_revision_id', $simulacionA->id)->get();
    expect($subsanacionesA)->toHaveCount(1)
        ->and($subsanacionesA->first()->codigo_item)->toBe('EXTINTOR_PQS')
        ->and($subsanacionesA->first()->evidencia_url)->toBe($pathA);

    // Verificar que B solo contiene su propia subsanación y evidencia
    $subsanacionesB = Subsanacion::where('simulacion_revision_id', $simulacionB->id)->get();
    expect($subsanacionesB)->toHaveCount(1)
        ->and($subsanacionesB->first()->codigo_item)->toBe('LUCES_EMERG')
        ->and($subsanacionesB->first()->evidencia_url)->toBe($pathB);
});

test('Caso 9 y 10: el UUID de A muestra resultado A y el UUID de B muestra resultado B', function () {
    [$evaluacionA, $token] = crearEvaluacionAConToken();

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
    ];

    $evaluacionB = crearReevaluacionBConChecklist($evaluacionA, $token, $checklistB);

    // Consulta explícita por UUID de A
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionA->uuid_trazabilidad)
            ->where('autoevaluacion.id', $evaluacionA->id)
        );

    // Consulta explícita por UUID de B
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionB->uuid_trazabilidad)
            ->where('autoevaluacion.id', $evaluacionB->id)
        );
});

test('Caso 11: usuario no autorizado no puede consultar B', function () {
    $titular = User::factory()->create();
    $intruso = User::factory()->create();

    // Titular crea evaluación
    actingAs($titular)
        ->post(route('autoevaluacion.store'), payloadBaseResultado())
        ->assertSessionHasNoErrors();

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    // Intruso registrado intenta consultar B -> 403
    actingAs($intruso)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertForbidden();

    // Visitante no autenticado intenta consultar B -> 403
    get(route('autoevaluacion.resultado', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertForbidden();
});

test('Caso 12: guest autorizado puede consultar B', function () {
    [$evaluacionA, $token] = crearEvaluacionAConToken();

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
    ];

    $evaluacionB = crearReevaluacionBConChecklist($evaluacionA, $token, $checklistB);

    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk();
});

test('Caso 13: guest ajeno no puede consultar B', function () {
    [$evaluacionA, $tokenOriginal] = crearEvaluacionAConToken();

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
    ];

    $evaluacionB = crearReevaluacionBConChecklist($evaluacionA, $tokenOriginal, $checklistB);

    // Guest ajeno con token diferente y sesión independiente -> 403
    session()->flush();
    withCookie('guest_session_token', 'token_malicioso_ajeno_123456')
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertForbidden();
});

test('Caso 14: el informe de B utiliza su propia trazabilidad', function () {
    [$evaluacionA, $token] = crearEvaluacionAConToken();

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
    ];

    $evaluacionB = crearReevaluacionBConChecklist($evaluacionA, $token, $checklistB);

    // Simulación conforme de B
    SimulacionRevision::create([
        'autoevaluacion_id' => $evaluacionB->id,
        'codigo_revision' => 'PREV-ITSE-B-OK',
        'total_observaciones' => 0,
        'porcentaje_revision' => 100.0,
        'metrica_gap' => 0.0,
        'resultado' => 'SIN_OBSERVACIONES',
        'detalle_revision' => [
            'EXTINTOR_PQS' => true,
            'TERMOMAGNETICO' => true,
            'DIFERENCIAL' => true,
            'POZO_TIERRA' => true,
            'EVACUACION' => true,
            'PUERTAS_ESCAPE' => true,
            'LUCES_EMERG' => true,
            'BOTIQUIN' => true,
        ],
    ]);

    // Consultar informe de B
    get(route('autoevaluacion.informe', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionB->uuid_trazabilidad)
            ->where('hashIntegridad', $evaluacionB->hash_integridad)
            ->has('codigoInforme')
            ->has('hashFinal')
        );
});

test('Caso 16: el hash de B es independiente', function () {
    [$evaluacionA, $token] = crearEvaluacionAConToken();

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
    ];

    $evaluacionB = crearReevaluacionBConChecklist($evaluacionA, $token, $checklistB);

    expect(strlen($evaluacionB->hash_integridad))->toBe(64)
        ->and($evaluacionB->hash_integridad)->toMatch('/^[a-f0-9]{64}$/i')
        ->and($evaluacionB->hash_integridad)->not->toBe($evaluacionA->hash_integridad);
});

test('Caso 17 y 18: recargar resultado B y resultado A mantiene los datos correctos', function () {
    [$evaluacionA, $token] = crearEvaluacionAConToken();

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
    ];

    $evaluacionB = crearReevaluacionBConChecklist($evaluacionA, $token, $checklistB);

    // Consulta 1 a B
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('autoevaluacion.uuid_trazabilidad', $evaluacionB->uuid_trazabilidad));

    // Recarga (Consulta 2 a B)
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('autoevaluacion.uuid_trazabilidad', $evaluacionB->uuid_trazabilidad));

    // Consulta 1 a A
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('autoevaluacion.uuid_trazabilidad', $evaluacionA->uuid_trazabilidad));

    // Recarga (Consulta 2 a A)
    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('autoevaluacion.uuid_trazabilidad', $evaluacionA->uuid_trazabilidad));
});
