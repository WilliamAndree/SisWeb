import { ETIQUETA_TIPO, MODULOS, REFERENCIAS, enlaceDoi, type ModuloSisWeb, type Referencia, type TipoReferencia } from '@/data/respaldoCientifico';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookMarked, ExternalLink, FlaskConical, GraduationCap, Landmark } from 'lucide-react';
import { useMemo, useState } from 'react';

const ORDEN_TIPOS: TipoReferencia[] = ['normativa', 'articulo', 'tesis'];

const ICONO_TIPO: Record<TipoReferencia, typeof Landmark> = {
    normativa: Landmark,
    articulo: FlaskConical,
    tesis: GraduationCap,
};

function contarPorTipo(tipo: TipoReferencia): number {
    return REFERENCIAS.filter((ref) => ref.tipo === tipo).length;
}

function TarjetaReferencia({ referencia }: Readonly<{ referencia: Referencia }>) {
    return (
        <article id={referencia.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="bg-ink-900 rounded-full px-2.5 py-0.5 font-bold text-white">{referencia.anio}</span>
                <span className="font-medium text-slate-500">{referencia.fuente}</span>
            </div>
            <h3 className="mt-3 text-base leading-snug font-bold text-slate-900">{referencia.tituloEs ?? referencia.titulo}</h3>
            {referencia.tituloEs && <p className="mt-1 text-xs text-slate-500 italic">{referencia.titulo}</p>}
            <p className="mt-2 text-sm text-slate-600">{referencia.autores}</p>
            <p className="bg-primary-50 text-primary-900 mt-4 rounded-xl p-3 text-sm leading-relaxed">
                <span className="font-bold">Aporte a CheckITSE: </span>
                {referencia.aporte}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
                {referencia.modulos.map((modulo) => (
                    <span key={modulo} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {MODULOS[modulo].nombre}
                    </span>
                ))}
                {referencia.doi && (
                    <a
                        href={enlaceDoi(referencia.doi)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-700 ml-auto inline-flex min-h-9 items-center gap-1 text-xs font-bold hover:underline"
                    >
                        DOI {referencia.doi}
                        <ExternalLink aria-hidden="true" className="size-3.5" />
                        <span className="sr-only">(abre en otra pestaña)</span>
                    </a>
                )}
            </div>
        </article>
    );
}

export default function RespaldoCientifico() {
    const [filtro, setFiltro] = useState<ModuloSisWeb | 'todos'>('todos');

    const visibles = useMemo(() => (filtro === 'todos' ? REFERENCIAS : REFERENCIAS.filter((ref) => ref.modulos.includes(filtro))), [filtro]);

    return (
        <>
            <Head title="Respaldo científico y normativo - CheckITSE Huancayo" />

            <header className="bg-ink-900 relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10 sm:py-14">
                <div aria-hidden="true" className="bg-primary-500/20 absolute -top-24 -right-16 size-72 rounded-full blur-3xl" />
                <div className="relative max-w-3xl">
                    <p className="text-sun-300 inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                        <BookMarked aria-hidden="true" className="size-4" />
                        Respaldo científico y normativo
                    </p>
                    <h1 className="mt-4 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
                        Cada pregunta de CheckITSE tiene un sustento
                    </h1>
                    <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
                        La simulación se basa en la normativa peruana de ITSE y en investigaciones sobre seguridad contra incendios, rutas de
                        evacuación y autoinspección. Aquí ves qué documento respalda cada parte de la herramienta.
                    </p>
                </div>
                <dl className="relative mt-8 grid max-w-2xl grid-cols-3 gap-3">
                    {ORDEN_TIPOS.map((tipo) => (
                        <div key={tipo} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <dt className="text-xs text-slate-300">{ETIQUETA_TIPO[tipo]}</dt>
                            <dd className="mt-1 text-2xl font-extrabold">{contarPorTipo(tipo)}</dd>
                        </div>
                    ))}
                </dl>
            </header>

            <section aria-labelledby="modulos-titulo" className="mt-12">
                <h2 id="modulos-titulo" className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Filtra por parte de la herramienta
                </h2>
                <p className="mt-1 text-sm text-slate-600">Elige un módulo para ver solo los documentos que lo sustentan.</p>
                <div role="group" aria-label="Filtrar referencias por módulo" className="mt-5 flex flex-wrap gap-2">
                    {(['todos', ...Object.keys(MODULOS)] as Array<ModuloSisWeb | 'todos'>).map((clave) => {
                        const activo = filtro === clave;
                        return (
                            <button
                                key={clave}
                                type="button"
                                aria-pressed={activo}
                                onClick={() => setFiltro(clave)}
                                className={`min-h-10 cursor-pointer rounded-full border px-4 text-sm font-semibold transition ${
                                    activo
                                        ? 'border-primary bg-primary text-white'
                                        : 'hover:border-primary-300 border-slate-200 bg-white text-slate-700'
                                }`}
                            >
                                {clave === 'todos' ? 'Todos' : MODULOS[clave].nombre}
                            </button>
                        );
                    })}
                </div>
                {filtro !== 'todos' && <p className="mt-3 text-sm text-slate-600">{MODULOS[filtro].descripcion}</p>}
            </section>

            {ORDEN_TIPOS.map((tipo) => {
                const lista = visibles.filter((ref) => ref.tipo === tipo);
                if (lista.length === 0) return null;
                const Icono = ICONO_TIPO[tipo];
                return (
                    <section key={tipo} aria-labelledby={`tipo-${tipo}`} className="mt-10">
                        <h2 id={`tipo-${tipo}`} className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <Icono aria-hidden="true" className="text-primary-700 size-5" />
                            {ETIQUETA_TIPO[tipo]}
                            <span className="text-sm font-medium text-slate-500">({lista.length})</span>
                        </h2>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            {lista.map((referencia) => (
                                <TarjetaReferencia key={referencia.id} referencia={referencia} />
                            ))}
                        </div>
                    </section>
                );
            })}

            <section className="border-sun-300 bg-sun-50 mt-12 flex flex-col items-start gap-4 rounded-3xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900">¿Listo para probarlo con tu local?</h2>
                    <p className="mt-1 text-sm text-slate-700">La simulación toma unos minutos y no necesitas crear una cuenta.</p>
                </div>
                <Link
                    href={route('autoevaluacion.nueva')}
                    className="bg-primary hover:bg-primary-700 inline-flex min-h-12 items-center gap-2 rounded-xl px-6 font-bold text-white"
                >
                    Empezar simulación <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
            </section>
        </>
    );
}
