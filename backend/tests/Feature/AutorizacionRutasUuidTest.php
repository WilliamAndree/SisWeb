<?php

use App\Models\Autoevaluacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\withCookie;
use function Pest\Laravel\withSession;

/**
 * Helpers para instanciar autoevaluaciones bajo prueba
 */
function crearAutoevaluacionRegistradaConPropietario(User $user): Autoevaluacion
{
    return Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $user->id,
        'nombre_comercio' => 'Bodega Propietario',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'AMBAR',
        'porcentaje_cumplimiento' => 70.0,
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
        ],
    ]);
}

function crearAutoevaluacionRegistradaInvitado(string $sessionToken): Autoevaluacion
{
    return Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => null,
        'session_token' => $sessionToken,
        'nombre_comercio' => 'Bodega Invitado',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'AMBAR',
        'porcentaje_cumplimiento' => 70.0,
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
        ],
    ]);
}

function payloadSimulacion(): array
{
    return [
        'verificaciones' => ['EXTINTOR' => true, 'LUCES_EMERG' => false],
        'discrepancias' => 1,
    ];
}

function crearAutoevaluacionIniciadaInvitado(?string $sessionToken = null): Autoevaluacion
{
    return Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => null,
        'session_token' => $sessionToken,
        'nombre_comercio' => 'Bodega Borrador',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_INICIADA,
        'semaforo' => 'VERDE',
        'porcentaje_cumplimiento' => 0.0,
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ],
    ]);
}

/*
|--------------------------------------------------------------------------
| H-03: simulacionRevision (GET /autoevaluacion/revision/{uuid})
|--------------------------------------------------------------------------
*/
describe('H-03: simulacionRevision (GET /autoevaluacion/revision/{uuid})', function () {
    test('propietario autenticado accede con 200 OK', function () {
        $propietario = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        actingAs($propietario);

        get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertOk();
    });

    test('otro usuario autenticado recibe 403 Forbidden', function () {
        $propietario = User::factory()->create();
        $intruso = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        actingAs($intruso);

        get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();
    });

    test('invitado sin cookie o con cookie ajena no accede y recibe 403 Forbidden', function () {
        $tokenReal = 'token_real_legitimo_12345678901234567890';
        $tokenAjeno = 'token_atacante_ajeno_12345678901234567890';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        // Sin cookie
        get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();

        // Con cookie ajena
        withCookie('guest_session_token', $tokenAjeno)
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();
    });

    test('invitado titular con su cookie legítima accede con 200 OK', function () {
        $tokenReal = 'token_real_legitimo_12345678901234567890';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        withCookie('guest_session_token', $tokenReal)
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertOk();
    });
});

/*
|--------------------------------------------------------------------------
| H-03: guardarSimulacion (POST /autoevaluacion/revision/{uuid})
|--------------------------------------------------------------------------
*/
describe('H-03: guardarSimulacion (POST /autoevaluacion/revision/{uuid})', function () {
    test('propietario autenticado guarda simulación y es redirigido', function () {
        $propietario = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        actingAs($propietario);

        post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), payloadSimulacion())
            ->assertRedirect(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    });

    test('otro usuario autenticado recibe 403 Forbidden al intentar guardar simulación', function () {
        $propietario = User::factory()->create();
        $intruso = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        actingAs($intruso);

        post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), payloadSimulacion())
            ->assertForbidden();
    });

    test('invitado sin cookie o con cookie ajena recibe 403 Forbidden', function () {
        $tokenReal = 'token_real_legitimo_12345678901234567890';
        $tokenAjeno = 'token_atacante_ajeno_12345678901234567890';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        // Sin cookie
        post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), payloadSimulacion())
            ->assertForbidden();

        // Con cookie ajena
        withCookie('guest_session_token', $tokenAjeno)
            ->post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), payloadSimulacion())
            ->assertForbidden();
    });

    test('invitado titular con su cookie legítima guarda simulación y es redirigido', function () {
        $tokenReal = 'token_real_legitimo_12345678901234567890';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        withCookie('guest_session_token', $tokenReal)
            ->post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), payloadSimulacion())
            ->assertRedirect(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    });
});

/*
|--------------------------------------------------------------------------
| H-03: descargarEvidencia (GET /autoevaluacion/subsanacion/{uuid}/evidencia/{subsanacion})
|--------------------------------------------------------------------------
*/
describe('H-03: descargarEvidencia', function () {
    test('propietario autenticado descarga evidencia y otro usuario recibe 403', function () {
        Storage::fake('local');
        $rutaArchivo = Storage::disk('local')->putFile('evidencias/subsanaciones', UploadedFile::fake()->create('foto.jpg', 100));

        $propietario = User::factory()->create();
        $intruso = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        $simulacion = SimulacionRevision::create([
            'autoevaluacion_id' => $autoevaluacion->id,
            'codigo_revision' => 'REV-001',
            'resultado' => 'CON_OBSERVACIONES',
            'detalle_revision' => ['LUCES_EMERG' => false],
            'porcentaje_revision' => 50.0,
            'metrica_gap' => 20.0,
            'total_observaciones' => 1,
        ]);

        $subsanacion = Subsanacion::create([
            'simulacion_revision_id' => $simulacion->id,
            'codigo_item' => 'LUCES_EMERG',
            'descripcion' => 'Se colocaron luces LED autónomas',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia_url' => $rutaArchivo,
        ]);

        $url = route('autoevaluacion.evidencia', [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
            'subsanacion' => $subsanacion->id,
        ]);

        // Intruso recibe 403
        actingAs($intruso)->get($url)->assertForbidden();

        // Propietario accede 200
        actingAs($propietario)->get($url)->assertOk();
    });

    test('invitado con cookie descarga evidencia y sin cookie o cookie ajena recibe 403', function () {
        Storage::fake('local');
        $rutaArchivo = Storage::disk('local')->putFile('evidencias/subsanaciones', UploadedFile::fake()->create('foto.jpg', 100));

        $tokenReal = 'token_invitado_descarga_1234567890';
        $tokenAjeno = 'token_invitado_descarga_9999999999';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        $simulacion = SimulacionRevision::create([
            'autoevaluacion_id' => $autoevaluacion->id,
            'codigo_revision' => 'REV-002',
            'resultado' => 'CON_OBSERVACIONES',
            'detalle_revision' => ['LUCES_EMERG' => false],
            'porcentaje_revision' => 50.0,
            'metrica_gap' => 20.0,
            'total_observaciones' => 1,
        ]);

        $subsanacion = Subsanacion::create([
            'simulacion_revision_id' => $simulacion->id,
            'codigo_item' => 'LUCES_EMERG',
            'descripcion' => 'Se colocaron luces LED autónomas',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia_url' => $rutaArchivo,
        ]);

        $url = route('autoevaluacion.evidencia', [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
            'subsanacion' => $subsanacion->id,
        ]);

        // Sin cookie -> 403
        get($url)->assertForbidden();

        // Con cookie ajena -> 403
        withCookie('guest_session_token', $tokenAjeno)->get($url)->assertForbidden();

        // Con cookie legítima -> 200
        withCookie('guest_session_token', $tokenReal)->get($url)->assertOk();
    });
});

/*
|--------------------------------------------------------------------------
| H-03: mis-autoevaluaciones/{uuid}/expediente
|--------------------------------------------------------------------------
*/
describe('H-03: mis-autoevaluaciones/{uuid}/expediente', function () {
    test('propietario autenticado accede a expediente y otro usuario autenticado recibe 403', function () {
        $propietario = User::factory()->create();
        $intruso = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        $url = route('mis-autoevaluaciones.expediente', ['uuid' => $autoevaluacion->uuid_trazabilidad]);

        // Intruso recibe 403
        actingAs($intruso)->get($url)->assertForbidden();

        // Propietario accede 200
        actingAs($propietario)->get($url)->assertOk();
    });

    test('visitante no autenticado es redirigido a login', function () {
        $propietario = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        $url = route('mis-autoevaluaciones.expediente', ['uuid' => $autoevaluacion->uuid_trazabilidad]);

        get($url)->assertRedirect(route('login'));
    });
});

/*
|--------------------------------------------------------------------------
| SEC-01: Control de acceso unificado e integridad de tokens (E-04, E-05, E-07, E-09, E-11, E-12, E-13)
|--------------------------------------------------------------------------
*/
describe('SEC-01: Control de acceso e integridad de tokens', function () {
    test('E-04: autoevaluacion anonima con session_token nulo o vacio en BD retorna 403 Forbidden incluso con cookie vacia', function () {
        $autoevaluacionNull = Autoevaluacion::create([
            'uuid_trazabilidad' => (string) Str::uuid(),
            'user_id' => null,
            'session_token' => null,
            'nombre_comercio' => 'Bodega Sin Token',
            'funcion_economica' => 'Comercio',
            'estado' => Autoevaluacion::ESTADO_REGISTRADA,
            'semaforo' => 'VERDE',
            'porcentaje_cumplimiento' => 100.0,
            'detalle_checklist' => [],
        ]);

        // Petición sin cookie
        get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacionNull->uuid_trazabilidad]))
            ->assertForbidden();

        // Petición con cookie vacía (evita bypass de hash_equals)
        withCookie('guest_session_token', '')
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacionNull->uuid_trazabilidad]))
            ->assertForbidden();

        // Autoevaluación con session_token string vacío en BD
        $autoevaluacionVacio = Autoevaluacion::create([
            'uuid_trazabilidad' => (string) Str::uuid(),
            'user_id' => null,
            'session_token' => '',
            'nombre_comercio' => 'Bodega Token Vacio',
            'funcion_economica' => 'Comercio',
            'estado' => Autoevaluacion::ESTADO_REGISTRADA,
            'semaforo' => 'VERDE',
            'porcentaje_cumplimiento' => 100.0,
            'detalle_checklist' => [],
        ]);

        withCookie('guest_session_token', '')
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacionVacio->uuid_trazabilidad]))
            ->assertForbidden();
    });

    test('E-05: modificacion de declaraciones de checklist por tercero sin credenciales retorna 403 Forbidden', function () {
        $tokenReal = 'token_real_e05_1234567890';
        $tokenAtacante = 'token_atacante_e05_999999';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        $payload = ['criterio_id' => 1, 'nota' => 'Subsanación no autorizada'];

        // Tercero sin cookie
        post(route('autoevaluacion.declarar_subsanado', ['uuid' => $autoevaluacion->uuid_trazabilidad]), $payload)
            ->assertForbidden();

        // Tercero con cookie ajena
        withCookie('guest_session_token', $tokenAtacante)
            ->post(route('autoevaluacion.declarar_subsanado', ['uuid' => $autoevaluacion->uuid_trazabilidad]), $payload)
            ->assertForbidden();
    });

    test('E-07: vinculacion legitima de autoevaluacion anonima a cuenta autenticada y eliminacion de guest_authorized_uuid en sesion', function () {
        $user = User::factory()->create();
        $token = 'token_vinculacion_e07_12345';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($token);

        actingAs($user)
            ->withSession(['guest_authorized_uuid' => $autoevaluacion->uuid_trazabilidad])
            ->withCookie('guest_session_token', $token)
            ->post(route('autoevaluacion.vincular-cuenta'), [
                'uuid' => $autoevaluacion->uuid_trazabilidad,
            ])
            ->assertRedirect()
            ->assertSessionMissing('guest_authorized_uuid');

        expect($autoevaluacion->fresh()->user_id)->toBe($user->id);
    });

    test('E-09: descarga de informe o anexo oficial sin credencial legitima retorna 403 Forbidden', function () {
        $propietario = User::factory()->create();
        $intruso = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        // Intento anónimo a informe
        get(route('autoevaluacion.informe', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();

        // Intento de otro usuario autenticado a informe
        actingAs($intruso)
            ->get(route('autoevaluacion.informe', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();

        // Intento anónimo a anexo
        get(route('autoevaluacion.anexo', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();

        // Intento de otro usuario a anexo
        actingAs($intruso)
            ->get(route('autoevaluacion.anexo', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();
    });

    test('E-11: continuidad de acceso legitimo para usuario autenticado tras vinculacion', function () {
        $user = User::factory()->create();
        $token = 'token_e11_12345';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($token);

        // Vinculación legítima
        actingAs($user)
            ->withCookie('guest_session_token', $token)
            ->post(route('autoevaluacion.vincular-cuenta'), [
                'uuid' => $autoevaluacion->uuid_trazabilidad,
            ])
            ->assertRedirect();

        // Continuidad: el usuario autenticado accede a sus rutas sin cookie de invitado
        actingAs($user)
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertOk();

        actingAs($user)
            ->get(route('mis-autoevaluaciones.expediente', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertOk();
    });

    test('E-12: evaluacion de usuario con guest_authorized_uuid en sesion de un tercero retorna 403 Forbidden', function () {
        $propietario = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        // Tercero anónimo con guest_authorized_uuid en sesión
        withSession(['guest_authorized_uuid' => $autoevaluacion->uuid_trazabilidad])
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();

        // Otro usuario autenticado con guest_authorized_uuid en sesión
        $intruso = User::factory()->create();
        actingAs($intruso)
            ->withSession(['guest_authorized_uuid' => $autoevaluacion->uuid_trazabilidad])
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();
    });

    test('E-13: evaluacion anonima en estado REGISTRADA con sesion inmediata residual retorna 403 Forbidden', function () {
        $token = 'token_e13_12345';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($token);

        // Visitante con sesión residual guest_authorized_uuid pero SIN cookie válida
        withSession(['guest_authorized_uuid' => $autoevaluacion->uuid_trazabilidad])
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();
    });

    test('sesion inmediata legitima permite acceso a evaluacion anonima en estado INICIADA', function () {
        $autoevaluacionIniciada = crearAutoevaluacionIniciadaInvitado('token_iniciada_123');

        // Con sesión inmediata válida y estado INICIADA, accede 200 OK
        withSession(['guest_authorized_uuid' => $autoevaluacionIniciada->uuid_trazabilidad])
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacionIniciada->uuid_trazabilidad]))
            ->assertOk();
    });
});

/*
|--------------------------------------------------------------------------
| SEC-02: Restricciones de formato UUID y bloqueo de IDOR numérico (E-08)
|--------------------------------------------------------------------------
*/
describe('SEC-02: Restricciones de formato UUID y bloqueo de IDOR numérico', function () {
    test('E-08: acceso con ID numerico en rutas UUID retorna 404 Not Found por restriccion whereUuid', function () {
        $propietario = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        // /evaluacion/{uuid} con ID numérico -> 404
        get('/evaluacion/'.$autoevaluacion->id)
            ->assertNotFound();

        // /mis-autoevaluaciones/{uuid}/expediente con ID numérico -> 404
        actingAs($propietario)
            ->get('/mis-autoevaluaciones/'.$autoevaluacion->id.'/expediente')
            ->assertNotFound();

        // /autoevaluacion/revision/{uuid} con ID numérico -> 404
        actingAs($propietario)
            ->get('/autoevaluacion/revision/'.$autoevaluacion->id)
            ->assertNotFound();
    });
});
