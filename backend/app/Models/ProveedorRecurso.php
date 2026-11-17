<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProveedorRecurso extends Model
{
    protected $table = 'proveedores_recursos';

    /** Orden de aparición por plan: los planes pagados aparecen primero. */
    public const ORDEN_PLAN = ['premium' => 0, 'destacado' => 1, 'basico' => 2];

    protected $fillable = [
        'user_id',
        'categoria_id',
        'rubro',
        'razon_social',
        'nombre_comercial',
        'tipo_servicio',
        'telefono',
        'whatsapp',
        'direccion',
        'distrito',
        'latitud',
        'longitud',
        'servicios_ofrecidos',
        'descripcion',
        'activo',
        'verificado',
        'plan',
    ];

    protected $casts = [
        'latitud' => 'float',
        'longitud' => 'float',
        'activo' => 'boolean',
        'verificado' => 'boolean',
    ];

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(CategoriaSubsanacion::class, 'categoria_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ofertas(): HasMany
    {
        return $this->hasMany(OfertaProveedor::class, 'proveedor_recurso_id');
    }

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }
}
