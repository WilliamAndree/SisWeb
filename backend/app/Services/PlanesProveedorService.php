<?php

namespace App\Services;

use App\Models\ProveedorRecurso;

/**
 * Reglas de los planes de proveedor: precios, descuentos por pagar por
 * adelantado y cuántos productos puede publicar cada plan.
 */
class PlanesProveedorService
{
    /** @return list<array<string, mixed>> */
    public function planes(): array
    {
        return array_values(config('aliados.planes', []));
    }

    /** @return array<string, mixed>|null */
    public function plan(string $id): ?array
    {
        foreach ($this->planes() as $plan) {
            if ($plan['id'] === $id) {
                return $plan;
            }
        }

        return null;
    }

    /** @return list<array{meses: int, descuento: int, etiqueta: string}> */
    public function duraciones(): array
    {
        return array_values(config('aliados.duraciones', [['meses' => 1, 'descuento' => 0, 'etiqueta' => '1 mes']]));
    }

    /** @return list<string> */
    public function planesPagados(): array
    {
        return array_values(array_map(
            fn (array $plan): string => $plan['id'],
            array_filter($this->planes(), fn (array $plan): bool => (float) $plan['precio'] > 0),
        ));
    }

    /** @return list<int> */
    public function mesesPermitidos(): array
    {
        return array_map(fn (array $d): int => (int) $d['meses'], $this->duraciones());
    }

    /**
     * Monto a pagar en soles enteros: precio mensual × meses, menos el descuento.
     */
    public function monto(string $planId, int $meses): float
    {
        $plan = $this->plan($planId);
        $duracion = collect($this->duraciones())->firstWhere('meses', $meses);

        if ($plan === null || $duracion === null) {
            return 0.0;
        }

        $bruto = (float) $plan['precio'] * $meses;

        return round($bruto * (100 - (int) $duracion['descuento']) / 100);
    }

    /**
     * Tabla de precios lista para la página: por cada plan pagado y duración,
     * el monto, el precio mensual equivalente y cuánto ahorra.
     *
     * @return array<string, list<array{meses: int, etiqueta: string, descuento: int, monto: float, por_mes: float, ahorro: float}>>
     */
    public function tablaPrecios(): array
    {
        $tabla = [];
        foreach ($this->planesPagados() as $planId) {
            $precio = (float) $this->plan($planId)['precio'];
            foreach ($this->duraciones() as $d) {
                $monto = $this->monto($planId, (int) $d['meses']);
                $tabla[$planId][] = [
                    'meses' => (int) $d['meses'],
                    'etiqueta' => (string) $d['etiqueta'],
                    'descuento' => (int) $d['descuento'],
                    'monto' => $monto,
                    'por_mes' => round($monto / (int) $d['meses'], 2),
                    'ahorro' => round($precio * (int) $d['meses'] - $monto, 2),
                ];
            }
        }

        return $tabla;
    }

    public function limiteProductos(ProveedorRecurso $proveedor): ?int
    {
        $plan = $this->plan($proveedor->planVigente()) ?? $this->plan(ProveedorRecurso::PLAN_GRATUITO);
        $limite = $plan['limite_productos'] ?? null;

        return $limite === null ? null : (int) $limite;
    }
}
