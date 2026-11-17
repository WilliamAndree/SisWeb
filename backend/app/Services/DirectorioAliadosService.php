<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ProveedorRecurso;
use Throwable;

/**
 * Directorio referencial y tipado de especialistas y empresas de seguridad
 * del Valle del Mantaro (Huancayo, El Tambo, Chilca).
 *
 * Los registros son datos comunitarios orientativos para que el ciudadano
 * encuentre apoyo cercano; no constituyen recomendación oficial, certificación
 * ni relación con la inspección ITSE. Categorías técnicas:
 *
 * - electricas: electricistas colegiados, protocolos de pozo a tierra, tableros y diferenciales.
 * - incendios: recarga y venta de extintores PQS y Clase K, detectores de humo.
 * - arquitectura_senaletica: luces de emergencia, señalética Celtex (NTP 399.010-1), cintas antideslizantes.
 * - estructuras: anclaje sismorresistente de estanterías y peritaje básico.
 *
 * La fuente canónica de costos por criterio es ItseRiskService::COSTOS_REFERENCIALES;
 * este servicio sólo deriva el rango de referencia alrededor de ese valor.
 *
 * @phpstan-type Aliado array{
 *     id: string,
 *     categoria: string,
 *     nombre_comercial: string,
 *     contacto_nombre: string,
 *     especialidad_texto: string,
 *     telefono: string,
 *     whatsapp: string,
 *     sede: string,
 *     cobertura: string,
 *     verificado: bool,
 *     servicios: array<int, string>
 * }
 */
class DirectorioAliadosService
{
    /**
     * Claves de especialidad soportadas por el directorio.
     */
    public const CATEGORIAS = [
        'electricas',
        'incendios',
        'arquitectura_senaletica',
        'estructuras',
    ];

    /**
     * Criterio normativo del checklist ITSE => categoría de especialidad.
     *
     * @var array<string, string>
     */
    private const CRITERIO_CATEGORIA = [
        'EXTINTOR' => 'incendios',
        'EXTINTOR_PQS' => 'incendios',
        'EXTINTOR_K' => 'incendios',
        'DETECTORES_HUMO' => 'incendios',
        'CAMPANA_EXTRACCION' => 'incendios',
        'DIFERENCIAL' => 'electricas',
        'TERMOMAGNETICO' => 'electricas',
        'TABLERO_MANDIL' => 'electricas',
        'POZO_TIERRA' => 'electricas',
        'CABLEADO_CANALIZADO' => 'electricas',
        'LUCES_EMERG' => 'arquitectura_senaletica',
        'SENALETICA' => 'arquitectura_senaletica',
        'AFORO_CARTEL' => 'arquitectura_senaletica',
        'EVACUACION' => 'arquitectura_senaletica',
        'PUERTAS_ESCAPE' => 'arquitectura_senaletica',
        'BOTIQUIN' => 'arquitectura_senaletica',
        'ANCLAJE_ESTANTERIAS' => 'estructuras',
        'LAMINADO_VIDRIOS' => 'estructuras',
    ];

    /**
     * Equivalencia entre el catálogo normativo de la base de datos
     * (tabla `criterios_normativos`, códigos CRIT-xx) y los códigos técnicos del
     * checklist ITSE que usa este servicio.
     *
     * Ambas familias describen la misma condición técnica con identificadores
     * distintos: el flujo ciudadano (Checklist, Resumen, Subsanación) viaja por
     * CRIT-xx, mientras que el catálogo de costos y la guía de autoayuda usan el
     * código técnico. Sin esta tabla el directorio nunca resolvería un criterio
     * real del flujo.
     *
     * Los criterios sin equivalente técnico (GLP, espacio libre frente al tablero,
     * distancia a fuentes de calor, calderas) se dejan fuera a propósito: es
     * preferible no ofrecer aliados antes que ofrecer los equivocados.
     *
     * @var array<string, string>
     */
    private const CODIGO_NORMATIVO_ITSE = [
        'CRIT-01' => 'EXTINTOR_PQS',
        'CRIT-02A' => 'EXTINTOR_K',
        'CRIT-02B' => 'SENALETICA',
        'CRIT-03' => 'EVACUACION',
        'CRIT-04' => 'PUERTAS_ESCAPE',
        'CRIT-05' => 'POZO_TIERRA',
        'CRIT-06' => 'TABLERO_MANDIL',
        'CRIT-07' => 'CABLEADO_CANALIZADO',
        'CRIT-08' => 'LUCES_EMERG',
        'CRIT-09' => 'BOTIQUIN',
        'CRIT-12' => 'AFORO_CARTEL',
        'CRIT-13' => 'ANCLAJE_ESTANTERIAS',
        'CRIT-15' => 'DETECTORES_HUMO',
        'CRIT-16' => 'CAMPANA_EXTRACCION',
    ];

    /**
     * Grupos de disciplina técnica que se presentan al ciudadano.
     */
    public const ESPECIALIDADES = [
        'electricas' => 'Instalaciones Eléctricas',
        'incendios' => 'Seguridad e Incendios',
        'arquitectura' => 'Arquitectura y Evacuación',
        'estructuras' => 'Estructuras y Almacenamiento',
    ];

    /**
     * Disciplina de cada criterio del catálogo normativo, clasificada por su
     * categoría técnica real en `criterios_normativos`.
     *
     * Esta tabla es intencionalmente más amplia que CODIGO_NORMATIVO_ITSE: el
     * desglose por especialidad debe contabilizar TODAS las condiciones evaluadas
     * para que la suma de los cuatro grupos cuadre con el total del resumen. Por
     * eso aquí entran también las condiciones sin equivalente en el directorio
     * de aliados (GLP, espacio libre, calderas), que sí tienen disciplina
     * técnica clara aunque no tengan un especialista asociado.
     *
     * @var array<string, string>
     */
    private const ESPECIALIDAD_POR_CODIGO = [
        'CRIT-01' => 'incendios',
        'CRIT-02A' => 'incendios',
        'CRIT-02B' => 'arquitectura',
        'CRIT-03' => 'arquitectura',
        'CRIT-04' => 'arquitectura',
        'CRIT-05' => 'electricas',
        'CRIT-06' => 'electricas',
        'CRIT-07' => 'electricas',
        'CRIT-08' => 'arquitectura',
        'CRIT-09' => 'arquitectura',
        'CRIT-10' => 'incendios',
        'CRIT-11' => 'estructuras',
        'CRIT-12' => 'arquitectura',
        'CRIT-13' => 'estructuras',
        'CRIT-14A' => 'electricas',
        'CRIT-14B' => 'incendios',
        'CRIT-15' => 'incendios',
        'CRIT-16' => 'incendios',
        'CRIT-17' => 'incendios',
    ];

    /**
     * Todas las categorías soportadas por el directorio.
     *
     * @return array<int, string>
     */
    public function categorias(): array
    {
        return self::CATEGORIAS;
    }

    /**
     * Directorio completo, en formato público.
     *
     * @return array<int, array<string, mixed>>
     */
    public function todos(): array
    {
        return array_map($this->registroPublico(...), $this->getAliadosRaw());
    }

    /**
     * Aliados de una especialidad técnica.
     *
     * @return array<int, array<string, mixed>>
     */
    public function obtenerPorCategoria(string $categoria): array
    {
        $categoria = mb_strtolower(trim($categoria));

        if (! in_array($categoria, self::CATEGORIAS, true)) {
            return [];
        }

        return array_map(
            $this->registroPublico(...),
            array_values(array_filter(
                $this->getAliadosRaw(),
                fn (array $aliado): bool => $aliado['categoria'] === $categoria,
            )),
        );
    }

    /**
     * Obtiene el listado crudo de aliados desde la base de datos (con fallback a config/aliados.php).
     *
     * @return array<int, array<string, mixed>>
     */
    private function getAliadosRaw(): array
    {
        try {
            $proveedores = ProveedorRecurso::with('categoria')
                ->where('activo', true)
                ->get();

            if ($proveedores->isNotEmpty()) {
                return $proveedores->map(fn (ProveedorRecurso $p) => $this->transformarProveedor($p))->all();
            }
        } catch (Throwable) {
            // Si la base de datos no está disponible o la tabla aún no existe, fallback silencioso
        }

        if (function_exists('app') && app()->bound('config')) {
            $directorio = config('aliados.directorio');

            if (is_array($directorio) && $directorio !== []) {
                return $directorio;
            }
        }

        $rutaConfig = dirname(__DIR__, 2).'/config/aliados.php';

        if (! is_file($rutaConfig)) {
            return [];
        }

        /** @var array{directorio?: array<int, array<string, mixed>>} $config */
        $config = require_once $rutaConfig;

        return $config['directorio'] ?? [];
    }

    /**
     * Transforma un modelo ProveedorRecurso al contrato esperado por el frontend.
     *
     * @return array<string, mixed>
     */
    private function transformarProveedor(ProveedorRecurso $proveedor): array
    {
        $categoriaCodigo = $proveedor->categoria?->codigo ?? $proveedor->rubro;
        $serviciosRaw = $proveedor->servicios_ofrecidos;

        if (is_array($serviciosRaw)) {
            $servicios = array_values(array_filter($serviciosRaw));
        } elseif (is_string($serviciosRaw) && trim($serviciosRaw) !== '') {
            $servicios = array_values(array_filter(array_map('trim', explode(',', $serviciosRaw))));
        } else {
            $servicios = ['Servicio técnico especializado y asesoría'];
        }

        return [
            'id' => 'PRV-'.str_pad((string) $proveedor->id, 3, '0', STR_PAD_LEFT),
            'categoria' => $this->mapearCategoria($categoriaCodigo),
            'nombre_comercial' => (string) ($proveedor->nombre_comercial ?: $proveedor->razon_social),
            'contacto_nombre' => (string) $proveedor->razon_social,
            'especialidad_texto' => (string) ($proveedor->tipo_servicio ?: ($proveedor->servicios_ofrecidos ?: 'Especialista Técnico Autorizado')),
            'telefono' => (string) ($proveedor->telefono ?? ''),
            'whatsapp' => (string) ($proveedor->whatsapp ?: ($proveedor->telefono ?? '')),
            'sede' => (string) ($proveedor->distrito ?: 'Huancayo'),
            'cobertura' => $proveedor->distrito ? "Huancayo / {$proveedor->distrito}" : 'Huancayo Metropolitano',
            'verificado' => (bool) ($proveedor->verificado ?? true),
            'servicios' => $servicios,
        ];
    }

    /**
     * Mapea el código de categoría de BD al identificador que maneja el frontend.
     */
    private function mapearCategoria(?string $codigo): string
    {
        $codigoNormalizado = mb_strtoupper(trim((string) $codigo));

        return match ($codigoNormalizado) {
            'ELECTRICO', 'ELECTRICAS', 'ELECTRICIDAD' => 'electricas',
            'EXTINTOR', 'INCENDIOS', 'INCENDIO' => 'incendios',
            'SENALETICA', 'ARQUITECTURA_SENALETICA' => 'arquitectura_senaletica',
            'ARQUITECTURA', 'ESTRUCTURAS' => 'estructuras',
            default => in_array(mb_strtolower($codigoNormalizado), self::CATEGORIAS, true)
                ? mb_strtolower($codigoNormalizado)
                : 'electricas',
        };
    }

    /**
     * Agrupa las condiciones evaluadas por disciplina técnica ITSE.
     *
     * Cada grupo expone `alertas` (pendientes por atender más las marcadas por
     * revisar), `cumplidas` y `total`. Un grupo queda `en_orden` únicamente
     * cuando no tiene alertas.
     *
     * Los estados `NO_APLICA` se excluyen del conteo: no son una condición
     * evaluada. Los códigos ausentes de ESPECIALIDAD_POR_CODIGO tampoco se
     * contabilizan en ningún grupo.
     *
     * @param  array<int, array{codigo?: string|null, estado?: string|null}>  $condiciones
     * @return array<string, array{nombre: string, alertas: int, cumplidas: int, total: int, estado: 'en_orden'|'pendiente'}>
     */
    public function desglosePorEspecialidad(array $condiciones): array
    {
        $conteos = array_map(
            fn (string $nombre): array => [
                'nombre' => $nombre,
                'alertas' => 0,
                'cumplidas' => 0,
                'total' => 0,
                'estado' => 'en_orden',
            ],
            self::ESPECIALIDADES
        );

        foreach ($condiciones as $condicion) {
            $especialidad = self::ESPECIALIDAD_POR_CODIGO[mb_strtoupper(trim((string) ($condicion['codigo'] ?? '')))] ?? null;

            if ($especialidad === null) {
                continue;
            }

            $estado = $condicion['estado'] ?? null;

            if ($estado === ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO) {
                $conteos[$especialidad]['cumplidas']++;
                $conteos[$especialidad]['total']++;
            } elseif (in_array($estado, [
                ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
                ApplicabilityEngineService::ESTADO_POR_REVISAR,
            ], true)) {
                $conteos[$especialidad]['alertas']++;
                $conteos[$especialidad]['total']++;
            }
        }

        foreach ($conteos as &$grupo) {
            $grupo['estado'] = $grupo['alertas'] === 0 ? 'en_orden' : 'pendiente';
        }
        unset($grupo);

        return $conteos;
    }

    /**
     * Normaliza un criterio a su código técnico ITSE.
     *
     * Acepta ambas familias de identificadores: el código CRIT-xx del catálogo
     * normativo y el propio código ITSE, que se devuelve sin cambios.
     */
    public function normalizarCodigo(string $codigoCriterio): string
    {
        $codigo = mb_strtoupper(trim($codigoCriterio));

        return self::CODIGO_NORMATIVO_ITSE[$codigo] ?? $codigo;
    }

    /**
     * Resuelve el aliado sugerido, la guía de autoayuda y el rango de costo
     * referencial para un criterio del checklist ITSE.
     *
     * @return array{
     *     criterio: string,
     *     criterio_conocido: bool,
     *     categoria: string|null,
     *     aliado: array<string, mixed>|null,
     *     alternativas: array<int, array<string, mixed>>,
     *     guia_autoayuda: array<int, string>,
     *     norma: string|null,
     *     rango_costo: array{referencia_soles: float, minimo_soles: float, maximo_soles: float}|null
     * }
     */
    public function obtenerPorCriterio(string $criterioCodigo): array
    {
        $criterioCodigo = $this->normalizarCodigo($criterioCodigo);
        $categoria = self::CRITERIO_CATEGORIA[$criterioCodigo] ?? null;
        $catalogo = ItseRiskService::COSTOS_REFERENCIALES[$criterioCodigo] ?? null;

        if ($categoria === null || $catalogo === null) {
            return $this->buildRespuestaCriterio([
                'criterio' => $criterioCodigo,
                'criterio_conocido' => false,
                'categoria' => $categoria,
            ]);
        }

        $aliados = $this->obtenerPorCategoria($categoria);

        return $this->buildRespuestaCriterio([
            'criterio' => $criterioCodigo,
            'criterio_conocido' => true,
            'categoria' => $categoria,
            'aliado' => $aliados[0] ?? null,
            'alternativas' => array_values(array_slice($aliados, 1)),
            'guia_autoayuda' => $this->guiaAutoayuda($criterioCodigo),
            'norma' => isset($catalogo['norma']) ? (string) $catalogo['norma'] : null,
            'rango_costo' => $this->rangoCosto((float) ($catalogo['costo_soles'] ?? 0.0)),
        ]);
    }

    /**
     * Construye de forma centralizada la estructura de respuesta por criterio.
     *
     * @param  array{
     *     criterio: string,
     *     criterio_conocido: bool,
     *     categoria?: ?string,
     *     aliado?: ?array<string, mixed>,
     *     alternativas?: array<int, array<string, mixed>>,
     *     guia_autoayuda?: array<int, string>,
     *     norma?: ?string,
     *     rango_costo?: ?array{referencia_soles: float, minimo_soles: float, maximo_soles: float}
     * }  $datos
     * @return array{
     *     criterio: string,
     *     criterio_conocido: bool,
     *     categoria: string|null,
     *     aliado: array<string, mixed>|null,
     *     alternativas: array<int, array<string, mixed>>,
     *     guia_autoayuda: array<int, string>,
     *     norma: string|null,
     *     rango_costo: array{referencia_soles: float, minimo_soles: float, maximo_soles: float}|null
     * }
     */
    private function buildRespuestaCriterio(array $datos): array
    {
        return [
            'criterio' => $datos['criterio'],
            'criterio_conocido' => $datos['criterio_conocido'],
            'categoria' => $datos['categoria'] ?? null,
            'aliado' => $datos['aliado'] ?? null,
            'alternativas' => $datos['alternativas'] ?? [],
            'guia_autoayuda' => $datos['guia_autoayuda'] ?? [],
            'norma' => $datos['norma'] ?? null,
            'rango_costo' => $datos['rango_costo'] ?? null,
        ];
    }

    /**
     * Rango referencial derivado del costo canónico del criterio: hasta -20%
     * para una intervención simple y hasta +50% por mayor complejidad,
     * antigüedad de la instalación o certificación del proveedor.
     *
     * @return array{referencia_soles: float, minimo_soles: float, maximo_soles: float}
     */
    private function rangoCosto(float $referencia): array
    {
        return [
            'referencia_soles' => round($referencia, 2),
            'minimo_soles' => round($referencia * 0.80, 2),
            'maximo_soles' => round($referencia * 1.50, 2),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function guiaAutoayuda(string $criterioCodigo): array
    {
        return match ($criterioCodigo) {
            'EXTINTOR', 'EXTINTOR_PQS' => [
                'Verifica que el manómetro marque la zona verde y que la etiqueta de mantenimiento esté vigente.',
                'Ubica el extintor entre 0.30 m y 1.00 m del piso, accesible y sin obstrucciones.',
                'Si la carga venció o el precinto está roto, solicita la recarga a una empresa especializada y exige la tarjeta de mantenimiento conforme a la NTP 350.043-1.',
            ],
            'EXTINTOR_K' => [
                'Coloca el extintor Tipo K a menos de 1.50 m de la freidora o del punto de riesgo de cocción.',
                'Verifica que el agente sea acetato de potasio y que la placa de identificación sea legible.',
                'No sustituyas el Tipo K por un extintor PQS: la base de sodio reacciona de forma peligrosa con grasas.',
            ],
            'DETECTORES_HUMO' => [
                'Limpia el sensor fotoeléctrico con un paño seco y verifica que no tenga obstrucciones ni polvo.',
                'Pulsa el botón de prueba y confirma la alarma sonora y el led intermitente.',
                'Sustituye la pila del detector autónomo según la vida útil del fabricante y anota la fecha.',
            ],
            'CAMPANA_EXTRACCION' => [
                'Retira y lava los filtros metálicos con desengrasante; reemplaza los que estén deformados.',
                'Verifica que el ducto sea incombustible y que la campana no tenga fugas de aire caliente.',
                'Limpia el extractor y el ducto cada 3 meses en establecimientos de alta cocina.',
            ],
            'DIFERENCIAL', 'TERMOMAGNETICO' => [
                'Prueba el botón TEST del diferencial y registra el resultado.',
                'Confirma que la corriente nominal de la protección calce con la sección del cable instalado.',
                'Elimina puentes de alambre y empalmes; deja el tablero bajo llave.',
                'Contrata a un electricista colegiado si el diferencial no dispara o no responde al TEST.',
            ],
            'TABLERO_MANDIL' => [
                'Instala el mandil protector de resina o metal cubriendo todos los conductores activos.',
                'Coloca tapas ciegas en cada espacio libre del tablero y etiqueta los circuitos.',
                'Retira cables quemados o con aislamiento deteriorado y canalízalos.',
            ],
            'POZO_TIERRA' => [
                'Solicita el protocolo de medición de resistencia de puesta a tierra; el valor debe ser menor o igual a 25 Ohmios.',
                'Mantén visible, protegido y rotulado el punto de medición del pozo a tierra.',
                'No cortes ni empalmes el conductor de tierra; exígelo por escrito al electricista.',
            ],
            'CABLEADO_CANALIZADO' => [
                'Retira los cables sueltos y canalízalos en canaletas o tuberías sin empalmes expuestos.',
                'Sustituye los empalmes por conectores homologados dentro de cajas de paso accesibles.',
                'Separa las canalizaciones eléctricas de las de gases.',
            ],
            'LUCES_EMERG' => [
                'Verifica que la luz de emergencia tenga autonomía de 90 minutos y batería en buen estado.',
                'Colócala sobre la puerta de salida y en los puntos de la ruta de evacuación.',
                'Prueba el equipo con el interruptor general apagado: debe seguir encendida.',
            ],
            'SENALETICA' => [
                'Coloca señales fotoluminiscentes de Salida en cada puerta y en los tramos de la ruta de evacuación.',
                'Verifica que las señales de Extintor y Riesgo Eléctrico correspondan a NTP 399.010-1.',
                'Limpia las señales para mantener el nivel de contraste y visibilidad.',
            ],
            'AFORO_CARTEL' => [
                'Coloca el cartel de aforo máximo en el acceso principal, visible desde el exterior.',
                'Vigila que la capacidad indicada coincida con el número de mesas, sillas y estantes reales.',
                'Mantén actualizado el aforo declarado en el sistema.',
            ],
            'EVACUACION' => [
                'Despeja totalmente las rutas y salidas de escape; ancho útil mínimo de 0.90 m a 1.20 m.',
                'Elimina mercadería y cajas en los pasillos y frente a las puertas.',
                'Marca en el piso el recorrido de evacuación y manténlo despejado de manera permanente.',
            ],
            'PUERTAS_ESCAPE' => [
                'Verifica que la puerta de salida abra hacia afuera sin herramientas y sin cerrojos trabados.',
                'Retira candados o trabas que impidan la apertura durante el horario de atención.',
                'Mantén la barra antipánico libre de obstrucciones si la capacidad del local lo exige.',
            ],
            'BOTIQUIN' => [
                'Adosa el botiquín a la pared en una zona visible y accesible, entre 1.00 m y 1.50 m de altura.',
                'Verifica el contenido mínimo vigente y reemplaza lo que esté vencido o abierto.',
                'Registra la fecha de revisión y designa a un responsable del abastecimiento.',
            ],
            'ANCLAJE_ESTANTERIAS' => [
                'Ancla a muro o piso toda estantería o anaquel cuya altura supere los 1.80 m.',
                'Usa pernos y anclajes adecuados al tipo de muro (ladrillo, concreto o tabiquería con refuerzo).',
                'Pide un peritaje básico si la estantería ya se inclinó o la pared muestra grietas.',
            ],
            'LAMINADO_VIDRIOS' => [
                'Instala lámina de seguridad de 4 micras o vidrio templado en lunas crudas.',
                'Marca con una franja visible los vidrios instalados a la altura de la vista.',
                'Solicita el cambio inmediato de cualquier luna astillada y no la mantengas en uso.',
            ],
            default => [],
        };
    }

    /**
     * Proyecta un registro interno del directorio al formato de contrato
     * público, conservando los campos de contacto consumibles por el cliente.
     *
     * @param  array<string, mixed>  $aliado
     * @return array<string, mixed>
     */
    private function registroPublico(array $aliado): array
    {
        return $this->buildAliadoItem($aliado);
    }

    /**
     * Normaliza y estructura un registro de aliado según el contrato público.
     *
     * @param  array<string, mixed>  $aliado
     * @return array<string, mixed>
     */
    private function buildAliadoItem(array $aliado): array
    {
        /** @var array<int, string> $servicios */
        $servicios = is_array($aliado['servicios'] ?? null) ? array_values($aliado['servicios']) : [];

        return [
            'id' => (string) ($aliado['id'] ?? ''),
            'categoria' => (string) ($aliado['categoria'] ?? ''),
            'nombre_comercial' => (string) ($aliado['nombre_comercial'] ?? ''),
            'contacto_nombre' => (string) ($aliado['contacto_nombre'] ?? ''),
            'especialidad_texto' => (string) ($aliado['especialidad_texto'] ?? ''),
            'telefono' => (string) ($aliado['telefono'] ?? ''),
            'whatsapp' => (string) ($aliado['whatsapp'] ?? ''),
            'sede' => (string) ($aliado['sede'] ?? ''),
            'cobertura' => (string) ($aliado['cobertura'] ?? ''),
            'verificado' => (bool) ($aliado['verificado'] ?? false),
            'servicios' => $servicios,
        ];
    }
}
