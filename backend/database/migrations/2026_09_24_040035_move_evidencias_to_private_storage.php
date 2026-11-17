<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    /**
     * Resguarda las evidencias declaradas en almacenamiento privado y cierra la
     * exposición pública directa del directorio `evidencias`. Es reversible: al
     * revertir se restauran los archivos en el disco público.
     */
    public function up(): void
    {
        $publico = Storage::disk('public');
        $privado = Storage::disk('local');

        if (! $publico->exists('evidencias')) {
            return;
        }

        foreach ($publico->allFiles('evidencias') as $ruta) {
            if (! $privado->exists($ruta)) {
                $privado->write($ruta, $publico->get($ruta));
            }
        }

        $publico->deleteDirectory('evidencias');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $publico = Storage::disk('public');
        $privado = Storage::disk('local');

        if (! $privado->exists('evidencias')) {
            return;
        }

        foreach ($privado->allFiles('evidencias') as $ruta) {
            if (! $publico->exists($ruta)) {
                $publico->write($ruta, $privado->get($ruta));
            }
        }
    }
};
