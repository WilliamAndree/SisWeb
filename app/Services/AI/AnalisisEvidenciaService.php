<?php

namespace App\Services\AI;

use App\Jobs\AnalisisEvidenciaJob;
use App\Models\AnalisisEvidencia;
use App\Models\Autoevaluacion;
use App\Models\ResultadoAnalisisEvidencia;
use App\Models\Subsanacion;
use App\Models\User;
use App\Services\Evaluacion\EvidenciaPrivadaService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class AnalisisEvidenciaService
{
    public const MAX_BYTES = 5242880; // 5 MB

    public const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

    public function __construct(
        protected GeminiMultimodalService $geminiService,
        protected ValidacionResultadoIAService $validacionService,
        protected MotorCorrelacionNormativaService $correlacionService
    ) {}

    /**
     * Registra y encola una solicitud de análisis multimodal para una evidencia física.
     *
     * @throws InvalidArgumentException
     * @throws RuntimeException
     */
    public function solicitarAnalisis(Autoevaluacion $autoevaluacion, Subsanacion $subsanacion, ?User $user = null): AnalisisEvidencia
    {
        $path = $subsanacion->evidencia_url;
        if (! filled($path) || ! app(EvidenciaPrivadaService::class)->rutaPermitida($path) || ! Storage::disk('local')->exists($path)) {
            throw new RuntimeException('El archivo de evidencia física no existe en el almacenamiento privado.');
        }

        $rutaAbsoluta = Storage::disk('local')->path($path);
        $mime = Storage::disk('local')->mimeType($path);

        if ($mime === 'application/pdf') {
            throw new InvalidArgumentException('Los documentos en formato PDF se preservan como respaldo documental pero no admiten análisis visual con inteligencia artificial. Suba una fotografía en formato JPG, PNG o WebP.');
        }

        if (! in_array($mime, self::MIMES_PERMITIDOS, true)) {
            throw new InvalidArgumentException("Formato no soportado para análisis visual ({$mime}). Solo se admiten imágenes JPG, PNG o WebP.");
        }

        $tamanoBytes = Storage::disk('local')->size($path);
        if ($tamanoBytes > self::MAX_BYTES) {
            throw new InvalidArgumentException('El archivo supera el tamaño máximo permitido de 5 MB para análisis de imagen.');
        }

        $contenido = Storage::disk('local')->get($path);
        if ($contenido === '' || @getimagesizefromstring($contenido) === false) {
            throw new InvalidArgumentException('El archivo no contiene una imagen visual válida.');
        }
        $hashCalculado = hash('sha256', $contenido);
        if (filled($subsanacion->hash_sha256) && ! hash_equals((string) $subsanacion->hash_sha256, (string) $hashCalculado)) {
            throw new RuntimeException('El hash criptográfico del archivo físico no coincide con el registrado en la subsanación.');
        }

        // Idempotencia: evitar solicitudes duplicadas activas para la misma versión de evidencia
        $activo = AnalisisEvidencia::where('subsanacion_id', $subsanacion->id)
            ->where('hash_evidencia_analizada', $hashCalculado)
            ->whereIn('estado_analisis', [AnalisisEvidencia::ESTADO_PENDIENTE, AnalisisEvidencia::ESTADO_EN_PROCESO])
            ->first();

        if ($activo) {
            return $activo;
        }

        $analisis = AnalisisEvidencia::create([
            'uuid_analisis' => (string) Str::uuid(),
            'autoevaluacion_id' => $autoevaluacion->id,
            'subsanacion_id' => $subsanacion->id,
            'criterio_id' => $subsanacion->criterio_id,
            'user_id' => $user?->id,
            'hash_evidencia_analizada' => $hashCalculado,
            'estado_analisis' => AnalisisEvidencia::ESTADO_PENDIENTE,
            'modelo_solicitado' => $this->geminiService->getModelo(),
            'intentos' => 0,
        ]);

        AnalisisEvidenciaJob::dispatch($analisis->id);

        return $analisis;
    }

    /**
     * Procesa la ejecución del análisis de la evidencia.
     */
    public function procesarAnalisis(AnalisisEvidencia $analisis): AnalisisEvidencia
    {
        $subsanacion = $analisis->subsanacion;
        if (! $subsanacion) {
            $analisis->update([
                'estado_analisis' => AnalisisEvidencia::ESTADO_FALLIDO,
                'mensaje_error' => 'Subsanación asociada no encontrada.',
                'completado_at' => now(),
            ]);

            return $analisis;
        }

        $path = $subsanacion->evidencia_url;
        if (! filled($path) || ! app(EvidenciaPrivadaService::class)->rutaPermitida($path) || ! Storage::disk('local')->exists($path)) {
            $analisis->update([
                'estado_analisis' => AnalisisEvidencia::ESTADO_FALLIDO,
                'mensaje_error' => 'El archivo de evidencia física no se encuentra en el almacenamiento.',
                'completado_at' => now(),
            ]);

            return $analisis;
        }

        $contenido = Storage::disk('local')->get($path);
        $hashActual = hash('sha256', $contenido);

        // Verificación crítica de integridad inmediatamente antes de transmitir
        if (! hash_equals((string) $analisis->hash_evidencia_analizada, (string) $hashActual)) {
            $analisis->update([
                'estado_analisis' => AnalisisEvidencia::ESTADO_REQUIERE_REVISION,
                'mensaje_error' => 'La evidencia fue reemplazada o modificada con posterioridad a la solicitud del análisis. Se evitó procesar un archivo diferente.',
                'completado_at' => now(),
            ]);

            return $analisis;
        }

        $analisis->update([
            'estado_analisis' => AnalisisEvidencia::ESTADO_EN_PROCESO,
            'iniciado_at' => now(),
            'intentos' => $analisis->intentos + 1,
        ]);

        $mime = Storage::disk('local')->mimeType($path);
        $base64 = base64_encode($contenido);

        $criterio = $analisis->criterioNormativo;
        $contextoTecnico = [
            'codigo' => $criterio?->codigo_criterio ?? $subsanacion->codigo_item,
            'titulo' => $criterio?->titulo ?? $subsanacion->codigo_item,
            'pregunta' => $criterio?->pregunta_ciudadana ?? '',
            'que_observar' => $criterio?->que_observar ?? '',
            'norma_base' => $criterio?->norma_base ?? 'Normativa ITSE',
        ];

        try {
            $resultadoGemini = $this->geminiService->analizarImagen($base64, $mime, $contextoTecnico);
            $datosValidados = $this->validacionService->validarYSanear($resultadoGemini['datos']);
            if ($datosValidados['criterion_code'] !== $contextoTecnico['codigo']) {
                throw new InvalidArgumentException('El criterio devuelto no coincide con el análisis solicitado.');
            }
            $datosFinales = $this->correlacionService->contextualizar($datosValidados, $criterio);

            ResultadoAnalisisEvidencia::updateOrCreate(
                ['analisis_evidencia_id' => $analisis->id],
                [
                    'criterio_codigo' => $datosFinales['criterion_code'],
                    'calidad_imagen' => $datosFinales['image_quality'],
                    'relevancia_evidencia' => $datosFinales['evidence_relevance'],
                    'nivel_incertidumbre' => $datosFinales['uncertainty_level'],
                    'elementos_detectados' => $datosFinales['detected_elements'],
                    'observaciones_visuales' => $datosFinales['visual_observations'],
                    'condiciones_visibles' => $datosFinales['visible_conditions'],
                    'no_observable' => $datosFinales['not_observable'],
                    'recomendaciones_captura' => $datosFinales['photo_improvement_recommendations'],
                    'resumen_pedagogico' => $datosFinales['pedagogical_summary'],
                    'tokens_entrada' => $resultadoGemini['tokens_entrada'],
                    'tokens_salida' => $resultadoGemini['tokens_salida'],
                    'tiempo_procesamiento_ms' => $resultadoGemini['tiempo_ms'],
                    'raw_payload_salida' => $resultadoGemini['datos'],
                ]
            );

            $estadoFinal = ($datosFinales['image_quality'] === ResultadoAnalisisEvidencia::CALIDAD_ILEGIBLE
                || in_array($datosFinales['evidence_relevance'], [ResultadoAnalisisEvidencia::RELEVANCIA_NO_RELACIONADA, 'INDETERMINADA'], true)
                || in_array($datosFinales['uncertainty_level'], ['ALTO', 'MUY_ALTO'], true))
                ? AnalisisEvidencia::ESTADO_REQUIERE_REVISION
                : AnalisisEvidencia::ESTADO_COMPLETADO;

            $analisis->update([
                'estado_analisis' => $estadoFinal,
                'version_modelo' => $this->geminiService->getModelo(),
                'completado_at' => now(),
                'mensaje_error' => null,
            ]);
        } catch (\Throwable $e) {
            $analisis->update([
                'estado_analisis' => AnalisisEvidencia::ESTADO_FALLIDO,
                'mensaje_error' => $e->getMessage(),
                'completado_at' => now(),
            ]);

            throw $e;
        }

        return $analisis->fresh(['resultado', 'criterioNormativo']);
    }

    /**
     * Consulta el estado y resultado de un análisis por su UUID.
     */
    public function consultarEstado(string $uuidAnalisis): AnalisisEvidencia
    {
        return AnalisisEvidencia::with(['resultado', 'criterioNormativo'])
            ->where('uuid_analisis', $uuidAnalisis)
            ->firstOrFail();
    }

    /**
     * Obtiene todos los análisis históricos asociados a una subsanación.
     *
     * @return Collection<int, AnalisisEvidencia>
     */
    public function obtenerHistorialSubsanacion(Subsanacion $subsanacion): Collection
    {
        return AnalisisEvidencia::with('resultado')
            ->where('subsanacion_id', $subsanacion->id)
            ->latest('id')
            ->get();
    }
}
