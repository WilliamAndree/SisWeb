<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Producto o servicio que un proveedor ofrece para resolver un criterio ITSE.
 *
 * @property int $id
 * @property int $proveedor_recurso_id
 * @property string $criterio_codigo
 * @property string $nombre
 * @property string|null $marca
 * @property string|null $descripcion
 * @property string $precio_soles
 * @property string $unidad
 * @property int|null $stock
 * @property string $zona
 * @property bool $activo
 */
class OfertaProveedor extends Model
{
    public const UNIDADES = ['unidad', 'servicio', 'juego', 'metro'];

    /** Dónde atiende o entrega el proveedor ese producto. */
    public const ZONAS = ['Todo Huancayo', 'Huancayo', 'El Tambo', 'Chilca'];

    /**
     * "¿Para qué sirve?": agrupa los criterios ITSE en secciones que el
     * proveedor y el cliente entienden sin conocer los códigos.
     */
    public const USOS = [
        'incendios' => ['etiqueta' => 'Protección contra incendios', 'criterios' => ['CRIT-01', 'CRIT-02A', 'CRIT-14B', 'CRIT-15']],
        'senalizacion' => ['etiqueta' => 'Señalización y evacuación', 'criterios' => ['CRIT-02B', 'CRIT-03', 'CRIT-04', 'CRIT-12']],
        'electricidad' => ['etiqueta' => 'Electricidad', 'criterios' => ['CRIT-05', 'CRIT-06', 'CRIT-07', 'CRIT-14A']],
        'iluminacion' => ['etiqueta' => 'Luces de emergencia', 'criterios' => ['CRIT-08']],
        'primeros_auxilios' => ['etiqueta' => 'Primeros auxilios', 'criterios' => ['CRIT-09']],
        'gas_cocina' => ['etiqueta' => 'Gas y cocina', 'criterios' => ['CRIT-10', 'CRIT-16', 'CRIT-17']],
        'estructura' => ['etiqueta' => 'Estructura y mobiliario', 'criterios' => ['CRIT-11', 'CRIT-13']],
    ];

    protected $table = 'ofertas_proveedor';

    protected $fillable = [
        'proveedor_recurso_id',
        'criterio_codigo',
        'nombre',
        'marca',
        'descripcion',
        'precio_soles',
        'unidad',
        'stock',
        'zona',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'precio_soles' => 'decimal:2',
            'stock' => 'integer',
            'activo' => 'boolean',
        ];
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(ProveedorRecurso::class, 'proveedor_recurso_id');
    }

    /** Ofertas visibles para los clientes: activas y de un negocio aprobado. */
    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('activo', true)->whereHas('proveedor', fn (Builder $q) => $q->publicados());
    }

    public static function usoDeCriterio(string $criterioCodigo): string
    {
        foreach (self::USOS as $clave => $uso) {
            if (in_array($criterioCodigo, $uso['criterios'], true)) {
                return $clave;
            }
        }

        return 'otros';
    }

    /** @return list<array{valor: string, etiqueta: string}> */
    public static function opcionesUso(): array
    {
        return array_map(
            fn (string $clave): array => ['valor' => $clave, 'etiqueta' => self::USOS[$clave]['etiqueta']],
            array_keys(self::USOS),
        );
    }
}
