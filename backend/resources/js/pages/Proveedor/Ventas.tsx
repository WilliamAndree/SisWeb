import { Pregunta, ResumenErrores, ariaDe, claseCampo } from '@/components/form/Pregunta';
import { CuentaProveedor } from '@/components/proveedor/CuentaProveedor';
import { fechaCorta, porcentajeCambio, soles, type PerfilResumen } from '@/types/proveedor';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Plus, Save, Trash2, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

interface Venta {
    id: number;
    descripcion: string;
    producto: string | null;
    cantidad: number;
    monto_soles: number;
    fecha: string;
    cliente: string | null;
}

interface VentasProps {
    perfil: PerfilResumen | null;
    ventas: Venta[];
    totales: { mes: number; mes_anterior: number; ventas_mes: number; historico: number };
    productos: Array<{ id: number; nombre: string; precio_soles: number; stock: number | null }>;
}

type FormVenta = {
    oferta_id: string;
    descripcion: string;
    cantidad: string;
    monto_soles: string;
    fecha: string;
    cliente: string;
    descontar_stock: boolean;
};

const ETIQUETAS: Record<string, string> = {
    descripcion: 'Qué vendiste',
    cantidad: 'Cantidad',
    monto_soles: 'Monto',
    fecha: 'Fecha',
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const hoy = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function FormularioVenta({ productos, onCerrar }: Readonly<{ productos: VentasProps['productos']; onCerrar: () => void }>) {
    const { data, setData, post, processing, errors } = useForm<FormVenta>({
        oferta_id: '',
        descripcion: '',
        cantidad: '1',
        monto_soles: '',
        fecha: hoy(),
        cliente: '',
        descontar_stock: true,
    });
    const producto = productos.find((p) => String(p.id) === data.oferta_id);

    const elegirProducto = (id: string) => {
        const elegido = productos.find((p) => String(p.id) === id);
        setData((d) => ({ ...d, oferta_id: id, monto_soles: elegido ? String(elegido.precio_soles * Number(d.cantidad || 1)) : d.monto_soles }));
    };

    const cambiarCantidad = (cantidad: string) => {
        setData((d) => ({ ...d, cantidad, monto_soles: producto ? String(producto.precio_soles * Number(cantidad || 1)) : d.monto_soles }));
    };

    const guardar = (e: FormEvent) => {
        e.preventDefault();
        post(route('proveedor.ventas.store'), { preserveScroll: true, onSuccess: onCerrar });
    };

    return (
        <form onSubmit={guardar} noValidate className="border-primary-200 space-y-6 rounded-3xl border-2 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl font-bold text-slate-900">Registrar una venta</h2>
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar formulario"
                    className="flex size-11 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                >
                    <X aria-hidden="true" className="size-6" />
                </button>
            </div>
            <ResumenErrores errores={errors} etiquetas={ETIQUETAS} />

            <div className="grid gap-6 sm:grid-cols-2">
                <Pregunta
                    id="oferta_id"
                    numero={1}
                    etiqueta="Producto"
                    opcional
                    ayuda="Si lo eliges, calculamos el monto y descontamos las unidades."
                >
                    <select
                        id="oferta_id"
                        value={data.oferta_id}
                        onChange={(e) => elegirProducto(e.target.value)}
                        className={`${claseCampo()} cursor-pointer`}
                        {...ariaDe('oferta_id', { ayuda: true })}
                    >
                        <option value="">Otro (lo escribo)</option>
                        {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.nombre} · {soles(p.precio_soles)}
                            </option>
                        ))}
                    </select>
                </Pregunta>
                <Pregunta id="descripcion" numero={2} etiqueta="Qué vendiste" opcional={Boolean(data.oferta_id)} error={errors.descripcion}>
                    <input
                        id="descripcion"
                        type="text"
                        value={data.descripcion}
                        onChange={(e) => setData('descripcion', e.target.value)}
                        placeholder={producto?.nombre ?? 'Ej. Instalación de 2 luces de emergencia'}
                        className={claseCampo(Boolean(errors.descripcion))}
                        {...ariaDe('descripcion', { error: errors.descripcion })}
                    />
                </Pregunta>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
                <Pregunta id="cantidad" numero={3} etiqueta="Cantidad" error={errors.cantidad}>
                    <input
                        id="cantidad"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={data.cantidad}
                        onChange={(e) => cambiarCantidad(e.target.value)}
                        className={claseCampo(Boolean(errors.cantidad))}
                        {...ariaDe('cantidad', { error: errors.cantidad })}
                    />
                </Pregunta>
                <Pregunta id="monto_soles" numero={4} etiqueta="Monto total" error={errors.monto_soles}>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-slate-500">S/</span>
                        <input
                            id="monto_soles"
                            type="number"
                            inputMode="decimal"
                            min="0.5"
                            step="0.5"
                            value={data.monto_soles}
                            onChange={(e) => setData('monto_soles', e.target.value)}
                            className={`${claseCampo(Boolean(errors.monto_soles))} pl-11`}
                            {...ariaDe('monto_soles', { error: errors.monto_soles })}
                        />
                    </div>
                </Pregunta>
                <Pregunta id="fecha" numero={5} etiqueta="Fecha" error={errors.fecha}>
                    <input
                        id="fecha"
                        type="date"
                        max={hoy()}
                        value={data.fecha}
                        onChange={(e) => setData('fecha', e.target.value)}
                        className={claseCampo(Boolean(errors.fecha))}
                        {...ariaDe('fecha', { error: errors.fecha })}
                    />
                </Pregunta>
            </div>

            <Pregunta id="cliente" numero={6} etiqueta="Cliente" opcional>
                <input
                    id="cliente"
                    type="text"
                    value={data.cliente}
                    onChange={(e) => setData('cliente', e.target.value)}
                    placeholder="Ej. Bodega Doña Mery"
                    className={claseCampo()}
                />
            </Pregunta>

            {producto && producto.stock !== null && (
                <label className="flex cursor-pointer items-center gap-3 text-lg text-slate-800">
                    <input
                        type="checkbox"
                        checked={data.descontar_stock}
                        onChange={(e) => setData('descontar_stock', e.target.checked)}
                        className="accent-primary size-5"
                    />
                    Descontar de mis unidades disponibles (tienes {producto.stock})
                </label>
            )}

            <div className="flex flex-wrap gap-3">
                <button
                    type="submit"
                    disabled={processing}
                    className="bg-primary hover:bg-primary-700 inline-flex min-h-13 cursor-pointer items-center gap-2 rounded-xl px-7 text-lg font-bold text-white disabled:opacity-60"
                >
                    <Save aria-hidden="true" className="size-5" /> Guardar venta
                </button>
                <button
                    type="button"
                    onClick={onCerrar}
                    className="min-h-13 cursor-pointer rounded-xl px-5 text-lg font-semibold text-slate-700 hover:bg-slate-100"
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
}

function FilaVenta({ venta }: Readonly<{ venta: Venta }>) {
    const [confirmar, setConfirmar] = useState(false);
    return (
        <li className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900">
                    {venta.descripcion} {venta.cantidad > 1 && <span className="font-semibold text-slate-500">× {venta.cantidad}</span>}
                </p>
                <p className="text-base text-slate-600">
                    {fechaCorta(venta.fecha)}
                    {venta.cliente ? ` · ${venta.cliente}` : ''}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-slate-900">{soles(venta.monto_soles)}</span>
                {confirmar ? (
                    <>
                        <button
                            type="button"
                            onClick={() => router.delete(route('proveedor.ventas.destroy', { venta: venta.id }), { preserveScroll: true })}
                            className="min-h-11 cursor-pointer rounded-lg bg-rose-600 px-3 text-base font-bold text-white"
                        >
                            Sí, eliminar
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmar(false)}
                            className="min-h-11 cursor-pointer px-2 text-base font-semibold text-slate-700"
                        >
                            No
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirmar(true)}
                        aria-label={`Eliminar venta ${venta.descripcion}`}
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-rose-700 hover:bg-rose-50"
                    >
                        <Trash2 aria-hidden="true" className="size-5" />
                    </button>
                )}
            </div>
        </li>
    );
}

export default function VentasProveedor({ perfil, ventas, totales, productos }: Readonly<VentasProps>) {
    const [registrando, setRegistrando] = useState(false);
    const cambio = totales.mes_anterior > 0 ? Math.round(((totales.mes - totales.mes_anterior) / totales.mes_anterior) * 100) : null;

    const porMes = useMemo(() => {
        const grupos = new Map<string, Venta[]>();
        for (const v of ventas) grupos.set(v.fecha.slice(0, 7), [...(grupos.get(v.fecha.slice(0, 7)) ?? []), v]);
        return [...grupos.entries()];
    }, [ventas]);

    return (
        <>
            <Head title="Mis ventas - CheckITSE" />
            <CuentaProveedor
                perfil={perfil}
                seccion="ventas"
                titulo="Mis ventas"
                descripcion="Anota lo que vendes gracias a CheckITSE. Te ordenamos todo por mes y descontamos tus unidades."
            >
                {perfil ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <article className="bg-ink-900 rounded-2xl p-5 text-white">
                                <p className="text-sun-300 flex items-center gap-2 text-base font-bold">
                                    <Wallet aria-hidden="true" className="size-5" /> Este mes
                                </p>
                                <p className="font-display mt-2 text-4xl font-extrabold">{soles(totales.mes)}</p>
                                <p className="mt-1 flex items-center gap-1 text-base text-slate-300">
                                    {cambio !== null && cambio >= 0 && <TrendingUp aria-hidden="true" className="size-5 text-emerald-400" />}
                                    {cambio !== null && cambio < 0 && <TrendingDown aria-hidden="true" className="size-5 text-rose-300" />}
                                    {cambio === null ? `${totales.ventas_mes} ventas` : `${porcentajeCambio(cambio)} vs. mes anterior`}
                                </p>
                            </article>
                            <article className="rounded-2xl border border-slate-200 bg-white p-5">
                                <p className="text-base font-bold text-slate-600">Mes anterior</p>
                                <p className="font-display mt-2 text-4xl font-extrabold text-slate-900">{soles(totales.mes_anterior)}</p>
                            </article>
                            <article className="rounded-2xl border border-slate-200 bg-white p-5">
                                <p className="text-base font-bold text-slate-600">Total registrado</p>
                                <p className="font-display mt-2 text-4xl font-extrabold text-slate-900">{soles(totales.historico)}</p>
                            </article>
                        </div>

                        {registrando ? (
                            <FormularioVenta productos={productos} onCerrar={() => setRegistrando(false)} />
                        ) : (
                            <button
                                type="button"
                                onClick={() => setRegistrando(true)}
                                className="bg-primary hover:bg-primary-700 inline-flex min-h-13 cursor-pointer items-center gap-2 rounded-xl px-6 text-lg font-bold text-white"
                            >
                                <Plus aria-hidden="true" className="size-5" /> Registrar una venta
                            </button>
                        )}

                        {ventas.length === 0 ? (
                            <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
                                <Wallet aria-hidden="true" className="text-primary-600 mx-auto size-12" />
                                <p className="mt-3 text-xl font-bold text-slate-900">Aún no registras ventas</p>
                                <p className="mt-1 text-lg text-slate-600">
                                    Cada vez que un cliente de CheckITSE te compre, anótalo aquí para ver cómo crece tu negocio.
                                </p>
                            </div>
                        ) : (
                            porMes.map(([mes, lista]) => (
                                <section key={mes} aria-labelledby={`mes-${mes}`} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                        <h2 id={`mes-${mes}`} className="font-display text-2xl font-bold text-slate-900 capitalize">
                                            {MESES[Number(mes.slice(5, 7)) - 1]} {mes.slice(0, 4)}
                                        </h2>
                                        <p className="text-lg font-bold text-slate-700">
                                            {soles(lista.reduce((t, v) => t + v.monto_soles, 0))} · {lista.length}{' '}
                                            {lista.length === 1 ? 'venta' : 'ventas'}
                                        </p>
                                    </div>
                                    <ul className="mt-2 divide-y divide-slate-100">
                                        {lista.map((v) => (
                                            <FilaVenta key={v.id} venta={v} />
                                        ))}
                                    </ul>
                                </section>
                            ))
                        )}
                    </>
                ) : (
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
                        <p className="text-xl font-bold text-slate-900">Primero completa los datos de tu negocio</p>
                        <Link
                            href={route('proveedor.perfil.editar')}
                            className="bg-primary mt-5 inline-flex min-h-13 items-center rounded-xl px-6 text-lg font-bold text-white"
                        >
                            Completar mi negocio
                        </Link>
                    </div>
                )}
            </CuentaProveedor>
        </>
    );
}
