<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('proveedores_recursos', function (Blueprint $table) {
            if (! Schema::hasColumn('proveedores_recursos', 'rubro')) {
                $table->string('rubro', 50)->nullable()->after('categoria_id');
            }
            if (! Schema::hasColumn('proveedores_recursos', 'tipo_servicio')) {
                $table->string('tipo_servicio', 255)->nullable()->after('nombre_comercial');
            }
            if (! Schema::hasColumn('proveedores_recursos', 'verificado')) {
                $table->boolean('verificado')->default(true)->after('activo');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('proveedores_recursos', function (Blueprint $table) {
            $table->dropColumn(['rubro', 'tipo_servicio', 'verificado']);
        });
    }
};
