<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Interacción de un cliente con un proveedor o con uno de sus productos.
 *
 * @property int $id
 * @property int $proveedor_recurso_id
 * @property int|null $oferta_proveedor_id
 * @property string $tipo
 * @property Carbon $created_at
 */
class EventoProveedor extends Model
{
    /** Su producto apareció en "Lo que te falta" de un local. */
    public const APARICION = 'aparicion';

    /** Su ficha apareció en el directorio de aliados. */
    public const VISTA_FICHA = 'vista_ficha';

    /** Un cliente tocó "WhatsApp" para escribirle. */
    public const CLIC_WHATSAPP = 'clic_whatsapp';

    /** Un cliente abrió su ubicación en el mapa. */
    public const CLIC_MAPA = 'clic_mapa';

    /** Un cliente eligió su producto en su presupuesto. */
    public const ELECCION = 'eleccion';

    /** Eventos que el navegador del cliente puede informar. */
    public const DESDE_NAVEGADOR = [self::CLIC_WHATSAPP, self::CLIC_MAPA, self::ELECCION];

    public const UPDATED_AT = null;

    protected $table = 'eventos_proveedor';

    protected $fillable = ['proveedor_recurso_id', 'oferta_proveedor_id', 'tipo'];

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(ProveedorRecurso::class, 'proveedor_recurso_id');
    }

    public function oferta(): BelongsTo
    {
        return $this->belongsTo(OfertaProveedor::class, 'oferta_proveedor_id');
    }
}
