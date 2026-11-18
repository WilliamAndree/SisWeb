import { RegistrarLocalButton } from '@/components/RegistrarLocalButton';
import { resolverFotoNegocio, usarFotoRespaldo } from '@/lib/imagen-negocio';
import type { AutoevaluacionItem } from '@/types/contrato';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    ClipboardList,
    Clock,
    FileSpreadsheet,
    FileText,
    Fingerprint,
    MapPin,
    RotateCw,
    Search,
    ShieldCheck,
    Store,
    Trash2,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export interface DashboardKpis {
    readonly total_locales: number;
    readonly aprobados: number;
    readonly sin_observaciones?: number;
    readonly observados: number;
    readonly en_proceso: number;
    readonly riesgo_dominante: string;
}

export interface DashboardProps {
    readonly records: readonly AutoevaluacionItem[];
    readonly kpis: DashboardKpis;
}

interface LocalCardProps {
    readonly record: AutoevaluacionItem;
}

/**
 * Tarjeta del local en "Mi panel": foto del rubro, cuánto está listo en grande,
 * una acción principal según el caso y accesos secundarios ordenados. Permite
 * eliminar registros antiguos con confirmación en la misma tarjeta.
 */
function LocalCard({ record }: Readonly<LocalCardProps>) {
    const [confirmarBorrado, setConfirmarBorrado] = useState(false);
    const [borrando, setBorrando] = useState(false);

    const enProceso = record.estado !== 'REGISTRADA';
    const conteo = record.conteo_condiciones ?? { total: 0, cumple: 0, no_cumple: 0, por_revisar: 0, na: 0 };
    const falta = conteo.no_cumple ?? 0;
    const porRevisar = conteo.por_revisar ?? 0;
    const listo = conteo.cumple ?? 0;
    const aplicables = Math.max(listo + falta + porRevisar, 1);
    const porcentaje = Math.round(record.porcentaje_cumplimiento ?? (listo / aplicables) * 100);
    const pendientes = falta + porRevisar;
    const uuid = record.uuid_trazabilidad;
    const foto = resolverFotoNegocio(record.nombre_comercio, record.funcion_economica, uuid ?? record.id ?? record.nombre_comercio);

    let estado = { texto: '¡Listo para la inspección!', clase: 'bg-emerald-500 text-white', Icono: ShieldCheck };
    if (enProceso) estado = { texto: 'Simulación sin terminar', clase: 'bg-white/90 text-slate-900', Icono: Clock };
    else if (pendientes > 0)
        estado = { texto: `Te falta${pendientes === 1 ? '' : 'n'} ${pendientes}`, clase: 'bg-sun-400 text-ink-900', Icono: AlertTriangle };

    let principal = { texto: 'Ver mi resumen', href: route('autoevaluacion.resumen', { uuid }) };
    if (enProceso) principal = { texto: 'Continuar simulación', href: route('autoevaluacion.checklist', { uuid }) };
    else if (pendientes > 0) principal = { texto: 'Ver lo que me falta', href: route('autoevaluacion.subsanar_items', { uuid }) };

    const eliminar = () => {
        setBorrando(true);
        router.delete(route('mis-autoevaluaciones.destroy', { uuid }), {
            preserveScroll: true,
            onFinish: () => {
                setBorrando(false);
                setConfirmarBorrado(false);
            },
        });
    };

    const secundarios = [
        { texto: 'Mi resumen', href: route('autoevaluacion.resumen', { uuid }), Icono: ClipboardList, oculto: enProceso },
        { texto: 'Expediente digital', href: route('autoevaluacion.expediente_digital', { uuid }), Icono: FileText, oculto: enProceso },
        { texto: 'Informe', href: route('autoevaluacion.informe', { uuid }), Icono: FileSpreadsheet, oculto: enProceso },
        { texto: 'Volver a evaluar', href: route('autoevaluacion.reevaluar', { uuid }), Icono: RotateCw, oculto: enProceso },
    ].filter((s) => !s.oculto);

    return (
        <article
            aria-label={`Local ${record.nombre_comercio}`}
            className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
            <div className="relative h-52">
                <img src={foto} alt="" loading="lazy" onError={usarFotoRespaldo} className="h-full w-full object-cover" />
                <div aria-hidden="true" className="from-ink-900/95 absolute inset-0 bg-gradient-to-t via-black/20 to-transparent" />
                <span
                    className={`absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold shadow ${estado.clase}`}
                >
                    <estado.Icono aria-hidden="true" className="size-4" /> {estado.texto}
                </span>
                <div className="absolute right-5 bottom-4 left-5 text-white">
                    <h3 className="font-display truncate text-2xl font-bold">{record.nombre_comercio}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-base text-slate-200">
                        <span className="inline-flex items-center gap-1">
                            <MapPin aria-hidden="true" className="size-4" /> {record.sector_huancayo || 'Huancayo'}
                        </span>
                        {record.fecha_corta && <span>{record.fecha_corta}</span>}
                    </p>
                </div>
            </div>

            <div className="flex flex-1 flex-col p-5 sm:p-6">
                {!enProceso && (
                    <>
                        <div className="flex items-end justify-between gap-3">
                            <p className="text-5xl font-extrabold text-slate-900">
                                {porcentaje}
                                <span className="text-2xl text-slate-400">%</span>
                            </p>
                            <p className="pb-2 text-base font-semibold text-slate-600">listo para la ITSE</p>
                        </div>
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={`h-full rounded-full ${pendientes === 0 ? 'bg-emerald-500' : 'bg-primary'}`}
                                style={{ width: `${porcentaje}%` }}
                            />
                        </div>
                        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                            {[
                                { etiqueta: 'Listo', valor: listo, clase: 'bg-emerald-50 text-emerald-800' },
                                { etiqueta: 'Falta', valor: falta, clase: 'bg-primary-50 text-primary-800' },
                                { etiqueta: 'Por revisar', valor: porRevisar, clase: 'bg-sun-50 text-sun-700' },
                            ].map((c) => (
                                <div key={c.etiqueta} className={`rounded-xl px-2 py-3 ${c.clase}`}>
                                    <dd className="text-2xl font-extrabold">{c.valor}</dd>
                                    <dt className="text-sm font-semibold">{c.etiqueta}</dt>
                                </div>
                            ))}
                        </dl>
                    </>
                )}
                {enProceso && (
                    <p className="text-lg text-slate-700">Aún no terminas de responder las condiciones de tu local. Continúa donde lo dejaste.</p>
                )}

                <Link
                    href={principal.href}
                    className="bg-primary hover:bg-primary-700 mt-6 flex min-h-13 items-center justify-center gap-2 rounded-xl px-5 text-lg font-bold text-white"
                >
                    {principal.texto} <ArrowRight aria-hidden="true" className="size-5" />
                </Link>

                {secundarios.length > 0 && (
                    <ul className="mt-3 grid grid-cols-2 gap-2">
                        {secundarios.map((s) => (
                            <li key={s.texto}>
                                <Link
                                    href={s.href}
                                    className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 text-base font-semibold text-slate-800 hover:bg-slate-50"
                                >
                                    <s.Icono aria-hidden="true" className="text-primary-700 size-5 shrink-0" /> {s.texto}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-auto pt-5">
                    {confirmarBorrado ? (
                        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                            <p className="text-base font-semibold text-rose-900">
                                ¿Eliminar este registro? Se borrarán sus respuestas, fotos y documentos.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={eliminar}
                                    disabled={borrando}
                                    className="min-h-12 cursor-pointer rounded-xl bg-rose-600 px-5 text-base font-bold text-white disabled:opacity-60"
                                >
                                    {borrando ? 'Eliminando…' : 'Sí, eliminar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmarBorrado(false)}
                                    className="min-h-12 cursor-pointer rounded-xl px-4 text-base font-semibold text-slate-700 hover:bg-white"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmarBorrado(true)}
                            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-base font-semibold text-slate-500 hover:text-rose-700"
                        >
                            <Trash2 aria-hidden="true" className="size-5" /> Eliminar registro
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

export default function Dashboard({ records, kpis }: Readonly<DashboardProps>) {
    const { flash } = usePage().props as { flash?: { success?: string | null } };
    const [busqueda, setBusqueda] = useState('');
    const [pestanaActiva, setPestanaActiva] = useState<'locales' | 'trazabilidad'>('locales');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | 'conformes' | 'observados'>('todos');

    // Promedio de cumplimiento global
    const promedioCumplimiento = useMemo(() => {
        if (records.length === 0) return 0;
        const suma = records.reduce((acc, r) => acc + (r.porcentaje_cumplimiento ?? 0), 0);
        return Math.round(suma / records.length);
    }, [records]);

    // Total de expedientes sellados con hash SHA-256
    const expedientesSellados = useMemo(() => {
        return records.filter((r) => Boolean(r.hash_integridad));
    }, [records]);

    // Filtro compuesto por texto y estado
    const localesFiltrados = useMemo(() => {
        let filtrados = [...records];

        if (filtroEstado === 'conformes') {
            filtrados = filtrados.filter((r) => (r.clasificacion_estado ?? '') === 'CONFORME');
        } else if (filtroEstado === 'observados') {
            filtrados = filtrados.filter((r) => (r.clasificacion_estado ?? '') === 'OBSERVADO');
        }

        if (!busqueda.trim()) {
            return filtrados;
        }

        const q = busqueda.toLowerCase();
        return filtrados.filter((r) => {
            const nombre = (r.nombre_comercio ?? '').toLowerCase();
            const ruc = (r.ruc ?? '').toLowerCase();
            const dir = (r.direccion ?? '').toLowerCase();
            const uuid = (r.uuid_trazabilidad ?? '').toLowerCase();
            return nombre.includes(q) || ruc.includes(q) || dir.includes(q) || uuid.includes(q);
        });
    }, [records, filtroEstado, busqueda]);

    return (
        <>
            <Head title="Mi panel — CheckITSE" />
            {flash?.success && (
                <p
                    role="status"
                    className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-lg font-semibold text-emerald-800"
                >
                    <ShieldCheck aria-hidden="true" className="size-6" /> {flash.success}
                </p>
            )}

            <div className="space-y-6 sm:space-y-8">
                {/* Cabecera Principal */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                                Autoevaluación ITSE Huancayo
                            </span>
                        </div>
                        <h1 className="font-display mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Mi panel</h1>
                        <p className="mt-2 text-lg text-slate-600">Tus locales, lo que les falta y tus documentos, en un solo lugar.</p>
                    </div>

                    {records.length === 0 && (
                        <div className="flex flex-wrap items-center gap-3">
                            <RegistrarLocalButton variant="large" />
                        </div>
                    )}
                </div>

                {/* 1. Métricas Superiores (3 Tarjetas KPI) */}
                <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
                    {/* Tarjeta 1: Nivel de Cumplimiento Normativo */}
                    <div className="flex h-full flex-col justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-sun-50/40 p-5 shadow-xs transition-all hover:shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-emerald-800">Nivel de Cumplimiento Normativo</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black tracking-tight text-slate-900">{promedioCumplimiento}%</span>
                                <span className="text-sm font-bold text-slate-500">promedio global</span>
                            </div>

                            {/* Barra de progreso */}
                            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                                <div
                                    className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                                    style={{ width: `${promedioCumplimiento}%` }}
                                />
                            </div>

                            <p className="mt-2 text-sm font-semibold text-emerald-900">
                                {kpis.aprobados} de {kpis.total_locales}{' '}
                                {kpis.total_locales === 1 ? 'local con autoevaluación conforme' : 'locales con autoevaluación conforme'}
                            </p>
                        </div>
                    </div>

                    {/* Tarjeta 2: Locales con observaciones */}
                    <div className="flex h-full flex-col justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 p-5 shadow-xs transition-all hover:shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-amber-800">Locales con observaciones</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black tracking-tight text-slate-900">{kpis.observados}</span>
                                <span className="text-sm font-bold text-slate-500">
                                    {kpis.observados === 1 ? 'local por revisar' : 'locales por revisar'}
                                </span>
                            </div>

                            {kpis.observados > 0 ? (
                                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-900">
                                    <p className="leading-relaxed">
                                        <strong>Aviso preventivo:</strong> Tienes {kpis.observados}{' '}
                                        {kpis.observados === 1 ? 'local con condiciones por corregir' : 'locales con condiciones por corregir'} antes
                                        de solicitar tu inspección.
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                                    Todos tus locales están al día sin observaciones pendientes.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Tarjeta 3: Tus expedientes guardados */}
                    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-5 shadow-xs transition-all hover:shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">Tus expedientes guardados</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                <FileText className="h-5 w-5" aria-hidden="true" />
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black tracking-tight text-slate-900">{expedientesSellados.length}</span>
                                <span className="text-sm font-bold text-slate-500">
                                    {expedientesSellados.length === 1 ? 'expediente guardado' : 'expedientes guardados'}
                                </span>
                            </div>

                            <p className="mt-3 text-sm leading-relaxed text-slate-500">
                                Tu información está guardada y protegida para respaldo de tu negocio.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Pestañas y Filtros */}
                <div className="space-y-6 sm:space-y-8">
                    {/* Selector de pestañas principal */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                        <button
                            type="button"
                            onClick={() => setPestanaActiva('locales')}
                            className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-base font-bold transition ${
                                pestanaActiva === 'locales'
                                    ? 'bg-ink-900 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            <Store className="h-4 w-4" aria-hidden="true" />
                            <span>Mis Locales y Expedientes ITSE ({records.length})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setPestanaActiva('trazabilidad')}
                            className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-base font-bold transition ${
                                pestanaActiva === 'trazabilidad'
                                    ? 'bg-ink-900 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            <Fingerprint className="h-4 w-4" aria-hidden="true" />
                            <span>Expedientes Guardados ({expedientesSellados.length})</span>
                        </button>
                    </div>

                    {/* Barra de herramientas: Búsqueda, Filtros píldora y botón Nuevo Local */}
                    {pestanaActiva === 'locales' && (
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            {/* Buscador */}
                            <div className="relative w-full lg:w-96">
                                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input
                                    type="search"
                                    aria-label="Buscar mis locales"
                                    placeholder="Buscar por nombre o dirección…"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="focus:border-primary focus:ring-primary/20 min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-base font-medium text-slate-800 placeholder-slate-400 shadow-2xs transition focus:ring-2 focus:outline-none"
                                />
                            </div>

                            {/* Botones píldora de filtro rápido */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setFiltroEstado('todos')}
                                    className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-3.5 py-2.5 text-base font-bold transition ${
                                        filtroEstado === 'todos'
                                            ? 'bg-ink-900 text-white shadow-xs'
                                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    Todos ({records.length})
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFiltroEstado('conformes')}
                                    className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-3.5 py-2.5 text-base font-bold transition ${
                                        filtroEstado === 'conformes'
                                            ? 'bg-ink-900 text-white shadow-xs'
                                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    Sin Observaciones ({kpis.aprobados})
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFiltroEstado('observados')}
                                    className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-3.5 py-2.5 text-base font-bold transition ${
                                        filtroEstado === 'observados'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    Con Observaciones ({kpis.observados})
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Cuadrícula de Tarjetas de Locales (grid 2 columnas) */}
                {pestanaActiva === 'locales' && (
                    <div>
                        {localesFiltrados.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8 text-center sm:p-12">
                                <Store className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
                                <h3 className="mt-4 text-base font-bold text-slate-800">
                                    {records.length === 0
                                        ? 'Aún no tienes locales guardados en tu panel'
                                        : 'No se encontraron locales que coincidan con la búsqueda'}
                                </h3>
                                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500 sm:text-sm">
                                    {records.length === 0
                                        ? 'Al registrar un local podrás retomar tu autoevaluación y subsanar observaciones sin empezar de cero. Si ya realizaste una autoevaluación como invitado, puedes guardarla en tu panel iniciando sesión desde tu avance.'
                                        : 'Prueba modificando los filtros o el texto de búsqueda.'}
                                </p>
                                {records.length === 0 && (
                                    <div className="mt-6">
                                        <RegistrarLocalButton variant="large" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {localesFiltrados.map((record) => (
                                    <LocalCard key={record.uuid_trazabilidad} record={record} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Pestaña: Expedientes Guardados */}
                {pestanaActiva === 'trazabilidad' && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-base font-black text-slate-900">Expedientes Guardados con Respaldo Digital</h3>
                                <p className="text-sm text-slate-500">Registro seguro y protegido de tus autoevaluaciones según normativa ITSE.</p>
                            </div>
                            <span className="rounded-full bg-slate-900 px-3 py-1 font-mono text-sm font-bold text-white">
                                {expedientesSellados.length} {expedientesSellados.length === 1 ? 'Expediente' : 'Expedientes'}
                            </span>
                        </div>

                        {expedientesSellados.length === 0 ? (
                            <div className="p-8 text-center text-sm text-slate-500">
                                Aún no tienes expedientes formalmente sellados con hash SHA-256. Finaliza una autoevaluación para generar el registro
                                inmutable.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-sm font-bold text-slate-400">
                                            <th className="px-2 py-3">Establecimiento</th>
                                            <th className="px-2 py-3">UUID de Trazabilidad</th>
                                            <th className="px-2 py-3">Hash SHA-256</th>
                                            <th className="px-2 py-3">Fecha de Sellado</th>
                                            <th className="px-2 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {expedientesSellados.map((exp) => (
                                            <tr key={exp.uuid_trazabilidad} className="transition hover:bg-slate-50/60">
                                                <td className="px-2 py-3 font-bold text-slate-900">{exp.nombre_comercio}</td>
                                                <td className="px-2 py-3 font-mono text-slate-600 select-all">
                                                    {exp.uuid_trazabilidad.slice(0, 12)}...
                                                </td>
                                                <td className="px-2 py-3 font-mono font-semibold text-emerald-700 select-all">
                                                    {exp.hash_integridad?.slice(0, 16)}...
                                                </td>
                                                <td className="px-2 py-3 text-slate-500">{exp.registrada_at || exp.fecha || '-'}</td>
                                                <td className="px-2 py-3 text-right">
                                                    <Link
                                                        href={route('mis-autoevaluaciones.expediente', { uuid: exp.uuid_trazabilidad })}
                                                        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                                                    >
                                                        Ver Expediente
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. Banner Inferior de Aliados Técnicos */}
                <div className="from-ink-900 via-ink-800 relative overflow-hidden rounded-3xl border border-emerald-200/90 bg-gradient-to-r to-slate-950 p-6 text-white shadow-sm sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="max-w-2xl space-y-1.5">
                            <span className="text-sun-100 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-bold">
                                <Users className="h-3 w-3" aria-hidden="true" />
                                Red de Profesionales Verificados
                            </span>
                            <h3 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                                ¿Necesitas técnicos autorizados para tu establecimiento comercial?
                            </h3>
                            <p className="text-sm leading-relaxed text-slate-300 sm:text-sm">
                                Encuentra ingenieros colegiados, especialistas en puesta a tierra, electricistas certificados y proveedores de
                                extintores homologados en Huancayo.
                            </p>
                        </div>

                        <Link
                            href={route('directorio.index')}
                            className="text-ink-900 hover:bg-sun-50 inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-bold shadow-md transition active:scale-95"
                        >
                            <Store className="text-primary-700 h-4 w-4" aria-hidden="true" />
                            <span>Directorio de Aliados Técnicos</span>
                            <ArrowRight className="text-primary-700 h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
