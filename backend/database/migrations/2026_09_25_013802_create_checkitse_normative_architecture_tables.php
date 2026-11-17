<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Crea las entidades relacionales normativas de CheckITSE Huancayo (Fase 4):
     * - actividades_comerciales
     * - criterios_normativos
     * - reglas_aplicabilidad
     * - respuestas_autoevaluacion
     */
    public function up(): void
    {
        Schema::create('actividades_comerciales', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_actividad', 255)->index();
            $table->string('ciiu_codigo', 20)->nullable()->index();
            $table->string('ciiu_descripcion', 255)->nullable();
            $table->string('funcion_itse', 100)->nullable();
            $table->string('estado_validacion', 30)->default('EN_VALIDACION')->index();
            $table->boolean('activo')->default(true);
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });

        Schema::create('criterios_normativos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_criterio', 50)->unique();
            $table->string('categoria', 100)->index();
            $table->string('norma_base', 100);
            $table->string('articulo_referencia', 100)->nullable();
            $table->string('tipo_criterio', 20)->default('TIPO_A')->index();
            $table->string('estado_normativo', 30)->default('VIGENTE')->index();
            $table->text('pregunta_ciudadana');
            $table->text('que_observar')->nullable();
            $table->text('accion_mejora_orientativa')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('reglas_aplicabilidad', function (Blueprint $table) {
            $table->id();
            $table->foreignId('criterio_id')
                ->constrained('criterios_normativos')
                ->cascadeOnDelete();
            $table->string('condicion_activacion', 255);
            $table->string('operador_logico', 10)->default('AND');
            $table->json('condiciones_compuestas')->nullable();
            $table->string('estado_regla', 30)->default('ACTIVA')->index();
            $table->timestamps();
        });

        Schema::create('respuestas_autoevaluacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('autoevaluacion_id')
                ->constrained('autoevaluaciones')
                ->cascadeOnDelete();
            $table->foreignId('criterio_id')
                ->constrained('criterios_normativos')
                ->cascadeOnDelete();
            $table->string('estado_respuesta', 30)->index();
            $table->text('notas_ciudadano')->nullable();
            $table->timestamps();

            $table->unique(['autoevaluacion_id', 'criterio_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('respuestas_autoevaluacion');
        Schema::dropIfExists('reglas_aplicabilidad');
        Schema::dropIfExists('criterios_normativos');
        Schema::dropIfExists('actividades_comerciales');
    }
};
