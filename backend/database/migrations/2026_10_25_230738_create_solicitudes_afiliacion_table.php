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
        Schema::create('solicitudes_afiliacion', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_comercial');
            $table->string('contacto_nombre');
            $table->string('numero_documento', 20);
            $table->string('email');
            $table->string('telefono', 25);
            $table->string('rubro', 50);
            $table->string('distrito', 100)->default('Huancayo');
            $table->text('notas')->nullable();
            $table->enum('estado', ['PENDIENTE', 'APROBADO', 'RECHAZADO'])->default('PENDIENTE');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('solicitudes_afiliacion');
    }
};
