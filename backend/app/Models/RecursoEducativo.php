<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecursoEducativo extends Model
{
    protected $table = 'recursos_educativos';

    public const TIPO_VIDEO = 'VIDEO';

    public const TIPO_GUIA_DIGITAL = 'GUIA_DIGITAL';

    public const TIPO_ENLACE_EXTERNO = 'ENLACE_EXTERNO';

    public const TIPOS_PERMITIDOS = [
        self::TIPO_VIDEO,
        self::TIPO_GUIA_DIGITAL,
        self::TIPO_ENLACE_EXTERNO,
    ];

    protected $fillable = [
        'criterio_normativo_id',
        'titulo',
        'descripcion_corta',
        'tipo',
        'url',
        'fuente_autor',
        'duracion_estimada',
        'activo',
        'fecha_revision',
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
            'fecha_revision' => 'date',
        ];
    }

    public function criterioNormativo(): BelongsTo
    {
        return $this->belongsTo(CriterioNormativo::class, 'criterio_normativo_id');
    }

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    /**
     * Búsqueda por código de criterio normativo a través de la relación.
     */
    public static function obtenerPorCodigo(string $codigo): ?self
    {
        return static::query()
            ->activos()
            ->whereHas('criterioNormativo', fn (Builder $q) => $q->where('codigo_criterio', $codigo))
            ->first();
    }

    /**
     * Accesor de retrocompatibilidad con consumidores legacy.
     */
    public function getDescripcionDidacticaAttribute(): ?string
    {
        return $this->descripcion_corta;
    }
}
