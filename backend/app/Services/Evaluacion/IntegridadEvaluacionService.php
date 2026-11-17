<?php

namespace App\Services\Evaluacion;

use App\Models\Autoevaluacion;
use JsonException;

class IntegridadEvaluacionService
{
    public const ESTADO_VALIDO = 'VALIDO';

    public const ESTADO_NO_COINCIDE = 'NO_COINCIDE';

    public const ESTADO_NO_VERIFICABLE = 'NO_VERIFICABLE';

    public const METODO_CANONICO_ESTRICTO = 'CANONICO_ESTRICTO';

    public const METODO_COMPATIBILIDAD_HISTORICA_METRICAS = 'COMPATIBILIDAD_HISTORICA_METRICAS';

    public const METODO_SIN_SNAPSHOT = 'SIN_SNAPSHOT';

    public const METODO_DISCREPANCIA = 'DISCREPANCIA_DETECTADA';

    /**
     * Normaliza recursivamente las claves de arrays asociativos en orden alfabético estricto,
     * conservando las listas numéricas indexadas en su orden natural.
     *
     * @param  array<string|int, mixed>  $data
     */
    public function normalizarArrayDeterminista(array &$data): void
    {
        if (! array_is_list($data)) {
            ksort($data);
        }

        foreach ($data as &$value) {
            if (is_array($value)) {
                $this->normalizarArrayDeterminista($value);
            }
        }
    }

    /**
     * Serializa de forma canónica y determinística un array a JSON sin escapar barras ni caracteres Unicode.
     *
     * @param  array<string, mixed>  $payload
     */
    public function generarJsonCanonico(array $payload): string
    {
        $copia = $payload;
        $this->normalizarArrayDeterminista($copia);

        return json_encode($copia, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }

    /**
     * Calcula la huella SHA-256 canónica a partir de un array de payload o del snapshot de una autoevaluación.
     *
     * @param  array<string, mixed>|Autoevaluacion  $target
     */
    public function calcularHashIntegridad(array|Autoevaluacion $target): string
    {
        if ($target instanceof Autoevaluacion) {
            $payload = $this->resolverPayload($target->payload_canonico);
            if ($payload === null) {
                return '';
            }
        } else {
            $payload = $target;
        }

        return hash('sha256', $this->generarJsonCanonico($payload));
    }

    /**
     * Verifica la integridad criptográfica del diagnóstico registrado frente a su huella hash_integridad.
     *
     * Incluye compatibilidad estricta para registros históricos (como el ID 22) que sufrieron
     * inyección de la clave 'metricas' antes de la fase C.3.
     *
     * @return array{
     *     estado: string,
     *     metodo: string,
     *     mensaje: string,
     *     hash_almacenado: ?string,
     *     hash_calculado: ?string
     * }
     */
    public function verificarIntegridadHash(Autoevaluacion $autoevaluacion): array
    {
        $hashAlmacenado = $autoevaluacion->hash_integridad;
        $payloadRaw = $autoevaluacion->payload_canonico;
        $payload = $this->resolverPayload($payloadRaw);

        if (empty($hashAlmacenado) || empty($payloadRaw) || $payload === null) {
            return [
                'estado' => self::ESTADO_NO_VERIFICABLE,
                'metodo' => self::METODO_SIN_SNAPSHOT,
                'mensaje' => 'La autoevaluación no cuenta con hash o snapshot canónico válido registrado.',
                'hash_almacenado' => $hashAlmacenado,
                'hash_calculado' => null,
            ];
        }

        // 1. Verificación canónica estricta
        $hashCalculado = $this->calcularHashIntegridad($payload);

        if (hash_equals($hashAlmacenado, $hashCalculado)) {
            return [
                'estado' => self::ESTADO_VALIDO,
                'metodo' => self::METODO_CANONICO_ESTRICTO,
                'mensaje' => 'La integridad del diagnóstico fue validada satisfactoriamente con verificación canónica estricta.',
                'hash_almacenado' => $hashAlmacenado,
                'hash_calculado' => $hashCalculado,
            ];
        }

        // 2. Fallback estricto para registros históricos con contaminación 'metricas' (ej. ID 22)
        if (isset($payload['metricas'])) {
            $payloadSinMetricas = $payload;
            unset($payloadSinMetricas['metricas']);
            $hashSinMetricas = $this->calcularHashIntegridad($payloadSinMetricas);

            if (hash_equals($hashAlmacenado, $hashSinMetricas)) {
                return [
                    'estado' => self::ESTADO_VALIDO,
                    'metodo' => self::METODO_COMPATIBILIDAD_HISTORICA_METRICAS,
                    'mensaje' => 'Integridad validada mediante compatibilidad histórica (exclusión de métricas operativas sobreescritas).',
                    'hash_almacenado' => $hashAlmacenado,
                    'hash_calculado' => $hashSinMetricas,
                ];
            }
        }

        return [
            'estado' => self::ESTADO_NO_COINCIDE,
            'metodo' => self::METODO_DISCREPANCIA,
            'mensaje' => 'El hash calculado a partir del snapshot canónico no coincide con la huella registrada.',
            'hash_almacenado' => $hashAlmacenado,
            'hash_calculado' => $hashCalculado,
        ];
    }

    /** @return array<string|int, mixed>|null */
    private function resolverPayload(mixed $payload): ?array
    {
        if (is_string($payload)) {
            try {
                $payload = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException) {
                return null;
            }
        }

        return is_array($payload) ? $payload : null;
    }
}
