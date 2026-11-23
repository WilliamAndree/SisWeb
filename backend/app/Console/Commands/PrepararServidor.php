<?php

namespace App\Console\Commands;

use App\Models\CriterioNormativo;
use App\Models\User;
use Database\Seeders\DemoCuentasSeeder;
use Database\Seeders\DemoImpactoSeeder;
use Database\Seeders\NormativaCatalogSeeder;
use Database\Seeders\ProveedorRecursoSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Prepara la base de un servidor recién creado (contenedor del laboratorio de la universidad).
 *
 * - Aplica las migraciones.
 * - La primera vez carga el catálogo normativo, los proveedores y los datos de demostración
 *   de los reportes (código DEMO-). Si la base ya tiene datos, no los toca.
 * - Las cuentas de demostración (@checkitse.local) nunca quedan con la clave pública del
 *   repositorio: reciben la clave indicada en --clave o, si no se indica, una aleatoria que se
 *   muestra una sola vez.
 */
class PrepararServidor extends Command
{
    protected $signature = 'checkitse:servidor-preparar {--clave= : Clave para las cuentas de demostración (si no, se genera una)}';

    protected $description = 'Migra y carga los datos iniciales de un servidor nuevo, con claves propias';

    public function handle(): int
    {
        $this->call('migrate', ['--force' => true]);

        if (CriterioNormativo::query()->exists()) {
            $this->info('La base ya tiene datos: solo se aplicaron migraciones.');

            return self::SUCCESS;
        }

        foreach ([NormativaCatalogSeeder::class, ProveedorRecursoSeeder::class, DemoCuentasSeeder::class, DemoImpactoSeeder::class] as $seeder) {
            $this->call('db:seed', ['--class' => $seeder, '--force' => true]);
        }

        $clave = (string) ($this->option('clave') ?: Str::password(16, symbols: false));
        $cuentas = User::query()
            ->where('email', 'like', '%@checkitse.local')
            ->where('email', '!=', DemoImpactoSeeder::CORREO)
            ->get();
        foreach ($cuentas as $cuenta) {
            $cuenta->forceFill(['password' => Hash::make($clave)])->save();
        }

        $this->info('Datos iniciales cargados. Cuentas de demostración: '.$cuentas->pluck('email')->implode(', '));
        if (! $this->option('clave')) {
            $this->warn("Clave generada para esas cuentas (se muestra una sola vez): {$clave}");
        }

        return self::SUCCESS;
    }
}
