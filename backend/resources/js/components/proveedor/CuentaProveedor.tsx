import { ESTADO_NEGOCIO, fechaCorta, type PerfilResumen } from '@/types/proveedor';
import { Link, usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Crown, Eye, LayoutDashboard, Package, Store } from 'lucide-react';
import type { ReactNode } from 'react';

export type SeccionProveedor = 'inicio' | 'productos' | 'perfil' | 'plan';

const SECCIONES: ReadonlyArray<{ clave: SeccionProveedor; texto: string; ruta: string; Icono: typeof Store }> = [
    { clave: 'inicio', texto: 'Resumen', ruta: 'proveedor.panel', Icono: LayoutDashboard },
    { clave: 'productos', texto: 'Mis productos', ruta: 'proveedor.productos', Icono: Package },
    { clave: 'perfil', texto: 'Mi negocio', ruta: 'proveedor.perfil.editar', Icono: Store },
    { clave: 'plan', texto: 'Mi plan', ruta: 'proveedor.plan', Icono: Crown },
];

interface CuentaProveedorProps {
    readonly perfil: PerfilResumen | null;
    readonly seccion: SeccionProveedor;
    readonly titulo: string;
    readonly descripcion?: string;
    readonly children: ReactNode;
}

/**
 * Marco común de la cuenta de proveedor: encabezado con el estado del negocio
 * y el plan, pestañas de sus cuatro secciones y mensajes de confirmación.
 */
export function CuentaProveedor({ perfil, seccion, titulo, descripcion, children }: CuentaProveedorProps) {
    const { flash, errors } = usePage().props as { flash?: { success?: string | null }; errors?: Record<string, string> };
    const estado = perfil ? ESTADO_NEGOCIO[perfil.estado_revision] : null;

    return (
        <div className="space-y-6">
            <header className="bg-ink-900 trama-andina relative overflow-hidden rounded-3xl pb-[18px] text-white">
                <div aria-hidden="true" className="franja-andina absolute inset-x-0 bottom-0" />
                <div className="flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
                    <div className="min-w-0">
                        <p className="text-sun-300 inline-flex items-center gap-2 text-base font-bold">
                            <Store aria-hidden="true" className="size-5" /> {perfil?.nombre_comercial ?? 'Cuenta de proveedor'}
                        </p>
                        <h1 className="font-display mt-1 text-3xl font-extrabold sm:text-4xl">{titulo}</h1>
                        {descripcion && <p className="mt-2 max-w-2xl text-lg text-slate-300">{descripcion}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {estado && <span className={`rounded-full px-4 py-1.5 text-base font-bold ${estado.clase}`}>{estado.texto}</span>}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-base font-bold">
                            <Crown aria-hidden="true" className="text-sun-300 size-4" /> Plan {perfil?.plan_nombre ?? 'Básico'}
                            {perfil?.plan_vence_el && <span className="font-medium text-slate-300">· hasta {fechaCorta(perfil.plan_vence_el)}</span>}
                        </span>
                    </div>
                </div>
            </header>

            <nav aria-label="Secciones de mi cuenta" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {SECCIONES.map(({ clave, texto, ruta, Icono }) => {
                    const activa = clave === seccion;
                    return (
                        <Link
                            key={clave}
                            href={route(ruta)}
                            aria-current={activa ? 'page' : undefined}
                            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-base font-bold transition sm:px-5 ${
                                activa ? 'bg-ink-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                            }`}
                        >
                            <Icono aria-hidden="true" className="size-5" /> {texto}
                        </Link>
                    );
                })}
                {perfil?.publicado && (
                    <Link
                        href={route('directorio.index')}
                        className="text-primary-700 col-span-2 inline-flex min-h-12 items-center justify-center gap-2 px-3 text-base font-semibold underline underline-offset-2"
                    >
                        <Eye aria-hidden="true" className="size-5" /> Ver cómo me ven
                    </Link>
                )}
            </nav>

            {flash?.success && (
                <p
                    role="status"
                    className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-lg font-semibold text-emerald-800"
                >
                    <CheckCircle2 aria-hidden="true" className="size-6 shrink-0" /> {flash.success}
                </p>
            )}
            {errors?.limite && (
                <p
                    role="alert"
                    className="border-sun-300 bg-sun-50 flex flex-wrap items-center gap-2 rounded-xl border p-4 text-lg font-semibold text-slate-900"
                >
                    <AlertTriangle aria-hidden="true" className="text-sun-700 size-6 shrink-0" /> {errors.limite}
                    <Link href={route('proveedor.plan')} className="text-primary-700 underline underline-offset-2">
                        Ver planes
                    </Link>
                </p>
            )}

            {children}
        </div>
    );
}
