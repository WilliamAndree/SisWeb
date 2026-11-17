<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReglaAplicabilidad extends Model
{
    protected $table = 'reglas_aplicabilidad';

    protected $fillable = [
        'criterio_id',
        'condicion_activacion',
        'operador_logico',
        'condiciones_compuestas',
        'estado_regla',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'condiciones_compuestas' => 'array',
        ];
    }

    public function criterioNormativo(): BelongsTo
    {
        return $this->belongsTo(CriterioNormativo::class, 'criterio_id');
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('estado_regla', 'ACTIVA');
    }

    // --- Alias y accesores de conveniencia ---

    public function getCampoAttribute(): ?string
    {
        return $this->condiciones_compuestas['campo'] ?? null;
    }

    public function getOperadorAttribute(): ?string
    {
        return $this->condiciones_compuestas['operador'] ?? null;
    }

    public function getValorAttribute(): mixed
    {
        return $this->condiciones_compuestas['valor'] ?? null;
    }

    public function getCondicionLogicaAttribute(): string
    {
        return (string) ($this->operador_logico ?? 'AND');
    }

    public function getActivoAttribute(): bool
    {
        return $this->estado_regla === 'ACTIVA';
    }
}
