<?php

namespace App\Http\Requests;

use App\Services\ApplicabilityEngineService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreChecklistDeclaracionesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepara los datos antes de la validación.
     * Permite recibir tanto un array 'respuestas' como un objeto individual {codigo, estado, notas}.
     */
    protected function prepareForValidation(): void
    {
        if (! $this->has('respuestas') && $this->has('codigo') && $this->has('estado')) {
            $this->merge([
                'respuestas' => [
                    [
                        'codigo' => $this->input('codigo'),
                        'estado' => $this->input('estado'),
                        'notas' => $this->input('notas'),
                    ],
                ],
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'respuestas' => ['required', 'array', 'min:1'],
            'respuestas.*.codigo' => ['required', 'string', 'exists:criterios_normativos,codigo_criterio'],
            'respuestas.*.estado' => [
                'required',
                'string',
                Rule::in(ApplicabilityEngineService::RESPUESTAS_CIUDADANAS_PERMITIDAS),
            ],
            'respuestas.*.notas' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'respuestas.required' => 'Debe proporcionar al menos una respuesta para el checklist.',
            'respuestas.*.codigo.required' => 'El código de criterio es obligatorio.',
            'respuestas.*.codigo.exists' => 'El criterio especificado no existe en el catálogo normativo.',
            'respuestas.*.estado.required' => 'El estado de la declaración es obligatorio.',
            'respuestas.*.estado.in' => 'El estado de respuesta ciudadana debe ser CUMPLE_DECLARADO, PENDIENTE_ATENDER o POR_REVISAR. El estado NO_APLICA no es seleccionable por el ciudadano.',
            'respuestas.*.notas.max' => 'Las notas de la declaración no pueden exceder los 1000 caracteres.',
        ];
    }
}
