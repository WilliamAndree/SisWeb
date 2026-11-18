import { CuentaProveedor } from '@/components/proveedor/CuentaProveedor';
import { ESTADO_NEGOCIO, fechaCorta, soles, type PerfilResumen, type PlanProveedor, type SolicitudPlanResumen } from '@/types/proveedor';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Circle, Crown, Hourglass, Package, ShieldAlert, Store } from 'lucide-react';

interface InicioProps {
    perfil: PerfilResumen | null;
    conteo: { productos: number; activos: number; limite: number | null };
    pasos: Array<{ clave: string; texto: string; hecho: boolean }>;
    solicitudPendiente: SolicitudPlanResumen | null;
    planes: PlanProveedor[];
}

const DESTINO_PASO: Record<string, string> = {
    perfil: 'proveedor.perfil.editar',
    ubicacion: 'proveedor.perfil.editar',
    producto: 'proveedor.productos',
};

export default function InicioProveedor({ perfil, conteo, pasos, solicitudPendiente, planes }: Readonly<InicioProps>) {
    const estado = perfil ? ESTADO_NEGOCIO[perfil.estado_revision] : null;
    const hechos = pasos.filter((p) => p.hecho).length;
    const siguientePlan = planes.find((p) => p.destacado && p.id !== perfil?.plan);
    const usoCatalogo = conteo.limite ? Math.min(100, Math.round((conteo.productos / conteo.limite) * 100)) : null;

    return (
        <>
            <Head title="Mi cuenta de proveedor - CheckITSE" />
            <CuentaProveedor
                perfil={perfil}
                seccion="inicio"
                titulo={perfil ? 'Resumen de tu negocio' : '¡Bienvenido! Publica tu negocio'}
                descripcion={
                    perfil
                        ? 'Todo lo importante de un vistazo: tu estado, tus productos y tu plan.'
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

                <div className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="flex items-center gap-2 text-base font-bold text-slate-600">
                            <Store aria-hidden="true" className="text-primary-700 size-5" /> Mi negocio
                        </p>
                        <p className="mt-2 text-2xl font-extrabold text-slate-900">{estado?.texto ?? 'Sin publicar'}</p>
                        <p className="mt-1 text-base text-slate-600">
                            {perfil?.publicado ? 'Los clientes ya te ven.' : 'Aún no te ven los clientes.'}
                        </p>
                    </article>
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
                            {perfil?.plan_vence_el ? `Vigente hasta el ${fechaCorta(perfil.plan_vence_el)}` : 'Gratis, sin fecha de vencimiento'}
                        </p>
                    </article>
                </div>

                {solicitudPendiente && (
                    <p className="border-sun-300 bg-sun-50 flex flex-wrap items-center gap-2 rounded-2xl border p-5 text-lg text-slate-900">
                        <Hourglass aria-hidden="true" className="text-sun-700 size-6 shrink-0" />
                        Tu pago de <strong>{soles(solicitudPendiente.monto_soles)}</strong> para el plan{' '}
                        <strong>{solicitudPendiente.plan_nombre}</strong> está en revisión.
                    </p>
                )}

                <section aria-labelledby="pasos-titulo" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 id="pasos-titulo" className="font-display text-2xl font-bold text-slate-900">
                            Para vender más
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
                                    <span className={`flex-1 text-lg ${paso.hecho ? 'text-slate-600 line-through' : 'font-semibold text-slate-900'}`}>
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
