<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AnalisisEvidencia extends Model
{
    protected $table = 'analisis_evidencias';

    public const ESTADO_PENDIENTE = 'PENDIENTE';

    public const ESTADO_EN_PROCESO = 'EN_PROCESO';

    public const ESTADO_COMPLETADO = 'COMPLETADO';

    public const ESTADO_REQUIERE_REVISION = 'REQUIERE_REVISION';

    public const ESTADO_FALLIDO = 'FALLIDO';

    public const ESTADOS_VALIDOS = [
        self::ESTADO_PENDIENTE,
        self::ESTADO_EN_PROCESO,
        self::ESTADO_COMPLETADO,
        self::ESTADO_REQUIERE_REVISION,
        self::ESTADO_FALLIDO,
    ];

    public const ESTADOS_TERMINALES = [
        self::ESTADO_COMPLETADO,
        self::ESTADO_REQUIERE_REVISION,
        self::ESTADO_FALLIDO,
    ];

    protected $fillable = [
        'uuid_analisis',
        'autoevaluacion_id',
        'subsanacion_id',
        'criterio_id',
        'user_id',
        'hash_evidencia_analizada',
        'estado_analisis',
        'modelo_solicitado',
        'version_modelo',
        'intentos',
        'mensaje_error',
        'iniciado_at',
        'completado_at',
    ];

    protected $casts = [
        'iniciado_at' => 'datetime',
        'completado_at' => 'datetime',
        'intentos' => 'integer',
    ];

    public function autoevaluacion(): BelongsTo
    {
        return $this->belongsTo(Autoevaluacion::class, 'autoevaluacion_id');
    }

    public function subsanacion(): BelongsTo
    {
        return $this->belongsTo(Subsanacion::class, 'subsanacion_id');
    }

    public function criterioNormativo(): BelongsTo
    {
        return $this->belongsTo(CriterioNormativo::class, 'criterio_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function resultado(): HasOne
    {
        return $this->hasOne(ResultadoAnalisisEvidencia::class, 'analisis_evidencia_id');
    }

    public function esTerminal(): bool
    {
        return in_array($this->estado_analisis, self::ESTADOS_TERMINALES, true);
    }
}
