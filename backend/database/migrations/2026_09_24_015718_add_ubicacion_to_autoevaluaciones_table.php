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
            $table->string('direccion', 255)->nullable()->after('sector_huancayo');
            $table->string('referencia', 255)->nullable()->after('direccion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->dropColumn(['direccion', 'referencia']);
        });
    }
};
