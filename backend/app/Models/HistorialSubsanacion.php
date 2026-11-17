<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class HistorialSubsanacion extends Model
{
    protected $table = 'historial_subsanaciones';

    protected $fillable = [
        'subsanacion_id',
        'user_id',
        'estado_anterior',
        'estado_nuevo',
        'evidencia_url',
        'hash_sha256',
        'comentario',
        'ip_address',
    ];

    protected static function booted(): void
    {
        static::updating(function () {
            throw new LogicException('La bitácora de historial de subsanaciones es estrictamente append-only y no admite modificaciones.');
        });

        static::deleting(function () {
            throw new LogicException('La bitácora de historial de subsanaciones es estrictamente append-only y no admite eliminaciones.');
        });
    }

    public function subsanacion(): BelongsTo
    {
        return $this->belongsTo(Subsanacion::class, 'subsanacion_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
