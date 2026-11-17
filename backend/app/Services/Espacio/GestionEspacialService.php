<?php

namespace App\Services\Espacio;

use App\Models\AmbienteZona;
use App\Models\Autoevaluacion;
use App\Models\ConectorCirculacion;
use App\Models\ElementoEspacial;
use App\Models\NivelPiso;
use App\Models\PlanoEstablecimiento;
use App\Models\Subsanacion;
use App\Models\User;
use App\Models\VersionPlano;
use App\Services\Evaluacion\IntegridadEvaluacionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use InvalidArgumentException;

class GestionEspacialService
{
    public const ESQUEMA_VERSION = 'v1.0';

    /**
     * Valida y normaliza la estructura geométrica del plano de manera determinista.
     *
     * @param  array<string, mixed>  $datosPlano
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException
     */
    public function normalizarGeometria(array $datosPlano): array
    {
        $this->validarEntradaGeometrica($datosPlano);
        $nivelesRaw = $datosPlano['niveles'] ?? [];

        if (empty($nivelesRaw) || ! is_array($nivelesRaw)) {
            throw new InvalidArgumentException('El plano debe contener al menos un nivel o piso.');
        }

        $nivelesNormalizados = [];
        $codigosPorNivel = [];
        foreach ($nivelesRaw as $nivelRaw) {
            $piso = (int) ($nivelRaw['numero_piso'] ?? 1);
            if (isset($codigosPorNivel[$piso])) {
                throw new InvalidArgumentException('No se permiten números de piso duplicados en un plano.');
            }
            $codigosPorNivel[$piso] = [];
            foreach ($nivelRaw['ambientes'] as $indice => $ambienteRaw) {
                $codigosPorNivel[$piso][] = strtoupper(trim((string) ($ambienteRaw['codigo'] ?? 'AMB-'.($indice + 1))));
            }
        }

        foreach ($nivelesRaw as $nivel) {
            $numeroPiso = (int) ($nivel['numero_piso'] ?? 1);
            $nombreNivel = trim((string) ($nivel['nombre'] ?? "Piso {$numeroPiso}"));
            $alturaMetros = isset($nivel['altura_metros']) && $nivel['altura_metros'] !== null && $nivel['altura_metros'] !== ''
                ? round((float) $nivel['altura_metros'], 2)
                : null;
            $orden = (int) ($nivel['orden'] ?? 1);

            if ($alturaMetros !== null && $alturaMetros < 0) {
                throw new InvalidArgumentException("La altura del nivel [{$nombreNivel}] no puede ser negativa.");
            }

            $ambientesRaw = $nivel['ambientes'] ?? [];
            if (empty($ambientesRaw) || ! is_array($ambientesRaw)) {
                throw new InvalidArgumentException("El nivel [{$nombreNivel}] debe contener al menos un ambiente o zona.");
            }

            $ambientesNormalizados = [];
            $codigosAmbientes = [];

            foreach ($ambientesRaw as $amb) {
                $codigo = strtoupper(trim((string) ($amb['codigo'] ?? 'AMB-'.(count($ambientesNormalizados) + 1))));
                if (in_array($codigo, $codigosAmbientes, true)) {
                    throw new InvalidArgumentException("Código de ambiente duplicado [{$codigo}] en el nivel [{$nombreNivel}].");
                }
                $codigosAmbientes[] = $codigo;

                $nombreAmbiente = trim((string) ($amb['nombre'] ?? $codigo));
                $uso = strtoupper(trim((string) ($amb['uso'] ?? 'ATENCION_PUBLICO')));
                $ancho = isset($amb['ancho_metros']) && $amb['ancho_metros'] !== null && $amb['ancho_metros'] !== ''
                    ? round((float) $amb['ancho_metros'], 2)
                    : null;
                $largo = isset($amb['largo_metros']) && $amb['largo_metros'] !== null && $amb['largo_metros'] !== ''
                    ? round((float) $amb['largo_metros'], 2)
                    : null;
                $posX = round((float) ($amb['posicion_x'] ?? 0.0), 2);
                $posY = round((float) ($amb['posicion_y'] ?? 0.0), 2);

                if ($ancho !== null && $ancho < 0) {
                    throw new InvalidArgumentException("El ancho del ambiente [{$codigo}] no puede ser negativo.");
                }
                if ($largo !== null && $largo < 0) {
                    throw new InvalidArgumentException("El largo del ambiente [{$codigo}] no puede ser negativo.");
                }

                $verticesRaw = $amb['vertices_poligono'] ?? [];
                $verticesNormalizados = [];

                if (! empty($verticesRaw) && is_array($verticesRaw)) {
                    if (count($verticesRaw) < 3) {
                        throw new InvalidArgumentException("El polígono del ambiente [{$codigo}] debe tener al menos 3 vértices.");
                    }

                    foreach ($verticesRaw as $v) {
                        if (! isset($v['x'], $v['y'])) {
                            throw new InvalidArgumentException("Coordenada de vértice inválida en el ambiente [{$codigo}].");
                        }
                        $verticesNormalizados[] = [
                            'x' => round((float) $v['x'], 2),
                            'y' => round((float) $v['y'], 2),
                        ];
                    }

                    // Validar que el polígono no se autointerseque
                    if ($this->poligonoSeAutointerseca($verticesNormalizados)) {
                        throw new InvalidArgumentException("El polígono del ambiente [{$codigo}] contiene aristas autointersecadas.");
                    }

                    $areaCalculada = self::calcularAreaPoligono($verticesNormalizados);
                } else {
                    // Rectangular por defecto
                    if ($ancho === null || $largo === null || $ancho <= 0 || $largo <= 0) {
                        throw new InvalidArgumentException("El ambiente rectangular [{$codigo}] requiere ancho y largo mayores a cero.");
                    }
                    $areaCalculada = round($ancho * $largo, 2);
                    $verticesNormalizados = [
                        ['x' => $posX, 'y' => $posY],
                        ['x' => round($posX + $ancho, 2), 'y' => $posY],
                        ['x' => round($posX + $ancho, 2), 'y' => round($posY + $largo, 2)],
                        ['x' => $posX, 'y' => round($posY + $largo, 2)],
                    ];
                }

                if (! is_finite($areaCalculada) || $areaCalculada <= 0.0 || $areaCalculada > 999999.99) {
                    throw new InvalidArgumentException("El área calculada para el ambiente [{$codigo}] debe ser estrictamente positiva.");
                }

                $origenDimensiones = strtoupper(trim((string) ($amb['origen_dimensiones'] ?? 'DECLARADO_MANUAL')));

                // Elementos espaciales del ambiente
                $elementosRaw = $amb['elementos'] ?? [];
                $elementosNormalizados = [];

                if (is_array($elementosRaw)) {
                    foreach ($elementosRaw as $elem) {
                        $tipoElem = strtoupper(trim((string) ($elem['tipo'] ?? 'OTRO')));
                        $elemX = round((float) ($elem['posicion_x'] ?? 0.0), 2);
                        $elemY = round((float) ($elem['posicion_y'] ?? 0.0), 2);
                        $elemOrigen = strtoupper(trim((string) ($elem['origen_dato'] ?? 'DECLARADO_MANUAL')));
                        $elemObs = isset($elem['observacion']) ? trim((string) $elem['observacion']) : null;
                        $subsanacionId = isset($elem['subsanacion_id']) ? (int) $elem['subsanacion_id'] : null;

                        $elementosNormalizados[] = [
                            'tipo' => $tipoElem,
                            'posicion_x' => $elemX,
                            'posicion_y' => $elemY,
                            'origen_dato' => $elemOrigen,
                            'subsanacion_id' => $subsanacionId,
                            'observacion' => $elemObs,
                        ];
                    }

                    // Ordenar deterministamente los elementos por tipo y posición
                    usort($elementosNormalizados, fn ($a, $b) => strcmp($a['tipo'], $b['tipo']) ?: ($a['posicion_x'] <=> $b['posicion_x']) ?: ($a['posicion_y'] <=> $b['posicion_y']));
                }

                $ambientesNormalizados[] = [
                    'codigo' => $codigo,
                    'nombre' => $nombreAmbiente,
                    'uso' => $uso,
                    'ancho_metros' => $ancho,
                    'largo_metros' => $largo,
                    'area_m2' => $areaCalculada,
                    'posicion_x' => $posX,
                    'posicion_y' => $posY,
                    'vertices_poligono' => $verticesNormalizados,
                    'origen_dimensiones' => $origenDimensiones,
                    'notas' => isset($amb['notas']) ? trim((string) $amb['notas']) : null,
                    'elementos' => $elementosNormalizados,
                ];
            }

            // Ordenar ambientes deterministamente por código
            usort($ambientesNormalizados, fn ($a, $b) => strcmp($a['codigo'], $b['codigo']));

            // Conectores del nivel
            $conectoresRaw = $nivel['conectores'] ?? [];
            $conectoresNormalizados = [];

            if (is_array($conectoresRaw)) {
                foreach ($conectoresRaw as $con) {
                    $tipoCon = strtoupper(trim((string) ($con['tipo'] ?? 'PUERTA_INTERIOR')));
                    $anchoCon = isset($con['ancho_metros']) ? round((float) $con['ancho_metros'], 2) : 0.90;
                    if ($anchoCon <= 0) {
                        throw new InvalidArgumentException("El ancho del conector [{$tipoCon}] debe ser mayor a cero.");
                    }

                    $salidaPublica = (bool) ($con['conduce_a_salida_publica'] ?? ($tipoCon === 'PUERTA_SALIDA'));
                    $abreAfuera = isset($con['abre_hacia_afuera']) ? (bool) $con['abre_hacia_afuera'] : null;
                    $conPosX = round((float) ($con['posicion_x'] ?? 0.0), 2);
                    $conPosY = round((float) ($con['posicion_y'] ?? 0.0), 2);

                    $origCod = isset($con['ambiente_origen_codigo']) ? strtoupper(trim((string) $con['ambiente_origen_codigo'])) : null;
                    $destCod = isset($con['ambiente_destino_codigo']) ? strtoupper(trim((string) $con['ambiente_destino_codigo'])) : null;
                    $nivelDest = isset($con['nivel_destino_numero']) ? (int) $con['nivel_destino_numero'] : null;

                    if ($origCod !== null && ! in_array($origCod, $codigosAmbientes, true)) {
                        throw new InvalidArgumentException("El conector hace referencia a un ambiente de origen inexistente [{$origCod}] en el nivel.");
                    }
                    $esVertical = in_array($tipoCon, ['ESCALERA', 'CONEXION_NIVEL'], true);
                    $codigosDestino = $esVertical && $nivelDest !== null ? ($codigosPorNivel[$nivelDest] ?? []) : $codigosAmbientes;
                    if ($destCod !== null && ! in_array($destCod, $codigosDestino, true)) {
                        throw new InvalidArgumentException("El conector hace referencia a un ambiente de destino inexistente [{$destCod}] en el nivel.");
                    }

                    $conectoresNormalizados[] = [
                        'tipo' => $tipoCon,
                        'ancho_metros' => $anchoCon,
                        'conduce_a_salida_publica' => $salidaPublica,
                        'abre_hacia_afuera' => $abreAfuera,
                        'ambiente_origen_codigo' => $origCod,
                        'ambiente_destino_codigo' => $destCod,
                        'nivel_destino_numero' => $nivelDest,
                        'posicion_x' => $conPosX,
                        'posicion_y' => $conPosY,
                        'origen_dato' => strtoupper(trim((string) ($con['origen_dato'] ?? 'DECLARADO_MANUAL'))),
                    ];
                }

                // Ordenar conectores deterministamente por tipo y coordenadas
                usort($conectoresNormalizados, fn ($a, $b) => strcmp($a['tipo'], $b['tipo']) ?: ($a['posicion_x'] <=> $b['posicion_x']) ?: ($a['posicion_y'] <=> $b['posicion_y']));
            }

            $nivelesNormalizados[] = [
                'numero_piso' => $numeroPiso,
                'nombre' => $nombreNivel,
                'altura_metros' => $alturaMetros,
                'orden' => $orden,
                'ambientes' => $ambientesNormalizados,
                'conectores' => $conectoresNormalizados,
            ];
        }

        // Ordenar niveles por numero_piso
        usort($nivelesNormalizados, fn ($a, $b) => $a['numero_piso'] <=> $b['numero_piso']);

        return [
            'esquema_version' => self::ESQUEMA_VERSION,
            'niveles' => $nivelesNormalizados,
        ];
    }

    /**
     * Calcula el hash SHA-256 determinista de la geometría normalizada.
     *
     * @param  array<string, mixed>  $geometriaNormalizada
     */
    public function calcularHashGeometria(array $geometriaNormalizada): string
    {
        $json = json_encode($geometriaNormalizada, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        return hash('sha256', (string) $json);
    }

    /**
     * Obtiene o inicializa el plano del establecimiento para una autoevaluación.
     */
    public function obtenerOInicializarPlano(Autoevaluacion $autoevaluacion): PlanoEstablecimiento
    {
        return PlanoEstablecimiento::firstOrCreate(
            ['autoevaluacion_id' => $autoevaluacion->id],
            ['estado' => PlanoEstablecimiento::ESTADO_BORRADOR]
        );
    }

    /**
     * Crea transaccionalmente una nueva versión inmutable del plano.
     * Si la geometría es idéntica a la versión activa actual, retorna la versión existente.
     *
     * @param  array<string, mixed>  $datosPlano
     *
     * @throws InvalidArgumentException
     */
    public function crearOActualizarVersion(
        PlanoEstablecimiento $plano,
        array $datosPlano,
        ?User $user = null,
        ?string $sessionToken = null,
        ?string $descripcionCambio = null
    ): VersionPlano {
        return DB::transaction(function () use ($plano, $datosPlano, $user, $sessionToken, $descripcionCambio) {
            $geometriaNormalizada = $this->normalizarGeometria($datosPlano);
            $subsanaciones = [];
            foreach ($geometriaNormalizada['niveles'] as $nivel) {
                foreach ($nivel['ambientes'] as $ambiente) {
                    foreach ($ambiente['elementos'] as $elemento) {
                        if ($elemento['subsanacion_id'] !== null) {
                            $subsanaciones[] = $elemento['subsanacion_id'];
                        }
                    }
                }
            }
            $subsanaciones = array_unique($subsanaciones);
            if ($subsanaciones && Subsanacion::whereIn('id', $subsanaciones)->where('autoevaluacion_id', $plano->autoevaluacion_id)->count() !== count($subsanaciones)) {
                throw new InvalidArgumentException('Las evidencias vinculadas deben pertenecer a la autoevaluación del plano.');
            }
            $hashCalculado = $this->calcularHashGeometria($geometriaNormalizada);

            // Bloquear el plano para actualización concurrente
            $planoActualizado = PlanoEstablecimiento::where('id', $plano->id)->lockForUpdate()->firstOrFail();

            /** @var VersionPlano|null $versionActiva */
            $versionActiva = $planoActualizado->versionActiva;

            // Idempotencia: si la versión activa ya tiene este hash idéntico, no duplicar versión
            if ($versionActiva && hash_equals($versionActiva->hash_geometria_sha256, $hashCalculado)
                && $this->verificarIntegridadCompleta($versionActiva)['valido']) {
                return $versionActiva;
            }

            // Si hay una versión activa anterior, marcarla como cerrada
            if ($versionActiva && ! $versionActiva->estaCerrada()) {
                $versionActiva->cerrada_at = now();
                $versionActiva->save();
            }

            $siguienteNumero = ((int) VersionPlano::where('plano_establecimiento_id', $planoActualizado->id)->max('numero_version')) + 1;

            $nuevaVersion = VersionPlano::create([
                'plano_establecimiento_id' => $planoActualizado->id,
                'numero_version' => $siguienteNumero,
                'hash_geometria_sha256' => $hashCalculado,
                'esquema_version' => self::ESQUEMA_VERSION,
                'descripcion_cambio' => $descripcionCambio ?? "Versión {$siguienteNumero} guardada por el ciudadano",
                'geometria_normalizada' => $geometriaNormalizada,
                'metadata' => [
                    'ip' => request()?->ip(),
                    'user_agent' => substr((string) request()?->userAgent(), 0, 255),
                    'total_niveles' => count($geometriaNormalizada['niveles']),
                ],
                'user_id' => $user?->id,
                'session_token' => $sessionToken,
            ]);

            // Persistir la estructura normalizada en tablas relacionales hijas
            $this->persistirEstructuraRelacional($nuevaVersion, $geometriaNormalizada);

            // Actualizar la versión activa en el plano
            $planoActualizado->version_activa_id = $nuevaVersion->id;
            $planoActualizado->estado = PlanoEstablecimiento::ESTADO_CONSOLIDADO;
            $planoActualizado->save();

            return $nuevaVersion;
        });
    }

    /**
     * Confirma explícitamente un elemento ilustrativo de plantilla, convirtiéndolo
     * en una declaración ciudadana (DECLARADO_MANUAL) y creando una nueva versión inmutable.
     *
     * @throws InvalidArgumentException
     */
    public function confirmarElementoIlustrativo(
        PlanoEstablecimiento $plano,
        string $codigoAmbiente,
        int $indiceElemento,
        ?User $user = null,
        ?string $sessionToken = null
    ): VersionPlano {
        $versionActiva = $plano->fresh()->versionActiva;
        if (! $versionActiva) {
            throw new InvalidArgumentException('El plano no cuenta con una versión activa para confirmar elementos.');
        }

        $geometria = $versionActiva->geometria_normalizada;
        $encontrado = false;
        $tipoElemento = 'ELEMENTO';

        foreach ($geometria['niveles'] as &$nivel) {
            foreach ($nivel['ambientes'] as &$ambiente) {
                if ($ambiente['codigo'] === $codigoAmbiente) {
                    if (! isset($ambiente['elementos'][$indiceElemento])) {
                        throw new InvalidArgumentException("El índice de elemento [{$indiceElemento}] no existe en el ambiente [{$codigoAmbiente}].");
                    }

                    $elemento = &$ambiente['elementos'][$indiceElemento];
                    $tipoElemento = $elemento['tipo'] ?? 'ELEMENTO';
                    $elemento['origen_dato'] = ElementoEspacial::ORIGEN_DECLARADO_MANUAL;
                    $elemento['observacion'] = trim(($elemento['observacion'] ?? '').' [Confirmado físicamente por el ciudadano]');
                    $encontrado = true;
                    break 2;
                }
            }
        }
        unset($nivel, $ambiente, $elemento);

        if (! $encontrado) {
            throw new InvalidArgumentException("No se encontró el ambiente con código [{$codigoAmbiente}] en la versión activa.");
        }

        $descripcion = "Confirmación ciudadana de existencia física para elemento de plantilla: {$tipoElemento} en {$codigoAmbiente}";

        return $this->crearOActualizarVersion($plano, $geometria, $user, $sessionToken, $descripcion);
    }

    /**
     * Persiste los registros en las tablas hijas a partir de la geometría normalizada.
     *
     * @param  array<string, mixed>  $geometriaNormalizada
     */
    private function persistirEstructuraRelacional(VersionPlano $version, array $geometriaNormalizada): void
    {
        $nivelesMap = []; // numero_piso => NivelPiso->id
        $ambientesMap = []; // codigo => AmbienteZona->id

        foreach ($geometriaNormalizada['niveles'] as $nivelData) {
            $nivelPiso = NivelPiso::create([
                'version_plano_id' => $version->id,
                'numero_piso' => $nivelData['numero_piso'],
                'nombre' => $nivelData['nombre'],
                'altura_metros' => $nivelData['altura_metros'],
                'orden' => $nivelData['orden'],
            ]);

            $nivelesMap[$nivelData['numero_piso']] = $nivelPiso->id;

            foreach ($nivelData['ambientes'] as $ambData) {
                $ambiente = AmbienteZona::create([
                    'nivel_piso_id' => $nivelPiso->id,
                    'codigo' => $ambData['codigo'],
                    'nombre' => $ambData['nombre'],
                    'uso' => $ambData['uso'],
                    'ancho_metros' => $ambData['ancho_metros'],
                    'largo_metros' => $ambData['largo_metros'],
                    'area_m2' => $ambData['area_m2'],
                    'posicion_x' => $ambData['posicion_x'],
                    'posicion_y' => $ambData['posicion_y'],
                    'vertices_poligono' => $ambData['vertices_poligono'],
                    'origen_dimensiones' => $ambData['origen_dimensiones'],
                    'notas' => $ambData['notas'],
                ]);

                $ambientesMap[$nivelData['numero_piso'].'|'.$ambData['codigo']] = $ambiente->id;

                foreach ($ambData['elementos'] as $elemData) {
                    ElementoEspacial::create([
                        'ambiente_id' => $ambiente->id,
                        'tipo' => $elemData['tipo'],
                        'posicion_x' => $elemData['posicion_x'],
                        'posicion_y' => $elemData['posicion_y'],
                        'subsanacion_id' => $elemData['subsanacion_id'],
                        'origen_dato' => $elemData['origen_dato'],
                        'observacion' => $elemData['observacion'],
                    ]);
                }
            }

        }

        foreach ($geometriaNormalizada['niveles'] as $nivelData) {
            foreach ($nivelData['conectores'] as $conData) {
                ConectorCirculacion::create([
                    'nivel_piso_id' => $nivelesMap[$nivelData['numero_piso']],
                    'tipo' => $conData['tipo'],
                    'ancho_metros' => $conData['ancho_metros'],
                    'conduce_a_salida_publica' => $conData['conduce_a_salida_publica'],
                    'abre_hacia_afuera' => $conData['abre_hacia_afuera'],
                    'ambiente_origen_id' => $conData['ambiente_origen_codigo'] ? ($ambientesMap[$nivelData['numero_piso'].'|'.$conData['ambiente_origen_codigo']] ?? null) : null,
                    'ambiente_destino_id' => $conData['ambiente_destino_codigo'] ? ($ambientesMap[($conData['nivel_destino_numero'] ?? $nivelData['numero_piso']).'|'.$conData['ambiente_destino_codigo']] ?? null) : null,
                    'nivel_destino_id' => $conData['nivel_destino_numero'] !== null ? ($nivelesMap[$conData['nivel_destino_numero']] ?? null) : null,
                    'posicion_x' => $conData['posicion_x'],
                    'posicion_y' => $conData['posicion_y'],
                    'origen_dato' => $conData['origen_dato'],
                ]);
            }
        }
    }

    /**
     * Verifica la integridad criptográfica de una versión recalculando su hash.
     */
    public function verificarIntegridadVersion(VersionPlano $version): bool
    {
        $hashRecalculado = $this->calcularHashGeometria($version->geometria_normalizada);

        return hash_equals($version->hash_geometria_sha256, $hashRecalculado);
    }

    /**
     * Realiza una auditoría exhaustiva de integridad criptográfica, estructural y relacional sobre una versión.
     *
     * @return array{
     *     valido: bool,
     *     hash_coincide: bool,
     *     hash_almacenado: string,
     *     hash_calculado: string,
     *     estructura_valida: bool,
     *     divergencia_relacional: bool,
     *     errores: list<string>,
     *     detalles_divergencia: array<string, mixed>
     * }
     */
    public function verificarIntegridadCompleta(VersionPlano $version): array
    {
        $errores = [];
        $geometria = $version->geometria_normalizada;

        // 1. Verificación Criptográfica SHA-256
        try {
            $hashCalculado = is_array($geometria) ? $this->calcularHashGeometria($geometria) : '';
        } catch (\JsonException) {
            $hashCalculado = '';
        }
        $hashCoincide = hash_equals((string) $version->hash_geometria_sha256, $hashCalculado);

        if (! $hashCoincide) {
            $errores[] = "Fallo de integridad criptográfica: el hash de la versión {$version->numero_version} no coincide con la geometría almacenada.";
        }

        // 2. Verificación Estructural del Esquema
        $estructuraValida = true;
        try {
            if (is_array($geometria)) {
                $this->validarEntradaGeometrica($geometria);
            }
        } catch (InvalidArgumentException) {
            $estructuraValida = false;
        }
        if (! $estructuraValida || ! is_array($geometria) || empty($geometria['niveles']) || ! is_array($geometria['niveles'])) {
            $estructuraValida = false;
            $errores[] = 'Estructura geométrica inválida: falta el listado de niveles.';
        } else {
            $jsonTotalNiveles = count($geometria['niveles']);
            $jsonTotalAmbientes = 0;
            $jsonTotalConectores = 0;
            $jsonTotalElementos = 0;

            foreach ($geometria['niveles'] as $idxNivel => $nivel) {
                if (! isset($nivel['numero_piso'])) {
                    $estructuraValida = false;
                    $errores[] = "El nivel en índice [{$idxNivel}] no contiene número de piso.";
                }

                $ambientes = $nivel['ambientes'] ?? [];
                if (! is_array($ambientes) || empty($ambientes)) {
                    $estructuraValida = false;
                    $errores[] = 'El nivel [Piso '.($nivel['numero_piso'] ?? $idxNivel).'] no tiene ambientes declarados.';

                    continue;
                }

                $jsonTotalAmbientes += count($ambientes);

                foreach ($ambientes as $amb) {
                    if (empty($amb['codigo'])) {
                        $estructuraValida = false;
                        $errores[] = 'Se detectó un ambiente sin código identificador.';
                    }
                    $jsonTotalElementos += count($amb['elementos'] ?? []);
                }

                $conectores = $nivel['conectores'] ?? [];
                if (is_array($conectores)) {
                    $jsonTotalConectores += count($conectores);
                    foreach ($conectores as $con) {
                        if (empty($con['tipo']) || ! isset($con['posicion_x'], $con['posicion_y'])) {
                            $estructuraValida = false;
                            $errores[] = 'Se detectó un conector con tipo o coordenadas incompletas.';
                        }
                    }
                }
            }
        }

        // 3. Verificación de Divergencia Relacional
        $divergenciaRelacional = false;
        $detallesDivergencia = [];

        if ($estructuraValida && $version->exists) {
            $nivelesIds = NivelPiso::where('version_plano_id', $version->id)->pluck('id')->all();
            $sqlTotalNiveles = count($nivelesIds);

            if ($sqlTotalNiveles > 0) {
                $ambientesIds = AmbienteZona::whereIn('nivel_piso_id', $nivelesIds)->pluck('id')->all();
                $sqlTotalAmbientes = count($ambientesIds);
                $sqlTotalConectores = ConectorCirculacion::whereIn('nivel_piso_id', $nivelesIds)->count();
                $sqlTotalElementos = ElementoEspacial::whereIn('ambiente_id', $ambientesIds)->count();

                $detallesDivergencia = [
                    'json_niveles' => $jsonTotalNiveles ?? 0,
                    'sql_niveles' => $sqlTotalNiveles,
                    'json_ambientes' => $jsonTotalAmbientes ?? 0,
                    'sql_ambientes' => $sqlTotalAmbientes,
                    'json_conectores' => $jsonTotalConectores ?? 0,
                    'sql_conectores' => $sqlTotalConectores,
                    'json_elementos' => $jsonTotalElementos ?? 0,
                    'sql_elementos' => $sqlTotalElementos,
                ];

                if (
                    $sqlTotalNiveles !== ($jsonTotalNiveles ?? 0) ||
                    $sqlTotalAmbientes !== ($jsonTotalAmbientes ?? 0) ||
                    $sqlTotalConectores !== ($jsonTotalConectores ?? 0) ||
                    $sqlTotalElementos !== ($jsonTotalElementos ?? 0)
                ) {
                    $divergenciaRelacional = true;
                    $errores[] = 'Divergencia detectada entre la geometría JSON canónica y los registros relacionales en base de datos.';
                }
            }

            $canonico = app(IntegridadEvaluacionService::class);
            if (($sqlTotalNiveles > 0 || isset($version->metadata['total_niveles']))
                && $canonico->generarJsonCanonico($this->reconstruirGeometriaRelacional($version)) !== $canonico->generarJsonCanonico($geometria)) {
                $divergenciaRelacional = true;
                $errores[] = 'Los valores relacionales no coinciden con el snapshot geométrico sellado.';
            }
        }

        return [
            'valido' => $hashCoincide && $estructuraValida && ! $divergenciaRelacional,
            'hash_coincide' => $hashCoincide,
            'hash_almacenado' => (string) $version->hash_geometria_sha256,
            'hash_calculado' => $hashCalculado,
            'estructura_valida' => $estructuraValida,
            'divergencia_relacional' => $divergenciaRelacional,
            'errores' => $errores,
            'detalles_divergencia' => $detallesDivergencia,
        ];
    }

    /**
     * Retorna la versión activa de una autoevaluación o null si aún no tiene croquis.
     *
     * @return array<string, mixed>|null
     */
    public function obtenerDetalleVersionActiva(Autoevaluacion $autoevaluacion): ?array
    {
        $plano = $autoevaluacion->planoEstablecimiento;
        if (! $plano || ! $plano->versionActiva) {
            return null;
        }

        $version = $plano->versionActiva;
        if ((int) $version->plano_establecimiento_id !== (int) $plano->id || ! $this->verificarIntegridadCompleta($version)['valido']) {
            throw new \RuntimeException('La versión activa del croquis presenta una asociación o integridad inválida.');
        }

        return [
            'plano_uuid' => $plano->uuid_plano,
            'estado_plano' => $plano->estado,
            'version_id' => $version->id,
            'numero_version' => $version->numero_version,
            'hash_geometria_sha256' => $version->hash_geometria_sha256,
            'esquema_version' => $version->esquema_version,
            'cerrada_at' => $version->cerrada_at?->toIso8601String(),
            'created_at' => $version->created_at?->toIso8601String(),
            'geometria' => $version->geometria_normalizada,
            'total_versiones' => $plano->versiones()->count(),
        ];
    }

    /**
     * Provee plantillas iniciales ortogonales estándar para comerciantes de Huancayo.
     *
     * @return array<string, array<string, mixed>>
     */
    public function obtenerPlantillas(): array
    {
        return [
            'RECTANGULAR_SIMPLE' => [
                'nombre' => 'Local Rectangular Simple (Bodega / Tienda)',
                'descripcion' => 'Un solo ambiente de atención directo a la vía pública.',
                'geometria' => [
                    'niveles' => [
                        [
                            'numero_piso' => 1,
                            'nombre' => 'Piso 1 - Atención',
                            'altura_metros' => 2.80,
                            'ambientes' => [
                                [
                                    'codigo' => 'AMB-01',
                                    'nombre' => 'Salón Comercial Principal',
                                    'uso' => 'ATENCION_PUBLICO',
                                    'ancho_metros' => 4.00,
                                    'largo_metros' => 8.00,
                                    'posicion_x' => 0.00,
                                    'posicion_y' => 0.00,
                                    'origen_dimensiones' => 'DECLARADO_MANUAL',
                                    'elementos' => [
                                        [
                                            'tipo' => 'EXTINTOR',
                                            'posicion_x' => 0.50,
                                            'posicion_y' => 2.00,
                                            'origen_dato' => 'ILUSTRATIVO_PLANTILLA',
                                            'observacion' => 'Extintor PQS 6kg (Referencial de plantilla)',
                                        ],
                                        [
                                            'tipo' => 'SENAL_SALIDA',
                                            'posicion_x' => 2.00,
                                            'posicion_y' => 0.10,
                                            'origen_dato' => 'ILUSTRATIVO_PLANTILLA',
                                            'observacion' => 'Cartel SALIDA sobre puerta (Referencial de plantilla)',
                                        ],
                                    ],
                                ],
                            ],
                            'conectores' => [
                                [
                                    'tipo' => 'PUERTA_SALIDA',
                                    'ancho_metros' => 1.00,
                                    'conduce_a_salida_publica' => true,
                                    'abre_hacia_afuera' => true,
                                    'ambiente_origen_codigo' => 'AMB-01',
                                    'posicion_x' => 2.00,
                                    'posicion_y' => 0.00,
                                    'origen_dato' => 'DECLARADO_MANUAL',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'CON_TRASTIENDA' => [
                'nombre' => 'Local con Trastienda / Almacén Posterior',
                'descripcion' => 'Salón comercial frontal comunicado con almacén o depósito posterior.',
                'geometria' => [
                    'niveles' => [
                        [
                            'numero_piso' => 1,
                            'nombre' => 'Piso 1',
                            'altura_metros' => 2.80,
                            'ambientes' => [
                                [
                                    'codigo' => 'AMB-01',
                                    'nombre' => 'Salón Principal',
                                    'uso' => 'ATENCION_PUBLICO',
                                    'ancho_metros' => 5.00,
                                    'largo_metros' => 7.00,
                                    'posicion_x' => 0.00,
                                    'posicion_y' => 0.00,
                                    'origen_dimensiones' => 'DECLARADO_MANUAL',
                                    'elementos' => [
                                        [
                                            'tipo' => 'EXTINTOR',
                                            'posicion_x' => 0.50,
                                            'posicion_y' => 1.50,
                                            'origen_dato' => 'ILUSTRATIVO_PLANTILLA',
                                            'observacion' => 'Extintor frontal (Referencial de plantilla)',
                                        ],
                                    ],
                                ],
                                [
                                    'codigo' => 'AMB-02',
                                    'nombre' => 'Almacén Posterior',
                                    'uso' => 'ALMACEN',
                                    'ancho_metros' => 5.00,
                                    'largo_metros' => 4.00,
                                    'posicion_x' => 0.00,
                                    'posicion_y' => 7.00,
                                    'origen_dimensiones' => 'DECLARADO_MANUAL',
                                    'elementos' => [
                                        [
                                            'tipo' => 'TABLERO_ELECTRICO',
                                            'posicion_x' => 4.50,
                                            'posicion_y' => 8.00,
                                            'origen_dato' => 'ILUSTRATIVO_PLANTILLA',
                                            'observacion' => 'Tablero general TG (Referencial de plantilla)',
                                        ],
                                    ],
                                ],
                            ],
                            'conectores' => [
                                [
                                    'tipo' => 'PUERTA_SALIDA',
                                    'ancho_metros' => 1.20,
                                    'conduce_a_salida_publica' => true,
                                    'abre_hacia_afuera' => true,
                                    'ambiente_origen_codigo' => 'AMB-01',
                                    'posicion_x' => 2.50,
                                    'posicion_y' => 0.00,
                                    'origen_dato' => 'DECLARADO_MANUAL',
                                ],
                                [
                                    'tipo' => 'PUERTA_INTERIOR',
                                    'ancho_metros' => 0.90,
                                    'conduce_a_salida_publica' => false,
                                    'abre_hacia_afuera' => false,
                                    'ambiente_origen_codigo' => 'AMB-01',
                                    'ambiente_destino_codigo' => 'AMB-02',
                                    'posicion_x' => 2.50,
                                    'posicion_y' => 7.00,
                                    'origen_dato' => 'DECLARADO_MANUAL',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'EN_FORMA_L' => [
                'nombre' => 'Local en Forma de L (Galería / Esquina)',
                'descripcion' => 'Distribución en L ortogonal con circulación en ángulo.',
                'geometria' => [
                    'niveles' => [
                        [
                            'numero_piso' => 1,
                            'nombre' => 'Piso 1 - Nivel Comercial',
                            'altura_metros' => 2.80,
                            'ambientes' => [
                                [
                                    'codigo' => 'AMB-01',
                                    'nombre' => 'Salón en L',
                                    'uso' => 'ATENCION_PUBLICO',
                                    'posicion_x' => 0.00,
                                    'posicion_y' => 0.00,
                                    'vertices_poligono' => [
                                        ['x' => 0.00, 'y' => 0.00],
                                        ['x' => 7.00, 'y' => 0.00],
                                        ['x' => 7.00, 'y' => 4.00],
                                        ['x' => 4.00, 'y' => 4.00],
                                        ['x' => 4.00, 'y' => 9.00],
                                        ['x' => 0.00, 'y' => 9.00],
                                    ],
                                    'origen_dimensiones' => 'DECLARADO_MANUAL',
                                    'elementos' => [
                                        [
                                            'tipo' => 'EXTINTOR',
                                            'posicion_x' => 0.50,
                                            'posicion_y' => 1.00,
                                            'origen_dato' => 'ILUSTRATIVO_PLANTILLA',
                                            'observacion' => 'Extintor cerca a puerta (Referencial de plantilla)',
                                        ],
                                        [
                                            'tipo' => 'LUZ_EMERGENCIA',
                                            'posicion_x' => 3.80,
                                            'posicion_y' => 4.50,
                                            'origen_dato' => 'ILUSTRATIVO_PLANTILLA',
                                            'observacion' => 'Luz en cambio de dirección (Referencial de plantilla)',
                                        ],
                                    ],
                                ],
                            ],
                            'conectores' => [
                                [
                                    'tipo' => 'PUERTA_SALIDA',
                                    'ancho_metros' => 1.20,
                                    'conduce_a_salida_publica' => true,
                                    'abre_hacia_afuera' => true,
                                    'ambiente_origen_codigo' => 'AMB-01',
                                    'posicion_x' => 3.50,
                                    'posicion_y' => 0.00,
                                    'origen_dato' => 'DECLARADO_MANUAL',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * Calcula el área de un polígono 2D simple mediante la fórmula de Shoelace (Gauss).
     *
     * @param  list<array{x: float, y: float}>  $vertices
     */
    public static function calcularAreaPoligono(array $vertices): float
    {
        $n = count($vertices);
        if ($n < 3) {
            return 0.0;
        }

        $area = 0.0;
        $origen = $vertices[0];
        for ($i = 0; $i < $n; $i++) {
            $j = ($i + 1) % $n;
            $area += (($vertices[$i]['x'] - $origen['x']) * ($vertices[$j]['y'] - $origen['y']))
                - (($vertices[$j]['x'] - $origen['x']) * ($vertices[$i]['y'] - $origen['y']));
        }

        return round(abs($area) / 2.0, 2);
    }

    /**
     * Comprueba si los segmentos consecutivos de un polígono se autointersecan.
     *
     * @param  list<array{x: float, y: float}>  $vertices
     */
    private function poligonoSeAutointerseca(array $vertices): bool
    {
        $n = count($vertices);
        if ($n < 4) {
            return false;
        }

        for ($i = 0; $i < $n; $i++) {
            $p1 = $vertices[$i];
            $p2 = $vertices[($i + 1) % $n];

            // Comparar contra aristas no adyacentes
            for ($j = $i + 2; $j < $n; $j++) {
                if ($i === 0 && $j === $n - 1) {
                    continue; // Adyacente por cierre del polígono
                }

                $p3 = $vertices[$j];
                $p4 = $vertices[($j + 1) % $n];

                if ($this->segmentosSeIntersecan($p1, $p2, $p3, $p4)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Determina si dos segmentos cerrados [p1, p2] y [p3, p4] se cruzan en el plano.
     *
     * @param  array{x: float, y: float}  $p1
     * @param  array{x: float, y: float}  $p2
     * @param  array{x: float, y: float}  $p3
     * @param  array{x: float, y: float}  $p4
     */
    private function segmentosSeIntersecan(array $p1, array $p2, array $p3, array $p4): bool
    {
        $ccw = function (array $a, array $b, array $c): float {
            $ax = (int) round($a['x'] * 100);
            $ay = (int) round($a['y'] * 100);
            $bx = (int) round($b['x'] * 100);
            $by = (int) round($b['y'] * 100);
            $cx = (int) round($c['x'] * 100);
            $cy = (int) round($c['y'] * 100);

            return ($cy - $ay) * ($bx - $ax) - ($by - $ay) * ($cx - $ax);
        };

        $d1 = $ccw($p3, $p4, $p1);
        $d2 = $ccw($p3, $p4, $p2);
        $d3 = $ccw($p1, $p2, $p3);
        $d4 = $ccw($p1, $p2, $p4);

        if ((($d1 > 0 && $d2 < 0) || ($d1 < 0 && $d2 > 0)) &&
            (($d3 > 0 && $d4 < 0) || ($d3 < 0 && $d4 > 0))) {
            return true;
        }

        $enSegmento = fn (array $p, array $a, array $b): bool => $p['x'] >= min($a['x'], $b['x'])
            && $p['x'] <= max($a['x'], $b['x']) && $p['y'] >= min($a['y'], $b['y']) && $p['y'] <= max($a['y'], $b['y']);

        return ($d1 === 0.0 && $enSegmento($p1, $p3, $p4))
            || ($d2 === 0.0 && $enSegmento($p2, $p3, $p4))
            || ($d3 === 0.0 && $enSegmento($p3, $p1, $p2))
            || ($d4 === 0.0 && $enSegmento($p4, $p1, $p2));
    }

    private function validarEntradaGeometrica(array $datos): void
    {
        $finito = function (string $campo, mixed $valor, \Closure $fallo): void {
            if (! is_numeric($valor) || ! is_finite((float) $valor)) {
                $fallo("El campo {$campo} debe ser numérico y finito.");
            }
        };
        $coordenada = ['sometimes', 'numeric', 'between:-9999.99,9999.99', $finito];
        $reglas = [
            'niveles' => ['required', 'array', 'min:1'],
            'niveles.*' => ['required', 'array'],
            'niveles.*.numero_piso' => ['sometimes', 'integer', 'between:-2147483648,2147483647'],
            'niveles.*.orden' => ['sometimes', 'integer'],
            'niveles.*.altura_metros' => ['nullable', 'numeric', 'between:0,99.99', $finito],
            'niveles.*.ambientes' => ['required', 'array', 'min:1'],
            'niveles.*.ambientes.*' => ['required', 'array'],
            'niveles.*.conectores' => ['sometimes', 'array'],
            'niveles.*.conectores.*' => ['required', 'array'],
            'niveles.*.conectores.*.ancho_metros' => ['nullable', 'numeric', 'gt:0', 'max:99.99', $finito],
            'niveles.*.conectores.*.conduce_a_salida_publica' => ['nullable', 'boolean'],
            'niveles.*.conectores.*.abre_hacia_afuera' => ['nullable', 'boolean'],
            'niveles.*.conectores.*.nivel_destino_numero' => ['nullable', 'integer'],
            'niveles.*.ambientes.*.vertices_poligono' => ['nullable', 'array'],
            'niveles.*.ambientes.*.vertices_poligono.*' => ['required', 'array'],
            'niveles.*.ambientes.*.elementos' => ['sometimes', 'array'],
            'niveles.*.ambientes.*.elementos.*' => ['required', 'array'],
        ];
        foreach (['ancho_metros', 'largo_metros'] as $campo) {
            $reglas['niveles.*.ambientes.*.'.$campo] = ['nullable', 'numeric', 'between:0,9999.99', $finito];
        }
        foreach (['posicion_x', 'posicion_y'] as $campo) {
            foreach (['ambientes.*', 'conectores.*', 'ambientes.*.elementos.*'] as $ruta) {
                $reglas['niveles.*.'.$ruta.'.'.$campo] = $coordenada;
            }
        }
        foreach (['x', 'y'] as $eje) {
            $reglas['niveles.*.ambientes.*.vertices_poligono.*.'.$eje] = ['required', 'numeric', $finito];
        }
        $validador = Validator::make($datos, $reglas);
        if ($validador->fails()) {
            throw new InvalidArgumentException($validador->errors()->first());
        }
    }

    private function reconstruirGeometriaRelacional(VersionPlano $version): array
    {
        $niveles = $version->niveles()->orderBy('numero_piso')->with([
            'ambientes' => fn ($q) => $q->orderBy('codigo'),
            'ambientes.elementos' => fn ($q) => $q->orderBy('id'),
            'conectores' => fn ($q) => $q->orderBy('id'),
        ])->get()->sortBy('numero_piso')->values();
        $ambientes = $niveles->flatMap(fn ($n) => $n->ambientes)->keyBy('id');
        $nivelesPorId = $niveles->keyBy('id');

        return ['esquema_version' => $version->esquema_version, 'niveles' => $niveles->map(function ($nivel) use ($ambientes, $nivelesPorId): array {
            $data = $nivel->only(['numero_piso', 'nombre', 'altura_metros', 'orden']);
            $data['ambientes'] = $nivel->ambientes->map(function ($ambiente): array {
                $data = $ambiente->only(['codigo', 'nombre', 'uso', 'ancho_metros', 'largo_metros', 'area_m2', 'posicion_x', 'posicion_y', 'vertices_poligono', 'origen_dimensiones', 'notas']);
                $data['elementos'] = $ambiente->elementos->map(fn ($elemento) => $elemento->only(['tipo', 'posicion_x', 'posicion_y', 'origen_dato', 'subsanacion_id', 'observacion']))->all();

                return $data;
            })->all();
            $data['conectores'] = $nivel->conectores->map(function ($conector) use ($ambientes, $nivelesPorId): array {
                $origen = $ambientes->get($conector->ambiente_origen_id);
                $destino = $ambientes->get($conector->ambiente_destino_id);
                if (($origen && (int) $origen->nivel_piso_id !== (int) $conector->nivel_piso_id)
                    || ($destino && (int) $destino->nivel_piso_id !== (int) ($conector->nivel_destino_id ?? $conector->nivel_piso_id))) {
                    return ['referencia_relacional_invalida' => true];
                }

                return $conector->only(['tipo', 'ancho_metros', 'conduce_a_salida_publica', 'abre_hacia_afuera', 'posicion_x', 'posicion_y', 'origen_dato']) + [
                    'ambiente_origen_codigo' => $ambientes->get($conector->ambiente_origen_id)?->codigo,
                    'ambiente_destino_codigo' => $ambientes->get($conector->ambiente_destino_id)?->codigo,
                    'nivel_destino_numero' => $nivelesPorId->get($conector->nivel_destino_id)?->numero_piso,
                ];
            })->all();

            return $data;
        })->all()];
    }
}
