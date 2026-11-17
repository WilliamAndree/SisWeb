import { AvisoPreventivo } from '@/components/Evaluacion/FlujoCiudadano';
import { GuiaModal } from '@/components/GuiaModal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    BellRing,
    BookOpen,
    Boxes,
    Building2,
    Calculator,
    CircleCheck,
    CircleHelp,
    ClipboardCheck,
    Clock,
    Compass,
    FileCheck,
    Flame,
    FlameKindling,
    Footprints,
    Gauge,
    Info,
    ListChecks,
    Ruler,
    Search,
    ShieldAlert,
    Users,
    Zap,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

type ModalidadTramite = 'EX_POST' | 'EX_ANTE';

interface EstimacionOrientativa {
    nivel: 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto';
    modalidad: ModalidadTramite;
    titulo: string;
    factores: string[];
}

const GIROS_DISPONIBLES = ['Comercio', 'Encuentro', 'Hospedaje', 'Salud', 'Educacion', 'Industrial', 'Oficinas'] as const;

const AREA_MAXIMA_EX_POST = 750;
const AFORO_MAXIMO_GIRO_ESPECIAL = 100;
const GIROS_ESPECIALES = new Set<string>(['Hospedaje', 'Salud']);

/**
 * Estimación orientativa y exclusivamente local para la landing pública.
 *
 * Reproduce los umbrales de clasificación de riesgo por función y escala física
 * descritos en el compendio normativo de `GuiaModal.tsx` (D.S. 002-2018-PCM y
 * R.J. 016-2018-CENEPRED/J). No consulta, replica ni sustituye a
 * `ItseRiskService::clasificarTramite()`, no persiste datos y no constituye una
 * evaluación: el diagnóstico real se obtiene en el flujo de autoevaluación.
 */
function estimarRiesgoOrientativo(giro: string, area: number | null, aforo: number | null): EstimacionOrientativa {
    const factores: string[] = [];

    const excedeArea = area !== null && area > AREA_MAXIMA_EX_POST;
    if (excedeArea) {
        factores.push(`Área techada de ${area} m², superior al máximo de ${AREA_MAXIMA_EX_POST} m²`);
    }

    const esGiroEspecial = GIROS_ESPECIALES.has(giro);
    const excedeAforoEspecial = esGiroEspecial && aforo !== null && aforo > AFORO_MAXIMO_GIRO_ESPECIAL;
    if (excedeAforoEspecial) {
        factores.push(`Aforo de ${aforo} personas en giro de ${giro.toLowerCase()}, sobre el límite de ${AFORO_MAXIMO_GIRO_ESPECIAL}`);
    }

    const excedeEscalaFisica = excedeArea || excedeAforoEspecial;

    if (excedeEscalaFisica) {
        return {
            nivel: excedeArea && excedeAforoEspecial ? 'Muy Alto' : 'Alto',
            modalidad: 'EX_ANTE',
            titulo: 'ITSE Previa (Ex-Ante)',
            factores: factores.length > 0 ? factores : ['Escala física fuera del rango de Ex-Post'],
        };
    }

    const nivelEscala = area !== null && area > 300 ? 'Medio' : 'Bajo';

    return {
        nivel: nivelEscala,
        modalidad: 'EX_POST',
        titulo: 'ITSE Posterior (Ex-Post)',
        factores:
            factores.length > 0 ? factores : [`Área techada dentro del rango de hasta ${AREA_MAXIMA_EX_POST} m² y giro sin factores agravantes`],
    };
}

/**
 * Cifras de confianza del hero. Describen la plataforma, no un expediente:
 * ninguna depende de datos capturados por el ciudadano. La referencia normativa
 * es la que el motor de clasificación aplica de verdad (ItseRiskService).
 */
/** Resumen de las dos modalidades de trámite para la tarjeta de prospecto. */
const MODALIDADES_RESUMEN: { etiqueta: string; descripcion: string; tono: string; texto: string }[] = [
    {
        etiqueta: 'Ex-Post',
        descripcion: 'Hasta 750 m², 3 pisos y sin factores agravantes.',
        tono: 'border-emerald-100 bg-emerald-50',
        texto: 'text-emerald-800',
    },
    {
        etiqueta: 'Ex-Ante',
        descripcion: 'Escala física amplia, giros especiales, calderos o GLP.',
        tono: 'border-rose-100 bg-rose-50',
        texto: 'text-rose-800',
    },
];

const SEMAFORO_CONFIG: Record<string, { fondo: string; texto: string; borde: string }> = {
    Bajo: { fondo: 'bg-[#34C759]/10', texto: 'text-[#1B7931]', borde: 'border-[#34C759]/30' },
    Medio: { fondo: 'bg-[#FF9500]/10', texto: 'text-[#A05D00]', borde: 'border-[#FF9500]/30' },
    Alto: { fondo: 'bg-[#FF3B30]/10', texto: 'text-[#C9251D]', borde: 'border-[#FF3B30]/30' },
    'Muy Alto': { fondo: 'bg-[#FF3B30]/15', texto: 'text-[#C9251D]', borde: 'border-[#FF3B30]/40' },
};

const PASOS = [
    {
        icono: Search,
        titulo: 'Describe tu local',
        descripcion:
            'Ingresa los datos generales de tu establecimiento en Huancayo y declara sus condiciones físicas: giro, área, pisos, aforo y uso de gas, frituras o escaleras.',
    },
    {
        icono: ListChecks,
        titulo: 'Revisa sus condiciones',
        descripcion:
            'El motor normativo filtra las preguntas para mostrarte únicamente los criterios que corresponden a las condiciones reales de tu negocio.',
    },
    {
        icono: ClipboardCheck,
        titulo: 'Plan de acción',
        descripcion:
            'Recibe un balance de condiciones cumplidas y pendientes, con recursos educativos técnicos para orientar cada mejora antes de una revisión oficial.',
    },
];

const VALORES = [
    {
        icono: ShieldAlert,
        titulo: 'Prepárate para revisar tu local',
        descripcion:
            'Detecta a tiempo las condiciones que suelen originar observaciones en una inspección y te permite corregirlas con anticipación.',
    },
    {
        icono: BellRing,
        titulo: 'Guía preventiva de vigencias técnicas (Extintores y Pozo a Tierra)',
        descripcion:
            'Consulta las orientaciones sobre carga de extintores y medición del pozo a tierra para contrastarlas con tu local antes de una verificación oficial.',
    },
    {
        icono: Compass,
        titulo: 'Guiado paso a paso para ciudadanos',
        descripcion:
            'Cada pregunta está redactada en lenguaje sencillo y conectada a la norma técnica que la sustenta, sin tecnicismos innecesarios.',
    },
];

const AREAS_NORMATIVAS = [
    {
        icono: Flame,
        tono: 'bg-rose-50 text-rose-700 border-rose-100',
        titulo: 'Protección contra Incendios',
        descripcion:
            'Extintores de polvo químico seco (PQS) y extintores especializados Clase K en locales con cocción o frituras, con carga vigente y libre acceso.',
        etiqueta: 'Extintores PQS y Clase K',
    },
    {
        icono: Footprints,
        tono: 'bg-amber-50 text-amber-700 border-amber-100',
        titulo: 'Evacuación y Señalización',
        descripcion: 'Rutas y pasadizos despejados, puertas de escape con apertura fluida, señalética normalizada y luces de emergencia operativas.',
        etiqueta: 'Rutas despejadas y luces de emergencia',
    },
    {
        icono: Zap,
        tono: 'bg-sky-50 text-sky-700 border-sky-100',
        titulo: 'Instalaciones Eléctricas',
        descripcion: 'Tableros con mandil protector, interruptores termomagnéticos dimensionados, protección diferencial y cableado canalizado.',
        etiqueta: 'Tableros, diferenciales y canalizaciones',
    },
    {
        icono: FlameKindling,
        tono: 'bg-orange-50 text-orange-700 border-orange-100',
        titulo: 'Instalaciones de Gas (GLP)',
        descripcion:
            'Balones en ambientes ventilados a nivel de piso, mangueras y reguladores normados, distancia de seguridad y cilindros en buen estado.',
        etiqueta: 'Aplica según declaración física',
    },
    {
        icono: Boxes,
        tono: 'bg-violet-50 text-violet-700 border-violet-100',
        titulo: 'Estructuras y Almacenamiento',
        descripcion:
            'Escaleras con pasamanos continuos y pasos antideslizantes, más anclaje antisísmico de estanterías altas y mobiliario con riesgo de vuelco.',
        etiqueta: 'Aplica según escaleras o estanterías declaradas',
    },
];

const PREGUNTAS_FRECUENTES = [
    {
        titulo: '¿Tiene algún costo utilizar esta plataforma?',
        respuesta:
            'Ninguno. CheckITSE es una iniciativa cívica de orientación técnica completamente gratuita para todos los comerciantes y emprendedores de Huancayo.',
    },
    {
        titulo: '¿Esta plataforma reporta mis respuestas a la municipalidad?',
        respuesta:
            'CheckITSE es una herramienta independiente y preventiva. No está conectada a sistemas municipales ni genera actas de fiscalización.',
    },
    {
        titulo: '¿Es obligatorio tener RUC para iniciar?',
        respuesta: 'No. Puedes registrar el RUC de tu negocio si lo tienes a mano para identificar tu reporte, o continuar libremente sin RUC.',
    },
    {
        titulo: '¿Qué pasa si mi local no tiene escaleras ni gas?',
        respuesta:
            'El motor de aplicabilidad filtra automáticamente las preguntas que no corresponden a tu negocio. Solo responderás sobre las condiciones que realmente aplican.',
    },
];

export default function Home() {
    const [showGuia, setShowGuia] = useState<boolean>(false);
    const [giro, setGiro] = useState<string>('Comercio');
    const [area, setArea] = useState<string>('');
    const [aforo, setAforo] = useState<string>('');
    const [estimacion, setEstimacion] = useState<EstimacionOrientativa | null>(null);
    const [errorEstimacion, setErrorEstimacion] = useState<string | null>(null);

    const calcularRiesgo = (e: FormEvent) => {
        e.preventDefault();

        const areaNum = area.trim() === '' ? null : Number(area);
        const aforoNum = aforo.trim() === '' ? null : Number(aforo);

        if (areaNum !== null && (Number.isNaN(areaNum) || areaNum <= 0)) {
            setErrorEstimacion('El área debe ser un valor mayor a 0 metros cuadrados.');
            setEstimacion(null);
            return;
        }

        if (aforoNum !== null && (Number.isNaN(aforoNum) || aforoNum < 1)) {
            setErrorEstimacion('El aforo debe ser al menos 1 persona.');
            setEstimacion(null);
            return;
        }

        setErrorEstimacion(null);
        setEstimacion(estimarRiesgoOrientativo(giro, areaNum, aforoNum));
    };

    return (
        <>
            <Head title="CheckITSE Huancayo - Simulador preventivo de Inspección Técnica de Seguridad" />
            <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />

            {/* ============================================================ */}
            {/* HERO ASIMÉTRICO — columna de mensaje + consola de diagnóstico  */}
            {/* ============================================================ */}
            <section
                id="que-es"
                aria-labelledby="hero-titulo"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 lg:p-12"
            >
                <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
                    <div>
                        <p className="text-primary-800 mb-4 text-sm font-semibold">CheckITSE · Para comerciantes de Huancayo</p>
                        <h1
                            id="hero-titulo"
                            className="max-w-xl text-3xl leading-tight font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
                        >
                            Identifica qué revisar en tu local
                        </h1>
                        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                            Responde sobre tu establecimiento y encuentra qué condiciones necesitas atender antes de tu trámite ITSE.
                        </p>
                        <AvisoPreventivo />
                        <div className="flex flex-wrap items-center gap-4">
                            <Link
                                href="/autoevaluacion/nueva"
                                className="bg-primary hover:bg-primary-700 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white"
                            >
                                Revisar mi local <ArrowRight aria-hidden="true" className="size-5" />
                            </Link>
                            <Link
                                href="/login"
                                className="inline-flex min-h-11 items-center text-base font-semibold text-slate-700 underline underline-offset-4"
                            >
                                Retomar con mi cuenta
                            </Link>
                        </div>
                        <p className="mt-4 text-sm text-slate-600">Puedes comenzar sin cuenta. Conserva tu sesión para retomar como invitado.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                        <h2 className="text-xl font-semibold text-slate-900">Una revisión, paso a paso</h2>
                        <ol className="mt-6 space-y-6">
                            {[
                                ['Describe tu local', 'Ten a mano su actividad, área aproximada y características. Si no conoces un dato, indícalo.'],
                                ['Revisa sus condiciones', 'Responde con lo que observas. Encontrarás ejemplos y ayuda para cada criterio.'],
                                ['Consulta qué atender', 'Obtén un resumen de tus declaraciones y conserva tu historial.'],
                            ].map(([title, detail], index) => (
                                <li key={title} className="flex gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="bg-primary-100 text-primary-900 flex size-8 shrink-0 items-center justify-center rounded-full font-semibold"
                                    >
                                        {index + 1}
                                    </span>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{detail}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                        <a
                            href="#como-funciona"
                            className="text-primary-800 mt-6 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
                        >
                            Explorar la herramienta y su alcance
                        </a>
                    </div>
                </div>
            </section>

            {/* ============================================================ */}
            {/* AVISO DE NATURALEZA CÍVICA Y DESLINDE LEGAL                 */}
            {/* ============================================================ */}
            <section className="mt-10">
                <div className="border-info-200 bg-info-50 flex flex-col items-start justify-between gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:p-6">
                    <div className="flex items-start gap-4">
                        <div className="border-info-200 bg-info-100 text-info-800 shrink-0 rounded-xl border p-2.5">
                            <Info className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-info-950 text-sm font-bold">Aviso importante de alcance y naturaleza preventiva</h2>
                                <span className="bg-info-100/80 text-info-800 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold">
                                    R.J. 016-2018-CENEPRED / D.S. 002-2018-PCM
                                </span>
                            </div>
                            <p className="text-info-900/80 mt-1.5 max-w-3xl text-sm leading-relaxed">
                                Esta plataforma es un <strong>simulador cívico preventivo y orientativo</strong> para comerciantes y vecinos de
                                Huancayo. Los resultados reflejan únicamente las condiciones declaradas por el ciudadano y{' '}
                                <strong>no constituyen una inspección oficial</strong> ni reemplazan la inspección de un inspector técnico de
                                seguridad en edificaciones (ITSE). CheckITSE no constituye aprobación, autorización ni certificación del
                                establecimiento, ni emite licencias o certificados ITSE.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowGuia(true)}
                        className="border-info-200 text-info-800 hover:bg-info-100 focus-visible:ring-info-500 inline-flex shrink-0 items-center gap-1.5 self-end rounded-xl border bg-white px-3.5 py-2 text-xs font-bold transition focus-visible:ring-2 focus-visible:outline-none active:scale-95 sm:self-center"
                    >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Ver Base Legal</span>
                    </button>
                </div>
            </section>

            {/* ============================================================ */}
            {/* BENTO GRID — ¿Cómo funciona?                                 */}
            {/* ============================================================ */}
            <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="mt-12 scroll-mt-24">
                <div className="max-w-2xl">
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-wider text-emerald-700 uppercase">
                        Paso a paso
                    </span>
                    <h2 id="como-funciona-titulo" className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                        ¿Cómo funciona?
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 sm:text-base">
                        Un recorrido guiado y transparente en tres etapas, sin tecnicismos innecesarios.
                    </p>
                </div>

                {/* Rejilla asimétrica: la capacidad de cálculo ocupa doble ancho. */}
                <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
                    {/* TARJETA 1 — doble ancho: calculadora paramétrica real */}
                    <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md lg:col-span-2">
                        <div className="flex items-center gap-2.5">
                            <span className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-emerald-700">
                                <Calculator className="h-4 w-4" />
                            </span>
                            <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">Cálculo paramétrico</span>
                        </div>

                        <h3 className="mt-4 text-lg font-extrabold tracking-tight text-slate-900">Cálculo Paramétrico en Tiempo Real</h3>
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
                            Tu giro comercial y el área techada determinan la modalidad de trámite y los criterios normativos que te corresponden.
                            Introduce los datos y contrasta el resultado al instante.
                        </p>

                        <form onSubmit={calcularRiesgo} className="mt-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label htmlFor="calc-giro" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                        <Compass className="h-3.5 w-3.5 text-slate-400" />
                                        Giro del negocio
                                    </label>
                                    <select
                                        id="calc-giro"
                                        value={giro}
                                        onChange={(e) => setGiro(e.target.value)}
                                        className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 transition outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    >
                                        {GIROS_DISPONIBLES.map((opcion) => (
                                            <option key={opcion} value={opcion}>
                                                {opcion}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="calc-area" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                        <Ruler className="h-3.5 w-3.5 text-slate-400" />
                                        Área techada (m²)
                                    </label>
                                    <input
                                        id="calc-area"
                                        type="number"
                                        inputMode="decimal"
                                        min="1"
                                        step="any"
                                        placeholder="Ej. 120"
                                        value={area}
                                        onChange={(e) => setArea(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 transition outline-none placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="calc-aforo" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                        <Users className="h-3.5 w-3.5 text-slate-400" />
                                        Aforo estimado
                                    </label>
                                    <input
                                        id="calc-aforo"
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        step="1"
                                        placeholder="Ej. 25"
                                        value={aforo}
                                        onChange={(e) => setAforo(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 transition outline-none placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none active:scale-95"
                            >
                                <Gauge className="h-4 w-4" />
                                Calcular nivel de riesgo estimado
                            </button>
                        </form>

                        {errorEstimacion && (
                            <div
                                role="alert"
                                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
                            >
                                {errorEstimacion}
                            </div>
                        )}

                        {estimacion && (
                            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase ${SEMAFORO_CONFIG[estimacion.nivel].fondo} ${SEMAFORO_CONFIG[estimacion.nivel].texto} ${SEMAFORO_CONFIG[estimacion.nivel].borde}`}
                                    >
                                        Riesgo {estimacion.nivel}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                        <Clock className="h-3 w-3" />
                                        {estimacion.titulo}
                                    </span>
                                </div>

                                <ul className="mt-3.5 space-y-1.5">
                                    {estimacion.factores.map((factor) => (
                                        <li key={factor} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                            {factor}
                                        </li>
                                    ))}
                                </ul>

                                <p className="mt-3.5 text-xs leading-relaxed text-slate-500">
                                    Estimación referencial basada en función y escala física. Los umbrales provienen del{' '}
                                    <strong className="font-semibold text-slate-700">Manual CENEPRED</strong> y la{' '}
                                    <strong className="font-semibold text-slate-700">R.J. 016-2018-CENEPRED/J</strong>; la clasificación definitiva la
                                    realiza la entidad municipal.
                                </p>

                                <Link
                                    href="/autoevaluacion/nueva"
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-emerald-700 transition hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                                >
                                    Continuar con el diagnóstico real
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        )}
                    </article>

                    {/* TARJETA 2 — pronóstico de trámite municipal */}
                    <article className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                        <span className="w-fit rounded-xl border border-sky-100 bg-sky-50 p-2 text-sky-700">
                            <Building2 className="h-4 w-4" />
                        </span>

                        <h3 className="mt-4 text-lg font-extrabold tracking-tight text-slate-900">Pronóstico de Trámite Municipal</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                            El D.S. 002-2018-PCM define si tu inspección es previa o posterior según función y escala física.
                        </p>

                        <ul className="mt-4 space-y-2.5">
                            {MODALIDADES_RESUMEN.map((modalidad) => (
                                <li key={modalidad.etiqueta} className={`rounded-xl border px-3 py-2.5 ${modalidad.tono}`}>
                                    <p className={`text-xs font-bold ${modalidad.texto}`}>{modalidad.etiqueta}</p>
                                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{modalidad.descripcion}</p>
                                </li>
                            ))}
                        </ul>

                        <a
                            href="#normativa"
                            className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                        >
                            Ver el detalle normativo
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    </article>

                    {/* TARJETA 3 — expediente digital */}
                    <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                        <span className="w-fit rounded-xl border border-violet-100 bg-violet-50 p-2 text-violet-700">
                            <FileCheck className="h-4 w-4" />
                        </span>

                        <h3 className="mt-4 text-lg font-extrabold tracking-tight text-slate-900">Expediente Digital</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                            Los Anexos 4 y 9 se prellenan con los datos que declaras, listos para imprimir y presentar en mesa de partes.
                        </p>

                        <Link
                            href="/autoevaluacion/nueva"
                            className="mt-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-emerald-700 transition hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                        >
                            Generar mis borradores
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </article>
                </div>

                {/* Stepper compacto: conserva el recorrido en tres etapas. */}
                <ol className="mt-5 grid gap-4 sm:grid-cols-3">
                    {PASOS.map((paso, indice) => {
                        const Icono = paso.icono;
                        return (
                            <li key={paso.titulo} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                                    <Icono className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold tracking-wider text-emerald-700">
                                        Paso {String(indice + 1).padStart(2, '0')}
                                    </p>
                                    <h3 className="mt-0.5 text-sm font-bold text-slate-900">{paso.titulo}</h3>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{paso.descripcion}</p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </section>

            {/* ============================================================ */}
            {/* SECCIÓN DE VALOR                                            */}
            {/* ============================================================ */}
            <section id="beneficios" aria-labelledby="beneficios-titulo" className="mt-12 scroll-mt-24">
                <div className="max-w-2xl">
                    <span className="text-[11px] font-bold tracking-wider text-emerald-700">Beneficios ciudadanos</span>
                    <h2 id="beneficios-titulo" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                        Una herramienta para prepararte y llevar un mejor control
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 sm:text-base">
                        Sin reemplazar una inspección oficial, te permite revisar tu establecimiento y organizar tus mejoras con tranquilidad.
                    </p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                    {VALORES.map((valor) => {
                        const Icono = valor.icono;
                        return (
                            <article
                                key={valor.titulo}
                                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                            >
                                <span className="w-fit rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-700">
                                    <Icono className="h-5 w-5" />
                                </span>
                                <h3 className="mt-4 text-sm font-bold text-slate-900">{valor.titulo}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{valor.descripcion}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* ============================================================ */}
            {/* MINI-GUÍA INTERACTIVA (SHADCN TABS)                         */}
            {/* ============================================================ */}
            <section id="normativa" aria-labelledby="normativa-titulo" className="mt-16 scroll-mt-24">
                <div className="max-w-2xl">
                    <span className="text-[11px] font-bold tracking-wider text-[#34C759] uppercase">Cumplimiento normativo</span>
                    <h2 id="normativa-titulo" className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                        ¿Ex-Post o Ex-Ante? Así se define tu trámite
                    </h2>
                    <p className="mt-2 text-base text-slate-600">
                        La modalidad de la Inspección Técnica de Seguridad en Edificaciones depende de tu función y escala física.
                    </p>
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] sm:p-10">
                    <Tabs defaultValue="ex_post" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100 p-1">
                            <TabsTrigger
                                value="ex_post"
                                className="rounded-xl py-3 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-[#1B7931] data-[state=active]:shadow-sm"
                            >
                                Riesgo Bajo / Medio · Ex-Post
                            </TabsTrigger>
                            <TabsTrigger
                                value="ex_ante"
                                className="rounded-xl py-3 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-[#C9251D] data-[state=active]:shadow-sm"
                            >
                                Riesgo Alto / Muy Alto · Ex-Ante
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="ex_post" className="mt-6">
                            <div className="rounded-2xl border border-[#34C759]/30 bg-[#34C759]/5 p-6 sm:p-8">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/20 px-3 py-1 text-[11px] font-extrabold tracking-wider text-[#1B7931] uppercase">
                                        Riesgo Bajo / Medio
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34C759]/30 bg-white px-3 py-1 text-[11px] font-bold text-[#1B7931]">
                                        <Clock className="h-3 w-3" />
                                        ITSE Posterior (Ex-Post)
                                    </span>
                                </div>

                                <h3 className="mt-4 text-xl font-black text-slate-900">Tu licencia se tramita antes de la verificación</h3>
                                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
                                    Aplica a comercios con área techada de hasta 750 m² y hasta 3 pisos, sin factores agravantes. La Licencia de
                                    Funcionamiento se tramita previamente y la verificación técnica se realiza con posterioridad.
                                </p>

                                <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {[
                                        'Área techada igual o menor a 750 m².',
                                        'Hasta 3 pisos de altura.',
                                        'Sin factores agravantes (calderos, GLP, giros especiales).',
                                        'Licencia tramita antes; la ITSE se verifica después.',
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-2.5 rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-xs leading-relaxed font-medium text-slate-800 shadow-xs"
                                        >
                                            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#34C759]" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                                    Los plazos concretos dependen de la entidad municipal y de la demanda de solicitudes vigente.
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="ex_ante" className="mt-6">
                            <div className="rounded-2xl border border-[#FF3B30]/30 bg-[#FF3B30]/5 p-6 sm:p-8">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3B30]/20 px-3 py-1 text-[11px] font-extrabold tracking-wider text-[#C9251D] uppercase">
                                        Riesgo Alto / Muy Alto
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF3B30]/30 bg-white px-3 py-1 text-[11px] font-bold text-[#C9251D]">
                                        <AlertTriangle className="h-3 w-3" />
                                        ITSE Previa (Ex-Ante)
                                    </span>
                                </div>

                                <h3 className="mt-4 text-xl font-black text-slate-900">Necesitas inspección técnica favorable previa</h3>
                                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
                                    Aplica cuando el área supera los 750 m², cuando hay más de 3 pisos, en giros especiales (hospedaje o salud con más
                                    de 100 personas), o cuando existen calderos o GLP por encima de 118.18 galones. Exige inspección técnica favorable
                                    previa a la licencia.
                                </p>

                                <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {[
                                        'Área techada superior a 750 m².',
                                        'Más de 3 pisos de altura.',
                                        'Giros de hospedaje o salud con aforo mayor a 100 personas.',
                                        'Presencia de calderos o GLP por encima de 118.18 galones.',
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-2.5 rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-xs leading-relaxed font-medium text-slate-800 shadow-xs"
                                        >
                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF3B30]" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                                    Prepararte con tiempo en esta modalidad reduce la posibilidad de postergar el inicio de tus actividades.
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <p className="mt-6 text-[11px] leading-relaxed text-slate-500">
                        Compendio normativo de referencia: <strong className="font-semibold text-slate-700">D.S. N° 002-2018-PCM</strong> y{' '}
                        <strong className="font-semibold text-slate-700">R.J. N° 016-2018-CENEPRED/J</strong>. Esta clasificación es referencial; la
                        determinación oficial corresponde a la entidad municipal.
                    </p>
                </div>
            </section>

            {/* ============================================================ */}
            {/* 5 ÁREAS NORMATIVAS                                          */}
            {/* ============================================================ */}
            <section aria-labelledby="areas-titulo" className="mt-16">
                <div className="max-w-2xl">
                    <span className="text-[11px] font-bold tracking-wider text-[#34C759] uppercase">Criterios técnicos normativos</span>
                    <h2 id="areas-titulo" className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                        5 áreas de seguridad evaluadas en tu local
                    </h2>
                    <p className="mt-2 text-base text-slate-600">
                        El sistema evalúa criterios técnicos basados en el Manual de Ejecución de ITSE y el RNE, adaptados a lo que realmente tiene tu
                        comercio:
                    </p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {AREAS_NORMATIVAS.map((area) => {
                        const Icono = area.icono;
                        return (
                            <article
                                key={area.titulo}
                                className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
                            >
                                <div>
                                    <span className={`inline-flex w-fit rounded-2xl border p-3 ${area.tono}`}>
                                        <Icono className="h-5 w-5" />
                                    </span>
                                    <h3 className="mt-5 text-lg font-black text-slate-900">{area.titulo}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{area.descripcion}</p>
                                </div>
                                <p className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                                    <CircleCheck className="h-4 w-4 shrink-0 text-[#34C759]" />
                                    <span>{area.etiqueta}</span>
                                </p>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* ============================================================ */}
            {/* PREGUNTAS FRECUENTES (SHADCN ACCORDION)                     */}
            {/* ============================================================ */}
            <section aria-labelledby="faq-titulo" className="mt-16">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] sm:p-10">
                    <div className="mb-2 flex items-center gap-2">
                        <CircleHelp className="h-5 w-5 text-[#34C759]" />
                        <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Dudas habituales</span>
                    </div>
                    <h2 id="faq-titulo" className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                        Preguntas frecuentes sobre CheckITSE Huancayo
                    </h2>

                    <div className="mt-6">
                        <Accordion type="single" collapsible className="w-full divide-y divide-slate-100">
                            {PREGUNTAS_FRECUENTES.map((pregunta, idx) => (
                                <AccordionItem key={pregunta.titulo} value={`faq-${idx}`} className="border-b border-slate-100 py-2">
                                    <AccordionTrigger className="py-4 text-left text-sm font-bold text-slate-900 transition-colors hover:text-[#1B7931] hover:no-underline">
                                        {pregunta.titulo}
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4 text-sm leading-relaxed text-slate-600">{pregunta.respuesta}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </div>
            </section>

            {/* ============================================================ */}
            {/* CTA FINAL                                                   */}
            {/* ============================================================ */}
            <section className="mt-12">
                <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-center shadow-sm sm:p-12">
                    <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
                    <div className="relative z-10 mx-auto max-w-xl">
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
                            Comienza hoy mismo
                        </span>
                        <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">¿Listo para revisar la seguridad de tu local?</h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                            Revisa las condiciones de tu establecimiento en Huancayo a tu ritmo, con ayuda en cada paso. Puedes comenzar sin cuenta.
                        </p>
                        <div className="mt-6 flex justify-center">
                            <Link
                                href="/autoevaluacion/nueva"
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none active:scale-95"
                            >
                                Revisar mi local
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN PUENTE — derivación al directorio de proveedores.
          Las fichas de proveedores viven en /directorio; aquí solo se
          deriva el tráfico con un enlace único. */}
            <section aria-labelledby="puente-proveedores-titulo" className="mt-12">
                <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8 md:flex-row md:items-center">
                    <div>
                        <h2
                            id="puente-proveedores-titulo"
                            className="text-2xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-3xl"
                        >
                            ¿Necesitas corregir algo? Directorio técnico y recursos locales
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
                            Servicios técnicos independientes de electricidad, recarga de extintores y señalética en Huancayo para orientar tus
                            mejoras preventivas.
                        </p>
                    </div>

                    <Link
                        href="/directorio"
                        className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold whitespace-nowrap text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                        Ver proveedores <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </section>

            {/* El pie institucional (marca, marco normativo y alcance del servicio) lo
          renderiza `layouts/AppLayout.tsx` con `components/Footer.tsx`. Aquí solo
          queda el acceso al compendio normativo interactivo de la portada. */}
            <div className="mt-8 flex justify-start pb-2">
                <button
                    type="button"
                    onClick={() => setShowGuia(true)}
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                    <BookOpen className="h-3.5 w-3.5" />
                    Ver compendio normativo
                </button>
            </div>
        </>
    );
}
