import { GuiaModal } from '@/components/GuiaModal';
import { RenovacionRapida } from '@/components/landing/RenovacionRapida';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
    FUNCIONES_ECONOMICAS,
    FUNCIONES_ESCALA_ESPECIAL,
    TEXTO_MODALIDAD,
    clasificarItse,
    leerNumero,
    type ClasificacionItse,
} from '@/lib/clasificacion-itse';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeDollarSign,
    BookOpen,
    Boxes,
    CalendarClock,
    CheckCircle2,
    Clock3,
    FileSignature,
    FlameKindling,
    Gauge,
    Hourglass,
    Info,
    Landmark,
    Megaphone,
    Sparkles,
    Store,
    Wrench,
    Zap,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

/** Recorrido real del emprendedor: qué pasa en CheckITSE y qué pasa en la municipalidad. */
const RUTA_ITSE = [
    {
        icono: Store,
        donde: 'En CheckITSE',
        titulo: 'Simula tu local',
        texto: 'Cuéntanos qué vendes, el tamaño de tu local y qué equipos usas. Toma unos 5 minutos.',
    },
    {
        icono: Wrench,
        donde: 'En CheckITSE',
        titulo: 'Corrige lo pendiente',
        texto: 'Recibe tu lista de mejoras y compra lo que te falta a proveedores de Huancayo.',
    },
    {
        icono: FileSignature,
        donde: 'Con tus documentos',
        titulo: 'Prepara tu expediente',
        texto: 'Descarga tu declaración jurada (Anexo 4) ya llenada con tus datos.',
    },
    {
        icono: Landmark,
        donde: 'En tu municipalidad',
        titulo: 'Solicita tu ITSE',
        texto: 'Presenta tu trámite y recibe tu certificado, válido por 2 años.',
    },
] as const;

/**
 * Datos del trámite. Fuente: D.S. N° 002-2018-PCM (arts. 6.1, 15.4, 21 y 26).
 * Evidencia completa en docs/respaldo-cientifico.md.
 */
const DATOS_CLAVE = [
    {
        icono: Clock3,
        cifra: '7 días',
        titulo: 'Inspección si tu riesgo es bajo o medio',
        texto: 'Días hábiles máximos para que te inspeccionen después de recibir tu licencia. Todo el trámite: hasta 9 días.',
    },
    {
        icono: Hourglass,
        cifra: '5 días',
        titulo: 'Inspección si tu riesgo es alto',
        texto: 'Días hábiles máximos para inspeccionarte antes de darte la licencia. Todo el trámite: hasta 7 días.',
    },
    {
        icono: BadgeDollarSign,
        cifra: 'Incluido',
        titulo: 'Costo dentro de tu licencia',
        texto: 'Si tramitas licencia de funcionamiento, la ITSE ya está incluida en ese pago. Cada municipalidad fija el monto en su TUPA.',
    },
    {
        icono: CalendarClock,
        cifra: '2 años',
        titulo: 'Vigencia del certificado',
        texto: 'Después debes renovarlo. Si tu riesgo es bajo o medio, te lo entregan al presentar tu declaración jurada.',
    },
] as const;

const RUBROS = [
    { foto: '/images/local-perfumeria.webp', nombre: 'Perfumerías y cosméticos' },
    { foto: '/images/local-farmacia.webp', nombre: 'Farmacias y boticas' },
    { foto: '/images/local-salon.webp', nombre: 'Salones de belleza' },
    { foto: '/images/emprendedora-tienda.webp', nombre: 'Tiendas de ropa' },
] as const;

const AREAS_CON_FOTO = [
    { foto: '/images/extintor.webp', titulo: 'Extintores', texto: 'Tipo correcto, carga vigente y fácil acceso.' },
    { foto: '/images/salida-emergencia.webp', titulo: 'Evacuación', texto: 'Salidas libres, señales y luces de emergencia.' },
    { foto: '/images/tablero-electrico.webp', titulo: 'Electricidad', texto: 'Tablero con tapa, llaves y cables protegidos.' },
] as const;

const AREAS_CON_ICONO = [
    { icono: FlameKindling, titulo: 'Gas (GLP)', texto: 'Balones ventilados y conexiones seguras. Solo si usas gas.' },
    { icono: Boxes, titulo: 'Estructura', texto: 'Escaleras con pasamanos y estantes altos anclados a la pared.' },
] as const;

const PREGUNTAS_FRECUENTES = [
    { titulo: '¿Cuánto cuesta usar CheckITSE?', respuesta: 'Nada. La simulación es gratuita para emprendedores y comerciantes de Huancayo.' },
    {
        titulo: '¿Cuánto cuesta el certificado ITSE real?',
        respuesta:
            'Si tramitas licencia de funcionamiento, la ITSE está incluida en ese pago (D.S. 002-2018-PCM, art. 6.1). El monto lo fija cada municipalidad en su TUPA según tu nivel de riesgo. Como referencia, en Huancayo la ITSE de un local de riesgo alto costaba S/ 698.10 (Doing Business en el Perú 2020). Confirma el monto vigente en tu municipalidad.',
    },
    {
        titulo: '¿En cuánto tiempo sale?',
        respuesta:
            'Por ley, si tu riesgo es bajo o medio la inspección se hace en máximo 7 días hábiles después de tu licencia; si es alto, en máximo 5 días hábiles antes de la licencia. En la práctica puede tardar más si te observan algo, por eso conviene llegar preparado.',
    },
    {
        titulo: '¿CheckITSE me da el certificado?',
        respuesta: 'No. El certificado lo emite tu municipalidad después de su inspección. CheckITSE te prepara para pasarla a la primera.',
    },
    { titulo: '¿Envían mis respuestas a la municipalidad?', respuesta: 'No. CheckITSE no está conectado a sistemas municipales ni genera actas.' },
];

function ResultadoCalculadora({ resultado }: Readonly<{ resultado: ClasificacionItse | null }>) {
    if (!resultado) {
        return (
            <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <Gauge aria-hidden="true" className="size-10 text-slate-400" />
                <p className="mt-3 text-lg font-semibold text-slate-700">Tu resultado aparecerá aquí</p>
                <p className="mt-1 text-base text-slate-500">Completa al menos el tamaño de tu local.</p>
            </div>
        );
    }

    const previa = resultado.modalidad === 'EX_ANTE';
    const texto = TEXTO_MODALIDAD[resultado.modalidad];

    return (
        <div
            className={`h-full rounded-2xl border p-6 ${previa ? 'border-amber-200 bg-amber-50' : 'border-primary-200 bg-primary-50'}`}
            aria-live="polite"
        >
            <p className={`text-sm font-bold tracking-wide uppercase ${previa ? 'text-amber-800' : 'text-primary-800'}`}>Resultado orientativo</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{texto.titulo}</p>
            <p className="mt-2 text-lg leading-relaxed text-slate-700">{texto.resumen}</p>
            <p className="mt-3 text-base text-slate-700">
                Plazo legal de inspección: <strong>{previa ? 'hasta 5 días hábiles' : 'hasta 7 días hábiles'}</strong>.
            </p>
            {resultado.motivos.length > 0 ? (
                <ul className="mt-4 space-y-2">
                    {resultado.motivos.map((motivo) => (
                        <li key={motivo} className="flex gap-2 text-base text-slate-700">
                            <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-amber-600" />
                            {motivo}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-primary-900 mt-4 flex items-center gap-2 text-base font-medium">
                    <CheckCircle2 aria-hidden="true" className="size-5" /> Sin factores que eleven el riesgo.
                </p>
            )}
            <Link
                href={route('autoevaluacion.nueva')}
                className="text-primary-800 mt-5 inline-flex min-h-11 items-center gap-1.5 text-lg font-bold hover:underline"
            >
                Ver qué debo revisar en mi local <ArrowRight aria-hidden="true" className="size-5" />
            </Link>
        </div>
    );
}

function EncabezadoSeccion({ id, etiqueta, titulo, texto }: Readonly<{ id: string; etiqueta: string; titulo: string; texto?: string }>) {
    return (
        <div className="max-w-3xl">
            <p className="text-primary-700 text-base font-bold">{etiqueta}</p>
            <h2 id={id} className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {titulo}
            </h2>
            {texto && <p className="mt-3 text-lg leading-relaxed text-slate-600">{texto}</p>}
        </div>
    );
}

export default function Home() {
    const [showGuia, setShowGuia] = useState(false);
    const [giro, setGiro] = useState('Comercio');
    const [area, setArea] = useState('');
    const [pisos, setPisos] = useState('');
    const [aforo, setAforo] = useState('');
    const [resultado, setResultado] = useState<ClasificacionItse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const pideAforo = (FUNCIONES_ESCALA_ESPECIAL as ReadonlyArray<string>).includes(giro);

    const calcular = (e: FormEvent) => {
        e.preventDefault();
        const valores = { area: leerNumero(area), pisos: leerNumero(pisos), aforo: leerNumero(aforo) };
        if (valores.area === null || valores.area <= 0) {
            setError('Ingresa el área techada de tu local en metros cuadrados (mayor a 0).');
            setResultado(null);
            return;
        }
        if ((valores.pisos !== null && valores.pisos < 1) || (valores.aforo !== null && valores.aforo < 1)) {
            setError('Los pisos y el aforo deben ser al menos 1.');
            setResultado(null);
            return;
        }
        setError(null);
        setResultado(clasificarItse({ funcion: giro, areaM2: valores.area, pisos: valores.pisos, aforo: pideAforo ? valores.aforo : null }));
    };

    const claseCampo =
        'h-13 w-full rounded-xl border border-slate-300 bg-white px-4 text-lg text-slate-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20';

    return (
        <>
            <Head title="CheckITSE Huancayo - Prepara tu local para la ITSE" />
            <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />

            {/* HERO */}
            <section aria-labelledby="hero-titulo" className="bg-ink-900 relative overflow-hidden rounded-3xl text-white">
                <div aria-hidden="true" className="bg-primary-500/25 absolute -top-32 -left-24 size-96 rounded-full blur-3xl" />
                <div className="relative grid items-center lg:grid-cols-[1.1fr_1fr]">
                    <div className="px-6 py-10 sm:px-10 sm:py-14 lg:py-16 lg:pl-14">
                        <p className="text-sun-300 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-bold">
                            <Sparkles aria-hidden="true" className="size-4" />
                            Para emprendedores de Huancayo
                        </p>
                        <h1 id="hero-titulo" className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                            Abre tu negocio seguro y llega <span className="text-primary-300">listo a tu ITSE</span>
                        </h1>
                        <p className="mt-5 max-w-xl text-xl leading-relaxed text-slate-200">
                            Simula la inspección de tu local, descubre qué te observarían y corrígelo antes de ir a la municipalidad.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Link
                                href={route('autoevaluacion.nueva')}
                                className="bg-sun-400 text-ink-900 hover:bg-sun-300 inline-flex min-h-14 items-center gap-2 rounded-xl px-7 text-lg font-bold transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                            >
                                Simular mi local gratis <ArrowRight aria-hidden="true" className="size-5" />
                            </Link>
                            <a
                                href="#renovacion"
                                className="inline-flex min-h-14 items-center rounded-xl border border-white/25 px-6 text-lg font-semibold text-white transition hover:bg-white/10"
                            >
                                Renovar mi certificado
                            </a>
                        </div>
                        <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-base text-slate-200">
                            {['Gratis', 'Sin crear cuenta', 'Unos 5 minutos'].map((item) => (
                                <li key={item} className="flex items-center gap-2">
                                    <CheckCircle2 aria-hidden="true" className="text-primary-300 size-5" /> {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative h-80 sm:h-96 lg:h-full lg:min-h-[34rem]">
                        <img
                            src="/images/emprendedora-tienda.webp"
                            alt="Emprendedora sonriendo en su tienda"
                            className="absolute inset-0 h-full w-full object-cover lg:rounded-l-3xl"
                        />
                        <div
                            aria-hidden="true"
                            className="from-ink-900 absolute inset-0 bg-gradient-to-t via-transparent to-transparent lg:bg-gradient-to-r"
                        />
                        <div
                            aria-hidden="true"
                            className="absolute right-4 bottom-4 left-4 rounded-2xl bg-white p-5 text-slate-900 shadow-2xl shadow-black/30 sm:right-8 sm:left-auto sm:w-96"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-base font-bold">Boutique Wanka · 45 m²</p>
                                <span className="bg-primary-50 text-primary-800 shrink-0 rounded-full px-2.5 py-1 text-xs font-bold">
                                    ITSE posterior
                                </span>
                            </div>
                            <div className="mt-3 flex justify-between text-sm font-semibold text-slate-600">
                                <span>Condiciones listas</span>
                                <span>9 de 11</span>
                            </div>
                            <div className="mt-2 h-2.5 rounded-full bg-slate-100">
                                <div className="bg-primary h-2.5 w-[82%] rounded-full" />
                            </div>
                            <p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                                <span className="size-3 shrink-0 rounded-full border-2 border-amber-500" /> Falta: luz de emergencia
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-slate-500">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                Es una simulación orientativa basada en lo que declaras. No reemplaza la inspección oficial ni emite certificados ITSE.
            </p>

            {/* DATOS CLAVE */}
            <section aria-labelledby="datos-titulo" className="mt-20">
                <EncabezadoSeccion
                    id="datos-titulo"
                    etiqueta="Datos clave del certificado ITSE"
                    titulo="Lo que dice la ley, en simple"
                    texto="Plazos máximos y costos según el Reglamento de ITSE (D.S. N° 002-2018-PCM)."
                />
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {DATOS_CLAVE.map((dato) => {
                        const Icono = dato.icono;
                        return (
                            <li key={dato.titulo} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <Icono aria-hidden="true" className="text-primary-700 size-7" />
                                <p className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">{dato.cifra}</p>
                                <h3 className="mt-1 text-lg font-bold text-slate-900">{dato.titulo}</h3>
                                <p className="mt-2 text-base leading-relaxed text-slate-600">{dato.texto}</p>
                            </li>
                        );
                    })}
                </ul>
                <div className="border-sun-300 bg-sun-50 mt-4 flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center">
                    <p className="text-sun-700 shrink-0 text-5xl font-extrabold">41 días</p>
                    <p className="text-lg leading-relaxed text-slate-800">
                        tomó en la práctica obtener la ITSE y la licencia de un local de riesgo alto en Huancayo, frente a los 7 días hábiles que fija
                        la ley. Las observaciones alargan el trámite: <strong>llegar preparado te ahorra semanas.</strong>
                        <span className="mt-1 block text-sm text-slate-600">
                            Fuente: Doing Business en el Perú 2020, Banco Mundial (datos de 2019).
                        </span>
                    </p>
                </div>
            </section>

            {/* RUTA */}
            <section id="como-funciona" aria-labelledby="ruta-titulo" className="mt-20 scroll-mt-24">
                <EncabezadoSeccion
                    id="ruta-titulo"
                    etiqueta="Cómo funciona"
                    titulo="Tu camino hacia el certificado ITSE"
                    texto="Los dos primeros pasos los haces aquí. Los otros dos, con tu municipalidad."
                />
                <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {RUTA_ITSE.map((paso, index) => {
                        const Icono = paso.icono;
                        const enApp = index < 2;
                        return (
                            <li
                                key={paso.titulo}
                                className={`rounded-2xl border p-6 ${enApp ? 'border-primary-200 bg-white shadow-sm' : 'border-slate-200 bg-white/60'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`flex size-12 items-center justify-center rounded-xl ${enApp ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                                    >
                                        <Icono aria-hidden="true" className="size-6" />
                                    </span>
                                    <span className="text-5xl font-extrabold text-slate-100" aria-hidden="true">
                                        {index + 1}
                                    </span>
                                </div>
                                <p className={`mt-5 text-sm font-bold tracking-wide uppercase ${enApp ? 'text-primary-700' : 'text-slate-500'}`}>
                                    {paso.donde}
                                </p>
                                <h3 className="mt-1 text-xl font-bold text-slate-900">
                                    <span className="sr-only">Paso {index + 1}: </span>
                                    {paso.titulo}
                                </h3>
                                <p className="mt-2 text-base leading-relaxed text-slate-600">{paso.texto}</p>
                            </li>
                        );
                    })}
                </ol>
            </section>

            {/* RUBROS */}
            <section aria-labelledby="rubros-titulo" className="mt-20">
                <EncabezadoSeccion
                    id="rubros-titulo"
                    etiqueta="Para cualquier rubro"
                    titulo="Preguntas hechas a la medida de tu negocio"
                    texto="Una perfumería no necesita lo mismo que un restaurante. Solo te preguntamos lo que aplica a tu local."
                />
                <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {RUBROS.map((rubro) => (
                        <li key={rubro.nombre} className="group relative h-56 overflow-hidden rounded-2xl sm:h-72">
                            <img
                                src={rubro.foto}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                            <p className="absolute right-4 bottom-4 left-4 text-lg leading-tight font-bold text-white">{rubro.nombre}</p>
                        </li>
                    ))}
                </ul>
            </section>

            {/* CALCULADORA */}
            <section id="calculadora" aria-labelledby="calc-titulo" className="mt-20 scroll-mt-24">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                    <div className="grid gap-10 lg:grid-cols-2">
                        <div>
                            <p className="text-primary-700 text-base font-bold">Calculadora rápida</p>
                            <h2 id="calc-titulo" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                                ¿Tu ITSE va antes o después de la licencia?
                            </h2>
                            <p className="mt-3 text-lg leading-relaxed text-slate-600">
                                Depende de tu actividad y del tamaño de tu local.{' '}
                                <button
                                    type="button"
                                    onClick={() => setShowGuia(true)}
                                    className="text-primary-700 inline-flex cursor-pointer items-center gap-1 font-semibold underline underline-offset-2"
                                >
                                    <BookOpen aria-hidden="true" className="size-4" /> Ver base legal
                                </button>
                            </p>
                            <form onSubmit={calcular} className="mt-6 space-y-4" noValidate>
                                <div>
                                    <label htmlFor="calc-giro" className="mb-1.5 block text-base font-semibold text-slate-800">
                                        ¿Qué tipo de negocio es?
                                    </label>
                                    <select
                                        id="calc-giro"
                                        value={giro}
                                        onChange={(e) => setGiro(e.target.value)}
                                        className={`${claseCampo} cursor-pointer`}
                                    >
                                        {FUNCIONES_ECONOMICAS.map((funcion) => (
                                            <option key={funcion.valor} value={funcion.valor}>
                                                {funcion.etiqueta} — {funcion.ejemplos}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="calc-area" className="mb-1.5 block text-base font-semibold text-slate-800">
                                            Área techada (m²)
                                        </label>
                                        <input
                                            id="calc-area"
                                            type="number"
                                            inputMode="decimal"
                                            min="1"
                                            placeholder="Ej. 60"
                                            value={area}
                                            onChange={(e) => setArea(e.target.value)}
                                            className={claseCampo}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="calc-pisos" className="mb-1.5 block text-base font-semibold text-slate-800">
                                            Pisos <span className="font-normal text-slate-500">(opcional)</span>
                                        </label>
                                        <input
                                            id="calc-pisos"
                                            type="number"
                                            inputMode="numeric"
                                            min="1"
                                            placeholder="Ej. 1"
                                            value={pisos}
                                            onChange={(e) => setPisos(e.target.value)}
                                            className={claseCampo}
                                        />
                                    </div>
                                </div>
                                {pideAforo && (
                                    <div>
                                        <label htmlFor="calc-aforo" className="mb-1.5 block text-base font-semibold text-slate-800">
                                            Personas al mismo tiempo <span className="font-normal text-slate-500">(opcional)</span>
                                        </label>
                                        <input
                                            id="calc-aforo"
                                            type="number"
                                            inputMode="numeric"
                                            min="1"
                                            placeholder="Ej. 30"
                                            value={aforo}
                                            onChange={(e) => setAforo(e.target.value)}
                                            className={claseCampo}
                                        />
                                    </div>
                                )}
                                {error && (
                                    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-800">
                                        {error}
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-7 text-lg font-bold text-white sm:w-auto"
                                >
                                    <Gauge aria-hidden="true" className="size-5" /> Calcular
                                </button>
                            </form>
                        </div>
                        <ResultadoCalculadora resultado={resultado} />
                    </div>
                </div>
            </section>

            {/* QUÉ REVISAMOS */}
            <section aria-labelledby="areas-titulo" className="mt-20">
                <EncabezadoSeccion
                    id="areas-titulo"
                    etiqueta="Qué revisaremos"
                    titulo="Lo mismo que mirará el inspector"
                    texto="Si no usas gas, no verás preguntas de gas. Solo lo que aplica a tu local."
                />
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {AREAS_CON_FOTO.map((item) => (
                        <li key={item.titulo} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <img src={item.foto} alt="" loading="lazy" className="h-40 w-full object-cover" />
                            <div className="p-5">
                                <h3 className="text-xl font-bold text-slate-900">{item.titulo}</h3>
                                <p className="mt-1 text-base leading-relaxed text-slate-600">{item.texto}</p>
                            </div>
                        </li>
                    ))}
                    {AREAS_CON_ICONO.map((item) => {
                        const Icono = item.icono;
                        return (
                            <li key={item.titulo} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <div className="bg-primary-50 flex h-40 items-center justify-center">
                                    <Icono aria-hidden="true" className="text-primary-700 size-14" />
                                </div>
                                <div className="p-5">
                                    <h3 className="text-xl font-bold text-slate-900">{item.titulo}</h3>
                                    <p className="mt-1 text-base leading-relaxed text-slate-600">{item.texto}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* RENOVACIÓN */}
            <section
                id="renovacion"
                aria-labelledby="renovacion-titulo"
                className="mt-20 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
            >
                <RenovacionRapida />
            </section>

            {/* ALIADOS */}
            <section aria-labelledby="aliados-titulo" className="mt-20 grid gap-4 lg:grid-cols-2">
                <Link
                    href={route('directorio.index')}
                    className="group bg-ink-900 relative flex min-h-72 flex-col justify-end overflow-hidden rounded-3xl p-8 text-white"
                >
                    <img
                        src="/images/extintor.webp"
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-40 transition duration-500 group-hover:scale-105"
                    />
                    <div aria-hidden="true" className="from-ink-900 absolute inset-0 bg-gradient-to-t to-transparent" />
                    <span className="relative">
                        <span className="text-sun-300 text-base font-bold">Tienda de aliados</span>
                        <span id="aliados-titulo" className="mt-1 block text-3xl font-extrabold">
                            Compra lo que le falta a tu local
                        </span>
                        <span className="mt-2 flex items-center gap-2 text-lg text-slate-200">
                            Extintores, señalética, luces de emergencia y técnicos en Huancayo
                            <ArrowRight aria-hidden="true" className="size-5 shrink-0 transition group-hover:translate-x-1" />
                        </span>
                    </span>
                </Link>
                <Link
                    href={`${route('directorio.index')}#anunciate`}
                    className="group border-sun-300 bg-sun-50 flex min-h-72 flex-col justify-between rounded-3xl border p-8"
                >
                    <Megaphone aria-hidden="true" className="text-sun-700 size-10" />
                    <span>
                        <span className="text-sun-700 text-base font-bold">Para proveedores</span>
                        <span className="mt-1 block text-3xl font-extrabold text-slate-900">¿Vendes equipos de seguridad?</span>
                        <span className="mt-2 flex items-center gap-2 text-lg text-slate-700">
                            Aparece justo cuando un negocio descubre que necesita tu producto
                            <ArrowRight aria-hidden="true" className="size-5 shrink-0 transition group-hover:translate-x-1" />
                        </span>
                    </span>
                </Link>
            </section>

            {/* FAQ */}
            <section aria-labelledby="faq-titulo" className="mt-20 grid gap-8 lg:grid-cols-[1fr_2fr]">
                <div>
                    <p className="text-primary-700 text-base font-bold">Preguntas frecuentes</p>
                    <h2 id="faq-titulo" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        Lo que todos preguntan
                    </h2>
                </div>
                <Accordion type="single" collapsible className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-6">
                    {PREGUNTAS_FRECUENTES.map((pregunta, idx) => (
                        <AccordionItem key={pregunta.titulo} value={`faq-${idx}`} className="border-0">
                            <AccordionTrigger className="py-5 text-left text-lg font-semibold text-slate-900 hover:no-underline">
                                {pregunta.titulo}
                            </AccordionTrigger>
                            <AccordionContent className="pb-5 text-base leading-relaxed text-slate-600">{pregunta.respuesta}</AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>

            {/* CTA FINAL */}
            <section className="bg-primary-700 mt-20 flex flex-col items-start justify-between gap-6 rounded-3xl p-8 text-white sm:flex-row sm:items-center sm:p-12">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">¿Listo para revisar tu local?</h2>
                    <p className="text-primary-100 mt-2 text-lg">Empieza ahora. Puedes guardar tu avance y volver cuando quieras.</p>
                </div>
                <Link
                    href={route('autoevaluacion.nueva')}
                    className="bg-sun-400 text-ink-900 hover:bg-sun-300 inline-flex min-h-14 shrink-0 items-center gap-2 rounded-xl px-7 text-lg font-bold"
                >
                    Simular mi local <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
            </section>
            <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                <Zap aria-hidden="true" className="size-4" />
                Basado en el D.S. N° 002-2018-PCM y el Manual de Ejecución de ITSE (R.J. N° 016-2018-CENEPRED/J).
            </p>
        </>
    );
}
