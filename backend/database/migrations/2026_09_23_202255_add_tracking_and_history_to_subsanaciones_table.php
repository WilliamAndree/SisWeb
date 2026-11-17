<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subsanaciones', function (Blueprint $table) {
            if (! Schema::hasColumn('subsanaciones', 'fecha_subsanacion')) {
                $table->timestamp('fecha_subsanacion')->nullable()->after('estado');
            }
            if (! Schema::hasColumn('subsanaciones', 'notas_ciudadano')) {
                $table->text('notas_ciudadano')->nullable()->after('fecha_subsanacion');
            }
        });

        Schema::create('historial_subsanaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subsanacion_id')->constrained('subsanaciones')->cascadeOnDelete();
            $table->string('estado_anterior', 50);
            $table->string('estado_nuevo', 50);
            $table->text('evidencia_url')->nullable();
            $table->text('comentario')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historial_subsanaciones');
        Schema::table('subsanaciones', function (Blueprint $table) {
            $table->dropColumn(['fecha_subsanacion', 'notas_ciudadano']);
        });
    }
};
