<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SugerenciaEspacial extends Model
{
    public const ESTADO_PENDIENTE = 'PENDIENTE';

    public const ESTADO_CONFIRMADA = 'CONFIRMADA';

    public const ESTADO_RECHAZADA = 'RECHAZADA';

    public const ESTADO_NO_APLICABLE = 'NO_APLICABLE';

    public const ESTADO_INVALIDADA = 'INVALIDADA';

    public const ESTADOS_VALIDOS = [
        self::ESTADO_PENDIENTE,
        self::ESTADO_CONFIRMADA,
        self::ESTADO_RECHAZADA,
        self::ESTADO_NO_APLICABLE,
        self::ESTADO_INVALIDADA,
    ];

    public const CONFIANZA_ALTO = 'ALTO';

    public const CONFIANZA_MEDIO = 'MEDIO';

    public const CONFIANZA_BAJO = 'BAJO';

    protected $table = 'sugerencias_espaciales';

    protected $fillable = [
        'uuid_sugerencia',
        'autoevaluacion_id',
        'plano_establecimiento_id',
        'analisis_evidencia_id',
        'resultado_analisis_evidencia_id',
        'subsanacion_id',
        'hash_evidencia_analizada',
        'version_plano_id',
        'indice_elemento_analisis',
        'tipo_elemento',
        'nombre_detectado',
        'descripcion_observacion',
        'nivel_confianza',
        'estado',
        'motivo_rechazo',
        'elemento_espacial_id',
        'user_id',
        'session_token',
        'generada_at',
        'resuelta_at',
    ];

    protected function casts(): array
    {
        return [
            'indice_elemento_analisis' => 'integer',
            'generada_at' => 'datetime',
            'resuelta_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (SugerenciaEspacial $model) {
            if (empty($model->uuid_sugerencia)) {
                $model->uuid_sugerencia = (string) Str::uuid();
            }
            if (empty($model->generada_at)) {
                $model->generada_at = now();
            }
        });
    }

    public function autoevaluacion(): BelongsTo
    {
        return $this->belongsTo(Autoevaluacion::class, 'autoevaluacion_id');
    }

    public function plano(): BelongsTo
    {
        return $this->belongsTo(PlanoEstablecimiento::class, 'plano_establecimiento_id');
    }

    public function analisisEvidencia(): BelongsTo
    {
        return $this->belongsTo(AnalisisEvidencia::class, 'analisis_evidencia_id');
    }

    public function resultadoAnalisis(): BelongsTo
    {
        return $this->belongsTo(ResultadoAnalisisEvidencia::class, 'resultado_analisis_evidencia_id');
    }

    public function subsanacion(): BelongsTo
    {
        return $this->belongsTo(Subsanacion::class, 'subsanacion_id');
    }

    public function versionPlano(): BelongsTo
    {
        return $this->belongsTo(VersionPlano::class, 'version_plano_id');
    }

    public function elementoEspacial(): BelongsTo
    {
        return $this->belongsTo(ElementoEspacial::class, 'elemento_espacial_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function estaPendiente(): bool
    {
        return $this->estado === self::ESTADO_PENDIENTE;
    }

    public function estaResuelta(): bool
    {
        return in_array($this->estado, [self::ESTADO_CONFIRMADA, self::ESTADO_RECHAZADA, self::ESTADO_NO_APLICABLE, self::ESTADO_INVALIDADA], true);
    }
}
