import { ModalContactoProveedor } from '@/components/Directorio/ModalContactoProveedor';
import { HeroCinematico, type Diapositiva } from '@/components/landing/HeroCinematico';
import AppLayout from '@/layouts/AppLayout';
import { mapaProveedor } from '@/lib/item-visual';
import type { AliadoAsistenciaContrato } from '@/types/contrato';
import type { PlanProveedor } from '@/types/proveedor';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    BarChart3,
    Check,
    Compass,
    DoorClosed,
    Flame,
    MapPin,
    Megaphone,
    MessageCircle,
    Search,
    ShieldCheck,
    Store,
    Target,
    Users,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

interface FiltroOpcion {
    valor: string;
    etiqueta: string;
}

export type { PlanProveedor };

/**
 * Aviso para quien entra con su cuenta de emprendedor: vender requiere una
 * cuenta de proveedor aparte (con otro correo), así cada una ve solo lo suyo.
 */
function AvisoCuentaProveedor({ onCerrar }: Readonly<{ onCerrar: () => void }>) {
    const [saliendo, setSaliendo] = useState(false);
    return (
        <div id="aviso-cuenta" role="alert" className="border-sun-300 bg-sun-50 mx-auto mt-6 max-w-3xl rounded-3xl border-2 p-6 sm:p-8">
            <p className="font-display text-2xl font-bold text-slate-900">Para vender necesitas una cuenta de proveedor</p>
            <p className="mt-2 text-lg text-slate-700">
                Ahora estás con tu cuenta de <strong>emprendedor</strong>, que sirve para revisar tu local. Los proveedores usan una cuenta aparte,
                con otro correo, para publicar sus productos, ver sus ventas y recibir clientes por WhatsApp.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
                <button
                    type="button"
                    disabled={saliendo}
                    onClick={() => {
                        setSaliendo(true);
                        router.post(route('logout'), { destino: 'registro_proveedor' });
                    }}
                    className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-13 cursor-pointer items-center rounded-xl px-6 text-lg font-bold text-white disabled:opacity-60"
                >
                    {saliendo ? 'Abriendo…' : 'Crear mi cuenta de proveedor'}
                </button>
                <button
                    type="button"
                    onClick={onCerrar}
                    className="min-h-13 cursor-pointer rounded-xl px-5 text-lg font-semibold text-slate-700 hover:bg-white"
                >
                    Seguir como emprendedor
                </button>
            </div>
            <p className="mt-3 text-base text-slate-600">Se cerrará tu sesión actual. Tus locales y registros quedan guardados.</p>
        </div>
    );
}

function textoBotonPlan(plan: PlanProveedor, esProveedor: boolean): string {
    if (esProveedor) return plan.precio === 0 ? 'Ver mi cuenta' : `Elegir ${plan.nombre}`;
    return plan.precio === 0 ? 'Crear mi cuenta gratis' : `Empezar gratis y subir a ${plan.nombre}`;
}

interface DirectorioProps {
    aliados: AliadoAsistenciaContrato[];
    planes?: PlanProveedor[];
    filtros: { categoria: string | null; distrito: string | null };
    categorias: FiltroOpcion[];
    distritos: FiltroOpcion[];
}

const ETIQUETA_CATEGORIA: Record<string, string> = {
    electricas: 'Electricidad y pozo a tierra',
    incendios: 'Extintores y señalética',
    arquitectura_senaletica: 'Planos y evacuación',
    estructuras: 'Estructuras y vidrios',
    gas: 'Instalaciones de gas',
};

const ICONO_CATEGORIA: Record<string, typeof Zap> = {
    electricas: Zap,
    incendios: Flame,
    arquitectura_senaletica: Compass,
    estructuras: DoorClosed,
    gas: Flame,
};

/** Lo que más le falta a un local al hacer su simulación, enlazado a la especialidad que lo vende. */
const LO_MAS_BUSCADO = [
    { nombre: 'Extintor PQS 6 kg', motivo: 'Lo piden en casi todos los locales.', categoria: 'incendios', foto: '/images/extintor.webp' },
    {
        nombre: 'Señales de evacuación',
        motivo: 'Salida, ruta de escape y zona segura.',
        categoria: 'arquitectura_senaletica',
        foto: '/images/salida-emergencia.webp',
        encuadre: 'object-top',
    },
    {
        nombre: 'Pozo a tierra y tablero',
        motivo: 'Medición con certificado y llaves diferenciales.',
        categoria: 'electricas',
        foto: '/images/tablero-electrico.webp',
    },
    { nombre: 'Luces de emergencia', motivo: 'Encienden solas si se corta la luz.', categoria: 'incendios', foto: '/images/luz-emergencia.svg' },
    { nombre: 'Extintor Clase K', motivo: 'Si cocinas o fríes con aceite.', categoria: 'incendios', foto: '/images/cocina-comercial.webp' },
    { nombre: 'Anclaje de estantes', motivo: 'Estantes altos fijados a la pared.', categoria: 'estructuras', foto: '/images/estanteria.webp' },
] as const;

/** Foto que representa cada especialidad: el emprendedor reconoce lo que necesita sin leer. */
const FOTO_CATEGORIA: Record<string, string> = {
    incendios: '/images/extintor.webp',
    electricas: '/images/tablero-electrico.webp',
    arquitectura_senaletica: '/images/salida-emergencia.webp',
    estructuras: '/images/estanteria.webp',
    gas: '/images/balon-gas.webp',
};

/** Cómo se usa el directorio, en tres pasos con imagen. */
const PASOS_DIRECTORIO = [
    { icono: Search, titulo: 'Elige lo que te falta', texto: 'Toca la foto: extintores, señales, electricistas…', foto: '/images/extintor.webp' },
    {
        icono: MapPin,
        titulo: 'Compara cerca de ti',
        texto: 'Filtra por tu distrito y mira qué ofrece cada uno.',
        foto: '/images/huancayo-plaza.webp',
    },
    {
        icono: MessageCircle,
        titulo: 'Escríbeles por WhatsApp',
        texto: 'Pide tu cotización directo, sin intermediarios.',
        foto: '/images/emprendedora-tienda.webp',
    },
] as const;

/** Cómo llega un cliente a un proveedor, de la simulación al WhatsApp. */
const FLUJO_CLIENTE = [
    { icono: Store, texto: 'Un negocio simula su local en CheckITSE' },
    { icono: Flame, texto: 'Descubre que le falta un extintor' },
    { icono: Megaphone, texto: 'Ve tu ficha en su lista de pendientes' },
    { icono: MessageCircle, texto: 'Te escribe por WhatsApp para cotizar' },
] as const;

const retraso = (i: number, paso = 110) => ({ ['--retraso' as string]: `${i * paso}ms` });

const RAZONES_PROVEEDOR = [
    { icono: Target, titulo: 'Clientes con una necesidad real', texto: 'Te mostramos justo cuando un local descubre que le falta lo que vendes.' },
    { icono: Users, titulo: 'Negocios nuevos cada mes', texto: 'Cada local que abre en Huancayo necesita extintores, señales y revisión eléctrica.' },
    { icono: BarChart3, titulo: 'Resultados medibles', texto: 'Sabes cuántas personas vieron tu ficha y te escribieron por WhatsApp.' },
] as const;

const FOTOS_PROVEEDORES: Diapositiva[] = [
    { foto: '/images/tablero-electrico.webp', rubro: 'Electricistas', posicion: 'object-center' },
    { foto: '/images/extintor.webp', rubro: 'Extintores y recargas', posicion: 'object-center' },
    { foto: '/images/cocina-comercial.webp', rubro: 'Cocinas y campanas', posicion: 'object-center' },
    { foto: '/images/salida-emergencia.webp', rubro: 'Señalética', posicion: 'object-top' },
    { foto: '/images/estanteria.webp', rubro: 'Anclajes y estructuras', posicion: 'object-center' },
];

function irA(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

export default function Directorio({ aliados, planes = [], filtros, categorias, distritos }: Readonly<DirectorioProps>) {
    const [aliadoSeleccionado, setAliadoSeleccionado] = useState<AliadoAsistenciaContrato | null>(null);
    const [mapaAbierto, setMapaAbierto] = useState<string | null>(null);
    const usuario = (usePage().props as { auth?: { user?: { tipo_cuenta?: string } | null } }).auth?.user ?? null;
    const esProveedor = usuario?.tipo_cuenta === 'proveedor';
    // Con una cuenta de emprendedor (o admin) no se puede vender: se explica y se ofrece crear la cuenta de proveedor.
    const otraCuenta = usuario !== null && !esProveedor;
    const [avisoCuenta, setAvisoCuenta] = useState(false);

    const filtroCategoria = filtros.categoria ?? '';
    const filtroDistrito = filtros.distrito ?? '';
    const hayFiltros = Boolean(filtroCategoria || filtroDistrito);

    const aplicarFiltro = (clave: 'categoria' | 'distrito', valor: string) => {
        router.get(
            '/directorio',
            { categoria: filtroCategoria, distrito: filtroDistrito, [clave]: valor },
            { preserveState: true, preserveScroll: true, replace: true, onSuccess: () => irA('proveedores') },
        );
    };

    const limpiarFiltros = () => router.get('/directorio', {}, { preserveState: true, preserveScroll: true, replace: true });

    const claseChip = (activo: boolean) =>
        `inline-flex min-h-12 cursor-pointer items-center rounded-full border px-5 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ${
            activo ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
        }`;

    return (
        <>
            <Head title="Aliados técnicos - CheckITSE Huancayo" />

            {/* HERO con fotos de proveedores en movimiento */}
            <HeroCinematico
                alto="compacto"
                etiqueta="Aliados técnicos de Huancayo"
                diapositivas={FOTOS_PROVEEDORES}
                titulo={
                    <>
                        Todo lo que tu local necesita
                        <span className="font-acento text-primary-300 block font-semibold italic">para pasar la ITSE.</span>
                    </>
                }
                texto="Extintores, señalética, luces de emergencia y técnicos electricistas cerca de ti. Compara precios y escríbeles directo por WhatsApp."
                acciones={
                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => irA('proveedores')}
                            className="bg-sun-400 text-ink-900 hover:bg-sun-300 inline-flex min-h-14 cursor-pointer items-center gap-2 rounded-full px-8 text-lg font-bold"
                        >
                            <Search aria-hidden="true" className="size-5" /> Buscar proveedores
                        </button>
                        <a
                            href="#anunciate"
                            className="inline-flex min-h-14 items-center gap-2 rounded-full border border-white/40 px-7 text-lg font-semibold backdrop-blur-sm hover:bg-white/10"
                        >
                            <Megaphone aria-hidden="true" className="size-5" /> Quiero anunciar
                        </a>
                    </div>
                }
                pie={
                    <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-base text-slate-200">
                        <li className="flex items-center gap-2">
                            <BadgeCheck aria-hidden="true" className="text-primary-300 size-5" /> {aliados.length}{' '}
                            {aliados.length === 1 ? 'proveedor' : 'proveedores'}
                        </li>
                        <li className="flex items-center gap-2">
                            <MapPin aria-hidden="true" className="text-primary-300 size-5" /> Huancayo, El Tambo y Chilca
                        </li>
                        <li className="flex items-center gap-2">
                            <MessageCircle aria-hidden="true" className="text-primary-300 size-5" /> Contacto directo
                        </li>
                    </ul>
                }
            />

            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                {/* CÓMO FUNCIONA: tres pasos con imagen para quien entra por primera vez */}
                <section aria-labelledby="como-directorio-titulo" className="mt-16">
                    <p data-revelar className="text-primary-700 inline-flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase">
                        <span aria-hidden="true" className="bg-primary-600 h-px w-8" /> Primera vez aquí
                    </p>
                    <h2
                        id="como-directorio-titulo"
                        data-revelar
                        className="mt-3 text-4xl leading-[1.05] font-extrabold tracking-tight text-slate-900 sm:text-5xl"
                    >
                        Así de fácil, <span className="font-acento text-primary-700 font-semibold italic">en 3 pasos</span>
                    </h2>
                    <ol className="mt-10 grid gap-5 md:grid-cols-3">
                        {PASOS_DIRECTORIO.map((paso, i) => {
                            const Icono = paso.icono;
                            return (
                                <li
                                    key={paso.titulo}
                                    data-revelar
                                    style={retraso(i, 140)}
                                    className="group relative flex items-center gap-5 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl">
                                        <img
                                            src={paso.foto}
                                            alt=""
                                            loading="lazy"
                                            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                                        />
                                        <span className="bg-ink-900/40 absolute inset-0 flex items-center justify-center">
                                            <span className="bg-primary flex size-12 items-center justify-center rounded-full text-white ring-4 ring-white/40">
                                                <Icono aria-hidden="true" className="size-6" />
                                            </span>
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-display text-primary-700 text-sm font-bold">Paso {i + 1}</p>
                                        <h3 className="text-xl leading-snug font-bold text-slate-900">{paso.titulo}</h3>
                                        <p className="mt-1 text-base leading-snug text-slate-600">{paso.texto}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </section>

                {/* LO MÁS BUSCADO */}
                <section aria-labelledby="buscado-titulo" className="mt-24">
                    <p data-revelar className="text-primary-700 inline-flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase">
                        <span aria-hidden="true" className="bg-primary-600 h-px w-8" /> Lo más buscado
                    </p>
                    <h2
                        id="buscado-titulo"
                        data-revelar
                        className="mt-3 text-4xl leading-[1.05] font-extrabold tracking-tight text-slate-900 sm:text-5xl"
                    >
                        Lo que más le falta a un local nuevo
                    </h2>
                    <p data-revelar className="mt-3 text-lg text-slate-600">
                        Toca un producto para ver quién lo vende o instala.
                    </p>
                    <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                        {LO_MAS_BUSCADO.map((item, i) => (
                            <li key={item.nombre} data-revelar style={retraso(i, 80)}>
                                <button
                                    type="button"
                                    onClick={() => aplicarFiltro('categoria', item.categoria)}
                                    className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-left transition hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <span className="block overflow-hidden">
                                        <img
                                            src={item.foto}
                                            alt=""
                                            loading="lazy"
                                            className={`h-32 w-full object-cover transition duration-700 group-hover:scale-110 sm:h-52 ${'encuadre' in item ? item.encuadre : ''}`}
                                        />
                                    </span>
                                    <span className="flex flex-1 flex-col p-4 sm:p-5">
                                        <span className="block text-lg leading-snug font-bold text-slate-900 sm:text-xl">{item.nombre}</span>
                                        <span className="mt-1 block text-base text-slate-600">{item.motivo}</span>
                                        <span className="text-primary-700 mt-auto inline-flex items-center gap-1.5 pt-3 text-base font-bold">
                                            Ver proveedores <ArrowRight aria-hidden="true" className="size-4" />
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* PROVEEDORES */}
                <section id="proveedores" aria-labelledby="proveedores-titulo" className="mt-24 scroll-mt-24">
                    <p data-revelar className="text-primary-700 inline-flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase">
                        <span aria-hidden="true" className="bg-primary-600 h-px w-8" /> Directorio
                    </p>
                    <h2
                        id="proveedores-titulo"
                        data-revelar
                        className="mt-3 text-4xl leading-[1.05] font-extrabold tracking-tight text-slate-900 sm:text-5xl"
                    >
                        Proveedores de <span className="font-acento text-primary-700 font-semibold italic">tu zona</span>
                    </h2>
                    <div data-revelar className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <fieldset>
                            <legend className="text-lg font-bold text-slate-900">1. ¿Qué necesitas?</legend>
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                {categorias.map((categoria) => {
                                    const activo = filtroCategoria === categoria.valor;
                                    const foto = FOTO_CATEGORIA[categoria.valor];
                                    return (
                                        <button
                                            key={`categoria-${categoria.valor || 'todas'}`}
                                            type="button"
                                            onClick={() => aplicarFiltro('categoria', categoria.valor)}
                                            aria-pressed={activo}
                                            className={`group bg-ink-900 relative flex h-28 cursor-pointer items-end overflow-hidden rounded-2xl p-3 text-left text-white transition focus-visible:ring-4 focus-visible:outline-none sm:h-32 ${activo ? 'ring-primary-500 ring-4 ring-offset-2' : 'hover:-translate-y-0.5'}`}
                                        >
                                            {foto ? (
                                                <img
                                                    src={foto}
                                                    alt=""
                                                    loading="lazy"
                                                    className={`absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-110 ${categoria.valor === 'arquitectura_senaletica' ? 'object-top' : ''}`}
                                                />
                                            ) : (
                                                <span aria-hidden="true" className="trama-andina absolute inset-0" />
                                            )}
                                            <span
                                                aria-hidden="true"
                                                className="from-ink-900 absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
                                            />
                                            {activo && (
                                                <span className="bg-primary absolute top-2 right-2 flex size-7 items-center justify-center rounded-full">
                                                    <Check aria-hidden="true" className="size-4" />
                                                </span>
                                            )}
                                            <span className="relative text-base leading-tight font-bold">{categoria.etiqueta}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend className="text-lg font-bold text-slate-900">2. ¿Dónde está tu local?</legend>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {distritos.map((distrito) => (
                                    <button
                                        key={`distrito-${distrito.valor || 'todos'}`}
                                        type="button"
                                        onClick={() => aplicarFiltro('distrito', distrito.valor)}
                                        aria-pressed={filtroDistrito === distrito.valor}
                                        className={`${claseChip(filtroDistrito === distrito.valor)} gap-2`}
                                    >
                                        <MapPin aria-hidden="true" className="size-4" />
                                        {distrito.etiqueta}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                        {hayFiltros && (
                            <button
                                type="button"
                                onClick={limpiarFiltros}
                                className="text-primary-700 min-h-11 cursor-pointer text-base font-bold underline underline-offset-2"
                            >
                                Quitar filtros
                            </button>
                        )}
                    </div>

                    {aliados.length === 0 ? (
                        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-10 text-center">
                            <Store aria-hidden="true" className="mx-auto size-10 text-slate-400" />
                            <p className="mt-4 text-xl font-bold text-slate-900">No hay proveedores con estos filtros</p>
                            <p className="mt-1 text-base text-slate-600">Prueba con otra especialidad o con todos los distritos.</p>
                            <button
                                type="button"
                                onClick={limpiarFiltros}
                                className="bg-ink-900 mt-5 min-h-12 cursor-pointer rounded-xl px-6 text-base font-bold text-white"
                            >
                                Ver todos
                            </button>
                        </div>
                    ) : (
                        <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {aliados.map((aliado, i) => {
                                const Icono = ICONO_CATEGORIA[aliado.categoria] ?? Store;
                                const destacado = Boolean(aliado.plan && aliado.plan !== 'basico');
                                return (
                                    <li
                                        key={aliado.id}
                                        data-revelar
                                        style={retraso(i % 3, 110)}
                                        className={`flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${destacado ? 'border-sun-400 ring-sun-100 ring-4' : 'border-slate-200'}`}
                                    >
                                        {/* Portada con la foto de su especialidad: se reconoce qué vende sin leer */}
                                        <div className="bg-ink-900 relative h-32 overflow-hidden">
                                            <img
                                                src={FOTO_CATEGORIA[aliado.categoria] ?? '/images/huancayo-plaza.webp'}
                                                alt=""
                                                loading="lazy"
                                                className={`h-full w-full object-cover opacity-75 ${aliado.categoria === 'arquitectura_senaletica' ? 'object-top' : ''}`}
                                            />
                                            <span aria-hidden="true" className="from-ink-900/80 absolute inset-0 bg-gradient-to-t to-transparent" />
                                            <span className="absolute top-3 right-3 flex flex-wrap justify-end gap-2">
                                                {destacado && (
                                                    <span className="bg-sun-400 text-ink-900 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold">
                                                        ★ Destacado
                                                    </span>
                                                )}
                                                {aliado.verificado && (
                                                    <span className="text-ink-900 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-bold">
                                                        <ShieldCheck aria-hidden="true" className="text-primary-600 size-4" /> Verificado
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex flex-1 flex-col px-6 pb-6">
                                            <span className="bg-primary relative -mt-7 flex size-14 shrink-0 items-center justify-center rounded-2xl text-white ring-4 ring-white">
                                                <Icono aria-hidden="true" className="size-7" />
                                            </span>
                                            <h3 className="mt-4 text-xl leading-snug font-bold text-slate-900">{aliado.nombre_comercial}</h3>
                                            <p className="text-primary-700 mt-1 text-base font-semibold">
                                                {ETIQUETA_CATEGORIA[aliado.categoria] ?? 'Soporte técnico'}
                                            </p>
                                            <p className="mt-3 text-base leading-relaxed text-slate-600">{aliado.especialidad_texto}</p>
                                            <p className="mt-3 flex items-start gap-2 text-base text-slate-600">
                                                <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-slate-400" />
                                                {aliado.sede}
                                                {aliado.cobertura ? ` · Atiende: ${aliado.cobertura}` : ''}
                                            </p>
                                            {aliado.servicios?.length > 0 && (
                                                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                                                    {aliado.servicios.slice(0, 3).map((servicio) => (
                                                        <li key={servicio} className="flex items-start gap-2 text-base leading-snug text-slate-700">
                                                            <Check aria-hidden="true" className="text-primary-600 mt-0.5 size-5 shrink-0" />
                                                            {servicio}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <div className="mt-4">
                                                <button
                                                    type="button"
                                                    aria-expanded={mapaAbierto === aliado.id}
                                                    onClick={() => setMapaAbierto(mapaAbierto === aliado.id ? null : aliado.id)}
                                                    className="text-primary-700 inline-flex min-h-11 cursor-pointer items-center gap-2 text-base font-semibold underline underline-offset-2"
                                                >
                                                    <MapPin aria-hidden="true" className="size-5" />
                                                    {mapaAbierto === aliado.id ? 'Ocultar mapa' : `Ver zona en el mapa (${aliado.sede})`}
                                                </button>
                                                {mapaAbierto === aliado.id && (
                                                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                                                        <iframe
                                                            title={`Mapa de la zona de ${aliado.nombre_comercial}`}
                                                            src={mapaProveedor(aliado).embed}
                                                            loading="lazy"
                                                            referrerPolicy="no-referrer-when-downgrade"
                                                            className="h-56 w-full border-0"
                                                        />
                                                        <a
                                                            href={mapaProveedor(aliado).abrir}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary-700 flex min-h-11 items-center justify-center text-base font-semibold"
                                                        >
                                                            Abrir en Google Maps
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-auto pt-6">
                                                <button
                                                    type="button"
                                                    onClick={() => setAliadoSeleccionado(aliado)}
                                                    className="bg-primary hover:bg-primary-700 flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-lg font-bold text-white"
                                                >
                                                    <MessageCircle aria-hidden="true" className="size-5" /> Pedir cotización
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <p className="mt-5 text-base leading-relaxed text-slate-500">
                        Tú eliges con quién trabajar. Los proveedores con plan pagado aparecen marcados. Ningún proveedor puede garantizar la
                        aprobación de tu ITSE: eso solo lo decide tu municipalidad.
                    </p>
                </section>

                {/* PARA PROVEEDORES */}
                <section id="anunciate" aria-labelledby="anunciate-titulo" className="mt-24 scroll-mt-24">
                    <div data-revelar="zoom" className="bg-ink-900 overflow-hidden rounded-3xl text-white">
                        <div className="grid lg:grid-cols-2">
                            <div className="p-8 sm:p-12">
                                <p className="text-sun-300 inline-flex items-center gap-2 text-base font-bold">
                                    <Megaphone aria-hidden="true" className="size-5" /> Para proveedores e inversionistas
                                </p>
                                <h2 id="anunciate-titulo" className="mt-3 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
                                    Vende a los negocios justo cuando te necesitan
                                </h2>
                                <p className="mt-4 text-lg leading-relaxed text-slate-200">
                                    Cuando un emprendedor termina su simulación, ve la lista de lo que le falta. Ahí aparece tu negocio, con tu
                                    WhatsApp, listo para cotizar.
                                </p>
                                <ul className="mt-8 space-y-5">
                                    {RAZONES_PROVEEDOR.map((razon) => {
                                        const Icono = razon.icono;
                                        return (
                                            <li key={razon.titulo} className="flex gap-4">
                                                <span className="bg-sun-400 text-ink-900 flex size-11 shrink-0 items-center justify-center rounded-xl">
                                                    <Icono aria-hidden="true" className="size-6" />
                                                </span>
                                                <span>
                                                    <span className="block text-lg font-bold">{razon.titulo}</span>
                                                    <span className="block text-base text-slate-300">{razon.texto}</span>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                            <div className="relative min-h-72">
                                <img
                                    src="/images/tablero-electrico.webp"
                                    alt="Técnico revisando un tablero eléctrico"
                                    loading="lazy"
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Así te encuentra un cliente: del diagnóstico al WhatsApp */}
                    <div className="mt-10">
                        <h3 data-revelar className="font-display text-center text-3xl font-extrabold tracking-tight text-slate-900">
                            Así te encuentra un cliente
                        </h3>
                        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {FLUJO_CLIENTE.map((paso, i) => {
                                const Icono = paso.icono;
                                return (
                                    <li
                                        key={paso.texto}
                                        data-revelar
                                        style={retraso(i, 150)}
                                        className="relative flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm"
                                    >
                                        <span className="bg-sun-100 text-sun-700 font-display absolute top-4 left-4 flex size-8 items-center justify-center rounded-full text-sm font-bold">
                                            {i + 1}
                                        </span>
                                        <span
                                            className={`flex size-16 items-center justify-center rounded-full ${i === FLUJO_CLIENTE.length - 1 ? 'bg-primary animate-latido text-white' : 'bg-ink-900 text-white'}`}
                                        >
                                            <Icono aria-hidden="true" className="size-7" />
                                        </span>
                                        <p className="mt-4 text-lg leading-snug font-semibold text-slate-800">{paso.texto}</p>
                                        {i < FLUJO_CLIENTE.length - 1 && (
                                            <ArrowRight
                                                aria-hidden="true"
                                                className="text-primary-500 absolute top-1/2 -right-4 z-10 hidden size-7 -translate-y-1/2 lg:block"
                                            />
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </div>

                    {planes.length > 0 && (
                        <>
                            <h3 className="mt-12 text-center text-3xl font-extrabold tracking-tight text-slate-900">Elige tu plan</h3>
                            <p className="mt-2 text-center text-lg text-slate-600">
                                Sin contratos. Paga 1, 3 o 12 meses (con hasta 20% de descuento) por Yape o Plin.
                            </p>
                            {avisoCuenta && <AvisoCuentaProveedor onCerrar={() => setAvisoCuenta(false)} />}
                            <ul className="mt-8 grid gap-5 lg:grid-cols-3">
                                {planes.map((plan, i) => (
                                    <li
                                        key={plan.id}
                                        data-revelar
                                        style={retraso(i, 130)}
                                        className={`relative flex flex-col rounded-3xl border bg-white p-8 ${plan.destacado ? 'border-primary shadow-primary-900/10 ring-primary shadow-xl ring-2' : 'border-slate-200'}`}
                                    >
                                        {plan.destacado && (
                                            <span className="bg-primary absolute -top-4 left-8 rounded-full px-4 py-1 text-sm font-bold text-white">
                                                {plan.etiqueta ?? 'Más elegido'}
                                            </span>
                                        )}
                                        <p className="text-2xl font-extrabold text-slate-900">{plan.nombre}</p>
                                        <p className="mt-1 text-base text-slate-600">{plan.descripcion}</p>
                                        <p className="mt-6">
                                            <span className="text-5xl font-extrabold text-slate-900">
                                                {plan.precio === 0 ? 'Gratis' : `S/ ${plan.precio}`}
                                            </span>
                                            {plan.precio > 0 && <span className="text-lg text-slate-500"> /mes</span>}
                                        </p>
                                        <ul className="mt-6 space-y-3">
                                            {plan.beneficios.map((beneficio) => (
                                                <li key={beneficio} className="flex gap-2 text-base text-slate-700">
                                                    <Check aria-hidden="true" className="text-primary-600 mt-0.5 size-5 shrink-0" />
                                                    {beneficio}
                                                </li>
                                            ))}
                                        </ul>
                                        {otraCuenta ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAvisoCuenta(true);
                                                    requestAnimationFrame(() =>
                                                        document
                                                            .getElementById('aviso-cuenta')
                                                            ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
                                                    );
                                                }}
                                                className={`mt-8 flex min-h-13 w-full cursor-pointer items-center justify-center rounded-xl text-lg font-bold ${plan.destacado ? 'bg-primary hover:bg-primary-700 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                                            >
                                                {textoBotonPlan(plan, false)}
                                            </button>
                                        ) : (
                                            <Link
                                                href={esProveedor ? route('proveedor.plan') : '/registro?tipo=proveedor'}
                                                className={`mt-8 flex min-h-13 w-full items-center justify-center rounded-xl text-lg font-bold ${plan.destacado ? 'bg-primary hover:bg-primary-700 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                                            >
                                                {textoBotonPlan(plan, esProveedor)}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </section>

                <div className="mt-12 flex justify-center">
                    <Link
                        href={route('autoevaluacion.nueva')}
                        className="text-primary-700 inline-flex min-h-12 items-center gap-2 text-lg font-bold underline underline-offset-4"
                    >
                        ¿Aún no sabes qué le falta a tu local? Simúlalo gratis <ArrowRight aria-hidden="true" className="size-5" />
                    </Link>
                </div>
            </div>

            <ModalContactoProveedor
                isOpen={aliadoSeleccionado !== null}
                onClose={() => setAliadoSeleccionado(null)}
                aliado={aliadoSeleccionado}
                distritoSeleccionado={filtroDistrito}
            />
        </>
    );
}

Directorio.layout = (page: React.ReactNode) => (
    <AppLayout ancho="completo" navSobreImagen>
        {page}
    </AppLayout>
);
