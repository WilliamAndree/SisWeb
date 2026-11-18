<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Negocio de un proveedor (o del catálogo inicial, sin cuenta).
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $plan
 * @property Carbon|null $plan_vence_el
 * @property string $estado_revision
 * @property string|null $observacion_revision
 * @property bool $activo
 * @property bool $verificado
 */
class ProveedorRecurso extends Model
{
    protected $table = 'proveedores_recursos';

    /** Orden de aparición por plan: los planes pagados aparecen primero. */
    public const ORDEN_PLAN = ['premium' => 0, 'destacado' => 1, 'basico' => 2];

    public const PLAN_GRATUITO = 'basico';

    /** Estados de revisión del negocio por el administrador. */
    public const ESTADO_PENDIENTE = 'pendiente';

    public const ESTADO_APROBADO = 'aprobado';

    public const ESTADO_OBSERVADO = 'observado';

    public const ESTADO_SUSPENDIDO = 'suspendido';

    public const ESTADOS = [self::ESTADO_PENDIENTE, self::ESTADO_APROBADO, self::ESTADO_OBSERVADO, self::ESTADO_SUSPENDIDO];

    protected $fillable = [
        'user_id',
        'categoria_id',
        'rubro',
        'razon_social',
        'nombre_comercial',
        'tipo_servicio',
        'telefono',
        'whatsapp',
        'direccion',
        'distrito',
        'latitud',
        'longitud',
        'servicios_ofrecidos',
        'descripcion',
        'activo',
        'verificado',
        'estado_revision',
        'observacion_revision',
        'revisado_por',
        'revisado_en',
        'plan',
        'plan_vence_el',
    ];

    protected $casts = [
        'latitud' => 'float',
        'longitud' => 'float',
        'activo' => 'boolean',
        'verificado' => 'boolean',
        'revisado_en' => 'datetime',
        'plan_vence_el' => 'date',
    ];

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(CategoriaSubsanacion::class, 'categoria_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ofertas(): HasMany
    {
        return $this->hasMany(OfertaProveedor::class, 'proveedor_recurso_id');
    }

    public function solicitudesPlan(): HasMany
    {
        return $this->hasMany(SolicitudPlan::class, 'proveedor_recurso_id');
    }

    /** Activos y aprobados: los únicos que ven los clientes. */
    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    public function scopePublicados(Builder $query): Builder
    {
        return $query->where('activo', true)->where('estado_revision', self::ESTADO_APROBADO);
    }

    /**
     * Plan que rige hoy: un plan pagado vencido vuelve a Básico aunque el
     * proceso diario aún no lo haya actualizado en la base de datos.
     */
    public function planVigente(): string
    {
        $plan = $this->plan ?: self::PLAN_GRATUITO;

        if ($plan !== self::PLAN_GRATUITO && $this->plan_vence_el !== null && $this->plan_vence_el->endOfDay()->isPast()) {
            return self::PLAN_GRATUITO;
        }

        return $plan;
    }

    public function estaPublicado(): bool
    {
        return $this->activo && $this->estado_revision === self::ESTADO_APROBADO;
    }
}
