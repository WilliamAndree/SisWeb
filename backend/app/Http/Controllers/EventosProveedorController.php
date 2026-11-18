<?php

namespace App\Http\Controllers;

use App\Models\EventoProveedor;
use App\Models\OfertaProveedor;
use App\Models\ProveedorRecurso;
use App\Services\EstadisticasProveedorService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

/**
 * Recibe del navegador del cliente los contactos con un proveedor (WhatsApp,
 * mapa) y las elecciones de producto, para mostrarle al proveedor cuánto
 * interés genera. Solo cuenta para negocios publicados.
 */
class EventosProveedorController extends Controller
{
    public function __invoke(Request $request, EstadisticasProveedorService $estadisticas): Response
    {
        $datos = $request->validate([
            'tipo' => ['required', Rule::in(EventoProveedor::DESDE_NAVEGADOR)],
            'oferta_id' => ['nullable', 'integer'],
            'proveedor' => ['nullable', 'string', 'max:20'],
        ]);

        $oferta = isset($datos['oferta_id']) ? OfertaProveedor::find($datos['oferta_id']) : null;
        $proveedorId = $oferta?->proveedor_recurso_id ?? $this->idDesdeCodigo($datos['proveedor'] ?? null);

        if ($proveedorId !== null && ProveedorRecurso::publicados()->whereKey($proveedorId)->exists()) {
            $estadisticas->registrar($datos['tipo'], $proveedorId, $oferta?->id);
        }

        return response()->noContent();
    }

    /** Las fichas del directorio identifican al proveedor como "PRV-008". */
    private function idDesdeCodigo(?string $codigo): ?int
    {
        return $codigo !== null && preg_match('/^PRV-(\d+)$/', $codigo, $m) ? (int) $m[1] : null;
    }
}
