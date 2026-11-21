<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;

/**
 * Corrección de datos: las correcciones guardadas antes de unificar la lógica no se
 * reflejaban en el estado del local. Al desplegar, se aplican a todas las cuentas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Artisan::call('checkitse:sincronizar-subsanaciones');
    }

    public function down(): void
    {
        // Es una corrección de datos idempotente: no hay nada que deshacer.
    }
};
