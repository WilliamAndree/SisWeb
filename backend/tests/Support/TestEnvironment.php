<?php

namespace Tests\Support;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\DatabaseManager;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Bootstrap\HandleExceptions;
use Illuminate\Foundation\Bootstrap\LoadConfiguration;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Facade;
use Monolog\Handler\NullHandler;
use RuntimeException;
use Throwable;

/**
 * Test-only bootstrap. Nothing in production registers or loads this class.
 */
final class TestEnvironment
{
    public const DATABASE = 'sisweb_testing';

    private static ?string $storage = null;

    public static function createApplication(bool $preflight = false): Application
    {
        $base = dirname(__DIR__, 2);

        if (! is_file($base.'/.env.testing')) {
            throw new RuntimeException('Falta .env.testing: no se permite cargar .env como alternativa.');
        }

        $storage = self::storagePath();
        // Todas las cachés de Laravel (incluida la de configuración) apuntan a un directorio temporal:
        // la caché de producción de esta misma carpeta (php artisan optimize) nunca llega a las pruebas.
        foreach (['config', 'services', 'packages', 'routes', 'events'] as $cache) {
            $key = 'APP_'.strtoupper($cache).'_CACHE';
            $_ENV[$key] = $_SERVER[$key] = $storage.'/bootstrap/'.$cache.'.php';
            putenv($key.'='.$_ENV[$key]);
        }

        Facade::clearResolvedInstances();
        $app = require $base.'/bootstrap/app.php';
        if (DIRECTORY_SEPARATOR === '\\') {
            $app->addAbsoluteCachePathPrefix(substr($storage, 0, 2));
        }
        $app->loadEnvironmentFrom('.env.testing');
        $app->useStoragePath($storage);
        if ($preflight) {
            $app->instance(HandleExceptions::class, new class extends HandleExceptions
            {
                public function bootstrap(\Illuminate\Contracts\Foundation\Application $app): void
                {
                    // The read-only preflight must not replace PHPUnit's global handlers.
                }
            });
        }

        if ($app->configurationIsCached()) {
            throw new RuntimeException('Se rechaza cualquier caché de configuración en el runner.');
        }

        $app->afterBootstrapping(LoadConfiguration::class, function (Application $app): void {
            if (! $app->environment('testing')) {
                throw new RuntimeException('El entorno efectivo de Laravel debe ser testing.');
            }

            $config = $app->make('config');
            if ($config->get('database.default') !== 'mysql') {
                throw new RuntimeException('La conexión efectiva debe ser mysql.');
            }

            $connection = $config->get('database.connections.mysql', []);
            self::assertConnection($connection);
            $config->set('database.connections', ['mysql' => $connection]);
            $config->set('database.redis', []);
            $config->set('cache.default', 'array');
            $config->set('cache.stores', ['array' => ['driver' => 'array', 'serialize' => false]]);
            $config->set('session.driver', 'array');
            $config->set('queue.default', 'sync');
            $config->set('queue.connections', ['sync' => ['driver' => 'sync']]);
            $config->set('queue.failed.driver', 'null');
            $config->set('mail.default', 'array');
            $config->set('mail.mailers', ['array' => ['transport' => 'array']]);
            $config->set('logging.default', 'null');
            $config->set('logging.channels', ['null' => ['driver' => 'monolog', 'handler' => NullHandler::class]]);
            $config->set('services.gemini.api_key', 'testing-no-real-api');
            $config->set('services.gemini.max_retries', 0);
            $config->set('filesystems.default', 'local');
            $config->set('filesystems.disks', [
                'local' => ['driver' => 'local', 'root' => self::storagePath().'/app/private', 'throw' => true],
                'public' => ['driver' => 'local', 'root' => self::storagePath().'/app/public', 'visibility' => 'public', 'throw' => true],
            ]);
            $config->set('filesystems.links', []);
            $config->set('view.compiled', self::storagePath().'/framework/views');

            $app->resolving(Factory::class, function (Factory $http): void {
                $http->preventStrayRequests();
            });

            $app->resolving('db', function (DatabaseManager $manager, Application $app): void {
                $manager->extend('mysql', function (array $config, string $name) use ($app) {
                    self::assertConnection($config);
                    $connection = $app->make('db.factory')->make($config, $name);
                    $connection->beforeExecuting(function () use ($connection): void {
                        self::assertConnection($connection->getConfig());
                    });

                    return $connection;
                });
            });
        });

        $app->make(Kernel::class)->bootstrap();

        return $app;
    }

    /** @param array<string, mixed> $config */
    public static function assertConnection(array $config): void
    {
        if (($config['driver'] ?? null) !== 'mysql'
            || ($config['host'] ?? null) !== '127.0.0.1'
            || ! in_array((string) ($config['port'] ?? ''), ['3306', '3307'], true)
            || ($config['database'] ?? null) !== self::DATABASE
            || ($config['username'] ?? null) !== 'sisweb_testing'
            || ! empty($config['url'])
            || ! empty($config['unix_socket'])
            || isset($config['read'])
            || isset($config['write'])) {
            throw new RuntimeException('Conexión rechazada: se exige mysql en 127.0.0.1:3306 o 3307, base y usuario sisweb_testing, sin URL/socket/réplicas.');
        }
    }

    /** @param list<string> $grants */
    public static function assertGrants(array $grants): void
    {
        $hasDatabaseGrant = false;
        foreach ($grants as $grant) {
            if (preg_match('/^GRANT USAGE ON \*\.\* TO /i', $grant)) {
                continue;
            }

            if (! str_starts_with($grant, 'GRANT ALL PRIVILEGES ON `sisweb\\_testing`.* TO ')) {
                throw new RuntimeException('Privilegios rechazados: la cuenta de pruebas debe estar limitada a sisweb_testing.*, sin roles ni permisos globales.');
            }

            if (str_contains(strtoupper($grant), 'WITH GRANT OPTION')) {
                throw new RuntimeException('La cuenta de pruebas no puede conceder privilegios.');
            }
            $hasDatabaseGrant = true;
        }

        if (! $hasDatabaseGrant) {
            throw new RuntimeException('Faltan privilegios exclusivos para la base de pruebas.');
        }
    }

    /** @return array<string, mixed> */
    public static function verify(Application $app): array
    {
        self::assertConnection($app['config']->get('database.connections.mysql', []));

        try {
            $connection = $app->make('db')->connection();
            $actual = $connection->selectOne('SELECT DATABASE() AS db, CURRENT_USER() AS account, @@GLOBAL.innodb_force_recovery AS recovery_mode');
            $grants = array_map(fn (object $row): string => (string) array_values((array) $row)[0], $connection->select('SHOW GRANTS FOR CURRENT_USER'));
        } catch (Throwable) {
            throw new RuntimeException('No se pudo verificar MySQL con la cuenta exclusiva. No se ejecutarán migraciones ni pruebas.');
        }

        if ($actual->db !== self::DATABASE || ! str_starts_with($actual->account, 'sisweb_testing@')) {
            throw new RuntimeException('El servidor resolvió una base o cuenta diferente de la autorizada.');
        }
        self::assertGrants($grants);
        self::assertRecoveryMode((int) $actual->recovery_mode);

        return [
            'environment' => $app->environment(),
            'connection' => $connection->getName(),
            'host' => $connection->getConfig('host'),
            'port' => $connection->getConfig('port'),
            'database_config' => $connection->getDatabaseName(),
            'database_server' => $actual->db,
            'restricted_account' => true,
            'innodb_force_recovery' => (int) $actual->recovery_mode,
            'storage' => self::storagePath(),
            'cache' => $app['config']->get('cache.default'),
            'session' => $app['config']->get('session.driver'),
            'queue' => $app['config']->get('queue.default'),
            'mail' => $app['config']->get('mail.default'),
            'http_stray_requests_blocked' => $app->make(Factory::class)->preventingStrayRequests(),
        ];
    }

    public static function assertRecoveryMode(int $mode): void
    {
        if ($mode !== 0) {
            throw new RuntimeException('Se rechaza ejecutar pruebas con InnoDB en recuperación forzada.');
        }
    }

    public static function storagePath(): string
    {
        if (self::$storage === null) {
            $root = realpath(sys_get_temp_dir());
            if ($root === false) {
                throw new RuntimeException('Directorio temporal no disponible.');
            }
            $path = $root.'/sisweb-tests-'.getmypid().'-'.bin2hex(random_bytes(8));
            if (! mkdir($path, 0700)) {
                throw new RuntimeException('No se pudo crear almacenamiento temporal exclusivo.');
            }
            self::$storage = str_replace('\\', '/', realpath($path));
            foreach (['app/private', 'app/public', 'bootstrap', 'framework/views', 'framework/sessions', 'framework/cache/data', 'framework/testing/disks', 'logs'] as $directory) {
                mkdir(self::$storage.'/'.$directory, 0700, true);
            }
        }

        return self::$storage;
    }
}
