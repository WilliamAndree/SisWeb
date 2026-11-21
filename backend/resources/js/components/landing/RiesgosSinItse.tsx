import { Link } from '@inertiajs/react';
import { ArrowRight, Banknote, DoorClosed, TrendingDown, UserX } from 'lucide-react';
import { useId, useState } from 'react';

/**
 * Sanciones que una municipalidad puede imponer: Ley Orgánica de Municipalidades
 * (Ley 27972), art. 46 (multa, clausura, entre otras). El monto de la multa lo fija
 * cada municipalidad en su cuadro de infracciones, por eso no se muestra una cifra.
 */
const RIESGOS = [
    {
        icono: Banknote,
        titulo: 'Multa',
        texto: 'La fija tu municipalidad en su cuadro de infracciones. Se paga aunque después regularices.',
        tono: 'from-primary-500/25',
    },
    {
        icono: DoorClosed,
        titulo: 'Clausura',
        texto: 'Te pueden cerrar el local hasta que corrijas todas las observaciones de seguridad.',
        tono: 'from-magenta-500/25',
    },
    {
        icono: TrendingDown,
        titulo: 'Días sin vender',
        texto: 'El alquiler, los sueldos y las cuotas siguen corriendo con tu puerta cerrada.',
        tono: 'from-sun-500/25',
    },
    {
        icono: UserX,
        titulo: 'Clientes que se van',
        texto: 'Un cartel de clausura en tu puerta espanta a quien pasaba a comprar. Y no siempre vuelve.',
        tono: 'from-emerald-400/25',
    },
] as const;

const DIAS_CIERRE = [3, 7, 15] as const;

const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 });

/** Cinta de "clausurado" que cruza la sección: el aviso que nadie quiere ver en su puerta. */
function CintaClausura({ className = '' }: Readonly<{ className?: string }>) {
    return (
        <div aria-hidden="true" className={`bg-sun-400 text-ink-900 overflow-hidden py-2.5 shadow-xl ${className}`}>
            <div className="animate-deslizar flex w-max gap-8 font-black tracking-[0.3em] whitespace-nowrap uppercase motion-reduce:animate-none">
                {Array.from({ length: 16 }, (_, i) => (
                    <span key={i} className="flex items-center gap-8">
                        Clausurado <span className="text-primary-700">✕</span> Local sin ITSE <span className="text-primary-700">✕</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

/** Cuánto deja de vender un local cerrado: venta diaria × días de cierre. Solo ilustra; no es una sanción. */
function CostoDelCierre() {
    const id = useId();
    const [ventaDiaria, setVentaDiaria] = useState(400);
    const [dias, setDias] = useState<(typeof DIAS_CIERRE)[number]>(7);
    const perdida = ventaDiaria * dias;

    return (
        <div data-revelar="derecha" className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
            <p className="text-primary-700 text-sm font-bold tracking-widest uppercase">Haz la cuenta</p>
            <p className="font-display mt-2 text-2xl font-bold">¿Cuánto te costaría cerrar?</p>

            <label htmlFor={`${id}-venta`} className="mt-6 flex items-baseline justify-between gap-3 text-base font-semibold text-slate-700">
                Vendes al día
                <span className="text-xl font-extrabold text-slate-900">{soles.format(ventaDiaria)}</span>
            </label>
            <input
                id={`${id}-venta`}
                type="range"
                min={100}
                max={3000}
                step={50}
                value={ventaDiaria}
                onChange={(e) => setVentaDiaria(Number(e.target.value))}
                className="accent-primary-600 mt-3 h-2 w-full cursor-pointer"
            />

            <p id={`${id}-dias`} className="mt-6 text-base font-semibold text-slate-700">
                Días cerrado
            </p>
            <div role="radiogroup" aria-labelledby={`${id}-dias`} className="mt-2 grid grid-cols-3 gap-2">
                {DIAS_CIERRE.map((opcion) => (
                    <button
                        key={opcion}
                        type="button"
                        role="radio"
                        aria-checked={dias === opcion}
                        onClick={() => setDias(opcion)}
                        className={`min-h-12 cursor-pointer rounded-xl border text-lg font-bold transition ${dias === opcion ? 'border-ink-900 bg-ink-900 text-white' : 'border-slate-300 text-slate-700 hover:border-slate-400'}`}
                    >
                        {opcion} días
                    </button>
                ))}
            </div>

            <div className="bg-primary-50 mt-6 rounded-2xl p-5" aria-live="polite">
                <p className="text-base text-slate-700">Dejarías de vender</p>
                <p className="text-primary-700 font-display text-5xl font-extrabold tracking-tight">{soles.format(perdida)}</p>
                <p className="mt-1 text-sm text-slate-600">Sin contar la multa ni lo que gastes en corregir con apuro.</p>
            </div>
        </div>
    );
}

/**
 * Sección de "qué arriesgas": convierte el riesgo abstracto en algo que el
 * emprendedor reconoce (multa, cierre, días sin vender, clientes) y lo lleva a
 * la acción con la simulación gratuita.
 */
export function RiesgosSinItse() {
    return (
        <section aria-labelledby="riesgos-titulo" className="bg-ink-900 trama-andina relative mt-24 overflow-hidden text-white">
            <CintaClausura className="-mx-8 -rotate-2" />

            <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.25fr_1fr] lg:items-center">
                <div>
                    <p data-revelar className="text-sun-300 text-sm font-bold tracking-[0.25em] uppercase">
                        Lo que arriesgas sin ITSE
                    </p>
                    <h2 id="riesgos-titulo" data-revelar className="mt-3 text-4xl leading-[1.05] font-extrabold sm:text-6xl">
                        ¿Y si mañana llega <span className="font-acento text-primary-300 font-semibold italic">el inspector?</span>
                    </h2>
                    <p data-revelar className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
                        Un local sin certificado vigente no arriesga solo una multa. Arriesga todo lo que te costó levantar.
                    </p>

                    <ul className="mt-10 grid gap-4 sm:grid-cols-2">
                        {RIESGOS.map((riesgo, i) => {
                            const Icono = riesgo.icono;
                            return (
                                <li
                                    key={riesgo.titulo}
                                    data-revelar
                                    style={{ ['--retraso' as string]: `${i * 110}ms` }}
                                    className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${riesgo.tono} to-transparent p-6 transition hover:-translate-y-1 hover:border-white/25`}
                                >
                                    <span className="text-ink-900 flex size-12 items-center justify-center rounded-xl bg-white transition group-hover:scale-110">
                                        <Icono aria-hidden="true" className="size-6" />
                                    </span>
                                    <h3 className="font-display mt-4 text-2xl font-bold">{riesgo.titulo}</h3>
                                    <p className="mt-1.5 text-base leading-relaxed text-slate-300">{riesgo.texto}</p>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div>
                    <CostoDelCierre />
                    <Link
                        data-revelar
                        href={route('autoevaluacion.nueva')}
                        className="group bg-primary-500 hover:bg-primary-400 animate-latido mt-5 flex min-h-16 items-center justify-center gap-2 rounded-2xl px-6 text-xl font-bold text-white transition"
                    >
                        Evítalo: revisa tu local gratis
                        <ArrowRight aria-hidden="true" className="size-6 transition group-hover:translate-x-1" />
                    </Link>
                    <p className="mt-3 text-center text-sm text-slate-400">
                        Sanciones según la Ley Orgánica de Municipalidades (Ley 27972, art. 46).
                    </p>
                </div>
            </div>
        </section>
    );
}
