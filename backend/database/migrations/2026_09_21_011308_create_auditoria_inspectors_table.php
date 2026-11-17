<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auditorias_inspector', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluacion_itse_id')->constrained('evaluaciones_itse')->cascadeOnDelete();
            $table->string('codigo_acta')->unique();
            $table->integer('total_discrepancias')->default(0);
            $table->decimal('porcentaje_verificado', 5, 2)->default(0);
            $table->decimal('metrica_gap', 5, 2)->default(0); // GAP = %Declarado - %Verificado
            $table->string('dictamen'); // FAVORABLE, CON_OBSERVACIONES, DESFAVORABLE
            $table->json('detalle_verificacion');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditorias_inspector');
    }
};
