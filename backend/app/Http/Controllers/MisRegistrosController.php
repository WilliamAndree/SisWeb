<?php

namespace App\Http\Controllers;

use App\Models\Autoevaluacion;
use App\Models\DocumentoExpediente;
use App\Models\Subsanacion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Gestión de los registros propios del emprendedor desde "Mi panel".
 */
class MisRegistrosController extends Controller
{
    /**
     * Elimina un registro antiguo del dueño autenticado, con sus respuestas,
     * evidencias y documentos. Las reevaluaciones que salieron de él se
     * conservan (su vínculo de origen queda vacío por la base de datos).
     */
    public function destroy(Request $request, string $uuid): RedirectResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        abort_unless((int) $autoevaluacion->user_id === (int) $request->user()->id, 404);

        $archivos = array_merge(
            DocumentoExpediente::where('autoevaluacion_id', $autoevaluacion->id)->pluck('ruta')->all(),
            Subsanacion::where('autoevaluacion_id', $autoevaluacion->id)->whereNotNull('evidencia_url')->pluck('evidencia_url')->all(),
        );

        $nombre = $autoevaluacion->nombre_comercio;
        DB::transaction(fn () => $autoevaluacion->delete());

        // Los archivos se borran después de confirmar la eliminación en la base de datos.
        $archivosPrivados = array_values(array_filter($archivos, fn (?string $ruta): bool => is_string($ruta) && ! str_starts_with($ruta, 'http')));
        Storage::disk('local')->delete($archivosPrivados);

        return redirect()->route('dashboard')->with('success', "Se eliminó el registro de {$nombre}.");
    }
}
