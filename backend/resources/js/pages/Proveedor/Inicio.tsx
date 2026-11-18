import { CuentaProveedor } from '@/components/proveedor/CuentaProveedor';
import { ESTADO_NEGOCIO, fechaCorta, soles, type PerfilResumen, type PlanProveedor, type SolicitudPlanResumen } from '@/types/proveedor';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarClock,
    CheckCircle2,
    Circle,
    Crown,
    Eye,
    Hourglass,
    MapPin,
    MessageCircle,
    Package,
    ShieldAlert,
    Wallet,
} from 'lucide-react';

interface Estadisticas {
    ultimos_30_dias: { apariciones: number; contactos: number; mapa: number; elecciones: number };
    ventas_mes: { monto: number; cantidad: number };
    meses: Array<{ mes: string; apariciones: number; contactos: number; ventas: number }>;
    top_productos: Array<{ oferta_id: number; nombre: string; apariciones: number; contactos: number; elecciones: number }>;
}

interface InicioProps {
    perfil: PerfilResumen | null;
    conteo: { productos: number; activos: number; limite: number | null };
    pasos: Array<{ clave: string; texto: string; hecho: boolean }>;
    solicitudPendiente: SolicitudPlanResumen | null;
    planes: PlanProveedor[];
    estadisticas: Estadisticas | null;
}

const DESTINO_PASO: Record<string, string> = {
    perfil: 'proveedor.perfil.editar',
    ubicacion: 'proveedor.perfil.editar',
    producto: 'proveedor.productos',
};

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const nombreMes = (aaaamm: string) => MESES_CORTOS[Number(aaaamm.slice(5, 7)) - 1] ?? aaaamm;

const diasHasta = (iso: string) => Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date().setHours(12, 0, 0, 0)) / 86_400_000);

function Indicador({ titulo, valor, detalle, Icono }: Readonly<{ titulo: string; valor: string; detalle: string; Icono: typeof Eye }>) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="flex items-center gap-2 text-base font-bold text-slate-600">
                <Icono aria-hidden="true" className="text-primary-700 size-5" /> {titulo}
            </p>
            <p className="font-display mt-2 text-4xl font-extrabold text-slate-900">{valor}</p>
            <p className="mt-1 text-base text-slate-600">{detalle}</p>
        </article>
    );
}

function GraficoMeses({ meses }: Readonly<{ meses: Estadisticas['meses'] }>) {
    const maximo = Math.max(1, ...meses.map((m) => m.apariciones));
    return (
        <section aria-labelledby="grafico-titulo" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="grafico-titulo" className="font-display text-2xl font-bold text-slate-900">
                    Cómo vas mes a mes
                </h2>
                <p className="flex flex-wrap gap-4 text-base text-slate-600">
                    <span className="inline-flex items-center gap-2">
                        <span aria-hidden="true" className="bg-ink-900 size-3 rounded-sm" /> Veces que te vieron
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span aria-hidden="true" className="size-3 rounded-sm bg-emerald-500" /> Contactos
                    </span>
                </p>
            </div>
            <ol className="mt-6 grid h-56 grid-cols-6 items-end gap-2 sm:gap-4">
                {meses.map((m) => (
                    <li key={m.mes} className="flex h-full flex-col items-center justify-end gap-1">
                        <span className="text-sm font-bold text-slate-700">{m.apariciones}</span>
                        <div className="flex h-full w-full items-end justify-center gap-1">
                            <div
                                className="bg-ink-900 w-1/2 max-w-8 rounded-t-md"
                                style={{ height: `${Math.max(3, (m.apariciones / maximo) * 100)}%` }}
                            />
                            <div
                                className="w-1/3 max-w-6 rounded-t-md bg-emerald-500"
                                style={{ height: `${Math.max(3, (m.contactos / maximo) * 100)}%` }}
                            />
                        </div>
                        <span className="text-base font-semibold text-slate-700 capitalize">{nombreMes(m.mes)}</span>
                        <span className="text-sm text-slate-500">{m.ventas > 0 ? soles(m.ventas) : '—'}</span>
                    </li>
                ))}
            </ol>
            <p className="mt-3 text-base text-slate-500">Debajo de cada mes: lo que registraste como vendido.</p>
        </section>
    );
}

export default function InicioProveedor({ perfil, conteo, pasos, solicitudPendiente, planes, estadisticas }: Readonly<InicioProps>) {
    const estado = perfil ? ESTADO_NEGOCIO[perfil.estado_revision] : null;
    const hechos = pasos.filter((p) => p.hecho).length;
    const todoListo = hechos === pasos.length;
    const siguientePlan = planes.find((p) => p.destacado && p.id !== perfil?.plan);
    const usoCatalogo = conteo.limite ? Math.min(100, Math.round((conteo.productos / conteo.limite) * 100)) : null;
    const diasPlan = perfil?.plan_vence_el ? diasHasta(perfil.plan_vence_el) : null;
    const ultimos = estadisticas?.ultimos_30_dias;
    const conversion = ultimos && ultimos.apariciones > 0 ? Math.round((ultimos.contactos / ultimos.apariciones) * 100) : 0;

    return (
        <>
            <Head title="Mi cuenta de proveedor - CheckITSE" />
            <CuentaProveedor
                perfil={perfil}
                seccion="inicio"
                titulo={perfil ? 'Así va tu negocio' : '¡Bienvenido! Publica tu negocio'}
                descripcion={
                    perfil
                        ? 'Cuántos clientes te ven, cuántos te escriben y cuánto vendes, en un solo lugar.'
                        : 'En 3 pasos tus productos aparecen a los emprendedores que los necesitan.'
                }
            >
                {perfil && estado && perfil.estado_revision !== 'aprobado' && (
                    <section
                        aria-label="Estado de tu negocio"
                        className={`flex gap-4 rounded-2xl border p-5 ${perfil.estado_revision === 'pendiente' ? 'border-sun-300 bg-sun-50' : 'border-rose-200 bg-rose-50'}`}
                    >
                        {perfil.estado_revision === 'pendiente' ? (
                            <Hourglass aria-hidden="true" className="text-sun-700 size-7 shrink-0" />
                        ) : (
                            <ShieldAlert aria-hidden="true" className="size-7 shrink-0 text-rose-700" />
                        )}
                        <div>
                            <p className="text-xl font-bold text-slate-900">{estado.texto}</p>
                            <p className="mt-1 text-lg text-slate-700">{estado.explicacion}</p>
                            {perfil.observacion_revision && (
                                <p className="mt-3 rounded-xl bg-white p-3 text-lg text-slate-900">
                                    <strong>Observación:</strong> {perfil.observacion_revision}
                                </p>
                            )}
                        </div>
                    </section>
                )}

                {diasPlan !== null && diasPlan <= 7 && (
                    <section className="border-primary-200 bg-primary-50 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
                        <p className="flex items-center gap-3 text-lg text-slate-900">
                            <CalendarClock aria-hidden="true" className="text-primary-700 size-7 shrink-0" />
                            {diasPlan < 0 ? (
                                <span>
                                    Tu plan <strong>{perfil?.plan_nombre}</strong> venció.
                                </span>
                            ) : (
                                <span>
                                    Tu plan <strong>{perfil?.plan_nombre}</strong> vence en{' '}
                                    <strong>{diasPlan === 0 ? 'hoy' : `${diasPlan} días`}</strong>. Renuévalo para seguir apareciendo primero.
                                </span>
                            )}
                        </p>
                        <Link
                            href={route('proveedor.plan')}
                            className="bg-primary inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-lg font-bold text-white"
                        >
                            Renovar ahora <ArrowRight aria-hidden="true" className="size-5" />
                        </Link>
                    </section>
                )}

                {solicitudPendiente && (
                    <p className="border-sun-300 bg-sun-50 flex flex-wrap items-center gap-2 rounded-2xl border p-5 text-lg text-slate-900">
                        <Hourglass aria-hidden="true" className="text-sun-700 size-6 shrink-0" />
                        Tu pago de <strong>{soles(solicitudPendiente.monto_soles)}</strong> para el plan{' '}
                        <strong>{solicitudPendiente.plan_nombre}</strong> está en revisión.
                    </p>
                )}

                {!todoListo && (
                    <section aria-labelledby="pasos-titulo" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 id="pasos-titulo" className="font-display text-2xl font-bold text-slate-900">
                                Para empezar a vender
                            </h2>
                            <p className="text-lg font-semibold text-slate-600">
                                {hechos} de {pasos.length} listos
                            </p>
                        </div>
                        <ol className="mt-5 space-y-3">
                            {pasos.map((paso) => {
                                const destino = DESTINO_PASO[paso.clave];
                                return (
                                    <li
                                        key={paso.clave}
                                        className={`flex flex-wrap items-center gap-3 rounded-xl p-4 ${paso.hecho ? 'bg-emerald-50' : 'bg-slate-50'}`}
                                    >
                                        {paso.hecho ? (
                                            <CheckCircle2 aria-hidden="true" className="size-6 shrink-0 text-emerald-700" />
                                        ) : (
                                            <Circle aria-hidden="true" className="size-6 shrink-0 text-slate-400" />
                                        )}
                                        <span
                                            className={`flex-1 text-lg ${paso.hecho ? 'text-slate-600 line-through' : 'font-semibold text-slate-900'}`}
                                        >
                                            {paso.texto}
                                        </span>
                                        {!paso.hecho && destino && (
                                            <Link
                                                href={route(destino)}
                                                className="text-primary-700 inline-flex min-h-11 items-center gap-1 text-base font-bold underline underline-offset-2"
                                            >
                                                Hacerlo ahora <ArrowRight aria-hidden="true" className="size-4" />
                                            </Link>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </section>
                )}

                {estadisticas && ultimos && (
                    <>
                        <h2 className="font-display text-2xl font-bold text-slate-900">Últimos 30 días</h2>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <Indicador
                                titulo="Te vieron"
                                valor={String(ultimos.apariciones)}
                                detalle="veces aparecieron tus productos o tu ficha"
                                Icono={Eye}
                            />
                            <Indicador
                                titulo="Te escribieron"
                                valor={String(ultimos.contactos)}
                                detalle={`por WhatsApp · ${conversion}% de los que te vieron`}
                                Icono={MessageCircle}
                            />
                            <Indicador
                                titulo="Vieron tu ubicación"
                                valor={String(ultimos.mapa)}
                                detalle="abrieron tu mapa para llegar a tu local"
                                Icono={MapPin}
                            />
                            <Indicador
                                titulo="Vendiste este mes"
                                valor={soles(estadisticas.ventas_mes.monto)}
                                detalle={`${estadisticas.ventas_mes.cantidad} ventas registradas`}
                                Icono={Wallet}
                            />
                        </div>

                        <GraficoMeses meses={estadisticas.meses} />

                        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                            <section aria-labelledby="top-titulo" className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
                                <h2 id="top-titulo" className="font-display text-2xl font-bold text-slate-900">
                                    Tus productos con más interés
                                </h2>
                                {estadisticas.top_productos.length === 0 ? (
                                    <p className="mt-3 text-lg text-slate-600">
                                        Aún no hay datos. Apenas los clientes vean tus productos, aparecerán aquí.
                                    </p>
                                ) : (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full min-w-[22rem] text-left text-lg">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-base text-slate-500">
                                                    <th scope="col" className="py-2 pr-2 font-semibold">
                                                        Producto
                                                    </th>
                                                    <th scope="col" className="px-2 py-2 text-center font-semibold">
                                                        Vistas
                                                    </th>
                                                    <th scope="col" className="px-2 py-2 text-center font-semibold">
                                                        Contactos
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {estadisticas.top_productos.map((p) => (
                                                    <tr key={p.oferta_id} className="border-b border-slate-100 last:border-0">
                                                        <th scope="row" className="py-3 pr-2 font-semibold text-slate-900">
                                                            {p.nombre}
                                                        </th>
                                                        <td className="px-2 py-3 text-center">{p.apariciones}</td>
                                                        <td className="px-2 py-3 text-center font-bold text-emerald-700">{p.contactos}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>

                            <div className="grid gap-4">
                                <article className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <p className="flex items-center gap-2 text-base font-bold text-slate-600">
                                        <Package aria-hidden="true" className="text-primary-700 size-5" /> Productos publicados
                                    </p>
                                    <p className="mt-2 text-2xl font-extrabold text-slate-900">
                                        {conteo.productos}
                                        <span className="text-lg font-semibold text-slate-500"> / {conteo.limite ?? 'ilimitados'}</span>
                                    </p>
                                    {usoCatalogo !== null && (
                                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={`h-full rounded-full ${usoCatalogo >= 100 ? 'bg-rose-500' : 'bg-primary'}`}
                                                style={{ width: `${usoCatalogo}%` }}
                                            />
                                        </div>
                                    )}
                                    <p className="mt-2 text-base text-slate-600">{conteo.activos} visibles para los clientes</p>
                                </article>
                                <article className="bg-ink-900 rounded-2xl p-5 text-white">
                                    <p className="text-sun-300 flex items-center gap-2 text-base font-bold">
                                        <Crown aria-hidden="true" className="size-5" /> Mi plan
                                    </p>
                                    <p className="mt-2 text-2xl font-extrabold">{perfil?.plan_nombre ?? 'Básico'}</p>
                                    <p className="mt-1 text-base text-slate-300">
                                        {perfil?.plan_vence_el
                                            ? `Vigente hasta el ${fechaCorta(perfil.plan_vence_el)}`
                                            : 'Gratis, sin fecha de vencimiento'}
                                    </p>
                                    <Link
                                        href={route('proveedor.ventas')}
                                        className="text-sun-300 mt-3 inline-flex min-h-11 items-center gap-1 text-base font-bold underline"
                                    >
                                        Registrar una venta <ArrowRight aria-hidden="true" className="size-4" />
                                    </Link>
                                </article>
                            </div>
                        </div>
                    </>
                )}

                {siguientePlan && perfil?.plan === 'basico' && (
                    <section className="border-sun-300 from-sun-50 flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-gradient-to-r to-white p-6 sm:p-8">
                        <div>
                            <p className="text-sun-700 text-base font-bold">{siguientePlan.etiqueta}</p>
                            <h2 className="font-display mt-1 text-2xl font-bold text-slate-900">
                                Aparece antes que tu competencia desde {soles(siguientePlan.precio)} al mes
                            </h2>
                            <p className="mt-1 text-lg text-slate-700">{siguientePlan.beneficios.slice(1, 3).join(' · ')}</p>
                        </div>
                        <Link
                            href={route('proveedor.plan')}
                            className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-13 items-center gap-2 rounded-xl px-6 text-lg font-bold text-white"
                        >
                            Ver planes <ArrowRight aria-hidden="true" className="size-5" />
                        </Link>
                    </section>
                )}
            </CuentaProveedor>
        </>
    );
}
