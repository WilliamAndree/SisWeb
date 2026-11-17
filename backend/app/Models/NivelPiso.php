<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NivelPiso extends Model
{
    protected $table = 'niveles_pisos';

    protected $fillable = [
        'version_plano_id',
        'numero_piso',
        'nombre',
        'altura_metros',
        'orden',
    ];

    protected function casts(): array
    {
        return [
            'numero_piso' => 'integer',
            'altura_metros' => 'float',
            'orden' => 'integer',
        ];
    }

    public function versionPlano(): BelongsTo
    {
        return $this->belongsTo(VersionPlano::class, 'version_plano_id');
    }

    public function ambientes(): HasMany
    {
        return $this->hasMany(AmbienteZona::class, 'nivel_piso_id');
    }

    public function conectores(): HasMany
    {
        return $this->hasMany(ConectorCirculacion::class, 'nivel_piso_id');
    }
}
