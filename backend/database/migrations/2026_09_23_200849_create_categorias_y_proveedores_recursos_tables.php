<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categorias_subsanacion', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 50)->unique(); // EXTINTOR, ELECTRICO, SENALETICA, ARQUITECTURA
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });

        Schema::create('proveedores_recursos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('categoria_id')->constrained('categorias_subsanacion')->cascadeOnDelete();
            $table->string('razon_social');
            $table->string('nombre_comercial')->nullable();
            $table->string('telefono', 25)->nullable();
            $table->string('whatsapp', 25)->nullable();
            $table->text('direccion');
            $table->string('distrito', 100)->default('Huancayo'); // Huancayo, El Tambo, Chilca
            $table->decimal('latitud', 10, 8);
            $table->decimal('longitud', 11, 8);
            $table->text('servicios_ofrecidos')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // Asegurar campos geográficos opcionales en autoevaluaciones si no existían
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            if (! Schema::hasColumn('autoevaluaciones', 'latitud')) {
                $table->decimal('latitud', 10, 8)->nullable()->after('session_token');
                $table->decimal('longitud', 11, 8)->nullable()->after('latitud');
                $table->string('distrito', 100)->nullable()->default('Huancayo')->after('longitud');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proveedores_recursos');
        Schema::dropIfExists('categorias_subsanacion');
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->dropColumn(['latitud', 'longitud', 'distrito']);
        });
    }
};
