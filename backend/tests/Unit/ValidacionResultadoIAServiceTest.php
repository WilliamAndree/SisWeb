<?php

use App\Services\AI\ValidacionResultadoIAService;
use Tests\Support\GeminiFixture;

test('IA-3C-01 rechaza enums desconocidos y estructuras invalidas sin defaults favorables', function (array $override) {
    expect(fn () => (new ValidacionResultadoIAService)->validarYSanear(GeminiFixture::datos($override)))
        ->toThrow(InvalidArgumentException::class);
})->with([
    'calidad desconocida' => [['image_quality' => 'NO_SE']],
    'relevancia desconocida' => [['evidence_relevance' => 'QUIZAS']],
    'incertidumbre desconocida' => [['uncertainty_level' => 'IGNORADA']],
    'calidad null' => [['image_quality' => null]],
    'codigo array' => [['criterion_code' => ['CRIT-01']]],
    'resumen array' => [['pedagogical_summary' => ['texto']]],
    'lista como texto' => [['visual_observations' => 'texto']],
    'lista contiene objeto' => [['visible_conditions' => [['texto' => 'no comprobado']]]],
    'elementos como texto' => [['detected_elements' => 'extintor']],
    'elemento incompleto' => [['detected_elements' => [['element_name' => 'Equipo']]]],
    'estado visual desconocido' => [['detected_elements' => [['element_name' => 'Equipo', 'description' => 'Visible', 'visual_status' => 'APROBADO', 'confidence_level' => 'ALTO']]]],
    'confianza desconocida' => [['detected_elements' => [['element_name' => 'Equipo', 'description' => 'Visible', 'visual_status' => 'IDENTIFICADO_VISUALMENTE', 'confidence_level' => 'CIERTO']]]],
    'resumen demasiado extenso' => [['pedagogical_summary' => str_repeat('a', 10001)]],
]);

test('IA-3C-06 rechaza afirmaciones de certificacion oficial sin respaldo visual', function (string $texto) {
    expect(fn () => (new ValidacionResultadoIAService)->validarYSanear(GeminiFixture::datos(['pedagogical_summary' => $texto])))
        ->toThrow(InvalidArgumentException::class);
})->with(['Certifico que este local es seguro.', 'Este local está aprobado oficialmente.', 'El local cuenta con certificación oficial ITSE.']);

test('IA-3C-08 exige cada campo obligatorio de la respuesta', function (string $campo) {
    $datos = GeminiFixture::datos();
    unset($datos[$campo]);

    expect(fn () => (new ValidacionResultadoIAService)->validarYSanear($datos))->toThrow(InvalidArgumentException::class);
})->with(['criterion_code', 'image_quality', 'evidence_relevance', 'uncertainty_level', 'detected_elements', 'visual_observations', 'visible_conditions', 'not_observable', 'photo_improvement_recommendations', 'pedagogical_summary']);

test('IA-3C-09 conserva elementos no observables y descarta instrucciones fuera del contrato', function () {
    $datos = GeminiFixture::datos(['tool_call' => ['action' => 'aprobar_local', 'user_id' => 999]]);
    $datos['detected_elements'][0]['visual_status'] = 'NO_DETERMINABLE_POR_FOTOGRAFIA';
    $datos['detected_elements'][0]['description'] = 'No se puede determinar operatividad a partir de esta imagen.';

    $resultado = (new ValidacionResultadoIAService)->validarYSanear($datos);

    expect($resultado)->not->toHaveKey('tool_call');
    expect($resultado['detected_elements'][0]['visual_status'])->toBe('NO_DETERMINABLE_POR_FOTOGRAFIA');
    expect($resultado['not_observable'])->toBe(['Vigencia de la carga.']);
});
