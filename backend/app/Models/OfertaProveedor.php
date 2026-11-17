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
 * @property string|null $descripcion
 * @property string $precio_soles
 * @property string $unidad
 * @property bool $activo
 */
class OfertaProveedor extends Model
{
    public const UNIDADES = ['unidad', 'servicio', 'juego', 'metro'];

    protected $table = 'ofertas_proveedor';

    protected $fillable = [
        'proveedor_recurso_id',
        'criterio_codigo',
        'nombre',
        'descripcion',
        'precio_soles',
        'unidad',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'precio_soles' => 'decimal:2',
            'activo' => 'boolean',
        ];
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(ProveedorRecurso::class, 'proveedor_recurso_id');
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('activo', true)->whereHas('proveedor', fn (Builder $q) => $q->where('activo', true));
    }
}
