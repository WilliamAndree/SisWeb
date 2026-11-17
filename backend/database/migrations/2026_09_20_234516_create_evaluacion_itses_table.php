<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
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
            $table->string('tipo_tramite'); // EX_POST o EX_ANTE
            $table->string('nivel_riesgo'); // BAJO_MEDIO o ALTO_MUY_ALTO
            $table->decimal('porcentaje_cumplimiento', 5, 2);
            $table->string('semaforo'); // VERDE, AMBAR, ROJO
            $table->json('detalle_checklist');
            $table->json('plan_accion_costos')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluaciones_itse');
    }
};
