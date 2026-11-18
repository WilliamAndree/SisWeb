import { Pregunta, ResumenErrores, ariaDe, claseCampo } from '@/components/form/Pregunta';
import { CuentaProveedor } from '@/components/proveedor/CuentaProveedor';
import { visualDeItem } from '@/lib/item-visual';
import { soles, type PerfilResumen } from '@/types/proveedor';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { CirclePause, CirclePlay, MapPin, Package, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

interface Oferta {
    id: number;
    criterio_codigo: string;
    uso: string;
    nombre: string;
    marca: string | null;
    descripcion: string | null;
    precio_soles: number;
    unidad: string;
    stock: number | null;
    zona: string;
    activo: boolean;
}

interface Opcion {
    valor: string;
    etiqueta: string;
}

interface ProductosProps {
    perfil: PerfilResumen | null;
    ofertas: Oferta[];
    criterios: Array<{ codigo: string; titulo: string; uso: string }>;
    usos: Opcion[];
    zonas: string[];
    unidades: string[];
    limite: number | null;
}

type FormOferta = {
    criterio_codigo: string;
    nombre: string;
    marca: string;
    descripcion: string;
    precio_soles: string;
    unidad: string;
    stock: string;
    zona: string;
};

type FiltroEstado = 'todos' | 'visibles' | 'pausados';

const ETIQUETAS: Record<string, string> = {
    criterio_codigo: 'Para qué sirve',
    nombre: 'Nombre',
    precio_soles: 'Precio',
    stock: 'Unidades disponibles',
    zona: 'Zona',
};

const nombreCriterio = (codigo: string, titulo?: string) => visualDeItem(codigo, titulo).nombreCorto || titulo || codigo;

function FormularioProducto({
    editando,
    inicial,
    criterios,
    usos,
    zonas,
    unidades,
    onCerrar,
}: Readonly<{
    editando: number | null;
    inicial: FormOferta;
    criterios: ProductosProps['criterios'];
    usos: Opcion[];
    zonas: string[];
    unidades: string[];
    onCerrar: () => void;
}>) {
    const { data, setData, post, put, processing, errors } = useForm<FormOferta>(inicial);
    const [uso, setUso] = useState(() => criterios.find((c) => c.codigo === inicial.criterio_codigo)?.uso ?? '');
    const criteriosDelUso = uso ? criterios.filter((c) => c.uso === uso) : criterios;

    const guardar = (e: FormEvent) => {
        e.preventDefault();
        const opciones = { preserveScroll: true, onSuccess: onCerrar };
        if (editando) put(route('proveedor.ofertas.update', { oferta: editando }), opciones);
        else post(route('proveedor.ofertas.store'), opciones);
    };

    return (
        <form
            id="form-producto"
            onSubmit={guardar}
            noValidate
            className="border-primary-200 scroll-mt-28 space-y-6 rounded-3xl border-2 bg-white p-5 shadow-sm sm:p-8"
        >
            <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl font-bold text-slate-900">{editando ? 'Editar producto' : 'Nuevo producto o servicio'}</h2>
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

            <fieldset>
                <legend className="text-lg font-bold text-slate-900">1. ¿Para qué sirve?</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                    {usos.map((u) => (
                        <button
                            key={u.valor}
                            type="button"
                            aria-pressed={uso === u.valor}
                            onClick={() => {
                                setUso(u.valor);
                                setData('criterio_codigo', '');
                            }}
                            className={`min-h-11 cursor-pointer rounded-full px-4 text-base font-semibold transition ${
                                uso === u.valor ? 'bg-ink-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                            }`}
                        >
                            {u.etiqueta}
                        </button>
                    ))}
                </div>
            </fieldset>

            <Pregunta
                id="criterio_codigo"
                numero={2}
                etiqueta="¿Qué le resuelve al local?"
                ayuda="Así te mostramos a quien le falta justo eso."
                error={errors.criterio_codigo}
            >
                <select
                    id="criterio_codigo"
                    value={data.criterio_codigo}
                    onChange={(e) => setData('criterio_codigo', e.target.value)}
                    className={`${claseCampo(Boolean(errors.criterio_codigo))} cursor-pointer`}
                    {...ariaDe('criterio_codigo', { ayuda: true, error: errors.criterio_codigo })}
                >
                    <option value="">Selecciona</option>
                    {criteriosDelUso.map((c) => (
                        <option key={c.codigo} value={c.codigo}>
                            {nombreCriterio(c.codigo, c.titulo)}
                        </option>
                    ))}
                </select>
            </Pregunta>

            <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
                <Pregunta id="nombre" numero={3} etiqueta="Nombre del producto o servicio" error={errors.nombre}>
                    <input
                        id="nombre"
                        type="text"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        placeholder="Ej. Extintor PQS 6 kg con tarjeta"
                        className={claseCampo(Boolean(errors.nombre))}
                        {...ariaDe('nombre', { error: errors.nombre })}
                    />
                </Pregunta>
                <Pregunta id="marca" numero={4} etiqueta="Marca" opcional>
                    <input
                        id="marca"
                        type="text"
                        value={data.marca}
                        onChange={(e) => setData('marca', e.target.value)}
                        placeholder="Ej. Kidde"
                        className={claseCampo()}
                    />
                </Pregunta>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
                <Pregunta id="precio_soles" numero={5} etiqueta="Precio" error={errors.precio_soles}>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-slate-500">S/</span>
                        <input
                            id="precio_soles"
                            type="number"
                            inputMode="decimal"
                            min="1"
                            step="0.5"
                            value={data.precio_soles}
                            onChange={(e) => setData('precio_soles', e.target.value)}
                            className={`${claseCampo(Boolean(errors.precio_soles))} pl-11`}
                            {...ariaDe('precio_soles', { error: errors.precio_soles })}
                        />
                    </div>
                </Pregunta>
                <Pregunta id="unidad" numero={6} etiqueta="Precio por">
                    <select
                        id="unidad"
                        value={data.unidad}
                        onChange={(e) => setData('unidad', e.target.value)}
                        className={`${claseCampo()} cursor-pointer`}
                    >
                        {unidades.map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                </Pregunta>
                <Pregunta id="stock" numero={7} etiqueta="Unidades disponibles" opcional error={errors.stock}>
                    <input
                        id="stock"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={data.stock}
                        onChange={(e) => setData('stock', e.target.value)}
                        placeholder="Ej. 12"
                        className={claseCampo(Boolean(errors.stock))}
                        {...ariaDe('stock', { error: errors.stock })}
                    />
                </Pregunta>
            </div>

            <Pregunta id="zona" numero={8} etiqueta="¿Dónde lo vendes o instalas?" error={errors.zona} grupo>
                <div className="flex flex-wrap gap-2">
                    {zonas.map((z) => (
                        <label
                            key={z}
                            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-base font-semibold ${
                                data.zona === z ? 'border-primary bg-primary-50 text-primary-800' : 'border-slate-300 text-slate-700'
                            }`}
                        >
                            <input
                                type="radio"
                                name="zona"
                                value={z}
                                checked={data.zona === z}
                                onChange={() => setData('zona', z)}
                                className="sr-only"
                            />
                            <MapPin aria-hidden="true" className="size-4" /> {z}
                        </label>
                    ))}
                </div>
            </Pregunta>

            <Pregunta id="descripcion_oferta" numero={9} etiqueta="Detalle para el cliente" opcional>
                <textarea
                    id="descripcion_oferta"
                    rows={2}
                    maxLength={500}
                    value={data.descripcion}
                    onChange={(e) => setData('descripcion', e.target.value)}
                    placeholder="Ej. Incluye instalación y certificado. Entrega en 24 horas."
                    className={`${claseCampo()} h-auto py-3`}
                />
            </Pregunta>

            <div className="flex flex-wrap gap-3">
                <button
                    type="submit"
                    disabled={processing}
                    className="bg-primary hover:bg-primary-700 inline-flex min-h-13 cursor-pointer items-center gap-2 rounded-xl px-7 text-lg font-bold text-white disabled:opacity-60"
                >
                    {editando ? <Save aria-hidden="true" className="size-5" /> : <Plus aria-hidden="true" className="size-5" />}
                    {editando ? 'Guardar cambios' : 'Publicar producto'}
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

function TarjetaProducto({ oferta, onEditar }: Readonly<{ oferta: Oferta; onEditar: (o: Oferta) => void }>) {
    const [confirmar, setConfirmar] = useState(false);
    const visual = visualDeItem(oferta.criterio_codigo);
    const agotado = oferta.stock === 0;

    return (
        <li
            className={`flex flex-col overflow-hidden rounded-2xl border bg-white ${oferta.activo ? 'border-slate-200' : 'border-dashed border-slate-300'}`}
        >
            <div className="relative h-36 bg-slate-100">
                {visual.imagen ? (
                    <img
                        src={visual.imagen}
                        alt=""
                        loading="lazy"
                        className={`h-full w-full object-cover ${oferta.activo ? '' : 'opacity-50 grayscale'}`}
                    />
                ) : (
                    <span className="text-primary-700 flex h-full items-center justify-center">
                        <Package aria-hidden="true" className="size-12" />
                    </span>
                )}
                <span
                    className={`absolute top-3 left-3 rounded-full px-3 py-1 text-sm font-bold ${oferta.activo ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'}`}
                >
                    {oferta.activo ? 'Visible' : 'Pausado'}
                </span>
                {agotado && <span className="absolute top-3 right-3 rounded-full bg-rose-600 px-3 py-1 text-sm font-bold text-white">Agotado</span>}
            </div>
            <div className="flex flex-1 flex-col p-4">
                <p className="text-lg leading-snug font-bold text-slate-900">{oferta.nombre}</p>
                <p className="text-base text-slate-600">
                    {oferta.marca ? `${oferta.marca} · ` : ''}
                    {nombreCriterio(oferta.criterio_codigo)}
                </p>
                <p className="text-primary-700 mt-2 text-2xl font-extrabold">
                    {soles(oferta.precio_soles)} <span className="text-base font-semibold text-slate-500">/ {oferta.unidad}</span>
                </p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-base text-slate-600">
                    <span className="inline-flex items-center gap-1">
                        <MapPin aria-hidden="true" className="size-4" /> {oferta.zona}
                    </span>
                    {oferta.stock !== null && <span>{oferta.stock} disponibles</span>}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <button
                        type="button"
                        onClick={() => onEditar(oferta)}
                        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-base font-semibold text-slate-800 hover:bg-slate-50"
                    >
                        <Pencil aria-hidden="true" className="size-4" /> Editar
                    </button>
                    <button
                        type="button"
                        onClick={() => router.patch(route('proveedor.ofertas.alternar', { oferta: oferta.id }), {}, { preserveScroll: true })}
                        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-base font-semibold text-slate-800 hover:bg-slate-50"
                    >
                        {oferta.activo ? <CirclePause aria-hidden="true" className="size-4" /> : <CirclePlay aria-hidden="true" className="size-4" />}
                        {oferta.activo ? 'Pausar' : 'Activar'}
                    </button>
                    {confirmar ? (
                        <span className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => router.delete(route('proveedor.ofertas.destroy', { oferta: oferta.id }), { preserveScroll: true })}
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
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmar(true)}
                            aria-label={`Eliminar ${oferta.nombre}`}
                            className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-rose-700 hover:bg-rose-50"
                        >
                            <Trash2 aria-hidden="true" className="size-5" />
                        </button>
                    )}
                </div>
            </div>
        </li>
    );
}

export default function ProductosProveedor({ perfil, ofertas, criterios, usos, zonas, unidades, limite }: Readonly<ProductosProps>) {
    const vacio: FormOferta = {
        criterio_codigo: '',
        nombre: '',
        marca: '',
        descripcion: '',
        precio_soles: '',
        unidad: 'unidad',
        stock: '',
        zona: zonas[0] ?? '',
    };
    const [formulario, setFormulario] = useState<{ id: number | null; datos: FormOferta } | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [uso, setUso] = useState('');
    const [zona, setZona] = useState('');
    const [estado, setEstado] = useState<FiltroEstado>('todos');

    const lleno = limite !== null && ofertas.length >= limite;

    const filtradas = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return ofertas.filter(
            (o) =>
                (!texto || `${o.nombre} ${o.marca ?? ''} ${o.descripcion ?? ''}`.toLowerCase().includes(texto)) &&
                (!uso || o.uso === uso) &&
                (!zona || o.zona === zona || o.zona === 'Todo Huancayo') &&
                (estado === 'todos' || (estado === 'visibles' ? o.activo : !o.activo)),
        );
    }, [ofertas, busqueda, uso, zona, estado]);

    const grupos = usos.map((u) => ({ ...u, items: filtradas.filter((o) => o.uso === u.valor) })).filter((g) => g.items.length > 0);

    const abrir = (id: number | null, datos: FormOferta) => {
        setFormulario({ id, datos });
        requestAnimationFrame(() => document.getElementById('form-producto')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };

    const editar = (o: Oferta) =>
        abrir(o.id, {
            criterio_codigo: o.criterio_codigo,
            nombre: o.nombre,
            marca: o.marca ?? '',
            descripcion: o.descripcion ?? '',
            precio_soles: String(o.precio_soles),
            unidad: o.unidad,
            stock: o.stock === null ? '' : String(o.stock),
            zona: o.zona,
        });

    const hayFiltros = Boolean(busqueda || uso || zona || estado !== 'todos');

    return (
        <>
            <Head title="Mis productos - CheckITSE" />
            <CuentaProveedor
                perfil={perfil}
                seccion="productos"
                titulo="Mis productos"
                descripcion="Tu catálogo ordenado por para qué sirve cada cosa. Pausa lo que se agote sin borrarlo."
            >
                {perfil ? (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-lg text-slate-700">
                                <strong className="text-slate-900">{ofertas.length}</strong> de {limite ?? 'ilimitados'} productos de tu plan
                            </p>
                            {lleno ? (
                                <Link
                                    href={route('proveedor.plan')}
                                    className="bg-ink-900 inline-flex min-h-13 items-center gap-2 rounded-xl px-6 text-lg font-bold text-white"
                                >
                                    Llegaste al límite: mejora tu plan
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => abrir(null, vacio)}
                                    className="bg-primary hover:bg-primary-700 inline-flex min-h-13 cursor-pointer items-center gap-2 rounded-xl px-6 text-lg font-bold text-white"
                                >
                                    <Plus aria-hidden="true" className="size-5" /> Agregar producto
                                </button>
                            )}
                        </div>

                        {formulario && (
                            <FormularioProducto
                                key={formulario.id ?? 'nuevo'}
                                editando={formulario.id}
                                inicial={formulario.datos}
                                criterios={criterios}
                                usos={usos}
                                zonas={zonas}
                                unidades={unidades}
                                onCerrar={() => setFormulario(null)}
                            />
                        )}

                        {ofertas.length > 0 && (
                            <section aria-label="Filtrar productos" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                                    <div className="relative">
                                        <Search aria-hidden="true" className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="search"
                                            aria-label="Buscar en mis productos"
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                            placeholder="Buscar por nombre o marca…"
                                            className={`${claseCampo()} pl-11`}
                                        />
                                    </div>
                                    <select
                                        aria-label="Filtrar por zona"
                                        value={zona}
                                        onChange={(e) => setZona(e.target.value)}
                                        className={`${claseCampo()} cursor-pointer`}
                                    >
                                        <option value="">Todas las zonas</option>
                                        {zonas
                                            .filter((z) => z !== 'Todo Huancayo')
                                            .map((z) => (
                                                <option key={z} value={z}>
                                                    {z}
                                                </option>
                                            ))}
                                    </select>
                                    <select
                                        aria-label="Filtrar por estado"
                                        value={estado}
                                        onChange={(e) => setEstado(e.target.value as FiltroEstado)}
                                        className={`${claseCampo()} cursor-pointer`}
                                    >
                                        <option value="todos">Visibles y pausados</option>
                                        <option value="visibles">Solo visibles</option>
                                        <option value="pausados">Solo pausados</option>
                                    </select>
                                </div>
                                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por uso">
                                    {[{ valor: '', etiqueta: 'Todo' }, ...usos].map((u) => {
                                        const cantidad = u.valor ? ofertas.filter((o) => o.uso === u.valor).length : ofertas.length;
                                        if (u.valor && cantidad === 0) return null;
                                        return (
                                            <button
                                                key={u.valor || 'todo'}
                                                type="button"
                                                aria-pressed={uso === u.valor}
                                                onClick={() => setUso(u.valor)}
                                                className={`min-h-11 cursor-pointer rounded-full px-4 text-base font-semibold transition ${
                                                    uso === u.valor ? 'bg-ink-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                            >
                                                {u.etiqueta} <span className="opacity-70">({cantidad})</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {ofertas.length === 0 && !formulario && (
                            <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
                                <Package aria-hidden="true" className="text-primary-600 mx-auto size-12" />
                                <p className="mt-3 text-xl font-bold text-slate-900">Aún no publicas productos</p>
                                <p className="mt-1 text-lg text-slate-600">
                                    Agrega el primero: los clientes verán tu precio cuando les falte eso en su local.
                                </p>
                            </div>
                        )}

                        {ofertas.length > 0 && grupos.length === 0 && (
                            <p className="rounded-2xl bg-slate-50 p-6 text-center text-lg text-slate-700">
                                Ningún producto coincide con los filtros.{' '}
                                {hayFiltros && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBusqueda('');
                                            setUso('');
                                            setZona('');
                                            setEstado('todos');
                                        }}
                                        className="text-primary-700 cursor-pointer font-bold underline underline-offset-2"
                                    >
                                        Quitar filtros
                                    </button>
                                )}
                            </p>
                        )}

                        {grupos.map((g) => (
                            <section key={g.valor} aria-labelledby={`uso-${g.valor}`}>
                                <h2 id={`uso-${g.valor}`} className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                                    {g.etiqueta} <span className="text-lg font-semibold text-slate-500">· {g.items.length}</span>
                                </h2>
                                <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {g.items.map((o) => (
                                        <TarjetaProducto key={o.id} oferta={o} onEditar={editar} />
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </>
                ) : (
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
                        <p className="text-xl font-bold text-slate-900">Primero completa los datos de tu negocio</p>
                        <p className="mt-1 text-lg text-slate-600">Después podrás publicar tus productos con precio.</p>
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
