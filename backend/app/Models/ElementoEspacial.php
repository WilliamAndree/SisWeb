<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ElementoEspacial extends Model
{
    public const TIPO_EXTINTOR = 'EXTINTOR';

    public const TIPO_SENAL_SALIDA = 'SENAL_SALIDA';

    public const TIPO_LUZ_EMERGENCIA = 'LUZ_EMERGENCIA';

    public const TIPO_TABLERO_ELECTRICO = 'TABLERO_ELECTRICO';

    public const TIPO_OBSTACULO = 'OBSTACULO';

    public const TIPO_BOTIQUIN = 'BOTIQUIN';

    public const TIPO_OTRO = 'OTRO';

    // Orígenes del dato
    public const ORIGEN_DECLARADO_MANUAL = 'DECLARADO_MANUAL';

    public const ORIGEN_ILUSTRATIVO_PLANTILLA = 'ILUSTRATIVO_PLANTILLA';

    public const ORIGEN_CONFIRMADO_SUGERENCIA_IA = 'CONFIRMADO_SUGERENCIA_IA';

    protected $table = 'elementos_espaciales';

    protected $fillable = [
        'ambiente_id',
        'tipo',
        'posicion_x',
        'posicion_y',
        'subsanacion_id',
        'origen_dato',
        'observacion',
    ];

    protected function casts(): array
    {
        return [
            'posicion_x' => 'float',
            'posicion_y' => 'float',
        ];
    }

    public function ambiente(): BelongsTo
    {
        return $this->belongsTo(AmbienteZona::class, 'ambiente_id');
    }

    public function subsanacion(): BelongsTo
    {
        return $this->belongsTo(Subsanacion::class, 'subsanacion_id');
    }

    public function sugerencia(): HasOne
    {
        return $this->hasOne(SugerenciaEspacial::class, 'elemento_espacial_id');
    }

    public function esIlustrativoPlantilla(): bool
    {
        return $this->origen_dato === self::ORIGEN_ILUSTRATIVO_PLANTILLA;
    }

    public function esDeclaradoCiudadano(): bool
    {
        return in_array($this->origen_dato, [self::ORIGEN_DECLARADO_MANUAL, self::ORIGEN_CONFIRMADO_SUGERENCIA_IA], true);
    }
}
