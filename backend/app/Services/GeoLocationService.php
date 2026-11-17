<?php

namespace App\Services;

use App\Models\CategoriaSubsanacion;
use App\Models\ProveedorRecurso;

class GeoLocationService
{
    public const TIERRA_RADIO_KM = 6371.0;

    public const FALLBACK_LAT = -12.0680;

    public const FALLBACK_LON = -75.2100;

    /**
     * Retorna la latitud base configurada para Huancayo Centro con fallback garantizado.
     */
    public static function latitudBase(): float
    {
        return (float) (function_exists('config') ? config('itse.coordenadas_base.latitud', self::FALLBACK_LAT) : self::FALLBACK_LAT);
    }

    /**
     * Retorna la longitud base configurada para Huancayo Centro con fallback garantizado.
     */
    public static function longitudBase(): float
    {
        return (float) (function_exists('config') ? config('itse.coordenadas_base.longitud', self::FALLBACK_LON) : self::FALLBACK_LON);
    }

    /**
     * Retorna el arreglo de coordenadas base de referencia.
     *
     * @return array{latitud: float, longitud: float}
     */
    public static function coordenadasBase(): array
    {
        $latitudBase = (float) (function_exists('config') ? config('itse.coordenadas_base.latitud', -12.0680) : -12.0680);
        $longitudBase = (float) (function_exists('config') ? config('itse.coordenadas_base.longitud', -75.2100) : -75.2100);

        return [
            'latitud' => $latitudBase,
            'longitud' => $longitudBase,
        ];
    }

    public function calcularDistanciaKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        if ($lat1 === $lat2 && $lon1 === $lon2) {
            return 0.0;
        }

        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos($lat1Rad) * cos($lat2Rad) * sin($dLon / 2) * sin($dLon / 2);

        return self::TIERRA_RADIO_KM * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Busca proveedores de subsanación cercanos a la condición no cumplida.
     *
     * Si no hay resultados dentro del radio solicitado, retorna los proveedores
     * de la categoría ordenados por distancia ascendente (radio extendido).
     *
     * @return array{codigo: string, categoria: string, nombre_categoria: string, radio_km: float, radio_extendido: bool, proveedores: array<int, array<string, mixed>>}
     */
    public function buscarProveedoresPorDeficiencia(string $codigoNormativo, float $latUser, float $lonUser, float $radioKm = 5.0): array
    {
        $categoriaCodigo = $this->categoriaParaDeficiencia($codigoNormativo);

        $categoria = CategoriaSubsanacion::with('proveedoresRecursos')
            ->where('codigo', $categoriaCodigo)
            ->first();

        if (! $categoria) {
            return [
                'codigo' => $codigoNormativo,
                'categoria' => $categoriaCodigo,
                'nombre_categoria' => $categoriaCodigo,
                'radio_km' => $radioKm,
                'radio_extendido' => false,
                'proveedores' => [],
            ];
        }

        $conDistancia = $categoria->proveedoresRecursos
            ->filter(fn (ProveedorRecurso $proveedor): bool => (bool) $proveedor->activo)
            ->map(fn (ProveedorRecurso $proveedor): array => $this->proveedorConDistancia($proveedor, $latUser, $lonUser));

        $dentroDelRadio = $conDistancia
            ->filter(fn (array $proveedor): bool => $proveedor['distancia_km'] <= $radioKm)
            ->sortBy('distancia_km')
            ->values();

        $radioExtendido = $dentroDelRadio->isEmpty();

        $proveedores = $radioExtendido
            ? $conDistancia->sortBy('distancia_km')->values()
            : $dentroDelRadio;

        return [
            'codigo' => $codigoNormativo,
            'categoria' => $categoriaCodigo,
            'nombre_categoria' => $categoria->nombre,
            'radio_km' => $radioKm,
            'radio_extendido' => $radioExtendido,
            'proveedores' => $proveedores->all(),
        ];
    }

    private function categoriaParaDeficiencia(string $codigoNormativo): string
    {
        $codigo = strtoupper(trim($codigoNormativo));

        return match ($codigo) {
            'CRIT-01', 'CRIT-02', 'CRIT-02A',
            'EXTINTOR', 'EXTINTOR_PQS', 'EXTINTOR_K', 'EXTINTORES', 'INCENDIOS' => 'EXTINTOR',

            'CRIT-03', 'CRIT-04', 'CRIT-05', 'CRIT-06', 'CRIT-07', 'CRIT-08',
            'TERMOMAGNETICO', 'LUCES_EMERG', 'DIFERENCIAL', 'TABLERO_MANDIL', 'CABLEADO_CANALIZADO',
            'ELECTRICO', 'ELECTRICIDAD' => 'ELECTRICO',

            'EVACUACION', 'SENALETICA', 'PUERTAS_ESCAPE' => 'SENALETICA',

            'CRIT-09', 'CRIT-11', 'CRIT-12',
            'CRIT-10', 'GLP', 'GAS',
            'CRIT-13', 'ESTRUCTURAS',
            'ANCLAJE_ESTANTERIAS', 'LAMINADO_VIDRIOS', 'CAMPANA_EXTRACCION', 'AFORO_CARTEL', 'BOTIQUIN',
            'POZO_TIERRA', 'ARQUITECTURA' => 'ARQUITECTURA',

            default => 'ARQUITECTURA',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function proveedorConDistancia(ProveedorRecurso $proveedor, float $latUser, float $lonUser): array
    {
        return [
            'id' => $proveedor->id,
            'razon_social' => $proveedor->razon_social,
            'nombre_comercial' => $proveedor->nombre_comercial,
            'telefono' => $proveedor->telefono,
            'whatsapp' => $proveedor->whatsapp,
            'direccion' => $proveedor->direccion,
            'distrito' => $proveedor->distrito,
            'latitud' => $proveedor->latitud,
            'longitud' => $proveedor->longitud,
            'servicios_ofrecidos' => $proveedor->servicios_ofrecidos,
            'distancia_km' => round($this->calcularDistanciaKm($latUser, $lonUser, (float) $proveedor->latitud, (float) $proveedor->longitud), 2),
        ];
    }
}
