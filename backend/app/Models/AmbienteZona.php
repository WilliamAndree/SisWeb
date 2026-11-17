<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AmbienteZona extends Model
{
    protected $table = 'ambientes_zonas';

    protected $fillable = [
        'nivel_piso_id',
        'codigo',
        'nombre',
        'uso',
        'ancho_metros',
        'largo_metros',
        'area_m2',
        'posicion_x',
        'posicion_y',
        'vertices_poligono',
        'origen_dimensiones',
        'notas',
    ];

    protected function casts(): array
    {
        return [
            'ancho_metros' => 'float',
            'largo_metros' => 'float',
            'area_m2' => 'float',
            'posicion_x' => 'float',
            'posicion_y' => 'float',
            'vertices_poligono' => 'array',
        ];
    }

    public function nivelPiso(): BelongsTo
    {
        return $this->belongsTo(NivelPiso::class, 'nivel_piso_id');
    }

    public function elementos(): HasMany
    {
        return $this->hasMany(ElementoEspacial::class, 'ambiente_id');
    }

    public function conectoresOrigen(): HasMany
    {
        return $this->hasMany(ConectorCirculacion::class, 'ambiente_origen_id');
    }

    public function conectoresDestino(): HasMany
    {
        return $this->hasMany(ConectorCirculacion::class, 'ambiente_destino_id');
    }
}
