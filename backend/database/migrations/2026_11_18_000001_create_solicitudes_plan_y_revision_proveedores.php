<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cobro de planes con evidencia de pago y revisión por un administrador.
     *
     * - users.tipo_cuenta admite 'admin' (sin cambio de columna: es texto).
     * - proveedores_recursos: estado de revisión del negocio (pendiente, aprobado,
     *   observado, suspendido), quién lo revisó y cuándo vence el plan pagado.
     *   Solo los negocios aprobados se muestran a los clientes.
     * - ofertas_proveedor: marca, unidades disponibles y zona donde se atiende,
     *   para que el proveedor ordene y filtre su catálogo.
     * - solicitudes_plan: cada cambio de plan pagado, con su comprobante (Yape,
     *   Plin, transferencia o depósito) y la decisión del administrador.
     */
    public function up(): void
    {
        Schema::table('proveedores_recursos', function (Blueprint $table) {
            $table->string('estado_revision', 20)->default('pendiente')->after('verificado')->index();
            $table->string('observacion_revision', 500)->nullable()->after('estado_revision');
            $table->foreignId('revisado_por')->nullable()->after('observacion_revision')->constrained('users')->nullOnDelete();
            $table->timestamp('revisado_en')->nullable()->after('revisado_por');
            $table->date('plan_vence_el')->nullable()->after('plan');
        });

        // Los negocios que ya estaban publicados (catálogo inicial) quedan aprobados.
        DB::table('proveedores_recursos')->update(['estado_revision' => 'aprobado']);

        Schema::table('ofertas_proveedor', function (Blueprint $table) {
            $table->string('marca', 80)->nullable()->after('nombre');
            $table->unsignedInteger('stock')->nullable()->after('unidad');
            $table->string('zona', 40)->default('Todo Huancayo')->after('stock');
        });

        Schema::create('solicitudes_plan', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('proveedor_recurso_id')->constrained('proveedores_recursos')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('plan_actual', 20);
            $table->string('plan_solicitado', 20);
            $table->unsignedTinyInteger('meses');
            $table->decimal('monto_soles', 10, 2);
            $table->string('metodo_pago', 20);
            $table->string('numero_operacion', 40);
            $table->date('fecha_pago');
            $table->string('evidencia_ruta');
            $table->string('evidencia_mime', 60);
            $table->string('evidencia_hash', 64);
            $table->string('estado', 20)->default('pendiente')->index();
            $table->string('observacion_admin', 500)->nullable();
            $table->foreignId('revisado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('revisado_en')->nullable();
            $table->date('vigente_hasta')->nullable();
            $table->timestamps();

            // Un mismo comprobante no puede usarse dos veces.
            $table->unique(['metodo_pago', 'numero_operacion']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes_plan');

        Schema::table('ofertas_proveedor', function (Blueprint $table) {
            $table->dropColumn(['marca', 'stock', 'zona']);
        });

        Schema::table('proveedores_recursos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('revisado_por');
            $table->dropColumn(['estado_revision', 'observacion_revision', 'revisado_en', 'plan_vence_el']);
        });
    }
};
