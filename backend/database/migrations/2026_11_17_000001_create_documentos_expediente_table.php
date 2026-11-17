<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Documentos del expediente digital ITSE (un archivo vigente por tipo y autoevaluación).
     */
    public function up(): void
    {
        Schema::create('documentos_expediente', function (Blueprint $table) {
            $table->id();
            $table->foreignId('autoevaluacion_id')->constrained('autoevaluaciones')->cascadeOnDelete();
            $table->string('tipo', 50);
            $table->string('nombre_original');
            $table->string('ruta');
            $table->string('mime_type', 100);
            $table->unsignedInteger('tamano_bytes');
            $table->char('hash_sha256', 64);
            $table->string('estado_revision', 20)->default('PENDIENTE');
            $table->string('observacion_revision', 500)->nullable();
            $table->timestamps();

            $table->unique(['autoevaluacion_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_expediente');
    }
};
