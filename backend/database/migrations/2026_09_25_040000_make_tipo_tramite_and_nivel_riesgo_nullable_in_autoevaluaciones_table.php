<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Permite que las columnas heredadas tipo_tramite y nivel_riesgo sean opcionales (nullable)
     * para retirar activamente la clasificación administrativa/riesgo en nuevas autoevaluaciones
     * preservando a la vez los registros históricos existentes.
     */
    public function up(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->string('tipo_tramite')->nullable()->default(null)->change();
            $table->string('nivel_riesgo')->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->string('tipo_tramite')->default('EX_POST')->change();
            $table->string('nivel_riesgo')->default('BAJO_MEDIO')->change();
        });
    }
};
