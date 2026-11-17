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
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->dropIndex('autoevaluaciones_codigo_acceso_index');
            $table->unique('codigo_acceso', 'autoevaluaciones_codigo_acceso_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->dropUnique('autoevaluaciones_codigo_acceso_unique');
            $table->index('codigo_acceso', 'autoevaluaciones_codigo_acceso_index');
        });
    }
};
