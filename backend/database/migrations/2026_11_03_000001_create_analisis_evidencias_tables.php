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
        Schema::create('analisis_evidencias', function (Blueprint $table) {
            $table->id();
            $table->string('uuid_analisis', 64)->unique();
            $table->foreignId('autoevaluacion_id')
                ->constrained('autoevaluaciones')
                ->cascadeOnDelete();
            $table->foreignId('subsanacion_id')
                ->constrained('subsanaciones')
                ->cascadeOnDelete();
            $table->foreignId('criterio_id')
                ->nullable()
                ->constrained('criterios_normativos')
                ->nullOnDelete();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('hash_evidencia_analizada', 64)->index();
            $table->string('estado_analisis', 30)->default('PENDIENTE')->index();
            $table->string('modelo_solicitado', 100)->default('gemini-3.8-flash');
            $table->string('version_modelo', 100)->nullable();
            $table->unsignedTinyInteger('intentos')->default(0);
            $table->text('mensaje_error')->nullable();
            $table->timestamp('iniciado_at')->nullable();
            $table->timestamp('completado_at')->nullable();
            $table->timestamps();
        });

        Schema::create('resultados_analisis_evidencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('analisis_evidencia_id')
                ->unique()
                ->constrained('analisis_evidencias')
                ->cascadeOnDelete();
            $table->string('criterio_codigo', 50)->index();
            $table->string('calidad_imagen', 50)->default('ACEPTABLE');
            $table->string('relevancia_evidencia', 50)->default('PARCIALMENTE_PERTINENTE');
            $table->string('nivel_incertidumbre', 30)->default('MEDIO');
            $table->json('elementos_detectados')->nullable();
            $table->json('observaciones_visuales')->nullable();
            $table->json('condiciones_visibles')->nullable();
            $table->json('no_observable')->nullable();
            $table->json('recomendaciones_captura')->nullable();
            $table->text('resumen_pedagogico')->nullable();
            $table->unsignedInteger('tokens_entrada')->nullable();
            $table->unsignedInteger('tokens_salida')->nullable();
            $table->unsignedInteger('tiempo_procesamiento_ms')->nullable();
            $table->json('raw_payload_salida')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resultados_analisis_evidencias');
        Schema::dropIfExists('analisis_evidencias');
    }
};
