import { GuiaModal } from '@/components/GuiaModal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { REFERENCIAS } from '@/data/respaldoCientifico';
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
    BookOpen,
    Boxes,
    Building2,
    CheckCircle2,
    ClipboardCheck,
    FileSignature,
    Flame,
    FlameKindling,
    Footprints,
    Gauge,
    Info,
    Landmark,
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
        texto: 'Cuéntanos qué vendes, el tamaño de tu local y qué equipos usas. Te toma unos 5 minutos.',
    },
    {
        icono: Wrench,
        donde: 'En CheckITSE',
        titulo: 'Corrige lo pendiente',
        texto: 'Recibe tu lista de mejoras con ejemplos y fotos de referencia, y encuentra técnicos aliados en Huancayo.',
    },
    {
        icono: FileSignature,
        donde: 'Con tus documentos',
        titulo: 'Prepara tu expediente',
        texto: 'Descarga el borrador de la declaración jurada (Anexo 4) con tus datos y revisa qué planos te pedirán.',
    },
    {
        icono: Landmark,
        donde: 'En tu municipalidad',
        titulo: 'Solicita tu ITSE',
        texto: 'Presenta tu trámite. Si todo está en orden, obtienes tu certificado ITSE, que dura 2 años.',
    },
] as const;

const AREAS_REVISION = [
    { icono: Flame, titulo: 'Extintores', texto: 'Tipo correcto, carga vigente y fácil acceso.' },
    { icono: Footprints, titulo: 'Evacuación', texto: 'Salidas libres, señales y luces de emergencia.' },
    { icono: Zap, titulo: 'Electricidad', texto: 'Tablero con tapa, llaves y cables protegidos.' },
    { icono: FlameKindling, titulo: 'Gas (GLP)', texto: 'Balones ventilados y conexiones seguras.' },
    { icono: Boxes, titulo: 'Estructura', texto: 'Escaleras con pasamanos y estantes anclados.' },
] as const;

const PREGUNTAS_FRECUENTES = [
    {
        titulo: '¿Cuánto cuesta usar CheckITSE?',
        respuesta: 'Nada. Es una herramienta gratuita de orientación para emprendedores y comerciantes de Huancayo.',
    },
    {
        titulo: '¿CheckITSE me da el certificado ITSE?',
        respuesta:
            'No. El certificado lo emite tu municipalidad después de su propia inspección. CheckITSE te ayuda a llegar preparado para que no te observen cosas que podías corregir antes.',
    },
    {
        titulo: '¿Cuánto tiempo dura el certificado ITSE?',
        respuesta: 'Dos años desde que se expide (Ley N° 30619). Si cambias el uso, amplías o remodelas tu local, necesitas una nueva ITSE.',
    },
    {
        titulo: '¿Envían mis respuestas a la municipalidad?',
        respuesta: 'No. CheckITSE no está conectado a sistemas municipales ni genera actas de fiscalización.',
    },
    {
        titulo: '¿Necesito RUC para empezar?',
        respuesta: 'No. Puedes agregarlo si lo tienes para identificar tu reporte, pero no es obligatorio.',
    },
];

const HALLAZGOS = [
    {
        cita: 'Zhang et al., 2019',
        texto: 'Las inspecciones anuales no alcanzan para asegurar el cumplimiento continuo: la autoinspección de los usuarios lo complementa.',
    },
    {
        cita: 'Bai et al., 2025',
        texto: 'Modelar el local como una red de ambientes permite trazar rutas de evacuación con cerca de 70 % menos riesgo.',
    },
];

function ResultadoCalculadora({ resultado }: Readonly<{ resultado: ClasificacionItse | null }>) {
    if (!resultado) {
        return (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                <Gauge aria-hidden="true" className="size-8 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">Tu resultado aparecerá aquí</p>
                <p className="mt-1 text-sm text-slate-500">Completa al menos el tamaño de tu local.</p>
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
            <p className={`text-xs font-bold tracking-wide uppercase ${previa ? 'text-amber-800' : 'text-primary-800'}`}>Resultado orientativo</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{texto.titulo}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{texto.resumen}</p>
            {resultado.motivos.length > 0 ? (
                <ul className="mt-4 space-y-1.5">
                    {resultado.motivos.map((motivo) => (
                        <li key={motivo} className="flex gap-2 text-sm text-slate-700">
                            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-600" />
                            {motivo}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-primary-900 mt-4 flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 aria-hidden="true" className="size-4" /> Sin factores que eleven el riesgo.
                </p>
            )}
            <Link
                href={route('autoevaluacion.nueva')}
                className="text-primary-800 mt-5 inline-flex min-h-10 items-center gap-1.5 text-sm font-bold hover:underline"
            >
                Ver qué debo revisar en mi local <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
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
    const totalArticulos = REFERENCIAS.filter((ref) => ref.tipo === 'articulo').length;
    const totalNormas = REFERENCIAS.filter((ref) => ref.tipo === 'normativa').length;

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
        'h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20';

    return (
        <>
            <Head title="CheckITSE Huancayo - Prepara tu local para la ITSE" />
            <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />

            {/* HERO */}
            <section
                aria-labelledby="hero-titulo"
                className="bg-ink-900 relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-14"
            >
                <div aria-hidden="true" className="bg-primary-500/25 absolute -top-32 -right-24 size-96 rounded-full blur-3xl" />
                <div aria-hidden="true" className="bg-sun-500/15 absolute -bottom-40 -left-24 size-96 rounded-full blur-3xl" />
                <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
                    <div>
                        <p className="text-sun-300 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold">
                            <Sparkles aria-hidden="true" className="size-3.5" />
                            Para emprendedores de Huancayo
                        </p>
                        <h1 id="hero-titulo" className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                            Abre tu negocio seguro y llega <span className="text-primary-300">listo a tu ITSE</span>
                        </h1>
                        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
                            Simula la inspección técnica de seguridad de tu local, descubre qué te observarían y corrígelo antes de ir a la
                            municipalidad.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Link
                                href={route('autoevaluacion.nueva')}
                                className="bg-sun-400 text-ink-900 hover:bg-sun-300 inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-base font-bold transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                            >
                                Simular mi local <ArrowRight aria-hidden="true" className="size-5" />
                            </Link>
                            <a
                                href="#como-funciona"
                                className="inline-flex min-h-12 items-center rounded-xl border border-white/20 px-5 text-base font-semibold text-white transition hover:bg-white/10"
                            >
                                Cómo funciona
                            </a>
                        </div>
                        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                            {['Gratis', 'Sin crear cuenta', 'Unos 5 minutos'].map((item) => (
                                <li key={item} className="flex items-center gap-1.5">
                                    <CheckCircle2 aria-hidden="true" className="text-primary-300 size-4" /> {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Vista previa del resultado: muestra lo que obtendrá el emprendedor. */}
                    <div aria-hidden="true" className="rounded-2xl bg-white p-5 text-slate-900 shadow-2xl shadow-black/30 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500">Ejemplo de resultado</p>
                                <p className="truncate font-bold">Café Wanka · 60 m²</p>
                            </div>
                            <span className="bg-primary-50 text-primary-800 shrink-0 rounded-full px-2.5 py-1 text-xs font-bold">ITSE posterior</span>
                        </div>
                        <div className="mt-5">
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                                <span>Condiciones listas</span>
                                <span>8 de 11</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-slate-100">
                                <div className="bg-primary h-2 w-[73%] rounded-full" />
                            </div>
                        </div>
                        <ul className="mt-5 space-y-2.5 text-sm">
                            <li className="flex items-center gap-2.5">
                                <CheckCircle2 className="text-primary-600 size-4 shrink-0" /> Extintor PQS con carga vigente
                            </li>
                            <li className="flex items-center gap-2.5">
                                <CheckCircle2 className="text-primary-600 size-4 shrink-0" /> Salida libre y señalizada
                            </li>
                            <li className="flex items-center gap-2.5">
                                <span className="size-4 shrink-0 rounded-full border-2 border-amber-500" /> Falta extintor Clase K para la cocina
                            </li>
                            <li className="flex items-center gap-2.5">
                                <span className="size-4 shrink-0 rounded-full border-2 border-amber-500" /> Tablero eléctrico sin tapa
                            </li>
                        </ul>
                    </div>
                </div>
                <p className="relative mt-10 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
                    <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    Es una simulación orientativa basada en lo que declaras. No reemplaza la inspección oficial ni emite certificados ITSE.
                </p>
            </section>

            {/* RUTA */}
            <section id="como-funciona" aria-labelledby="ruta-titulo" className="mt-20 scroll-mt-24">
                <div className="max-w-2xl">
                    <p className="text-primary-700 text-sm font-bold">Cómo funciona</p>
                    <h2 id="ruta-titulo" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        Tu camino hacia el certificado ITSE
                    </h2>
                    <p className="mt-3 text-base text-slate-600">Los dos primeros pasos los haces aquí. Los otros dos, con tu municipalidad.</p>
                </div>
                <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {RUTA_ITSE.map((paso, index) => {
                        const Icono = paso.icono;
                        const enApp = index < 2;
                        return (
                            <li
                                key={paso.titulo}
                                className={`relative rounded-2xl border p-6 ${enApp ? 'border-primary-200 bg-white shadow-sm' : 'border-slate-200 bg-white/60'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`flex size-11 items-center justify-center rounded-xl ${enApp ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                                    >
                                        <Icono aria-hidden="true" className="size-5" />
                                    </span>
                                    <span className="text-4xl font-extrabold text-slate-100" aria-hidden="true">
                                        {index + 1}
                                    </span>
                                </div>
                                <p className={`mt-5 text-xs font-bold tracking-wide uppercase ${enApp ? 'text-primary-700' : 'text-slate-500'}`}>
                                    {paso.donde}
                                </p>
                                <h3 className="mt-1 text-lg font-bold text-slate-900">
                                    <span className="sr-only">Paso {index + 1}: </span>
                                    {paso.titulo}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">{paso.texto}</p>
                            </li>
                        );
                    })}
                </ol>
            </section>

            {/* CALCULADORA */}
            <section id="calculadora" aria-labelledby="calc-titulo" className="mt-20 scroll-mt-24">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                    <div className="grid gap-10 lg:grid-cols-2">
                        <div>
                            <p className="text-primary-700 text-sm font-bold">Calculadora rápida</p>
                            <h2 id="calc-titulo" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                                ¿Tu ITSE va antes o después de la licencia?
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-slate-600">
                                Depende de tu actividad y del tamaño de tu local, según la Matriz de Riesgos del Manual de ITSE de CENEPRED.{' '}
                                <button
                                    type="button"
                                    onClick={() => setShowGuia(true)}
                                    className="text-primary-700 inline-flex cursor-pointer items-center gap-1 font-semibold underline underline-offset-2"
                                >
                                    <BookOpen aria-hidden="true" className="size-3.5" /> Ver base legal
                                </button>
                            </p>
                            <form onSubmit={calcular} className="mt-6 space-y-4" noValidate>
                                <div>
                                    <label htmlFor="calc-giro" className="mb-1.5 block text-sm font-semibold text-slate-800">
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
                                        <label htmlFor="calc-area" className="mb-1.5 block text-sm font-semibold text-slate-800">
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
                                        <label htmlFor="calc-pisos" className="mb-1.5 block text-sm font-semibold text-slate-800">
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
                                        <label htmlFor="calc-aforo" className="mb-1.5 block text-sm font-semibold text-slate-800">
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
                                    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                        {error}
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-6 font-bold text-white sm:w-auto"
                                >
                                    <Gauge aria-hidden="true" className="size-4" /> Calcular
                                </button>
                            </form>
                        </div>
                        <ResultadoCalculadora resultado={resultado} />
                    </div>
                </div>
            </section>

            {/* QUÉ REVISAMOS */}
            <section aria-labelledby="areas-titulo" className="mt-20">
                <div className="max-w-2xl">
                    <p className="text-primary-700 text-sm font-bold">Qué revisaremos</p>
                    <h2 id="areas-titulo" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        Lo mismo que mirará el inspector
                    </h2>
                    <p className="mt-3 text-base text-slate-600">
                        Solo te preguntamos lo que aplica a tu local: si no usas gas, no verás preguntas de gas.
                    </p>
                </div>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {AREAS_REVISION.map((item) => {
                        const Icono = item.icono;
                        return (
                            <li key={item.titulo} className="rounded-2xl border border-slate-200 bg-white p-5">
                                <Icono aria-hidden="true" className="text-primary-700 size-6" />
                                <h3 className="mt-3 font-bold text-slate-900">{item.titulo}</h3>
                                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.texto}</p>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* RESPALDO */}
            <section aria-labelledby="respaldo-titulo" className="mt-20">
                <div className="bg-ink-900 grid gap-8 rounded-3xl p-6 text-white sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
                    <div>
                        <p className="text-sun-300 text-sm font-bold">Respaldo científico</p>
                        <h2 id="respaldo-titulo" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                            Basado en la norma y en la ciencia
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-slate-300">
                            Usamos el D.S. N° 002-2018-PCM, el Manual de ITSE de CENEPRED y {totalArticulos} artículos científicos indexados sobre
                            seguridad contra incendios y autoinspección.
                        </p>
                        <div className="mt-6 flex gap-6">
                            <p>
                                <span className="block text-3xl font-extrabold">{totalNormas}</span>
                                <span className="text-xs text-slate-400">normas oficiales</span>
                            </p>
                            <p>
                                <span className="block text-3xl font-extrabold">{totalArticulos}</span>
                                <span className="text-xs text-slate-400">artículos científicos</span>
                            </p>
                        </div>
                        <Link
                            href={route('respaldo.index')}
                            className="text-sun-300 mt-6 inline-flex min-h-10 items-center gap-1.5 text-sm font-bold hover:underline"
                        >
                            Ver todas las fuentes <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                    </div>
                    <ul className="space-y-3">
                        {HALLAZGOS.map((hallazgo) => (
                            <li key={hallazgo.cita} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <p className="text-sm leading-relaxed text-slate-200">“{hallazgo.texto}”</p>
                                <p className="text-primary-300 mt-2 text-xs font-bold">{hallazgo.cita}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* FAQ */}
            <section aria-labelledby="faq-titulo" className="mt-20 grid gap-8 lg:grid-cols-[1fr_2fr]">
                <div>
                    <p className="text-primary-700 text-sm font-bold">Preguntas frecuentes</p>
                    <h2 id="faq-titulo" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                        Lo que todos preguntan
                    </h2>
                </div>
                <Accordion type="single" collapsible className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
                    {PREGUNTAS_FRECUENTES.map((pregunta, idx) => (
                        <AccordionItem key={pregunta.titulo} value={`faq-${idx}`} className="border-0">
                            <AccordionTrigger className="py-5 text-left text-base font-semibold text-slate-900 hover:no-underline">
                                {pregunta.titulo}
                            </AccordionTrigger>
                            <AccordionContent className="pb-5 text-sm leading-relaxed text-slate-600">{pregunta.respuesta}</AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>

            {/* CTA FINAL */}
            <section className="mt-20 grid gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="bg-primary-700 flex flex-col items-start justify-between gap-6 rounded-3xl p-8 text-white sm:flex-row sm:items-center sm:p-10">
                    <div>
                        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">¿Listo para revisar tu local?</h2>
                        <p className="text-primary-100 mt-2 text-sm">Empieza ahora. Puedes guardar tu avance y volver cuando quieras.</p>
                    </div>
                    <Link
                        href={route('autoevaluacion.nueva')}
                        className="bg-sun-400 text-ink-900 hover:bg-sun-300 inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-6 font-bold"
                    >
                        Simular mi local <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                </div>
                <Link
                    href={route('directorio.index')}
                    className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 transition hover:border-slate-300"
                >
                    <Building2 aria-hidden="true" className="text-primary-700 size-7" />
                    <span className="mt-6">
                        <span className="block text-lg font-bold text-slate-900">¿Necesitas un técnico?</span>
                        <span className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                            Electricistas, recarga de extintores y señalética
                            <ArrowRight aria-hidden="true" className="size-4 shrink-0 transition group-hover:translate-x-0.5" />
                        </span>
                    </span>
                </Link>
            </section>

            <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
                <ClipboardCheck aria-hidden="true" className="size-3.5" />
                Referencia normativa: D.S. N° 002-2018-PCM y R.J. N° 016-2018-CENEPRED/J.
            </p>
        </>
    );
}
