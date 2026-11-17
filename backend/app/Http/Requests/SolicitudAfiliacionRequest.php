<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SolicitudAfiliacionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nombre_comercial' => ['required', 'string', 'min:3', 'max:255'],
            'contacto_nombre' => ['required', 'string', 'min:3', 'max:255'],
            'numero_documento' => ['required', 'string', 'regex:/^(\d{8}|\d{11})$/'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'telefono' => ['required', 'string', 'regex:/^[0-9+\s\-()]{7,25}$/'],
            'rubro' => ['required', 'string', 'max:50'],
            'distrito' => ['required', 'string', 'max:100'],
            'notas' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Get custom error messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nombre_comercial.required' => 'El nombre comercial de la empresa o especialista es obligatorio.',
            'contacto_nombre.required' => 'El nombre del contacto o profesional es obligatorio.',
            'numero_documento.required' => 'El RUC o DNI es obligatorio.',
            'numero_documento.regex' => 'El número de documento debe ser un DNI (8 dígitos) o RUC (11 dígitos).',
            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email' => 'Ingrese una dirección de correo electrónico válida.',
            'telefono.required' => 'El teléfono de contacto es obligatorio.',
            'telefono.regex' => 'Ingrese un número de teléfono o celular válido.',
            'rubro.required' => 'Debe seleccionar una especialidad o rubro técnico.',
            'distrito.required' => 'El distrito de atención es obligatorio.',
        ];
    }
}
