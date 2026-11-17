import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';

const DURACION_MS = 6000;

/** Fondos a pantalla completa. La primera se carga de inmediato y las demás cuando les toca. */
const DIAPOSITIVAS = [
    { foto: '/images/hero-emprendedora.webp', rubro: 'Tiendas de ropa', posicion: 'object-[70%_30%]' },
    { foto: '/images/hero-perfumeria.webp', rubro: 'Perfumerías', posicion: 'object-center' },
    { foto: '/images/hero-farmacia.webp', rubro: 'Farmacias y boticas', posicion: 'object-center' },
    { foto: '/images/hero-salon.webp', rubro: 'Salones de belleza', posicion: 'object-center' },
] as const;

/**
 * Portada a pantalla completa: fotos que cambian con fundido y acercamiento
 * lento, título grande y dos acciones. Se pausa al pasar el mouse, al enfocar
 * con teclado o con el botón de pausa; sin movimiento si el sistema lo pide.
 */
export function HeroCinematico() {
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
    }, [actual, detenido]);

    useEffect(() => {
        // Precarga la siguiente foto para que el cambio no muestre un hueco.
        setCargadas((previas) => new Set([...previas, actual, (actual + 1) % DIAPOSITIVAS.length]));
    }, [actual]);

    return (
        <section
            aria-labelledby="hero-titulo"
            aria-roledescription="carrusel"
            className="bg-ink-900 relative isolate flex h-[calc(100svh-4.5rem)] max-h-[60rem] min-h-[36rem] items-end overflow-hidden text-white"
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
                            className={`h-full w-full object-cover ${d.posicion} ${i === actual && !detenido ? 'animate-zoom-lento motion-reduce:animate-none' : ''}`}
                        />
                    )}
                </div>
            ))}
            <div aria-hidden="true" className="from-ink-900 via-ink-900/55 absolute inset-0 -z-10 bg-gradient-to-t to-transparent" />
            <div aria-hidden="true" className="from-ink-900/80 absolute inset-0 -z-10 bg-gradient-to-r via-transparent to-transparent" />

            <div className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8 sm:pb-20">
                <p className="text-sun-300 text-sm font-bold tracking-[0.25em] uppercase">Huancayo · Seguridad para tu negocio</p>
                <h1 id="hero-titulo" className="mt-4 max-w-4xl text-5xl leading-[0.95] font-extrabold sm:text-7xl lg:text-8xl">
                    Abre seguro.
                    <span className="text-primary-300 block">Llega listo a tu ITSE.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-200 sm:text-xl">
                    Simula la inspección de tu local, descubre qué te falta, compara precios de proveedores y llega preparado a la municipalidad.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                        href={route('autoevaluacion.nueva')}
                        className="bg-sun-400 text-ink-900 hover:bg-sun-300 inline-flex min-h-14 items-center gap-2 rounded-full px-8 text-lg font-bold transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    >
                        Simular mi local gratis <ArrowRight aria-hidden="true" className="size-5" />
                    </Link>
                    <a
                        href="#renovacion"
                        className="inline-flex min-h-14 items-center rounded-full border border-white/40 px-7 text-lg font-semibold backdrop-blur-sm transition hover:bg-white/10"
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

            {/* Controles del carrusel */}
            <div className="absolute right-5 bottom-8 hidden items-center gap-4 sm:right-8 md:flex">
                <p className="text-sm font-semibold tracking-wider text-slate-200 uppercase" aria-live="polite">
                    {DIAPOSITIVAS[actual].rubro}
                </p>
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
            <div aria-hidden="true" className="franja-andina absolute inset-x-0 bottom-0" />
        </section>
    );
}
