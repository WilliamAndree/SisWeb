<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Alinea la nomenclatura del modelo de datos al concepto de
     * "autoevaluación preventiva ciudadana". Se conservan los datos
     * copiándolos hacia las nuevas tablas y eliminando las originales
     * en orden hijo -> padre.
     */
    public function up(): void
    {
        // Si una ejecución anterior quedó incompleta, se descartan las copias
        // parciales; las tablas originales siguen siendo la fuente.
        Schema::dropIfExists('subsanaciones');
        Schema::dropIfExists('simulaciones_revision');
        Schema::dropIfExists('autoevaluaciones');

        Schema::create('autoevaluaciones', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid_trazabilidad')->unique();
            $table->string('hash_integridad', 64)->nullable();
            $table->string('nombre_comercio');
            $table->string('funcion_economica')->default('Comercio');
            $table->string('ruc', 11);
            $table->string('sector_huancayo');
            $table->decimal('area_m2', 8, 2);
            $table->integer('pisos')->default(1);
            $table->integer('aforo')->default(10);
            $table->boolean('usa_glp')->default(false);
            $table->decimal('galones_glp', 8, 2)->default(0);
            $table->boolean('usa_caldero')->default(false);
            $table->boolean('usa_liquidos_inflamables')->default(false);
            $table->string('tipo_tramite'); // EX_POST o EX_ANTE
            $table->string('nivel_riesgo'); // BAJO_MEDIO o ALTO_MUY_ALTO
            $table->decimal('porcentaje_cumplimiento', 5, 2);
            $table->string('semaforo'); // VERDE, AMBAR, ROJO
            $table->json('detalle_checklist');
            $table->json('plan_accion_costos')->nullable();
            $table->timestamps();
        });

        DB::table('autoevaluaciones')->insert(
            DB::table('evaluaciones_itse')
                ->select([
                    'id',
                    'uuid_trazabilidad',
                    'hash_integridad',
                    'nombre_comercio',
                    'funcion_economica',
                    'ruc',
                    'sector_huancayo',
                    'area_m2',
                    'pisos',
                    'aforo',
                    'usa_glp',
                    'galones_glp',
                    'usa_caldero',
                    'usa_liquidos_inflamables',
                    'tipo_tramite',
                    'nivel_riesgo',
                    'porcentaje_cumplimiento',
                    'semaforo',
                    'detalle_checklist',
                    'plan_accion_costos',
                    'created_at',
                    'updated_at',
                ])
                ->get()
                ->map(fn ($row) => (array) $row)
                ->toArray()
        );

        Schema::create('simulaciones_revision', function (Blueprint $table) {
            $table->id();
            $table->foreignId('autoevaluacion_id')->constrained('autoevaluaciones')->cascadeOnDelete();
            $table->string('codigo_revision')->unique();
            $table->integer('total_observaciones')->default(0);
            $table->decimal('porcentaje_revision', 5, 2)->default(0);
            $table->decimal('metrica_gap', 5, 2)->default(0); // GAP = %Declarado - %Revisado por el ciudadano
            $table->string('resultado'); // SIN_OBSERVACIONES, CON_OBSERVACIONES
            $table->json('detalle_revision');
            $table->timestamps();
        });

        DB::table('simulaciones_revision')->insert(
            DB::table('auditorias_inspector')
                ->select([
                    'id',
                    'evaluacion_itse_id as autoevaluacion_id',
                    'codigo_acta as codigo_revision',
                    'total_discrepancias as total_observaciones',
                    'porcentaje_verificado as porcentaje_revision',
                    'metrica_gap',
                    DB::raw("CASE dictamen
                        WHEN 'FAVORABLE' THEN 'SIN_OBSERVACIONES'
                        ELSE 'CON_OBSERVACIONES'
                    END as resultado"),
                    'detalle_verificacion as detalle_revision',
                    'created_at',
                    'updated_at',
                ])
                ->get()
                ->map(fn ($row) => (array) $row)
                ->toArray()
        );

        Schema::create('subsanaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('simulacion_revision_id')
                ->constrained('simulaciones_revision')
                ->cascadeOnDelete();
            $table->string('codigo_item');
            $table->text('descripcion'); // Sustento declarado por el ciudadano
            $table->string('evidencia_url')->nullable();
            $table->enum('estado', [
                'PENDIENTE',
                'EN_PROCESO',
                'SUBSANADO_DECLARADO',
            ])->default('PENDIENTE');
            $table->text('observacion')->nullable();
            $table->timestamp('fecha_subsanacion')->nullable();
            $table->timestamps();
        });

        DB::table('subsanaciones')->insert(
            DB::table('subsanaciones_observaciones')
                ->select([
                    'id',
                    'auditoria_inspector_id as simulacion_revision_id',
                    'codigo_item',
                    'descripcion',
                    'evidencia_url',
                    DB::raw("CASE estado
                        WHEN 'SUBSANADO_CONFORME' THEN 'SUBSANADO_DECLARADO'
                        WHEN 'PERSISTE_OBSERVACION' THEN 'EN_PROCESO'
                        ELSE 'PENDIENTE'
                    END as estado"),
                    'observacion_inspector as observacion',
                    'fecha_subsanacion',
                    'created_at',
                    'updated_at',
                ])
                ->get()
                ->map(fn ($row) => (array) $row)
                ->toArray()
        );

        DB::statement(
            "UPDATE simulaciones_revision
             SET codigo_revision = CONCAT('PREV-ITSE-', SUBSTRING(codigo_revision, 11))
             WHERE codigo_revision LIKE 'ACTA-ITSE-%'"
        );

        Schema::dropIfExists('subsanaciones_observaciones');
        Schema::dropIfExists('auditorias_inspector');
        Schema::dropIfExists('evaluaciones_itse');
    }

    public function down(): void
    {
        Schema::create('evaluaciones_itse', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid_trazabilidad')->unique();
            $table->string('hash_integridad', 64)->nullable();
            $table->string('nombre_comercio');
            $table->string('funcion_economica')->default('Comercio');
            $table->string('ruc', 11);
            $table->string('sector_huancayo');
            $table->decimal('area_m2', 8, 2);
            $table->integer('pisos')->default(1);
            $table->integer('aforo')->default(10);
            $table->boolean('usa_glp')->default(false);
            $table->decimal('galones_glp', 8, 2)->default(0);
            $table->boolean('usa_caldero')->default(false);
            $table->boolean('usa_liquidos_inflamables')->default(false);
            $table->string('tipo_tramite');
            $table->string('nivel_riesgo');
            $table->decimal('porcentaje_cumplimiento', 5, 2);
            $table->string('semaforo');
            $table->json('detalle_checklist');
            $table->json('plan_accion_costos')->nullable();
            $table->timestamps();
        });

        DB::table('evaluaciones_itse')->insert(
            DB::table('autoevaluaciones')->get()->map(fn ($row) => (array) $row)->toArray()
        );

        Schema::create('auditorias_inspector', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluacion_itse_id')->constrained('evaluaciones_itse')->cascadeOnDelete();
            $table->string('codigo_acta')->unique();
            $table->integer('total_discrepancias')->default(0);
            $table->decimal('porcentaje_verificado', 5, 2)->default(0);
            $table->decimal('metrica_gap', 5, 2)->default(0);
            $table->string('dictamen');
            $table->json('detalle_verificacion');
            $table->timestamps();
        });

        DB::table('auditorias_inspector')->insert(
            DB::table('simulaciones_revision')
                ->select([
                    'id',
                    'autoevaluacion_id as evaluacion_itse_id',
                    'codigo_revision as codigo_acta',
                    'total_observaciones as total_discrepancias',
                    'porcentaje_revision as porcentaje_verificado',
                    'metrica_gap',
                    'resultado as dictamen',
                    'detalle_revision as detalle_verificacion',
                    'created_at',
                    'updated_at',
                ])
                ->get()->map(fn ($row) => (array) $row)->toArray()
        );

        Schema::create('subsanaciones_observaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auditoria_inspector_id')
                ->constrained('auditorias_inspector')
                ->cascadeOnDelete();
            $table->string('codigo_item');
            $table->text('descripcion');
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

        DB::table('subsanaciones_observaciones')->insert(
            DB::table('subsanaciones')
                ->select([
                    'id',
                    'simulacion_revision_id as auditoria_inspector_id',
                    'codigo_item',
                    'descripcion',
                    'evidencia_url',
                    'estado',
                    'observacion as observacion_inspector',
                    'fecha_subsanacion',
                    'created_at',
                    'updated_at',
                ])
                ->get()->map(fn ($row) => (array) $row)->toArray()
        );

        Schema::dropIfExists('subsanaciones');
        Schema::dropIfExists('simulaciones_revision');
        Schema::dropIfExists('autoevaluaciones');
    }
};
