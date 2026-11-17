<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\withCookie;

function payloadFase16(array $overrides = []): array
{
    return array_merge([
        'nombre_comercio' => 'Ferretería El Mantaro',
        'funcion_economica' => 'Comercio',
        'ruc' => '20489632514',
        'sector' => 'El Tambo (Huancayo Norte)',
        'direccion' => 'Av. Huancavelica 1050',
        'referencia' => 'A dos cuadras del óvalo',
        'area_m2' => '150.0',
        'pisos' => 2,
        'aforo' => 30,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EXTINTOR_K', 'cumple' => true, 'estado' => 'NA', 'es_critico' => true],
            ['codigo' => 'DIFERENCIAL', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'POZO_TIERRA', 'cumple' => false, 'estado' => 'POR_REVISAR', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'PUERTAS_ESCAPE', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ],
    ], $overrides);
}

function crearEvaluacionFase16ParaUsuario(User $user, array $overrides = []): Autoevaluacion
{
    actingAs($user)
        ->post(route('autoevaluacion.store'), payloadFase16($overrides))
        ->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();
    $evaluacion->update([
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'registrada_at' => now(),
    ]);

    return $evaluacion;
}

function crearEvaluacionFase16ParaInvitado(?string $token = null, array $overrides = []): array
{
    $tokenFinal = $token ?? 'guest_fase16_'.Str::random(16);

    withCookie('guest_session_token', $tokenFinal)
        ->post(route('autoevaluacion.store'), payloadFase16($overrides))
        ->assertSessionHasNoErrors();

    $evaluacion = Autoevaluacion::latest('id')->firstOrFail();

    return [$evaluacion, $tokenFinal];
}

test('1. Usuario registrado titular accede al informe con 200 OK y vista Inertia', function () {
    $titular = User::factory()->create();
    $evaluacion = crearEvaluacionFase16ParaUsuario($titular);

    actingAs($titular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluacion.nombre_comercio', 'Ferretería El Mantaro')
            ->where('esReevaluacion', false)
            ->where('evaluacionOrigen', null)
        );
});

test('2. Usuario registrado ajeno es rechazado con 403 al intentar consultar el informe', function () {
    $titular = User::factory()->create();
    $intruso = User::factory()->create();
    $evaluacion = crearEvaluacionFase16ParaUsuario($titular);

    actingAs($intruso)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('3. Invitado titular con cookie guest_session_token legítimo accede al informe con 200 OK', function () {
    [$evaluacion, $token] = crearEvaluacionFase16ParaInvitado();

    withCookie('guest_session_token', $token)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
        );
});

test('4. Invitado con token ajeno es rechazado con 403 al intentar consultar el informe', function () {
    [$evaluacion] = crearEvaluacionFase16ParaInvitado();
    $tokenAjeno = 'alien_guest_token_9999999999';

    session()->flush();
    withCookie('guest_session_token', $tokenAjeno)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('5. Visitante anónimo sin token es rechazado con 403 conociendo únicamente el UUID', function () {
    [$evaluacion] = crearEvaluacionFase16ParaInvitado();

    session()->flush();
    withCookie('guest_session_token', '')
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('5b. Usuario autenticado no puede consultar informe de una autoevaluación creada como invitado', function () {
    [$evaluacion] = crearEvaluacionFase16ParaInvitado();
    $usuario = User::factory()->create();

    actingAs($usuario)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertForbidden();
});

test('6. El informe se emite con 200 OK para cualquier estado de semáforo (VERDE, ÁMBAR, ROJO)', function () {
    $titular = User::factory()->create();

    // Caso ROJO (fallas críticas presentes)
    $evaluacionRojo = crearEvaluacionFase16ParaUsuario($titular);
    expect($evaluacionRojo->semaforo)->toBe('ROJO');

    actingAs($titular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacionRojo->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.semaforo', 'ROJO')
        );

    // Caso ÁMBAR
    $evaluacionRojo->update(['semaforo' => 'AMBAR']);
    actingAs($titular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacionRojo->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.semaforo', 'AMBAR')
        );

    // Caso VERDE
    $evaluacionRojo->update(['semaforo' => 'VERDE']);
    actingAs($titular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacionRojo->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.semaforo', 'VERDE')
        );
});

test('7. El informe incluye la matriz completa de condiciones evaluadas y conteo de estados exacto', function () {
    $titular = User::factory()->create();
    $evaluacion = crearEvaluacionFase16ParaUsuario($titular);

    actingAs($titular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->has('detalleChecklist', 9)
            ->where('detalleChecklist.0.codigo', 'EXTINTOR_PQS')
            ->where('detalleChecklist.0.categoria', 'INCENDIOS')
            ->where('detalleChecklist.0.estado', 'CUMPLE')
            ->where('detalleChecklist.1.codigo', 'EXTINTOR_K')
            ->where('detalleChecklist.1.estado', 'NA')
            ->where('detalleChecklist.2.codigo', 'DIFERENCIAL')
            ->where('detalleChecklist.2.categoria', 'ELECTRICIDAD')
            ->where('detalleChecklist.2.estado', 'NO_CUMPLE')
            ->where('detalleChecklist.4.codigo', 'POZO_TIERRA')
            ->where('detalleChecklist.4.estado', 'POR_REVISAR')
            ->where('conteoEstados.total', 9)
            ->where('conteoEstados.cumple', 5)
            ->where('conteoEstados.no_cumple', 2)
            ->where('conteoEstados.por_revisar', 1)
            ->where('conteoEstados.na', 1)
        );
});

test('8. POR_REVISAR se preserva sin ser transformado a CUMPLE ni a NO_CUMPLE', function () {
    $titular = User::factory()->create();
    $evaluacion = crearEvaluacionFase16ParaUsuario($titular);

    actingAs($titular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(function (Assert $page) {
            $page->component('Evaluacion/InformePreventivo');
            $props = $page->toArray()['props'];
            $items = $props['detalleChecklist'];
            $itemPozo = collect($items)->firstWhere('codigo', 'POZO_TIERRA');

            expect($itemPozo['estado'])->toBe('POR_REVISAR')
                ->and($props['conteoEstados']['por_revisar'])->toBe(1);
        });
});

test('9. El informe distingue entre evaluación original y reevaluación preventiva', function () {
    $titular = User::factory()->create();
    $evaluacionA = crearEvaluacionFase16ParaUsuario($titular);

    // Consulta informe de A (original)
    actingAs($titular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('esReevaluacion', false)
            ->where('evaluacionOrigen', null)
        );

    // Crear reevaluación B
    $payloadB = payloadFase16([
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'POZO_TIERRA', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ],
    ]);

    actingAs($titular)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), $payloadB)
        ->assertSessionHasNoErrors();

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();
    expect($evaluacionB->evaluacion_origen_id)->toBe($evaluacionA->id);

    // Consulta informe de B (reevaluación)
    actingAs($titular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('esReevaluacion', true)
            ->where('evaluacionOrigen.uuid_trazabilidad', $evaluacionA->uuid_trazabilidad)
            ->where('evaluacionOrigen.semaforo', $evaluacionA->semaforo)
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionB->uuid_trazabilidad)
        );
});

test('10. Los informes de A y B conservan trazabilidad e integridad independientes', function () {
    $titular = User::factory()->create();
    $evaluacionA = crearEvaluacionFase16ParaUsuario($titular);

    $payloadB = payloadFase16([
        'checklist' => [
            ['codigo' => 'EXTINTOR_PQS', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'DIFERENCIAL', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
        ],
    ]);

    actingAs($titular)
        ->post(route('autoevaluacion.reevaluar.store', ['uuid' => $evaluacionA->uuid_trazabilidad]), $payloadB)
        ->assertSessionHasNoErrors();

    $evaluacionB = Autoevaluacion::latest('id')->firstOrFail();

    expect($evaluacionA->uuid_trazabilidad)->not->toBe($evaluacionB->uuid_trazabilidad)
        ->and($evaluacionA->hash_integridad)->not->toBe($evaluacionB->hash_integridad);

    // Informe A conserva sus datos originales
    actingAs($titular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacionA->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionA->uuid_trazabilidad)
            ->where('hashIntegridad', $evaluacionA->hash_integridad)
            ->has('hashFinal')
            ->has('codigoInforme')
        );

    // Informe B conserva sus datos independientes
    actingAs($titular)
        ->get(route('autoevaluacion.informe', ['uuid' => $evaluacionB->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacionB->uuid_trazabilidad)
            ->where('hashIntegridad', $evaluacionB->hash_integridad)
            ->has('hashFinal')
            ->has('codigoInforme')
        );
});

// --- Cobertura heredada de InformePreventivoIntegralTest (matriz de subsanaciones) ---

function payloadInformeSubsanacion(array $overrides = []): array
{
    return array_merge([
        'nombre_comercio' => 'Comercio Andino Jewel',
        'funcion_economica' => 'Comercio',
        'ruc' => '20123456789',
        'sector' => 'Huancayo Centro',
        'area_m2' => '120.5',
        'pisos' => 1,
        'aforo' => 25,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ],
    ], $overrides);
}

function crearAutoevaluacionInformeSubsanacion(array $overrides = []): Autoevaluacion
{
    post(route('autoevaluacion.store'), payloadInformeSubsanacion($overrides))
        ->assertSessionHasNoErrors();

    return Autoevaluacion::firstOrFail();
}

function registrarSimulacionInformeSubsanacion(Autoevaluacion $evaluacion): void
{
    post(
        route('autoevaluacion.simulacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'verificaciones' => [
                'EXTINTOR' => true,
                'TERMOMAGNETICO' => true,
                'EVACUACION' => true,
                'LUCES_EMERG' => false,
                'BOTIQUIN' => true,
            ],
            'discrepancias' => 1,
        ]
    )->assertSessionHasNoErrors();
}

function subsanarInformeSubsanacion(
    Autoevaluacion $evaluacion,
    string $descripcion = 'Instalada lampara autonoma LED con bateria de 90 minutos.'
): void {
    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => $descripcion,
            'estado' => 'SUBSANADO_DECLARADO',
        ]
    )->assertSessionHasNoErrors();
}

test('8. El informe con semaforo verde y subsanaciones con evidencia expone la matriz de subsanaciones', function () {
    Storage::fake('local');

    $evaluacion = crearAutoevaluacionInformeSubsanacion();
    registrarSimulacionInformeSubsanacion($evaluacion);

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lampara autonoma LED con bateria de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => UploadedFile::fake()->createWithContent(
                'evidencia.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
            ),
        ]
    )->assertSessionHasNoErrors();

    expect($evaluacion->fresh()->semaforo)->toBe('VERDE');

    get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('codigoInforme', fn (string $codigo) => str_starts_with($codigo, 'INF-PREV-'))
            ->where('autoevaluacion.nombre_comercio', 'Comercio Andino Jewel')
            ->where('autoevaluacion.ruc', '20123456789')
            ->where('resumen.total_condiciones', 5)
            ->where('resumen.conformes_iniciales', 4)
            ->where('resumen.subsanadas_declaradas', 1)
            ->where('resumen.gap_final', 0)
            ->where('resumen.porcentaje_subsanado', 100)
            ->has('matrizSubsanaciones', 1)
            ->where('matrizSubsanaciones.0.codigo_item', 'LUCES_EMERG')
            ->where('matrizSubsanaciones.0.estado', 'SUBSANADO_DECLARADO')
            ->where('matrizSubsanaciones.0.evidencia_url', fn (string $url) => str_contains($url, '/autoevaluacion/subsanacion/') && str_contains($url, '/evidencia/'))
            ->where('hashIntegridad', $evaluacion->hash_integridad)
            ->where('hashIntegridad', fn (string $hash) => strlen($hash) === 64)
            ->where('hashFinal', fn (string $hash) => preg_match('/^[a-f0-9]{64}$/i', $hash) === 1));
});

test('9. El informe consolida la estructura de hash SHA-256, los datos del establecimiento y la accion subsanada', function () {
    $evaluacion = crearAutoevaluacionInformeSubsanacion();
    registrarSimulacionInformeSubsanacion($evaluacion);
    subsanarInformeSubsanacion($evaluacion);

    get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluacion.funcion_economica', 'Comercio')
            ->where('autoevaluacion.sector_huancayo', null)
            ->where('autoevaluacion.area_m2', 120.5)
            ->where('autoevaluacion.aforo', 25)
            ->where('autoevaluacion.pisos', 1)
            ->where('autoevaluacion.semaforo', 'VERDE')
            ->where('resumen.total_condiciones', 5)
            ->where('resumen.conformes_iniciales', 4)
            ->where('resumen.subsanadas_declaradas', 1)
            ->where('hashIntegridad', $evaluacion->hash_integridad)
            ->where('hashIntegridad', fn (string $hash) => preg_match('/^[a-f0-9]{64}$/i', $hash) === 1)
            ->where('hashFinal', fn (string $hash) => preg_match('/^[a-f0-9]{64}$/i', $hash) === 1)
            ->has('matrizSubsanaciones', 1)
            ->where('matrizSubsanaciones.0.codigo_item', 'LUCES_EMERG')
            ->where(
                'matrizSubsanaciones.0.deficiencia_inicial',
                'Luces de emergencia autónomas operativas en vías de salida (autonomía 90 min)'
            )
            ->where('matrizSubsanaciones.0.accion_realizada', 'Instalada lampara autonoma LED con bateria de 90 minutos.'));
});
