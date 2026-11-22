<?php

namespace App\Console\Commands;

use Database\Seeders\E2eSeeder;
use Illuminate\Console\Command;

/**
 * Deja la base de pruebas end-to-end en un estado conocido antes de correr Cypress.
 *
 * Por seguridad solo funciona en el entorno "e2e" y con una base cuyo nombre termine en
 * "_e2e": nunca puede borrar la base real de la aplicación.
 */
class PrepararE2e extends Command
{
    protected $signature = 'checkitse:e2e-preparar';

    protected $description = 'Reinicia la base sisweb_e2e con datos conocidos para Cypress';

    public function handle(): int
    {
        $base = (string) config('database.connections.'.config('database.default').'.database');

        if (! app()->environment('e2e') || ! str_ends_with($base, '_e2e')) {
            $this->error('Rechazado: requiere APP_ENV=e2e y una base *_e2e (actual: entorno '.app()->environment().", base {$base}).");

            return self::FAILURE;
        }

        $this->call('migrate:fresh', ['--force' => true, '--seed' => true, '--seeder' => E2eSeeder::class]);
        $this->info("Base {$base} lista para Cypress.");

        return self::SUCCESS;
    }
}
