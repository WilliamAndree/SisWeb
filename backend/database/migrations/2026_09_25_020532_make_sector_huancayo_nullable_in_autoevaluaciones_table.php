<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Flexibiliza sector_huancayo a nullable en autoevaluaciones,
     * retirando su obligatoriedad operativa al no tener función normativa en la aplicabilidad.
     */
    public function up(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->string('sector_huancayo', 255)->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->string('sector_huancayo', 255)->nullable(false)->change();
        });
    }
};
