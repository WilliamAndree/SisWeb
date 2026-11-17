<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recursos_educativos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_normativo', 50)->index(); // ej: EXTINTOR, LUCES_EMERG
            $table->string('titulo');
            $table->text('descripcion_didactica');
            $table->string('tipo', 20)->default('YOUTUBE'); // YOUTUBE, TIKTOK, WEB
            $table->text('url');
            $table->string('base_legal')->nullable(); // ej: NTP 350.043-1, CNE-U
            $table->string('evidencia_sugerida')->nullable(); // ej: Foto del manómetro y tarjeta
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recursos_educativos');
    }
};
