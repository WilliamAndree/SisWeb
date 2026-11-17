<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subsanacion extends Model
{
    protected $table = 'subsanaciones';

    protected $fillable = [
        'autoevaluacion_id',
        'criterio_id',
        'simulacion_revision_id',
        'codigo_item',
        'descripcion',
        'evidencia_url',
        'hash_sha256',
        'estado',
        'observacion',
        'fecha_subsanacion',
        'notas_ciudadano',
    ];

    protected $casts = [
        'fecha_subsanacion' => 'datetime',
    ];

    public function autoevaluacion(): BelongsTo
    {
        return $this->belongsTo(Autoevaluacion::class, 'autoevaluacion_id');
    }

    public function criterioNormativo(): BelongsTo
    {
        return $this->belongsTo(CriterioNormativo::class, 'criterio_id');
    }

    public function revision(): BelongsTo
    {
        return $this->belongsTo(SimulacionRevision::class, 'simulacion_revision_id');
    }

    public function historial(): HasMany
    {
        return $this->hasMany(HistorialSubsanacion::class, 'subsanacion_id');
    }

    public function analisisEvidencias(): HasMany
    {
        return $this->hasMany(AnalisisEvidencia::class, 'subsanacion_id');
    }
}
