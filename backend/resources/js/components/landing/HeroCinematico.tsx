import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, MapPin, Pause, Play } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

const DURACION_MS = 6500;

/** Fondos a pantalla completa. La primera se carga de inmediato y las demás cuando les toca. */
export interface Diapositiva {
    foto: string;
    /** Texto corto que acompaña a la foto (lugar o rubro). */
    rubro: string;
    posicion: string;
    /** Autor y licencia, obligatorio para fotos con licencia Creative Commons. */
    credito?: string;
}

/** Huancayo, la ciudad de los negocios que usan CheckITSE (fotos de Wikimedia Commons, ver public/images/CREDITOS.md). */
const DIAPOSITIVAS_PORTADA: Diapositiva[] = [
    {
        foto: '/images/huancayo-catedral.webp',
        rubro: 'Plaza Constitución y Catedral',
        posicion: 'object-[62%_50%]',
        credito: 'Foto: PoolPs · CC BY-SA 4.0',
    },
    {
        foto: '/images/huancayo-torre-torre.webp',
        rubro: 'Torre Torre, Huancayo',
        posicion: 'object-[45%_50%]',
        credito: 'Foto: Marco Pocomucha · CC BY-SA 4.0',
    },
    {
        foto: '/images/huancayo-identidad.webp',
        rubro: 'Parque de la Identidad Wanka',
        posicion: 'object-[60%_40%]',
        credito: 'Foto: Heiner Amado Cadillo · CC BY-SA 3.0',
    },
    {
        foto: '/images/huancayo-plaza.webp',
        rubro: 'Plaza Constitución',
        posicion: 'object-center',
        credito: 'Foto: Heiner Amado Cadillo · CC BY-SA 3.0',
    },
];

interface HeroCinematicoProps {
    readonly diapositivas?: Diapositiva[];
    readonly etiqueta?: string;
    readonly titulo?: ReactNode;
    readonly texto?: string;
    /** Botones propios; si no se pasan, se usan los de la portada. */
    readonly acciones?: ReactNode;
    readonly pie?: ReactNode;
    /** Altura: pantalla completa (portada) o compacta (secciones internas). */
    readonly alto?: 'completo' | 'compacto';
    /** Retrasa la entrada del texto (para esperar la pantalla de bienvenida). */
    readonly retrasoEntradaMs?: number;
}

/** Una línea del título que sube desde una máscara, como en los créditos de cine. */
function LineaTitulo({ children, retraso, className = '' }: Readonly<{ children: ReactNode; retraso: number; className?: string }>) {
    return (
        <span className="block overflow-hidden pb-[0.08em]">
            <span className={`animate-subir-linea block motion-reduce:animate-none ${className}`} style={{ ['--retraso' as string]: `${retraso}ms` }}>
                {children}
            </span>
        </span>
    );
}

/**
 * Portada a pantalla completa: fotos que cambian con fundido y acercamiento
 * lento, título grande y dos acciones. Se pausa al pasar el mouse, al enfocar
 * con teclado o con el botón de pausa; sin movimiento si el sistema lo pide.
 */
export function HeroCinematico({
    diapositivas: DIAPOSITIVAS = DIAPOSITIVAS_PORTADA,
    etiqueta = 'Huancayo · Ciudad Incontrastable',
    titulo,
    texto = 'Simula la inspección de tu local, descubre qué te falta, compra a proveedores de tu zona y llega preparado a la municipalidad.',
    acciones,
    pie,
    alto = 'completo',
    retrasoEntradaMs = 0,
}: Readonly<HeroCinematicoProps>) {
    const [actual, setActual] = useState(0);
    const [pausado, setPausado] = useState(false);
    const [enfocado, setEnfocado] = useState(false);
    const [cargadas, setCargadas] = useState<Set<number>>(() => new Set([0, 1]));

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPausado(true);
    }, []);

    const detenido = pausado || enfocado;

    useEffect(() => {
        if (detenido) return;
        const temporizador = window.setTimeout(() => setActual((i) => (i + 1) % DIAPOSITIVAS.length), DURACION_MS);
        return () => window.clearTimeout(temporizador);
    }, [actual, detenido, DIAPOSITIVAS.length]);

    useEffect(() => {
        // Precarga la siguiente foto para que el cambio no muestre un hueco.
        setCargadas((previas) => new Set([...previas, actual, (actual + 1) % DIAPOSITIVAS.length]));
    }, [actual, DIAPOSITIVAS.length]);

    const r = (ms: number) => retrasoEntradaMs + ms;
    const estiloRetraso = (ms: number) => ({ ['--retraso' as string]: `${r(ms)}ms` });

    return (
        <section
            aria-labelledby="hero-titulo"
            aria-roledescription="carrusel"
            className={`bg-ink-900 relative isolate flex items-end overflow-hidden text-white ${alto === 'completo' ? 'min-h-svh lg:h-svh lg:max-h-[64rem] lg:min-h-[40rem]' : 'min-h-[36rem] sm:min-h-[40rem]'}`}
            onMouseEnter={() => setEnfocado(true)}
            onMouseLeave={() => setEnfocado(false)}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
        >
            {DIAPOSITIVAS.map((d, i) => (
                <div
                    key={d.foto}
                    aria-hidden={i !== actual}
                    className={`absolute inset-0 -z-20 transition-opacity duration-[1400ms] ease-out motion-reduce:transition-none ${i === actual ? 'opacity-100' : 'opacity-0'}`}
                >
                    {cargadas.has(i) && (
                        <img
                            src={d.foto}
                            alt=""
                            fetchPriority={i === 0 ? 'high' : 'low'}
                            decoding="async"
                            className={`h-full w-full object-cover ${d.posicion} ${i === actual && !detenido ? 'animate-zoom-lento motion-reduce:animate-none' : ''}`}
                        />
                    )}
                </div>
            ))}
            <div aria-hidden="true" className="from-ink-900 via-ink-900/50 absolute inset-0 -z-10 bg-gradient-to-t to-transparent" />
            <div aria-hidden="true" className="from-ink-900/85 via-ink-900/25 absolute inset-0 -z-10 bg-gradient-to-r to-transparent" />
            {/* Sombra superior: la barra de navegación va encima de la foto y debe leerse. */}
            <div aria-hidden="true" className="from-ink-900/70 absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b to-transparent" />

            <div className="mx-auto w-full max-w-7xl px-5 pt-28 pb-20 sm:px-8 sm:pb-24">
                <p
                    className="animate-aparecer text-sun-300 inline-flex items-center gap-2 text-sm font-bold tracking-[0.25em] uppercase motion-reduce:animate-none"
                    style={estiloRetraso(0)}
                >
                    <span aria-hidden="true" className="bg-sun-300 h-px w-8" />
                    {etiqueta}
                </p>
                <h1
                    id="hero-titulo"
                    className={`mt-5 max-w-4xl leading-[0.95] font-extrabold ${alto === 'completo' ? 'text-5xl sm:text-7xl lg:text-[5.5rem]' : 'text-4xl sm:text-6xl lg:text-7xl'}`}
                >
                    {titulo ?? (
                        <>
                            <LineaTitulo retraso={r(120)}>Abre tu negocio</LineaTitulo>
                            <LineaTitulo retraso={r(260)}>
                                <span className="font-acento text-primary-300 font-semibold italic">seguro</span> y sin multas.
                            </LineaTitulo>
                        </>
                    )}
                </h1>
                <p
                    className="animate-aparecer mt-6 max-w-xl text-lg leading-relaxed text-slate-200 motion-reduce:animate-none sm:text-xl"
                    style={estiloRetraso(480)}
                >
                    {texto}
                </p>
                <div className="animate-aparecer motion-reduce:animate-none" style={estiloRetraso(620)}>
                    {acciones ?? (
                        <>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href={route('autoevaluacion.nueva')}
                                    className="group bg-sun-400 text-ink-900 hover:bg-sun-300 inline-flex min-h-14 items-center gap-2 rounded-full px-8 text-lg font-bold shadow-lg shadow-black/20 transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                                >
                                    Simular mi local gratis
                                    <ArrowRight aria-hidden="true" className="size-5 transition group-hover:translate-x-1" />
                                </Link>
                                <a
                                    href="#renovacion"
                                    className="inline-flex min-h-14 items-center rounded-full border border-white/40 bg-white/5 px-7 text-lg font-semibold backdrop-blur-sm transition hover:bg-white/15"
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
                        </>
                    )}
                    {pie}
                </div>
            </div>

            {/* Controles del carrusel: lugar, crédito de la foto, avance y pausa */}
            <div className="absolute right-5 bottom-9 hidden items-center gap-4 sm:right-8 md:flex">
                <div className="text-right" aria-live="polite">
                    <p className="flex items-center justify-end gap-1.5 text-sm font-semibold tracking-wider text-slate-100 uppercase">
                        <MapPin aria-hidden="true" className="text-sun-300 size-4" />
                        {DIAPOSITIVAS[actual].rubro}
                    </p>
                    {DIAPOSITIVAS[actual].credito && <p className="mt-0.5 text-xs text-slate-300/80">{DIAPOSITIVAS[actual].credito}</p>}
                </div>
                <div className="flex items-center gap-2" role="group" aria-label="Elegir foto">
                    {DIAPOSITIVAS.map((d, i) => (
                        <button
                            key={d.foto}
                            type="button"
                            onClick={() => setActual(i)}
                            aria-label={`Ver foto ${i + 1}: ${d.rubro}`}
                            aria-current={i === actual}
                            className="relative h-1.5 w-10 cursor-pointer overflow-hidden rounded-full bg-white/30"
                        >
                            {i === actual && (
                                <span
                                    key={`${actual}-${detenido}`}
                                    style={{ ['--duracion-slide' as string]: `${DURACION_MS}ms` }}
                                    className={`absolute inset-0 rounded-full bg-white ${detenido ? '' : 'animate-avance motion-reduce:animate-none'}`}
                                />
                            )}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => setPausado((p) => !p)}
                    aria-label={pausado ? 'Reanudar fotos' : 'Pausar fotos'}
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/40 hover:bg-white/10"
                >
                    {pausado ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
                </button>
            </div>
            {/* En celular el crédito va discreto arriba a la derecha. */}
            {DIAPOSITIVAS[actual].credito && (
                <p className="absolute right-4 bottom-6 text-[0.7rem] text-white/70 md:hidden">{DIAPOSITIVAS[actual].credito}</p>
            )}
            <div aria-hidden="true" className="franja-andina absolute inset-x-0 bottom-0" />
        </section>
    );
}
