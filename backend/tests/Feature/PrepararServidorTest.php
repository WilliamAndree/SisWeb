<?php

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\User;
use Database\Seeders\DemoCuentasSeeder;
use Illuminate\Support\Facades\Hash;

/**
 * Preparación de un servidor nuevo (contenedor del laboratorio): carga los datos iniciales
 * una sola vez y nunca deja las cuentas de demostración con la clave pública del repositorio.
 */
test('carga catálogo, proveedores y datos de reportes con una clave propia', function () {
    $this->artisan('checkitse:servidor-preparar', ['--clave' => 'ClaveDelServidor2026'])->assertSuccessful();

    $admin = User::where('email', 'admin@checkitse.local')->firstOrFail();

    expect(CriterioNormativo::count())->toBeGreaterThan(0)
        ->and(Autoevaluacion::where('codigo_acceso', 'like', 'DEMO-%')->count())->toBeGreaterThan(0)
        ->and(Hash::check('ClaveDelServidor2026', $admin->password))->toBeTrue()
        ->and(Hash::check(DemoCuentasSeeder::CLAVE_DEMO, $admin->password))->toBeFalse();
});

test('sin --clave genera una aleatoria y no usa la clave pública', function () {
    $this->artisan('checkitse:servidor-preparar')
        ->expectsOutputToContain('Clave generada')
        ->assertSuccessful();

    User::where('email', 'like', '%@checkitse.local')->get()
        ->each(fn (User $u) => expect(Hash::check(DemoCuentasSeeder::CLAVE_DEMO, $u->password))->toBeFalse());
});

test('si la base ya tiene datos, solo migra y no los vuelve a cargar', function () {
    $this->artisan('checkitse:servidor-preparar', ['--clave' => 'Primera2026'])->assertSuccessful();
    $locales = Autoevaluacion::count();

    $this->artisan('checkitse:servidor-preparar', ['--clave' => 'Segunda2026'])
        ->expectsOutputToContain('solo se aplicaron migraciones')
        ->assertSuccessful();

    expect(Autoevaluacion::count())->toBe($locales)
        ->and(Hash::check('Primera2026', User::where('email', 'admin@checkitse.local')->value('password')))->toBeTrue();
});
