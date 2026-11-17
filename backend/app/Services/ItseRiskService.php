<?php

namespace App\Services;

use App\Models\RecursoEducativo;
use Illuminate\Support\Facades\Log;

class ItseRiskService
{
    private const NORMA_DIFERENCIAL = 'CNE-U Regla 150-400 / R.M. 175-2008-MEM';

    /**
     * Catálogo base de costos referenciales de subsanación técnica en Huancayo (Soles).
     * Sustento: USM (2026) - Priorización Operativa y Económica.
     */
    public const COSTOS_REFERENCIALES = [
        'EXTINTOR' => [
            'nombre' => 'Recarga y mantenimiento anual de extintor PQS 6kg con soporte (NTP 350.043-1)',
            'prioridad' => 'Alta',
            'dias_plazo' => 2,
            'costo_soles' => 65.00,
            'norma' => 'NTP 350.043-1 / RNE A.130',
        ],
        'EXTINTOR_PQS' => [
            'nombre' => 'Recarga y mantenimiento anual del extintor PQS (carga vigente, tarjeta y manómetro)',
            'prioridad' => 'Alta',
            'dias_plazo' => 2,
            'costo_soles' => 65.00,
            'norma' => 'NTP 350.043-1 / RNE A.130 Art. 163',
        ],
        'DETECTORES_HUMO' => [
            'nombre' => 'Instalación de detectores de humo fotoeléctricos autónomos o centralizados',
            'prioridad' => 'Media',
            'dias_plazo' => 3,
            'costo_soles' => 90.00,
            'norma' => 'RNE A.130 Art. 53 / NFPA 72',
        ],
        'CAMPANA_EXTRACCION' => [
            'nombre' => 'Mantenimiento y desengrase de campana extractora y filtros metálicos',
            'prioridad' => 'Media',
            'dias_plazo' => 5,
            'costo_soles' => 150.00,
            'norma' => 'RNE Norma EM.030',
        ],
        'DIFERENCIAL' => [
            'nombre' => 'Suministro e instalación de interruptor diferencial de 30mA (2x25A / 2x40A)',
            'prioridad' => 'Alta',
            'dias_plazo' => 2,
            'costo_soles' => 110.00,
            'norma' => self::NORMA_DIFERENCIAL,
        ],
        'CABLEADO_CANALIZADO' => [
            'nombre' => 'Canalización de cables expuestos en tuberías o canaletas libres de empalmes',
            'prioridad' => 'Media',
            'dias_plazo' => 3,
            'costo_soles' => 80.00,
            'norma' => 'CNE-U Regla 070.212',
        ],
        'PUERTAS_ESCAPE' => [
            'nombre' => 'Adecuación de puertas de salida con apertura hacia afuera y sin cerrojos trabados',
            'prioridad' => 'Alta',
            'dias_plazo' => 3,
            'costo_soles' => 120.00,
            'norma' => 'RNE A.010 Art. 26',
        ],
        'AFORO_CARTEL' => [
            'nombre' => 'Elaboración y colocación de cartel de aforo máximo permitido en el acceso',
            'prioridad' => 'Baja',
            'dias_plazo' => 5,
            'costo_soles' => 25.00,
            'norma' => 'RNE A.010 Art. 20',
        ],
        'ANCLAJE_ESTANTERIAS' => [
            'nombre' => 'Anclaje sismorresistente a muro/piso de estanterías y anaqueles mayores a 1.80 m',
            'prioridad' => 'Media',
            'dias_plazo' => 4,
            'costo_soles' => 100.00,
            'norma' => 'RNE E.030 Sismorresistente',
        ],
        'LAMINADO_VIDRIOS' => [
            'nombre' => 'Instalación de lámina de seguridad de 4 micras o vidrio templado en lunas crudas',
            'prioridad' => 'Media',
            'dias_plazo' => 3,
            'costo_soles' => 90.00,
            'norma' => 'RNE Norma E.040 Vidrio',
        ],
        'EXTINTOR_K' => [
            'nombre' => 'Instalación de extintor Acetato de Potasio Tipo K para cocinas',
            'prioridad' => 'Alta',
            'dias_plazo' => 3,
            'costo_soles' => 280.00,
            'norma' => 'NTP 350.043-1',
        ],
        'TERMOMAGNETICO' => [
            'nombre' => 'Suministro e instalación de interruptor diferencial de 30mA (2x25A / 2x40A)',
            'prioridad' => 'Alta',
            'dias_plazo' => 2,
            'costo_soles' => 110.00,
            'norma' => self::NORMA_DIFERENCIAL,
        ],
        'TABLERO_MANDIL' => [
            'nombre' => 'Colocación de mandil de protección y tapas ciegas en tablero eléctrico',
            'prioridad' => 'Media',
            'dias_plazo' => 3,
            'costo_soles' => 45.00,
            'norma' => 'CNE-U Regla 020.132',
        ],
        'POZO_TIERRA' => [
            'nombre' => 'Mantenimiento y protocolo de medición de pozo a tierra (<= 25 Ohmios)',
            'prioridad' => 'Media',
            'dias_plazo' => 5,
            'costo_soles' => 180.00,
            'norma' => 'CNE-U Regla 060.712',
        ],
        'EVACUACION' => [
            'nombre' => 'Despeje y adecuación de ancho mínimo de vías de evacuación (>= 0.90m - 1.20m)',
            'prioridad' => 'Alta',
            'dias_plazo' => 1,
            'costo_soles' => 0.00,
            'norma' => 'RNE Norma A.010 Art. 25 y A.130',
        ],
        'LUCES_EMERG' => [
            'nombre' => 'Instalación de luz de emergencia autónoma LED con batería de 90 min',
            'prioridad' => 'Media',
            'dias_plazo' => 4,
            'costo_soles' => 75.00,
            'norma' => 'RNE Norma A.130 Art. 39',
        ],
        'SENALETICA' => [
            'nombre' => 'Kit de señales de seguridad fotoluminiscentes (Salida, Extintor, Riesgo Eléctrico)',
            'prioridad' => 'Baja',
            'dias_plazo' => 10,
            'costo_soles' => 55.00,
            'norma' => 'NTP 399.010-1',
        ],
        'BOTIQUIN' => [
            'nombre' => 'Implementación de botiquín de primeros auxilios reglamentario adosado a pared',
            'prioridad' => 'Baja',
            'dias_plazo' => 10,
            'costo_soles' => 60.00,
            'norma' => 'Directiva INDECI / CENEPRED',
        ],
    ];

    /**
     * Catálogo técnico normativo de condiciones de seguridad ITSE.
     * Criterios de autoevaluación basados en normativa peruana de referencia
     * (RNE A.010/A.130, NTP, CNE-U, R.M. 175-2008-MEM). Debe mantenerse en
     * sincronía con el checklist que presenta resources/js/pages/Evaluacion/Nueva.tsx
     * y con el catálogo de resources/js/data/checklistCatalogo.ts.
     * Requerido por EvaluacionController@index para pintar el formulario.
     */
    public function getCatalogoChecklist(): array
    {
        $items = [
            [
                'codigo' => 'EXTINTOR_PQS',
                'nombre' => 'Extintor PQS con carga vigente, tarjeta de mantenimiento y manómetro operativo',
                'es_critico' => true,
                'norma' => 'NTP 350.043-1 / RNE A.130 Art. 163',
            ],
            [
                'codigo' => 'EXTINTOR_K',
                'nombre' => 'Extintor de Acetato de Potasio (Tipo K) en cocinas comerciales o freidoras',
                'es_critico' => true,
                'norma' => 'NTP 350.043-1 Art. 7.2',
            ],
            [
                'codigo' => 'DETECTORES_HUMO',
                'nombre' => 'Detectores de humo fotoeléctricos autónomos o centralizados operativos',
                'es_critico' => false,
                'norma' => 'RNE Norma A.130 Art. 53 / NFPA 72',
            ],
            [
                'codigo' => 'CAMPANA_EXTRACCION',
                'nombre' => 'Campana extractora con filtros metálicos limpios y ducto incombustible',
                'es_critico' => false,
                'norma' => 'RNE Norma EM.030',
            ],
            [
                'codigo' => 'DIFERENCIAL',
                'nombre' => 'Interruptores diferenciales de 30mA en circuitos eléctricos',
                'es_critico' => true,
                'norma' => self::NORMA_DIFERENCIAL,
            ],
            [
                'codigo' => 'TERMOMAGNETICO',
                'nombre' => 'Interruptores termomagnéticos calibrados a la sección del cable (sin puentes)',
                'es_critico' => true,
                'norma' => 'CNE-U Regla 150-400',
            ],
            [
                'codigo' => 'TABLERO_MANDIL',
                'nombre' => 'Tablero eléctrico con mandil protector (resina o metálico) y sin cables expuestos',
                'es_critico' => false,
                'norma' => 'CNE-U Regla 020.132 / Regla 070.212',
            ],
            [
                'codigo' => 'POZO_TIERRA',
                'nombre' => 'Sistema de puesta a tierra con protocolo de medición vigente (<= 25 Ohmios)',
                'es_critico' => true,
                'norma' => 'CNE-U Regla 060.712 / R.J. 016-2018 Anexo 4',
            ],
            [
                'codigo' => 'CABLEADO_CANALIZADO',
                'nombre' => 'Cables eléctricos canalizados en tuberías o canaletas libres de empalmes expuestos',
                'es_critico' => false,
                'norma' => 'CNE-U Regla 070.212',
            ],
            [
                'codigo' => 'EVACUACION',
                'nombre' => 'Rutas y salidas de escape 100% despejadas (ancho útil mín. 0.90 m - 1.20 m)',
                'es_critico' => true,
                'norma' => 'RNE Norma A.010 Art. 25 y A.130 Art. 13',
            ],
            [
                'codigo' => 'PUERTAS_ESCAPE',
                'nombre' => 'Puertas de salida de fácil apertura sin cerrojos trabados en horario de atención',
                'es_critico' => true,
                'norma' => 'RNE Norma A.010 Art. 26',
            ],
            [
                'codigo' => 'LUCES_EMERG',
                'nombre' => 'Luces de emergencia autónomas operativas en vías de salida (autonomía 90 min)',
                'es_critico' => false,
                'norma' => 'RNE Norma A.130 Art. 39 / NTP IEC 60598-2-22',
            ],
            [
                'codigo' => 'SENALETICA',
                'nombre' => 'Señales fotoluminiscentes de seguridad reglamentarias (Salida, Extintor, Sismo)',
                'es_critico' => false,
                'norma' => 'NTP 399.010-1',
            ],
            [
                'codigo' => 'AFORO_CARTEL',
                'nombre' => 'Cartel de aforo máximo permitido visible en el acceso principal',
                'es_critico' => false,
                'norma' => 'RNE Norma A.010 Art. 20',
            ],
            [
                'codigo' => 'BOTIQUIN',
                'nombre' => 'Botiquín de primeros auxilios abastecido y adosado en pared visible',
                'es_critico' => false,
                'norma' => 'Directiva INDECI / CENEPRED',
            ],
            [
                'codigo' => 'ANCLAJE_ESTANTERIAS',
                'nombre' => 'Anclaje sismorresistente a muro/piso de estanterías y anaqueles mayores a 1.80 m',
                'es_critico' => false,
                'norma' => 'RNE E.030 Sismorresistente',
            ],
            [
                'codigo' => 'LAMINADO_VIDRIOS',
                'nombre' => 'Vidrios crudos protegidos con láminas de seguridad de 4 micras o templados',
                'es_critico' => false,
                'norma' => 'RNE Norma E.040 Vidrio',
            ],
        ];

        // Recursos educativos activos (micro-learning) indexados por código normativo.
        // En entornos sin base de datos (tests unitarios puros) se degrada a un catálogo vacío.
        try {
            $recursos = RecursoEducativo::query()
                ->activos()
                ->get()
                ->keyBy('codigo_normativo');
        } catch (\Throwable $e) {
            if (function_exists('app') && app()->bound('log')) {
                Log::warning('Error consultando recursos cercanos en ItseRiskService', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
            $recursos = collect();
        }

        return array_map(function (array $item) use ($recursos): array {
            $recurso = $recursos->get($item['codigo']);

            return $item + [
                'video_url' => $recurso?->url,
                'tipo' => $recurso?->tipo,
                'base_legal' => $recurso?->base_legal,
                'evidencia_sugerida' => $recurso?->evidencia_sugerida,
                'descripcion' => $recurso?->descripcion_didactica,
            ];
        }, $items);
    }

    /**
     * Motor 1: Clasificación de Trámite según R.J. 016-2018-CENEPRED/J y RNE G.040.
     * Criterio: Comercio <= 3 pisos y <= 750m2 => EX_POST. Superar límites o factores agravantes => EX_ANTE.
     *
     * @param  array{usaGlp?: bool, galonesGlp?: float, usaCaldero?: bool, usaLiquidosInflamables?: bool}  $factoresRiesgo
     * @return array{tipo_tramite: string, nivel_riesgo: string, es_bloqueante: bool, motivos: list<string>}
     */
    public function clasificarTramite(
        string $funcion = 'Comercio',
        ?float $areaM2 = null,
        ?int $pisos = null,
        ?int $aforo = null,
        array|bool $factoresRiesgo = [],
        mixed ...$legacyArgs
    ): array {
        if (is_array($factoresRiesgo)) {
            $usaGlp = (bool) ($factoresRiesgo['usaGlp'] ?? false);
            $galonesGlpVal = (float) ($factoresRiesgo['galonesGlp'] ?? 0.0);
            $usaCalderoVal = (bool) ($factoresRiesgo['usaCaldero'] ?? false);
            $usaLiquidosInflamablesVal = (bool) ($factoresRiesgo['usaLiquidosInflamables'] ?? false);
        } else {
            // Compatibilidad heredada cuando el 5° parámetro es booleano
            $usaGlp = $factoresRiesgo;
            $galonesGlpVal = isset($legacyArgs[0]) && $legacyArgs[0] !== null ? (float) $legacyArgs[0] : 0.0;
            $usaCalderoVal = (bool) ($legacyArgs[1] ?? false);
            $usaLiquidosInflamablesVal = (bool) ($legacyArgs[2] ?? false);
        }

        $motivosFisicos = $this->evaluarLimitesFisicos($funcion, $areaM2, $pisos, $aforo);
        $agravantes = $this->evaluarFactoresAgravantes($usaGlp, $galonesGlpVal, $usaCalderoVal, $usaLiquidosInflamablesVal);

        $motivos = array_merge($motivosFisicos, $agravantes['motivos']);
        $esPrevia = $motivos !== [] || $agravantes['es_previa'];

        return [
            'tipo_tramite' => $esPrevia ? 'EX_ANTE' : 'EX_POST',
            'nivel_riesgo' => $esPrevia ? 'ALTO_MUY_ALTO' : 'BAJO_MEDIO',
            'es_bloqueante' => $esPrevia,
            'motivos' => $motivos,
        ];
    }

    /**
     * Evalúa los límites físicos normativos según la función del establecimiento.
     *
     * @return list<string>
     */
    private function evaluarLimitesFisicos(string $funcion, ?float $areaM2, ?int $pisos, ?int $aforo): array
    {
        if ($funcion === 'Comercio') {
            $motivos = [];
            if ($pisos !== null && $pisos > 3) {
                $motivos[] = "Supera los 3 pisos de altura ({$pisos} pisos registrados).";
            }
            if ($areaM2 !== null && $areaM2 > 750.0) {
                $motivos[] = "Supera los 750 m² de área techada ({$areaM2} m² registrados).";
            }

            return $motivos;
        }

        $funcionesRiesgoEscala = ['Salud', 'Educacion', 'Hospedaje', 'Industrial', 'Encuentro'];
        if (in_array($funcion, $funcionesRiesgoEscala, true) && $this->superaUmbralEscalaEspecial($areaM2, $pisos, $aforo)) {
            return ["La función '{$funcion}' clasifica en Riesgo Alto por su escala/aforo."];
        }

        return [];
    }

    private function superaUmbralEscalaEspecial(?float $areaM2, ?int $pisos, ?int $aforo): bool
    {
        return ($areaM2 !== null && $areaM2 > 500.0)
            || ($pisos !== null && $pisos > 2)
            || ($aforo !== null && $aforo > 100);
    }

    /**
     * Evalúa los factores agravantes de carga térmica e inflamabilidad.
     *
     * @return array{es_previa: bool, motivos: list<string>}
     */
    private function evaluarFactoresAgravantes(
        bool $usaGlp,
        float $galonesGlp,
        bool $usaCaldero,
        bool $usaLiquidosInflamables
    ): array {
        $motivos = [];

        if ($usaCaldero) {
            $motivos[] = 'Presencia de caldero en el establecimiento.';
        }

        if ($usaGlp && $galonesGlp > 118.18) {
            $motivos[] = 'Almacenamiento de GLP superior a 118.18 galones (0.45 m³).';
        } elseif ($usaGlp && $galonesGlp <= 0) {
            $motivos[] = 'Uso de GLP comercial reportado.';
        }

        if ($usaLiquidosInflamables) {
            $motivos[] = 'Almacenamiento o manipulación de líquidos combustibles o reactivos inflamables.';
        }

        return [
            'es_previa' => $motivos !== [],
            'motivos' => $motivos,
        ];
    }

    /**
     * Motor 2: Semáforo Cívico CENEPRED (Verde >= 85%, Ámbar 60-84%, Rojo < 60% o Falla Crítica).
     * Estados declarados por el ciudadano: CUMPLE, NO_CUMPLE, NA o POR_REVISAR (pendiente de revisión).
     *
     * @param  array<int, array<string, mixed>>  $checklist
     * @return array{porcentaje: float, semaforo: string, tiene_falla_critica: bool, total_evaluables: int, total_cumple: int, total_por_revisar: int}
     */
    public function calcularConformidad(array $checklist): array
    {
        $evaluables = array_filter($checklist, [$this, 'esItemEvaluable']);
        $totalEvaluables = count($evaluables);

        if ($totalEvaluables === 0) {
            return [
                'porcentaje' => 100.0,
                'semaforo' => 'VERDE',
                'tiene_falla_critica' => false,
                'total_evaluables' => 0,
                'total_cumple' => 0,
                'total_por_revisar' => 0,
            ];
        }

        [$cumplidos, $porRevisar, $tieneFallaCritica] = $this->contabilizarEstadosChecklist($evaluables);

        $porcentaje = round(($cumplidos / $totalEvaluables) * 100, 1);
        $semaforo = $this->determinarColorSemaforo($porcentaje, $tieneFallaCritica);

        return [
            'porcentaje' => $porcentaje,
            'semaforo' => $semaforo,
            'tiene_falla_critica' => $tieneFallaCritica,
            'total_evaluables' => $totalEvaluables,
            'total_cumple' => $cumplidos,
            'total_por_revisar' => $porRevisar,
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function esItemEvaluable(array $item): bool
    {
        $estado = $item['estado'] ?? (($item['cumple'] ?? false) ? 'CUMPLE' : 'NO_CUMPLE');

        return $estado !== 'NA' && $estado !== 'NO_APLICA';
    }

    /**
     * @param  array<int, array<string, mixed>>  $evaluables
     * @return array{0: int, 1: int, 2: bool}
     */
    private function contabilizarEstadosChecklist(array $evaluables): array
    {
        $cumplidos = 0;
        $porRevisar = 0;
        $tieneFallaCritica = false;

        foreach ($evaluables as $item) {
            $estado = $item['estado'] ?? (($item['cumple'] ?? false) ? 'CUMPLE' : 'NO_CUMPLE');

            if ($estado === 'CUMPLE' || $estado === 'CUMPLE_DECLARADO') {
                $cumplidos++;
            } elseif ($estado === 'POR_REVISAR') {
                $porRevisar++;
            } elseif ($item['es_critico'] ?? false) {
                $tieneFallaCritica = true;
            }
        }

        return [$cumplidos, $porRevisar, $tieneFallaCritica];
    }

    /**
     * Determina el color del semáforo preventivo según umbrales normativos CENEPRED.
     */
    public function determinarColorSemaforo(float $porcentaje, bool $tieneFallaCritica = false): string
    {
        if ($tieneFallaCritica || $porcentaje < 60.0) {
            return 'ROJO';
        }

        return $porcentaje >= 85.0 ? 'VERDE' : 'AMBAR';
    }

    /**
     * Calcula el porcentaje y color de semáforo a partir de conteos normativos.
     *
     * @return array{porcentaje: float, semaforo: string}
     */
    public function calcularMetricasCumplimiento(int $totalAplicables, int $totalCumple, bool $tieneFallaCritica = false): array
    {
        $porcentaje = $totalAplicables > 0
            ? round(($totalCumple / $totalAplicables) * 100, 1)
            : 0.0;

        return [
            'porcentaje' => $porcentaje,
            'semaforo' => $this->determinarColorSemaforo($porcentaje, $tieneFallaCritica),
        ];
    }

    /**
     * Motor 3 (Heredado / Aislado): Generación de plan referencial con costos y plazos.
     *
     * @deprecated Prototipo anterior. El sistema cívico preventivo definitivo no traslada
     *             costos, presupuestos ni plazos oficiales. Se mantiene aislado para retrocompatibilidad de pruebas.
     */
    public function generarPlanDeAccion(array $checklist): array
    {
        $tareas = [];
        $costoTotal = 0.0;

        foreach ($checklist as $item) {
            $estado = $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE');
            if ($estado === 'NO_CUMPLE' || $estado === 'PENDIENTE_ATENDER') {
                $codigo = $item['codigo'] ?? '';
                $catalogo = self::COSTOS_REFERENCIALES[$codigo] ?? [
                    'nombre' => $item['nombre'] ?? 'Subsanación técnica requerida',
                    'prioridad' => ($item['es_critico'] ?? false) ? 'Alta' : 'Media',
                    'dias_plazo' => ($item['es_critico'] ?? false) ? 2 : 5,
                    'costo_soles' => 50.00,
                    'norma' => 'R.J. 016-2018-CENEPRED/J',
                ];

                $tareas[] = [
                    'codigo' => $codigo,
                    'item' => $item['nombre'] ?? '',
                    'tarea' => $catalogo['nombre'],
                    'prioridad' => $catalogo['prioridad'],
                    'dias_plazo' => $catalogo['dias_plazo'],
                    'costo_soles' => $catalogo['costo_soles'],
                    'norma' => $catalogo['norma'],
                ];

                $costoTotal += $catalogo['costo_soles'];
            }
        }

        $orden = ['Alta' => 1, 'Media' => 2, 'Baja' => 3];
        usort($tareas, fn ($a, $b) => ($orden[$a['prioridad']] ?? 9) <=> ($orden[$b['prioridad']] ?? 9));

        return [
            'tareas' => $tareas,
            'costo_total' => $costoTotal,
            'total_items' => count($tareas),
        ];
    }

    /**
     * Motor 4: Métrica de Asimetría Informativa (Gap Analysis).
     * Sustento: PUCP - Metodología de diagnóstico de fallas.
     */
    public function calcularMetricaGap(float $porcentajeDeclarado, float $porcentajeVerificado): float
    {
        return round($porcentajeDeclarado - $porcentajeVerificado, 1);
    }
}
