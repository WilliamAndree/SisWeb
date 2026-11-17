<?php

namespace App\Http\Controllers;

use App\Models\CategoriaSubsanacion;
use App\Models\CriterioNormativo;
use App\Models\OfertaProveedor;
use App\Models\ProveedorRecurso;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Panel del proveedor: su perfil público, ubicación en el mapa y productos con
 * precio. Lo que publica aquí es lo que ve el emprendedor en "Lo que te falta".
 */
class ProveedorPanelController extends Controller
{
    /** Especialidad del frontend => código de categoría en BD. */
    private const ESPECIALIDADES = [
        'incendios' => 'EXTINTOR',
        'electricas' => 'ELECTRICO',
        'arquitectura_senaletica' => 'SENALETICA',
        'estructuras' => 'ARQUITECTURA',
    ];

    private const DISTRITOS = ['Huancayo', 'El Tambo', 'Chilca'];

    public function panel(Request $request): Response
    {
        $usuario = $this->proveedorAutenticado($request);
        $perfil = $usuario->proveedor()->with('categoria', 'ofertas')->first();

        return Inertia::render('Proveedor/Panel', [
            'perfil' => $perfil ? [
                'nombre_comercial' => $perfil->nombre_comercial,
                'especialidad' => array_search($perfil->categoria?->codigo, self::ESPECIALIDADES, true) ?: '',
                'descripcion' => $perfil->descripcion,
                'telefono' => $perfil->telefono,
                'whatsapp' => $perfil->whatsapp,
                'distrito' => $perfil->distrito,
                'direccion' => $perfil->direccion,
                'latitud' => $perfil->latitud !== null ? (float) $perfil->latitud : null,
                'longitud' => $perfil->longitud !== null ? (float) $perfil->longitud : null,
                'plan' => $perfil->plan,
                'verificado' => (bool) $perfil->verificado,
            ] : null,
            'ofertas' => $perfil ? $perfil->ofertas->sortBy('criterio_codigo')->values()->map(fn (OfertaProveedor $o): array => [
                'id' => $o->id,
                'criterio_codigo' => $o->criterio_codigo,
                'nombre' => $o->nombre,
                'descripcion' => $o->descripcion,
                'precio_soles' => (float) $o->precio_soles,
                'unidad' => $o->unidad,
                'activo' => $o->activo,
            ]) : [],
            'criterios' => CriterioNormativo::orderBy('codigo_criterio')->get(['codigo_criterio', 'titulo'])
                ->map(fn (CriterioNormativo $c): array => ['codigo' => $c->codigo_criterio, 'titulo' => $c->titulo]),
            'distritos' => self::DISTRITOS,
            'unidades' => OfertaProveedor::UNIDADES,
            'planes' => config('aliados.planes', []),
        ]);
    }

    public function guardarPerfil(Request $request): RedirectResponse
    {
        $usuario = $this->proveedorAutenticado($request);
        $datos = $request->validate([
            'nombre_comercial' => ['required', 'string', 'min:3', 'max:120'],
            'especialidad' => ['required', Rule::in(array_keys(self::ESPECIALIDADES))],
            'descripcion' => ['nullable', 'string', 'max:600'],
            'telefono' => ['required', 'string', 'regex:/^[0-9+\s\-()]{7,25}$/'],
            'whatsapp' => ['nullable', 'string', 'regex:/^[0-9+\s\-()]{7,25}$/'],
            'distrito' => ['required', Rule::in(self::DISTRITOS)],
            'direccion' => ['nullable', 'string', 'max:255'],
            'latitud' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitud'],
            'longitud' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitud'],
        ], [
            'nombre_comercial.required' => 'Escribe el nombre de tu negocio.',
            'especialidad.required' => 'Elige qué vendes o instalas.',
            'telefono.required' => 'Escribe un teléfono de contacto.',
            'telefono.regex' => 'Escribe un teléfono válido, por ejemplo 964 123 456.',
            'whatsapp.regex' => 'Escribe un número de WhatsApp válido.',
            'distrito.required' => 'Elige tu distrito.',
        ]);

        $categoria = CategoriaSubsanacion::where('codigo', self::ESPECIALIDADES[$datos['especialidad']])->firstOrFail();

        ProveedorRecurso::updateOrCreate(
            ['user_id' => $usuario->id],
            [
                'categoria_id' => $categoria->id,
                'rubro' => $datos['especialidad'],
                'razon_social' => $datos['nombre_comercial'],
                'nombre_comercial' => $datos['nombre_comercial'],
                'descripcion' => $datos['descripcion'] ?? null,
                'telefono' => $datos['telefono'],
                'whatsapp' => ($datos['whatsapp'] ?? null) ?: $datos['telefono'],
                'distrito' => $datos['distrito'],
                'direccion' => $datos['direccion'] ?? null,
                'latitud' => $datos['latitud'] ?? null,
                'longitud' => $datos['longitud'] ?? null,
                'activo' => true,
            ],
        );

        return back()->with('success', 'Tu perfil está publicado.');
    }

    public function guardarOferta(Request $request): RedirectResponse
    {
        $perfil = $this->perfilObligatorio($request);
        $perfil->ofertas()->create($this->validarOferta($request));

        return back()->with('success', 'Producto publicado.');
    }

    public function actualizarOferta(Request $request, OfertaProveedor $oferta): RedirectResponse
    {
        $perfil = $this->perfilObligatorio($request);
        abort_if($oferta->proveedor_recurso_id !== $perfil->id, 404);
        $oferta->update($this->validarOferta($request) + ['activo' => $request->boolean('activo', true)]);

        return back()->with('success', 'Producto actualizado.');
    }

    public function eliminarOferta(Request $request, OfertaProveedor $oferta): RedirectResponse
    {
        $perfil = $this->perfilObligatorio($request);
        abort_if($oferta->proveedor_recurso_id !== $perfil->id, 404);
        $oferta->delete();

        return back()->with('success', 'Producto eliminado.');
    }

    /**
     * @return array{criterio_codigo: string, nombre: string, descripcion: string|null, precio_soles: float, unidad: string}
     */
    private function validarOferta(Request $request): array
    {
        return $request->validate([
            'criterio_codigo' => ['required', 'string', Rule::exists('criterios_normativos', 'codigo_criterio')],
            'nombre' => ['required', 'string', 'min:3', 'max:120'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'precio_soles' => ['required', 'numeric', 'min:1', 'max:100000'],
            'unidad' => ['required', Rule::in(OfertaProveedor::UNIDADES)],
        ], [
            'criterio_codigo.required' => 'Elige qué necesidad resuelve tu producto.',
            'nombre.required' => 'Escribe el nombre del producto o servicio.',
            'precio_soles.required' => 'Escribe el precio.',
            'precio_soles.min' => 'El precio debe ser al menos S/ 1.',
        ]);
    }

    private function proveedorAutenticado(Request $request): User
    {
        /** @var User $usuario */
        $usuario = $request->user();
        abort_unless($usuario->esProveedor(), 403, 'Esta sección es solo para cuentas de proveedor.');

        return $usuario;
    }

    private function perfilObligatorio(Request $request): ProveedorRecurso
    {
        $perfil = $this->proveedorAutenticado($request)->proveedor;
        abort_if($perfil === null, 422, 'Primero completa el perfil de tu negocio.');

        return $perfil;
    }
}
