<?php

namespace App\Models;

use App\Services\Espacio\GestionEspacialService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class AnalisisEspacial extends Model
{
    public const ESTADO_COMPLETADO = 'COMPLETADO';

    public const ESTADO_ERROR_INTEGRIDAD = 'ERROR_INTEGRIDAD';

    public const ESTADO_ERROR_EJECUCION = 'ERROR_EJECUCION';

    public const VERSION_MOTOR_DEFAULT = 'v1.0-mvp';

    protected $table = 'analisis_espaciales';

    protected $fillable = [
        'uuid_analisis',
        'autoevaluacion_id',
        'plano_establecimiento_id',
        'version_plano_id',
        'hash_geometria_analizada',
        'hash_resultado_sha256',
        'version_motor',
        'version_catalogo_normativo',
        'estado_ejecucion',
        'todos_ambientes_conectados',
        'total_ambientes',
        'total_ambientes_conectados',
        'total_conectores',
        'total_conectores_confirmados',
        'total_conectores_sugeridos',
        'total_conectores_flotantes',
        'total_conectores_indeterminados',
        'total_advertencias',
        'resumen_conectividad',
        'resultado_preventivo',
        'elementos_declarados',
        'errores_integridad',
        'analizado_at',
    ];

    protected function casts(): array
    {
        return [
            'todos_ambientes_conectados' => 'boolean',
            'total_ambientes' => 'integer',
            'total_ambientes_conectados' => 'integer',
            'total_conectores' => 'integer',
            'total_conectores_confirmados' => 'integer',
            'total_conectores_sugeridos' => 'integer',
            'total_conectores_flotantes' => 'integer',
            'total_conectores_indeterminados' => 'integer',
            'total_advertencias' => 'integer',
            'resumen_conectividad' => 'array',
            'resultado_preventivo' => 'array',
            'elementos_declarados' => 'array',
            'errores_integridad' => 'array',
            'analizado_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function () {
            throw new LogicException('Los análisis espaciales generados son estrictamente inmutables y no pueden modificarse.');
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

    public function versionPlano(): BelongsTo
    {
        return $this->belongsTo(VersionPlano::class, 'version_plano_id');
    }

    /**
     * Determina dinámicamente si el análisis corresponde a la versión activa actual del croquis.
     */
    public function esVigente(): bool
    {
        $plano = $this->plano;
        if (! $plano || ! $plano->version_activa_id) {
            return false;
        }

        $version = $plano->versionActiva;
        if (! $version || (int) $version->plano_establecimiento_id !== (int) $plano->id || ! is_array($version->geometria_normalizada)) {
            return false;
        }

        try {
            if (! app(GestionEspacialService::class)->verificarIntegridadVersion($version)) {
                return false;
            }
        } catch (\JsonException) {
            return false;
        }

        return (int) $this->version_plano_id === (int) $plano->version_activa_id
            && hash_equals((string) $this->hash_geometria_analizada, (string) $plano->versionActiva?->hash_geometria_sha256);
    }
}
