<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PlanoEstablecimiento extends Model
{
    public const ESTADO_BORRADOR = 'BORRADOR';

    public const ESTADO_CONSOLIDADO = 'CONSOLIDADO';

    protected $table = 'planos_establecimientos';

    protected $fillable = [
        'uuid_plano',
        'autoevaluacion_id',
        'estado',
        'version_activa_id',
    ];

    protected static function booted(): void
    {
        static::creating(function (PlanoEstablecimiento $model) {
            if (empty($model->uuid_plano)) {
                $model->uuid_plano = (string) Str::uuid();
            }
        });
    }

    public function autoevaluacion(): BelongsTo
    {
        return $this->belongsTo(Autoevaluacion::class, 'autoevaluacion_id');
    }

    public function versiones(): HasMany
    {
        return $this->hasMany(VersionPlano::class, 'plano_establecimiento_id')->orderBy('numero_version', 'asc');
    }

    public function versionActiva(): BelongsTo
    {
        return $this->belongsTo(VersionPlano::class, 'version_activa_id');
    }

    public function sugerenciasEspaciales(): HasMany
    {
        return $this->hasMany(SugerenciaEspacial::class, 'plano_establecimiento_id');
    }

    public function analisisEspaciales(): HasMany
    {
        return $this->hasMany(AnalisisEspacial::class, 'plano_establecimiento_id')->orderBy('id', 'desc');
    }
}
