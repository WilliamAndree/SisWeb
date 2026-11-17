<?php

namespace App\Services\Espacio;

use App\Models\AnalisisEvidencia;
use App\Models\Autoevaluacion;
use App\Models\ElementoEspacial;
use App\Models\PlanoEstablecimiento;
use App\Models\ResultadoAnalisisEvidencia;
use App\Models\SugerenciaEspacial;
use App\Models\User;
use App\Models\VersionPlano;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class SugerenciaEspacialService
{
    public function __construct(
        protected GestionEspacialService $gestionEspacialService
    ) {}

    /**
     * Mapeo de términos detectados en el análisis visual de Gemini hacia el catálogo de elementos espaciales.
     *
     * @var array<string, string>
     */
    protected const MAPEO_ELEMENTOS = [
        'extintor' => ElementoEspacial::TIPO_EXTINTOR,
        'extinguidor' => ElementoEspacial::TIPO_EXTINTOR,
        'pqs' => ElementoEspacial::TIPO_EXTINTOR,
        'co2' => ElementoEspacial::TIPO_EXTINTOR,
        'cilindro' => ElementoEspacial::TIPO_EXTINTOR,
        'salida' => ElementoEspacial::TIPO_SENAL_SALIDA,
        'senal_salida' => ElementoEspacial::TIPO_SENAL_SALIDA,
        'cartel_salida' => ElementoEspacial::TIPO_SENAL_SALIDA,
        'letrero_salida' => ElementoEspacial::TIPO_SENAL_SALIDA,
        'senaletica' => ElementoEspacial::TIPO_SENAL_SALIDA,
        'evacuacion' => ElementoEspacial::TIPO_SENAL_SALIDA,
        'luz_emergencia' => ElementoEspacial::TIPO_LUZ_EMERGENCIA,
        'luces_emergencia' => ElementoEspacial::TIPO_LUZ_EMERGENCIA,
        'emergencia' => ElementoEspacial::TIPO_LUZ_EMERGENCIA,
        'luminaria' => ElementoEspacial::TIPO_LUZ_EMERGENCIA,
        'tablero' => ElementoEspacial::TIPO_TABLERO_ELECTRICO,
        'electrico' => ElementoEspacial::TIPO_TABLERO_ELECTRICO,
        'tablero_electrico' => ElementoEspacial::TIPO_TABLERO_ELECTRICO,
        'termomagnetico' => ElementoEspacial::TIPO_TABLERO_ELECTRICO,
        'obstaculo' => ElementoEspacial::TIPO_OBSTACULO,
        'obstruccion' => ElementoEspacial::TIPO_OBSTACULO,
        'bloqueo' => ElementoEspacial::TIPO_OBSTACULO,
        'botiquin' => ElementoEspacial::TIPO_BOTIQUIN,
        'primeros_auxilios' => ElementoEspacial::TIPO_BOTIQUIN,
    ];

    /**
     * Sincroniza y retorna la colección de sugerencias espaciales para una autoevaluación.
     * Consulta los análisis terminados de Fase 2 y genera sugerencias idempotentes sin llamar a Gemini.
     *
     * @return Collection<int, SugerenciaEspacial>
     */
    public function obtenerSugerencias(Autoevaluacion $autoevaluacion): Collection
    {
        $this->sincronizarSugerenciasDesdeAnalisis($autoevaluacion);

        /** @var Collection<int, SugerenciaEspacial> $sugerencias */
        $sugerencias = SugerenciaEspacial::where('autoevaluacion_id', $autoevaluacion->id)
            ->with(['subsanacion', 'analisisEvidencia.resultado', 'elementoEspacial'])
            ->orderByRaw("FIELD(estado, 'PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'NO_APLICABLE', 'INVALIDADA')")
            ->orderBy('id', 'desc')
            ->get();

        return $sugerencias;
    }

    /**
     * Inspecciona los análisis completados de la autoevaluación y genera sugerencias para aquellos
     * elementos identificados visualmente que aún no hayan sido procesados.
     */
    public function sincronizarSugerenciasDesdeAnalisis(Autoevaluacion $autoevaluacion): void
    {
        $plano = $this->gestionEspacialService->obtenerOInicializarPlano($autoevaluacion);

        $analisisCompletados = AnalisisEvidencia::where('autoevaluacion_id', $autoevaluacion->id)
            ->where('estado_analisis', AnalisisEvidencia::ESTADO_COMPLETADO)
            ->with(['resultado', 'subsanacion'])
            ->get();

        foreach ($analisisCompletados as $analisis) {
            $resultado = $analisis->resultado;
            $subsanacion = $analisis->subsanacion;

            if (! $resultado || ! $subsanacion) {
                continue;
            }

            // Verificación de integridad de la evidencia física
            $path = $subsanacion->evidencia_url;
            if (! filled($path) || ! Storage::disk('local')->exists($path)) {
                $this->invalidarSugerenciasPorEvidencia($analisis->id, 'Archivo de evidencia física no encontrado en almacenamiento.');

                continue;
            }

            $contenido = Storage::disk('local')->get($path);
            $hashActual = hash('sha256', $contenido);

            if (! hash_equals((string) $analisis->hash_evidencia_analizada, (string) $hashActual)) {
                $this->invalidarSugerenciasPorEvidencia($analisis->id, 'El hash de la evidencia física difiere del registrado en el análisis.');

                continue;
            }

            $elementosDetectados = $resultado->elementos_detectados;
            if (! is_array($elementosDetectados)) {
                continue;
            }

            foreach ($elementosDetectados as $indice => $elem) {
                if (! is_array($elem)) {
                    continue;
                }

                $visualStatus = (string) ($elem['visual_status'] ?? '');
                // REGLA FUNDAMENTAL: Solo observaciones donde el elemento fue positivamente identificado
                if ($visualStatus !== ResultadoAnalisisEvidencia::VISUAL_IDENTIFICADO) {
                    continue;
                }

                $nombreDetectado = (string) ($elem['element_name'] ?? '');
                $descripcion = (string) ($elem['description'] ?? '');
                $tipoEspacial = $this->mapearTipoEspacial($nombreDetectado, $descripcion);

                if (! $tipoEspacial) {
                    // Si no corresponde a ningún elemento de seguridad física del croquis, se ignora
                    continue;
                }

                $confianza = strtoupper((string) ($elem['confidence_level'] ?? 'MEDIO'));
                if (! in_array($confianza, ['ALTO', 'MEDIO', 'BAJO'], true)) {
                    $confianza = 'MEDIO';
                }

                // Generación idempotente: índice exacto en el análisis
                SugerenciaEspacial::firstOrCreate(
                    [
                        'resultado_analisis_evidencia_id' => $resultado->id,
                        'indice_elemento_analisis' => (int) $indice,
                    ],
                    [
                        'uuid_sugerencia' => (string) Str::uuid(),
                        'autoevaluacion_id' => $autoevaluacion->id,
                        'plano_establecimiento_id' => $plano->id,
                        'analisis_evidencia_id' => $analisis->id,
                        'subsanacion_id' => $subsanacion->id,
                        'hash_evidencia_analizada' => $hashActual,
                        'version_plano_id' => $plano->version_activa_id,
                        'tipo_elemento' => $tipoEspacial,
                        'nombre_detectado' => mb_substr($nombreDetectado, 0, 150),
                        'descripcion_observacion' => $descripcion ?: "Elemento identificado visualmente: {$nombreDetectado}",
                        'nivel_confianza' => $confianza,
                        'estado' => SugerenciaEspacial::ESTADO_PENDIENTE,
                        'generada_at' => now(),
                    ]
                );
            }
        }
    }

    /**
     * Clasifica semánticamente un nombre y descripción hacia un tipo de elemento espacial.
     */
    public function mapearTipoEspacial(string $nombre, string $descripcion = ''): ?string
    {
        $texto = mb_strtolower("{$nombre} {$descripcion}", 'UTF-8');

        // Búsquedas directas prioritarias
        if (str_contains($texto, 'extintor') || str_contains($texto, 'pqs') || str_contains($texto, 'co2')) {
            return ElementoEspacial::TIPO_EXTINTOR;
        }

        if (str_contains($texto, 'luz de emergencia') || str_contains($texto, 'luces de emergencia') || str_contains($texto, 'foco de emergencia') || str_contains($texto, 'luminaria de emergencia')) {
            return ElementoEspacial::TIPO_LUZ_EMERGENCIA;
        }

        if (str_contains($texto, 'salida') || str_contains($texto, 'evacuación') || str_contains($texto, 'evacuacion') || str_contains($texto, 'señal de salida') || str_contains($texto, 'senal de salida') || str_contains($texto, 'cartel de salida')) {
            return ElementoEspacial::TIPO_SENAL_SALIDA;
        }

        if (str_contains($texto, 'tablero') || str_contains($texto, 'eléctrico') || str_contains($texto, 'electrico') || str_contains($texto, 'termomagnético') || str_contains($texto, 'termomagnetico') || str_contains($texto, 'caja de llaves')) {
            return ElementoEspacial::TIPO_TABLERO_ELECTRICO;
        }

        if (str_contains($texto, 'obstáculo') || str_contains($texto, 'obstaculo') || str_contains($texto, 'obstrucción') || str_contains($texto, 'obstruccion') || str_contains($texto, 'bloqueo')) {
            return ElementoEspacial::TIPO_OBSTACULO;
        }

        if (str_contains($texto, 'botiquín') || str_contains($texto, 'botiquin') || str_contains($texto, 'primeros auxilios')) {
            return ElementoEspacial::TIPO_BOTIQUIN;
        }

        return null;
    }

    /**
     * Rechaza formalmente una sugerencia espacial sin alterar el plano ni crear elementos.
     *
     * @throws InvalidArgumentException
     */
    public function rechazarSugerencia(
        SugerenciaEspacial $sugerencia,
        ?string $motivo = null,
        ?User $user = null,
        ?string $sessionToken = null
    ): SugerenciaEspacial {
        return DB::transaction(function () use ($sugerencia, $motivo, $user, $sessionToken) {
            /** @var SugerenciaEspacial $sugBloqueada */
            $sugBloqueada = SugerenciaEspacial::where('id', $sugerencia->id)->lockForUpdate()->firstOrFail();

            if ($sugBloqueada->estado === SugerenciaEspacial::ESTADO_RECHAZADA) {
                return $sugBloqueada;
            }

            if ($sugBloqueada->estado !== SugerenciaEspacial::ESTADO_PENDIENTE) {
                throw new InvalidArgumentException("No se puede rechazar una sugerencia que se encuentra en estado [{$sugBloqueada->estado}].");
            }

            $sugBloqueada->estado = SugerenciaEspacial::ESTADO_RECHAZADA;
            $sugBloqueada->motivo_rechazo = $motivo ? mb_substr(trim($motivo), 0, 255) : 'Rechazada por el ciudadano.';
            $sugBloqueada->resuelta_at = now();
            $sugBloqueada->user_id = $user?->id;
            $sugBloqueada->session_token = $sessionToken;
            $sugBloqueada->save();

            return $sugBloqueada;
        });
    }

    /**
     * Confirma explícitamente una sugerencia e incorpora el elemento en el plano con ubicación manual.
     * Genera una nueva versión espacial ($N+1$) y vincula la sugerencia al elemento persistido.
     *
     * @param  array{codigo_ambiente: string, posicion_x: float, posicion_y: float, observacion?: ?string, version_esperada_id?: ?int}  $datosUbicacion
     * @return array{sugerencia: SugerenciaEspacial, version: VersionPlano}
     *
     * @throws InvalidArgumentException
     * @throws RuntimeException
     */
    public function confirmarYUbicacionManual(
        SugerenciaEspacial $sugerencia,
        array $datosUbicacion,
        ?User $user = null,
        ?string $sessionToken = null
    ): array {
        // Pre-verificación de integridad de la evidencia física fuera de la transacción espacial
        // para garantizar que la invalidación persista si la evidencia fue vulnerada
        $sugPrevia = SugerenciaEspacial::with('subsanacion')->findOrFail($sugerencia->id);

        if ($sugPrevia->estado !== SugerenciaEspacial::ESTADO_CONFIRMADA) {
            $subsanacion = $sugPrevia->subsanacion;
            if (! $subsanacion || ! filled($subsanacion->evidencia_url) || ! Storage::disk('local')->exists($subsanacion->evidencia_url)) {
                $sugPrevia->update([
                    'estado' => SugerenciaEspacial::ESTADO_INVALIDADA,
                    'motivo_rechazo' => 'La evidencia física original fue eliminada del almacenamiento privado.',
                    'resuelta_at' => now(),
                ]);
                throw new RuntimeException('La evidencia física de origen ya no existe. La sugerencia ha sido invalidada.');
            }

            $contenido = Storage::disk('local')->get($subsanacion->evidencia_url);
            $hashCalculado = hash('sha256', $contenido);

            if (! hash_equals((string) $sugPrevia->hash_evidencia_analizada, (string) $hashCalculado)) {
                $sugPrevia->update([
                    'estado' => SugerenciaEspacial::ESTADO_INVALIDADA,
                    'motivo_rechazo' => 'El hash criptográfico de la evidencia física fue alterado tras el análisis original.',
                    'resuelta_at' => now(),
                ]);
                throw new RuntimeException('El archivo de evidencia física fue reemplazado o modificado. La sugerencia ha sido invalidada.');
            }
        }

        return DB::transaction(function () use ($sugerencia, $datosUbicacion, $user, $sessionToken) {
            /** @var SugerenciaEspacial $sug */
            $sug = SugerenciaEspacial::where('id', $sugerencia->id)->lockForUpdate()->firstOrFail();

            // Idempotencia: si ya fue confirmada previamente, retornar
            if ($sug->estado === SugerenciaEspacial::ESTADO_CONFIRMADA) {
                /** @var VersionPlano $versionExistente */
                $versionExistente = VersionPlano::findOrFail($sug->version_plano_id);

                return [
                    'sugerencia' => $sug,
                    'version' => $versionExistente,
                ];
            }

            if ($sug->estado !== SugerenciaEspacial::ESTADO_PENDIENTE) {
                throw new InvalidArgumentException("La sugerencia no puede ser confirmada porque está en estado [{$sug->estado}].");
            }

            // 1. Verificación del plano y versión activa
            /** @var PlanoEstablecimiento $plano */
            $plano = PlanoEstablecimiento::where('id', $sug->plano_establecimiento_id)->lockForUpdate()->firstOrFail();
            $versionActiva = $plano->versionActiva;

            if (! $versionActiva) {
                throw new InvalidArgumentException('El establecimiento debe contar con al menos un ambiente en su croquis antes de ubicar elementos sugeridos.');
            }

            // 3. Detección de drift / cambio de versión entre la presentación y la confirmación
            $versionEsperadaId = isset($datosUbicacion['version_esperada_id']) ? (int) $datosUbicacion['version_esperada_id'] : null;
            if ($versionEsperadaId !== null && (int) $versionActiva->id !== $versionEsperadaId) {
                throw new InvalidArgumentException("El croquis fue modificado por otra acción reciente (Versión vigente: {$versionActiva->numero_version}). Por favor revise la versión actual antes de confirmar.");
            }

            // 4. Integridad de la versión activa (JSON canónico y su hash SHA-256)
            if (! $this->gestionEspacialService->verificarIntegridadVersion($versionActiva)) {
                throw new RuntimeException('La versión activa del croquis presenta un fallo de integridad criptográfica en su geometría normalizada.');
            }

            // 5. Validación de los datos de ubicación manual ciudadana
            $codigoAmbiente = trim((string) ($datosUbicacion['codigo_ambiente'] ?? ''));
            if (empty($codigoAmbiente)) {
                throw new InvalidArgumentException('Debe seleccionar el ambiente donde se ubica físicamente el elemento.');
            }

            $posX = round((float) ($datosUbicacion['posicion_x'] ?? 0.0), 2);
            $posY = round((float) ($datosUbicacion['posicion_y'] ?? 0.0), 2);
            $observacionUsuario = isset($datosUbicacion['observacion']) ? trim((string) $datosUbicacion['observacion']) : null;

            // 6. Preparar nueva geometría inmutable basada en la versión activa
            $geometria = $versionActiva->geometria_normalizada;
            $ambienteEncontrado = false;

            foreach ($geometria['niveles'] as &$nivel) {
                foreach ($nivel['ambientes'] as &$ambiente) {
                    if ($ambiente['codigo'] === $codigoAmbiente) {
                        $ambienteEncontrado = true;

                        // Agregar el nuevo elemento declarado con origen de sugerencia confirmada
                        $ambiente['elementos'][] = [
                            'tipo' => $sug->tipo_elemento,
                            'posicion_x' => $posX,
                            'posicion_y' => $posY,
                            'origen_dato' => ElementoEspacial::ORIGEN_CONFIRMADO_SUGERENCIA_IA,
                            'subsanacion_id' => $sug->subsanacion_id,
                            'observacion' => $observacionUsuario ?: "Confirmado por el ciudadano a partir de observación visual IA (#{$sug->id} - {$sug->tipo_elemento})",
                        ];
                        break 2;
                    }
                }
            }
            unset($nivel, $ambiente);

            if (! $ambienteEncontrado) {
                throw new InvalidArgumentException("El ambiente [{$codigoAmbiente}] no existe en la distribución actual del croquis.");
            }

            // 7. Persistir versión N+1 de manera transaccional
            $descripcionCambio = "Incorporación de {$sug->tipo_elemento} confirmado por el ciudadano en {$codigoAmbiente}";
            $nuevaVersion = $this->gestionEspacialService->crearOActualizarVersion(
                $plano,
                $geometria,
                $user,
                $sessionToken,
                $descripcionCambio
            );

            // 8. Localizar el registro relacional recién persistido en elementos_espaciales
            $elementoRelacional = ElementoEspacial::where('tipo', $sug->tipo_elemento)
                ->where('subsanacion_id', $sug->subsanacion_id)
                ->where('origen_dato', ElementoEspacial::ORIGEN_CONFIRMADO_SUGERENCIA_IA)
                ->latest('id')
                ->first();

            // 9. Actualizar la sugerencia como CONFIRMADA
            $sug->estado = SugerenciaEspacial::ESTADO_CONFIRMADA;
            $sug->version_plano_id = $nuevaVersion->id;
            $sug->elemento_espacial_id = $elementoRelacional?->id;
            $sug->resuelta_at = now();
            $sug->user_id = $user?->id;
            $sug->session_token = $sessionToken;
            $sug->save();

            return [
                'sugerencia' => $sug,
                'version' => $nuevaVersion,
            ];
        });
    }

    /**
     * Invalida todas las sugerencias pendientes asociadas a un análisis específico
     * cuando se detecta compromiso o alteración de la evidencia física.
     */
    protected function invalidarSugerenciasPorEvidencia(int $analisisId, string $motivo): void
    {
        SugerenciaEspacial::where('analisis_evidencia_id', $analisisId)
            ->where('estado', SugerenciaEspacial::ESTADO_PENDIENTE)
            ->update([
                'estado' => SugerenciaEspacial::ESTADO_INVALIDADA,
                'motivo_rechazo' => $motivo,
                'resuelta_at' => now(),
            ]);
    }
}
