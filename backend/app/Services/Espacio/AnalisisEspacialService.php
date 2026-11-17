<?php

namespace App\Services\Espacio;

use App\Models\AnalisisEspacial;
use App\Models\Autoevaluacion;
use App\Models\ConectorCirculacion;
use App\Models\ElementoEspacial;
use App\Models\PlanoEstablecimiento;
use App\Models\VersionPlano;
use App\Services\Espacio\Geometria\GeometriaPuntoSegmento;
use Illuminate\Support\Str;

class AnalisisEspacialService
{
    public const ESTADO_CON_CONFIRMADA = 'CONECTIVIDAD_CONFIRMADA';

    public const ESTADO_CON_SUGERIDA = 'CONECTIVIDAD_SUGERIDA';

    public const ESTADO_CONECTOR_FLOTANTE = 'CONECTOR_FLOTANTE';

    public const ESTADO_CON_INDETERMINADA = 'CONECTIVIDAD_INDETERMINADA';

    public function __construct(
        protected GestionEspacialService $gestionEspacialService
    ) {}

    /**
     * Ejecuta el análisis espacial preventivo de conectividad e integridad sobre una versión del croquis.
     */
    public function ejecutarAnalisis(VersionPlano $version): AnalisisEspacial
    {
        $plano = $version->plano;
        $autoevaluacion = $plano?->autoevaluacion;

        if (! $plano || ! $autoevaluacion) {
            throw new \InvalidArgumentException('La versión del plano no se encuentra debidamente asociada a un establecimiento.');
        }

        // 1. Verificación de Integridad de la Versión
        $integridad = $this->gestionEspacialService->verificarIntegridadCompleta($version);

        if (! $integridad['valido']) {
            return $this->registrarFalloIntegridad($version, $plano, $autoevaluacion, $integridad);
        }

        $geometria = $version->geometria_normalizada;
        $niveles = $geometria['niveles'] ?? [];

        // 2. Mapeo de Entidades
        $ambientesTotales = [];
        $conectoresEvaluados = [];
        $advertencias = [];
        $grafoAdyacencia = [];
        $ambientesConSalidaDirecta = [];
        $nivelesNumeros = array_column($niveles, 'numero_piso');

        // Inicializar nodos de ambientes
        foreach ($niveles as $nivel) {
            $numPiso = (int) ($nivel['numero_piso'] ?? 1);
            foreach ($nivel['ambientes'] ?? [] as $amb) {
                $cod = $amb['codigo'];
                $nodo = $numPiso.'|'.$cod;
                $ambientesTotales[$nodo] = [
                    'codigo' => $cod,
                    'nombre' => $amb['nombre'] ?? $cod,
                    'uso' => $amb['uso'] ?? 'ATENCION_PUBLICO',
                    'numero_piso' => $numPiso,
                    'area_m2' => $amb['area_m2'] ?? null,
                    'ambiente_raw' => $amb,
                ];
                $grafoAdyacencia[$nodo] = [];
            }
        }

        // 3. Evaluación de Conectores y Topología
        foreach ($niveles as $nivel) {
            $numPiso = (int) ($nivel['numero_piso'] ?? 1);
            $ambientesNivel = [];
            foreach ($ambientesTotales as $info) {
                if ($info['numero_piso'] === $numPiso) {
                    $ambientesNivel[$info['codigo']] = $info;
                }
            }

            foreach ($nivel['conectores'] ?? [] as $idx => $con) {
                $evaluacionConector = $this->evaluarConector($con, $ambientesNivel, $nivelesNumeros, $numPiso, $idx);
                if (in_array($con['tipo'], ['ESCALERA', 'CONEXION_NIVEL'], true)
                    && $evaluacionConector['clasificacion'] === self::ESTADO_CON_CONFIRMADA) {
                    $destino = $ambientesTotales[($con['nivel_destino_numero'] ?? $numPiso).'|'.($con['ambiente_destino_codigo'] ?? '')] ?? null;
                    if (! $destino || (int) $destino['numero_piso'] === $numPiso) {
                        $evaluacionConector['clasificacion'] = self::ESTADO_CON_INDETERMINADA;
                        $evaluacionConector['advertencia'] = 'La conexión vertical no identifica un ambiente de llegada en otro piso.';
                    } elseif (! GeometriaPuntoSegmento::estaProximoAPerimetro(['x' => $con['posicion_x'], 'y' => $con['posicion_y']], $destino['ambiente_raw'])) {
                        $evaluacionConector['clasificacion'] = self::ESTADO_CON_SUGERIDA;
                        $evaluacionConector['advertencia'] = 'La conexión vertical no coincide geométricamente con el ambiente de llegada.';
                    }
                }
                $conectoresEvaluados[] = $evaluacionConector;

                if (! empty($evaluacionConector['advertencia'])) {
                    $advertencias[] = [
                        'tipo' => $evaluacionConector['clasificacion'],
                        'conector_idx' => $idx,
                        'numero_piso' => $numPiso,
                        'coordenadas' => ['x' => $con['posicion_x'] ?? 0, 'y' => $con['posicion_y'] ?? 0],
                        'mensaje' => $evaluacionConector['advertencia'],
                        'recomendacion' => $evaluacionConector['recomendacion'] ?? 'Revisa la ubicación y las relaciones del conector en el croquis.',
                    ];
                }

                // Si la conexión está estrictamente confirmada, se incorpora al grafo
                if ($evaluacionConector['clasificacion'] === self::ESTADO_CON_CONFIRMADA) {
                    if ($evaluacionConector['es_salida_publica']) {
                        $orig = $evaluacionConector['ambiente_origen'] ? $numPiso.'|'.$evaluacionConector['ambiente_origen'] : null;
                        if ($orig) {
                            $ambientesConSalidaDirecta[$orig] = true;
                        }
                    } else {
                        $orig = $evaluacionConector['ambiente_origen'] ? $numPiso.'|'.$evaluacionConector['ambiente_origen'] : null;
                        $dest = $evaluacionConector['ambiente_destino'] ? ($evaluacionConector['nivel_destino_numero'] ?? $numPiso).'|'.$evaluacionConector['ambiente_destino'] : null;
                        if ($orig && $dest && isset($grafoAdyacencia[$orig], $grafoAdyacencia[$dest])) {
                            $grafoAdyacencia[$orig][] = $dest;
                            $grafoAdyacencia[$dest][] = $orig;
                        }
                    }
                }
            }
        }

        // 4. Búsqueda de Alcanzabilidad BFS hacia Salidas Públicas
        $ambientesConectadosASalida = [];
        $colaBfs = array_keys($ambientesConSalidaDirecta);

        foreach ($colaBfs as $ambSalida) {
            $ambientesConectadosASalida[$ambSalida] = true;
        }

        for ($indiceBfs = 0; $indiceBfs < count($colaBfs); $indiceBfs++) {
            $actual = $colaBfs[$indiceBfs];
            foreach ($grafoAdyacencia[$actual] ?? [] as $vecino) {
                if (! isset($ambientesConectadosASalida[$vecino])) {
                    $ambientesConectadosASalida[$vecino] = true;
                    $colaBfs[] = $vecino;
                }
            }
        }

        // Detectar ambientes sin conexión confirmada
        $ambientesAislados = [];
        foreach ($ambientesTotales as $cod => $info) {
            $tieneSalida = isset($ambientesConectadosASalida[$cod]);
            $ambientesTotales[$cod]['conectado_a_salida'] = $tieneSalida;

            if (! $tieneSalida) {
                $ambientesAislados[] = $cod;
                $advertencias[] = [
                    'tipo' => 'AMBIENTE_SIN_SALIDA_CONFIRMADA',
                    'ambiente_codigo' => $info['codigo'],
                    'numero_piso' => $info['numero_piso'],
                    'mensaje' => "No se identifica una conexión declarada hacia una salida pública desde el ambiente [{$cod} - {$info['nombre']}].",
                    'recomendacion' => 'Comprueba si este ambiente dispone de una puerta hacia la calle o hacia otro ambiente conectado.',
                ];
            }
        }

        // 5. Tratamiento de Elementos Espaciales por Origen
        $elementosDeclarados = [];
        $totalPlantillaIgnorados = 0;

        foreach ($niveles as $nivel) {
            $numPiso = (int) ($nivel['numero_piso'] ?? 1);
            foreach ($nivel['ambientes'] ?? [] as $amb) {
                $codAmb = $amb['codigo'];
                foreach ($amb['elementos'] ?? [] as $elem) {
                    $origenDato = $elem['origen_dato'] ?? ElementoEspacial::ORIGEN_DECLARADO_MANUAL;

                    if ($origenDato === ElementoEspacial::ORIGEN_ILUSTRATIVO_PLANTILLA) {
                        $totalPlantillaIgnorados++;

                        continue;
                    }

                    $elementosDeclarados[] = [
                        'ambiente_codigo' => $codAmb,
                        'numero_piso' => $numPiso,
                        'tipo' => $elem['tipo'] ?? 'OTRO',
                        'origen_dato' => $origenDato,
                        'posicion_x' => $elem['posicion_x'] ?? 0,
                        'posicion_y' => $elem['posicion_y'] ?? 0,
                        'observacion' => $elem['observacion'] ?? null,
                    ];
                }
            }
        }

        // 6. Consolidación de Totales y Clasificaciones
        $totalConfirmados = count(array_filter($conectoresEvaluados, fn ($c) => $c['clasificacion'] === self::ESTADO_CON_CONFIRMADA));
        $totalSugeridos = count(array_filter($conectoresEvaluados, fn ($c) => $c['clasificacion'] === self::ESTADO_CON_SUGERIDA));
        $totalFlotantes = count(array_filter($conectoresEvaluados, fn ($c) => $c['clasificacion'] === self::ESTADO_CONECTOR_FLOTANTE));
        $totalIndeterminados = count(array_filter($conectoresEvaluados, fn ($c) => $c['clasificacion'] === self::ESTADO_CON_INDETERMINADA));

        $todosConectados = count($ambientesTotales) > 0 && count($ambientesAislados) === 0;

        $resumenConectividad = [
            'total_ambientes' => count($ambientesTotales),
            'ambientes_conectados' => array_map(fn ($nodo) => $ambientesTotales[$nodo]['codigo'], array_keys($ambientesConectadosASalida)),
            'ambientes_no_conectados' => array_map(fn ($nodo) => $ambientesTotales[$nodo]['codigo'], $ambientesAislados),
            'conectores' => $conectoresEvaluados,
            'estadisticas_conectores' => [
                'confirmados' => $totalConfirmados,
                'sugeridos' => $totalSugeridos,
                'flotantes' => $totalFlotantes,
                'indeterminados' => $totalIndeterminados,
            ],
            'elementos_declarados_totales' => count($elementosDeclarados),
            'elementos_plantilla_excluidos' => $totalPlantillaIgnorados,
        ];

        $resultadoPreventivo = [
            'es_integro' => true,
            'todos_ambientes_conectados' => $todosConectados,
            'advertencias' => $advertencias,
            'resumen_ambientes' => array_values(array_map(fn ($a) => [
                'codigo' => $a['codigo'],
                'nombre' => $a['nombre'],
                'uso' => $a['uso'],
                'numero_piso' => $a['numero_piso'],
                'conectado_a_salida' => $a['conectado_a_salida'],
            ], $ambientesTotales)),
            'conclusiones_pedagogicas' => $this->generarConclusionesPedagogicas($todosConectados, $totalFlotantes, count($ambientesAislados)),
            'aviso_legal' => 'Este análisis es preventivo, orientativo y se basa en la información declarada y representada por el ciudadano. No constituye una inspección técnica de seguridad en edificaciones, no acredita condiciones reales del establecimiento y no reemplaza la evaluación oficial que corresponda ante la autoridad competente.',
        ];

        // Sello hash SHA-256 del resultado
        $hashResultado = hash('sha256', (string) json_encode($resultadoPreventivo, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        // 7. Persistencia Inmutable
        return AnalisisEspacial::create([
            'uuid_analisis' => (string) Str::uuid(),
            'autoevaluacion_id' => $autoevaluacion->id,
            'plano_establecimiento_id' => $plano->id,
            'version_plano_id' => $version->id,
            'hash_geometria_analizada' => (string) $version->hash_geometria_sha256,
            'hash_resultado_sha256' => $hashResultado,
            'version_motor' => AnalisisEspacial::VERSION_MOTOR_DEFAULT,
            'estado_ejecucion' => AnalisisEspacial::ESTADO_COMPLETADO,
            'todos_ambientes_conectados' => $todosConectados,
            'total_ambientes' => count($ambientesTotales),
            'total_ambientes_conectados' => count($ambientesConectadosASalida),
            'total_conectores' => count($conectoresEvaluados),
            'total_conectores_confirmados' => $totalConfirmados,
            'total_conectores_sugeridos' => $totalSugeridos,
            'total_conectores_flotantes' => $totalFlotantes,
            'total_conectores_indeterminados' => $totalIndeterminados,
            'total_advertencias' => count($advertencias),
            'resumen_conectividad' => $resumenConectividad,
            'resultado_preventivo' => $resultadoPreventivo,
            'elementos_declarados' => $elementosDeclarados,
            'errores_integridad' => null,
            'analizado_at' => now(),
        ]);
    }

    /**
     * Evalúa geométricamente un conector contra los ambientes del nivel.
     *
     * @param  array<string, mixed>  $con
     * @param  array<string, array<string, mixed>>  $ambientesNivel
     * @param  list<int>  $nivelesNumeros
     * @return array<string, mixed>
     */
    protected function evaluarConector(
        array $con,
        array $ambientesNivel,
        array $nivelesNumeros,
        int $numPiso,
        int $idx
    ): array {
        $tipo = strtoupper(trim((string) ($con['tipo'] ?? ConectorCirculacion::TIPO_PUERTA_INTERIOR)));
        $posX = (float) ($con['posicion_x'] ?? 0.0);
        $posY = (float) ($con['posicion_y'] ?? 0.0);
        $p = ['x' => $posX, 'y' => $posY];

        $esSalidaPublica = (bool) ($con['conduce_a_salida_publica'] ?? ($tipo === ConectorCirculacion::TIPO_PUERTA_SALIDA));
        $ancho = (float) ($con['ancho_metros'] ?? 0.90);

        $origCod = isset($con['ambiente_origen_codigo']) ? strtoupper(trim((string) $con['ambiente_origen_codigo'])) : null;
        $destCod = isset($con['ambiente_destino_codigo']) ? strtoupper(trim((string) $con['ambiente_destino_codigo'])) : null;
        $nivelDest = isset($con['nivel_destino_numero']) ? (int) $con['nivel_destino_numero'] : null;

        // Detectar ambientes cuyo perímetro dista <= 0.20m del conector
        $ambientesProximos = [];
        foreach ($ambientesNivel as $cod => $info) {
            if (GeometriaPuntoSegmento::estaProximoAPerimetro($p, $info['ambiente_raw'])) {
                $ambientesProximos[] = $cod;
            }
        }

        $clasificacion = self::ESTADO_CON_INDETERMINADA;
        $advertencia = null;
        $recomendacion = null;

        // Caso 1: Salida Exterior a la Vía Pública
        if ($esSalidaPublica) {
            if ($origCod) {
                if (! isset($ambientesNivel[$origCod])) {
                    $clasificacion = self::ESTADO_CON_INDETERMINADA;
                    $advertencia = "La puerta de salida exterior referencia al ambiente inexistente [{$origCod}].";
                    $recomendacion = 'Asigna un ambiente de origen existente en este piso.';
                } elseif (in_array($origCod, $ambientesProximos, true)) {
                    $clasificacion = self::ESTADO_CON_CONFIRMADA;
                } else {
                    $clasificacion = count($ambientesProximos) > 0 ? self::ESTADO_CON_SUGERIDA : self::ESTADO_CONECTOR_FLOTANTE;
                    $advertencia = "La ubicación de la salida a la calle no coincide con el perímetro de [{$origCod}].";
                    $recomendacion = 'Alinea la puerta con la pared exterior de tu local en el croquis.';
                }
            } else {
                if (count($ambientesProximos) === 1) {
                    $clasificacion = self::ESTADO_CON_SUGERIDA;
                    $advertencia = "Se identifica una salida exterior sobre el muro de [{$ambientesProximos[0]}], pero no fue declarada explícitamente.";
                    $recomendacion = "Confirma en el croquis si esta salida pertenece a [{$ambientesProximos[0]}].";
                } elseif (empty($ambientesProximos)) {
                    $clasificacion = self::ESTADO_CONECTOR_FLOTANTE;
                    $advertencia = 'La puerta de salida a la calle se encuentra flotando sin tocar ningún ambiente.';
                    $recomendacion = 'Arrastra la puerta hacia el borde del local que da a la vía pública.';
                } else {
                    $clasificacion = self::ESTADO_CON_INDETERMINADA;
                    $advertencia = 'La salida exterior coincide con varios ambientes a la vez sin origen claro.';
                }
            }

            return [
                'indice' => $idx,
                'tipo' => $tipo,
                'es_salida_publica' => true,
                'ancho_metros' => $ancho,
                'ambiente_origen' => $origCod ?: ($ambientesProximos[0] ?? null),
                'ambiente_destino' => null,
                'posicion_x' => $posX,
                'posicion_y' => $posY,
                'ambientes_proximos' => $ambientesProximos,
                'clasificacion' => $clasificacion,
                'advertencia' => $advertencia,
                'recomendacion' => $recomendacion,
            ];
        }

        // Caso 2: Escaleras o Conexión Vertical Inter-Nivel
        if ($tipo === ConectorCirculacion::TIPO_ESCALERA || $tipo === ConectorCirculacion::TIPO_CONEXION_NIVEL) {
            if (! $destCod || $nivelDest === null || ! in_array($nivelDest, $nivelesNumeros, true)) {
                $clasificacion = self::ESTADO_CON_INDETERMINADA;
                $advertencia = 'La escalera no tiene un nivel de destino válido o registrado en el plano (piso destino: '.($nivelDest ?? 'no especificado').').';
                $recomendacion = 'Indica a qué piso conduce la escalera en las propiedades del conector.';
            } elseif ($origCod && ! isset($ambientesNivel[$origCod])) {
                $clasificacion = self::ESTADO_CON_INDETERMINADA;
                $advertencia = "La escalera hace referencia a un ambiente de origen inexistente [{$origCod}].";
            } else {
                $clasificacion = in_array($origCod, $ambientesProximos, true) ? self::ESTADO_CON_CONFIRMADA : self::ESTADO_CON_SUGERIDA;
            }

            return [
                'indice' => $idx,
                'tipo' => $tipo,
                'es_salida_publica' => false,
                'ancho_metros' => $ancho,
                'ambiente_origen' => $origCod,
                'ambiente_destino' => $destCod,
                'nivel_destino_numero' => $nivelDest,
                'posicion_x' => $posX,
                'posicion_y' => $posY,
                'ambientes_proximos' => $ambientesProximos,
                'clasificacion' => $clasificacion,
                'advertencia' => $advertencia,
                'recomendacion' => $recomendacion,
            ];
        }

        // Caso 3: Puerta Interior, Vano o Pasillo
        if ($origCod && $destCod) {
            $origExiste = isset($ambientesNivel[$origCod]);
            $destExiste = isset($ambientesNivel[$destCod]);

            if (! $origExiste || ! $destExiste) {
                $clasificacion = self::ESTADO_CON_INDETERMINADA;
                $inexistente = ! $origExiste ? $origCod : $destCod;
                $advertencia = "El conector interior hace referencia a un ambiente inexistente [{$inexistente}].";
                $recomendacion = 'Corrige los ambientes de origen y destino del conector.';
            } else {
                $tocaOrigen = in_array($origCod, $ambientesProximos, true);
                $tocaDestino = in_array($destCod, $ambientesProximos, true);

                if ($tocaOrigen && $tocaDestino) {
                    $clasificacion = self::ESTADO_CON_CONFIRMADA;
                } elseif ($tocaOrigen || $tocaDestino) {
                    $clasificacion = self::ESTADO_CON_SUGERIDA;
                    $advertencia = "La puerta comunica [{$origCod}] y [{$destCod}], pero su ubicación física solo coincide con uno de ellos.";
                    $recomendacion = 'Asegúrate de que la puerta esté ubicada sobre la pared divisoria común.';
                } else {
                    $clasificacion = self::ESTADO_CONECTOR_FLOTANTE;
                    $advertencia = "La puerta declarada entre [{$origCod}] y [{$destCod}] no coincide con el perímetro de ninguno de los dos ambientes.";
                    $recomendacion = 'Desplaza la puerta hasta el muro que separa ambos ambientes.';
                }
            }
        } elseif ($origCod && ! $destCod) {
            if (! isset($ambientesNivel[$origCod])) {
                $clasificacion = self::ESTADO_CON_INDETERMINADA;
                $advertencia = "El conector referencia a un ambiente de origen inexistente [{$origCod}].";
            } elseif (in_array($origCod, $ambientesProximos, true)) {
                $otrosProximos = array_values(array_diff($ambientesProximos, [$origCod]));
                if (! empty($otrosProximos)) {
                    $clasificacion = self::ESTADO_CON_SUGERIDA;
                    $advertencia = "La geometría sugiere una posible conexión entre [{$origCod}] y [{$otrosProximos[0]}], pero el destino no fue declarado expresamente.";
                    $recomendacion = "Si esta puerta conduce a [{$otrosProximos[0]}], decláralo como ambiente de destino en el editor.";
                } else {
                    $clasificacion = self::ESTADO_CON_INDETERMINADA;
                    $advertencia = "La puerta está en el muro de [{$origCod}], pero no se ha indicado a qué ambiente conduce ni si es salida a patio/calle.";
                    $recomendacion = 'Indica el ambiente de destino o marca si conduce a la vía pública.';
                }
            } else {
                $clasificacion = self::ESTADO_CONECTOR_FLOTANTE;
                $advertencia = "El conector con origen [{$origCod}] se encuentra desplazado del muro del ambiente.";
                $recomendacion = 'Alinea la puerta con el borde del ambiente en el lienzo.';
            }
        } else {
            // Ni origen ni destino
            if (count($ambientesProximos) >= 2) {
                $clasificacion = self::ESTADO_CON_SUGERIDA;
                $advertencia = "Existe una puerta entre [{$ambientesProximos[0]}] y [{$ambientesProximos[1]}], pero no tiene origen ni destino declarados.";
                $recomendacion = 'Selecciona el conector en el croquis y define qué ambientes conecta.';
            } elseif (empty($ambientesProximos)) {
                $clasificacion = self::ESTADO_CONECTOR_FLOTANTE;
                $advertencia = 'El conector no presenta correspondencia geométrica con ningún ambiente del piso.';
                $recomendacion = 'Elimina este conector o colócalo sobre el muro de un ambiente.';
            } else {
                $clasificacion = self::ESTADO_CON_INDETERMINADA;
                $advertencia = 'No es posible determinar la continuidad de circulación con la información registrada en este conector.';
            }
        }

        return [
            'indice' => $idx,
            'tipo' => $tipo,
            'es_salida_publica' => false,
            'ancho_metros' => $ancho,
            'ambiente_origen' => $origCod,
            'ambiente_destino' => $destCod,
            'posicion_x' => $posX,
            'posicion_y' => $posY,
            'ambientes_proximos' => $ambientesProximos,
            'clasificacion' => $clasificacion,
            'advertencia' => $advertencia,
            'recomendacion' => $recomendacion,
        ];
    }

    /**
     * Registra un análisis con estado ERROR_INTEGRIDAD cuando la versión fue manipulada o presenta datos corruptos.
     *
     * @param  array<string, mixed>  $integridad
     */
    protected function registrarFalloIntegridad(
        VersionPlano $version,
        PlanoEstablecimiento $plano,
        Autoevaluacion $autoevaluacion,
        array $integridad
    ): AnalisisEspacial {
        $resultadoPreventivo = [
            'es_integro' => false,
            'todos_ambientes_conectados' => false,
            'advertencias' => array_map(fn ($err) => [
                'tipo' => 'FALLO_INTEGRIDAD_CRIPTO',
                'mensaje' => $err,
                'recomendacion' => 'Guarda nuevamente el croquis desde el editor interactivo para restaurar la coherencia de datos.',
            ], $integridad['errores'] ?? []),
            'conclusiones_pedagogicas' => [
                'El modelo espacial contiene discordancias de integridad criptográfica o de estructura y no puede utilizarse para un diagnóstico seguro.',
            ],
            'aviso_legal' => 'Este análisis es preventivo, orientativo y se basa en la información declarada y representada por el ciudadano.',
        ];

        $hashResultado = hash('sha256', (string) json_encode($resultadoPreventivo, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        return AnalisisEspacial::create([
            'uuid_analisis' => (string) Str::uuid(),
            'autoevaluacion_id' => $autoevaluacion->id,
            'plano_establecimiento_id' => $plano->id,
            'version_plano_id' => $version->id,
            'hash_geometria_analizada' => (string) $version->hash_geometria_sha256,
            'hash_resultado_sha256' => $hashResultado,
            'version_motor' => AnalisisEspacial::VERSION_MOTOR_DEFAULT,
            'estado_ejecucion' => AnalisisEspacial::ESTADO_ERROR_INTEGRIDAD,
            'todos_ambientes_conectados' => false,
            'total_ambientes' => 0,
            'total_ambientes_conectados' => 0,
            'total_conectores' => 0,
            'total_conectores_confirmados' => 0,
            'total_conectores_sugeridos' => 0,
            'total_conectores_flotantes' => 0,
            'total_conectores_indeterminados' => 0,
            'total_advertencias' => count($integridad['errores'] ?? []),
            'resumen_conectividad' => [
                'error' => 'Análisis detenido por fallo de integridad criptográfica o estructural.',
                'detalles' => $integridad,
            ],
            'resultado_preventivo' => $resultadoPreventivo,
            'elementos_declarados' => [],
            'errores_integridad' => $integridad['errores'] ?? [],
            'analizado_at' => now(),
        ]);
    }

    /**
     * @return list<string>
     */
    protected function generarConclusionesPedagogicas(bool $todosConectados, int $totalFlotantes, int $totalAislados): array
    {
        $conclusiones = [];

        if ($todosConectados) {
            $conclusiones[] = 'Todos los ambientes modelados disponen de una trayectoria declarada continua hacia al menos una salida pública.';
        } else {
            $conclusiones[] = "Se identificaron {$totalAislados} ambiente(s) sin ruta declarada hacia la vía pública. Revisa la distribución de puertas.";
        }

        if ($totalFlotantes > 0) {
            $conclusiones[] = "Existen {$totalFlotantes} conector(es) flotantes que no tocan las paredes de los ambientes. Ajusta su posición en el lienzo.";
        }

        return $conclusiones;
    }
}
