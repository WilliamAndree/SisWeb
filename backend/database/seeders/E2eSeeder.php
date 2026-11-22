<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Datos conocidos para las pruebas end-to-end de Cypress (base sisweb_e2e).
 *
 *  - Catálogo normativo y proveedores (directorio).
 *  - Cuentas demo: admin@checkitse.local y proveedor@checkitse.local (CheckItse2026!).
 *  - Doña María (donamaria@huancayo.pe / password123): local registrado con 2 condiciones
 *    pendientes, para probar la corrección.
 *  - 42 locales DEMO- para el módulo de reportes.
 */
class E2eSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            NormativaCatalogSeeder::class,
            ProveedorRecursoSeeder::class,
            DemoCuentasSeeder::class,
            DemoWalkthroughSeeder::class,
            DemoImpactoSeeder::class,
        ]);
    }
}
