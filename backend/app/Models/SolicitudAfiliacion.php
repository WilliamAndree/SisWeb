<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SolicitudAfiliacion extends Model
{
    use HasFactory;

    protected $table = 'solicitudes_afiliacion';

    public const ESTADO_PENDIENTE = 'PENDIENTE';

    public const ESTADO_APROBADO = 'APROBADO';

    public const ESTADO_RECHAZADO = 'RECHAZADO';

    protected $fillable = [
        'nombre_comercial',
        'contacto_nombre',
        'numero_documento',
        'email',
        'telefono',
        'rubro',
        'distrito',
        'notas',
        'estado',
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
        ];
    }
}
