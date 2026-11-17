<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CriterioNormativo extends Model
{
    protected $table = 'criterios_normativos';

    protected $fillable = [
        'codigo_criterio',
        'categoria',
        'titulo',
        'norma_base',
        'articulo_referencia',
        'tipo_criterio',
        'riesgo_asociado',
        'orden',
        'estado_normativo',
        'pregunta_ciudadana',
        'que_observar',
        'accion_mejora_orientativa',
        'activo',
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
            'orden' => 'integer',
        ];
    }

    public function reglasAplicabilidad(): HasMany
    {
        return $this->hasMany(ReglaAplicabilidad::class, 'criterio_id');
    }

    public function respuestas(): HasMany
    {
        return $this->hasMany(RespuestaAutoevaluacion::class, 'criterio_id');
    }

    public function recursosEducativos(): HasMany
    {
        return $this->hasMany(RecursoEducativo::class, 'criterio_normativo_id');
    }

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    public function scopeSuspendidos(Builder $query): Builder
    {
        return $query->where('activo', false);
    }

    public function scopeVigentes(Builder $query): Builder
    {
        return $query->where('estado_normativo', 'VIGENTE');
    }

    /**
     * Criterios accesibles para el ciudadano en autoevaluación (excluye TIPO_D).
     */
    public function scopeCiudadanos(Builder $query): Builder
    {
        return $query->where('tipo_criterio', '!=', 'TIPO_D');
    }

    // --- Alias de compatibilidad semántica ---

    public function getCodigoAttribute(): string
    {
        return (string) $this->codigo_criterio;
    }

    public function getBaseNormativaAttribute(): string
    {
        return (string) $this->norma_base;
    }

    public function getTipoVerificacionAttribute(): string
    {
        return (string) $this->tipo_criterio;
    }

    public function getDescripcionAttribute(): string
    {
        return (string) $this->pregunta_ciudadana;
    }

    public function getExplicacionSimpleAttribute(): ?string
    {
        return $this->que_observar;
    }

    public function isActivo(): bool
    {
        return (bool) $this->activo;
    }

    public function isSuspendido(): bool
    {
        return ! $this->activo;
    }
}
