import { OpcionesTarjeta, Pregunta, ResumenErrores, ariaDe, claseCampo } from '@/components/form/Pregunta';
import { mapaPunto, mapaZona, visualDeItem } from '@/lib/item-visual';
import type { PlanProveedor } from '@/pages/Directorio/Index';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { BadgeCheck, CheckCircle2, Crosshair, Eye, Loader2, MapPin, Package, Pencil, Plus, Save, Store, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Perfil {
    nombre_comercial: string;
    especialidad: string;
    descripcion: string | null;
    telefono: string | null;
    whatsapp: string | null;
    distrito: string;
    direccion: string | null;
    latitud: number | null;
    longitud: number | null;
    plan: string;
    verificado: boolean;
}

interface Oferta {
    id: number;
    criterio_codigo: string;
    nombre: string;
    descripcion: string | null;
    precio_soles: number;
    unidad: string;
    activo: boolean;
}

interface PanelProps {
    perfil: Perfil | null;
    ofertas: Oferta[];
    criterios: Array<{ codigo: string; titulo: string }>;
    distritos: string[];
    unidades: string[];
    planes: PlanProveedor[];
}

type FormPerfil = {
    nombre_comercial: string;
    especialidad: string;
    descripcion: string;
    telefono: string;
    whatsapp: string;
    distrito: string;
    direccion: string;
    latitud: string;
    longitud: string;
};

type FormOferta = {
    criterio_codigo: string;
    nombre: string;
    descripcion: string;
    precio_soles: string;
    unidad: string;
};

const ESPECIALIDADES = [
    { valor: 'incendios', titulo: 'Extintores y señalética', descripcion: 'Venta, recarga, luces de emergencia' },
    { valor: 'electricas', titulo: 'Electricidad y pozo a tierra', descripcion: 'Tableros, cableado, mediciones' },
    { valor: 'arquitectura_senaletica', titulo: 'Planos y evacuación', descripcion: 'Planos, croquis, señalización' },
    { valor: 'estructuras', titulo: 'Estructuras y vidrios', descripcion: 'Anclajes, pasamanos, puertas' },
];

const ETIQUETAS_PERFIL: Record<string, string> = {
    nombre_comercial: 'Nombre del negocio',
    especialidad: 'Especialidad',
    telefono: 'Teléfono',
    whatsapp: 'WhatsApp',
    distrito: 'Distrito',
    latitud: 'Ubicación',
};

const nombreCriterio = (codigo: string, titulo?: string) => visualDeItem(codigo, titulo).nombreCorto || titulo || codigo;

function SeccionPerfil({ perfil, distritos }: Readonly<{ perfil: Perfil | null; distritos: string[] }>) {
    const [ubicando, setUbicando] = useState(false);
    const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
    const { data, setData, put, processing, errors } = useForm<FormPerfil>({
        nombre_comercial: perfil?.nombre_comercial ?? '',
        especialidad: perfil?.especialidad ?? '',
        descripcion: perfil?.descripcion ?? '',
        telefono: perfil?.telefono ?? '',
        whatsapp: perfil?.whatsapp ?? '',
        distrito: perfil?.distrito ?? '',
        direccion: perfil?.direccion ?? '',
        latitud: perfil?.latitud?.toString() ?? '',
        longitud: perfil?.longitud?.toString() ?? '',
    });

    const usarMiUbicacion = () => {
        if (!('geolocation' in navigator)) {
            setErrorUbicacion('Tu navegador no permite obtener la ubicación. Escribe tu dirección.');
            return;
        }
        setUbicando(true);
        setErrorUbicacion(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setData((d) => ({ ...d, latitud: pos.coords.latitude.toFixed(6), longitud: pos.coords.longitude.toFixed(6) }));
                setUbicando(false);
            },
            () => {
                setErrorUbicacion('No pudimos obtener tu ubicación. Revisa el permiso del navegador o escribe tu dirección.');
                setUbicando(false);
            },
            { enableHighAccuracy: true, timeout: 15000 },
        );
    };

    const lat = Number.parseFloat(data.latitud);
    const lng = Number.parseFloat(data.longitud);
    const tienePunto = Number.isFinite(lat) && Number.isFinite(lng);
    const mapa = tienePunto ? mapaPunto(lat, lng) : mapaZona([data.direccion, data.distrito].filter(Boolean).join(', ') || 'Huancayo');

    const guardar = (e: FormEvent) => {
        e.preventDefault();
        put(route('proveedor.perfil'), { preserveScroll: true });
    };

    return (
        <form onSubmit={guardar} noValidate className="space-y-8">
            <ResumenErrores errores={errors} etiquetas={ETIQUETAS_PERFIL} />

            <Pregunta id="nombre_comercial" numero={1} etiqueta="Nombre de tu negocio" error={errors.nombre_comercial}>
                <input
                    id="nombre_comercial"
                    type="text"
                    value={data.nombre_comercial}
                    onChange={(e) => setData('nombre_comercial', e.target.value)}
                    placeholder="Ej. Extintores Wanka"
                    className={claseCampo(Boolean(errors.nombre_comercial))}
                    {...ariaDe('nombre_comercial', { error: errors.nombre_comercial })}
                />
            </Pregunta>

            <Pregunta
                id="especialidad"
                numero={2}
                etiqueta="¿Qué vendes o instalas?"
                ayuda="Aparecerás en esta sección del directorio."
                error={errors.especialidad}
                grupo
            >
                <OpcionesTarjeta
                    nombre="especialidad"
                    valor={data.especialidad}
                    onCambio={(v) => setData('especialidad', v)}
                    opciones={ESPECIALIDADES}
                />
            </Pregunta>

            <Pregunta id="descripcion" numero={3} etiqueta="Cuéntales a tus clientes sobre tu negocio" opcional>
                <textarea
                    id="descripcion"
                    rows={3}
                    maxLength={600}
                    value={data.descripcion}
                    onChange={(e) => setData('descripcion', e.target.value)}
                    placeholder="Ej. Más de 10 años recargando extintores en Huancayo. Entregamos certificado."
                    className={`${claseCampo()} h-auto py-3`}
                />
            </Pregunta>

            <div className="grid gap-8 sm:grid-cols-2">
                <Pregunta id="telefono" numero={4} etiqueta="Teléfono" error={errors.telefono}>
                    <input
                        id="telefono"
                        type="tel"
                        inputMode="tel"
                        value={data.telefono}
                        onChange={(e) => setData('telefono', e.target.value)}
                        placeholder="964 123 456"
                        className={claseCampo(Boolean(errors.telefono))}
                        {...ariaDe('telefono', { error: errors.telefono })}
                    />
                </Pregunta>
                <Pregunta id="whatsapp" numero={5} etiqueta="WhatsApp" opcional ayuda="Si lo dejas vacío usamos tu teléfono." error={errors.whatsapp}>
                    <input
                        id="whatsapp"
                        type="tel"
                        inputMode="tel"
                        value={data.whatsapp}
                        onChange={(e) => setData('whatsapp', e.target.value)}
                        className={claseCampo(Boolean(errors.whatsapp))}
                        {...ariaDe('whatsapp', { ayuda: true, error: errors.whatsapp })}
                    />
                </Pregunta>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
                <Pregunta id="distrito" numero={6} etiqueta="Distrito" error={errors.distrito}>
                    <select
                        id="distrito"
                        value={data.distrito}
                        onChange={(e) => setData('distrito', e.target.value)}
                        className={`${claseCampo(Boolean(errors.distrito))} cursor-pointer`}
                        {...ariaDe('distrito', { error: errors.distrito })}
                    >
                        <option value="">Selecciona</option>
                        {distritos.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                </Pregunta>
                <Pregunta id="direccion" numero={7} etiqueta="Dirección del local" opcional>
                    <input
                        id="direccion"
                        type="text"
                        value={data.direccion}
                        onChange={(e) => setData('direccion', e.target.value)}
                        placeholder="Ej. Jr. Puno 450"
                        className={claseCampo()}
                    />
                </Pregunta>
            </div>

            <Pregunta
                id="latitud"
                numero={8}
                etiqueta="Ubica tu local en el mapa"
                ayuda="Estando en tu local, toca el botón. Así tus clientes llegan sin perderse."
                error={errors.latitud ?? errorUbicacion ?? undefined}
                opcional
                grupo
            >
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={usarMiUbicacion}
                        disabled={ubicando}
                        className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-5 text-base font-bold text-white disabled:opacity-60"
                    >
                        {ubicando ? (
                            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                        ) : (
                            <Crosshair aria-hidden="true" className="size-5" />
                        )}
                        {ubicando ? 'Buscando…' : 'Usar mi ubicación actual'}
                    </button>
                    {tienePunto && (
                        <button
                            type="button"
                            onClick={() => setData((d) => ({ ...d, latitud: '', longitud: '' }))}
                            className="min-h-12 cursor-pointer rounded-xl px-4 text-base font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Quitar punto
                        </button>
                    )}
                </div>
                <p className="mt-3 flex items-center gap-2 text-base text-slate-600">
                    <MapPin aria-hidden="true" className="text-primary-600 size-5 shrink-0" />
                    {tienePunto ? `Punto guardado: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Sin punto exacto: mostraremos tu zona.'}
                </p>
                <iframe
                    title="Vista previa de tu ubicación"
                    src={mapa.embed}
                    loading="lazy"
                    className="mt-3 h-64 w-full rounded-xl border border-slate-200"
                />
            </Pregunta>

            <button
                type="submit"
                disabled={processing}
                className="bg-primary hover:bg-primary-700 inline-flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-8 text-lg font-bold text-white disabled:opacity-60 sm:w-auto"
            >
                {processing ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <Save aria-hidden="true" className="size-5" />}
                {perfil ? 'Guardar cambios' : 'Publicar mi perfil'}
            </button>
        </form>
    );
}

function SeccionOfertas({ ofertas, criterios, unidades }: Readonly<{ ofertas: Oferta[]; criterios: PanelProps['criterios']; unidades: string[] }>) {
    const [editando, setEditando] = useState<number | null>(null);
    const [confirmar, setConfirmar] = useState<number | null>(null);
    const vacio: FormOferta = { criterio_codigo: '', nombre: '', descripcion: '', precio_soles: '', unidad: 'unidad' };
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<FormOferta>(vacio);

    const editar = (o: Oferta) => {
        setEditando(o.id);
        clearErrors();
        setData({
            criterio_codigo: o.criterio_codigo,
            nombre: o.nombre,
            descripcion: o.descripcion ?? '',
            precio_soles: String(o.precio_soles),
            unidad: o.unidad,
        });
        document.getElementById('form-oferta')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const cancelar = () => {
        setEditando(null);
        reset();
        clearErrors();
    };

    const guardar = (e: FormEvent) => {
        e.preventDefault();
        const opciones = { preserveScroll: true, onSuccess: cancelar };
        if (editando) put(route('proveedor.ofertas.update', { oferta: editando }), opciones);
        else post(route('proveedor.ofertas.store'), opciones);
    };

    return (
        <div className="space-y-8">
            {ofertas.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-lg text-slate-600">
                    Aún no publicas productos. Agrega el primero abajo: los clientes verán tu precio cuando les falte eso en su local.
                </p>
            ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                    {ofertas.map((o) => {
                        const visual = visualDeItem(o.criterio_codigo);
                        return (
                            <li key={o.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                                {visual.imagen ? (
                                    <img src={visual.imagen} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
                                ) : (
                                    <span className="bg-primary-50 text-primary-700 flex size-20 shrink-0 items-center justify-center rounded-xl">
                                        <Package aria-hidden="true" className="size-8" />
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-lg leading-snug font-bold text-slate-900">{o.nombre}</p>
                                    <p className="text-base text-slate-600">Para: {nombreCriterio(o.criterio_codigo)}</p>
                                    <p className="text-primary-700 mt-1 text-2xl font-extrabold">
                                        S/ {o.precio_soles.toFixed(2)} <span className="text-base font-semibold text-slate-500">/ {o.unidad}</span>
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => editar(o)}
                                            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-base font-semibold text-slate-800 hover:bg-slate-50"
                                        >
                                            <Pencil aria-hidden="true" className="size-4" /> Editar
                                        </button>
                                        {confirmar === o.id ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.delete(route('proveedor.ofertas.destroy', { oferta: o.id }), { preserveScroll: true })
                                                    }
                                                    className="min-h-11 cursor-pointer rounded-lg bg-rose-600 px-3 text-base font-bold text-white"
                                                >
                                                    Sí, eliminar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmar(null)}
                                                    className="min-h-11 cursor-pointer px-2 text-base font-semibold text-slate-700"
                                                >
                                                    Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setConfirmar(o.id)}
                                                aria-label={`Eliminar ${o.nombre}`}
                                                className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-rose-700 hover:bg-rose-50"
                                            >
                                                <Trash2 aria-hidden="true" className="size-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <form
                id="form-oferta"
                onSubmit={guardar}
                noValidate
                className="scroll-mt-24 space-y-6 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 sm:p-7"
            >
                <h3 className="text-2xl font-bold text-slate-900">{editando ? 'Editar producto' : 'Agregar producto o servicio'}</h3>
                <Pregunta
                    id="criterio_codigo"
                    numero={1}
                    etiqueta="¿Qué necesidad del local resuelve?"
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
                        {criterios.map((c) => (
                            <option key={c.codigo} value={c.codigo}>
                                {nombreCriterio(c.codigo, c.titulo)}
                            </option>
                        ))}
                    </select>
                </Pregunta>
                <Pregunta id="nombre" numero={2} etiqueta="Nombre del producto o servicio" error={errors.nombre}>
                    <input
                        id="nombre"
                        type="text"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        placeholder="Ej. Extintor PQS 6 kg con tarjeta de inspección"
                        className={claseCampo(Boolean(errors.nombre))}
                        {...ariaDe('nombre', { error: errors.nombre })}
                    />
                </Pregunta>
                <div className="grid gap-6 sm:grid-cols-2">
                    <Pregunta id="precio_soles" numero={3} etiqueta="Precio en soles" error={errors.precio_soles}>
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
                    <Pregunta id="unidad" numero={4} etiqueta="Precio por">
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
                </div>
                <Pregunta id="descripcion_oferta" numero={5} etiqueta="Detalle" opcional>
                    <textarea
                        id="descripcion_oferta"
                        rows={2}
                        maxLength={500}
                        value={data.descripcion}
                        onChange={(e) => setData('descripcion', e.target.value)}
                        placeholder="Ej. Incluye instalación y certificado."
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
                    {editando && (
                        <button
                            type="button"
                            onClick={cancelar}
                            className="min-h-13 cursor-pointer rounded-xl px-5 text-lg font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

export default function PanelProveedor({ perfil, ofertas, criterios, distritos, unidades, planes }: Readonly<PanelProps>) {
    const { flash, auth } = usePage().props as { flash?: { success?: string | null }; auth?: { user?: { name: string } | null } };
    const plan = planes.find((p) => p.id === perfil?.plan) ?? planes[0];

    return (
        <>
            <Head title="Mi negocio - CheckITSE" />

            <header className="bg-ink-900 trama-andina relative overflow-hidden rounded-3xl pb-[18px] text-white">
                <div aria-hidden="true" className="franja-andina absolute inset-x-0 bottom-0" />
                <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.5fr_1fr] lg:items-center">
                    <div>
                        <p className="text-sun-300 inline-flex items-center gap-2 text-base font-bold">
                            <Store aria-hidden="true" className="size-5" /> Panel de proveedor
                        </p>
                        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                            {perfil?.nombre_comercial ?? `Hola, ${auth?.user?.name ?? 'proveedor'}`}
                        </h1>
                        <p className="mt-3 text-lg text-slate-300">
                            {perfil
                                ? 'Tu perfil está publicado. Mantén tus precios al día para que los clientes te elijan.'
                                : 'Completa tu perfil para aparecer en el directorio y en "Lo que te falta" de cada local.'}
                        </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/10 p-4">
                            <dt className="text-base text-slate-300">Productos</dt>
                            <dd className="mt-1 text-3xl font-extrabold">{ofertas.length}</dd>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4">
                            <dt className="text-base text-slate-300">Plan</dt>
                            <dd className="mt-1 text-2xl font-extrabold">{plan?.nombre ?? 'Básico'}</dd>
                        </div>
                    </dl>
                </div>
            </header>

            {flash?.success && (
                <p
                    role="status"
                    className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-lg font-semibold text-emerald-800"
                >
                    <CheckCircle2 aria-hidden="true" className="size-6" /> {flash.success}
                </p>
            )}

            <nav aria-label="Secciones del panel" className="mt-6 flex flex-wrap gap-2">
                {[
                    ['#perfil', '1. Mi negocio'],
                    ['#productos', '2. Productos y precios'],
                    ['#plan', '3. Mi plan'],
                ].map(([href, texto]) => (
                    <a
                        key={href}
                        href={href}
                        className="min-h-11 rounded-full border border-slate-300 bg-white px-5 py-2 text-base font-semibold text-slate-800 hover:border-slate-400"
                    >
                        {texto}
                    </a>
                ))}
                {perfil && (
                    <Link
                        href={route('directorio.index')}
                        className="text-primary-700 inline-flex min-h-11 items-center gap-2 px-3 text-base font-semibold underline underline-offset-2"
                    >
                        <Eye aria-hidden="true" className="size-5" /> Ver cómo me ven los clientes
                    </Link>
                )}
            </nav>

            <section
                id="perfil"
                aria-labelledby="perfil-titulo"
                className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8"
            >
                <h2 id="perfil-titulo" className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    Mi negocio
                </h2>
                {perfil?.verificado && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-base font-bold text-emerald-700">
                        <BadgeCheck aria-hidden="true" className="size-5" /> Negocio verificado
                    </p>
                )}
                <div className="mt-6">
                    <SeccionPerfil perfil={perfil} distritos={distritos} />
                </div>
            </section>

            <section
                id="productos"
                aria-labelledby="productos-titulo"
                className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8"
            >
                <h2 id="productos-titulo" className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    Productos y precios
                </h2>
                <p className="mt-2 text-lg text-slate-600">Cada producto aparece a los locales que necesitan justo eso, con tu precio.</p>
                <div className="mt-6">
                    {perfil ? (
                        <SeccionOfertas ofertas={ofertas} criterios={criterios} unidades={unidades} />
                    ) : (
                        <p className="rounded-2xl bg-slate-50 p-5 text-lg text-slate-700">
                            Primero publica tu perfil (sección 1) y luego agrega tus productos.
                        </p>
                    )}
                </div>
            </section>

            <section id="plan" aria-labelledby="plan-titulo" className="border-sun-300 bg-sun-50 mt-8 scroll-mt-24 rounded-3xl border p-5 sm:p-8">
                <h2 id="plan-titulo" className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    Mi plan: {plan?.nombre ?? 'Básico'}
                </h2>
                <p className="mt-2 text-lg text-slate-700">Con un plan pagado apareces primero y destacado frente a los clientes.</p>
                <Link
                    href={route('directorio.afiliacion', { plan: 'destacado' })}
                    className="bg-ink-900 hover:bg-ink-800 mt-5 inline-flex min-h-13 items-center rounded-xl px-6 text-lg font-bold text-white"
                >
                    Mejorar mi plan
                </Link>
            </section>
        </>
    );
}
