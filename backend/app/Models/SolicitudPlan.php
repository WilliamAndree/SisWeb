<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Pedido de cambio a un plan pagado, con su comprobante de pago.
 *
 * Lo crea el proveedor y lo resuelve un administrador: al aprobarlo, el plan
 * del negocio cambia y se fija su fecha de vencimiento.
 *
 * @property int $id
 * @property string $uuid
 * @property int $proveedor_recurso_id
 * @property int $user_id
 * @property string $plan_actual
 * @property string $plan_solicitado
 * @property int $meses
 * @property string $monto_soles
 * @property string $metodo_pago
 * @property string $numero_operacion
 * @property Carbon $fecha_pago
 * @property string $evidencia_ruta
 * @property string $evidencia_mime
 * @property string $evidencia_hash
 * @property string $estado
 * @property string|null $observacion_admin
 * @property int|null $revisado_por
 * @property Carbon|null $revisado_en
 * @property Carbon|null $vigente_hasta
 * @property Carbon $created_at
 */
class SolicitudPlan extends Model
{
    public const ESTADO_PENDIENTE = 'pendiente';

    public const ESTADO_APROBADA = 'aprobada';

    public const ESTADO_RECHAZADA = 'rechazada';

    public const METODOS_PAGO = [
        'yape' => 'Yape',
        'plin' => 'Plin',
        'transferencia' => 'Transferencia bancaria',
        'deposito' => 'Depósito en agente',
    ];

    protected $table = 'solicitudes_plan';

    protected $fillable = [
        'uuid',
        'proveedor_recurso_id',
        'user_id',
        'plan_actual',
        'plan_solicitado',
        'meses',
        'monto_soles',
        'metodo_pago',
        'numero_operacion',
        'fecha_pago',
        'evidencia_ruta',
        'evidencia_mime',
        'evidencia_hash',
        'estado',
        'observacion_admin',
        'revisado_por',
        'revisado_en',
        'vigente_hasta',
    ];

    protected function casts(): array
    {
        return [
            'meses' => 'integer',
            'monto_soles' => 'decimal:2',
            'fecha_pago' => 'date',
            'revisado_en' => 'datetime',
            'vigente_hasta' => 'date',
        ];
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(ProveedorRecurso::class, 'proveedor_recurso_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function revisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revisado_por');
    }

    public function scopePendientes(Builder $query): Builder
    {
        return $query->where('estado', self::ESTADO_PENDIENTE);
    }

    public function estaPendiente(): bool
    {
        return $this->estado === self::ESTADO_PENDIENTE;
    }
}
