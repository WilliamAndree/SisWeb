import { GuiaModal } from '@/components/GuiaModal';
import { ContadorAnimado } from '@/components/landing/ContadorAnimado';
import { FranjaRubros } from '@/components/landing/FranjaRubros';
import { HeroCinematico } from '@/components/landing/HeroCinematico';
import { DURACION_ENTRADA_MS, PantallaEntrada, usePantallaEntrada } from '@/components/landing/PantallaEntrada';
import { RenovacionRapida } from '@/components/landing/RenovacionRapida';
import { RiesgosSinItse } from '@/components/landing/RiesgosSinItse';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import AppLayout from '@/layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeDollarSign,
    BookOpen,
    CalendarClock,
    CheckCircle2,
    Clock3,
    FileSignature,
    Hourglass,
    Info,
    Landmark,
    MapPin,
    Megaphone,
    MessageCircle,
    Store,
    Wrench,
    Zap,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

/** Recorrido real del emprendedor: qué pasa en CheckITSE y qué pasa en la municipalidad. */
const RUTA_ITSE = [
    {
        icono: Store,
        donde: 'En CheckITSE',
        titulo: 'Simula tu local',
        texto: 'Cuéntanos qué vendes, el tamaño de tu local y qué equipos usas. Toma unos 5 minutos.',
        foto: '/images/emprendedora-tienda.webp',
    },
    {
        icono: Wrench,
        donde: 'En CheckITSE',
        titulo: 'Corrige lo pendiente',
        texto: 'Recibe tu lista de mejoras y compra lo que te falta a proveedores de Huancayo.',
        foto: '/images/extintor.webp',
    },
    {
        icono: FileSignature,
        donde: 'Con tus documentos',
        titulo: 'Prepara tu expediente',
        texto: 'Descarga tu declaración jurada (Anexo 4) ya llenada con tus datos.',
        foto: null,
    },
    {
        icono: Landmark,
        donde: 'En tu municipalidad',
        titulo: 'Solicita tu ITSE',
        texto: 'Presenta tu trámite y recibe tu certificado, válido por 2 años.',
        foto: '/images/huancayo-plaza-arcos.webp',
    },
] as const;

/**
 * Datos del trámite. Fuente: D.S. N° 002-2018-PCM (arts. 6.1, 15.4, 21 y 26).
 * Evidencia completa en docs/respaldo-cientifico.md.
 */
const DATOS_CLAVE: { icono: typeof Clock3; numero: number | null; unidad: string; titulo: string; texto: string }[] = [
    {
        icono: Clock3,
        numero: 7,
        unidad: 'días',
        titulo: 'Inspección si tu riesgo es bajo o medio',
        texto: 'Días hábiles máximos para que te inspeccionen después de recibir tu licencia. Todo el trámite: hasta 9 días.',
    },
    {
        icono: Hourglass,
        numero: 5,
        unidad: 'días',
        titulo: 'Inspección si tu riesgo es alto',
        texto: 'Días hábiles máximos para inspeccionarte antes de darte la licencia. Todo el trámite: hasta 7 días.',
    },
    {
        icono: BadgeDollarSign,
        numero: null,
        unidad: 'Incluido',
        titulo: 'Costo dentro de tu licencia',
        texto: 'Si tramitas licencia de funcionamiento, la ITSE ya está incluida en ese pago. Cada municipalidad fija el monto en su TUPA.',
    },
    {
        icono: CalendarClock,
        numero: 2,
        unidad: 'años',
        titulo: 'Vigencia del certificado',
        texto: 'Después debes renovarlo. Si tu riesgo es bajo o medio, te lo entregan al presentar tu declaración jurada.',
    },
];

const AREAS_CON_FOTO = [
    { foto: '/images/extintor.webp', titulo: 'Extintores', texto: 'Tipo correcto, carga vigente y fácil acceso.' },
    { foto: '/images/salida-emergencia.webp', titulo: 'Evacuación', texto: 'Salidas libres, señales y luces de emergencia.' },
    { foto: '/images/tablero-electrico.webp', titulo: 'Electricidad', texto: 'Tablero con tapa, llaves y cables protegidos.' },
    { foto: '/images/balon-gas.webp', titulo: 'Gas (GLP)', texto: 'Balones ventilados y conexiones seguras. Solo si usas gas.' },
    { foto: '/images/escalera-pasamanos.webp', titulo: 'Estructura', texto: 'Escaleras con pasamanos y estantes altos anclados a la pared.' },
] as const;

/** Lo que más compra un local nuevo, enlazado a la especialidad del directorio que lo vende. */
const TIENDA_ALIADOS = [
    { foto: '/images/extintor.webp', nombre: 'Extintores y recargas', categoria: 'incendios' },
    { foto: '/images/salida-emergencia.webp', nombre: 'Señales de evacuación', categoria: 'arquitectura_senaletica' },
    { foto: '/images/tablero-electrico.webp', nombre: 'Electricistas y pozo a tierra', categoria: 'electricas' },
    { foto: '/images/estanteria.webp', nombre: 'Anclajes y estructuras', categoria: 'estructuras' },
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
        titulo: '¿Mi ITSE va antes o después de la licencia?',
        respuesta:
            'Depende de tu actividad y del tamaño de tu local. Al simular tu local, CheckITSE te dice tu nivel de riesgo y si la inspección es previa (antes de la licencia) o posterior.',
    },
    {
        titulo: '¿CheckITSE me da el certificado?',
        respuesta: 'No. El certificado lo emite tu municipalidad después de su inspección. CheckITSE te prepara para pasarla a la primera.',
    },
    { titulo: '¿Envían mis respuestas a la municipalidad?', respuesta: 'No. CheckITSE no está conectado a sistemas municipales ni genera actas.' },
];

function EncabezadoSeccion({
    id,
    etiqueta,
    titulo,
    texto,
    children,
}: Readonly<{ id: string; etiqueta: string; titulo: ReactNode; texto?: string; children?: ReactNode }>) {
    return (
        <div className="max-w-4xl">
            <p data-revelar className="text-primary-700 inline-flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase">
                <span aria-hidden="true" className="bg-primary-600 h-px w-8" />
                {etiqueta}
            </p>
            <h2 id={id} data-revelar className="mt-3 text-4xl leading-[1.05] font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                {titulo}
            </h2>
            {texto && (
                <p data-revelar className="mt-4 text-lg leading-relaxed text-slate-600">
                    {texto}
                </p>
            )}
            {children}
        </div>
    );
}

const retraso = (i: number, paso = 110) => ({ ['--retraso' as string]: `${i * paso}ms` });

/** Hoja de declaración jurada dibujada con CSS (paso 3: no hay foto real del documento). */
function HojaAnexo() {
    return (
        <div aria-hidden="true" className="bg-sun-50 flex h-full items-center justify-center">
            <div className="w-32 -rotate-3 rounded-md bg-white p-3 shadow-lg ring-1 ring-slate-200 transition duration-500 group-hover:rotate-0">
                <p className="text-[0.55rem] font-bold text-slate-500 uppercase">Anexo 4</p>
                <div className="mt-1.5 space-y-1">
                    {[90, 70, 80, 55, 75].map((ancho) => (
                        <div key={ancho} className="h-1.5 rounded bg-slate-200" style={{ width: `${ancho}%` }} />
                    ))}
                </div>
                <div className="mt-3 flex items-end justify-between">
                    <span className="font-acento text-ink-700 text-sm italic">Firma</span>
                    <CheckCircle2 className="text-primary-600 size-5" />
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    const [showGuia, setShowGuia] = useState(false);
    const conEntrada = usePantallaEntrada();

    return (
        <>
            <Head title="CheckITSE Huancayo - Prepara tu local para la ITSE" />
            <PantallaEntrada visible={conEntrada} />
            <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />

            <HeroCinematico retrasoEntradaMs={conEntrada ? DURACION_ENTRADA_MS : 150} />

            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-slate-500">
                    <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    Es una simulación orientativa basada en lo que declaras. No reemplaza la inspección oficial ni emite certificados ITSE.
                </p>
            </div>

            {/* RIESGOS: por qué actuar ahora */}
            <RiesgosSinItse />

            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                {/* RUTA */}
                <section id="como-funciona" aria-labelledby="ruta-titulo" className="mt-24 scroll-mt-24">
                    <EncabezadoSeccion
                        id="ruta-titulo"
                        etiqueta="Cómo funciona"
                        titulo={
                            <>
                                Tu camino al certificado, <span className="font-acento text-primary-700 font-semibold italic">en 4 pasos</span>
                            </>
                        }
                        texto="Los dos primeros los haces aquí, gratis. Los otros dos, con tu municipalidad."
                    />
                    <ol className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Línea que une los pasos en pantallas grandes */}
                        <div
                            aria-hidden="true"
                            data-revelar="izquierda"
                            className="from-primary-500 via-primary-300 absolute top-[10.5rem] right-12 left-12 hidden h-0.5 bg-gradient-to-r to-slate-200 lg:block"
                        />
                        {RUTA_ITSE.map((paso, index) => {
                            const Icono = paso.icono;
                            const enApp = index < 2;
                            return (
                                <li
                                    key={paso.titulo}
                                    data-revelar
                                    style={retraso(index, 140)}
                                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="relative h-40 overflow-hidden">
                                        {paso.foto ? (
                                            <img
                                                src={paso.foto}
                                                alt=""
                                                loading="lazy"
                                                className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                                            />
                                        ) : (
                                            <HojaAnexo />
                                        )}
                                        {paso.foto === '/images/huancayo-plaza-arcos.webp' && (
                                            <span className="absolute right-2 bottom-1 text-[0.65rem] text-white/85 drop-shadow">
                                                Foto: G. C. Gómez · CC BY-SA 4.0
                                            </span>
                                        )}
                                        <span className="font-display absolute top-3 left-4 text-6xl leading-none font-extrabold text-white drop-shadow-[0_2px_8px_rgb(0_0_0/0.45)]">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <span
                                        className={`relative z-10 -mt-7 ml-5 flex size-14 items-center justify-center rounded-2xl ring-4 ring-white ${enApp ? 'bg-primary text-white' : 'bg-ink-900 text-white'}`}
                                    >
                                        <Icono aria-hidden="true" className="size-7" />
                                    </span>
                                    <div className="flex-1 p-6 pt-4">
                                        <p className={`text-sm font-bold tracking-wide uppercase ${enApp ? 'text-primary-700' : 'text-slate-500'}`}>
                                            {paso.donde}
                                        </p>
                                        <h3 className="mt-1 text-xl font-bold text-slate-900">
                                            <span className="sr-only">Paso {index + 1}: </span>
                                            {paso.titulo}
                                        </h3>
                                        <p className="mt-2 text-base leading-relaxed text-slate-600">{paso.texto}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                    <div data-revelar className="mt-8 flex justify-center">
                        <Link
                            href={route('autoevaluacion.nueva')}
                            className="group bg-ink-900 hover:bg-ink-800 inline-flex min-h-14 items-center gap-2 rounded-full px-8 text-lg font-bold text-white transition"
                        >
                            Empezar por el paso 1 <ArrowRight aria-hidden="true" className="size-5 transition group-hover:translate-x-1" />
                        </Link>
                    </div>
                </section>

                {/* DATOS CLAVE */}
                <section aria-labelledby="datos-titulo" className="mt-28">
                    <EncabezadoSeccion
                        id="datos-titulo"
                        etiqueta="Datos clave del certificado ITSE"
                        titulo="Lo que dice la ley, en simple"
                        texto="Plazos máximos y costos según el Reglamento de ITSE (D.S. N° 002-2018-PCM)."
                    >
                        <button
                            type="button"
                            data-revelar
                            onClick={() => setShowGuia(true)}
                            className="text-primary-700 mt-3 inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-base font-semibold underline underline-offset-2"
                        >
                            <BookOpen aria-hidden="true" className="size-4" /> Ver la base legal
                        </button>
                    </EncabezadoSeccion>
                    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {DATOS_CLAVE.map((dato, i) => {
                            const Icono = dato.icono;
                            return (
                                <li
                                    key={dato.titulo}
                                    data-revelar
                                    style={retraso(i)}
                                    className="hover:border-primary-200 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <span className="bg-primary-50 text-primary-700 flex size-12 items-center justify-center rounded-xl">
                                        <Icono aria-hidden="true" className="size-6" />
                                    </span>
                                    <p className="font-display mt-5 text-5xl font-extrabold tracking-tight text-slate-900">
                                        {dato.numero === null ? (
                                            dato.unidad
                                        ) : (
                                            <>
                                                <ContadorAnimado valor={dato.numero} /> <span className="text-3xl">{dato.unidad}</span>
                                            </>
                                        )}
                                    </p>
                                    <h3 className="mt-2 text-lg font-bold text-slate-900">{dato.titulo}</h3>
                                    <p className="mt-2 text-base leading-relaxed text-slate-600">{dato.texto}</p>
                                </li>
                            );
                        })}
                    </ul>
                    <div
                        data-revelar="zoom"
                        className="border-sun-300 bg-sun-50 mt-4 flex flex-col gap-4 rounded-3xl border p-6 sm:flex-row sm:items-center sm:p-8"
                    >
                        <p className="font-display text-sun-700 shrink-0 text-6xl font-extrabold">
                            <ContadorAnimado valor={41} /> <span className="text-4xl">días</span>
                        </p>
                        <p className="text-lg leading-relaxed text-slate-800">
                            tomó en la práctica obtener la ITSE y la licencia de un local de riesgo alto en Huancayo, frente a los 7 días hábiles que
                            fija la ley. Las observaciones alargan el trámite: <strong>llegar preparado te ahorra semanas.</strong>
                            <span className="mt-1 block text-sm text-slate-600">
                                Fuente: Doing Business en el Perú 2020, Banco Mundial (datos de 2019).
                            </span>
                        </p>
                    </div>
                </section>
            </div>

            <FranjaRubros />

            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                {/* QUÉ REVISAMOS */}
                <section aria-labelledby="areas-titulo" className="mt-12">
                    <EncabezadoSeccion
                        id="areas-titulo"
                        etiqueta="Qué revisaremos"
                        titulo={
                            <>
                                Lo mismo que mirará <span className="font-acento text-primary-700 font-semibold italic">el inspector</span>
                            </>
                        }
                        texto="Si no usas gas, no verás preguntas de gas. Solo lo que aplica a tu local."
                    />
                    <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {AREAS_CON_FOTO.map((item, i) => (
                            <li
                                key={item.titulo}
                                data-revelar
                                style={retraso(i, 90)}
                                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="overflow-hidden">
                                    <img
                                        src={item.foto}
                                        alt=""
                                        loading="lazy"
                                        className="h-44 w-full object-cover transition duration-700 group-hover:scale-110"
                                    />
                                </div>
                                <div className="p-5">
                                    <h3 className="text-xl font-bold text-slate-900">{item.titulo}</h3>
                                    <p className="mt-1 text-base leading-relaxed text-slate-600">{item.texto}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            {/* HECHO EN HUANCAYO */}
            <section aria-labelledby="huancayo-titulo" className="relative isolate mt-28 overflow-hidden text-white">
                <img
                    src="/images/huancayo-valle.webp"
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_60%]"
                />
                <div aria-hidden="true" className="from-ink-900/95 via-ink-900/75 absolute inset-0 -z-10 bg-gradient-to-r to-transparent" />
                <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
                    <p data-revelar className="text-sun-300 inline-flex items-center gap-2 text-sm font-bold tracking-[0.25em] uppercase">
                        <MapPin aria-hidden="true" className="size-4" /> Valle del Mantaro
                    </p>
                    <h2 id="huancayo-titulo" data-revelar className="mt-3 max-w-2xl text-4xl leading-[1.05] font-extrabold sm:text-6xl">
                        Hecho en Huancayo, <span className="font-acento text-sun-300 font-semibold italic">para Huancayo.</span>
                    </h2>
                    <ul className="mt-10 grid max-w-2xl gap-4">
                        {[
                            'Proveedores de Huancayo, El Tambo y Chilca que te escriben por WhatsApp.',
                            'Preguntas pensadas para los negocios de aquí: bodegas, boticas, salones, pollerías y más.',
                            'Basado en la norma nacional que aplica tu municipalidad al inspeccionarte.',
                        ].map((texto, i) => (
                            <li
                                key={texto}
                                data-revelar="izquierda"
                                style={retraso(i, 140)}
                                className="flex items-start gap-3 text-lg text-slate-100"
                            >
                                <CheckCircle2 aria-hidden="true" className="text-sun-300 mt-0.5 size-6 shrink-0" />
                                {texto}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="absolute right-4 bottom-3 text-xs text-white/70">
                    Huancayo y el Valle del Mantaro · Foto: Guillermo Carlos Gómez · CC BY-SA 4.0
                </p>
            </section>

            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                {/* RENOVACIÓN */}
                <section
                    id="renovacion"
                    aria-labelledby="renovacion-titulo"
                    data-revelar
                    className="mt-24 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
                >
                    <RenovacionRapida />
                </section>

                {/* ALIADOS */}
                <section aria-labelledby="aliados-titulo" className="mt-28">
                    <EncabezadoSeccion
                        id="aliados-titulo"
                        etiqueta="Tienda de aliados"
                        titulo={
                            <>
                                ¿Te falta algo? <span className="font-acento text-primary-700 font-semibold italic">Cómpralo aquí cerca.</span>
                            </>
                        }
                        texto="Toca lo que necesitas y te mostramos quién lo vende o instala en tu zona."
                    />
                    <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {TIENDA_ALIADOS.map((producto, i) => (
                            <li key={producto.nombre} data-revelar style={retraso(i)}>
                                <Link
                                    href={`${route('directorio.index')}?categoria=${producto.categoria}#proveedores`}
                                    className="group bg-ink-900 relative flex h-64 flex-col justify-end overflow-hidden rounded-3xl p-5 text-white sm:h-80"
                                >
                                    <img
                                        src={producto.foto}
                                        alt=""
                                        loading="lazy"
                                        className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-110 group-hover:opacity-60"
                                    />
                                    <div
                                        aria-hidden="true"
                                        className="from-ink-900 via-ink-900/30 absolute inset-0 bg-gradient-to-t to-transparent"
                                    />
                                    <span className="relative text-xl leading-tight font-bold sm:text-2xl">{producto.nombre}</span>
                                    <span className="text-sun-300 relative mt-2 inline-flex items-center gap-1.5 text-base font-bold">
                                        Ver proveedores
                                        <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-1" />
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* Para proveedores: cómo llega un cliente, con un ejemplo de chat */}
                    <div
                        data-revelar
                        className="border-sun-300 bg-sun-50 mt-6 grid gap-8 overflow-hidden rounded-3xl border p-8 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center"
                    >
                        <div>
                            <p className="text-sun-700 inline-flex items-center gap-2 text-base font-bold">
                                <Megaphone aria-hidden="true" className="size-5" /> ¿Vendes equipos de seguridad?
                            </p>
                            <p className="font-display mt-2 text-3xl leading-tight font-extrabold text-slate-900 sm:text-4xl">
                                Aparece justo cuando un negocio descubre que te necesita
                            </p>
                            <ol className="mt-6 space-y-3 text-lg text-slate-700">
                                {[
                                    'Un emprendedor simula su local.',
                                    'Descubre que le falta un extintor.',
                                    'Ve tu ficha y te escribe por WhatsApp.',
                                ].map((texto, i) => (
                                    <li key={texto} className="flex items-center gap-3">
                                        <span className="bg-ink-900 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                                            {i + 1}
                                        </span>
                                        {texto}
                                    </li>
                                ))}
                            </ol>
                            <Link
                                href={`${route('directorio.index')}#anunciate`}
                                className="group bg-ink-900 hover:bg-ink-800 mt-7 inline-flex min-h-13 items-center gap-2 rounded-full px-7 text-lg font-bold text-white"
                            >
                                Ver planes para proveedores
                                <ArrowRight aria-hidden="true" className="size-5 transition group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div aria-hidden="true" className="relative mx-auto w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
                            <span className="bg-sun-400 text-ink-900 absolute -top-3 right-5 rounded-full px-3 py-0.5 text-xs font-bold uppercase">
                                Ejemplo
                            </span>
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                <span className="bg-primary-100 text-primary-700 flex size-10 items-center justify-center rounded-full font-bold">
                                    B
                                </span>
                                <span>
                                    <span className="block font-bold text-slate-900">Bodega Doña Rosa</span>
                                    <span className="block text-sm text-slate-500">Chilca · vía CheckITSE</span>
                                </span>
                                <MessageCircle className="text-primary-600 ml-auto size-5" />
                            </div>
                            <div className="mt-4 space-y-2 text-base">
                                <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-slate-800">
                                    Hola, CheckITSE me dice que necesito un extintor PQS de 6 kg. ¿Cuánto cuesta con instalación?
                                </p>
                                <p className="bg-primary-600 ml-auto max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-white">
                                    ¡Hola Rosa! Te lo llevo hoy con señal y soporte incluidos.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section aria-labelledby="faq-titulo" className="mt-28 grid gap-8 lg:grid-cols-[1fr_2fr]">
                    <EncabezadoSeccion id="faq-titulo" etiqueta="Preguntas frecuentes" titulo="Lo que todos preguntan" />
                    <Accordion
                        type="single"
                        collapsible
                        data-revelar
                        className="divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white px-6"
                    >
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

                {/* CTA FINAL con la Plaza Constitución de fondo */}
                <section data-revelar="zoom" className="bg-ink-900 relative isolate mt-28 overflow-hidden rounded-3xl p-8 text-white sm:p-14">
                    <img
                        src="/images/huancayo-plaza.webp"
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 -z-20 h-full w-full object-cover opacity-50"
                    />
                    <div aria-hidden="true" className="from-ink-900 via-ink-900/80 absolute inset-0 -z-10 bg-gradient-to-r to-transparent" />
                    <h2 className="max-w-2xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
                        Tu local, listo antes de que <span className="font-acento text-sun-300 font-semibold italic">toquen la puerta.</span>
                    </h2>
                    <p className="mt-4 max-w-xl text-lg text-slate-200">Empieza ahora. Puedes guardar tu avance y volver cuando quieras.</p>
                    <Link
                        href={route('autoevaluacion.nueva')}
                        className="group bg-sun-400 text-ink-900 hover:bg-sun-300 mt-8 inline-flex min-h-14 items-center gap-2 rounded-full px-8 text-lg font-bold"
                    >
                        Simular mi local gratis <ArrowRight aria-hidden="true" className="size-5 transition group-hover:translate-x-1" />
                    </Link>
                </section>
                <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                    <Zap aria-hidden="true" className="size-4" />
                    Basado en el D.S. N° 002-2018-PCM y el Manual de Ejecución de ITSE (R.J. N° 016-2018-CENEPRED/J).
                </p>
            </div>
        </>
    );
}

Home.layout = (page: React.ReactNode) => (
    <AppLayout ancho="completo" navSobreImagen>
        {page}
    </AppLayout>
);
