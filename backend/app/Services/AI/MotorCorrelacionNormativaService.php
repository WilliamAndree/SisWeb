<?php

namespace App\Services\AI;

use App\Models\CriterioNormativo;

class MotorCorrelacionNormativaService
{
    /**
     * Criterios que poseen limitaciones físicas normativas insuperables por fotografía.
     */
    protected const LIMITACIONES_NORMATIVAS_POR_CRITERIO = [
        'CRIT-01' => 'La vigencia anual de la carga y el peso del cilindro requieren constancia del proveedor de recargas.',
        'CRIT-02A' => 'Los extintores clase K requieren verificación de agente químico de acetato de potasio.',
        'CRIT-02B' => 'El interior de ductos y el motor extractor no son visibles externamente.',
        'CRIT-04' => 'El sistema de puesta a tierra exige obligatoriamente un protocolo de medición con telurómetro (< 25 ohmios) firmado por ingeniero electricista/mecánico electricista colegiado.',
        'CRIT-06' => 'El interruptor diferencial requiere prueba de pulsador de test (T) y comprobación de umbral de 30 mA.',
        'CRIT-08' => 'La autonomía de batería de la luz de emergencia (mínimo 90 minutos de descarga) no es medible por fotografía.',
        'CRIT-10' => 'La hermeticidad de la red o balón de GLP requiere prueba técnica con agua jabonosa o detector de gas.',
        'CRIT-13' => 'El anclaje de estanterías requiere comprobar resistencia física de fijaciones en pared.',
        'CRIT-14A' => 'El sentido de apertura de puertas debe verificarse libre de cerrojos o trabas en horario de atención.',
    ];

    /**
     * Contextualiza el resultado de la IA con el catálogo normativo de CheckITSE.
     *
     * @param  array<string, mixed>  $datosValidados
     * @return array<string, mixed>
     */
    public function contextualizar(array $datosValidados, ?CriterioNormativo $criterio): array
    {
        $codigo = $datosValidados['criterion_code'];
        $notObservable = $datosValidados['not_observable'];

        // Si el criterio tiene una limitación normativa física intrínseca, aseguramos su inclusión
        if (isset(self::LIMITACIONES_NORMATIVAS_POR_CRITERIO[$codigo])) {
            $limitacion = self::LIMITACIONES_NORMATIVAS_POR_CRITERIO[$codigo];
            if (! in_array($limitacion, $notObservable, true)) {
                $notObservable[] = $limitacion;
            }
        }

        $datosValidados['not_observable'] = $notObservable;

        // Contextualización pedagógica con el criterio oficial
        if ($criterio) {
            $datosValidados['criterio_titulo'] = $criterio->titulo ?? $criterio->codigo_criterio;
            $datosValidados['norma_base'] = $criterio->norma_base;
            $datosValidados['articulo_referencia'] = $criterio->articulo_referencia;
        }

        return $datosValidados;
    }
}
