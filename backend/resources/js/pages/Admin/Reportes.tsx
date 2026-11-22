import { claseCampo } from '@/components/form/Pregunta';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, BarChart3, CheckCircle2, Clock3, Download, Filter, MessageCircle, ShieldCheck, Store, TrendingUp, Wrench } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

type Estado = 'VERDE' | 'AMBAR' | 'ROJO';

interface Filtros {
    desde: string;
    hasta: string;
    distrito: string;
    giro: string;
    estado: '' | Estado;
    origen: 'todos' | 'reales' | 'demo';
}

interface FilaLocal {
    codigo: string;
    nombre: string;
    distrito: string;
    giro: string;
    fecha: string;
    faltaban: number;
    corregidas: number;
    preparacion_inicial: number;
    preparacion_actual: number;
    estado: Estado;
}

interface ReportesProps {
    filtros: Filtros;
    opciones: { distritos: string[]; giros: string[] };
    indicadores: {
        locales: number;
        preparacion_inicial: number;
        preparacion_actual: number;
        listos: number;
        porcentaje_listos: number;
        faltaban_al_inicio: number;
        corregidas: number;
        tasa_correccion: number;
        dias_promedio_correccion: number;
        contactos_whatsapp: number;
    };
    por_mes: { mes: string; etiqueta: string; evaluados: number; listos: number }[];
    por_estado: { estado: Estado; etiqueta: string; locales: number }[];
    por_distrito: { distrito: string; locales: number; preparacion_inicial: number; preparacion_actual: number; listos: number }[];
    condiciones: { codigo: string; titulo: string; faltaban: number; corregidas: number; porcentaje_corregido: number }[];
    registros: FilaLocal[];
    totales_origen: { reales: number; demo: number };
}

const COLOR_ESTADO: Record<Estado, string> = { VERDE: 'bg-emerald-500', AMBAR: 'bg-sun-400', ROJO: 'bg-primary-600' };
const TEXTO_ESTADO: Record<Estado, string> = { VERDE: 'Listo', AMBAR: 'Casi listo', ROJO: 'Necesita atención' };
const ORIGENES = [
    { valor: 'todos', texto: 'Todos los registros' },
    { valor: 'reales', texto: 'Solo usuarios reales' },
    { valor: 'demo', texto: 'Solo demostración (DEMO-)' },
] as const;

const pct = (valor: number) => `${valor.toLocaleString('es-PE', { maximumFractionDigits: 1 })} %`;

function Tarjeta({ icono, titulo, valor, detalle }: Readonly<{ icono: ReactNode; titulo: string; valor: ReactNode; detalle: ReactNode }>) {
    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-base font-semibold text-slate-600">
                {icono} {titulo}
            </p>
            <p className="font-display mt-2 text-4xl font-extrabold tracking-tight text-slate-900">{valor}</p>
            <p className="mt-1 text-sm text-slate-600">{detalle}</p>
        </article>
    );
}

function Bloque({ titulo, texto, children }: Readonly<{ titulo: string; texto?: string; children: ReactNode }>) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
            {texto && <p className="mt-1 text-base text-slate-600">{texto}</p>}
            <div className="mt-5">{children}</div>
        </section>
    );
}

/** Columnas por mes: locales evaluados (alto total) y cuántos están listos (parte sólida). */
function GraficoMeses({ datos }: Readonly<{ datos: ReportesProps['por_mes'] }>) {
    const maximo = Math.max(1, ...datos.map((d) => d.evaluados));
    return (
        <figure>
            <div className="flex h-56 items-end gap-2 sm:gap-3" role="img" aria-label="Locales evaluados por mes">
                {datos.map((d) => (
                    <div key={d.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                        <span className="text-sm font-bold text-slate-800">{d.evaluados}</span>
                        <div
                            className="relative w-full max-w-14 overflow-hidden rounded-t-lg bg-slate-200"
                            style={{ height: `${(d.evaluados / maximo) * 85}%` }}
                        >
                            <div
                                className="bg-ink-700 absolute inset-x-0 bottom-0"
                                style={{ height: d.evaluados ? `${(d.listos / d.evaluados) * 100}%` : 0 }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{d.etiqueta}</span>
                    </div>
                ))}
            </div>
            <figcaption className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded bg-slate-200" /> Evaluados
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="bg-ink-700 size-3 rounded" /> De ellos, listos para la inspección
                </span>
            </figcaption>
        </figure>
    );
}

/** Barras pareadas: preparación al evaluar vs. preparación actual, por distrito. */
function GraficoAntesDespues({ datos }: Readonly<{ datos: ReportesProps['por_distrito'] }>) {
    return (
        <div className="space-y-4">
            {datos.map((d) => (
                <div key={d.distrito}>
                    <p className="flex justify-between text-base font-semibold text-slate-800">
                        <span>{d.distrito}</span>
                        <span className="text-slate-500">{d.locales} locales</span>
                    </p>
                    {[
                        { texto: 'Al evaluar', valor: d.preparacion_inicial, clase: 'bg-slate-400' },
                        { texto: 'Ahora', valor: d.preparacion_actual, clase: 'bg-primary-600' },
                    ].map((barra) => (
                        <div key={barra.texto} className="mt-1.5 flex items-center gap-3">
                            <span className="w-20 shrink-0 text-sm text-slate-600">{barra.texto}</span>
                            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full ${barra.clase}`} style={{ width: `${barra.valor}%` }} />
                            </div>
                            <span className="w-16 shrink-0 text-right text-sm font-bold text-slate-800">{pct(barra.valor)}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function GraficoEstados({ datos, total }: Readonly<{ datos: ReportesProps['por_estado']; total: number }>) {
    return (
        <div>
            <div className="flex h-8 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Distribución de locales por estado">
                {datos.map((d) =>
                    d.locales > 0 ? (
                        <div key={d.estado} className={COLOR_ESTADO[d.estado]} style={{ width: `${(d.locales / Math.max(1, total)) * 100}%` }} />
                    ) : null,
                )}
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                {datos.map((d) => (
                    <li key={d.estado} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-base">
                        <span className={`size-3 rounded-full ${COLOR_ESTADO[d.estado]}`} />
                        <span className="text-slate-700">{d.etiqueta}</span>
                        <strong className="ml-auto text-slate-900">{d.locales}</strong>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function Reportes(props: Readonly<ReportesProps>) {
    const { filtros, opciones, indicadores: i, totales_origen } = props;
    const [formulario, setFormulario] = useState<Filtros>(filtros);
    const consulta = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== '' && v !== 'todos')).toString();

    const aplicar = (e: FormEvent) => {
        e.preventDefault();
        router.get(route('admin.reportes'), { ...formulario }, { preserveScroll: true, preserveState: true });
    };
    const cambiar = (campo: keyof Filtros, valor: string) => setFormulario((f) => ({ ...f, [campo]: valor }));

    return (
        <>
            <Head title="Reportes de impacto - Administración CheckITSE" />
            <div className="space-y-6">
                <header className="bg-ink-900 trama-andina relative overflow-hidden rounded-3xl p-6 pb-[calc(1.5rem+18px)] text-white sm:p-8">
                    <div aria-hidden="true" className="franja-andina absolute inset-x-0 bottom-0" />
                    <p className="text-sun-300 inline-flex items-center gap-2 text-base font-bold">
                        <BarChart3 aria-hidden="true" className="size-5" /> Reportes de impacto
                    </p>
                    <h1 className="font-display mt-1 text-3xl font-extrabold sm:text-4xl">¿Los locales llegan más preparados a su ITSE?</h1>
                    <p className="mt-2 max-w-3xl text-lg text-slate-300">
                        Indicadores calculados con los registros de la base de datos: evaluaciones selladas, correcciones y contactos con proveedores.
                    </p>
                </header>

                {/* Filtros */}
                <form onSubmit={aplicar} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Filtros del reporte">
                    <p className="flex items-center gap-2 text-lg font-bold text-slate-900">
                        <Filter aria-hidden="true" className="size-5" /> Filtrar
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <label className="text-sm font-semibold text-slate-700">
                            Desde
                            <input
                                type="date"
                                name="desde"
                                value={formulario.desde}
                                onChange={(e) => cambiar('desde', e.target.value)}
                                className={`${claseCampo} mt-1`}
                            />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">
                            Hasta
                            <input
                                type="date"
                                name="hasta"
                                value={formulario.hasta}
                                onChange={(e) => cambiar('hasta', e.target.value)}
                                className={`${claseCampo} mt-1`}
                            />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">
                            Distrito
                            <select
                                name="distrito"
                                value={formulario.distrito}
                                onChange={(e) => cambiar('distrito', e.target.value)}
                                className={`${claseCampo} mt-1`}
                            >
                                <option value="">Todos</option>
                                {opciones.distritos.map((d) => (
                                    <option key={d}>{d}</option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm font-semibold text-slate-700">
                            Giro
                            <select
                                name="giro"
                                value={formulario.giro}
                                onChange={(e) => cambiar('giro', e.target.value)}
                                className={`${claseCampo} mt-1`}
                            >
                                <option value="">Todos</option>
                                {opciones.giros.map((g) => (
                                    <option key={g}>{g}</option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm font-semibold text-slate-700">
                            Estado
                            <select
                                name="estado"
                                value={formulario.estado}
                                onChange={(e) => cambiar('estado', e.target.value)}
                                className={`${claseCampo} mt-1`}
                            >
                                <option value="">Todos</option>
                                {(Object.keys(TEXTO_ESTADO) as Estado[]).map((e) => (
                                    <option key={e} value={e}>
                                        {TEXTO_ESTADO[e]}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm font-semibold text-slate-700">
                            Origen
                            <select
                                name="origen"
                                value={formulario.origen}
                                onChange={(e) => cambiar('origen', e.target.value)}
                                className={`${claseCampo} mt-1`}
                            >
                                {ORIGENES.map((o) => (
                                    <option key={o.valor} value={o.valor}>
                                        {o.texto}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            className="bg-primary hover:bg-primary-700 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-6 text-base font-bold text-white"
                        >
                            Aplicar filtros <ArrowRight aria-hidden="true" className="size-4" />
                        </button>
                        <Link
                            href={route('admin.reportes')}
                            className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 px-5 text-base font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Limpiar
                        </Link>
                        <a
                            href={`${route('admin.reportes.exportar')}${consulta ? `?${consulta}` : ''}`}
                            className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-5 text-base font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <Download aria-hidden="true" className="size-4" /> Descargar CSV (Excel)
                        </a>
                    </div>
                    <p className="mt-3 text-sm text-slate-600" data-cy="aviso-origen">
                        En este periodo: <strong>{totales_origen.reales}</strong> evaluaciones de usuarios reales y{' '}
                        <strong>{totales_origen.demo}</strong> de demostración (código DEMO-, generadas con el motor del sistema para probar los
                        reportes).
                    </p>
                </form>

                {/* Indicadores */}
                <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Tarjeta
                        icono={<Store aria-hidden="true" className="text-primary-600 size-5" />}
                        titulo="Locales evaluados"
                        valor={<span data-cy="kpi-locales">{i.locales}</span>}
                        detalle="Evaluaciones selladas en el periodo."
                    />
                    <Tarjeta
                        icono={<TrendingUp aria-hidden="true" className="text-primary-600 size-5" />}
                        titulo="Preparación promedio"
                        valor={
                            <span data-cy="kpi-preparacion">
                                {pct(i.preparacion_inicial)} <span className="text-2xl text-slate-400">→</span> {pct(i.preparacion_actual)}
                            </span>
                        }
                        detalle="Al evaluar → hoy, después de corregir."
                    />
                    <Tarjeta
                        icono={<ShieldCheck aria-hidden="true" className="text-primary-600 size-5" />}
                        titulo="Listos para la inspección"
                        valor={<span data-cy="kpi-listos">{i.listos}</span>}
                        detalle={`${pct(i.porcentaje_listos)} de los locales evaluados.`}
                    />
                    <Tarjeta
                        icono={<Wrench aria-hidden="true" className="text-primary-600 size-5" />}
                        titulo="Tasa de corrección"
                        valor={<span data-cy="kpi-correccion">{pct(i.tasa_correccion)}</span>}
                        detalle={`${i.corregidas} corregidas de ${i.faltaban_al_inicio} condiciones que faltaban al evaluar.`}
                    />
                    <Tarjeta
                        icono={<Clock3 aria-hidden="true" className="text-primary-600 size-5" />}
                        titulo="Días para corregir"
                        valor={i.dias_promedio_correccion.toLocaleString('es-PE')}
                        detalle="Promedio desde la evaluación hasta la última corrección."
                    />
                    <Tarjeta
                        icono={<MessageCircle aria-hidden="true" className="text-primary-600 size-5" />}
                        titulo="Contactos por WhatsApp"
                        valor={i.contactos_whatsapp}
                        detalle="Emprendedores que escribieron a un proveedor."
                    />
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Bloque titulo="Locales evaluados por mes" texto="Cuántos negocios usan CheckITSE y cuántos quedan listos.">
                        <GraficoMeses datos={props.por_mes} />
                    </Bloque>
                    <Bloque titulo="Antes y después, por distrito" texto="Preparación promedio al evaluar y hoy.">
                        {props.por_distrito.length ? (
                            <GraficoAntesDespues datos={props.por_distrito} />
                        ) : (
                            <p className="text-slate-600">Sin datos con estos filtros.</p>
                        )}
                    </Bloque>
                </div>

                <Bloque titulo="Estado de los locales" texto="Semáforo actual de los locales del periodo.">
                    <GraficoEstados datos={props.por_estado} total={i.locales} />
                </Bloque>

                <Bloque
                    titulo="Lo que más falta y cuánto se corrige"
                    texto="Condiciones que faltaban al evaluar y cuántas se corrigieron después (con foto o descripción)."
                >
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[40rem] text-left text-base" data-cy="tabla-condiciones">
                            <thead className="border-b border-slate-200 text-sm text-slate-600">
                                <tr>
                                    <th className="py-2 pr-3 font-semibold">Condición</th>
                                    <th className="px-3 py-2 text-right font-semibold">Faltaba en</th>
                                    <th className="px-3 py-2 text-right font-semibold">Corregidas</th>
                                    <th className="py-2 pl-3 font-semibold">Avance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {props.condiciones.map((c) => (
                                    <tr key={c.codigo} className="border-b border-slate-100">
                                        <td className="py-3 pr-3">
                                            <span className="font-mono text-sm text-slate-500">{c.codigo}</span>{' '}
                                            <span className="text-slate-900">{c.titulo}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right font-bold">{c.faltaban}</td>
                                        <td className="px-3 py-3 text-right font-bold">{c.corregidas}</td>
                                        <td className="w-48 py-3 pl-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="bg-primary-600 h-full rounded-full"
                                                        style={{ width: `${c.porcentaje_corregido}%` }}
                                                    />
                                                </div>
                                                <span className="w-14 text-right text-sm font-semibold">{pct(c.porcentaje_corregido)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {props.condiciones.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-6 text-center text-slate-600">
                                            Sin condiciones pendientes en este periodo.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Bloque>

                <Bloque titulo="Últimos locales evaluados" texto="Registros individuales que alimentan los indicadores.">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[48rem] text-left text-base" data-cy="tabla-locales">
                            <thead className="border-b border-slate-200 text-sm text-slate-600">
                                <tr>
                                    <th className="py-2 pr-3 font-semibold">Código</th>
                                    <th className="px-3 py-2 font-semibold">Local</th>
                                    <th className="px-3 py-2 font-semibold">Distrito</th>
                                    <th className="px-3 py-2 font-semibold">Fecha</th>
                                    <th className="px-3 py-2 text-right font-semibold">Al evaluar</th>
                                    <th className="px-3 py-2 text-right font-semibold">Ahora</th>
                                    <th className="py-2 pl-3 font-semibold">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {props.registros.map((r) => (
                                    <tr key={r.codigo} className="border-b border-slate-100">
                                        <td className="py-2.5 pr-3 font-mono text-sm">{r.codigo}</td>
                                        <td className="px-3 py-2.5">
                                            {r.nombre} <span className="text-sm text-slate-500">· {r.giro}</span>
                                        </td>
                                        <td className="px-3 py-2.5">{r.distrito}</td>
                                        <td className="px-3 py-2.5">{r.fecha}</td>
                                        <td className="px-3 py-2.5 text-right">{pct(r.preparacion_inicial)}</td>
                                        <td className="px-3 py-2.5 text-right font-bold">{pct(r.preparacion_actual)}</td>
                                        <td className="py-2.5 pl-3">
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className={`size-2.5 rounded-full ${COLOR_ESTADO[r.estado] ?? 'bg-slate-300'}`} />
                                                {TEXTO_ESTADO[r.estado] ?? r.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {i.locales > 0 && (
                        <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                            <CheckCircle2 aria-hidden="true" className="size-4" /> La preparación "al evaluar" sale de la foto sellada de cada
                            evaluación; "ahora" incluye las correcciones posteriores.
                        </p>
                    )}
                </Bloque>
            </div>
        </>
    );
}
