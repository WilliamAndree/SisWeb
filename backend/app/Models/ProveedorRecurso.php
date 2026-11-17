<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProveedorRecurso extends Model
{
    protected $table = 'proveedores_recursos';

    protected $fillable = [
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
        'activo',
        'verificado',
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

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }
}
