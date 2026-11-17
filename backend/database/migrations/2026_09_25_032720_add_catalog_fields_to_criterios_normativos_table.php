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
        Schema::table('criterios_normativos', function (Blueprint $table) {
            $table->string('titulo', 255)->nullable()->after('categoria');
            $table->string('riesgo_asociado', 30)->nullable()->after('tipo_criterio');
            $table->integer('orden')->default(0)->after('riesgo_asociado');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('criterios_normativos', function (Blueprint $table) {
            $table->dropColumn(['titulo', 'riesgo_asociado', 'orden']);
        });
    }
};
