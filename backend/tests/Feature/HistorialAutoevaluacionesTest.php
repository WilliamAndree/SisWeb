<?php

use App\Models\Autoevaluacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\withCookie;

function payloadHistorialFase17(array $overrides = []): array
{
    return array_merge([
        'nombre_comercio' => 'Cafetería El Mantaro Real',
        'funcion_economica' => 'Restaurante / Cafetería',
        'ruc' => '20147852369',
        'sector' => 'San Carlos (Huancayo Centro)',
        'direccion' => 'Jr. Puno 450',
        'referencia' => 'A media cuadra de la plaza',
        'area_m2' => '110.0',
        'pisos' => 1,
        'aforo' => 24,
        'usa_glp' => true,
        'galones_glp' => 10,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EXTINTOR_K', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => true],
            ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'POZO_TIERRA', 'cumple' => false, 'estado' => 'POR_REVISAR', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'NA', 'es_critico' => false],
        ],
    ], $overrides);
}

function crearEvaluacionHistorial(User $usuario, array $overrides = []): Autoevaluacion
{
    actingAs($usuario)
        ->post(route('autoevaluacion.store'), payloadHistorialFase17($overrides))
        ->assertSessionHasNoErrors();

    return Autoevaluacion::latest('id')->firstOrFail();
}

function reevaluarHistorial(User $usuario, Autoevaluacion $evaluacionOrigen, array $checklist): Autoevaluacion
{
    if (! $evaluacionOrigen->estaRegistrada()) {
        $evaluacionOrigen->update([
            'estado' => Autoevaluacion::ESTADO_REGISTRADA,
            'registrada_at' => now(),
        ]);
    }

    $payload = payloadHistorialFase17([
        'checklist' => $checklist,
        'evaluacion_origen_uuid' => $evaluacionOrigen->uuid_trazabilidad,
    ]);

    actingAs($usuario)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionOrigen->uuid_trazabilidad]), $payload)
        ->assertSessionHasNoErrors();

    return Autoevaluacion::latest('id')->firstOrFail();
}

test('Caso 1: Usuario registrado puede ver sus evaluaciones en mis-autoevaluaciones', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionHistorial($usuario);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 1)
            ->where('autoevaluaciones.0.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluaciones.0.nombre_comercio', 'Cafetería El Mantaro Real')
        );
});

test('Caso 2: Usuario registrado no puede ver evaluaciones de otro usuario', function () {
    $usuarioA = User::factory()->create();
    $usuarioB = User::factory()->create();

    $evaluacionA = crearEvaluacionHistorial($usuarioA);

    actingAs($usuarioB)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 0)
        );
});

test('Caso 3: La evaluación original aparece con evaluacion_origen_id null', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionHistorial($usuario);

    expect($evaluacion->evaluacion_origen_id)->toBeNull();

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('autoevaluaciones.0.evaluacion_origen_id', null)
        );
});

test('Caso 4: Una reevaluación aparece relacionada con la original mediante evaluacion_origen_id', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EXTINTOR_K', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
    ];

    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, $checklistB);

    expect($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(function (Assert $page) use ($evaluacionA, $evaluacionB) {
            $page->component('Evaluacion/MisAutoevaluaciones');
            $items = collect($page->toArray()['props']['autoevaluaciones']);

            $itemA = $items->firstWhere('uuid_trazabilidad', $evaluacionA->uuid_trazabilidad);
            $itemB = $items->firstWhere('uuid_trazabilidad', $evaluacionB->uuid_trazabilidad);

            expect($itemA['evaluacion_origen_id'])->toBeNull()
                ->and($itemB['evaluacion_origen_id'])->toBe($evaluacionA->id)
                ->and($itemB['evaluacion_origen_uuid'])->toBe($evaluacionA->uuid_trazabilidad);
        });
});

test('Caso 5: Dos reevaluaciones de una misma evaluación quedan agrupadas correctamente bajo el mismo origen', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    $checklist = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
    ];

    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, $checklist);
    $evaluacionC = reevaluarHistorial($usuario, $evaluacionA, $checklist);

    expect($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id)
        ->and($evaluacionC->evaluacion_origen_id)->toBe($evaluacionA->id);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(function (Assert $page) use ($evaluacionA) {
            $items = collect($page->toArray()['props']['autoevaluaciones']);
            $reevs = $items->where('evaluacion_origen_id', $evaluacionA->id);

            expect($reevs->count())->toBe(2);
        });
});

test('Caso 6: Las reevaluaciones no se encadenan accidentalmente', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    $checklist = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
    ];

    // B es reevaluación de A
    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, $checklist);
    expect($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id);

    // Intento de reevaluar apuntando a B: debe resolver automáticamente la raíz A
    $evaluacionC = reevaluarHistorial($usuario, $evaluacionB, $checklist);

    // C NO debe tener como origen B, sino A (A -> [B, C])
    expect($evaluacionC->evaluacion_origen_id)->toBe($evaluacionA->id)
        ->and($evaluacionC->evaluacion_origen_id)->not->toBe($evaluacionB->id);
});

test('Caso 7: Una reevaluación conserva los datos del establecimiento', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    $checklist = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
    ];

    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, $checklist);

    expect($evaluacionB->nombre_comercio)->toBe($evaluacionA->nombre_comercio)
        ->and($evaluacionB->ruc)->toBe($evaluacionA->ruc)
        ->and($evaluacionB->funcion_economica)->toBe($evaluacionA->funcion_economica)
        ->and((float) $evaluacionB->area_m2)->toBe((float) $evaluacionA->area_m2)
        ->and($evaluacionB->aforo)->toBe($evaluacionA->aforo);
});

test('Caso 8: Una reevaluación inicia checklist en POR_REVISAR', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);
    $evaluacionA->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
    ]);

    actingAs($usuario)
        ->get(route('autoevaluacion.reevaluar', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Nueva')
            ->has('reevaluacionDe')
            ->where('reevaluacionDe.uuid', $evaluacionA->uuid_trazabilidad)
            ->where('reevaluacionDe.nombre_comercio', $evaluacionA->nombre_comercio)
        );
});

test('Caso 9: Una reevaluación no copia evidencias de la evaluación anterior', function () {
    Storage::fake('local');
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    // Registrar simulación y subsanación con evidencia en A
    $revisionA = SimulacionRevision::create([
        'autoevaluacion_id' => $evaluacionA->id,
        'codigo_revision' => 'REV-HIST-A',
        'total_observaciones' => 1,
        'porcentaje_revision' => 80.0,
        'metrica_gap' => 20.0,
        'resultado' => 'CON_OBSERVACIONES',
        'detalle_revision' => ['EXTINTOR_K' => false],
    ]);

    $archivoEvidencia = UploadedFile::fake()->create('foto_evidencia.png', 200, 'image/png');
    $ruta = Storage::disk('local')->putFile('evidencias/subsanaciones', $archivoEvidencia);

    Subsanacion::create([
        'simulacion_revision_id' => $revisionA->id,
        'codigo_item' => 'EXTINTOR_K',
        'descripcion' => 'Extintor K instalado en zona de cocinas',
        'estado' => 'SUBSANADO_DECLARADO',
        'evidencia_url' => $ruta,
    ]);

    // Crear reevaluación B
    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
    ]);

    // B no debe tener simulaciones ni evidencias copiadas
    expect($evaluacionB->simulaciones()->count())->toBe(0)
        ->and(Subsanacion::whereHas('revision', fn ($q) => $q->where('autoevaluacion_id', $evaluacionB->id))->count())->toBe(0);
});

test('Caso 10: Una reevaluación no copia subsanaciones', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    $revisionA = SimulacionRevision::create([
        'autoevaluacion_id' => $evaluacionA->id,
        'codigo_revision' => 'REV-HIST-A-2',
        'total_observaciones' => 1,
        'porcentaje_revision' => 80.0,
        'metrica_gap' => 20.0,
        'resultado' => 'CON_OBSERVACIONES',
        'detalle_revision' => ['DIFERENCIAL' => false],
    ]);

    Subsanacion::create([
        'simulacion_revision_id' => $revisionA->id,
        'codigo_item' => 'DIFERENCIAL',
        'descripcion' => 'Llave diferencial colocada',
        'estado' => 'SUBSANADO_DECLARADO',
    ]);

    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
    ]);

    $subsanacionesB = Subsanacion::whereHas('revision', fn ($q) => $q->where('autoevaluacion_id', $evaluacionB->id))->get();
    expect($subsanacionesB)->toBeEmpty();
});

test('Caso 11: A y B conservan resultados y semáforos independientes', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    $checklistConformeB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
    ];

    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, $checklistConformeB);

    expect($evaluacionA->fresh()->semaforo)->toBe('ROJO')
        ->and($evaluacionB->fresh()->semaforo)->toBe('VERDE')
        ->and($evaluacionA->fresh()->porcentaje_cumplimiento)->not->toBe($evaluacionB->fresh()->porcentaje_cumplimiento);
});

test('Caso 12: A y B conservan hashes independientes', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
    ];

    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, $checklistB);

    expect($evaluacionA->hash_integridad)->not->toBe($evaluacionB->hash_integridad)
        ->and(strlen($evaluacionA->hash_integridad))->toBe(64)
        ->and(strlen($evaluacionB->hash_integridad))->toBe(64);
});

test('Caso 13: El historial permite acceder al resultado correcto de cada evaluación', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
    ];

    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, $checklistB);

    // Acceso a resultado de A
    actingAs($usuario)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resultado')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionA->uuid_trazabilidad)
        );

    // Acceso a resultado de B
    actingAs($usuario)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Resultado')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionB->uuid_trazabilidad)
        );
});

test('Caso 14: El historial permite acceder al informe preventivo correcto de cada evaluación', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
    ];

    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, $checklistB);

    // Acceso a informe de A
    actingAs($usuario)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionA->uuid_trazabilidad)
            ->where('esReevaluacion', false)
        );

    // Acceso a informe de B
    actingAs($usuario)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionB->uuid_trazabilidad)
            ->where('esReevaluacion', true)
        );
});

test('Caso 15: El invitado conserva acceso únicamente a sus propias evaluaciones autorizadas', function () {
    $tokenInvitado = 'guest_token_historial_12345';

    withCookie('guest_session_token', $tokenInvitado)
        ->post(route('autoevaluacion.store'), payloadHistorialFase17())
        ->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();
    expect($evaluacion->user_id)->toBeNull();

    // Acceso con su token -> 200 OK
    withCookie('guest_session_token', $tokenInvitado)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk();

    // Acceso con token ajeno -> 403
    session()->flush();
    withCookie('guest_session_token', 'token_intruso_99999')
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('Caso 16: Un usuario autenticado no puede acceder a historial o evaluaciones de invitado ajeno', function () {
    $tokenInvitado = 'guest_token_historial_auth_check';

    withCookie('guest_session_token', $tokenInvitado)
        ->post(route('autoevaluacion.store'), payloadHistorialFase17())
        ->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();
    $usuario = User::factory()->create();

    session()->flush();
    actingAs($usuario)
        ->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();

    actingAs($usuario)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('Caso 17: La variación entre evaluaciones se calcula correctamente', function () {
    $usuario = User::factory()->create();
    $evaluacionA = crearEvaluacionHistorial($usuario);

    // A tiene: CUMPLE: 5, NO_CUMPLE: 2, POR_REVISAR: 1, NA: 1
    // Ahora B tiene todas CUMPLE (excepto NA)
    $checklistB = [
        ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EXTINTOR_K', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'NA', 'es_critico' => false],
    ];

    $evaluacionB = reevaluarHistorial($usuario, $evaluacionA, $checklistB);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(function (Assert $page) use ($evaluacionA, $evaluacionB) {
            $items = collect($page->toArray()['props']['autoevaluaciones']);
            $itemA = $items->firstWhere('uuid_trazabilidad', $evaluacionA->uuid_trazabilidad);
            $itemB = $items->firstWhere('uuid_trazabilidad', $evaluacionB->uuid_trazabilidad);

            $difPct = $itemB['porcentaje_cumplimiento'] - $itemA['porcentaje_cumplimiento'];
            $difNoCumple = $itemB['conteo_condiciones']['no_cumple'] - $itemA['conteo_condiciones']['no_cumple'];

            expect($difPct)->toBeGreaterThan(0)
                ->and($difNoCumple)->toBe(-2);
        });
});

test('Caso 18: POR_REVISAR no se transforma durante la comparación', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionHistorial($usuario);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(function (Assert $page) use ($evaluacion) {
            $items = collect($page->toArray()['props']['autoevaluaciones']);
            $item = $items->firstWhere('uuid_trazabilidad', $evaluacion->uuid_trazabilidad);

            expect($item['conteo_condiciones']['por_revisar'])->toBe(1)
                ->and($item['conteo_condiciones']['por_revisar'])->not->toBe(0);
        });
});

test('Caso 19: NA no se contabiliza como CUMPLE', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionHistorial($usuario);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(function (Assert $page) use ($evaluacion) {
            $items = collect($page->toArray()['props']['autoevaluaciones']);
            $item = $items->firstWhere('uuid_trazabilidad', $evaluacion->uuid_trazabilidad);

            // BOTIQUIN tiene estado NA, se computa en na=1 y no en cumple=5
            expect($item['conteo_condiciones']['na'])->toBe(1)
                ->and($item['conteo_condiciones']['cumple'])->toBe(5);
        });
});

test('Caso 20: No aparecen términos de aprobación oficial en el historial', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionHistorial($usuario);

    $response = actingAs($usuario)->get(route('mis-autoevaluaciones'));
    $response->assertOk();

    $content = $response->getContent();

    expect($content)->not->toContain('Dictamen Oficial')
        ->and($content)->not->toContain('Aprobado Municipal')
        ->and($content)->not->toContain('Certificado ITSE Oficial');
});

test('el historial expone codigo_acceso ciudadano en las autoevaluaciones y omite sector_huancayo en props', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionHistorial($usuario);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 1)
            ->where('autoevaluaciones.0.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluaciones.0.codigo_acceso', $evaluacion->codigo_acceso)
            ->missing('autoevaluaciones.0.sector_huancayo')
        );
});

test('el historial maneja autoevaluaciones historicas con codigo_acceso nulo sin errores', function () {
    $usuario = User::factory()->create();
    $evaluacion = crearEvaluacionHistorial($usuario);
    $evaluacion->update(['codigo_acceso' => null]);

    actingAs($usuario)
        ->get(route('mis-autoevaluaciones'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/MisAutoevaluaciones')
            ->has('autoevaluaciones', 1)
            ->where('autoevaluaciones.0.codigo_acceso', null)
        );
});
