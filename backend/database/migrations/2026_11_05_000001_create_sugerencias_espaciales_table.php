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
        Schema::create('sugerencias_espaciales', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid_sugerencia')->unique();
            $table->foreignId('autoevaluacion_id')->constrained('autoevaluaciones')->cascadeOnDelete();
            $table->foreignId('plano_establecimiento_id')->constrained('planos_establecimientos')->cascadeOnDelete();
            $table->foreignId('analisis_evidencia_id')->constrained('analisis_evidencias')->cascadeOnDelete();
            $table->foreignId('resultado_analisis_evidencia_id')->constrained('resultados_analisis_evidencias')->cascadeOnDelete();
            $table->foreignId('subsanacion_id')->constrained('subsanaciones')->cascadeOnDelete();
            $table->string('hash_evidencia_analizada', 64)->index();
            $table->foreignId('version_plano_id')->nullable()->constrained('versiones_planos')->nullOnDelete();
            $table->unsignedInteger('indice_elemento_analisis')->default(0);
            $table->string('tipo_elemento', 50)->index(); // EXTINTOR, SENAL_SALIDA, LUZ_EMERGENCIA, TABLERO_ELECTRICO, OBSTACULO, BOTIQUIN, OTRO
            $table->string('nombre_detectado', 150)->nullable();
            $table->text('descripcion_observacion');
            $table->string('nivel_confianza', 20)->nullable(); // ALTO, MEDIO, BAJO (estimación visual referencial de Gemini)
            $table->string('estado', 30)->default('PENDIENTE')->index(); // PENDIENTE, CONFIRMADA, RECHAZADA, NO_APLICABLE, INVALIDADA
            $table->string('motivo_rechazo', 255)->nullable();
            $table->foreignId('elemento_espacial_id')->nullable()->constrained('elementos_espaciales')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('session_token', 64)->nullable()->index();
            $table->timestamp('generada_at')->nullable();
            $table->timestamp('resuelta_at')->nullable();
            $table->timestamps();

            // Evitar duplicados para el mismo elemento detectado en un análisis
            $table->unique(
                ['resultado_analisis_evidencia_id', 'indice_elemento_analisis'],
                'sug_esp_res_idx_unique'
            );

            $table->index(['autoevaluacion_id', 'estado']);
            $table->index(['plano_establecimiento_id', 'estado']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sugerencias_espaciales');
    }
};
