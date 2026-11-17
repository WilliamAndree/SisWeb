<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Permite que area_m2, pisos y aforo sean nullable en autoevaluaciones,
     * garantizando que el sistema no invente datos por defecto si el ciudadano no los declara.
     */
    public function up(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->decimal('area_m2', 8, 2)->nullable()->default(null)->change();
            $table->integer('pisos')->nullable()->default(null)->change();
            $table->integer('aforo')->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->decimal('area_m2', 8, 2)->nullable(false)->change();
            $table->integer('pisos')->nullable(false)->default(1)->change();
            $table->integer('aforo')->nullable(false)->default(10)->change();
        });
    }
};
