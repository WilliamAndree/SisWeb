<?php

use App\Models\Autoevaluacion;
use App\Models\HistorialSubsanacion;
use App\Models\Subsanacion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseCount;
use function Pest\Laravel\get;
use function Pest\Laravel\post;

function payloadBaseEvidencias(array $overrides = []): array
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

function crearAutoevaluacionEvidencias(array $overrides = []): Autoevaluacion
{
    post(route('autoevaluacion.store'), payloadBaseEvidencias($overrides))
        ->assertSessionHasNoErrors();

    return Autoevaluacion::latest('id')->firstOrFail();
}

function verificacionesEvidencias(): array
{
    return [
        'EXTINTOR' => true,
        'TERMOMAGNETICO' => true,
        'EVACUACION' => true,
        'LUCES_EMERG' => false,
        'BOTIQUIN' => true,
    ];
}

function registrarSimulacionEvidencias(Autoevaluacion $evaluacion, array $verificaciones = []): void
{
    post(
        route('autoevaluacion.simulacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        ['verificaciones' => $verificaciones ?: verificacionesEvidencias(), 'discrepancias' => 1]
    )->assertSessionHasNoErrors();
}

function registrarSubsanacionConEvidenciaEvidencias(Autoevaluacion $evaluacion, array $overrides = []): Subsanacion
{
    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        array_merge([
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => UploadedFile::fake()->createWithContent(
                'evidencia.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
            ),
        ], $overrides)
    )->assertSessionHasNoErrors();

    return Subsanacion::where('simulacion_revision_id', $evaluacion->simulacionRevision->id)
        ->where('codigo_item', $overrides['codigo_item'] ?? 'LUCES_EMERG')
        ->firstOrFail();
}

it('persiste una evidencia de imagen válida en storage privado y actualiza evidencia_url', function () {
    Storage::fake('local');

    $evaluacion = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacion);

    $response = post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => UploadedFile::fake()->createWithContent(
                'evidencia.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
            ),
        ]
    );

    $response->assertSessionHasNoErrors();

    $subsanacion = Subsanacion::where('codigo_item', 'LUCES_EMERG')->firstOrFail();

    expect($subsanacion->evidencia_url)->toStartWith('evidencias/subsanaciones/');

    Storage::disk('local')->assertExists($subsanacion->evidencia_url);
    Storage::disk('public')->assertMissing($subsanacion->evidencia_url);
});

it('acepta una imagen WEBP como evidencia declarada', function () {
    Storage::fake('local');

    $evaluacion = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacion);

    $response = post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => UploadedFile::fake()->createWithContent(
                'evidencia.webp',
                "RIFF\0\0\0\0WEBP"
            ),
        ]
    );

    $response->assertSessionHasNoErrors();

    $subsanacion = Subsanacion::where('codigo_item', 'LUCES_EMERG')->firstOrFail();

    Storage::disk('local')->assertExists($subsanacion->evidencia_url);
});

it('rechaza archivos de evidencia no permitidos sin persistir subsanación', function (UploadedFile $archivo, string $mensajeEsperado) {
    $evaluacion = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacion);

    $response = post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => $archivo,
        ]
    );

    $response->assertSessionHasErrors('evidencia');

    expect(session('errors')->first('evidencia'))->toContain($mensajeEsperado);

    assertDatabaseCount('subsanaciones', 0);
})->with([
    'ejecutable' => [
        fn (): UploadedFile => UploadedFile::fake()->create('instalador.exe', 10),
        'Este formato de archivo no está permitido',
    ],
    'imagen mayor a 5 MB' => [
        fn (): UploadedFile => UploadedFile::fake()->createWithContent(
            'evidencia-grande.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
                .str_repeat("\0", 6 * 1024 * 1024)
        ),
        'El archivo supera el tamaño máximo permitido',
    ],
]);

it('registra la trazabilidad histórica al cambiar el estado de una subsanación', function () {
    $evaluacion = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacion);

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Se programa la instalación de la lámpara autónoma.',
            'estado' => 'PENDIENTE',
        ]
    )->assertSessionHasNoErrors();

    expect(HistorialSubsanacion::query()->count())->toBe(0);

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
        ]
    )->assertSessionHasNoErrors();

    $historial = HistorialSubsanacion::query()->latest()->first();

    expect($historial)->not->toBeNull()
        ->and($historial->estado_anterior)->toBe('PENDIENTE')
        ->and($historial->estado_nuevo)->toBe('SUBSANADO_DECLARADO');
});

it('pasa a semáforo VERDE cuando todas las observaciones están declaradas como subsanadas', function () {
    $evaluacion = crearAutoevaluacionEvidencias([
        'checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ],
    ]);

    registrarSimulacionEvidencias($evaluacion, [
        'EXTINTOR' => false,
        'TERMOMAGNETICO' => true,
        'EVACUACION' => true,
        'LUCES_EMERG' => false,
        'BOTIQUIN' => true,
    ]);

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'EXTINTOR',
            'descripcion_subsanacion' => 'Recarga y mantenimiento del extintor PQS con tarjeta vigente.',
            'estado' => 'SUBSANADO_DECLARADO',
        ]
    )->assertSessionHasNoErrors();

    expect($evaluacion->fresh()->semaforo)->toBe('ROJO')
        ->and($evaluacion->fresh()->semaforo)->not->toBe('VERDE');

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
        ]
    )->assertSessionHasNoErrors();

    expect($evaluacion->fresh()->semaforo)->toBe('VERDE')
        ->and($evaluacion->fresh()->porcentaje_cumplimiento)->toBe(100.0)

        ->and($evaluacion->simulaciones()->first()->fresh()->metrica_gap)->toBe(0.0);
});

it('solo el titular registrado puede descargar su evidencia declarada', function () {
    Storage::fake('local');

    $titular = User::factory()->create();
    $tercero = User::factory()->create();

    $evaluacion = crearAutoevaluacionEvidencias();
    $evaluacion->update(['user_id' => $titular->id]);
    actingAs($titular);
    registrarSimulacionEvidencias($evaluacion);

    $subsanacion = registrarSubsanacionConEvidenciaEvidencias($evaluacion);

    $url = route('autoevaluacion.evidencia', [
        'uuid' => $evaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]);

    actingAs($tercero)->get($url)->assertForbidden();
    actingAs($titular)->get($url)->assertOk();
});

it('exige el guest_session_token original para descargar evidencias de invitados', function () {
    Storage::fake('local');

    $tokenOriginal = 'guest-token-seguro-1234567890';

    $evaluacion = crearAutoevaluacionEvidencias();
    $evaluacion->update(['session_token' => $tokenOriginal]);
    registrarSimulacionEvidencias($evaluacion);

    $subsanacion = registrarSubsanacionConEvidenciaEvidencias($evaluacion);

    $url = route('autoevaluacion.evidencia', [
        'uuid' => $evaluacion->uuid_trazabilidad,
        'subsanacion' => $subsanacion->id,
    ]);

    get($url)->assertForbidden();
    $this->withCookie('guest_session_token', 'token-incorrecto')->get($url)->assertForbidden();
    $this->withCookie('guest_session_token', $tokenOriginal)->get($url)->assertOk();
});

it('rechaza aplicar una evidencia desconocida sobre una autoevaluación ajena', function () {
    Storage::fake('local');

    $evaluacionA = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacionA);
    registrarSubsanacionConEvidenciaEvidencias($evaluacionA);

    $evaluacionB = crearAutoevaluacionEvidencias(['nombre_comercio' => 'Otro Comercio Andino']);
    registrarSimulacionEvidencias($evaluacionB);
    $subsanacionB = registrarSubsanacionConEvidenciaEvidencias($evaluacionB);

    $url = route('autoevaluacion.evidencia', [
        'uuid' => $evaluacionA->uuid_trazabilidad,
        'subsanacion' => $subsanacionB->id,
    ]);

    get($url)->assertNotFound();
});

it('conserva la evidencia declarada ante recargas y consultas posteriores', function () {
    Storage::fake('local');

    $evaluacion = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacion);
    $subsanacion = registrarSubsanacionConEvidenciaEvidencias($evaluacion);

    // Simula una recarga: el registro y el archivo persisten en el almacenamiento.
    $registroRecargado = Subsanacion::findOrFail($subsanacion->id);

    expect($registroRecargado->evidencia_url)->toStartWith('evidencias/subsanaciones/');

    Storage::disk('local')->assertExists($registroRecargado->evidencia_url);

    // La consulta posterior del panel conserva la evidencia asociada a su subsanación.
    get(route('autoevaluacion.subsanacion', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/Subsanacion')
            ->where('ultimaRevision.subsanaciones.0.codigo_item', 'LUCES_EMERG')
            ->where('ultimaRevision.subsanaciones.0.estado', 'SUBSANADO_DECLARADO')
            ->where('ultimaRevision.subsanaciones.0.evidencia_url', $registroRecargado->evidencia_url));
});

it('mantiene separadas las evidencias entre revisiones de una reevaluación', function () {
    Storage::fake('local');

    $evaluacion = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacion);
    $primera = registrarSubsanacionConEvidenciaEvidencias($evaluacion);

    // Reevaluación: el ciudadano genera una nueva simulación de revisión in situ.
    registrarSimulacionEvidencias($evaluacion);

    expect($evaluacion->simulaciones()->count())->toBe(2);

    // La evidencia de la primera revisión se conserva asociada a su subsanación.
    expect($primera->fresh()->evidencia_url)->toStartWith('evidencias/subsanaciones/');

    // La nueva revisión no hereda evidencias ni subsanaciones previas.
    $nuevaRevision = $evaluacion->simulaciones()->orderBy('id', 'desc')->firstOrFail();

    expect(Subsanacion::where('simulacion_revision_id', $nuevaRevision->id)->count())->toBe(0);

    assertDatabaseCount('subsanaciones', 1);

    // La evidencia de la revisión anterior queda fuera del flujo vigente (404).
    get(route('autoevaluacion.evidencia', [
        'uuid' => $evaluacion->uuid_trazabilidad,
        'subsanacion' => $primera->id,
    ]))->assertNotFound();
});

it('conserva en almacenamiento privado la evidencia anterior al reemplazarla para custodia histórica', function () {
    Storage::fake('local');

    $evaluacion = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacion);

    $subsanacion = registrarSubsanacionConEvidenciaEvidencias($evaluacion);
    $rutaAnterior = $subsanacion->evidencia_url;

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Reemplazada con una fotografía más reciente del sistema de luces.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => UploadedFile::fake()->createWithContent(
                'evidencia-v2.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
            ),
        ]
    )->assertSessionHasNoErrors();

    $actualizada = $subsanacion->fresh();

    expect($actualizada->evidencia_url)->not->toBe($rutaAnterior)
        ->and($actualizada->evidencia_url)->toStartWith('evidencias/subsanaciones/');

    Storage::disk('local')->assertExists($rutaAnterior);
    Storage::disk('local')->assertExists($actualizada->evidencia_url);
});
