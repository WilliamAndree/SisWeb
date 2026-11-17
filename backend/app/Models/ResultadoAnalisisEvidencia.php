<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResultadoAnalisisEvidencia extends Model
{
    protected $hidden = ['raw_payload_salida'];

    protected $table = 'resultados_analisis_evidencias';

    public const CALIDAD_OPTIMA = 'OPTIMA';

    public const CALIDAD_ACEPTABLE = 'ACEPTABLE';

    public const CALIDAD_DEFICIENTE_ILUMINACION = 'DEFICIENTE_ILUMINACION';

    public const CALIDAD_DEFICIENTE_ENFOQUE = 'DEFICIENTE_ENFOQUE';

    public const CALIDAD_DEFICIENTE_DISTANCIA = 'DEFICIENTE_DISTANCIA';

    public const CALIDAD_ILEGIBLE = 'ILEGIBLE';

    public const CALIDADES_VALIDAS = [
        self::CALIDAD_OPTIMA,
        self::CALIDAD_ACEPTABLE,
        self::CALIDAD_DEFICIENTE_ILUMINACION,
        self::CALIDAD_DEFICIENTE_ENFOQUE,
        self::CALIDAD_DEFICIENTE_DISTANCIA,
        self::CALIDAD_ILEGIBLE,
    ];

    public const RELEVANCIA_DIRECTA = 'DIRECTAMENTE_PERTINENTE';

    public const RELEVANCIA_PARCIAL = 'PARCIALMENTE_PERTINENTE';

    public const RELEVANCIA_NO_RELACIONADA = 'NO_RELACIONADA';

    public const RELEVANCIA_INDETERMINADA = 'INDETERMINADA';

    public const RELEVANCIAS_VALIDAS = [
        self::RELEVANCIA_DIRECTA,
        self::RELEVANCIA_PARCIAL,
        self::RELEVANCIA_NO_RELACIONADA,
        self::RELEVANCIA_INDETERMINADA,
    ];

    public const INCERTIDUMBRE_BAJO = 'BAJO';

    public const INCERTIDUMBRE_MEDIO = 'MEDIO';

    public const INCERTIDUMBRE_ALTO = 'ALTO';

    public const INCERTIDUMBRE_MUY_ALTO = 'MUY_ALTO';

    public const INCERTIDUMBRES_VALIDAS = [
        self::INCERTIDUMBRE_BAJO,
        self::INCERTIDUMBRE_MEDIO,
        self::INCERTIDUMBRE_ALTO,
        self::INCERTIDUMBRE_MUY_ALTO,
    ];

    public const VISUAL_IDENTIFICADO = 'IDENTIFICADO_VISUALMENTE';

    public const VISUAL_NO_IDENTIFICADO = 'NO_IDENTIFICADO_EN_IMAGEN';

    public const VISUAL_NO_OBSERVABLE = 'NO_OBSERVABLE_CON_CLARIDAD';

    public const VISUAL_NO_DETERMINABLE = 'NO_DETERMINABLE_POR_FOTOGRAFIA';

    public const VISUALES_VALIDOS = [
        self::VISUAL_IDENTIFICADO,
        self::VISUAL_NO_IDENTIFICADO,
        self::VISUAL_NO_OBSERVABLE,
        self::VISUAL_NO_DETERMINABLE,
    ];

    protected $fillable = [
        'analisis_evidencia_id',
        'criterio_codigo',
        'calidad_imagen',
        'relevancia_evidencia',
        'nivel_incertidumbre',
        'elementos_detectados',
        'observaciones_visuales',
        'condiciones_visibles',
        'no_observable',
        'recomendaciones_captura',
        'resumen_pedagogico',
        'tokens_entrada',
        'tokens_salida',
        'tiempo_procesamiento_ms',
        'raw_payload_salida',
    ];

    protected $casts = [
        'elementos_detectados' => 'array',
        'observaciones_visuales' => 'array',
        'condiciones_visibles' => 'array',
        'no_observable' => 'array',
        'recomendaciones_captura' => 'array',
        'raw_payload_salida' => 'array',
        'tokens_entrada' => 'integer',
        'tokens_salida' => 'integer',
        'tiempo_procesamiento_ms' => 'integer',
    ];

    public function analisis(): BelongsTo
    {
        return $this->belongsTo(AnalisisEvidencia::class, 'analisis_evidencia_id');
    }
}
