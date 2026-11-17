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
            $table->foreignId('evaluacion_origen_id')
                ->nullable()
                ->after('session_token')
                ->constrained('autoevaluaciones')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->dropForeign(['evaluacion_origen_id']);
            $table->dropColumn('evaluacion_origen_id');
        });
    }
};
