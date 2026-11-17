<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subsanaciones', function (Blueprint $table) {
            $table->foreignId('autoevaluacion_id')
                ->nullable()
                ->after('id')
                ->constrained('autoevaluaciones')
                ->cascadeOnDelete();

            $table->foreignId('criterio_id')
                ->nullable()
                ->after('autoevaluacion_id')
                ->constrained('criterios_normativos')
                ->cascadeOnDelete();

            $table->unsignedBigInteger('simulacion_revision_id')
                ->nullable()
                ->change();

            $table->string('hash_sha256', 64)
                ->nullable()
                ->after('evidencia_url');
        });

        // Retrocompatibilidad y consistencia: asociar subsanaciones preexistentes
        DB::statement('UPDATE subsanaciones s JOIN simulaciones_revision sr ON s.simulacion_revision_id = sr.id SET s.autoevaluacion_id = sr.autoevaluacion_id WHERE s.autoevaluacion_id IS NULL');
        DB::statement('UPDATE subsanaciones s JOIN criterios_normativos c ON s.codigo_item = c.codigo_criterio SET s.criterio_id = c.id WHERE s.criterio_id IS NULL');

        Schema::table('historial_subsanaciones', function (Blueprint $table) {
            $table->string('hash_sha256', 64)
                ->nullable()
                ->after('evidencia_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('historial_subsanaciones', function (Blueprint $table) {
            $table->dropColumn('hash_sha256');
        });

        Schema::table('subsanaciones', function (Blueprint $table) {
            $table->dropForeign(['autoevaluacion_id']);
            $table->dropForeign(['criterio_id']);
            $table->dropColumn(['autoevaluacion_id', 'criterio_id', 'hash_sha256']);
            $table->unsignedBigInteger('simulacion_revision_id')
                ->nullable(false)
                ->change();
        });
    }
};
