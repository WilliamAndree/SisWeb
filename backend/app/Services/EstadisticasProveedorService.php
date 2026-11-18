<?php

namespace App\Services;

use App\Models\EventoProveedor;
use App\Models\ProveedorRecurso;
use App\Models\VentaProveedor;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Registra y resume cómo le va a cada proveedor en CheckITSE: cuántas veces
 * aparecen sus productos, cuántos clientes le escriben y cuánto vende.
 */
class EstadisticasProveedorService
{
    /**
     * Registra un evento una sola vez por visitante, producto y día, para que
     * recargar la página no infle los números.
     */
    public function registrar(string $tipo, int $proveedorId, ?int $ofertaId = null): void
    {
        $this->registrarVarios($tipo, [[$proveedorId, $ofertaId]]);
    }

    /**
     * @param  list<array{0: int, 1: int|null}>  $pares  [proveedor_id, oferta_id]
     */
    public function registrarVarios(string $tipo, array $pares): void
    {
        $sesion = request()->hasSession() ? request()->session() : null;
        $hoy = now()->toDateString();
        $filas = [];

        foreach ($pares as [$proveedorId, $ofertaId]) {
            $clave = "eventos.{$hoy}.{$tipo}.{$proveedorId}.".($ofertaId ?? 0);
            if ($sesion?->has($clave)) {
                continue;
            }
            $sesion?->put($clave, true);
            $filas[] = ['proveedor_recurso_id' => $proveedorId, 'oferta_proveedor_id' => $ofertaId, 'tipo' => $tipo, 'created_at' => now()];
        }

        if ($filas === []) {
            return;
        }

        try {
            EventoProveedor::insert($filas);
        } catch (Throwable) {
            // Las estadísticas nunca deben impedir que el cliente vea la página.
        }
    }

    /**
     * Resumen para la cuenta del proveedor.
     *
     * @return array<string, mixed>
     */
    public function resumen(ProveedorRecurso $proveedor): array
    {
        $hace30 = now()->subDays(30);
        $inicioMes = now()->startOfMonth()->toDateString();

        $conteo = fn (array $tipos): int => EventoProveedor::where('proveedor_recurso_id', $proveedor->id)
            ->whereIn('tipo', $tipos)->where('created_at', '>=', $hace30)->count();

        $ventasMes = VentaProveedor::where('proveedor_recurso_id', $proveedor->id)->where('fecha', '>=', $inicioMes);

        return [
            'ultimos_30_dias' => [
                'apariciones' => $conteo([EventoProveedor::APARICION, EventoProveedor::VISTA_FICHA]),
                'contactos' => $conteo([EventoProveedor::CLIC_WHATSAPP]),
                'mapa' => $conteo([EventoProveedor::CLIC_MAPA]),
                'elecciones' => $conteo([EventoProveedor::ELECCION]),
            ],
            'ventas_mes' => [
                'monto' => (float) (clone $ventasMes)->sum('monto_soles'),
                'cantidad' => (int) (clone $ventasMes)->count(),
            ],
            'meses' => $this->serieMensual($proveedor),
            'top_productos' => $this->topProductos($proveedor),
        ];
    }

    /**
     * Últimos 6 meses: apariciones, contactos y ventas por mes.
     *
     * @return list<array{mes: string, apariciones: int, contactos: int, ventas: float}>
     */
    private function serieMensual(ProveedorRecurso $proveedor): array
    {
        $desde = now()->startOfMonth()->subMonths(5);

        $eventos = EventoProveedor::where('proveedor_recurso_id', $proveedor->id)
            ->where('created_at', '>=', $desde)
            ->get(['tipo', 'created_at'])
            ->groupBy(fn ($e): string => $e->created_at->format('Y-m'));

        $ventas = VentaProveedor::where('proveedor_recurso_id', $proveedor->id)
            ->where('fecha', '>=', $desde->toDateString())
            ->get(['monto_soles', 'fecha'])
            ->groupBy(fn ($v): string => $v->fecha->format('Y-m'));

        $serie = [];
        for ($i = 0; $i < 6; $i++) {
            $mes = $desde->copy()->addMonths($i)->format('Y-m');
            $delMes = $eventos->get($mes, collect());
            $serie[] = [
                'mes' => $mes,
                'apariciones' => $delMes->whereIn('tipo', [EventoProveedor::APARICION, EventoProveedor::VISTA_FICHA])->count(),
                'contactos' => $delMes->where('tipo', EventoProveedor::CLIC_WHATSAPP)->count(),
                'ventas' => (float) $ventas->get($mes, collect())->sum('monto_soles'),
            ];
        }

        return $serie;
    }

    /**
     * Productos que más interés generan en los últimos 30 días.
     *
     * @return list<array{oferta_id: int, nombre: string, apariciones: int, contactos: int, elecciones: int}>
     */
    private function topProductos(ProveedorRecurso $proveedor): array
    {
        $suma = fn (string $tipo, string $alias) => DB::raw("SUM(CASE WHEN eventos_proveedor.tipo = '{$tipo}' THEN 1 ELSE 0 END) as {$alias}");

        return EventoProveedor::query()
            ->join('ofertas_proveedor', 'ofertas_proveedor.id', '=', 'eventos_proveedor.oferta_proveedor_id')
            ->where('eventos_proveedor.proveedor_recurso_id', $proveedor->id)
            ->where('eventos_proveedor.created_at', '>=', now()->subDays(30))
            ->groupBy('ofertas_proveedor.id', 'ofertas_proveedor.nombre')
            ->select([
                'ofertas_proveedor.id as oferta_id',
                'ofertas_proveedor.nombre',
                $suma(EventoProveedor::APARICION, 'apariciones'),
                $suma(EventoProveedor::CLIC_WHATSAPP, 'contactos'),
                $suma(EventoProveedor::ELECCION, 'elecciones'),
            ])
            ->orderByDesc('contactos')
            ->orderByDesc('apariciones')
            ->limit(5)
            ->get()
            ->map(fn ($fila): array => [
                'oferta_id' => (int) $fila->oferta_id,
                'nombre' => (string) $fila->nombre,
                'apariciones' => (int) $fila->apariciones,
                'contactos' => (int) $fila->contactos,
                'elecciones' => (int) $fila->elecciones,
            ])
            ->all();
    }
}
