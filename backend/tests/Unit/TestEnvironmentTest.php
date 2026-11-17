<?php

use Illuminate\Http\Client\StrayRequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\Support\TestEnvironment;
use Tests\TestCase;

uses(TestCase::class);

test('rechaza conexiones no autorizadas antes de abrir PDO', function (string $key, mixed $value) {
    $config = config('database.connections.mysql');
    $config[$key] = $value;

    expect(fn () => TestEnvironment::assertConnection($config))->toThrow(RuntimeException::class);
})->with([
    'base de desarrollo' => ['database', 'sisweb'],
    'nombre anterior no autorizado' => ['database', 'sisweb_test'],
    'cuenta administrativa' => ['username', 'root'],
    'host remoto' => ['host', 'db.example.invalid'],
    'puerto ajeno' => ['port', '3308'],
    'URL que sustituye el destino' => ['url', 'mysql://root@localhost/sisweb'],
    'socket alternativo' => ['unix_socket', '/tmp/mysql.sock'],
    'replica lectura' => ['read', ['host' => 'remote.invalid']],
    'replica escritura' => ['write', ['database' => 'sisweb']],
    'motor alternativo' => ['driver', 'sqlite'],
]);

test('rechaza privilegios globales o sobre otras bases', function (array $grants) {
    expect(fn () => TestEnvironment::assertGrants($grants))->toThrow(RuntimeException::class);
})->with([
    'administrador' => [["GRANT ALL PRIVILEGES ON *.* TO 'sisweb_testing'@'localhost'"]],
    'base ajena' => [["GRANT ALL PRIVILEGES ON `sisweb`.* TO 'sisweb_testing'@'localhost'"]],
    'comodin underscore' => [["GRANT ALL PRIVILEGES ON `sisweb_testing`.* TO 'sisweb_testing'@'localhost'"]],
    'delegacion' => [["GRANT ALL PRIVILEGES ON `sisweb\\_testing`.* TO 'sisweb_testing'@'localhost' WITH GRANT OPTION"]],
    'rol' => [["GRANT `admin` TO 'sisweb_testing'@'localhost'"]],
    'solo usage' => [["GRANT USAGE ON *.* TO 'sisweb_testing'@'localhost'"]],
]);

test('verifica base real y cuenta restringida con consultas de solo lectura', function () {
    $report = TestEnvironment::verify($this->app);

    expect($report['database_server'])->toBe('sisweb_testing')
        ->and($report['restricted_account'])->toBeTrue()
        ->and($report['http_stray_requests_blocked'])->toBeTrue()
        ->and($report['innodb_force_recovery'])->toBe(0);
});

test('rechaza motores en recuperacion forzada antes de migrar', function (int $mode) {
    expect(fn () => TestEnvironment::assertRecoveryMode($mode))->toThrow(RuntimeException::class);
})->with([1, 2, 6]);

test('bloquea HTTP no simulado sin contactar servicios externos', function (string $url) {
    expect(fn () => Http::get($url))->toThrow(StrayRequestException::class);
})->with([
    'Gemini' => 'https://generativelanguage.googleapis.com/v1beta/models/testing:generateContent',
    'otro servicio' => 'https://external.example.invalid/resource',
]);

test('permite una respuesta simulada y mantiene bloqueados otros destinos', function () {
    Http::fake(['https://fake.example.invalid/allowed' => Http::response(['ok' => true])]);

    expect(Http::get('https://fake.example.invalid/allowed')->json('ok'))->toBeTrue();
    expect(fn () => Http::get('https://fake.example.invalid/other'))->toThrow(StrayRequestException::class);
    Http::assertSentCount(1);
});

test('la migracion de evidencias solo copia y elimina dentro del almacenamiento temporal', function () {
    Storage::disk('public')->put('evidencias/sentinel.txt', 'solo sandbox');
    $migration = require base_path('database/migrations/2026_09_24_040035_move_evidencias_to_private_storage.php');

    $migration->up();

    Storage::disk('local')->assertExists('evidencias/sentinel.txt');
    Storage::disk('public')->assertMissing('evidencias/sentinel.txt');
    expect(Storage::disk('local')->get('evidencias/sentinel.txt'))->toBe('solo sandbox')
        ->and(Storage::disk('local')->path(''))->toStartWith(TestEnvironment::storagePath())
        ->and(Storage::disk('public')->path(''))->toStartWith(TestEnvironment::storagePath())
        ->and(storage_path())->not->toBe(base_path('storage'));
});

test('Storage fake tambien queda dentro del sandbox y no puede abrir s3', function () {
    Storage::fake('local');
    Storage::disk('local')->put('fake.txt', 'sandbox');

    Storage::disk('local')->assertExists('fake.txt');
    expect(Storage::disk('local')->path(''))->toStartWith(TestEnvironment::storagePath());
    expect(fn () => Storage::disk('s3'))->toThrow(InvalidArgumentException::class);
});

test('cache sesiones correo y colas no usan servicios persistentes', function () {
    expect(config('cache.default'))->toBe('array')
        ->and(config('session.driver'))->toBe('array')
        ->and(config('mail.default'))->toBe('array')
        ->and(config('queue.default'))->toBe('sync');
    expect(fn () => app('cache')->store('database'))->toThrow(InvalidArgumentException::class);
    expect(fn () => app('queue')->connection('redis'))->toThrow(InvalidArgumentException::class);
});

test('la conexion nueva rechaza una configuracion modificada antes de conectar', function () {
    config(['database.connections.mysql.database' => 'sisweb']);
    app('db')->purge('mysql');

    expect(fn () => app('db')->connection('mysql'))->toThrow(RuntimeException::class);
});
