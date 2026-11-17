<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAutoevaluacionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     * Sanitiza campos opcionales vacíos para que sean tratados como null y no generen datos inventados.
     */
    protected function prepareForValidation(): void
    {
        $evaluacionOrigenUuid = $this->evaluacion_origen_uuid ?? $this->route('uuid');

        [$usaGlp, $galonesGlp] = $this->sanitizarDatosGlp();

        $this->merge([
            'evaluacion_origen_uuid' => $evaluacionOrigenUuid,
            'ruc' => $this->sanitizarTexto('ruc'),
            'distrito' => $this->sanitizarTexto('distrito'),
            'direccion' => $this->sanitizarTexto('direccion'),
            'referencia' => $this->sanitizarTexto('referencia'),
            'area_m2' => $this->sanitizarValorOpcional('area_m2'),
            'pisos' => $this->sanitizarValorOpcional('pisos'),
            'aforo' => $this->sanitizarValorOpcional('aforo'),
            'usa_glp' => $usaGlp,
            'galones_glp' => $galonesGlp,
            'usa_caldero' => $this->sanitizarBooleano('usa_caldero'),
            'usa_liquidos_inflamables' => $this->sanitizarBooleano('usa_liquidos_inflamables'),
            'tiene_equipos_fritura' => $this->sanitizarBooleanoOpcional('tiene_equipos_fritura'),
            'tiene_escaleras' => $this->sanitizarBooleanoOpcional('tiene_escaleras'),
            'tiene_estanterias_altas' => $this->sanitizarBooleanoOpcional('tiene_estanterias_altas'),
        ]);
    }

    private function sanitizarBooleano(string $campo): mixed
    {
        if (! $this->has($campo) || $this->input($campo) === null || $this->input($campo) === '') {
            return null;
        }

        return $this->normalizarBooleanoOpcional($this->input($campo));
    }

    private function sanitizarDatosGlp(): array
    {
        $usaGlp = $this->sanitizarBooleano('usa_glp');
        $cantidad = $this->input('galones_glp');
        $galonesGlp = ($usaGlp === true && filled($cantidad))
            ? (is_numeric($cantidad) ? (float) $cantidad : $cantidad)
            : null;

        return [$usaGlp, $galonesGlp];
    }

    private function sanitizarBooleanoOpcional(string $campo): mixed
    {
        return $this->has($campo)
            ? $this->normalizarBooleanoOpcional($this->input($campo))
            : null;
    }

    private function sanitizarTexto(string $campo): ?string
    {
        return filled($this->input($campo)) ? trim((string) $this->input($campo)) : null;
    }

    private function sanitizarValorOpcional(string $campo): mixed
    {
        return filled($this->input($campo)) ? $this->input($campo) : null;
    }

    /**
     * Normaliza entradas booleanas opcionales sin convertir silenciosamente valores inválidos a null.
     *
     * - Si está ausente, es null o cadena vacía '', retorna null (información no declarada).
     * - Si es un booleano estricto o representación controlada (true, false, 'true', 'false', 1, 0, '1', '0'), retorna el booleano.
     * - Si es un valor arbitrario o inválido (ej. 'abc', 'foo', 'si'), retorna el valor original intacto
     *   para que la regla 'nullable|boolean' lo rechace en el validador con un error de validación.
     */
    private function normalizarBooleanoOpcional(mixed $valor): mixed
    {
        if ($valor === null || $valor === '') {
            return null;
        }

        return match ($valor) {
            true, 'true', '1', 1 => true,
            false, 'false', '0', 0 => false,
            default => $valor,
        };
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Paso 1: Datos del establecimiento
            'nombre_comercio' => 'required|string|max:255',
            'funcion_economica' => 'required|string|max:255',
            'ruc' => ['nullable', 'string', 'regex:/^(10|20)\d{9}$/'],
            'distrito' => 'nullable|string|max:100',
            'direccion' => 'nullable|string|max:255',
            'referencia' => 'nullable|string|max:255',
            'area_m2' => 'nullable|numeric|min:0.1|max:100000',
            'pisos' => 'nullable|integer|min:1|max:100',
            'aforo' => 'nullable|integer|min:1|max:50000',
            'usa_glp' => 'nullable|boolean',
            'galones_glp' => 'nullable|numeric|min:0',
            'usa_caldero' => 'nullable|boolean',
            'usa_liquidos_inflamables' => 'nullable|boolean',
            'tiene_equipos_fritura' => 'nullable|boolean',
            'tiene_escaleras' => 'nullable|boolean',
            'tiene_estanterias_altas' => 'nullable|boolean',
            'evaluacion_origen_uuid' => 'nullable|string|exists:autoevaluaciones,uuid_trazabilidad',

            // Checklist de autoevaluación (opcional en creación; desacoplado del flujo dinámico normativo)
            'checklist' => 'nullable|array|max:50',
            'checklist.*.codigo' => ['required_with:checklist', 'string', 'distinct:strict', 'max:100'],
            'checklist.*.estado' => ['required_with:checklist', 'string', 'in:CUMPLE,NO_CUMPLE,POR_REVISAR,NA,CUMPLE_DECLARADO,PENDIENTE_ATENDER,NO_APLICA'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nombre_comercio.required' => 'El nombre del establecimiento es obligatorio.',
            'funcion_economica.required' => 'Selecciona la actividad principal del establecimiento.',
            'ruc.regex' => 'El RUC debe tener 11 dígitos y comenzar con 10 o 20.',
            'area_m2.min' => 'El área debe ser mayor a 0 metros cuadrados.',
            'pisos.min' => 'El número de pisos debe ser al menos 1.',
            'aforo.min' => 'El aforo debe ser al menos 1 persona.',
            'checklist.required' => 'Falta completar la autoevaluación antes de finalizar.',
            'checklist.min' => 'Falta completar la autoevaluación antes de finalizar.',
            'checklist.max' => 'La autoevaluación contiene demasiadas condiciones.',
            'checklist.*.codigo.required' => 'Una de las condiciones no tiene un identificador válido.',
            'checklist.*.codigo.distinct' => 'La autoevaluación contiene condiciones duplicadas.',
            'checklist.*.estado.required' => 'Una de las condiciones no tiene respuesta registrada.',
            'checklist.*.estado.in' => 'Una de las condiciones tiene una respuesta no válida.',
            'tiene_equipos_fritura.boolean' => 'El valor indicado para equipos de fritura no es válido.',
            'tiene_escaleras.boolean' => 'El valor indicado para escaleras no es válido.',
            'tiene_estanterias_altas.boolean' => 'El valor indicado para estanterías altas no es válido.',
        ];
    }
}
