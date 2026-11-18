import { claseCampo } from '@/components/form/Pregunta';
import { ESTADO_NEGOCIO, ESTADO_PAGO, fechaCorta, porcentajeCambio, soles, type EstadoRevision, type SolicitudPlanResumen } from '@/types/proveedor';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Ban,
    BellRing,
    CalendarClock,
    Check,
    CheckCircle2,
    FileText,
    LayoutDashboard,
    MapPin,
    MessageCircle,
    MessageSquareWarning,
    Package,
    Phone,
    Receipt,
    ShieldCheck,
    Store,
    TrendingDown,
    TrendingUp,
    Wallet,
    X,
} from 'lucide-react';
import { useId, useState } from 'react';

type Seccion = 'resumen' | 'pagos' | 'negocios' | 'vencimientos';

interface SolicitudAdmin {
    id: number;
    negocio: string | null;
    negocio_estado: EstadoRevision | null;
    cuenta: string | null;
    plan_actual: string;
    plan_solicitado: string;
    meses: number;
    monto_soles: number;
    metodo_pago: string;
    numero_operacion: string;
    fecha_pago: string;
    es_imagen: boolean;
    estado: SolicitudPlanResumen['estado'];
    observacion_admin: string | null;
    revisor: string | null;
    revisado_en: string | null;
    vigente_hasta: string | null;
    enviado_el: string;
}

interface NegocioAdmin {
    id: number;
    nombre_comercial: string;
    especialidad: string | null;
    cuenta: string | null;
    responsable: string | null;
    telefono: string | null;
    distrito: string | null;
    direccion: string | null;
    tiene_ubicacion: boolean;
    productos: number;
    plan: string;
    estado_revision: EstadoRevision;
    observacion_revision: string | null;
    registrado_el: string | null;
}

interface Vencimiento {
    id: number;
    negocio: string;
    responsable: string | null;
    whatsapp: string | null;
    plan: string;
    precio_mes: number;
    vence_el: string;
    dias: number;
    estado: 'vencido' | 'por_vencer' | 'vigente';
    recordatorio_enviado_el: string | null;
    puede_recordar: boolean;
}

interface Agrupado {
    etiqueta: string;
    monto: number;
    cantidad: number;
}

interface Ingresos {
    mes: number;
    mes_anterior: number;
    anio: number;
    total: number;
    esperado_30_dias: number;
    meses: Array<{ mes: string; monto: number }>;
    por_plan: Agrupado[];
    por_metodo: Agrupado[];
    ultimos: Array<{
        id: number;
        negocio: string | null;
        plan: string;
        meses: number;
        monto_soles: number;
        metodo_pago: string;
        fecha: string | null;
    }>;
}

interface AdminProps {
    seccion: Seccion;
    filtros: { pagos: string; negocios: string };
    resumen: {
        pagos_pendientes: number;
        negocios_pendientes: number;
        negocios_publicados: number;
        planes_pagados_activos: number;
        por_vencer: number;
        vencidos: number;
    };
    ingresos: Ingresos;
    solicitudes: SolicitudAdmin[];
    negocios: NegocioAdmin[];
    vencimientos: Vencimiento[];
}

const SECCIONES: ReadonlyArray<{ clave: Seccion; texto: string; Icono: typeof Store }> = [
    { clave: 'resumen', texto: 'Resumen', Icono: LayoutDashboard },
    { clave: 'pagos', texto: 'Pagos', Icono: Receipt },
    { clave: 'negocios', texto: 'Negocios', Icono: Store },
    { clave: 'vencimientos', texto: 'Vencimientos', Icono: CalendarClock },
];

const TITULOS: Record<Seccion, { titulo: string; texto: string }> = {
    resumen: { titulo: 'Resumen del negocio', texto: 'Ingresos, pendientes y lo que necesita tu atención hoy.' },
    pagos: { titulo: 'Pagos de planes', texto: 'Revisa el comprobante y activa el plan con un clic.' },
    negocios: { titulo: 'Negocios de proveedores', texto: 'Publica solo negocios reales. Puedes pedir correcciones o suspender.' },
    vencimientos: { titulo: 'Vencimientos de planes', texto: 'Recuérdales por WhatsApp antes de que venzan y no pierdas ingresos.' },
};

const FILTROS_PAGO = [
    { valor: 'pendiente', texto: 'Por revisar' },
    { valor: 'aprobada', texto: 'Aprobados' },
    { valor: 'rechazada', texto: 'Rechazados' },
    { valor: 'todos', texto: 'Todos' },
];

const FILTROS_NEGOCIO = [
    { valor: 'pendiente', texto: 'Por revisar' },
    { valor: 'aprobado', texto: 'Publicados' },
    { valor: 'observado', texto: 'Observados' },
    { valor: 'suspendido', texto: 'Suspendidos' },
    { valor: 'todos', texto: 'Todos' },
];

const ESTADO_VENCIMIENTO: Record<Vencimiento['estado'], { texto: string; clase: string }> = {
    vencido: { texto: 'Vencido', clase: 'bg-rose-100 text-rose-800' },
    por_vencer: { texto: 'Por vencer', clase: 'bg-sun-100 text-sun-700' },
    vigente: { texto: 'Vigente', clase: 'bg-emerald-100 text-emerald-800' },
};

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

const urlSeccion = (seccion: Seccion, extra: Record<string, string> = {}) => {
    const query = new URLSearchParams({ ...(seccion === 'resumen' ? {} : { seccion }), ...extra }).toString();
    return query ? `${route('admin.panel')}?${query}` : route('admin.panel');
};

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

function textoDias(dias: number): string {
    if (dias < 0) return `hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
    if (dias === 0) return 'hoy';
    return `en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

function Motivo({
    etiqueta,
    boton,
    onEnviar,
    onCancelar,
}: Readonly<{ etiqueta: string; boton: string; onEnviar: (motivo: string) => void; onCancelar: () => void }>) {
    const [motivo, setMotivo] = useState('');
    const error = (usePage().props as { errors?: Record<string, string> }).errors?.observacion;
    const id = useId();
    return (
        <div className="mt-3 space-y-2 rounded-xl bg-rose-50 p-3">
            <label htmlFor={id} className="text-base font-semibold text-rose-900">
                {etiqueta}
            </label>
            <textarea
                id={id}
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className={`${claseCampo(Boolean(error))} h-auto py-2`}
            />
            {error && <p className="text-base font-semibold text-rose-700">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onEnviar(motivo)}
                    className="min-h-11 cursor-pointer rounded-lg bg-rose-600 px-4 text-base font-bold text-white"
                >
                    {boton}
                </button>
                <button type="button" onClick={onCancelar} className="min-h-11 cursor-pointer rounded-lg px-3 text-base font-semibold text-slate-700">
                    Cancelar
                </button>
            </div>
        </div>
    );
}

function Barras({ titulo, filas }: Readonly<{ titulo: string; filas: Agrupado[] }>) {
    const maximo = Math.max(1, ...filas.map((f) => f.monto));
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
            {filas.length === 0 ? (
                <p className="mt-3 text-base text-slate-600">Sin ingresos este año.</p>
            ) : (
                <ul className="mt-4 space-y-3">
                    {filas.map((f) => (
                        <li key={f.etiqueta}>
                            <div className="flex justify-between gap-2 text-base">
                                <span className="font-semibold text-slate-800">{f.etiqueta}</span>
                                <span className="text-slate-600">
                                    <strong className="text-slate-900">{soles(f.monto)}</strong> · {f.cantidad} {f.cantidad === 1 ? 'pago' : 'pagos'}
                                </span>
                            </div>
                            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div className="bg-primary h-full rounded-full" style={{ width: `${(f.monto / maximo) * 100}%` }} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function SeccionResumen({ resumen, ingresos }: Readonly<Pick<AdminProps, 'resumen' | 'ingresos'>>) {
    const cambio = ingresos.mes_anterior > 0 ? Math.round(((ingresos.mes - ingresos.mes_anterior) / ingresos.mes_anterior) * 100) : null;
    const maximo = Math.max(1, ...ingresos.meses.map((m) => m.monto));
    const tareas = [
        {
            n: resumen.pagos_pendientes,
            texto: plural(resumen.pagos_pendientes, 'pago por revisar', 'pagos por revisar'),
            seccion: 'pagos' as Seccion,
            Icono: Receipt,
        },
        {
            n: resumen.negocios_pendientes,
            texto: plural(resumen.negocios_pendientes, 'negocio por aprobar', 'negocios por aprobar'),
            seccion: 'negocios' as Seccion,
            Icono: Store,
        },
        {
            n: resumen.por_vencer,
            texto: plural(resumen.por_vencer, 'plan vence esta semana', 'planes vencen esta semana'),
            seccion: 'vencimientos' as Seccion,
            Icono: BellRing,
        },
        {
            n: resumen.vencidos,
            texto: plural(resumen.vencidos, 'plan vencido para recuperar', 'planes vencidos para recuperar'),
            seccion: 'vencimientos' as Seccion,
            Icono: CalendarClock,
        },
    ].filter((t) => t.n > 0);

    return (
        <div className="space-y-6">
            <section aria-labelledby="tareas-titulo" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 id="tareas-titulo" className="font-display text-xl font-bold text-slate-900">
                    Por hacer hoy
                </h2>
                {tareas.length === 0 ? (
                    <p className="mt-3 flex items-center gap-2 text-lg text-emerald-800">
                        <CheckCircle2 aria-hidden="true" className="size-6" /> Todo al día. No hay nada pendiente.
                    </p>
                ) : (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {tareas.map((t) => (
                            <li key={t.texto}>
                                <Link
                                    href={urlSeccion(t.seccion)}
                                    className="border-sun-300 bg-sun-50 hover:bg-sun-100 flex min-h-14 items-center gap-3 rounded-xl border px-4 text-lg text-slate-900"
                                >
                                    <t.Icono aria-hidden="true" className="text-sun-700 size-6 shrink-0" />
                                    <span className="flex-1">
                                        <strong>{t.n}</strong> {t.texto}
                                    </span>
                                    <ArrowRight aria-hidden="true" className="size-5 text-slate-500" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="bg-ink-900 rounded-2xl p-5 text-white">
                    <p className="text-sun-300 flex items-center gap-2 text-base font-bold">
                        <Wallet aria-hidden="true" className="size-5" /> Ingresos del mes
                    </p>
                    <p className="font-display mt-2 text-4xl font-extrabold">{soles(ingresos.mes)}</p>
                    <p className="mt-1 flex items-center gap-1 text-base text-slate-300">
                        {cambio !== null && cambio >= 0 && <TrendingUp aria-hidden="true" className="size-5 text-emerald-400" />}
                        {cambio !== null && cambio < 0 && <TrendingDown aria-hidden="true" className="size-5 text-rose-300" />}
                        {cambio === null ? `Mes anterior: ${soles(ingresos.mes_anterior)}` : `${porcentajeCambio(cambio)} vs. mes anterior`}
                    </p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-base font-bold text-slate-600">Ingresos del año</p>
                    <p className="font-display mt-2 text-4xl font-extrabold text-slate-900">{soles(ingresos.anio)}</p>
                    <p className="mt-1 text-base text-slate-600">Histórico: {soles(ingresos.total)}</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-base font-bold text-slate-600">Planes pagados activos</p>
                    <p className="font-display mt-2 text-4xl font-extrabold text-slate-900">{resumen.planes_pagados_activos}</p>
                    <p className="mt-1 text-base text-slate-600">{resumen.negocios_publicados} negocios publicados</p>
                </article>
                <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-base font-bold text-emerald-800">Renovaciones en 30 días</p>
                    <p className="font-display mt-2 text-4xl font-extrabold text-slate-900">{soles(ingresos.esperado_30_dias)}</p>
                    <p className="mt-1 text-base text-slate-700">si renuevan por un mes</p>
                </article>
            </div>

            <section aria-labelledby="ingresos-titulo" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
                <h2 id="ingresos-titulo" className="font-display text-2xl font-bold text-slate-900">
                    Ingresos de los últimos 6 meses
                </h2>
                <ol className="mt-6 grid h-56 grid-cols-6 items-end gap-2 sm:gap-4">
                    {ingresos.meses.map((m) => (
                        <li key={m.mes} className="flex h-full flex-col items-center justify-end gap-1">
                            <span className="text-sm font-bold text-slate-700">{m.monto > 0 ? soles(m.monto) : '—'}</span>
                            <div className="bg-primary w-3/4 max-w-12 rounded-t-lg" style={{ height: `${Math.max(2, (m.monto / maximo) * 100)}%` }} />
                            <span className="text-base font-semibold text-slate-700 capitalize">{MESES_CORTOS[Number(m.mes.slice(5, 7)) - 1]}</span>
                        </li>
                    ))}
                </ol>
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
                <Barras titulo="Por plan (este año)" filas={ingresos.por_plan} />
                <Barras titulo="Por medio de pago (este año)" filas={ingresos.por_metodo} />
                <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h3 className="text-lg font-bold text-slate-900">Últimos ingresos</h3>
                    {ingresos.ultimos.length === 0 ? (
                        <p className="mt-3 text-base text-slate-600">Aún no hay pagos aprobados.</p>
                    ) : (
                        <ul className="mt-3 divide-y divide-slate-100">
                            {ingresos.ultimos.map((u) => (
                                <li key={u.id} className="flex items-center justify-between gap-2 py-2.5">
                                    <span className="min-w-0">
                                        <span className="block truncate text-base font-semibold text-slate-900">{u.negocio}</span>
                                        <span className="text-sm text-slate-600">
                                            {u.plan} · {u.meses} {u.meses === 1 ? 'mes' : 'meses'} · {u.metodo_pago} · {fechaCorta(u.fecha)}
                                        </span>
                                    </span>
                                    <strong className="shrink-0 text-lg text-slate-900">{soles(u.monto_soles)}</strong>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

function TarjetaPago({ s }: Readonly<{ s: SolicitudAdmin }>) {
    const [rechazando, setRechazando] = useState(false);
    const comprobante = route('admin.pagos.comprobante', { solicitud: s.id });
    const opciones = { preserveScroll: true, onSuccess: () => setRechazando(false) };
    const publicaraNegocio = s.negocio_estado === 'pendiente' || s.negocio_estado === 'observado';

    return (
        <li className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[9rem_1fr] sm:p-5">
            <a
                href={comprobante}
                target="_blank"
                rel="noreferrer"
                className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-600"
                aria-label={`Abrir comprobante de ${s.negocio ?? 'proveedor'}`}
            >
                {s.es_imagen ? (
                    <img src={comprobante} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                    <span className="flex flex-col items-center gap-1 text-base font-semibold">
                        <FileText aria-hidden="true" className="size-10" /> Ver PDF
                    </span>
                )}
            </a>
            <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-xl font-bold text-slate-900">{s.negocio}</p>
                        <p className="truncate text-base text-slate-600">{s.cuenta}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-base font-bold ${ESTADO_PAGO[s.estado].clase}`}>{ESTADO_PAGO[s.estado].texto}</span>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-lg">
                    <span className="text-slate-600">{s.plan_actual}</span>
                    <ArrowRight aria-hidden="true" className="size-4 text-slate-400" />
                    <strong className="text-slate-900">
                        {s.plan_solicitado} · {s.meses} {s.meses === 1 ? 'mes' : 'meses'}
                    </strong>
                    <span className="text-primary-700 text-2xl font-extrabold">{soles(s.monto_soles)}</span>
                </p>
                <p className="mt-1 text-base text-slate-700">
                    {s.metodo_pago} · Op. <strong className="font-mono">{s.numero_operacion}</strong> · pagado el {fechaCorta(s.fecha_pago)}
                </p>
                {s.estado === 'pendiente' && publicaraNegocio && (
                    <p className="mt-1 text-base font-semibold text-slate-700">Al aprobar el pago, el negocio también quedará publicado.</p>
                )}
                {s.estado !== 'pendiente' && (
                    <p className="mt-1 text-base text-slate-600">
                        Revisado por {s.revisor ?? '—'} el {fechaCorta(s.revisado_en)}
                        {s.vigente_hasta && ` · activo hasta el ${fechaCorta(s.vigente_hasta)}`}
                        {s.observacion_admin && ` · Motivo: ${s.observacion_admin}`}
                    </p>
                )}
                {s.estado === 'pendiente' && !rechazando && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => router.post(route('admin.pagos.aprobar', { solicitud: s.id }), {}, opciones)}
                            className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white hover:bg-emerald-700"
                        >
                            <Check aria-hidden="true" className="size-5" /> Aprobar y activar plan
                        </button>
                        <button
                            type="button"
                            onClick={() => setRechazando(true)}
                            className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-rose-300 px-5 text-base font-bold text-rose-700 hover:bg-rose-50"
                        >
                            <X aria-hidden="true" className="size-5" /> Rechazar
                        </button>
                    </div>
                )}
                {rechazando && (
                    <Motivo
                        etiqueta="¿Por qué se rechaza? El proveedor lo leerá."
                        boton="Rechazar pago"
                        onCancelar={() => setRechazando(false)}
                        onEnviar={(observacion) => router.post(route('admin.pagos.rechazar', { solicitud: s.id }), { observacion }, opciones)}
                    />
                )}
            </div>
        </li>
    );
}

function TarjetaNegocio({ n }: Readonly<{ n: NegocioAdmin }>) {
    const [accion, setAccion] = useState<'observar' | 'suspender' | null>(null);
    const revisar = (tipo: string, observacion?: string) =>
        router.post(
            route('admin.negocios.revisar', { proveedor: n.id }),
            { accion: tipo, observacion },
            { preserveScroll: true, onSuccess: () => setAccion(null) },
        );
    const estado = ESTADO_NEGOCIO[n.estado_revision];

    return (
        <li className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-xl font-bold text-slate-900">{n.nombre_comercial}</p>
                    <p className="text-base text-slate-600">
                        {n.especialidad} · Plan {n.plan} · desde {fechaCorta(n.registrado_el)}
                    </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-base font-bold ${estado.clase}`}>{estado.texto}</span>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-base text-slate-700 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                    <Store aria-hidden="true" className="size-4 text-slate-400" />
                    <dt className="sr-only">Responsable</dt>
                    <dd className="truncate">
                        {n.responsable} · {n.cuenta}
                    </dd>
                </div>
                <div className="flex items-center gap-2">
                    <Phone aria-hidden="true" className="size-4 text-slate-400" />
                    <dt className="sr-only">Teléfono</dt>
                    <dd>{n.telefono}</dd>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin aria-hidden="true" className="size-4 text-slate-400" />
                    <dt className="sr-only">Dirección</dt>
                    <dd className="truncate">
                        {[n.direccion, n.distrito].filter(Boolean).join(', ')}{' '}
                        {n.tiene_ubicacion ? '· con punto en el mapa' : '· sin punto en el mapa'}
                    </dd>
                </div>
                <div className="flex items-center gap-2">
                    <Package aria-hidden="true" className="size-4 text-slate-400" />
                    <dt className="sr-only">Productos</dt>
                    <dd>{n.productos} productos</dd>
                </div>
            </dl>
            {n.observacion_revision && (
                <p className="mt-2 rounded-lg bg-slate-50 p-2 text-base text-slate-700">
                    <strong>Última observación:</strong> {n.observacion_revision}
                </p>
            )}
            {!accion && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {n.estado_revision !== 'aprobado' && (
                        <button
                            type="button"
                            onClick={() => revisar('aprobar')}
                            className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white hover:bg-emerald-700"
                        >
                            <ShieldCheck aria-hidden="true" className="size-5" /> Aprobar y publicar
                        </button>
                    )}
                    {n.estado_revision !== 'observado' && (
                        <button
                            type="button"
                            onClick={() => setAccion('observar')}
                            className="border-sun-400 text-sun-700 hover:bg-sun-50 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-5 text-base font-bold"
                        >
                            <MessageSquareWarning aria-hidden="true" className="size-5" /> Pedir correcciones
                        </button>
                    )}
                    {n.estado_revision !== 'suspendido' && (
                        <button
                            type="button"
                            onClick={() => setAccion('suspender')}
                            className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-4 text-base font-bold text-rose-700 hover:bg-rose-50"
                        >
                            <Ban aria-hidden="true" className="size-5" /> Suspender
                        </button>
                    )}
                </div>
            )}
            {accion && (
                <Motivo
                    etiqueta={accion === 'observar' ? '¿Qué debe corregir?' : '¿Por qué se suspende?'}
                    boton={accion === 'observar' ? 'Enviar observación' : 'Suspender negocio'}
                    onCancelar={() => setAccion(null)}
                    onEnviar={(observacion) => revisar(accion, observacion)}
                />
            )}
        </li>
    );
}

function SeccionVencimientos({ vencimientos }: Readonly<{ vencimientos: Vencimiento[] }>) {
    const [filtro, setFiltro] = useState<'todos' | Vencimiento['estado']>('todos');
    const lista = filtro === 'todos' ? vencimientos : vencimientos.filter((v) => v.estado === filtro);
    const recordar = () => setTimeout(() => router.reload({ only: ['vencimientos'] }), 1500);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar vencimientos">
                {(
                    [
                        ['todos', 'Todos'],
                        ['por_vencer', 'Por vencer (7 días)'],
                        ['vencido', 'Vencidos'],
                        ['vigente', 'Vigentes'],
                    ] as const
                ).map(([valor, texto]) => (
                    <button
                        key={valor}
                        type="button"
                        aria-pressed={filtro === valor}
                        onClick={() => setFiltro(valor)}
                        className={`min-h-11 cursor-pointer rounded-full px-4 text-base font-semibold ${filtro === valor ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        {texto}
                    </button>
                ))}
            </div>
            {lista.length === 0 ? (
                <p className="rounded-2xl bg-white p-8 text-center text-lg text-slate-600">No hay planes en este estado.</p>
            ) : (
                <ul className="space-y-3">
                    {lista.map((v) => (
                        <li key={v.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xl font-bold text-slate-900">{v.negocio}</p>
                                    <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${ESTADO_VENCIMIENTO[v.estado].clase}`}>
                                        {ESTADO_VENCIMIENTO[v.estado].texto}
                                    </span>
                                </div>
                                <p className="text-base text-slate-700">
                                    Plan <strong>{v.plan}</strong> ({soles(v.precio_mes)}/mes) · {v.dias < 0 ? 'venció' : 'vence'} el{' '}
                                    {fechaCorta(v.vence_el)} <strong>({textoDias(v.dias)})</strong>
                                </p>
                                <p className="text-base text-slate-600">
                                    {v.responsable} · {v.whatsapp ?? 'sin número'}
                                    {v.recordatorio_enviado_el && ` · Recordado el ${fechaCorta(v.recordatorio_enviado_el)}`}
                                </p>
                            </div>
                            {v.puede_recordar ? (
                                <a
                                    href={route('admin.negocios.recordatorio', { proveedor: v.id })}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={recordar}
                                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white hover:bg-emerald-700"
                                >
                                    <MessageCircle aria-hidden="true" className="size-5" />
                                    {v.recordatorio_enviado_el ? 'Recordar otra vez' : 'Recordar por WhatsApp'}
                                </a>
                            ) : (
                                <span className="text-base text-slate-500">Sin WhatsApp válido</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function Filtros({
    seccion,
    actual,
    opciones,
    otros,
}: Readonly<{ seccion: 'pagos' | 'negocios'; actual: string; opciones: typeof FILTROS_PAGO; otros: AdminProps['filtros'] }>) {
    return (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            {opciones.map((f) => (
                <Link
                    key={f.valor}
                    href={urlSeccion(seccion, { ...otros, [seccion]: f.valor })}
                    preserveScroll
                    aria-current={actual === f.valor ? 'true' : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full px-4 text-base font-semibold ${actual === f.valor ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                    {f.texto}
                </Link>
            ))}
        </div>
    );
}

export default function AdminPanel({ seccion, filtros, resumen, ingresos, solicitudes, negocios, vencimientos }: Readonly<AdminProps>) {
    const { flash } = usePage().props as { flash?: { success?: string | null } };
    const contador: Record<Seccion, number> = {
        resumen: 0,
        pagos: resumen.pagos_pendientes,
        negocios: resumen.negocios_pendientes,
        vencimientos: resumen.por_vencer + resumen.vencidos,
    };

    return (
        <>
            <Head title={`${TITULOS[seccion].titulo} - Administración CheckITSE`} />
            <div className="space-y-6">
                <header className="bg-ink-900 trama-andina relative overflow-hidden rounded-3xl p-6 pb-[calc(1.5rem+18px)] text-white sm:p-8">
                    <div aria-hidden="true" className="franja-andina absolute inset-x-0 bottom-0" />
                    <p className="text-sun-300 inline-flex items-center gap-2 text-base font-bold">
                        <ShieldCheck aria-hidden="true" className="size-5" /> Administración
                    </p>
                    <h1 className="font-display mt-1 text-3xl font-extrabold sm:text-4xl">{TITULOS[seccion].titulo}</h1>
                    <p className="mt-2 text-lg text-slate-300">{TITULOS[seccion].texto}</p>
                </header>

                <nav aria-label="Secciones de administración" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:hidden">
                    {SECCIONES.map(({ clave, texto, Icono }) => (
                        <Link
                            key={clave}
                            href={urlSeccion(clave)}
                            aria-current={seccion === clave ? 'page' : undefined}
                            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-base font-bold ${
                                seccion === clave ? 'bg-ink-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
                            }`}
                        >
                            <Icono aria-hidden="true" className="size-5" /> {texto}
                            {contador[clave] > 0 && <span className="bg-sun-400 text-ink-900 rounded-full px-2 text-sm">{contador[clave]}</span>}
                        </Link>
                    ))}
                </nav>

                {flash?.success && (
                    <p
                        role="status"
                        className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-lg font-semibold text-emerald-800"
                    >
                        <CheckCircle2 aria-hidden="true" className="size-6 shrink-0" /> {flash.success}
                    </p>
                )}

                {seccion === 'resumen' && <SeccionResumen resumen={resumen} ingresos={ingresos} />}

                {seccion === 'pagos' && (
                    <section aria-label="Pagos" className="space-y-4">
                        <Filtros seccion="pagos" actual={filtros.pagos} opciones={FILTROS_PAGO} otros={filtros} />
                        {solicitudes.length === 0 ? (
                            <p className="rounded-2xl bg-white p-8 text-center text-lg text-slate-600">No hay pagos en este estado.</p>
                        ) : (
                            <ul className="space-y-3">
                                {solicitudes.map((s) => (
                                    <TarjetaPago key={s.id} s={s} />
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {seccion === 'negocios' && (
                    <section aria-label="Negocios" className="space-y-4">
                        <Filtros seccion="negocios" actual={filtros.negocios} opciones={FILTROS_NEGOCIO} otros={filtros} />
                        {negocios.length === 0 ? (
                            <p className="rounded-2xl bg-white p-8 text-center text-lg text-slate-600">No hay negocios en este estado.</p>
                        ) : (
                            <ul className="grid gap-3 lg:grid-cols-2">
                                {negocios.map((n) => (
                                    <TarjetaNegocio key={n.id} n={n} />
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {seccion === 'vencimientos' && <SeccionVencimientos vencimientos={vencimientos} />}
            </div>
        </>
    );
}
