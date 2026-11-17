<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SimulacionRevision extends Model
{
    protected $table = 'simulaciones_revision';

    protected $fillable = [
        'autoevaluacion_id',
        'codigo_revision',
        'total_observaciones',
        'porcentaje_revision',
        'metrica_gap',
        'resultado',
        'detalle_revision',
    ];

    protected $casts = [
        'detalle_revision' => 'array',
        'total_observaciones' => 'integer',
        'porcentaje_revision' => 'float',
        'metrica_gap' => 'float',
    ];

    /**
     * Normaliza códigos heredados del formato "ACTA-ITSE-..." al formato
     * preventivo "PREV-ITSE-..." para que ningún registro parezca un acta oficial.
     */
    public function getCodigoRevisionAttribute(?string $value): string
    {
        return str_starts_with((string) $value, 'ACTA-ITSE-')
            ? 'PREV-ITSE-'.substr((string) $value, 10)
            : (string) $value;
    }

    public function autoevaluacion(): BelongsTo
    {
        return $this->belongsTo(Autoevaluacion::class, 'autoevaluacion_id');
    }

    public function subsanaciones(): HasMany
    {
        return $this->hasMany(Subsanacion::class, 'simulacion_revision_id');
    }
}
