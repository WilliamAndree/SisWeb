<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Autoevaluacion extends Model
{
    public const ESTADO_INICIADA = 'INICIADA';

    public const ESTADO_REGISTRADA = 'REGISTRADA';

    protected $table = 'autoevaluaciones';

    /**
     * Credenciales de control de acceso que nunca deben salir del servidor.
     *
     * `session_token` es la credencial de titularidad de una autoevaluación creada
     * como invitada: se compara con `hash_equals()` contra la cookie, la sesión o
     * el UUID autorizado. Serializar el modelo completo lo exponía en el payload
     * de Inertia y en el HTML inicial. Queda igualmente protegido por
     * Autoevaluacion::paraInforme() en los renders que publican una vista legal.
     *
     * @var list<string>
     */
    protected $hidden = [
        'session_token',
        'token_seguridad',
        'user_id',
    ];

    protected $fillable = [
        'user_id',
        'session_token',
        'codigo_acceso',
        'token_seguridad',
        'actividad_comercial_id',
        'evaluacion_origen_id',
        'uuid_trazabilidad',
        'estado',
        'registrada_at',
        'hash_integridad',
        'payload_canonico',
        'nombre_comercio',
        'funcion_economica',
        'ruc',
        'sector_huancayo',
        'distrito',
        'direccion',
        'referencia',
        'latitud',
        'longitud',
        'caracteristicas_declaradas',
        'total_condiciones_evaluadas',
        'total_cumple_declarado',
        'total_pendiente_atender',
        'total_por_revisar',
        'total_no_aplica',
        'area_m2',
        'pisos',
        'aforo',
        'usa_glp',
        'galones_glp',
        'usa_caldero',
        'usa_liquidos_inflamables',
        'tiene_equipos_fritura',
        'tiene_escaleras',
        'tiene_estanterias_altas',
        'tipo_tramite',
        'nivel_riesgo',
        'porcentaje_cumplimiento',
        'semaforo',
        'detalle_checklist',
        'plan_accion_costos',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'estado' => 'string',
            'registrada_at' => 'datetime',
            'area_m2' => 'float',
            'pisos' => 'integer',
            'aforo' => 'integer',
            'usa_glp' => 'boolean',
            'galones_glp' => 'float',
            'usa_caldero' => 'boolean',
            'usa_liquidos_inflamables' => 'boolean',
            'porcentaje_cumplimiento' => 'float',
            'detalle_checklist' => 'array',
            'plan_accion_costos' => 'array',
            'caracteristicas_declaradas' => 'array',
            'payload_canonico' => 'array',
            'total_condiciones_evaluadas' => 'integer',
            'total_cumple_declarado' => 'integer',
            'total_pendiente_atender' => 'integer',
            'total_por_revisar' => 'integer',
            'total_no_aplica' => 'integer',
            'latitud' => 'float',
            'longitud' => 'float',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (Autoevaluacion $model) {
            if ($model->getOriginal('estado') === self::ESTADO_REGISTRADA) {
                $atributosSellados = [
                    'estado',
                    'uuid_trazabilidad',
                    'caracteristicas_declaradas',
                    'payload_canonico',
                    'hash_integridad',
                    'registrada_at',
                    'evaluacion_origen_id',
                ];

                foreach ($atributosSellados as $atributo) {
                    if ($model->isDirty($atributo) && $model->getOriginal($atributo) !== null) {
                        throw new \LogicException("No se permite modificar el atributo sellado [{$atributo}] en una autoevaluación registrada.");
                    }
                }
            }
        });
    }

    public function estaRegistrada(): bool
    {
        return $this->estado === self::ESTADO_REGISTRADA;
    }

    public function estaIniciada(): bool
    {
        return $this->estado === self::ESTADO_INICIADA;
    }

    /**
     * Determina si la autoevaluación pertenece al flujo V2 normativo vigente.
     * Retorna false únicamente para autoevaluaciones de la generación V1 legacy
     * (con detalle_checklist estático prellenado, sin respuestas normativas ni snapshot V2).
     */
    public function esFlujoNuevo(): bool
    {
        if ($this->payload_canonico !== null) {
            return true;
        }

        $tieneRespuestas = $this->relationLoaded('respuestas')
            ? $this->respuestas->isNotEmpty()
            : $this->respuestas()->exists();

        return $tieneRespuestas || empty($this->detalle_checklist);
    }

    /**
     * Payload explícito y seguro de la autoevaluación para vistas Inertia.
     *
     * Lista blanca de campos: a diferencia de serializar el modelo completo, no
     * puede filtrar columnas nuevas por descuido, y los valores conservan el tipo
     * de sus casts. `sector_huancayo`, `area_m2`, `pisos`, `aforo`, `ruc` y
     * `tipo_tramite` son columnas nullable y pueden llegar en `null`.
     *
     * @return array<string, mixed>
     */
    public function paraInforme(): array
    {
        return [
            'uuid_trazabilidad' => $this->uuid_trazabilidad,
            'nombre_comercio' => $this->nombre_comercio,
            'funcion_economica' => $this->funcion_economica,
            'ruc' => $this->ruc,
            'sector_huancayo' => $this->sector_huancayo,
            'direccion' => $this->direccion,
            'referencia' => $this->referencia,
            'area_m2' => $this->area_m2,
            'pisos' => $this->pisos,
            'aforo' => $this->aforo,
            'tipo_tramite' => $this->tipo_tramite,
            'nivel_riesgo' => $this->nivel_riesgo,
            'semaforo' => $this->semaforo,
            'porcentaje_cumplimiento' => $this->porcentaje_cumplimiento,
            'evaluacion_origen_id' => $this->evaluacion_origen_id,
            'hash_integridad' => $this->hash_integridad,
            'detalle_checklist' => $this->detalle_checklist,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function actividadComercial(): BelongsTo
    {
        return $this->belongsTo(ActividadComercial::class, 'actividad_comercial_id');
    }

    public function respuestas(): HasMany
    {
        return $this->hasMany(RespuestaAutoevaluacion::class, 'autoevaluacion_id');
    }

    /**
     * Evaluación original que precedió a esta reevaluación preventiva (Modelo estrella A -> B, C).
     */
    public function evaluacionOrigen(): BelongsTo
    {
        return $this->belongsTo(Autoevaluacion::class, 'evaluacion_origen_id');
    }

    /**
     * Reevaluaciones preventivas posteriores generadas a partir de esta evaluación.
     */
    public function reevaluaciones(): HasMany
    {
        return $this->hasMany(Autoevaluacion::class, 'evaluacion_origen_id');
    }

    public function subsanaciones(): HasMany
    {
        return $this->hasMany(Subsanacion::class, 'autoevaluacion_id');
    }

    /**
     * Plano del establecimiento (Fase 3: Croquis y modelo espacial ciudadano).
     */
    public function planoEstablecimiento(): HasOne
    {
        return $this->hasOne(PlanoEstablecimiento::class, 'autoevaluacion_id');
    }

    /**
     * Sugerencias de elementos espaciales derivadas de análisis visual IA (Fase 3.2).
     */
    public function sugerenciasEspaciales(): HasMany
    {
        return $this->hasMany(SugerenciaEspacial::class, 'autoevaluacion_id');
    }

    /**
     * Análisis espaciales preventivos inmutables generados para la autoevaluación (Subfase 3.3).
     */
    public function analisisEspaciales(): HasMany
    {
        return $this->hasMany(AnalisisEspacial::class, 'autoevaluacion_id')->orderBy('id', 'desc');
    }

    // --- Relaciones en transición de compatibilidad (Fase 6 Bloque 1) ---

    public function simulaciones(): HasMany
    {
        return $this->hasMany(SimulacionRevision::class, 'autoevaluacion_id');
    }

    /**
     * Última simulación registrada (mantenida temporalmente para compatibilidad durante Bloque 1).
     */
    public function simulacionRevision(): HasOne
    {
        return $this->hasOne(SimulacionRevision::class, 'autoevaluacion_id')->latestOfMany();
    }

    /**
     * Accesor para la variable de condición física: equipos de fritura o cocción con aceites/grasas.
     */
    public function getTieneEquiposFrituraAttribute(): ?bool
    {
        $caracteristicas = $this->caracteristicas_declaradas ?? [];
        if (! is_array($caracteristicas) || ! array_key_exists('tiene_equipos_fritura', $caracteristicas)) {
            return null;
        }

        return $caracteristicas['tiene_equipos_fritura'] !== null
            ? (bool) $caracteristicas['tiene_equipos_fritura']
            : null;
    }

    /**
     * Mutador para sincronizar la variable de equipos de fritura en caracteristicas_declaradas.
     */
    public function setTieneEquiposFrituraAttribute(?bool $value): void
    {
        $caracteristicas = $this->caracteristicas_declaradas ?? [];
        if (! is_array($caracteristicas)) {
            $caracteristicas = [];
        }

        if ($value === null) {
            unset($caracteristicas['tiene_equipos_fritura']);
        } else {
            $caracteristicas['tiene_equipos_fritura'] = (bool) $value;
        }

        $this->caracteristicas_declaradas = $caracteristicas;
    }

    /**
     * Accesor para la variable de condición física: existencia de escaleras de circulación.
     */
    public function getTieneEscalerasAttribute(): ?bool
    {
        $caracteristicas = $this->caracteristicas_declaradas ?? [];
        if (! is_array($caracteristicas) || ! array_key_exists('tiene_escaleras', $caracteristicas)) {
            return null;
        }

        return $caracteristicas['tiene_escaleras'] !== null
            ? (bool) $caracteristicas['tiene_escaleras']
            : null;
    }

    /**
     * Mutador para sincronizar la variable de escaleras en caracteristicas_declaradas.
     */
    public function setTieneEscalerasAttribute(?bool $value): void
    {
        $caracteristicas = $this->caracteristicas_declaradas ?? [];
        if (! is_array($caracteristicas)) {
            $caracteristicas = [];
        }

        if ($value === null) {
            unset($caracteristicas['tiene_escaleras']);
        } else {
            $caracteristicas['tiene_escaleras'] = (bool) $value;
        }

        $this->caracteristicas_declaradas = $caracteristicas;
    }

    /**
     * Accesor para la variable de condición física: estanterías altas o mobiliario con riesgo de volteo.
     */
    public function getTieneEstanteriasAltasAttribute(): ?bool
    {
        $caracteristicas = $this->caracteristicas_declaradas ?? [];
        if (! is_array($caracteristicas) || ! array_key_exists('tiene_estanterias_altas', $caracteristicas)) {
            return null;
        }

        return $caracteristicas['tiene_estanterias_altas'] !== null
            ? (bool) $caracteristicas['tiene_estanterias_altas']
            : null;
    }

    /**
     * Mutador para sincronizar la variable de estanterías altas en caracteristicas_declaradas.
     */
    public function setTieneEstanteriasAltasAttribute(?bool $value): void
    {
        $caracteristicas = $this->caracteristicas_declaradas ?? [];
        if (! is_array($caracteristicas)) {
            $caracteristicas = [];
        }

        if ($value === null) {
            unset($caracteristicas['tiene_estanterias_altas']);
        } else {
            $caracteristicas['tiene_estanterias_altas'] = (bool) $value;
        }

        $this->caracteristicas_declaradas = $caracteristicas;
    }
}
