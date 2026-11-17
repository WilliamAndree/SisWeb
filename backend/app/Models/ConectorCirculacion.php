<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConectorCirculacion extends Model
{
    public const TIPO_PUERTA_INTERIOR = 'PUERTA_INTERIOR';

    public const TIPO_PUERTA_SALIDA = 'PUERTA_SALIDA';

    public const TIPO_VANO = 'VANO';

    public const TIPO_PASILLO = 'PASILLO';

    public const TIPO_ESCALERA = 'ESCALERA';

    public const TIPO_CONEXION_NIVEL = 'CONEXION_NIVEL';

    protected $table = 'conectores_circulacion';

    protected $fillable = [
        'nivel_piso_id',
        'tipo',
        'ancho_metros',
        'conduce_a_salida_publica',
        'abre_hacia_afuera',
        'ambiente_origen_id',
        'ambiente_destino_id',
        'nivel_destino_id',
        'posicion_x',
        'posicion_y',
        'origen_dato',
    ];

    protected function casts(): array
    {
        return [
            'ancho_metros' => 'float',
            'conduce_a_salida_publica' => 'boolean',
            'abre_hacia_afuera' => 'boolean',
            'posicion_x' => 'float',
            'posicion_y' => 'float',
        ];
    }

    public function nivelPiso(): BelongsTo
    {
        return $this->belongsTo(NivelPiso::class, 'nivel_piso_id');
    }

    public function ambienteOrigen(): BelongsTo
    {
        return $this->belongsTo(AmbienteZona::class, 'ambiente_origen_id');
    }

    public function ambienteDestino(): BelongsTo
    {
        return $this->belongsTo(AmbienteZona::class, 'ambiente_destino_id');
    }

    public function nivelDestino(): BelongsTo
    {
        return $this->belongsTo(NivelPiso::class, 'nivel_destino_id');
    }

    public function esSalidaExterior(): bool
    {
        return $this->tipo === self::TIPO_PUERTA_SALIDA || $this->conduce_a_salida_publica;
    }
}
