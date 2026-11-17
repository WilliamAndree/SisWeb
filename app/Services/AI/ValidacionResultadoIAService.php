<?php

namespace App\Services\AI;

use App\Models\ResultadoAnalisisEvidencia;
use InvalidArgumentException;

class ValidacionResultadoIAService
{
    /**
     * Campos requeridos en la estructura raíz devuelta por el modelo.
     */
    protected const CAMPOS_REQUERIDOS = [
        'criterion_code',
        'image_quality',
        'evidence_relevance',
        'detected_elements',
        'visual_observations',
        'visible_conditions',
        'not_observable',
        'uncertainty_level',
        'photo_improvement_recommendations',
        'pedagogical_summary',
    ];

    /**
     * Expresiones no permitidas que serán saneadas si aparecen en las observaciones.
     */
    protected const FRASES_A_SANEAR = [
        'cumple con la norma' => 'presenta condiciones visuales coincidentes',
        'cumple la norma' => 'presenta condiciones coincidentes',
        'está aprobado' => 'se observa en aparente orden',
        'esta aprobado' => 'se observa en aparente orden',
        'conforme para inspección' => 'visualmente observable',
        'conforme para inspeccion' => 'visualmente observable',
        'inmune a clausura' => 'en evaluación preventiva',
        'garantizado' => 'registrado preventivamente',
        'certificado' => 'declarado',
    ];

    /**
     * Valida la estructura y sanea semánticamente la respuesta del modelo de IA.
     *
     * @param  array<string, mixed>  $rawResponse
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException
     */
    public function validarYSanear(array $rawResponse): array
    {
        foreach (self::CAMPOS_REQUERIDOS as $campo) {
            if (! array_key_exists($campo, $rawResponse)) {
                throw new InvalidArgumentException("La respuesta del modelo carece del campo obligatorio: '{$campo}'");
            }
        }

        $this->validarEstructura($rawResponse);

        // Sanitización y normalización de elementos detectados
        $elementosValidados = [];
        if (is_array($rawResponse['detected_elements'])) {
            foreach ($rawResponse['detected_elements'] as $elem) {
                $nombre = $elem['element_name'];
                $status = $elem['visual_status'];
                $confianza = $elem['confidence_level'];
                $descripcion = $elem['description'];
                $descripcion = $this->sanearTexto($descripcion);

                $elementosValidados[] = [
                    'element_name' => $this->sanearTexto($nombre),
                    'visual_status' => $status,
                    'confidence_level' => $confianza,
                    'description' => $descripcion,
                ];
            }
        }

        return [
            'criterion_code' => (string) $rawResponse['criterion_code'],
            'image_quality' => $rawResponse['image_quality'],
            'evidence_relevance' => $rawResponse['evidence_relevance'],
            'uncertainty_level' => $rawResponse['uncertainty_level'],
            'detected_elements' => $elementosValidados,
            'visual_observations' => $this->sanearArrayTextos((array) $rawResponse['visual_observations']),
            'visible_conditions' => $this->sanearArrayTextos((array) $rawResponse['visible_conditions']),
            'not_observable' => $this->sanearArrayTextos((array) $rawResponse['not_observable']),
            'photo_improvement_recommendations' => $this->sanearArrayTextos((array) $rawResponse['photo_improvement_recommendations']),
            'pedagogical_summary' => $this->sanearTexto((string) $rawResponse['pedagogical_summary']),
        ];
    }

    /**
     * Sanea un arreglo de cadenas de texto.
     *
     * @param  array<int, mixed>  $textos
     * @return array<int, string>
     */
    protected function sanearArrayTextos(array $textos): array
    {
        $limpios = [];
        foreach ($textos as $t) {
            if (is_string($t) && filled(trim($t))) {
                $limpios[] = $this->sanearTexto(trim($t));
            }
        }

        return $limpios;
    }

    /**
     * Sanea términos categóricos o vinculantes reemplazándolos por vocabulario preventivo.
     */
    protected function sanearTexto(string $texto): string
    {
        $limpio = $texto;
        foreach (self::FRASES_A_SANEAR as $prohibido => $reemplazo) {
            $limpio = preg_replace('/\b'.preg_quote($prohibido, '/').'\b/iu', $reemplazo, $limpio) ?? $limpio;
        }

        return $limpio;
    }

    private function validarEstructura(array $datos): void
    {
        foreach (['criterion_code', 'pedagogical_summary'] as $campo) {
            $this->validarTexto($datos[$campo], $campo);
            if (trim($datos[$campo]) === '') {
                throw new InvalidArgumentException("El campo {$campo} no puede estar vacío.");
            }
        }

        foreach (['image_quality' => ResultadoAnalisisEvidencia::CALIDADES_VALIDAS,
            'evidence_relevance' => ResultadoAnalisisEvidencia::RELEVANCIAS_VALIDAS,
            'uncertainty_level' => ResultadoAnalisisEvidencia::INCERTIDUMBRES_VALIDAS] as $campo => $permitidos) {
            $this->validarEnum($datos[$campo], $permitidos, $campo);
        }

        foreach (['detected_elements', 'visual_observations', 'visible_conditions', 'not_observable', 'photo_improvement_recommendations'] as $campo) {
            if (! is_array($datos[$campo]) || ! array_is_list($datos[$campo]) || count($datos[$campo]) > 100) {
                throw new InvalidArgumentException("El campo {$campo} debe ser una lista de hasta 100 elementos.");
            }
            foreach ($datos[$campo] as $item) {
                if ($campo !== 'detected_elements') {
                    $this->validarTexto($item, $campo);

                    continue;
                }
                if (! is_array($item)) {
                    throw new InvalidArgumentException('Elemento detectado inválido.');
                }
                foreach (['element_name', 'description'] as $texto) {
                    $this->validarTexto($item[$texto] ?? null, $texto);
                }
                $this->validarEnum($item['visual_status'] ?? null, ResultadoAnalisisEvidencia::VISUALES_VALIDOS, 'visual_status');
                $this->validarEnum($item['confidence_level'] ?? null, ['ALTO', 'MEDIO', 'BAJO'], 'confidence_level');
            }
        }
    }

    private function validarEnum(mixed $valor, array $permitidos, string $campo): void
    {
        if (! is_string($valor) || ! in_array($valor, $permitidos, true)) {
            throw new InvalidArgumentException("Valor desconocido o inválido para {$campo}.");
        }
    }

    private function validarTexto(mixed $texto, string $campo): void
    {
        if (! is_string($texto) || strlen($texto) > 10000) {
            throw new InvalidArgumentException("El campo {$campo} debe ser texto de hasta 10000 bytes.");
        }
        if (preg_match('/\b(?:certifico|certificamos|aprobado oficialmente|(?:cuenta con|tiene|otorga) (?:una )?certificaci[oó]n oficial)\b/iu', $texto)) {
            throw new InvalidArgumentException('El análisis visual no puede emitir certificaciones oficiales.');
        }
    }
}
