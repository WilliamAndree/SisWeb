<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\EvaluacionHelperTrait;
use App\Models\Autoevaluacion;
use App\Models\DocumentoExpediente;
use App\Services\ItseRiskService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

/**
 * Expediente digital ITSE: el emprendedor sube sus documentos y quien revisa
 * ve de un vistazo qué falta, qué está listo y puede descargarlo todo.
 */
class ExpedienteDigitalController extends Controller
{
    use EvaluacionHelperTrait;

    private const DISCO = 'local';

    public function __construct(protected ItseRiskService $riskService) {}

    public function show(Request $request, string $uuid): Response
    {
        $autoevaluacion = $this->autoevaluacionAutorizada($request, $uuid);
        $modalidad = $this->clasificarModalidadTramite($autoevaluacion)['tipo_tramite'];
        $subidos = DocumentoExpediente::where('autoevaluacion_id', $autoevaluacion->id)->get()->keyBy('tipo');

        $documentos = collect($this->catalogo())
            ->map(function (array $doc) use ($modalidad, $subidos, $autoevaluacion): ?array {
                $obligatorio = in_array($modalidad, $doc['obligatorio_en'], true);
                if (! $obligatorio && ! in_array($modalidad, $doc['opcional_en'], true)) {
                    return null;
                }
                $archivo = $subidos->get($doc['tipo']);

                return [
                    'tipo' => $doc['tipo'],
                    'titulo' => $doc['titulo'],
                    'descripcion' => $doc['descripcion'],
                    'como_conseguirlo' => $doc['como_conseguirlo'],
                    'base_legal' => $doc['base_legal'],
                    'formatos' => $doc['formatos'],
                    'obligatorio' => $obligatorio,
                    'archivo' => $archivo ? [
                        'id' => $archivo->id,
                        'nombre' => $archivo->nombre_original,
                        'mime' => $archivo->mime_type,
                        'tamano_bytes' => $archivo->tamano_bytes,
                        'hash_corto' => substr($archivo->hash_sha256, 0, 12),
                        'subido_el' => $archivo->updated_at?->toIso8601String(),
                        'url' => route('autoevaluacion.expediente_digital.archivo', ['uuid' => $autoevaluacion->uuid_trazabilidad, 'documento' => $archivo->id]),
                    ] : null,
                ];
            })
            ->filter()
            ->values();

        return Inertia::render('Evaluacion/ExpedienteDigital', [
            'autoevaluacion' => [
                'uuid' => $autoevaluacion->uuid_trazabilidad,
                'nombre_comercio' => $autoevaluacion->nombre_comercio,
                'direccion' => $autoevaluacion->direccion,
                'ruc' => $autoevaluacion->ruc,
                'codigo_acceso' => $autoevaluacion->codigo_acceso,
            ],
            'modalidad' => $modalidad,
            'documentos' => $documentos,
            'tamano_maximo_mb' => (int) floor($this->tamanoMaximoKb() / 1024),
        ]);
    }

    public function store(Request $request, string $uuid, string $tipo): RedirectResponse
    {
        $autoevaluacion = $this->autoevaluacionAutorizada($request, $uuid);
        $definicion = collect($this->catalogo())->firstWhere('tipo', $tipo);
        abort_if($definicion === null, 404);

        $request->validate(
            ['archivo' => ['required', 'file', 'max:7168', 'mimes:'.implode(',', $definicion['formatos'])]],
            [
                'archivo.required' => 'Elige un archivo para subir.',
                'archivo.max' => 'El archivo pesa más de '.floor($this->tamanoMaximoKb() / 1024).' MB.',
                'archivo.mimes' => 'Formato no permitido. Sube un PDF o una foto (JPG, PNG o WebP).',
            ],
        );

        $archivo = $request->file('archivo');
        $ruta = $archivo->storeAs(
            'expedientes/'.$autoevaluacion->id,
            $tipo.'-'.Str::uuid().'.'.strtolower($archivo->getClientOriginalExtension() ?: $archivo->extension()),
            self::DISCO,
        );
        abort_if($ruta === false, 500, 'No se pudo guardar el archivo.');

        $anterior = DocumentoExpediente::where('autoevaluacion_id', $autoevaluacion->id)->where('tipo', $tipo)->first();

        DB::transaction(function () use ($autoevaluacion, $tipo, $archivo, $ruta): void {
            DocumentoExpediente::updateOrCreate(
                ['autoevaluacion_id' => $autoevaluacion->id, 'tipo' => $tipo],
                [
                    'nombre_original' => Str::limit($archivo->getClientOriginalName(), 250, ''),
                    'ruta' => $ruta,
                    'mime_type' => (string) $archivo->getMimeType(),
                    'tamano_bytes' => (int) $archivo->getSize(),
                    'hash_sha256' => hash_file('sha256', Storage::disk(self::DISCO)->path($ruta)),
                    'estado_revision' => DocumentoExpediente::ESTADO_PENDIENTE,
                    'observacion_revision' => null,
                ],
            );
        });

        if ($anterior && $anterior->ruta !== $ruta) {
            Storage::disk(self::DISCO)->delete($anterior->ruta);
        }

        return back()->with('success', $definicion['titulo'].' subido correctamente.');
    }

    public function archivo(Request $request, string $uuid, DocumentoExpediente $documento): StreamedResponse
    {
        $autoevaluacion = $this->autoevaluacionAutorizada($request, $uuid);
        abort_if((int) $documento->autoevaluacion_id !== (int) $autoevaluacion->id, 404);
        abort_unless(Storage::disk(self::DISCO)->exists($documento->ruta), 404);

        return Storage::disk(self::DISCO)->response($documento->ruta, $documento->nombre_original, [
            'Content-Type' => $documento->mime_type,
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    public function destroy(Request $request, string $uuid, DocumentoExpediente $documento): RedirectResponse
    {
        $autoevaluacion = $this->autoevaluacionAutorizada($request, $uuid);
        abort_if((int) $documento->autoevaluacion_id !== (int) $autoevaluacion->id, 404);

        Storage::disk(self::DISCO)->delete($documento->ruta);
        $documento->delete();

        return back()->with('success', 'Documento eliminado.');
    }

    /**
     * Todo el expediente en un ZIP, con los archivos nombrados por orden y tipo
     * para que quien revisa los encuentre en el mismo orden que la ficha.
     */
    public function zip(Request $request, string $uuid): BinaryFileResponse
    {
        $autoevaluacion = $this->autoevaluacionAutorizada($request, $uuid);
        $orden = array_flip(array_column($this->catalogo(), 'tipo'));
        $documentos = DocumentoExpediente::where('autoevaluacion_id', $autoevaluacion->id)->get()
            ->sortBy(fn (DocumentoExpediente $d): int => $orden[$d->tipo] ?? 99);
        abort_if($documentos->isEmpty(), 404, 'Aún no hay documentos en el expediente.');

        $temporal = tempnam(sys_get_temp_dir(), 'expediente');
        $zip = new ZipArchive;
        abort_unless($zip->open($temporal, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true, 500);
        foreach ($documentos->values() as $indice => $documento) {
            $extension = pathinfo($documento->ruta, PATHINFO_EXTENSION);
            $zip->addFile(
                Storage::disk(self::DISCO)->path($documento->ruta),
                sprintf('%02d-%s.%s', $indice + 1, $documento->tipo, $extension),
            );
        }
        $zip->close();

        $nombre = 'expediente-itse-'.Str::slug($autoevaluacion->nombre_comercio ?: 'local').'.zip';

        return response()->download($temporal, $nombre, ['Cache-Control' => 'private, no-store'])->deleteFileAfterSend();
    }

    private function autoevaluacionAutorizada(Request $request, string $uuid): Autoevaluacion
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        return $autoevaluacion;
    }

    /**
     * @return array<int, array{tipo: string, titulo: string, descripcion: string, como_conseguirlo: string, base_legal: string, formatos: array<int, string>, obligatorio_en: array<int, string>, opcional_en: array<int, string>}>
     */
    private function catalogo(): array
    {
        return config('expediente.documentos', []);
    }

    /**
     * Límite fijo de 7 MB por archivo (debe coincidir con la regla 'max:7168'):
     * alcanza para fotos y PDF, y evita subidas abusivas que llenen el disco.
     */
    private function tamanoMaximoKb(): int
    {
        return 7168;
    }
}
