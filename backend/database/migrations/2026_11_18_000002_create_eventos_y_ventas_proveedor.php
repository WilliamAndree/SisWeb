<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Seguimiento del negocio del proveedor y de sus planes.
     *
     * - eventos_proveedor: cuántas veces aparecen sus productos a los clientes,
     *   cuántos le escriben por WhatsApp, abren su mapa o eligen su producto.
     * - ventas_proveedor: ventas que el proveedor registra (lo que vendió gracias
     *   a CheckITSE), con monto, cantidad y cliente opcional.
     * - proveedores_recursos.recordatorio_enviado_el: último aviso por WhatsApp
     *   que el administrador le envió sobre el vencimiento de su plan.
     */
    public function up(): void
    {
        Schema::create('eventos_proveedor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proveedor_recurso_id')->constrained('proveedores_recursos')->cascadeOnDelete();
            $table->foreignId('oferta_proveedor_id')->nullable()->constrained('ofertas_proveedor')->nullOnDelete();
            $table->string('tipo', 20);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['proveedor_recurso_id', 'tipo', 'created_at']);
        });

        Schema::create('ventas_proveedor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proveedor_recurso_id')->constrained('proveedores_recursos')->cascadeOnDelete();
            $table->foreignId('oferta_proveedor_id')->nullable()->constrained('ofertas_proveedor')->nullOnDelete();
            $table->string('descripcion', 160);
            $table->unsignedInteger('cantidad')->default(1);
            $table->decimal('monto_soles', 10, 2);
            $table->date('fecha')->index();
            $table->string('cliente', 120)->nullable();
            $table->timestamps();
        });

        Schema::table('proveedores_recursos', function (Blueprint $table) {
            $table->timestamp('recordatorio_enviado_el')->nullable()->after('plan_vence_el');
        });
    }

    public function down(): void
    {
        Schema::table('proveedores_recursos', function (Blueprint $table) {
            $table->dropColumn('recordatorio_enviado_el');
        });
        Schema::dropIfExists('ventas_proveedor');
        Schema::dropIfExists('eventos_proveedor');
    }
};
