<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Actualiza la tabla autoevaluaciones para dar soporte a la arquitectura preventiva:
     * - Relación con actividades_comerciales
     * - Identificadores de acceso ciudadano (codigo_acceso, token_seguridad)
     * - Características declaradas estructuradas (caracteristicas_declaradas JSON)
     * - Contadores fácticos de declaración ciudadana
     * - Flexibilidad en RUC (opcional)
     */
    public function up(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->foreignId('actividad_comercial_id')
                ->nullable()
                ->after('funcion_economica')
                ->constrained('actividades_comerciales')
                ->nullOnDelete();

            $table->string('codigo_acceso', 64)->nullable()->index()->after('uuid_trazabilidad');
            $table->string('token_seguridad', 64)->nullable()->index()->after('codigo_acceso');

            $table->json('caracteristicas_declaradas')->nullable()->after('referencia');

            $table->integer('total_condiciones_evaluadas')->default(0)->after('caracteristicas_declaradas');
            $table->integer('total_cumple_declarado')->default(0)->after('total_condiciones_evaluadas');
            $table->integer('total_pendiente_atender')->default(0)->after('total_cumple_declarado');
            $table->integer('total_por_revisar')->default(0)->after('total_pendiente_atender');
            $table->integer('total_no_aplica')->default(0)->after('total_por_revisar');

            $table->string('ruc', 11)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->dropForeign(['actividad_comercial_id']);
            $table->dropColumn([
                'actividad_comercial_id',
                'codigo_acceso',
                'token_seguridad',
                'caracteristicas_declaradas',
                'total_condiciones_evaluadas',
                'total_cumple_declarado',
                'total_pendiente_atender',
                'total_por_revisar',
                'total_no_aplica',
            ]);
        });
    }
};
