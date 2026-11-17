<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Permite que las características especiales sean verdaderamente opcionales (nullable)
     * para no forzar valores por defecto (false o 0) cuando el ciudadano no ha respondido.
     */
    public function up(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->boolean('usa_glp')->nullable()->default(null)->change();
            $table->decimal('galones_glp', 8, 2)->nullable()->default(null)->change();
            $table->boolean('usa_caldero')->nullable()->default(null)->change();
            $table->boolean('usa_liquidos_inflamables')->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->boolean('usa_glp')->default(false)->change();
            $table->decimal('galones_glp', 8, 2)->default(0)->change();
            $table->boolean('usa_caldero')->default(false)->change();
            $table->boolean('usa_liquidos_inflamables')->default(false)->change();
        });
    }
};
