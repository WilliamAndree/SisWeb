<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cuentas separadas (emprendedor / proveedor) y catálogo de ofertas con precio.
     *
     * - users.tipo_cuenta: 'cliente' (emprendedor) o 'proveedor'.
     * - proveedores_recursos: se vincula a la cuenta del proveedor, con descripción y plan.
     *   La dirección y las coordenadas pasan a ser opcionales hasta que el proveedor
     *   complete su perfil.
     * - ofertas_proveedor: productos o servicios con precio, ligados al criterio ITSE
     *   (CRIT-xx) que resuelven. De aquí sale el costo aproximado que ve el emprendedor.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('tipo_cuenta', 20)->default('cliente')->after('telefono');
        });

        Schema::table('proveedores_recursos', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->unique()->after('id')->constrained()->nullOnDelete();
            $table->text('descripcion')->nullable()->after('tipo_servicio');
            $table->string('plan', 20)->default('basico')->after('verificado');
            $table->text('direccion')->nullable()->change();
            $table->decimal('latitud', 10, 8)->nullable()->change();
            $table->decimal('longitud', 11, 8)->nullable()->change();
        });

        Schema::create('ofertas_proveedor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proveedor_recurso_id')->constrained('proveedores_recursos')->cascadeOnDelete();
            $table->string('criterio_codigo', 20)->index();
            $table->string('nombre', 120);
            $table->string('descripcion', 500)->nullable();
            $table->decimal('precio_soles', 10, 2);
            $table->string('unidad', 20)->default('unidad');
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ofertas_proveedor');

        Schema::table('proveedores_recursos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['descripcion', 'plan']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('tipo_cuenta');
        });
    }
};
