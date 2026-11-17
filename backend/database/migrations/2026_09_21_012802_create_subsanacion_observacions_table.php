<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subsanaciones_observaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auditoria_inspector_id')
                ->constrained('auditorias_inspector')
                ->cascadeOnDelete();
            $table->string('codigo_item');
            $table->text('descripcion'); // Sustento del comerciante
            $table->string('evidencia_url')->nullable();
            $table->enum('estado', [
                'SUBSANADO_CONFORME',
                'PERSISTE_OBSERVACION',
                'NUEVA_OBSERVACION',
            ])->default('SUBSANADO_CONFORME');
            $table->text('observacion_inspector')->nullable();
            $table->timestamp('fecha_subsanacion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subsanaciones_observaciones');
    }
};
