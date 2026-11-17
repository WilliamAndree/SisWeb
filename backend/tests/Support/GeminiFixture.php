<?php

namespace Tests\Support;

final class GeminiFixture
{
    public static function imagen(): string
    {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', true);
    }

    public static function datos(array $overrides = []): array
    {
        return array_replace([
            'criterion_code' => 'CRIT-01',
            'image_quality' => 'OPTIMA',
            'evidence_relevance' => 'DIRECTAMENTE_PERTINENTE',
            'uncertainty_level' => 'BAJO',
            'detected_elements' => [[
                'element_name' => 'Extintor',
                'visual_status' => 'IDENTIFICADO_VISUALMENTE',
                'confidence_level' => 'ALTO',
                'description' => 'Cilindro visible; vigencia no comprobable.',
            ]],
            'visual_observations' => ['Cilindro visible.'],
            'visible_conditions' => ['Acceso despejado.'],
            'not_observable' => ['Vigencia de la carga.'],
            'photo_improvement_recommendations' => ['Acercar la etiqueta.'],
            'pedagogical_summary' => 'Orientación visual preventiva, no certificación oficial.',
        ], $overrides);
    }

    public static function respuesta(array $overrides = []): array
    {
        return ['candidates' => [['content' => ['parts' => [['text' => json_encode(self::datos($overrides))]]]]]];
    }
}
