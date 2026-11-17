<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fase 3.1: Modelo espacial aditivo y versionado inmutable para croquis preventivo ciudadano.
     */
    public function up(): void
    {
        Schema::create('planos_establecimientos', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid_plano')->unique();
            $table->foreignId('autoevaluacion_id')->constrained('autoevaluaciones')->cascadeOnDelete();
            $table->string('estado', 30)->default('BORRADOR'); // BORRADOR, CONSOLIDADO
            $table->unsignedBigInteger('version_activa_id')->nullable()->index();
            $table->timestamps();

            $table->index(['autoevaluacion_id', 'estado']);
        });

        Schema::create('versiones_planos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plano_establecimiento_id')->constrained('planos_establecimientos')->cascadeOnDelete();
            $table->unsignedInteger('numero_version')->default(1);
            $table->string('hash_geometria_sha256', 64)->index();
            $table->string('esquema_version', 20)->default('v1.0');
            $table->string('descripcion_cambio', 255)->nullable();
            $table->json('geometria_normalizada');
            $table->json('metadata')->nullable();
            $table->timestamp('cerrada_at')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('session_token', 64)->nullable()->index();
            $table->timestamps();

            $table->unique(['plano_establecimiento_id', 'numero_version']);
        });

        Schema::create('niveles_pisos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('version_plano_id')->constrained('versiones_planos')->cascadeOnDelete();
            $table->integer('numero_piso')->default(1); // 1, 2, 3, -1
            $table->string('nombre', 100)->default('Piso 1');
            $table->decimal('altura_metros', 4, 2)->nullable();
            $table->unsignedInteger('orden')->default(1);
            $table->timestamps();

            $table->index(['version_plano_id', 'numero_piso']);
        });

        Schema::create('ambientes_zonas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nivel_piso_id')->constrained('niveles_pisos')->cascadeOnDelete();
            $table->string('codigo', 50); // AMB-01, AMB-02
            $table->string('nombre', 100); // Salón Principal, Cocina, etc.
            $table->string('uso', 50)->default('ATENCION_PUBLICO'); // ATENCION_PUBLICO, COCINA, ALMACEN, SSHH, CIRCULACION, OFICINA, OTRO
            $table->decimal('ancho_metros', 6, 2)->nullable();
            $table->decimal('largo_metros', 6, 2)->nullable();
            $table->decimal('area_m2', 8, 2)->nullable();
            $table->decimal('posicion_x', 6, 2)->default(0.00);
            $table->decimal('posicion_y', 6, 2)->default(0.00);
            $table->json('vertices_poligono')->nullable();
            $table->string('origen_dimensiones', 50)->default('DECLARADO_MANUAL'); // DECLARADO_MANUAL, MEDIDO_HUINCHA, ESTIMADO_PASOS, NO_VERIFICADO
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->index(['nivel_piso_id', 'codigo']);
        });

        Schema::create('conectores_circulacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nivel_piso_id')->constrained('niveles_pisos')->cascadeOnDelete();
            $table->string('tipo', 50)->default('PUERTA_INTERIOR'); // PUERTA_INTERIOR, PUERTA_SALIDA, VANO, PASILLO, ESCALERA, CONEXION_NIVEL
            $table->decimal('ancho_metros', 4, 2)->default(0.90);
            $table->boolean('conduce_a_salida_publica')->default(false);
            $table->boolean('abre_hacia_afuera')->nullable();
            $table->foreignId('ambiente_origen_id')->nullable()->constrained('ambientes_zonas')->nullOnDelete();
            $table->foreignId('ambiente_destino_id')->nullable()->constrained('ambientes_zonas')->nullOnDelete();
            $table->foreignId('nivel_destino_id')->nullable()->constrained('niveles_pisos')->nullOnDelete();
            $table->decimal('posicion_x', 6, 2)->default(0.00);
            $table->decimal('posicion_y', 6, 2)->default(0.00);
            $table->string('origen_dato', 50)->default('DECLARADO_MANUAL');
            $table->timestamps();

            $table->index(['nivel_piso_id', 'tipo']);
        });

        Schema::create('elementos_espaciales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ambiente_id')->constrained('ambientes_zonas')->cascadeOnDelete();
            $table->string('tipo', 50); // EXTINTOR, SENAL_SALIDA, LUZ_EMERGENCIA, TABLERO_ELECTRICO, OBSTACULO, BOTIQUIN, OTRO
            $table->decimal('posicion_x', 6, 2)->default(0.00);
            $table->decimal('posicion_y', 6, 2)->default(0.00);
            $table->foreignId('subsanacion_id')->nullable()->constrained('subsanaciones')->nullOnDelete();
            $table->string('origen_dato', 50)->default('DECLARADO_MANUAL');
            $table->string('observacion', 255)->nullable();
            $table->timestamps();

            $table->index(['ambiente_id', 'tipo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('elementos_espaciales');
        Schema::dropIfExists('conectores_circulacion');
        Schema::dropIfExists('ambientes_zonas');
        Schema::dropIfExists('niveles_pisos');
        Schema::dropIfExists('versiones_planos');
        Schema::dropIfExists('planos_establecimientos');
    }
};
