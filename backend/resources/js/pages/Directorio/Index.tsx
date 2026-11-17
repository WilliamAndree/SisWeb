import { ModalContactoProveedor } from '@/components/Directorio/ModalContactoProveedor';
import { mapaZona } from '@/lib/item-visual';
import type { AliadoAsistenciaContrato } from '@/types/contrato';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    BarChart3,
    Check,
    Compass,
    DoorClosed,
    Flame,
    Lightbulb,
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

export interface PlanProveedor {
    id: string;
    nombre: string;
    precio: number;
    descripcion: string;
    destacado: boolean;
    beneficios: string[];
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
    },
    {
        nombre: 'Pozo a tierra y tablero',
        motivo: 'Medición con certificado y llaves diferenciales.',
        categoria: 'electricas',
        foto: '/images/tablero-electrico.webp',
    },
] as const;

const LO_MAS_BUSCADO_ICONOS = [
    { nombre: 'Luces de emergencia', motivo: 'Encienden solas si se corta la luz.', categoria: 'incendios', icono: Lightbulb },
    { nombre: 'Extintor Clase K', motivo: 'Si cocinas o fríes con aceite.', categoria: 'incendios', icono: Flame },
    { nombre: 'Anclaje de estantes', motivo: 'Estantes altos fijados a la pared.', categoria: 'estructuras', icono: DoorClosed },
] as const;

const RAZONES_PROVEEDOR = [
    { icono: Target, titulo: 'Clientes con una necesidad real', texto: 'Te mostramos justo cuando un local descubre que le falta lo que vendes.' },
    { icono: Users, titulo: 'Negocios nuevos cada mes', texto: 'Cada local que abre en Huancayo necesita extintores, señales y revisión eléctrica.' },
    { icono: BarChart3, titulo: 'Resultados medibles', texto: 'Sabes cuántas personas vieron tu ficha y te escribieron por WhatsApp.' },
] as const;

function irA(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

export default function Directorio({ aliados, planes = [], filtros, categorias, distritos }: Readonly<DirectorioProps>) {
    const [aliadoSeleccionado, setAliadoSeleccionado] = useState<AliadoAsistenciaContrato | null>(null);
    const [mapaAbierto, setMapaAbierto] = useState<string | null>(null);

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

            {/* HERO */}
            <header className="bg-ink-900 relative overflow-hidden rounded-3xl pb-[18px] text-white">
                <div aria-hidden="true" className="franja-andina absolute inset-x-0 bottom-0 z-10" />
                <img src="/images/extintor.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
                <div aria-hidden="true" className="from-ink-900 via-ink-900/90 absolute inset-0 bg-gradient-to-r to-transparent" />
                <div className="relative max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
                    <p className="text-sun-300 inline-flex items-center gap-2 text-base font-bold">
                        <Store aria-hidden="true" className="size-5" /> Aliados técnicos de Huancayo
                    </p>
                    <h1 className="mt-4 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
                        Todo lo que tu local necesita para pasar la ITSE
                    </h1>
                    <p className="mt-4 text-xl leading-relaxed text-slate-200">
                        Extintores, señalética, luces de emergencia y técnicos electricistas cerca de ti. Escríbeles directo por WhatsApp.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => irA('proveedores')}
                            className="bg-sun-400 text-ink-900 hover:bg-sun-300 inline-flex min-h-14 cursor-pointer items-center gap-2 rounded-xl px-7 text-lg font-bold"
                        >
                            <Search aria-hidden="true" className="size-5" /> Buscar proveedores
                        </button>
                        <a
                            href="#anunciate"
                            className="inline-flex min-h-14 items-center gap-2 rounded-xl border border-white/25 px-6 text-lg font-semibold hover:bg-white/10"
                        >
                            <Megaphone aria-hidden="true" className="size-5" /> Quiero anunciar
                        </a>
                    </div>
                    <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-base text-slate-200">
                        <li className="flex items-center gap-2">
                            <BadgeCheck aria-hidden="true" className="text-primary-300 size-5" /> {aliados.length} proveedores
                        </li>
                        <li className="flex items-center gap-2">
                            <MapPin aria-hidden="true" className="text-primary-300 size-5" /> Huancayo, El Tambo y Chilca
                        </li>
                        <li className="flex items-center gap-2">
                            <MessageCircle aria-hidden="true" className="text-primary-300 size-5" /> Contacto directo
                        </li>
                    </ul>
                </div>
            </header>

            {/* LO MÁS BUSCADO */}
            <section aria-labelledby="buscado-titulo" className="mt-16">
                <p className="text-primary-700 text-base font-bold">Lo más buscado</p>
                <h2 id="buscado-titulo" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    Lo que más le falta a un local nuevo
                </h2>
                <p className="mt-3 text-lg text-slate-600">Toca un producto para ver quién lo vende o instala.</p>
                <ul className="mt-8 grid gap-4 md:grid-cols-3">
                    {LO_MAS_BUSCADO.map((item) => (
                        <li key={item.nombre}>
                            <button
                                type="button"
                                onClick={() => aplicarFiltro('categoria', item.categoria)}
                                className="group w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:shadow-lg"
                            >
                                <img
                                    src={item.foto}
                                    alt=""
                                    loading="lazy"
                                    className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                                <span className="block p-5">
                                    <span className="block text-xl font-bold text-slate-900">{item.nombre}</span>
                                    <span className="mt-1 block text-base text-slate-600">{item.motivo}</span>
                                    <span className="text-primary-700 mt-3 inline-flex items-center gap-1.5 text-base font-bold">
                                        Ver proveedores <ArrowRight aria-hidden="true" className="size-4" />
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
                <ul className="mt-4 grid gap-4 md:grid-cols-3">
                    {LO_MAS_BUSCADO_ICONOS.map((item) => {
                        const Icono = item.icono;
                        return (
                            <li key={item.nombre}>
                                <button
                                    type="button"
                                    onClick={() => aplicarFiltro('categoria', item.categoria)}
                                    className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:shadow-md"
                                >
                                    <span className="bg-primary-50 text-primary-700 flex size-14 shrink-0 items-center justify-center rounded-xl">
                                        <Icono aria-hidden="true" className="size-7" />
                                    </span>
                                    <span>
                                        <span className="block text-lg font-bold text-slate-900">{item.nombre}</span>
                                        <span className="block text-base text-slate-600">{item.motivo}</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* PROVEEDORES */}
            <section id="proveedores" aria-labelledby="proveedores-titulo" className="mt-16 scroll-mt-24">
                <h2 id="proveedores-titulo" className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    Proveedores
                </h2>
                <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                    <fieldset>
                        <legend className="text-base font-bold text-slate-800">¿Qué necesitas?</legend>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {categorias.map((categoria) => (
                                <button
                                    key={`categoria-${categoria.valor || 'todas'}`}
                                    type="button"
                                    onClick={() => aplicarFiltro('categoria', categoria.valor)}
                                    aria-pressed={filtroCategoria === categoria.valor}
                                    className={claseChip(filtroCategoria === categoria.valor)}
                                >
                                    {categoria.etiqueta}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset className="border-t border-slate-100 pt-4">
                        <legend className="text-base font-bold text-slate-800">¿Dónde está tu local?</legend>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {distritos.map((distrito) => (
                                <button
                                    key={`distrito-${distrito.valor || 'todos'}`}
                                    type="button"
                                    onClick={() => aplicarFiltro('distrito', distrito.valor)}
                                    aria-pressed={filtroDistrito === distrito.valor}
                                    className={claseChip(filtroDistrito === distrito.valor)}
                                >
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
                        {aliados.map((aliado) => {
                            const Icono = ICONO_CATEGORIA[aliado.categoria] ?? Store;
                            return (
                                <li key={aliado.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="bg-primary-50 text-primary-700 flex size-14 shrink-0 items-center justify-center rounded-2xl">
                                            <Icono aria-hidden="true" className="size-7" />
                                        </span>
                                        {aliado.verificado && (
                                            <span className="bg-primary-50 text-primary-800 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold">
                                                <ShieldCheck aria-hidden="true" className="size-4" /> Verificado
                                            </span>
                                        )}
                                    </div>
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
                                                    src={mapaZona(aliado.sede || 'Huancayo').embed}
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                    className="h-56 w-full border-0"
                                                />
                                                <a
                                                    href={mapaZona(aliado.sede || 'Huancayo').abrir}
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
                                </li>
                            );
                        })}
                    </ul>
                )}
                <p className="mt-5 text-base leading-relaxed text-slate-500">
                    Tú eliges con quién trabajar. Los proveedores con plan pagado aparecen marcados. Ningún proveedor puede garantizar la aprobación
                    de tu ITSE: eso solo lo decide tu municipalidad.
                </p>
            </section>

            {/* PARA PROVEEDORES */}
            <section id="anunciate" aria-labelledby="anunciate-titulo" className="mt-20 scroll-mt-24">
                <div className="bg-ink-900 overflow-hidden rounded-3xl text-white">
                    <div className="grid lg:grid-cols-2">
                        <div className="p-8 sm:p-12">
                            <p className="text-sun-300 inline-flex items-center gap-2 text-base font-bold">
                                <Megaphone aria-hidden="true" className="size-5" /> Para proveedores e inversionistas
                            </p>
                            <h2 id="anunciate-titulo" className="mt-3 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
                                Vende a los negocios justo cuando te necesitan
                            </h2>
                            <p className="mt-4 text-lg leading-relaxed text-slate-200">
                                Cuando un emprendedor termina su simulación, ve la lista de lo que le falta. Ahí aparece tu negocio, con tu WhatsApp,
                                listo para cotizar.
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

                {planes.length > 0 && (
                    <>
                        <h3 className="mt-12 text-center text-3xl font-extrabold tracking-tight text-slate-900">Elige tu plan</h3>
                        <p className="mt-2 text-center text-lg text-slate-600">Precios de lanzamiento. Sin contratos: cancela cuando quieras.</p>
                        <ul className="mt-8 grid gap-5 lg:grid-cols-3">
                            {planes.map((plan) => (
                                <li
                                    key={plan.id}
                                    className={`relative flex flex-col rounded-3xl border bg-white p-8 ${plan.destacado ? 'border-primary shadow-primary-900/10 ring-primary shadow-xl ring-2' : 'border-slate-200'}`}
                                >
                                    {plan.destacado && (
                                        <span className="bg-primary absolute -top-4 left-8 rounded-full px-4 py-1 text-sm font-bold text-white">
                                            Más elegido
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
                                    <Link
                                        href={route('directorio.afiliacion', { plan: plan.id })}
                                        className={`mt-8 flex min-h-13 w-full items-center justify-center rounded-xl text-lg font-bold ${plan.destacado ? 'bg-primary hover:bg-primary-700 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                                    >
                                        {plan.precio === 0 ? 'Registrarme gratis' : `Quiero el plan ${plan.nombre}`}
                                    </Link>
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

            <ModalContactoProveedor
                isOpen={aliadoSeleccionado !== null}
                onClose={() => setAliadoSeleccionado(null)}
                aliado={aliadoSeleccionado}
                distritoSeleccionado={filtroDistrito}
            />
        </>
    );
}
