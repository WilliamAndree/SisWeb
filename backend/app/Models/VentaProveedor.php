<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Venta que el proveedor registra en su cuenta.
 *
 * @property int $id
 * @property int $proveedor_recurso_id
 * @property int|null $oferta_proveedor_id
 * @property string $descripcion
 * @property int $cantidad
 * @property string $monto_soles
 * @property Carbon $fecha
 * @property string|null $cliente
 */
class VentaProveedor extends Model
{
    protected $table = 'ventas_proveedor';

    protected $fillable = ['proveedor_recurso_id', 'oferta_proveedor_id', 'descripcion', 'cantidad', 'monto_soles', 'fecha', 'cliente'];

    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
            'monto_soles' => 'decimal:2',
            'fecha' => 'date',
        ];
    }

    public function oferta(): BelongsTo
    {
        return $this->belongsTo(OfertaProveedor::class, 'oferta_proveedor_id');
    }
}
