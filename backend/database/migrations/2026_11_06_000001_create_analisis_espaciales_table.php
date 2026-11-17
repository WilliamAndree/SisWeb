<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Subfase 3.3 MVP: Persistencia inmutable del análisis espacial preventivo y conectividad.
     */
    public function up(): void
    {
        Schema::create('analisis_espaciales', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid_analisis')->unique();
            $table->foreignId('autoevaluacion_id')->constrained('autoevaluaciones')->cascadeOnDelete();
            $table->foreignId('plano_establecimiento_id')->constrained('planos_establecimientos')->cascadeOnDelete();
            $table->foreignId('version_plano_id')->constrained('versiones_planos')->restrictOnDelete();

            $table->string('hash_geometria_analizada', 64)->index();
            $table->string('hash_resultado_sha256', 64)->nullable()->index();
            $table->string('version_motor', 30)->default('v1.0-mvp');
            $table->string('version_catalogo_normativo', 30)->nullable();

            // Estados de ejecución: COMPLETADO, ERROR_INTEGRIDAD, ERROR_EJECUCION
            $table->string('estado_ejecucion', 30)->default('COMPLETADO');

            // Métricas cuantitativas del grafo
            $table->boolean('todos_ambientes_conectados')->default(false);
            $table->unsignedSmallInteger('total_ambientes')->default(0);
            $table->unsignedSmallInteger('total_ambientes_conectados')->default(0);
            $table->unsignedSmallInteger('total_conectores')->default(0);
            $table->unsignedSmallInteger('total_conectores_confirmados')->default(0);
            $table->unsignedSmallInteger('total_conectores_sugeridos')->default(0);
            $table->unsignedSmallInteger('total_conectores_flotantes')->default(0);
            $table->unsignedSmallInteger('total_conectores_indeterminados')->default(0);
            $table->unsignedSmallInteger('total_advertencias')->default(0);

            // Cargas JSON inmutables
            $table->json('resumen_conectividad');
            $table->json('resultado_preventivo');
            $table->json('elementos_declarados')->nullable();
            $table->json('errores_integridad')->nullable();

            $table->timestamp('analizado_at')->useCurrent();
            $table->timestamps();

            $table->index(['autoevaluacion_id', 'version_plano_id']);
            $table->index(['version_plano_id', 'estado_ejecucion']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analisis_espaciales');
    }
};
