<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ActividadComercial extends Model
{
    protected $table = 'actividades_comerciales';

    protected $fillable = [
        'nombre_actividad',
        'ciiu_codigo',
        'ciiu_descripcion',
        'funcion_itse',
        'estado_validacion',
        'activo',
        'observaciones',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function autoevaluaciones(): HasMany
    {
        return $this->hasMany(Autoevaluacion::class, 'actividad_comercial_id');
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    public function scopeValidadas(Builder $query): Builder
    {
        return $query->where('estado_validacion', 'VALIDADO');
    }
}
