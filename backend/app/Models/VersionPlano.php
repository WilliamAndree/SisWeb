<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use LogicException;

class VersionPlano extends Model
{
    protected $table = 'versiones_planos';

    protected $fillable = [
        'plano_establecimiento_id',
        'numero_version',
        'hash_geometria_sha256',
        'esquema_version',
        'descripcion_cambio',
        'geometria_normalizada',
        'metadata',
        'cerrada_at',
        'user_id',
        'session_token',
    ];

    protected function casts(): array
    {
        return [
            'numero_version' => 'integer',
            'geometria_normalizada' => 'array',
            'metadata' => 'array',
            'cerrada_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (VersionPlano $model) {
            // Si la versión ya estaba cerrada, prohibir modificaciones en su geometría o hash
            if ($model->getOriginal('cerrada_at') !== null) {
                $camposInmutables = [
                    'cerrada_at',
                    'hash_geometria_sha256',
                    'geometria_normalizada',
                    'numero_version',
                    'plano_establecimiento_id',
                ];

                foreach ($camposInmutables as $campo) {
                    if ($model->isDirty($campo)) {
                        throw new LogicException("No se permite modificar la versión cerrada [{$model->numero_version}] del plano. Debe crearse una nueva versión.");
                    }
                }
            }
        });
    }

    public function plano(): BelongsTo
    {
        return $this->belongsTo(PlanoEstablecimiento::class, 'plano_establecimiento_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function niveles(): HasMany
    {
        return $this->hasMany(NivelPiso::class, 'version_plano_id')->orderBy('orden', 'asc');
    }

    public function analisisEspaciales(): HasMany
    {
        return $this->hasMany(AnalisisEspacial::class, 'version_plano_id')->orderBy('id', 'desc');
    }

    public function estaCerrada(): bool
    {
        return $this->cerrada_at !== null;
    }
}
