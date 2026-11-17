<?php

namespace Database\Seeders;

use App\Models\OfertaProveedor;
use App\Models\ProveedorRecurso;
use Illuminate\Database\Seeder;

/**
 * Ofertas de EJEMPLO para los proveedores de demostración.
 *
 * Los precios son ilustrativos, para que el cotizador funcione en la demo. En
 * producción cada proveedor publica sus propios productos y precios desde su
 * panel (/proveedor). El seeder es idempotente.
 */
class OfertasDemoSeeder extends Seeder
{
    /** @var array<string, array<int, array{0: string, 1: string, 2: float, 3: string}>> */
    private const OFERTAS = [
        'Extintores Huancayo' => [
            ['CRIT-01', 'Extintor PQS 6 kg nuevo con tarjeta de inspección', 140.00, 'unidad'],
            ['CRIT-01', 'Recarga de extintor PQS 6 kg', 45.00, 'servicio'],
            ['CRIT-02A', 'Extintor Clase K de 6 litros para cocina', 420.00, 'unidad'],
            ['CRIT-08', 'Luz de emergencia LED de 2 faros', 85.00, 'unidad'],
        ],
        'Apu Seguridad Contra Incendios' => [
            ['CRIT-01', 'Extintor PQS 6 kg con instalación y soporte', 155.00, 'unidad'],
            ['CRIT-08', 'Luz de emergencia LED con batería de 90 minutos', 95.00, 'unidad'],
            ['CRIT-15', 'Detector de humo autónomo', 60.00, 'unidad'],
            ['CRIT-09', 'Botiquín de primeros auxilios equipado', 75.00, 'unidad'],
        ],
        'Señalética Andina' => [
            ['CRIT-02B', 'Kit de 10 señales fotoluminiscentes', 120.00, 'juego'],
            ['CRIT-03', 'Señalización de ruta de evacuación', 60.00, 'servicio'],
            ['CRIT-12', 'Cartel de aforo máximo', 25.00, 'unidad'],
        ],
        'Pozo a Tierra Mantaro' => [
            ['CRIT-05', 'Medición de pozo a tierra con certificado', 180.00, 'servicio'],
            ['CRIT-05', 'Mantenimiento de pozo a tierra y nueva medición', 250.00, 'servicio'],
        ],
        'Ingeniería Eléctrica Centro' => [
            ['CRIT-06', 'Tablero con mandil e interruptor diferencial', 380.00, 'unidad'],
            ['CRIT-07', 'Ordenamiento de cables en canaletas', 150.00, 'servicio'],
            ['CRIT-14A', 'Reubicación de objetos y señal frente al tablero', 40.00, 'servicio'],
        ],
        'Estructuras Mantaro' => [
            ['CRIT-13', 'Anclaje de estantería a la pared', 40.00, 'unidad'],
            ['CRIT-11', 'Pasamanos metálico para escalera', 90.00, 'metro'],
            ['CRIT-04', 'Barra antipánico para puerta de salida', 320.00, 'unidad'],
        ],
    ];

    public function run(): void
    {
        foreach (self::OFERTAS as $nombreProveedor => $ofertas) {
            $proveedor = ProveedorRecurso::where('nombre_comercial', $nombreProveedor)->first();
            if ($proveedor === null) {
                continue;
            }

            foreach ($ofertas as [$criterio, $nombre, $precio, $unidad]) {
                OfertaProveedor::updateOrCreate(
                    ['proveedor_recurso_id' => $proveedor->id, 'nombre' => $nombre],
                    ['criterio_codigo' => $criterio, 'precio_soles' => $precio, 'unidad' => $unidad, 'activo' => true],
                );
            }
        }
    }
}
