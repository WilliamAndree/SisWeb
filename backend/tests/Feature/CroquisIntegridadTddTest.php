<?php

use App\Models\Subsanacion;
use App\Models\User;
use App\Services\Espacio\AnalisisEspacialService;
use App\Services\Espacio\GestionEspacialService;
use Illuminate\Support\Facades\DB;
use Tests\Support\EspacioFixture;

test('GEO-3D-03 rechaza entrada geometrica invalida con 422 sin crear versiones', function (string $path, mixed $valor) {
    $evaluacion = EspacioFixture::evaluacion();
    $geometria = EspacioFixture::geometria();
    data_set($geometria, $path, $valor);

    $this->actingAs($evaluacion->user)->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/guardar", ['geometria' => $geometria])
        ->assertUnprocessable();

    $this->assertDatabaseCount('versiones_planos', 0);
})->with([
    'posicion textual' => ['niveles.0.ambientes.0.posicion_x', 'desconocido'],
    'posicion fuera del decimal SQL' => ['niveles.0.ambientes.0.posicion_x', 1e100],
    'piso no entero' => ['niveles.0.numero_piso', 'piso'],
    'altura textual' => ['niveles.0.altura_metros', 'alta'],
    'altura negativa subcentimetro' => ['niveles.0.altura_metros', -0.001],
    'lista de conectores corrupta' => ['niveles.0.conectores', 'corrupto'],
    'lista de vertices corrupta' => ['niveles.0.ambientes.0.vertices_poligono', 'corrupto'],
    'ancho enorme' => ['niveles.0.ambientes.0.ancho_metros', 1e100],
    'booleano falso textual' => ['niveles.0.conectores.0.conduce_a_salida_publica', 'false'],
]);

test('GEO-3D-04 rechaza poligono que toca una arista no adyacente', function () {
    $geometria = EspacioFixture::geometria();
    $geometria['niveles'][0]['ambientes'][0]['vertices_poligono'] = [
        ['x' => 0, 'y' => 0], ['x' => 4, 'y' => 0], ['x' => 4, 'y' => 4],
        ['x' => 2, 'y' => 0], ['x' => 0, 'y' => 4],
    ];

    expect(fn () => app(GestionEspacialService::class)->normalizarGeometria($geometria))->toThrow(InvalidArgumentException::class);
});

test('PLAN-3D-01 nunca produce hash de JSON no serializable', function () {
    expect(fn () => app(GestionEspacialService::class)->calcularHashGeometria(['dato' => NAN]))->toThrow(JsonException::class);
});

test('PLAN-3D-02 no permite reabrir una version historica cerrada', function () {
    ['plano' => $plano, 'version' => $anterior] = EspacioFixture::persistir();
    $nuevo = EspacioFixture::geometria();
    $nuevo['niveles'][0]['nombre'] = 'Segundo estado';
    app(GestionEspacialService::class)->crearOActualizarVersion($plano, $nuevo);
    $anterior->refresh();

    expect(fn () => $anterior->update(['cerrada_at' => null]))->toThrow(LogicException::class);
    expect($anterior->fresh()->cerrada_at)->not->toBeNull();
});

test('PLAN-3D-03 detecta divergencia relacional aunque la cantidad de filas no cambie', function () {
    ['version' => $version] = EspacioFixture::persistir();
    DB::table('ambientes_zonas')->where('nivel_piso_id', $version->niveles()->firstOrFail()->id)->update(['area_m2' => 999]);

    $integridad = app(GestionEspacialService::class)->verificarIntegridadCompleta($version);

    expect($integridad['valido'])->toBeFalse();
    expect($integridad['divergencia_relacional'])->toBeTrue();
});

test('PLAN-3D-04 rechaza descarga de geometria historica adulterada con 409', function () {
    ['evaluacion' => $evaluacion, 'version' => $version] = EspacioFixture::persistir();
    $geometria = $version->geometria_normalizada;
    $geometria['niveles'][0]['nombre'] = 'Alterado';
    DB::table('versiones_planos')->where('id', $version->id)->update(['geometria_normalizada' => json_encode($geometria)]);

    $this->actingAs($evaluacion->user)->getJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/versiones/{$version->id}")->assertConflict();
});

test('PLAN-3D-05 no divulga una version activa perteneciente a otro plano', function () {
    $propio = EspacioFixture::persistir();
    $ajeno = EspacioFixture::persistir();
    DB::table('planos_establecimientos')->where('id', $propio['plano']->id)->update(['version_activa_id' => $ajeno['version']->id]);

    $this->actingAs($propio['evaluacion']->user)->getJson("/autoevaluacion/{$propio['evaluacion']->uuid_trazabilidad}/croquis/datos")->assertConflict();
});

test('PLAN-3D-06 editor con sugerencia valida genera enlace privado de evidencia', function () {
    $contexto = EspacioFixture::persistir();
    EspacioFixture::sugerencia($contexto);

    $this->actingAs($contexto['evaluacion']->user)->get("/autoevaluacion/{$contexto['evaluacion']->uuid_trazabilidad}/croquis")->assertOk();
});

test('PLAN-3D-07 un reenvio no devuelve una version activa corrupta como guardado exitoso', function () {
    ['plano' => $plano, 'version' => $version] = EspacioFixture::persistir();
    $alterada = $version->geometria_normalizada;
    $alterada['niveles'][0]['nombre'] = 'Manipulado';
    DB::table('versiones_planos')->where('id', $version->id)->update(['geometria_normalizada' => json_encode($alterada)]);

    $guardada = app(GestionEspacialService::class)->crearOActualizarVersion($plano, EspacioFixture::geometria());

    expect($guardada->id)->not->toBe($version->id);
    expect(app(GestionEspacialService::class)->verificarIntegridadVersion($guardada))->toBeTrue();
});

test('PLAN-3D-08 no permite vincular evidencia ajena mediante un elemento del croquis', function () {
    $evaluacion = EspacioFixture::evaluacion();
    $ajena = EspacioFixture::evaluacion();
    $sub = Subsanacion::create(['autoevaluacion_id' => $ajena->id, 'codigo_item' => 'CRIT-01', 'descripcion' => 'Registro ajeno', 'estado' => 'PENDIENTE']);
    $geometria = EspacioFixture::geometria();
    $geometria['niveles'][0]['ambientes'][0]['elementos'] = [['tipo' => 'EXTINTOR', 'posicion_x' => 1, 'posicion_y' => 1, 'subsanacion_id' => $sub->id]];

    $this->actingAs($evaluacion->user)->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/guardar", ['geometria' => $geometria])->assertUnprocessable();
    $this->assertDatabaseCount('versiones_planos', 0);
});

test('PLAN-3D-09 analisis rechaza version activa de otro plano sin crear registros', function () {
    $propio = EspacioFixture::persistir();
    $ajeno = EspacioFixture::persistir();
    DB::table('planos_establecimientos')->where('id', $propio['plano']->id)->update(['version_activa_id' => $ajeno['version']->id]);

    $this->actingAs($propio['evaluacion']->user)->postJson("/autoevaluacion/{$propio['evaluacion']->uuid_trazabilidad}/croquis/analisis")->assertConflict();
    $this->assertDatabaseCount('analisis_espaciales', 0);
});

test('PLAN-3D-10 estructura almacenada corrupta genera fallo de integridad en vez de error 500', function () {
    ['evaluacion' => $evaluacion, 'version' => $version] = EspacioFixture::persistir();
    $geometria = $version->geometria_normalizada;
    $geometria['niveles'][0]['ambientes'][0]['elementos'] = 'corrupto';
    DB::table('versiones_planos')->where('id', $version->id)->update([
        'geometria_normalizada' => json_encode($geometria),
        'hash_geometria_sha256' => hash('sha256', json_encode($geometria, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)),
    ]);

    $this->actingAs($evaluacion->user)->postJson("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/analisis")
        ->assertOk()->assertJsonPath('analisis.estado_ejecucion', 'ERROR_INTEGRIDAD');
});

test('GEO-3D-06 dimensiones invalidas y poligonos insuficientes se rechazan', function (string $campo, mixed $valor) {
    $geometria = EspacioFixture::geometria();
    $geometria['niveles'][0]['ambientes'][0][$campo] = $valor;

    expect(fn () => app(GestionEspacialService::class)->normalizarGeometria($geometria))->toThrow(InvalidArgumentException::class);
})->with([
    'ancho negativo' => ['ancho_metros', -1], 'ancho cero' => ['ancho_metros', 0],
    'ancho null' => ['ancho_metros', null], 'largo cero' => ['largo_metros', 0],
    'pocos vertices' => ['vertices_poligono', [['x' => 0, 'y' => 0], ['x' => 1, 'y' => 1]]],
    'poligono cruzado' => ['vertices_poligono', [['x' => 0, 'y' => 0], ['x' => 4, 'y' => 4], ['x' => 0, 'y' => 4], ['x' => 4, 'y' => 0]]],
]);

test('GEO-3D-07 area irregular y orientacion se calculan sin usar area declarada incorrecta', function (array $vertices, float $area) {
    $geometria = EspacioFixture::geometria();
    $geometria['niveles'][0]['ambientes'][0]['vertices_poligono'] = $vertices;
    $geometria['niveles'][0]['ambientes'][0]['area_m2'] = 999;

    $normalizada = app(GestionEspacialService::class)->normalizarGeometria($geometria);

    expect($normalizada['niveles'][0]['ambientes'][0]['area_m2'])->toBe($area);
})->with([
    'triangulo' => [[['x' => 0, 'y' => 0], ['x' => 4, 'y' => 0], ['x' => 0, 'y' => 3]], 6.0],
    'triangulo inverso' => [[['x' => 0, 'y' => 3], ['x' => 4, 'y' => 0], ['x' => 0, 'y' => 0]], 6.0],
    'irregular L' => [[['x' => 0, 'y' => 0], ['x' => 7, 'y' => 0], ['x' => 7, 'y' => 4], ['x' => 4, 'y' => 4], ['x' => 4, 'y' => 9], ['x' => 0, 'y' => 9]], 48.0],
]);

test('PLAN-3D-11 endpoints espaciales rechazan terceros sin mutaciones', function (string $accion, string $metodo) {
    $contexto = EspacioFixture::persistir();
    $sugerencia = EspacioFixture::sugerencia($contexto);
    $accion = str_replace(['{version}', '{sugerencia}'], [$contexto['version']->id, $sugerencia->id], $accion);

    $this->actingAs(User::factory()->create())->{$metodo}("/autoevaluacion/{$contexto['evaluacion']->uuid_trazabilidad}/croquis/{$accion}", [
        'geometria' => EspacioFixture::geometria(), 'codigo_ambiente' => 'A', 'posicion_x' => 1, 'posicion_y' => 1,
    ])->assertForbidden();

    $this->assertDatabaseCount('versiones_planos', 1);
    $this->assertDatabaseCount('analisis_espaciales', 0);
    expect($sugerencia->fresh()->estado)->toBe('PENDIENTE');
})->with([
    'datos' => ['datos', 'getJson'], 'version' => ['versiones/{version}', 'getJson'],
    'guardar' => ['guardar', 'postJson'], 'analizar' => ['analisis', 'postJson'],
    'sugerencias' => ['sugerencias', 'getJson'], 'confirmar' => ['sugerencias/{sugerencia}/confirmar', 'postJson'],
    'rechazar' => ['sugerencias/{sugerencia}/rechazar', 'postJson'], 'plantilla' => ['elementos/confirmar-plantilla', 'postJson'],
]);

test('PLAN-3D-12 invitado accede solo con cookie legitima a version y analisis', function (bool $legitimo, string $metodo, string $accion) {
    $contexto = EspacioFixture::persistir();
    $evaluacion = $contexto['evaluacion'];
    $evaluacion->update(['user_id' => null, 'session_token' => 'token_3d_legitimo']);
    $accion = str_replace('{version}', $contexto['version']->id, $accion);

    $this->withCredentials()->withCookie('guest_session_token', $legitimo ? 'token_3d_legitimo' : 'otro')->{$metodo}("/autoevaluacion/{$evaluacion->uuid_trazabilidad}/croquis/{$accion}")
        ->assertStatus($legitimo ? 200 : 403);
})->with([[true, 'getJson', 'versiones/{version}'], [false, 'getJson', 'versiones/{version}'], [true, 'postJson', 'analisis'], [false, 'postJson', 'analisis']]);

test('PLAN-3D-13 FK de otro piso con igual codigo no pasa auditoria relacional', function () {
    $geometria = EspacioFixture::geometria();
    $segundo = $geometria['niveles'][0];
    $segundo['numero_piso'] = 2;
    $segundo['conectores'] = [];
    $geometria['niveles'][] = $segundo;
    ['version' => $version] = EspacioFixture::persistir($geometria);
    $nivel1 = $version->niveles()->where('numero_piso', 1)->firstOrFail();
    $nivel2 = $version->niveles()->where('numero_piso', 2)->firstOrFail();
    DB::table('conectores_circulacion')->where('nivel_piso_id', $nivel1->id)->update(['ambiente_origen_id' => $nivel2->ambientes()->firstOrFail()->id]);

    expect(app(GestionEspacialService::class)->verificarIntegridadCompleta($version)['valido'])->toBeFalse();
});

test('PLAN-3D-14 analisis deja de ser vigente si su geometria activa es adulterada', function () {
    ['version' => $version] = EspacioFixture::persistir();
    $analisis = app(AnalisisEspacialService::class)->ejecutarAnalisis($version);
    $geometria = $version->geometria_normalizada;
    $geometria['niveles'][0]['nombre'] = 'Cambio no autorizado';
    DB::table('versiones_planos')->where('id', $version->id)->update(['geometria_normalizada' => json_encode($geometria)]);

    expect($analisis->fresh()->esVigente())->toBeFalse();
});

test('PLAN-3D-15 auditoria distingue null y cero en altura relacional', function () {
    ['version' => $version] = EspacioFixture::persistir();
    DB::table('niveles_pisos')->where('version_plano_id', $version->id)->update(['altura_metros' => 0]);

    expect(app(GestionEspacialService::class)->verificarIntegridadCompleta($version)['valido'])->toBeFalse();
});

test('GEO-3D-09 rectangulo en limite SQL produce una version consultable e integra', function () {
    $geometria = EspacioFixture::geometria();
    $geometria['niveles'][0]['ambientes'][0]['posicion_x'] = 9999.99;
    $geometria['niveles'][0]['conectores'] = [];
    ['version' => $version] = EspacioFixture::persistir($geometria);

    expect(app(GestionEspacialService::class)->verificarIntegridadCompleta($version)['valido'])->toBeTrue();
});

test('PLAN-3D-16 identificadores ajenos bajo UUID propio retornan 404', function (string $accion, string $metodo) {
    $propio = EspacioFixture::persistir();
    $ajeno = EspacioFixture::persistir();
    $sugerencia = EspacioFixture::sugerencia($ajeno);
    $accion = str_replace(['{version}', '{sugerencia}'], [$ajeno['version']->id, $sugerencia->id], $accion);

    $this->actingAs($propio['evaluacion']->user)->{$metodo}("/autoevaluacion/{$propio['evaluacion']->uuid_trazabilidad}/croquis/{$accion}", [
        'codigo_ambiente' => 'A', 'posicion_x' => 1, 'posicion_y' => 1,
    ])->assertNotFound();

    expect($sugerencia->fresh()->estado)->toBe('PENDIENTE');
    $this->assertDatabaseCount('versiones_planos', 2);
})->with([['versiones/{version}', 'getJson'], ['sugerencias/{sugerencia}/confirmar', 'postJson'], ['sugerencias/{sugerencia}/rechazar', 'postJson']]);

test('GEO-3D-10 identidad duplicada de ambiente o piso se rechaza', function (bool $piso) {
    $geometria = EspacioFixture::geometria();
    if ($piso) {
        $geometria['niveles'][] = $geometria['niveles'][0];
    } else {
        $geometria['niveles'][0]['ambientes'][] = $geometria['niveles'][0]['ambientes'][0];
    }

    expect(fn () => app(GestionEspacialService::class)->normalizarGeometria($geometria))->toThrow(InvalidArgumentException::class);
})->with([true, false]);

test('PLAN-3D-17 ausencia de hijos de una version generada no acredita integridad', function () {
    ['version' => $version] = EspacioFixture::persistir();
    DB::table('niveles_pisos')->where('version_plano_id', $version->id)->delete();

    expect(app(GestionEspacialService::class)->verificarIntegridadCompleta($version)['valido'])->toBeFalse();
});

test('PLAN-3D-18 hash real y reenvio equivalente preservan version y snapshot', function () {
    ['plano' => $plano, 'version' => $version] = EspacioFixture::persistir();
    $geometria = EspacioFixture::geometria();
    $geometria['niveles'][0]['ambientes'][0] = array_reverse($geometria['niveles'][0]['ambientes'][0], true);

    $mismo = app(GestionEspacialService::class)->crearOActualizarVersion($plano, $geometria);

    expect($mismo->id)->toBe($version->id);
    expect($version->hash_geometria_sha256)->toBe(hash('sha256', json_encode($version->geometria_normalizada, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)));
    $this->assertDatabaseCount('versiones_planos', 1);
});
