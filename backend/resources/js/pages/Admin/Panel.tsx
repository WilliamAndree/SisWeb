import { claseCampo } from '@/components/form/Pregunta';
import { ESTADO_NEGOCIO, ESTADO_PAGO, fechaCorta, soles, type EstadoRevision, type SolicitudPlanResumen } from '@/types/proveedor';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Ban,
    Check,
    CheckCircle2,
    FileText,
    MapPin,
    MessageSquareWarning,
    Package,
    Phone,
    Receipt,
    ShieldCheck,
    Store,
    Wallet,
    X,
} from 'lucide-react';
import { useId, useState } from 'react';

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

interface AdminProps {
    resumen: { pagos_pendientes: number; negocios_pendientes: number; ingresos_mes: number; planes_pagados_activos: number };
    filtros: { pagos: string; negocios: string };
    solicitudes: SolicitudAdmin[];
    negocios: NegocioAdmin[];
}

type Seccion = 'pagos' | 'negocios';

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

function TarjetaPago({ s }: Readonly<{ s: SolicitudAdmin }>) {
    const [rechazando, setRechazando] = useState(false);
    const comprobante = route('admin.pagos.comprobante', { solicitud: s.id });
    const opciones = { preserveScroll: true, onSuccess: () => setRechazando(false) };

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
                {s.negocio_estado && s.negocio_estado !== 'aprobado' && (
                    <p className="text-sun-700 mt-1 text-base font-semibold">Ojo: el negocio está "{ESTADO_NEGOCIO[s.negocio_estado].texto}".</p>
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

export default function AdminPanel({ resumen, filtros, solicitudes, negocios }: Readonly<AdminProps>) {
    const { flash } = usePage().props as { flash?: { success?: string | null } };
    const [seccion, setSeccion] = useState<Seccion>(resumen.pagos_pendientes === 0 && resumen.negocios_pendientes > 0 ? 'negocios' : 'pagos');
    const filtrar = (clave: Seccion, valor: string) =>
        router.get(route('admin.panel'), { ...filtros, [clave]: valor }, { preserveState: true, preserveScroll: true, replace: true });

    const tarjetas = [
        { texto: 'Pagos por revisar', valor: String(resumen.pagos_pendientes), Icono: Receipt, alerta: resumen.pagos_pendientes > 0 },
        { texto: 'Negocios por revisar', valor: String(resumen.negocios_pendientes), Icono: Store, alerta: resumen.negocios_pendientes > 0 },
        { texto: 'Ingresos del mes', valor: soles(resumen.ingresos_mes), Icono: Wallet, alerta: false },
        { texto: 'Planes pagados activos', valor: String(resumen.planes_pagados_activos), Icono: CheckCircle2, alerta: false },
    ];

    const filtrosActivos = seccion === 'pagos' ? FILTROS_PAGO : FILTROS_NEGOCIO;

    return (
        <>
            <Head title="Administración - CheckITSE" />
            <div className="space-y-6">
                <header className="bg-ink-900 trama-andina relative overflow-hidden rounded-3xl p-6 pb-[calc(1.5rem+18px)] text-white sm:p-8">
                    <div aria-hidden="true" className="franja-andina absolute inset-x-0 bottom-0" />
                    <p className="text-sun-300 inline-flex items-center gap-2 text-base font-bold">
                        <ShieldCheck aria-hidden="true" className="size-5" /> Administración
                    </p>
                    <h1 className="font-display mt-1 text-3xl font-extrabold sm:text-4xl">Revisión de pagos y negocios</h1>
                    <p className="mt-2 text-lg text-slate-300">Aprueba comprobantes para activar planes y publica solo negocios reales.</p>
                </header>

                {flash?.success && (
                    <p
                        role="status"
                        className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-lg font-semibold text-emerald-800"
                    >
                        <CheckCircle2 aria-hidden="true" className="size-6 shrink-0" /> {flash.success}
                    </p>
                )}

                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {tarjetas.map(({ texto, valor, Icono, alerta }) => (
                        <div key={texto} className={`rounded-2xl border p-4 ${alerta ? 'border-sun-300 bg-sun-50' : 'border-slate-200 bg-white'}`}>
                            <dt className="flex items-center gap-2 text-base font-semibold text-slate-600">
                                <Icono aria-hidden="true" className="text-primary-700 size-5" /> {texto}
                            </dt>
                            <dd className="mt-1 text-3xl font-extrabold text-slate-900">{valor}</dd>
                        </div>
                    ))}
                </dl>

                <div role="tablist" aria-label="Qué revisar" className="flex flex-wrap gap-2">
                    {(
                        [
                            ['pagos', `Pagos (${resumen.pagos_pendientes})`],
                            ['negocios', `Negocios (${resumen.negocios_pendientes})`],
                        ] as const
                    ).map(([clave, texto]) => (
                        <button
                            key={clave}
                            type="button"
                            role="tab"
                            aria-selected={seccion === clave}
                            onClick={() => setSeccion(clave)}
                            className={`min-h-12 cursor-pointer rounded-full px-5 text-lg font-bold ${seccion === clave ? 'bg-ink-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
                        >
                            {texto}
                        </button>
                    ))}
                </div>

                <section role="tabpanel" aria-label={seccion === 'pagos' ? 'Pagos' : 'Negocios'} className="space-y-4">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
                        {filtrosActivos.map((f) => (
                            <button
                                key={f.valor}
                                type="button"
                                aria-pressed={filtros[seccion] === f.valor}
                                onClick={() => filtrar(seccion, f.valor)}
                                className={`min-h-11 cursor-pointer rounded-full px-4 text-base font-semibold ${
                                    filtros[seccion] === f.valor ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {f.texto}
                            </button>
                        ))}
                    </div>

                    {seccion === 'pagos' &&
                        (solicitudes.length === 0 ? (
                            <p className="rounded-2xl bg-white p-8 text-center text-lg text-slate-600">No hay pagos en este estado.</p>
                        ) : (
                            <ul className="space-y-3">
                                {solicitudes.map((s) => (
                                    <TarjetaPago key={s.id} s={s} />
                                ))}
                            </ul>
                        ))}

                    {seccion === 'negocios' &&
                        (negocios.length === 0 ? (
                            <p className="rounded-2xl bg-white p-8 text-center text-lg text-slate-600">No hay negocios en este estado.</p>
                        ) : (
                            <ul className="grid gap-3 lg:grid-cols-2">
                                {negocios.map((n) => (
                                    <TarjetaNegocio key={n.id} n={n} />
                                ))}
                            </ul>
                        ))}
                </section>
            </div>
        </>
    );
}
