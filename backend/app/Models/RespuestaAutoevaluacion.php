<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RespuestaAutoevaluacion extends Model
{
    protected $table = 'respuestas_autoevaluacion';

    protected $fillable = [
        'autoevaluacion_id',
        'criterio_id',
        'estado_respuesta',
        'notas_ciudadano',
    ];

    public function autoevaluacion(): BelongsTo
    {
        return $this->belongsTo(Autoevaluacion::class, 'autoevaluacion_id');
    }

    public function criterioNormativo(): BelongsTo
    {
        return $this->belongsTo(CriterioNormativo::class, 'criterio_id');
    }

    public function scopeCumpleDeclarado(Builder $query): Builder
    {
        return $query->where('estado_respuesta', 'CUMPLE_DECLARADO');
    }

    public function scopePendienteAtender(Builder $query): Builder
    {
        return $query->where('estado_respuesta', 'PENDIENTE_ATENDER');
    }

    public function scopePorRevisar(Builder $query): Builder
    {
        return $query->where('estado_respuesta', 'POR_REVISAR');
    }

    public function scopeNoAplica(Builder $query): Builder
    {
        return $query->where('estado_respuesta', 'NO_APLICA');
    }
}
