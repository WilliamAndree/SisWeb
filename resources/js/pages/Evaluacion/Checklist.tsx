import { AvisoPreventivo, FlujoCiudadano } from '@/components/Evaluacion/FlujoCiudadano';
import { GuiaPedagogicaModal } from '@/components/Evaluacion/GuiaPedagogicaModal';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { RecursoEducativoModal, type RecursoEducativoData } from '@/components/RecursoEducativoModal';
import type { ChecklistProps, CriterioEvaluable, CriterioInformacionPendiente, CriterioNoAplica } from '@/types/contrato';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Compass,
    Flame,
    HelpCircle,
    Info,
    Lightbulb,
    Lock,
    Ruler,
    Save,
    Scale,
    Shield,
    ShieldAlert,
    Users,
    Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface OpcionConfig {
    label: string;
    descripcion: string;
    icono: React.ComponentType<{ className?: string }>;
    borderSelected: string;
    bgSelected: string;
    textSelected: string;
    iconSelected: string;
    dotSelected: string;
}

/**
 * Catálogo cerrado y exclusivo de las tres declaraciones ciudadanas permitidas por
 * `ApplicabilityEngineService::RESPUESTAS_CIUDADANAS_PERMITIDAS`. El estado
 * `NO_APLICA` es una determinación exclusiva del sistema y jamás se ofrece aquí,
 * por eso no aparece como opción ni como etiqueta en el selector segmentado.
 */
const OPCIONES_ETIQUETAS: Record<string, OpcionConfig> = {
    CUMPLE_DECLARADO: {
        label: 'Declaro que cumple',
        descripcion: 'La condición existe en tu local según lo que declaras.',
        icono: CheckCircle2,
        borderSelected: 'border-[#34C759]',
        bgSelected: 'bg-emerald-50/30',
        textSelected: 'text-emerald-900',
        iconSelected: 'text-success-800',
        dotSelected: 'bg-success-700',
    },
    PENDIENTE_ATENDER: {
        label: 'Necesito atenderlo',
        descripcion: 'Falta corregir, adquirir o mantener antes de una inspección.',
        icono: AlertTriangle,
        borderSelected: 'border-[#FF3B30]',
        bgSelected: 'bg-rose-50/30',
        textSelected: 'text-rose-900',
        iconSelected: 'text-danger-700',
        dotSelected: 'bg-danger-700',
    },
    POR_REVISAR: {
        label: 'Necesito revisarlo',
        descripcion: 'No puedes confirmarlo todavía: consulta con un técnico.',
        icono: HelpCircle,
        borderSelected: 'border-[#FF9500]',
        bgSelected: 'bg-amber-50/30',
        textSelected: 'text-amber-950',
        iconSelected: 'text-warning-800',
        dotSelected: 'bg-warning-700',
    },
};

const OPCIONES_FALLBACK = ['CUMPLE_DECLARADO', 'PENDIENTE_ATENDER', 'POR_REVISAR'];

interface AreaNormativa {
    id: string;
    nombre: string;
    nombreCorto: string;
    icono: React.ComponentType<{ className?: string }>;
    criterios: CriterioEvaluable[];
}

/**
 * Agrupa los criterios en las especialidades normadas del catálogo.
 *
 * El enrutamiento por `categoria` es preexistente y no se modifica: cada criterio
 * cae en el mismo lugar que antes, de modo que ninguna condición puede quedar
 * inalcanzable al introducir las pestañas. Lo único que cambia es el rótulo
 * mostrado al ciudadano, que sigue las cuatro disciplinas de la ITSE.
 *
 * El orden de `definiciones` es el orden de presentación de las pestañas. Como
 * `gas` se conserva como quinta especialidad cuando el catálogo le asigna
 * criterios —excluirla dejaría ese grupo real de "Instalaciones de Gas" sin
 * pestaña donde responder— el fallback de categorías no reconocidas se ancla
 * por id a `incendios` en lugar de usar la posición del array.
 */
function agruparCriteriosPorArea(criterios: CriterioEvaluable[]): AreaNormativa[] {
    const definiciones = [
        {
            id: 'electricas',
            nombre: 'Instalaciones Eléctricas',
            nombreCorto: 'Eléctricas',
            icono: Zap,
            match: (cat: string) => cat.toLowerCase().includes('eléctric'),
        },
        {
            id: 'incendios',
            nombre: 'Seguridad y Contra Incendios',
            nombreCorto: 'Incendios',
            icono: Flame,
            match: (cat: string) => cat.toLowerCase().includes('incendio'),
        },
        {
            id: 'evacuacion',
            nombre: 'Arquitectura y Evacuación',
            nombreCorto: 'Evacuación',
            icono: Compass,
            match: (cat: string) =>
                (cat.toLowerCase().includes('evacuación') || cat.toLowerCase().includes('señalización')) && !cat.toLowerCase().includes('eléctric'),
        },
        {
            id: 'estructuras',
            nombre: 'Almacenamiento y Estructuras',
            nombreCorto: 'Estructuras',
            icono: Shield,
            match: (cat: string) =>
                cat.toLowerCase().includes('estructur') ||
                cat.toLowerCase().includes('sísmic') ||
                cat.toLowerCase().includes('accesibilidad') ||
                cat.toLowerCase().includes('almacenamiento'),
        },
        {
            id: 'gas',
            nombre: 'Instalaciones de Gas',
            nombreCorto: 'Gas',
            icono: Flame,
            match: (cat: string) => cat.toLowerCase().includes('gas') || cat.toLowerCase().includes('glp'),
        },
    ];

    const areas: AreaNormativa[] = definiciones.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        nombreCorto: d.nombreCorto,
        icono: d.icono,
        criterios: [],
    }));

    // Área de referencia para categorías que no encajan en ninguna especialidad
    // (p. ej. primeros auxilios, calderas o ventilación). Fijada por id y no por
    // posición para que reordenar las pestañas por especialidad no mueva criterios
    // de un grupo a otro.
    const areaFallback = areas.find((a) => a.id === 'incendios') ?? areas[0];

    for (const c of criterios) {
        const cat = c.categoria || '';
        const area = areas.find((a) => {
            const def = definiciones.find((d) => d.id === a.id);
            return def?.match(cat);
        });

        if (area) {
            area.criterios.push(c);
        } else if (areaFallback) {
            areaFallback.criterios.push(c);
        }
    }

    return areas.filter((a) => a.criterios.length > 0);
}

/**
 * Identidad visual de cada especialidad. Solo describe presentación: el área a la
 * que pertenece un criterio lo sigue decidiendo `agruparCriteriosPorArea` a partir
 * de la categoría normativa, y la base normativa real de cada criterio llega
 * individualizada en `criterio.norma_base` / `criterio.articulo_referencia`.
 */
interface EstiloArea {
    banner: string;
    acento: string;
    chipIcono: string;
    badgeNorma: string | null;
    bordeCriterio: string;
}

const CONFIG_AREA: Record<string, EstiloArea> = {
    incendios: {
        banner: 'border-rose-200 bg-rose-50',
        acento: 'text-rose-700',
        chipIcono: 'border-rose-200 bg-white',
        badgeNorma: 'NTP 350.043-1',
        bordeCriterio: 'border-l-rose-500',
    },
    evacuacion: {
        banner: 'border-emerald-200 bg-emerald-50',
        acento: 'text-emerald-700',
        chipIcono: 'border-emerald-200 bg-white',
        badgeNorma: 'RNE A.010 / A.130',
        bordeCriterio: 'border-l-emerald-500',
    },
    electricas: {
        banner: 'border-amber-200 bg-amber-50',
        acento: 'text-amber-700',
        chipIcono: 'border-amber-200 bg-white',
        badgeNorma: 'Código Nacional de Electricidad',
        bordeCriterio: 'border-l-amber-500',
    },
    estructuras: {
        banner: 'border-blue-200 bg-blue-50',
        acento: 'text-blue-700',
        chipIcono: 'border-blue-200 bg-white',
        badgeNorma: 'RNE Seguridad Estructural',
        bordeCriterio: 'border-l-blue-500',
    },
    gas: {
        banner: 'border-orange-200 bg-orange-50',
        acento: 'text-orange-700',
        chipIcono: 'border-orange-200 bg-white',
        badgeNorma: null,
        bordeCriterio: 'border-l-orange-500',
    },
};

const CONFIG_AREA_POR_DEFECTO: EstiloArea = {
    banner: 'border-slate-200 bg-slate-50',
    acento: 'text-slate-700',
    chipIcono: 'border-slate-200 bg-white',
    badgeNorma: null,
    bordeCriterio: 'border-l-slate-400',
};

/**
 * Guía comparativa "Correcto vs. Incorrecto" de los criterios de mayor incidencia
 * en el comercio. Es contenido pedagógico fijo derivado de la redacción oficial
 * de cada criterio en `NormativaCatalogSeeder` (pregunta ciudadana, qué observar y
 * acción de mejora); no alimenta ningún cálculo de estado ni de puntaje.
 */
interface GuiaComparativa {
    explicacionCotidiana?: string;
    correcto: string[];
    incorrecto: string[];
}

const COMPARATIVA_CORRECTO_INCORRECTO: Record<string, GuiaComparativa> = {
    'CRIT-01': {
        explicacionCotidiana:
            'El extintor es tu primera línea de defensa ante un conato de incendio. Debe estar a la mano, con carga presurizada y revisión técnica anual realizada conforme a la norma NTP 350.043-1.',
        correcto: [
            'Extintor colgado en pared o pedestal visible, accesible y sin mercadería ni cajas delante.',
            'Aguja del manómetro dentro de la franja verde operable (presión correcta).',
            'Tarjeta o collarín de mantenimiento con fecha de recarga menor a 1 año.',
            'Instalado a una altura máxima de 1.50 m del piso medido desde la manija.',
            'Precinto y pasador de seguridad intactos, sin señales de manipulación.',
        ],
        incorrecto: [
            'Extintor escondido detrás de vitrinas, tapado con ropa o dentro de armarios bajo llave.',
            'Manómetro en zona roja (descargado o con sobrepresión riesgosa).',
            'Tarjeta de mantenimiento vencida (más de 12 meses), ilegible o inexistente.',
            'Extintor apoyado directamente en el suelo o colgado a más de 1.50 m.',
            'Cilindro golpeado, oxidado, con manguera rota o sin pasador.',
        ],
    },
    'CRIT-02A': {
        explicacionCotidiana:
            'Los fuegos por grasa o aceite caliente en cocinas y freidoras NO se apagan con agua ni con extintor común de polvo PQS (que puede esparcir el aceite hirviendo). Se exige químico húmedo Clase K (acetato de potasio) que saponifica y enfría el aceite.',
        correcto: [
            'Extintor rotulado con la letra "K" en hexágono específico de cocina comercial.',
            'Ubicado a una distancia máxima de 9 metros de freidoras, hornos o planchas.',
            'Manómetro en franja verde y tarjeta de control anual al día.',
            'Agente a base de sales de potasio (químico húmedo que no salpica grasa caliente).',
        ],
        incorrecto: [
            'Tener únicamente extintor PQS frente a freidoras con grandes volúmenes de aceite.',
            'Extintor Clase K ubicado lejos de la cocina (más de 9 metros de recorrido).',
            'Falta de mantenimiento anual o precinto de seguridad roto.',
            'Boquilla o manguera de descarga obstruida con grasa acumulada.',
        ],
    },
    'CRIT-02B': {
        explicacionCotidiana:
            'Las señales de seguridad guían a clientes y trabajadores en segundos hacia la salida o equipos de auxilio, especialmente si hay humo o corte imprevisto de energía eléctrica.',
        correcto: [
            'Carteles verdes con flechas de "SALIDA" colocadas en puntos clave y sobre puertas de escape.',
            'Cartel rojo "EXTINTOR" ubicado exactamente sobre la posición del equipo portátil.',
            'Señal triangular amarilla de "RIESGO ELÉCTRICO" adherida en la tapa exterior del tablero.',
            'Señales fotoluminiscentes que brillan en la oscuridad o iluminadas en rutas principales.',
        ],
        incorrecto: [
            'Falta total de señalización o letreros improvisados en papel bond desgastado.',
            'Señal de "Salida" apuntando en dirección contraria o bloqueada por carteles publicitarios.',
            'Cartel de extintor pegado en una pared donde no hay ningún extintor colocado.',
            'Señales deterioradas, descoloridas, rotas o colocadas a alturas no visibles.',
        ],
    },
    'CRIT-03': {
        explicacionCotidiana:
            'En una emergencia, las personas evacúan apresuradas. Cualquier bulto o estrechamiento del pasillo puede provocar tropiezos y estampidas mortales.',
        correcto: [
            'Pasadizos y camino directo hacia la salida continuos, despejados y con piso uniforme.',
            'Ancho libre reglamentario (mínimo 0.90 m a 1.20 m según aforo) mantenido en todo el recorrido.',
            'Sin fardos, cajas, mercadería exhibida ni mobiliario que estrechen el paso.',
            'Ruta de evacuación completamente iluminada y transitable de inicio a fin.',
        ],
        incorrecto: [
            'Cajas, mercadería o canastillas apiladas en el suelo reduciendo el ancho del pasillo.',
            'Exhibidores, maniquíes o mesas colocados invadiendo la vía de escape.',
            'Pasadizos usados como zona de depósito o carga y descarga temporal permanente.',
            'Pisos con desniveles no señalizados, cables cruzados en el suelo o alfombras sueltas.',
        ],
    },
    'CRIT-04': {
        explicacionCotidiana:
            'La puerta principal de evacuación debe abrirse de inmediato desde el interior con un solo empuje. Nadie debe buscar una llave ni pedir permiso para escapar en una emergencia.',
        correcto: [
            'Puertas de escape desatrancadas y libres de candados durante todo el horario de atención.',
            'Apertura inmediata desde el interior mediante manija simple o barra antipánico (si aforo > 50).',
            'Giro hacia el exterior (sentido de evacuación) para locales comerciales con aforo.',
            'Vía libre al exterior: la vereda o descanso exterior no tiene obstáculos ni rejas cerradas.',
        ],
        incorrecto: [
            'Reja exterior o puerta principal con candado echado mientras hay personas dentro.',
            'Pestillos o cerrojos ocultos que requieren llave para salir al exterior.',
            'Puertas corredizas o enrollables cerradas hasta el piso durante la permanencia de público.',
            'Mobiliario, mercadería o vitrinas colocadas tapando o bloqueando las hojas de la puerta.',
        ],
    },
    'CRIT-05': {
        explicacionCotidiana:
            'El pozo a tierra desvía corrientes de fuga hacia el suelo para evitar descargas a las personas. La norma exige medirlo cada año con telurómetro para certificar que su resistencia no supere los 25 Ohmios.',
        correcto: [
            'Certificado o protocolo de medición con fecha de emisión no mayor a 1 año (vigente).',
            'Valor de resistencia de puesta a tierra medido igual o menor a 25 Ohmios (≤ 25 Ω).',
            'Firmado y sellado por Ingeniero Electricista o Mecánico-Electricista colegiado y habilitado.',
            'Pozo físico con caja de registro visible, rotulada y con conductor de cobre conectado firmemente.',
        ],
        incorrecto: [
            'No contar con el protocolo de medición firmado por ingeniero colegiado.',
            'Protocolo con más de un año de antigüedad (vencido).',
            'Valor medido superior a 25 Ohmios sin mantenimiento ni tratamiento de sales.',
            'Pozo a tierra enterrado bajo concreto sin tapa de registro accesible o con cable desconectado.',
        ],
    },
    'CRIT-06': {
        explicacionCotidiana:
            'El mandil es la tapa interna que oculta los cables con corriente. El interruptor diferencial (el que tiene botón "T") salva vidas cortando la luz en milisegundos si alguien toca un cable energizado.',
        correcto: [
            'Mandil o contratapa interior colocada, cubriendo cables y barras vivas; solo asoman las palancas.',
            'Interruptores termomagnéticos debidamente rotulados con su carga (ej: "Alumbrado 1", "Tomas").',
            'Interruptor diferencial (30 mA) con botón de prueba "T" en todos los circuitos de tomacorrientes.',
            'Gabinete exterior con puerta cerrada y señal de advertencia de riesgo eléctrico pegada.',
        ],
        incorrecto: [
            'Tablero sin mandil: cables internos pelados, borneras o barras metálicas expuestas al tacto.',
            'Ausencia de interruptor diferencial (solo llaves termomagnéticas comunes).',
            'Interruptores sin rotular o con anotaciones borrosas que impiden corte selectivo rápido.',
            'Huecos abiertos en el mandil donde faltan llaves, permitiendo introducir los dedos.',
        ],
    },
    'CRIT-07': {
        explicacionCotidiana:
            'Los cables mellizos planos son flexibles para electrodomésticos portátiles, NUNCA para instalaciones fijas ni grapados a la pared. Se recalientan y provocan cortocircuitos e incendios.',
        correcto: [
            'Todos los conductores eléctricos protegidos dentro de tubos de PVC empotrados o canaletas adosadas.',
            'Conductores tipo THW o libre de halógenos instalados en cajas de paso con tapas cerradas.',
            'Empalmes realizados dentro de cajas de derivación con conectores adecuados o capuchones.',
            'Cables sujetos firmemente sin tramos colgantes ni sometidos a tirantez mecánica.',
        ],
        incorrecto: [
            'Cables mellizos usados como tendido fijo en techos, paredes o clavados con tachuelas.',
            'Cables colgando libremente al alcance de personas o sobre estructuras metálicas.',
            'Empalmes al aire libre envueltos con cinta aislante simple o cinta de embalaje.',
            'Canaletas rotas, sin tapas protectoras o saturadas de cables que impiden su cierre.',
        ],
    },
    'CRIT-08': {
        explicacionCotidiana:
            'En caso de apagón o siniestro, las luces de emergencia encienden automáticamente con su batería interna para iluminar el camino de escape de clientes y personal.',
        correcto: [
            'Equipos de luz de emergencia instalados en rutas de evacuación, cambios de nivel y salidas.',
            'Conectados permanentemente a la red eléctrica (luz testigo encendida indicando carga).',
            'Al presionar el botón "TEST" o desconectarlos, los faros encienden de inmediato con buena intensidad.',
            'Batería autónoma con respaldo operativo comprobado de al menos 60 a 90 minutos.',
        ],
        incorrecto: [
            'Equipo desenchufado, guardado en un cajón o con el enchufe deteriorado.',
            'Al pulsar el botón "TEST", los focos no encienden o emiten una luz muy tenue y parpadeante.',
            'Luminarias apuntando hacia el techo o la pared en vez de enfocar el camino de salida.',
            'Falta de luces de emergencia en locales con más de un ambiente o tramos ciegos.',
        ],
    },
    'CRIT-10': {
        explicacionCotidiana:
            'El gas licuado de petróleo (GLP) es más pesado que el aire y se acumula en el suelo. Un balón en un sótano o mueble cerrado genera una atmósfera inflamable ante la menor chispa.',
        correcto: [
            'Cilindro de GLP ubicado en ambiente con ventilación natural directa a nivel de piso (nunca en sótanos).',
            'Manguera flexible reforzada especial para gas (con fecha legible) de longitud no mayor a 1.5 m.',
            'Abrazaderas metálicas tipo cremallera ajustadas en ambos extremos de la manguera.',
            'Regulador de presión en perfecto estado mecánico y libre de fugas de gas.',
        ],
        incorrecto: [
            'Balón de gas instalado en sótanos, semisótanos o huecos bajo escaleras sin ventilación.',
            'Uso de mangueras de agua (transparentes o de jardín) en vez de manguera normada para GLP.',
            'Manguera asegurada con alambres retorcidos en lugar de abrazaderas metálicas.',
            'Cilindro acostado o colocado a menos de 1.5 metros de tomacorrientes o interruptores eléctricos.',
        ],
    },
    'CRIT-11': {
        explicacionCotidiana:
            'Las caídas en escaleras son el siniestro físico más común en comercios de varios niveles. Los pasamanos continuos y bordes no resbalosos facilitan un tránsito seguro y reducen el riesgo de caídas.',
        correcto: [
            'Pasamanos continuo instalado a una altura ergonómica reglamentaria (0.90 m a 1.00 m).',
            'Fijación sólida al muro o baranda que soporte el peso y empuje de las personas.',
            'Cintas antideslizantes de alto tránsito o estrías en el borde (voladizo) de cada peldaño.',
            'Peldaños de dimensiones uniformes, limpios, secos y con iluminación suficiente.',
        ],
        incorrecto: [
            'Escalera sin pasamanos o con tubos flojos y desprendidos de la pared.',
            'Peldaños de mayólica o granito pulido lisos y resbaladizos sin material antideslizante.',
            'Escaleras con objetos depositados en los descansos (cajas, baldes, mercadería).',
            'Tramos a oscuras o con peldaños rotos y desportillados.',
        ],
    },
    'CRIT-13': {
        explicacionCotidiana:
            'En una zona de alto peligro sísmico como Huancayo, las estanterías de más de 1.80 m pueden voltearse violentamente sobre las personas o bloquear la única salida.',
        correcto: [
            'Estanterías, anaqueles y vitrinas altas anclados firmemente al muro con escuadras o pernos.',
            'Arriostramiento transversal o unión superior entre módulos para mayor rigidez ante sismos.',
            'Mercadería pesada almacenada en niveles inferiores y productos livianos en la parte alta.',
            'Topes de retención en estantes abiertos para evitar la caída de envases frágiles.',
        ],
        incorrecto: [
            'Anaqueles altos libres y tambaleantes colocados junto a vías de evacuación.',
            'Pilas de cajas pesadas sobre la parte superior de estantes sin ninguna sujeción.',
            'Muebles apoyados sobre tacos de madera inestables o calzados precariamente.',
            'Falta total de pernos o anclajes en estanterías metálicas de gran altura.',
        ],
    },
    'CRIT-14A': {
        explicacionCotidiana:
            'Si ocurre un chispazo o cortocircuito, cualquier persona o bombero debe poder acceder al tablero en dos segundos para cortar la llave general sin tropezar.',
        correcto: [
            'Espacio frontal libre de al menos 1.00 metro de profundidad y ancho del tablero totalmente despejado.',
            'Piso seco y libre de materiales almacenados delante del tablero de distribución.',
            'Acceso inmediato sin tener que mover muebles, estantes o mercadería para alcanzar la tapa.',
            'Área demarcada preferentemente en el piso como zona de seguridad eléctrica.',
        ],
        incorrecto: [
            'Cajas de cartón, fardos de ropa o bultos de mercadería apilados contra el tablero.',
            'Muebles, vitrinas o refrigeradores colocados tapando el acceso al tablero eléctrico.',
            'Materiales inflamables (thinner, solventes, plásticos) almacenados directamente debajo del tablero.',
            'Tablero instalado a más de 2 metros de altura o inaccesible sin escalera de mano.',
        ],
    },
};

/**
 * Normaliza una magnitud del contexto físico declarado por el ciudadano.
 *
 * Devuelve `null` cuando no hay dato utilizable: `null`, `undefined`, `0` y los
 * valores no numéricos significan «no declarado», no «cero». Los bloques
 * paramétricos orientativos se ocultan en ese caso porque calcular sobre 0
 * afirmaría al ciudadano una dotación o una exigencia que nadie declaró.
 */
function magnitudDeclarada(valor: number | null | undefined): number | null {
    if (valor === null || valor === undefined) {
        return null;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

/**
 * Secuencia del flujo ciudadano, alineada con el stepper de `Nueva.tsx` para que
 * los pasos 1 y 2 compartan el mismo vocabulario.
 */

interface RespuestaEnvioItem {
    codigo: string;
    estado: string;
    notas: string | null;
}

interface ProgresoAreaItem {
    id: string;
    respondidos: number;
    total: number;
    pendientes: number;
    completo: boolean;
}

interface ContextoParametricoLocal {
    areaM2Declarada: number | null;
    mostrarDotacionExtintores: boolean;
    extintoresSugeridos: number;
    areaM2Num: number;
    extintoresMinimos: number;
    extintoresPorPisos: number | null;
    tieneEquiposFritura: boolean | null;
    mostrarExigenciasAforo: boolean;
    aforoNum: number;
    mostrarAlertaAforo50: boolean;
    mostrarAlertaAforo100: boolean;
}

interface DatosGuiaPedagogicaModal {
    codigo?: string;
    titulo?: string;
    explicacionCotidiana?: string;
    queObservar?: string;
    correcto?: string[];
    incorrecto?: string[];
    normaBase?: string | null;
    articuloReferencia?: string | null;
}

interface DatosRecursoModal {
    recursos: RecursoEducativoData[];
    codigo?: string;
    titulo?: string;
}

const BORDES_TARJETA_POR_ESTADO: Record<string, string> = {
    CUMPLE_DECLARADO: 'border-[#34C759]/60 ring-1 ring-[#34C759]/20 bg-emerald-50/10',
    PENDIENTE_ATENDER: 'border-[#FF3B30]/60 ring-1 ring-[#FF3B30]/20 bg-rose-50/10',
    POR_REVISAR: 'border-[#FF9500]/60 ring-1 ring-[#FF9500]/20 bg-amber-50/10',
};

function inicializarRespuestas(criterios: CriterioEvaluable[]): Record<string, string> {
    const inicial: Record<string, string> = {};
    for (const c of criterios) {
        if (c.estado && c.estado !== 'NO_APLICA') {
            inicial[c.codigo] = c.estado;
        }
    }
    return inicial;
}

function inicializarNotas(criterios: CriterioEvaluable[]): Record<string, string> {
    const inicial: Record<string, string> = {};
    for (const c of criterios) {
        if (c.notas) {
            inicial[c.codigo] = c.notas;
        }
    }
    return inicial;
}

function inicializarCriteriosGuardados(criterios: CriterioEvaluable[]): Record<string, boolean> {
    const inicial: Record<string, boolean> = {};
    for (const c of criterios) {
        if (c.estado && c.estado !== 'NO_APLICA') {
            inicial[c.codigo] = true;
        }
    }
    return inicial;
}

function obtenerTieneEquiposFritura(autoevaluacion?: ChecklistProps['autoevaluacion']): boolean | null {
    const caracteristicas = autoevaluacion?.caracteristicas_declaradas as { tiene_equipos_fritura?: boolean | null } | null | undefined;
    return autoevaluacion?.tiene_equipos_fritura ?? caracteristicas?.tiene_equipos_fritura ?? null;
}

function calcularContextoParametrico(autoevaluacion?: ChecklistProps['autoevaluacion']): ContextoParametricoLocal {
    const areaM2Declarada = magnitudDeclarada(autoevaluacion?.area_m2);
    const pisosDeclarados = magnitudDeclarada(autoevaluacion?.pisos);
    const aforoDeclarado = magnitudDeclarada(autoevaluacion?.aforo);
    const areaM2Num = areaM2Declarada ?? 0;
    const aforoNum = aforoDeclarado ?? 0;

    const extintoresMinimos = areaM2Declarada !== null ? Math.ceil(areaM2Declarada / 60) : 0;
    const extintoresPorPisos = pisosDeclarados;
    const extintoresSugeridos = Math.max(1, Math.max(extintoresMinimos, extintoresPorPisos ?? 0));

    return {
        areaM2Declarada,
        mostrarDotacionExtintores: areaM2Declarada !== null,
        extintoresSugeridos,
        areaM2Num,
        extintoresMinimos,
        extintoresPorPisos,
        tieneEquiposFritura: obtenerTieneEquiposFritura(autoevaluacion),
        mostrarExigenciasAforo: aforoDeclarado !== null,
        aforoNum,
        mostrarAlertaAforo50: aforoNum > 50,
        mostrarAlertaAforo100: aforoNum > 100,
    };
}

function filtrarHallazgos(criterios: CriterioEvaluable[], respuestas: Record<string, string>): CriterioEvaluable[] {
    return criterios.filter((c) => {
        const estado = respuestas[c.codigo];
        return estado === 'PENDIENTE_ATENDER' || estado === 'POR_REVISAR';
    });
}

function calcularProgresoPorArea(areas: AreaNormativa[], respuestas: Record<string, string>): ProgresoAreaItem[] {
    return areas.map((area) => {
        const respondidos = area.criterios.filter((c) => Boolean(respuestas[c.codigo])).length;
        return {
            id: area.id,
            respondidos,
            total: area.criterios.length,
            pendientes: area.criterios.length - respondidos,
            completo: respondidos === area.criterios.length,
        };
    });
}

function desplazarElementoAlCentro(idElemento: string): void {
    document.getElementById(idElemento)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function desplazarAPrimerPendiente(especialidadVisible: AreaNormativa | null, respuestas: Record<string, string>): void {
    const primerPendiente = especialidadVisible?.criterios.find((c) => !respuestas[c.codigo]);
    if (!primerPendiente) {
        return;
    }
    desplazarElementoAlCentro(`criterio-${primerPendiente.codigo}`);
}

function programarDesplazamientoSiguiente(especialidadVisible: AreaNormativa | null, codigoActual: string, respuestas: Record<string, string>): void {
    if (!especialidadVisible) {
        return;
    }

    const indexActual = especialidadVisible.criterios.findIndex((c) => c.codigo === codigoActual);
    if (indexActual < 0) {
        return;
    }

    const siguienteSinResponder = especialidadVisible.criterios
        .slice(indexActual + 1)
        .find((c) => !respuestas[c.codigo] && c.codigo !== codigoActual);

    if (!siguienteSinResponder) {
        return;
    }

    setTimeout(() => {
        desplazarElementoAlCentro(`criterio-${siguienteSinResponder.codigo}`);
    }, 350);
}

function normalizarNotaCriterio(nota?: string): string | null {
    const limpia = (nota || '').trim();
    return limpia || null;
}

function construirRespuestasAvance(respuestas: Record<string, string>, notas: Record<string, string>): RespuestaEnvioItem[] {
    return Object.entries(respuestas)
        .filter(([, estado]) => Boolean(estado))
        .map(([codigo, estado]) => ({
            codigo,
            estado,
            notas: normalizarNotaCriterio(notas[codigo]),
        }));
}

function construirRespuestasCompletas(
    criterios: CriterioEvaluable[],
    respuestas: Record<string, string>,
    notas: Record<string, string>,
): RespuestaEnvioItem[] {
    return criterios.map((c) => ({
        codigo: c.codigo,
        estado: respuestas[c.codigo],
        notas: normalizarNotaCriterio(notas[c.codigo]),
    }));
}

function marcarComoGuardados(previos: Record<string, boolean>, enviados: RespuestaEnvioItem[]): Record<string, boolean> {
    const nuevosGuardados = { ...previos };
    for (const item of enviados) {
        nuevosGuardados[item.codigo] = true;
    }
    return nuevosGuardados;
}

function resolverMensajeErrorGuardado(status: number, data: { errors?: Record<string, unknown>; message?: string; mensaje?: string }): string {
    if (status === 422) {
        if (data.errors && typeof data.errors === 'object') {
            return Object.values(data.errors).flat().join(' ');
        }
        return data.message || 'Algunas declaraciones no son válidas.';
    }
    return data.mensaje || 'No fue posible guardar su avance. Intente nuevamente.';
}

async function enviarRespuestasChecklist(uuid: string, respuestasAEnviar: RespuestaEnvioItem[]): Promise<Response> {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    return fetch(`/autoevaluacion/${uuid}/checklist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ respuestas: respuestasAEnviar }),
    });
}

function determinarTieneRecursos(criterio: CriterioEvaluable): boolean {
    return Boolean(criterio.recursos_educativos && criterio.recursos_educativos.length > 0);
}

function determinarTieneGuiaPedagogica(criterio: CriterioEvaluable, comparativa?: GuiaComparativa): boolean {
    return Boolean(criterio.que_observar || criterio.accion_mejora_orientativa || criterio.norma_base || criterio.articulo_referencia || comparativa);
}

function obtenerReferenciaNormativa(criterio: CriterioEvaluable): string | null | undefined {
    return criterio.norma_base || criterio.articulo_referencia;
}

function obtenerBordeTarjeta(esRegistrada: boolean, valorSeleccionado?: string): string {
    if (esRegistrada) {
        return 'border-slate-200 bg-white';
    }
    if (valorSeleccionado && BORDES_TARJETA_POR_ESTADO[valorSeleccionado]) {
        return BORDES_TARJETA_POR_ESTADO[valorSeleccionado];
    }
    return 'border-slate-200/80 bg-white hover:border-slate-300';
}

function obtenerConfigOpcion(opcionKey: string): OpcionConfig {
    return (
        OPCIONES_ETIQUETAS[opcionKey] || {
            label: opcionKey,
            descripcion: '',
            icono: HelpCircle,
            borderSelected: 'border-slate-900',
            bgSelected: 'bg-slate-100',
            textSelected: 'text-slate-900',
            iconSelected: 'text-slate-900',
            dotSelected: 'bg-slate-900',
        }
    );
}

function obtenerOpcionesRespuesta(criterio: CriterioEvaluable): string[] {
    return (criterio.opciones_respuesta || OPCIONES_FALLBACK).filter((op) => op !== 'NO_APLICA');
}

function obtenerTextoFrituraExtintores(tieneEquiposFritura: boolean | null): string {
    if (tieneEquiposFritura === true) {
        return 'Con freidoras o cocina comercial declaradas se requiere extintor Tipo K (acetato de potasio).';
    }
    if (tieneEquiposFritura === false) {
        return 'Tipo K no requerido con la declaración actual.';
    }
    return 'Equipamiento de fritura no declarado: el Tipo K no puede descartarse.';
}

interface BadgeEstadoCriterioProps {
    estaGuardado?: boolean;
    estaRespondido: boolean;
    estadoActual?: string;
}

function BadgeEstadoCriterio({ estaGuardado, estaRespondido, estadoActual }: Readonly<BadgeEstadoCriterioProps>) {
    if (estadoActual === 'PENDIENTE_ATENDER') {
        return (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                <ShieldAlert className="text-warning-800 h-4 w-4" aria-hidden="true" />
                <span>Por subsanar</span>
            </span>
        );
    }

    if (estadoActual === 'POR_REVISAR') {
        return (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                <HelpCircle className="text-warning-800 h-4 w-4" aria-hidden="true" />
                <span>Por revisar</span>
            </span>
        );
    }

    if (estaGuardado) {
        return (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <Check className="text-success-800 h-3 w-3" aria-hidden="true" /> Guardado
            </span>
        );
    }

    if (estaRespondido) {
        return (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="text-success-800 h-3 w-3" aria-hidden="true" /> Conforme
            </span>
        );
    }

    return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
            Sin responder
        </span>
    );
}

interface OpcionRespuestaCriterioProps {
    readonly criterioCodigo: string;
    readonly opcionKey: string;
    readonly esSeleccionado: boolean;
    readonly esRegistrada: boolean;
    readonly deshabilitado: boolean;
    readonly bloqueadoSubsanacion?: boolean;
    readonly onSelect: (codigo: string, estado: string) => void;
}

function OpcionRespuestaCriterio({
    criterioCodigo,
    opcionKey,
    esSeleccionado,
    esRegistrada,
    deshabilitado,
    bloqueadoSubsanacion = false,
    onSelect,
}: Readonly<OpcionRespuestaCriterioProps>) {
    const conf = obtenerConfigOpcion(opcionKey);
    const IconoOpcion = conf.icono;

    let claseCursor = 'cursor-pointer';
    if (deshabilitado) {
        claseCursor = 'cursor-not-allowed opacity-50';
    } else if (esRegistrada) {
        claseCursor = 'cursor-default opacity-90';
    }

    let claseSeleccion = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60';
    if (esSeleccionado) {
        claseSeleccion = `${conf.borderSelected} ${conf.bgSelected} shadow-xs ring-1 ring-black/5`;
    } else if (bloqueadoSubsanacion) {
        claseSeleccion = 'border-slate-200 bg-slate-100/70 opacity-60';
    }

    const handleClick = (e: React.MouseEvent<HTMLLabelElement>) => {
        if (deshabilitado) {
            e.preventDefault();
        }
    };

    return (
        <label
            htmlFor={`${criterioCodigo}-${opcionKey}`}
            aria-label={`Opción ${conf.label} para criterio ${criterioCodigo}${bloqueadoSubsanacion ? ' (bloqueada por observaciones)' : ''}`}
            title={bloqueadoSubsanacion ? 'Opción bloqueada: este ítem tiene observaciones técnicas y requiere subsanación previa' : undefined}
            onClick={handleClick}
            className={`group relative flex flex-col justify-between rounded-2xl border-2 p-4 text-left transition-all duration-150 select-none focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-700 active:scale-[0.99] ${claseCursor} ${claseSeleccion}`}
        >
            <input
                type="radio"
                id={`${criterioCodigo}-${opcionKey}`}
                name={`criterio-${criterioCodigo}`}
                value={opcionKey}
                checked={esSeleccionado}
                disabled={deshabilitado}
                onChange={() => {
                    if (!deshabilitado) {
                        onSelect(criterioCodigo, opcionKey);
                    }
                }}
                className="sr-only"
            />
            <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                        <IconoOpcion
                            className={`h-4 w-4 shrink-0 transition-colors ${
                                esSeleccionado ? conf.iconSelected : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                            aria-hidden="true"
                        />
                        <span className={`text-sm font-bold tracking-tight ${esSeleccionado ? conf.textSelected : 'text-slate-800'}`}>
                            {conf.label}
                        </span>
                    </span>
                    <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                            esSeleccionado ? `${conf.borderSelected} bg-white` : 'border-slate-300 bg-transparent group-hover:border-slate-400'
                        }`}
                        aria-hidden="true"
                    >
                        {esSeleccionado && <span className={`h-2 w-2 rounded-full ${conf.dotSelected}`} />}
                    </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">{conf.descripcion}</p>
                {bloqueadoSubsanacion && (
                    <span className="mt-2 inline-block text-[11px] font-bold text-amber-700">Bloqueado por observación técnica</span>
                )}
            </div>
        </label>
    );
}

interface BloqueParametricoProps {
    contexto: ContextoParametricoLocal;
}

function BloqueParametricoExtintores({ contexto }: Readonly<BloqueParametricoProps>) {
    const { extintoresSugeridos, areaM2Num, extintoresMinimos, extintoresPorPisos, tieneEquiposFritura } = contexto;

    return (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-3 text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-black">
                <Ruler className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Contexto declarado: dotación de extintores</span>
            </div>
            <p className="mt-1.5 text-sm font-black">
                {extintoresSugeridos} {extintoresSugeridos === 1 ? 'extintor' : 'extintores'} como mínimo sugerido
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-emerald-900/80">
                Cálculo orientativo: ceil({areaM2Num.toFixed(2)} m² / 60) = {extintoresMinimos}
                {extintoresPorPisos !== null && `; por pisos = ${extintoresPorPisos}`}. Recorrido máximo ≤ 15 m horizontales y altura máxima 1.50 m al
                soporte (RNE A.130).
            </p>
            <p className={`mt-1.5 text-[11px] leading-relaxed ${tieneEquiposFritura ? 'font-semibold text-amber-800' : 'text-emerald-900/80'}`}>
                {obtenerTextoFrituraExtintores(tieneEquiposFritura)}
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-emerald-900/60">
                Orientativo: no sustituye la verificación de carga y riesgo por el especialista.
            </p>
        </div>
    );
}

function BloqueParametricoAforo({ contexto }: Readonly<BloqueParametricoProps>) {
    const { aforoNum, mostrarAlertaAforo50, mostrarAlertaAforo100 } = contexto;

    return (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-3 text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-black">
                <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Contexto declarado: exigencias por aforo</span>
            </div>
            <p className="mt-1.5 text-sm font-black">
                {aforoNum} {aforoNum === 1 ? 'persona' : 'personas'} declaradas
            </p>

            {mostrarAlertaAforo50 && (
                <p className="mt-1.5 text-[11px] leading-relaxed">
                    Por superar las 50 personas, la puerta de salida debe abrir obligatoriamente hacia el exterior como flujo de evacuación (RNE A.010
                    Art. 35.d / RNE A.130 Art. 8).
                </p>
            )}
            {mostrarAlertaAforo100 && (
                <p className="mt-1.5 text-[11px] leading-relaxed font-semibold text-rose-800">
                    Por superar las 100 personas es obligatoria la barra antipánico (RNE A.010 / RNE A.130).
                </p>
            )}
            {!mostrarAlertaAforo50 && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-900/80">
                    Con aforo ≤ 50 personas no se activa la exigencia paramétrica señalada; igualmente debe garantizarse la salida expedita y sin
                    trabas.
                </p>
            )}
        </div>
    );
}

interface AccionesApoyoCriterioProps {
    criterio: CriterioEvaluable;
    comparativa?: GuiaComparativa;
    tieneGuiaPedagogica: boolean;
    tieneRecursos: boolean;
    onOpenGuiaPedagogica: (datos: DatosGuiaPedagogicaModal) => void;
    onOpenRecurso: (datos: DatosRecursoModal) => void;
}

function AccionesApoyoCriterio({
    criterio,
    comparativa,
    tieneGuiaPedagogica,
    tieneRecursos,
    onOpenGuiaPedagogica,
    onOpenRecurso,
}: Readonly<AccionesApoyoCriterioProps>) {
    const recursos = criterio.recursos_educativos || [];
    const sufijoRecursos = recursos.length > 1 ? `(${recursos.length})` : '';

    return (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-3">
            {tieneGuiaPedagogica && (
                <button
                    type="button"
                    onClick={() =>
                        onOpenGuiaPedagogica({
                            codigo: criterio.codigo,
                            titulo: criterio.titulo,
                            explicacionCotidiana: comparativa?.explicacionCotidiana,
                            queObservar: criterio.que_observar || undefined,
                            correcto: comparativa?.correcto,
                            incorrecto: comparativa?.incorrecto,
                            normaBase: criterio.norma_base,
                            articuloReferencia: criterio.articulo_referencia,
                        })
                    }
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/80 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-100 hover:text-emerald-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-[0.98]"
                >
                    <Lightbulb className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>Ayuda visual: ¿Cómo revisar esto?</span>
                </button>
            )}

            {tieneRecursos && (
                <button
                    type="button"
                    onClick={() =>
                        onOpenRecurso({
                            recursos,
                            codigo: criterio.codigo,
                            titulo: criterio.titulo,
                        })
                    }
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none active:scale-[0.98]"
                >
                    <BookOpen className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                    <span>Material orientativo {sufijoRecursos}</span>
                </button>
            )}
        </div>
    );
}

interface DisciplinaVisual {
    nombre: string;
    icono: React.ComponentType<{ className?: string }>;
    gradientBg: string;
    borderColor: string;
    chipBg: string;
}

function resolverDisciplinaCriterio(criterio: CriterioEvaluable): DisciplinaVisual {
    const cat = (criterio.categoria || '').toLowerCase();
    const cod = (criterio.codigo || '').toUpperCase();

    if (cat.includes('eléctric') || cod === 'CRIT-05' || cod === 'CRIT-06' || cod === 'CRIT-07' || cod === 'CRIT-14A') {
        return {
            nombre: 'Instalaciones Eléctricas',
            icono: Zap,
            gradientBg: 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent',
            borderColor: 'border-amber-200/80',
            chipBg: 'bg-amber-100 text-amber-900 border border-amber-300/80',
        };
    }

    if (cat.includes('incendio') || cat.includes('fuego') || cod === 'CRIT-01' || cod === 'CRIT-02' || cod === 'CRIT-02A') {
        return {
            nombre: 'Seguridad y Contra Incendios',
            icono: Flame,
            gradientBg: 'bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent',
            borderColor: 'border-rose-200/80',
            chipBg: 'bg-rose-100 text-rose-900 border border-rose-300/80',
        };
    }

    if (
        cat.includes('evacuación') ||
        cat.includes('señalización') ||
        cat.includes('arquitectura') ||
        cod === 'CRIT-02B' ||
        cod === 'CRIT-03' ||
        cod === 'CRIT-04' ||
        cod === 'CRIT-08'
    ) {
        return {
            nombre: 'Arquitectura y Evacuación',
            icono: Compass,
            gradientBg: 'bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent',
            borderColor: 'border-blue-200/80',
            chipBg: 'bg-blue-100 text-blue-900 border border-blue-300/80',
        };
    }

    if (cat.includes('gas') || cat.includes('glp') || cod === 'CRIT-10') {
        return {
            nombre: 'Instalaciones de Gas',
            icono: Flame,
            gradientBg: 'bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent',
            borderColor: 'border-orange-200/80',
            chipBg: 'bg-orange-100 text-orange-900 border border-orange-300/80',
        };
    }

    return {
        nombre: 'Estructuras y Almacenamiento',
        icono: Shield,
        gradientBg: 'bg-gradient-to-r from-slate-500/15 via-slate-500/5 to-transparent',
        borderColor: 'border-slate-200/80',
        chipBg: 'bg-slate-100 text-slate-800 border border-slate-300/80',
    };
}

interface TarjetaCriterioProps {
    readonly criterio: CriterioEvaluable;
    readonly index: number;
    readonly valorSeleccionado?: string;
    readonly estaGuardado?: boolean;
    readonly esRegistrada: boolean;
    readonly deshabilitado: boolean;
    readonly contextoParametrico: ContextoParametricoLocal;
    readonly autoevaluacionUuid?: string;
    readonly onSelectRespuesta: (codigo: string, estado: string) => void;
    readonly onOpenGuiaPedagogica: (datos: DatosGuiaPedagogicaModal) => void;
    readonly onOpenRecurso: (datos: DatosRecursoModal) => void;
}

function TarjetaCriterio({
    criterio,
    index,
    valorSeleccionado,
    estaGuardado,
    esRegistrada,
    deshabilitado,
    contextoParametrico,
    autoevaluacionUuid,
    onSelectRespuesta,
    onOpenGuiaPedagogica,
    onOpenRecurso,
}: Readonly<TarjetaCriterioProps>) {
    const estaRespondido = Boolean(valorSeleccionado);
    const estaObservado =
        valorSeleccionado === 'PENDIENTE_ATENDER' ||
        valorSeleccionado === 'OBSERVADO' ||
        criterio.estado === 'PENDIENTE_ATENDER' ||
        criterio.estado === 'OBSERVADO';
    const tieneRecursos = determinarTieneRecursos(criterio);
    const comparativa = COMPARATIVA_CORRECTO_INCORRECTO[criterio.codigo];
    const tieneGuiaPedagogica = determinarTieneGuiaPedagogica(criterio, comparativa);
    const referenciaNormativa = obtenerReferenciaNormativa(criterio);
    const bordeTarjeta = obtenerBordeTarjeta(esRegistrada, valorSeleccionado);
    const opciones = obtenerOpcionesRespuesta(criterio);
    const disciplina = resolverDisciplinaCriterio(criterio);
    const IconoDisciplina = disciplina.icono;

    return (
        <article
            id={`criterio-${criterio.codigo}`}
            className={`mb-6 scroll-mt-28 overflow-hidden rounded-3xl border-2 shadow-xs transition-all duration-300 ${bordeTarjeta}`}
        >
            {/* Micro-banner decorativo de especialidad */}
            <div
                className={`flex items-center justify-between border-b px-5 py-2.5 transition-colors ${disciplina.gradientBg} ${disciplina.borderColor}`}
            >
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${disciplina.chipBg}`}>
                        <IconoDisciplina className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{disciplina.nombre}</span>
                    </span>
                    <span className="font-mono text-xs text-slate-400">#{criterio.orden ?? index + 1}</span>
                </div>

                <BadgeEstadoCriterio estaGuardado={estaGuardado} estaRespondido={estaRespondido} estadoActual={valorSeleccionado} />
            </div>

            <div className="p-5 sm:p-6">
                <fieldset className="space-y-4">
                    {/* El legend debe ser el primer hijo del fieldset; el título visible va aparte para conservar el orden visual */}
                    <legend className="sr-only">{criterio.titulo}</legend>

                    {/* Enunciado y pregunta técnica al comerciante */}
                    <div>
                        <p className="text-lg leading-snug font-semibold text-slate-900">{criterio.titulo}</p>
                        <p className="mt-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-base leading-relaxed font-medium text-slate-800">
                            {criterio.pregunta_ciudadana}
                        </p>
                    </div>

                    <details className="rounded-xl border border-slate-200 p-3">
                        <summary className="cursor-pointer text-sm font-medium text-slate-600">Norma y referencia del criterio</summary>
                        {/* Cabecera técnica de código + base normativa */}
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
                            <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold tracking-tight text-white shadow-2xs">
                                {criterio.codigo}
                            </span>
                            {referenciaNormativa && (
                                <span
                                    className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                                    title={referenciaNormativa}
                                >
                                    <Scale className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                                    <span className="truncate">{referenciaNormativa}</span>
                                </span>
                            )}
                            {criterio.categoria && (
                                <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                    {criterio.categoria}
                                </span>
                            )}
                        </div>
                    </details>
                    {/* Selector segmentado de las tres declaraciones ciudadanas
                        autorizadas. `NO_APLICA` se sigue filtrando aquí y en
                        el payload: es una determinación exclusiva del motor. */}
                    <div role="radiogroup" aria-label={`Opciones de respuesta para ${criterio.codigo}`} className="grid gap-3 pt-1 sm:grid-cols-3">
                        {opciones.map((opcionKey) => {
                            const esCumpleBloqueado = estaObservado && opcionKey === 'CUMPLE_DECLARADO';
                            return (
                                <OpcionRespuestaCriterio
                                    key={opcionKey}
                                    criterioCodigo={criterio.codigo}
                                    opcionKey={opcionKey}
                                    esSeleccionado={valorSeleccionado === opcionKey}
                                    esRegistrada={esRegistrada}
                                    deshabilitado={deshabilitado || esCumpleBloqueado}
                                    bloqueadoSubsanacion={esCumpleBloqueado}
                                    onSelect={onSelectRespuesta}
                                />
                            );
                        })}
                    </div>

                    {/* Candado de Subsanación en Frontend */}
                    {estaObservado && (
                        <div
                            role="alert"
                            className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 shadow-2xs sm:flex-row sm:items-center"
                        >
                            <div className="flex items-start gap-2.5">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                                <p className="leading-relaxed font-medium">
                                    Este ítem tiene observaciones técnicas. Para declararlo conforme, debe registrar la acción correctiva y evidencia
                                    en la Hoja de Subsanación.
                                </p>
                            </div>
                            {autoevaluacionUuid && (
                                <Link
                                    href={route('autoevaluacion.subsanar_items', { uuid: autoevaluacionUuid })}
                                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-100 px-3.5 py-2 font-bold text-amber-950 shadow-2xs transition-colors hover:bg-amber-200/90 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none active:scale-95"
                                >
                                    <span>Ir a Subsanar</span>
                                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Contexto paramétrico: se muestra solo cuando el dato del
                        paso 1 realmente existe. Sin dato declarado el bloque no se
                        renderiza, porque calcular sobre 0 afirmaría una dotación que
                        nadie declaró. */}
                    {criterio.codigo === 'CRIT-01' && contextoParametrico.mostrarDotacionExtintores && (
                        <BloqueParametricoExtintores contexto={contextoParametrico} />
                    )}

                    {criterio.codigo === 'CRIT-04' && contextoParametrico.mostrarExigenciasAforo && (
                        <BloqueParametricoAforo contexto={contextoParametrico} />
                    )}

                    {/* Botones de apoyo pedagógico y material orientativo */}
                    {(tieneGuiaPedagogica || tieneRecursos) && (
                        <AccionesApoyoCriterio
                            criterio={criterio}
                            comparativa={comparativa}
                            tieneGuiaPedagogica={tieneGuiaPedagogica}
                            tieneRecursos={tieneRecursos}
                            onOpenGuiaPedagogica={onOpenGuiaPedagogica}
                            onOpenRecurso={onOpenRecurso}
                        />
                    )}
                </fieldset>
            </div>
        </article>
    );
}

interface CabeceraChecklistProps {
    nombreComercio?: string | null;
    areaM2Declarada: number | null;
    mostrarBotonGuardar: boolean;
    onAbrirModalGuardar: () => void;
}

function CabeceraChecklist({ nombreComercio, areaM2Declarada, mostrarBotonGuardar, onAbrirModalGuardar }: Readonly<CabeceraChecklistProps>) {
    return (
        <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <FlujoCiudadano actual={2} />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Revisa las condiciones de tu local</h1>
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                            <span className="truncate font-semibold text-slate-800">{nombreComercio || 'Establecimiento'}</span>
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                            ·
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Ruler className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                            {areaM2Declarada !== null ? (
                                <span>{areaM2Declarada} m² de área declarada</span>
                            ) : (
                                <span className="text-slate-500">Área no declarada</span>
                            )}
                        </span>
                    </p>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
                        Declara la situación real de cada condición de tu establecimiento. El simulacro es orientativo y no reemplaza una inspección
                        técnica oficial.
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {mostrarBotonGuardar && (
                        <button
                            type="button"
                            onClick={onAbrirModalGuardar}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                        >
                            <Save className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Guardar progreso</span>
                        </button>
                    )}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </header>
    );
}

interface PestanasEspecialidadesProps {
    areas: AreaNormativa[];
    progresoPorArea: ProgresoAreaItem[];
    especialidadActivaId?: string;
    onSelectEspecialidad: (id: string) => void;
}

function PestanasEspecialidades({ areas, progresoPorArea, especialidadActivaId, onSelectEspecialidad }: Readonly<PestanasEspecialidadesProps>) {
    if (areas.length <= 1) {
        return null;
    }

    return (
        <div className="border-b border-slate-200">
            <nav aria-label="Especialidades normadas de la verificación" className="-mb-px flex gap-2 overflow-x-auto pb-px">
                {areas.map((area) => {
                    const avance = progresoPorArea.find((p) => p.id === area.id);
                    const IconoEspecialidad = area.icono;
                    const activa = especialidadActivaId === area.id;

                    const getIconClass = () => {
                        if (area.id === 'electricas') return 'text-amber-500';
                        if (area.id === 'incendios') return 'text-rose-500';
                        if (area.id === 'evacuacion') return 'text-blue-500';
                        return activa ? 'text-emerald-600' : 'text-slate-400';
                    };

                    return (
                        <button
                            key={area.id}
                            type="button"
                            onClick={() => onSelectEspecialidad(area.id)}
                            aria-current={activa ? 'true' : undefined}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-t-2xl border border-b-0 px-4 py-3 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                                activa
                                    ? 'border-slate-300 bg-white text-slate-900 shadow-xs'
                                    : 'border-transparent text-slate-500 hover:bg-white/60 hover:text-slate-800'
                            }`}
                        >
                            <IconoEspecialidad className={`h-4 w-4 shrink-0 ${getIconClass()}`} aria-hidden="true" />
                            <span className="hidden sm:inline">{area.nombre}</span>
                            <span className="sm:hidden">{area.nombreCorto}</span>

                            {avance?.completo ? (
                                <span
                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700"
                                    aria-label="Especialidad completada"
                                >
                                    <Check className="h-3 w-3" aria-hidden="true" />
                                </span>
                            ) : (
                                <span
                                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800"
                                    aria-label={`${avance?.pendientes ?? 0} criterios pendientes`}
                                >
                                    {avance?.pendientes ?? 0}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

interface SeccionCriteriosPendientesProps {
    criteriosPendientes: CriterioInformacionPendiente[];
    mostrarPendientes: boolean;
    onTogglePendientes: () => void;
}

function SeccionCriteriosPendientes({ criteriosPendientes, mostrarPendientes, onTogglePendientes }: Readonly<SeccionCriteriosPendientesProps>) {
    if (criteriosPendientes.length === 0) {
        return null;
    }

    return (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
            <button
                type="button"
                onClick={onTogglePendientes}
                aria-expanded={mostrarPendientes}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl text-left focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
                <div className="flex items-center gap-2.5">
                    <Info className="h-5 w-5 shrink-0 text-amber-600" />
                    <h2 className="text-base font-bold text-amber-900">
                        Información pendiente para determinar aplicabilidad ({criteriosPendientes.length})
                    </h2>
                </div>
                {mostrarPendientes ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-amber-700" />
                ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-amber-700" />
                )}
            </button>

            {mostrarPendientes && (
                <div className="mt-3 space-y-3 border-t border-amber-200 pt-3">
                    <p className="text-xs text-amber-800">
                        Los siguientes criterios requieren datos adicionales sobre las condiciones físicas del local para determinar si corresponden a
                        tu autoevaluación. No requieren respuesta en este momento.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {criteriosPendientes.map((cp) => (
                            <div key={cp.codigo} className="rounded-2xl border border-amber-200 bg-white p-3.5 shadow-2xs">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-xs font-bold text-amber-900">{cp.codigo}</span>
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                        Pendiente de dato
                                    </span>
                                </div>
                                <p className="mt-1.5 text-xs font-bold text-slate-800">{cp.titulo}</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600">{cp.mensaje || cp.motivo}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

interface CabeceraEspecialidadActivaProps {
    especialidad: AreaNormativa;
    estilo: EstiloArea;
    avance?: ProgresoAreaItem;
    esRegistrada: boolean;
    onEnfocarPrimerPendiente: () => void;
}

function CabeceraEspecialidadActiva({
    especialidad,
    estilo,
    avance,
    esRegistrada,
    onEnfocarPrimerPendiente,
}: Readonly<CabeceraEspecialidadActivaProps>) {
    const tienePendientes = (avance?.pendientes ?? 0) > 0 && !esRegistrada;

    const renderIconoArea = () => {
        if (especialidad.id === 'electricas') {
            return <Zap className="h-5 w-5 text-amber-500" aria-hidden="true" />;
        }
        if (especialidad.id === 'incendios') {
            return <Flame className="h-5 w-5 text-rose-500" aria-hidden="true" />;
        }
        if (especialidad.id === 'evacuacion') {
            return <Compass className="h-5 w-5 text-blue-500" aria-hidden="true" />;
        }
        const IconoAreaActivo = especialidad.icono ?? ClipboardList;
        return <IconoAreaActivo className="h-5 w-5" aria-hidden="true" />;
    };

    return (
        <div className={`flex flex-col gap-3 rounded-3xl border p-5 sm:flex-row sm:items-center sm:justify-between ${estilo.banner}`}>
            <div className="flex items-center gap-3.5">
                <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${estilo.chipIcono} ${estilo.acento} shadow-2xs`}
                >
                    {renderIconoArea()}
                </span>
                <div className="min-w-0">
                    <h2 id={`area-titulo-${especialidad.id}`} className={`text-base font-black tracking-tight sm:text-lg ${estilo.acento}`}>
                        {especialidad.nombre}
                    </h2>
                    {estilo.badgeNorma && (
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                            <Scale className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>Base normativa: {estilo.badgeNorma}</span>
                        </p>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-bold whitespace-nowrap text-slate-700 shadow-2xs">
                    {avance?.respondidos ?? 0} de {especialidad.criterios.length}
                </span>
                {tienePendientes && (
                    <button
                        type="button"
                        onClick={onEnfocarPrimerPendiente}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        Primer pendiente
                    </button>
                )}
            </div>
        </div>
    );
}

interface SeccionCriteriosNoAplicanProps {
    criteriosNoAplican: CriterioNoAplica[];
    mostrarNoAplican: boolean;
    onToggleNoAplican: () => void;
}

function SeccionCriteriosNoAplican({ criteriosNoAplican, mostrarNoAplican, onToggleNoAplican }: Readonly<SeccionCriteriosNoAplicanProps>) {
    if (criteriosNoAplican.length === 0) {
        return null;
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
            <button
                type="button"
                onClick={onToggleNoAplican}
                aria-expanded={mostrarNoAplican}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl text-left focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
            >
                <div className="flex items-center gap-2.5">
                    <ShieldAlert className="h-5 w-5 shrink-0 text-slate-400" />
                    <h2 className="text-base font-bold text-slate-800">
                        Condiciones que el sistema determinó como no aplicables ({criteriosNoAplican.length})
                    </h2>
                </div>
                {mostrarNoAplican ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
                ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                )}
            </button>

            {mostrarNoAplican && (
                <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                    <p className="text-xs text-slate-500">
                        El motor de aplicabilidad descartó estas condiciones a partir de lo que declaraste en el paso 1. La decisión es del sistema,
                        no tuya: no son seleccionables ni requieren acción ciudadana.
                    </p>
                    <div className="space-y-2">
                        {criteriosNoAplican.map((cna) => (
                            <div key={cna.codigo} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-xs font-bold text-slate-800">{cna.codigo}</span>
                                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                                        No aplica
                                    </span>
                                </div>
                                <p className="mt-1.5 text-sm font-bold text-slate-800">{cna.titulo}</p>
                                <p className="mt-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
                                    <strong className="text-slate-700">Motivo del sistema: </strong>
                                    {cna.motivo}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

interface PanelHallazgosEnVivoProps {
    hallazgos: CriterioEvaluable[];
    respondidosCount: number;
    totalCriterios: number;
    porcentajeAvance: number;
}

function PanelHallazgosEnVivo({ hallazgos, respondidosCount, totalCriterios, porcentajeAvance }: Readonly<PanelHallazgosEnVivoProps>) {
    const faltasDetectadas = hallazgos.length;

    return (
        <aside aria-label="Pendientes según tus respuestas" className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-24 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <ShieldAlert className="h-4 w-4" />
                    </span>
                    <h2 className="text-[11px] font-black tracking-wider text-slate-800 uppercase">Resumen de hallazgos en vivo</h2>
                </div>

                <div>
                    <p className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black tracking-tight ${faltasDetectadas > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {faltasDetectadas}
                        </span>
                        <span className="text-sm font-bold text-slate-700">
                            {faltasDetectadas === 1 ? 'condición por atender' : 'condiciones por atender'}
                        </span>
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        Se actualiza con cada declaración que marques, sin guardar nada.
                    </p>
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                        <span className="font-bold tracking-wider text-slate-500 uppercase">Avance</span>
                        <span className="font-black text-slate-900">
                            {respondidosCount} de {totalCriterios}
                        </span>
                    </div>
                    <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={`h-full rounded-full ${porcentajeAvance === 100 ? 'bg-primary' : 'bg-amber-500'}`}
                            style={{ width: `${porcentajeAvance}%` }}
                        />
                    </div>
                </div>

                {faltasDetectadas === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
                        <p className="flex items-start gap-2 text-xs leading-relaxed font-medium text-emerald-900">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>
                                No has declarado condiciones por atender hasta el momento. Completa la revisión; este contador no acredita
                                cumplimiento.
                            </span>
                        </p>
                    </div>
                ) : (
                    <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
                        {hallazgos.map((hallazgo) => (
                            <li key={hallazgo.codigo} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                                <span className="font-mono text-[10px] font-bold text-rose-500">{hallazgo.codigo}</span>
                                <span className="mt-0.5 block text-xs leading-snug font-semibold">{hallazgo.titulo}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* El panel lateral es solo informativo: las acciones de
                    guardado y cierre viven una sola vez en la barra inferior. */}
                <p className="border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-500">
                    Cuando termines las {totalCriterios} condiciones, podrás pausar y guardar tu avance o pasar al resumen con el diagnóstico final.
                </p>
            </div>
        </aside>
    );
}

interface BarraInferiorAccionesProps {
    uuid: string;
    respondidosCount: number;
    totalCriterios: number;
    todosRespondidos: boolean;
    esRegistrada: boolean;
    guardandoAvance: boolean;
    guardandoContinuar: boolean;
    onGuardarAvance: () => void;
    onContinuarAlResumen: () => void;
}

function BarraInferiorAcciones({
    uuid,
    respondidosCount,
    totalCriterios,
    todosRespondidos,
    esRegistrada,
    guardandoAvance,
    guardandoContinuar,
    onGuardarAvance,
    onContinuarAlResumen,
}: Readonly<BarraInferiorAccionesProps>) {
    const claseBotonContinuar = todosRespondidos
        ? 'cursor-pointer bg-primary text-white hover:bg-emerald-500'
        : 'cursor-not-allowed bg-slate-100 text-slate-400';

    return (
        <div className="sticky bottom-0 z-30 mt-6 border-t border-slate-200 bg-white/95 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                    <ClipboardList className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span className="font-bold text-slate-900">
                        {respondidosCount} de {totalCriterios} respuestas en esta pantalla
                    </span>
                    {!todosRespondidos && !esRegistrada && <span className="text-amber-700">(faltan {totalCriterios - respondidosCount})</span>}
                </div>

                <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
                    {!esRegistrada && (
                        <button
                            type="button"
                            onClick={onGuardarAvance}
                            disabled={guardandoAvance || guardandoContinuar || respondidosCount === 0}
                            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                        >
                            {guardandoAvance ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                            ) : (
                                <Save className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                            )}
                            <span>Pausar y guardar progreso</span>
                        </button>
                    )}

                    {esRegistrada ? (
                        <Link
                            href={`/autoevaluacion/${uuid}/resumen`}
                            className="bg-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                        >
                            <span>Ver Resumen y Diagnóstico Final</span>
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={onContinuarAlResumen}
                            disabled={guardandoAvance || guardandoContinuar || !todosRespondidos}
                            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-xs transition focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${claseBotonContinuar}`}
                        >
                            {guardandoContinuar ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                                    <span>Generando diagnóstico...</span>
                                </>
                            ) : (
                                <>
                                    <span>Ver Resumen y Diagnóstico Final</span>
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Checklist({ autoevaluacion, checklist }: Readonly<ChecklistProps>) {
    const { auth } = usePage().props as { auth?: { user?: unknown } };
    const [mostrarModalGuardar, setMostrarModalGuardar] = useState<boolean>(false);
    const [modalRecurso, setModalRecurso] = useState<{
        isOpen: boolean;
        recursos: RecursoEducativoData[];
        codigo?: string;
        titulo?: string;
    }>({
        isOpen: false,
        recursos: [],
    });

    const criteriosAplicables = useMemo(() => checklist?.criterios ?? [], [checklist]);
    const criteriosNoAplican = useMemo(() => checklist?.no_aplican ?? [], [checklist]);
    const criteriosPendientes = useMemo(() => checklist?.informacion_pendiente ?? [], [checklist]);

    // Agrupación dinámica por especialidad normativa
    const areas = useMemo(() => agruparCriteriosPorArea(criteriosAplicables), [criteriosAplicables]);

    // Especialidad abierta en las pestañas. Solo es presentación: el conjunto de
    // criterios, su estado y el payload enviado al servidor no dependen de ella.
    const [especialidadActiva, setEspecialidadActiva] = useState<string>('');

    // Inicializar respuestas locales a partir de los estados previos que el backend entregue
    const [respuestas, setRespuestas] = useState<Record<string, string>>(() => inicializarRespuestas(criteriosAplicables));

    // Inicializar notas privadas del ciudadano
    const [notas] = useState<Record<string, string>>(() => inicializarNotas(criteriosAplicables));

    // Estado de la Guía Visual Pedagógica interactiva (Modal / Drawer ágil)
    const [modalGuiaPedagogica, setModalGuiaPedagogica] = useState<DatosGuiaPedagogicaModal & { isOpen: boolean }>({
        isOpen: false,
    });

    const [criteriosGuardados, setCriteriosGuardados] = useState<Record<string, boolean>>(() => inicializarCriteriosGuardados(criteriosAplicables));

    const [guardandoAvance, setGuardandoAvance] = useState<boolean>(false);
    const [guardandoContinuar, setGuardandoContinuar] = useState<boolean>(false);
    const [mensajeExito, setMensajeExito] = useState<string | null>(null);
    const [mensajeError, setMensajeError] = useState<string | null>(null);
    const [mostrarNoAplican, setMostrarNoAplican] = useState<boolean>(false);
    const [mostrarPendientes, setMostrarPendientes] = useState<boolean>(true);

    // Cantidad de criterios aplicables con respuesta seleccionada
    const respondidosCount = useMemo(
        () => criteriosAplicables.filter((c) => Boolean(respuestas[c.codigo])).length,
        [criteriosAplicables, respuestas],
    );

    const esRegistrada = autoevaluacion?.estado === 'REGISTRADA';
    const todosRespondidos = respondidosCount === criteriosAplicables.length && criteriosAplicables.length > 0;
    const puedeVerResumen = todosRespondidos || esRegistrada;
    const porcentajeAvance = criteriosAplicables.length > 0 ? Math.round((respondidosCount / criteriosAplicables.length) * 100) : 0;

    const contextoParametrico = calcularContextoParametrico(autoevaluacion);

    const hallazgos = useMemo(() => filtrarHallazgos(criteriosAplicables, respuestas), [criteriosAplicables, respuestas]);

    const progresoPorArea = useMemo(() => calcularProgresoPorArea(areas, respuestas), [areas, respuestas]);

    const especialidadVisible = areas.find((area) => area.id === especialidadActiva) ?? areas[0] ?? null;
    const estiloEspecialidad = especialidadVisible ? (CONFIG_AREA[especialidadVisible.id] ?? CONFIG_AREA_POR_DEFECTO) : null;
    const avanceEspecialidad = especialidadVisible ? progresoPorArea.find((p) => p.id === especialidadVisible.id) : undefined;

    const enfocarPrimerPendiente = () => {
        desplazarAPrimerPendiente(especialidadVisible, respuestas);
    };

    const seleccionarRespuesta = (codigo: string, estado: string) => {
        if (esRegistrada) {
            return;
        }

        const estadoActual = respuestas[codigo];
        const crit = criteriosAplicables.find((c) => c.codigo === codigo);
        const estaObservado =
            estadoActual === 'PENDIENTE_ATENDER' ||
            estadoActual === 'OBSERVADO' ||
            crit?.estado === 'PENDIENTE_ATENDER' ||
            crit?.estado === 'OBSERVADO';

        if (estaObservado && estado === 'CUMPLE_DECLARADO') {
            return;
        }

        setRespuestas((prev) => ({
            ...prev,
            [codigo]: estado,
        }));

        // Si el usuario cambia su respuesta, ya no se considera "guardada" en el servidor hasta que presione guardar
        setCriteriosGuardados((prev) => ({
            ...prev,
            [codigo]: false,
        }));

        setMensajeExito(null);
        setMensajeError(null);

        // Desplazamiento suave guiado hacia la siguiente pregunta sin responder tras 350ms
        programarDesplazamientoSiguiente(especialidadVisible, codigo, respuestas);
    };

    // Acción Secundaria: Guardar Avance (persiste desde 1 respuesta, mantiene INICIADA)
    const handleGuardarAvance = async () => {
        if (esRegistrada) {
            return;
        }

        const respuestasAEnviar = construirRespuestasAvance(respuestas, notas);
        if (respuestasAEnviar.length === 0) {
            setMensajeError('Seleccione al menos una declaración para guardar avance.');
            return;
        }

        setGuardandoAvance(true);
        setMensajeError(null);
        setMensajeExito(null);

        try {
            const response = await enviarRespuestasChecklist(autoevaluacion.uuid, respuestasAEnviar);
            const data = await response.json();

            if (response.ok) {
                setMensajeExito(
                    `Avance guardado correctamente (${respuestasAEnviar.length} de ${criteriosAplicables.length} respondidos). Puede continuar en cualquier momento.`,
                );
                setCriteriosGuardados((prev) => marcarComoGuardados(prev, respuestasAEnviar));
            } else {
                setMensajeError(resolverMensajeErrorGuardado(response.status, data));
            }
        } catch {
            setMensajeError('No fue posible guardar su avance. Verifique su conexión e intente nuevamente.');
        } finally {
            setGuardandoAvance(false);
        }
    };

    // Acción Principal: Continuar al Resumen (comprueba 100%, persiste y redirige a /resumen)
    const handleContinuarAlResumen = async () => {
        if (esRegistrada) {
            router.visit(`/autoevaluacion/${autoevaluacion.uuid}/resumen`, {
                replace: true,
                preserveScroll: false,
                preserveState: false,
            });
            return;
        }

        const faltantes = criteriosAplicables.filter((c) => !respuestas[c.codigo]);
        if (faltantes.length > 0) {
            setMensajeError(
                `Tiene ${faltantes.length} criterio(s) sin responder. Por favor, declare la situación de todas las condiciones aplicables para continuar al resumen.`,
            );
            desplazarElementoAlCentro(`criterio-${faltantes[0].codigo}`);
            return;
        }

        setGuardandoContinuar(true);
        setMensajeError(null);
        setMensajeExito(null);

        const respuestasAEnviar = construirRespuestasCompletas(criteriosAplicables, respuestas, notas);

        try {
            const response = await enviarRespuestasChecklist(autoevaluacion.uuid, respuestasAEnviar);

            if (response.ok) {
                router.visit(`/autoevaluacion/${autoevaluacion.uuid}/resumen`, {
                    replace: true,
                    preserveScroll: false,
                    preserveState: false,
                });
            } else {
                const data = await response.json();
                setMensajeError(data.mensaje || 'No fue posible guardar las declaraciones para continuar. Intente nuevamente.');
                setGuardandoContinuar(false);
            }
        } catch {
            setMensajeError('Ocurrió un error al intentar continuar al resumen. Intente nuevamente.');
            setGuardandoContinuar(false);
        }
    };

    const deshabilitarOpciones = esRegistrada || guardandoAvance || guardandoContinuar;
    const sufijoRegistradaAt = autoevaluacion.registrada_at ? ` el ${autoevaluacion.registrada_at}` : '';

    return (
        <>
            <Head title="Paso 2 de 3: Checklist de Autoevaluación - CheckITSE Huancayo" />

            <div className="relative mx-auto max-w-4xl lg:grid lg:max-w-6xl lg:grid-cols-12 lg:items-start lg:gap-8">
                <div className="space-y-7 pb-32 lg:col-span-8">
                    <CabeceraChecklist
                        nombreComercio={autoevaluacion?.nombre_comercio}
                        areaM2Declarada={contextoParametrico.areaM2Declarada}
                        mostrarBotonGuardar={!auth?.user}
                        onAbrirModalGuardar={() => setMostrarModalGuardar(true)}
                    />

                    <AvisoPreventivo />
                    {/* Widget de progreso */}
                    <div className="sticky top-0 z-30 -mx-4 border-y border-slate-200 bg-white/85 px-4 py-3 shadow-xs backdrop-blur-md sm:-mx-6 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                            <p className="text-[11px] font-black tracking-wider text-slate-500 uppercase">Avance de tus respuestas</p>
                            <p className="text-xs font-semibold text-slate-600">
                                <span className="text-slate-900">
                                    {respondidosCount} de {criteriosAplicables.length}
                                </span>{' '}
                                respuestas en esta pantalla
                            </p>
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                            <progress
                                value={respondidosCount}
                                max={Math.max(1, criteriosAplicables.length)}
                                aria-label="Respuestas completadas; no representa un nivel de seguridad"
                                className="h-2 w-full flex-1 appearance-none overflow-hidden rounded-full border-0 bg-slate-200 [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:rounded-full"
                            >
                                {/* Fallback visual interno */}
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        porcentajeAvance === 100 ? 'bg-emerald-500' : 'bg-slate-900'
                                    }`}
                                    style={{ width: `${porcentajeAvance}%` }}
                                />
                            </progress>
                            <span className="w-12 shrink-0 text-right text-sm font-black text-slate-900 tabular-nums">{porcentajeAvance}%</span>
                        </div>
                    </div>

                    {/* Banner de Autoevaluación Registrada */}
                    {esRegistrada && (
                        <output className="block flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 shadow-xs">
                            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                            <div className="text-sm leading-relaxed">
                                <strong className="font-bold text-emerald-950">Autoevaluación registrada: </strong>
                                Esta autoevaluación está registrada y protegida contra modificaciones
                                {sufijoRegistradaAt}. Sus declaraciones permanecen inalterables. Se encuentra en modo de solo lectura. Para realizar
                                modificaciones debe iniciar una reevaluación preventiva.
                            </div>
                        </output>
                    )}

                    {/* Mensajes de estado */}
                    {mensajeExito && (
                        <output className="block flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                                <div className="text-sm font-medium">{mensajeExito}</div>
                            </div>
                            {puedeVerResumen && (
                                <Link
                                    href={`/autoevaluacion/${autoevaluacion.uuid}/resumen`}
                                    className="bg-primary hover:bg-primary-700 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                                >
                                    <span>Ver Resumen de Autoevaluación</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            )}
                        </output>
                    )}

                    {mensajeError && (
                        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
                            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                            <div className="text-sm font-medium">{mensajeError}</div>
                        </div>
                    )}

                    <PestanasEspecialidades
                        areas={areas}
                        progresoPorArea={progresoPorArea}
                        especialidadActivaId={especialidadVisible?.id}
                        onSelectEspecialidad={setEspecialidadActiva}
                    />

                    <SeccionCriteriosPendientes
                        criteriosPendientes={criteriosPendientes}
                        mostrarPendientes={mostrarPendientes}
                        onTogglePendientes={() => setMostrarPendientes(!mostrarPendientes)}
                    />

                    {/* Criterios de la especialidad abierta */}
                    <div className="space-y-6">
                        {especialidadVisible && estiloEspecialidad && (
                            <section
                                id={`area-${especialidadVisible.id}`}
                                aria-labelledby={`area-titulo-${especialidadVisible.id}`}
                                className="scroll-mt-28 space-y-4"
                            >
                                <CabeceraEspecialidadActiva
                                    especialidad={especialidadVisible}
                                    estilo={estiloEspecialidad}
                                    avance={avanceEspecialidad}
                                    esRegistrada={esRegistrada}
                                    onEnfocarPrimerPendiente={enfocarPrimerPendiente}
                                />

                                <div className="space-y-4">
                                    {especialidadVisible.criterios.map((criterio, index) => (
                                        <TarjetaCriterio
                                            key={criterio.codigo ?? index}
                                            criterio={criterio}
                                            index={index}
                                            valorSeleccionado={respuestas[criterio.codigo]}
                                            estaGuardado={criteriosGuardados[criterio.codigo]}
                                            esRegistrada={esRegistrada}
                                            deshabilitado={deshabilitarOpciones}
                                            contextoParametrico={contextoParametrico}
                                            autoevaluacionUuid={autoevaluacion.uuid}
                                            onSelectRespuesta={seleccionarRespuesta}
                                            onOpenGuiaPedagogica={(datos) =>
                                                setModalGuiaPedagogica({
                                                    isOpen: true,
                                                    ...datos,
                                                })
                                            }
                                            onOpenRecurso={(datos) =>
                                                setModalRecurso({
                                                    isOpen: true,
                                                    ...datos,
                                                })
                                            }
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <SeccionCriteriosNoAplican
                        criteriosNoAplican={criteriosNoAplican}
                        mostrarNoAplican={mostrarNoAplican}
                        onToggleNoAplican={() => setMostrarNoAplican(!mostrarNoAplican)}
                    />
                </div>

                <PanelHallazgosEnVivo
                    hallazgos={hallazgos}
                    respondidosCount={respondidosCount}
                    totalCriterios={criteriosAplicables.length}
                    porcentajeAvance={porcentajeAvance}
                />
            </div>

            <BarraInferiorAcciones
                uuid={autoevaluacion.uuid}
                respondidosCount={respondidosCount}
                totalCriterios={criteriosAplicables.length}
                todosRespondidos={todosRespondidos}
                esRegistrada={esRegistrada}
                guardandoAvance={guardandoAvance}
                guardandoContinuar={guardandoContinuar}
                onGuardarAvance={handleGuardarAvance}
                onContinuarAlResumen={handleContinuarAlResumen}
            />

            <ModalGuardarProgreso
                isOpen={mostrarModalGuardar}
                onClose={() => setMostrarModalGuardar(false)}
                uuid={autoevaluacion?.uuid}
                establecimiento={autoevaluacion?.nombre_comercio}
                destino="checklist"
            />

            <RecursoEducativoModal
                isOpen={modalRecurso.isOpen}
                onClose={() => setModalRecurso({ isOpen: false, recursos: [] })}
                recursos={modalRecurso.recursos}
                criterioCodigo={modalRecurso.codigo}
                criterioTitulo={modalRecurso.titulo}
            />

            <GuiaPedagogicaModal
                isOpen={modalGuiaPedagogica.isOpen}
                onClose={() => setModalGuiaPedagogica((prev) => ({ ...prev, isOpen: false }))}
                codigo={modalGuiaPedagogica.codigo}
                titulo={modalGuiaPedagogica.titulo}
                explicacionCotidiana={modalGuiaPedagogica.explicacionCotidiana}
                queObservar={modalGuiaPedagogica.queObservar}
                correcto={modalGuiaPedagogica.correcto}
                incorrecto={modalGuiaPedagogica.incorrecto}
                normaBase={modalGuiaPedagogica.normaBase}
                articuloReferencia={modalGuiaPedagogica.articuloReferencia}
            />
        </>
    );
}
