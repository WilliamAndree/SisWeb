import type { AliadoAsistencia, CriterioAsistencia } from '@/components/Evaluacion/NubeAsistenciaModal';
import { registrarEvento } from '@/lib/eventos';
import { enlaceWhatsapp, mapaProveedor, visualDeItem, type IconoItem } from '@/lib/item-visual';
import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    BellRing,
    Boxes,
    Camera,
    CheckCircle2,
    ChefHat,
    Flame,
    Footprints,
    Gauge,
    HeartPulse,
    Lightbulb,
    MapPin,
    MessageCircle,
    Signpost,
    Star,
    Users,
    Wallet,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface ProveedorOferta extends AliadoAsistencia {
    plan?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    ubicacion_exacta?: boolean;
    direccion?: string | null;
}

export interface OfertaItem {
    id: number;
    nombre: string;
    descripcion?: string | null;
    precio_soles: number;
    unidad: string;
    proveedor: ProveedorOferta;
}

type AsistenciaConOfertas = CriterioAsistencia & { ofertas?: OfertaItem[] | null };

export interface ItemFaltante {
    codigo: string;
    titulo: string;
    estado?: string | null;
    que_observar?: string | null;
    accion_mejora_orientativa?: string | null;
    asistencia?: AsistenciaConOfertas | null;
}

interface LoQueTeFaltaProps {
    readonly items: ItemFaltante[];
    readonly nombreLocal?: string | null;
    /** UUID de la evaluación: la elección del cliente se recuerda por evaluación. */
    readonly claveSeleccion?: string | null;
    readonly onAdjuntarEvidencia?: (codigo: string) => void;
}

const ICONOS: Record<IconoItem, LucideIcon> = {
    extintor: Flame,
    senal: Signpost,
    electricidad: Zap,
    luz: Lightbulb,
    botiquin: HeartPulse,
    gas: Flame,
    escalera: Footprints,
    estante: Boxes,
    alarma: BellRing,
    cocina: ChefHat,
    caldero: Gauge,
    aforo: Users,
};

const soles = (monto: number) => `S/ ${monto.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function Imagen({ codigo, titulo, alto }: Readonly<{ codigo: string; titulo: string; alto: string }>) {
    const visual = visualDeItem(codigo, titulo);
    if (visual.imagen) {
        return <img src={visual.imagen} alt="" loading="lazy" className={`${alto} w-full object-cover`} />;
    }
    const Icono = ICONOS[visual.icono];
    return (
        <div className={`${alto} bg-ink-800 trama-andina flex w-full items-center justify-center`}>
            <Icono aria-hidden="true" className="text-sun-300 size-14" />
        </div>
    );
}

/** Rango de costo: primero el de las ofertas reales; si no hay, el referencial del catálogo. */
function rangoCosto(asistencia?: AsistenciaConOfertas | null): { texto: string; desdeProveedores: boolean } | null {
    const ofertas = asistencia?.ofertas ?? [];
    if (ofertas.length > 0) {
        const precios = ofertas.map((o) => o.precio_soles);
        const min = Math.min(...precios);
        const max = Math.max(...precios);
        return { texto: min === max ? soles(min) : `${soles(min)} a ${soles(max)}`, desdeProveedores: true };
    }
    const rango = asistencia?.rango_costo;
    if (!rango || typeof rango === 'string') return rango ? { texto: rango, desdeProveedores: false } : null;
    const r = rango as { minimo_soles?: number; maximo_soles?: number };
    if (!r.minimo_soles || !r.maximo_soles) return null;
    return { texto: `${soles(Math.round(r.minimo_soles))} a ${soles(Math.round(r.maximo_soles))}`, desdeProveedores: false };
}

function guia(asistencia?: CriterioAsistencia | null): string[] {
    const g = asistencia?.guia_autoayuda;
    if (!g) return [];
    return (Array.isArray(g) ? g : [g]).slice(0, 3);
}

function precioTarjeta(precioElegido?: number, rangoTexto?: string): string {
    if (precioElegido !== undefined) return soles(precioElegido);
    return rangoTexto ? `Desde ${rangoTexto.split(' a ')[0]}` : 'Sin precio aún';
}

function textoBotonMapa(abierto: boolean, exacto: boolean): string {
    if (abierto) return 'Ocultar mapa';
    return exacto ? 'Cómo llegar' : 'Ver zona';
}

function textoOfertas(cantidad: number): string {
    return `Según ${cantidad} ${cantidad === 1 ? 'oferta' : 'ofertas'} de proveedores de Huancayo.`;
}

function leerSeleccion(clave?: string | null): Record<string, number> {
    if (!clave) return {};
    try {
        return JSON.parse(window.localStorage.getItem(`checkitse:eleccion:${clave}`) ?? '{}') as Record<string, number>;
    } catch {
        return {};
    }
}

function AccionesProveedor({
    proveedor,
    producto,
    nombreLocal,
    ofertaId,
}: Readonly<{ proveedor: ProveedorOferta; producto: string; nombreLocal?: string | null; ofertaId?: number }>) {
    const evento = { ofertaId, proveedor: proveedor.id };
    const [verMapa, setVerMapa] = useState(false);
    const whatsapp = enlaceWhatsapp(proveedor.whatsapp || proveedor.telefono || '', producto, nombreLocal);
    const mapa = mapaProveedor(proveedor);
    return (
        <>
            <div className="mt-3 flex flex-wrap gap-2">
                {whatsapp && (
                    <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => registrarEvento('clic_whatsapp', evento)}
                        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white hover:bg-emerald-700"
                    >
                        <MessageCircle aria-hidden="true" className="size-5" /> WhatsApp
                    </a>
                )}
                <button
                    type="button"
                    aria-expanded={verMapa}
                    onClick={() => {
                        if (!verMapa) registrarEvento('clic_mapa', evento);
                        setVerMapa((v) => !v);
                    }}
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 hover:bg-slate-50"
                >
                    <MapPin aria-hidden="true" className="size-5" /> {textoBotonMapa(verMapa, mapa.exacto)}
                </button>
            </div>
            {verMapa && (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                    <iframe
                        title={`Mapa de ${proveedor.nombre_comercial}`}
                        src={mapa.embed}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="h-60 w-full border-0"
                    />
                    <a
                        href={mapa.abrir}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-700 flex min-h-11 items-center justify-center gap-1.5 text-base font-semibold"
                    >
                        {mapa.exacto ? 'Abrir ruta en Google Maps' : 'Abrir en Google Maps'} <ArrowRight aria-hidden="true" className="size-4" />
                    </a>
                </div>
            )}
        </>
    );
}

/**
 * Panel principal de subsanación: lo que le falta al local, en grande y con foto.
 * Cada ítem muestra el precio desde los proveedores; al elegirlo se comparan las
 * ofertas y el cliente escoge la suya. Las elecciones suman "Tu presupuesto".
 */
export function LoQueTeFalta({ items, nombreLocal, claveSeleccion, onAdjuntarEvidencia }: Readonly<LoQueTeFaltaProps>) {
    const [seleccion, setSeleccion] = useState<string | null>(items[0]?.codigo ?? null);
    const [elecciones, setElecciones] = useState<Record<string, number>>({});
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => setElecciones(leerSeleccion(claveSeleccion)), [claveSeleccion]);

    const presupuesto = useMemo(() => {
        let total = 0;
        let elegidos = 0;
        for (const item of items) {
            const oferta = item.asistencia?.ofertas?.find((o) => o.id === elecciones[item.codigo]);
            if (oferta) {
                total += oferta.precio_soles;
                elegidos++;
            }
        }
        return { total, elegidos };
    }, [items, elecciones]);

    if (items.length === 0) {
        return (
            <section className="flex items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
                <CheckCircle2 aria-hidden="true" className="size-12 shrink-0 text-emerald-600" />
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">¡No te falta nada!</h2>
                    <p className="mt-1 text-lg text-slate-700">Según lo que declaraste, tu local está listo para la inspección.</p>
                </div>
            </section>
        );
    }

    const actual = items.find((i) => i.codigo === seleccion) ?? items[0];
    const visual = visualDeItem(actual.codigo, actual.titulo);
    const nombre = visual.nombreCorto || actual.titulo;
    const ofertas = actual.asistencia?.ofertas ?? [];
    const aliados = actual.asistencia?.aliados ?? [];
    const costo = rangoCosto(actual.asistencia);
    const pasos = guia(actual.asistencia);

    const elegir = (codigo: string) => {
        setSeleccion(codigo);
        if (window.matchMedia('(max-width: 1023px)').matches) {
            requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
    };

    const elegirOferta = (codigo: string, ofertaId: number) => {
        const nuevas = { ...elecciones, [codigo]: elecciones[codigo] === ofertaId ? -1 : ofertaId };
        if (nuevas[codigo] === -1) delete nuevas[codigo];
        else registrarEvento('eleccion', { ofertaId });
        setElecciones(nuevas);
        if (claveSeleccion) {
            try {
                window.localStorage.setItem(`checkitse:eleccion:${claveSeleccion}`, JSON.stringify(nuevas));
            } catch {
                // Sin almacenamiento disponible: la elección vale solo en esta visita.
            }
        }
    };

    return (
        <section aria-labelledby="falta-titulo" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-ink-900 trama-andina flex flex-col gap-5 px-5 py-7 text-white sm:px-10 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sun-300 text-base font-bold">Lo que te falta</p>
                    <h2 id="falta-titulo" className="mt-1 text-3xl font-bold sm:text-4xl">
                        {items.length === 1 ? 'Te falta 1 cosa para estar listo' : `Te faltan ${items.length} cosas para estar listo`}
                    </h2>
                    <p className="mt-2 text-lg text-slate-300">Toca cada una, compara precios de proveedores de tu zona y elige.</p>
                </div>
                <div className="shrink-0 rounded-2xl bg-white/10 px-5 py-4" aria-live="polite">
                    <p className="flex items-center gap-2 text-base text-slate-300">
                        <Wallet aria-hidden="true" className="size-5" /> Tu presupuesto
                    </p>
                    <p className="text-sun-300 text-3xl font-extrabold">{soles(presupuesto.total)}</p>
                    <p className="text-sm text-slate-300">
                        {presupuesto.elegidos} de {items.length} elegidos
                    </p>
                </div>
            </div>
            <div aria-hidden="true" className="franja-andina" />

            <div className="grid gap-6 p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <ul className="grid grid-cols-2 gap-3 self-start sm:grid-cols-3 lg:grid-cols-2">
                    {items.map((item) => {
                        const v = visualDeItem(item.codigo, item.titulo);
                        const activo = item.codigo === actual.codigo;
                        const porRevisar = item.estado === 'POR_REVISAR';
                        const elegida = item.asistencia?.ofertas?.find((o) => o.id === elecciones[item.codigo]);
                        const rango = rangoCosto(item.asistencia);
                        return (
                            <li key={item.codigo}>
                                <button
                                    type="button"
                                    aria-pressed={activo}
                                    onClick={() => elegir(item.codigo)}
                                    className={`group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 bg-white text-left transition ${
                                        activo ? 'border-primary-600 ring-primary-100 ring-4' : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="relative block">
                                        <Imagen codigo={item.codigo} titulo={item.titulo} alto="h-28 sm:h-32" />
                                        <span
                                            className={`absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-sm font-bold ${porRevisar ? 'bg-sun-400 text-ink-900' : 'bg-primary-600 text-white'}`}
                                        >
                                            {porRevisar ? 'Por revisar' : 'Falta'}
                                        </span>
                                        {elegida && (
                                            <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                                                <CheckCircle2 aria-label="Elegido" className="size-5" />
                                            </span>
                                        )}
                                    </span>
                                    <span className="flex flex-1 flex-col p-3">
                                        <span className="block text-base leading-snug font-bold text-slate-900">{v.nombreCorto || item.titulo}</span>
                                        <span className="text-primary-700 mt-auto pt-2 text-base font-bold">
                                            {precioTarjeta(elegida?.precio_soles, rango?.texto)}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <div
                    ref={panel}
                    aria-live="polite"
                    className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 lg:sticky lg:top-24 lg:self-start"
                >
                    <Imagen codigo={actual.codigo} titulo={actual.titulo} alto="h-48 sm:h-60" />
                    <div className="space-y-6 p-4 sm:p-7">
                        <div>
                            <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">{nombre}</h3>
                            {actual.titulo !== nombre && <p className="mt-1 text-base text-slate-500">{actual.titulo}</p>}
                        </div>

                        <div>
                            <p className="text-primary-700 text-base font-bold">Qué hacer</p>
                            <p className="mt-1 text-lg leading-relaxed text-slate-800">
                                {actual.accion_mejora_orientativa ||
                                    actual.que_observar ||
                                    'Corrige esta condición antes de solicitar tu inspección.'}
                            </p>
                            {pasos.length > 0 && (
                                <ul className="mt-3 space-y-2">
                                    {pasos.map((paso) => (
                                        <li key={paso} className="flex gap-2 text-base text-slate-700">
                                            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                                            {paso}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {costo && (
                            <div className="border-sun-300 bg-sun-50 rounded-xl border p-4">
                                <p className="text-sun-700 text-base font-bold">Costo aproximado</p>
                                <p className="mt-1 text-2xl font-extrabold text-slate-900">{costo.texto}</p>
                                <p className="text-sm text-slate-600">
                                    {costo.desdeProveedores ? textoOfertas(ofertas.length) : 'Referencial. Pide cotización para tu caso.'}
                                </p>
                            </div>
                        )}

                        {ofertas.length > 0 ? (
                            <fieldset>
                                <legend className="text-primary-700 text-base font-bold">Elige tu opción</legend>
                                <ul className="mt-3 space-y-3">
                                    {ofertas.map((oferta) => {
                                        const elegida = elecciones[actual.codigo] === oferta.id;
                                        const destacado = oferta.proveedor.plan && oferta.proveedor.plan !== 'basico';
                                        return (
                                            <li
                                                key={oferta.id}
                                                className={`rounded-xl border-2 p-4 transition ${elegida ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-200'}`}
                                            >
                                                <label className="flex cursor-pointer gap-3">
                                                    <input
                                                        type="radio"
                                                        name={`oferta-${actual.codigo}`}
                                                        checked={elegida}
                                                        onChange={() => elegirOferta(actual.codigo, oferta.id)}
                                                        onClick={() => elegida && elegirOferta(actual.codigo, oferta.id)}
                                                        className="mt-1.5 size-5 shrink-0 accent-emerald-600"
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                                                            <span className="text-lg font-bold text-slate-900">{oferta.nombre}</span>
                                                            <span className="text-primary-700 text-2xl font-extrabold">
                                                                {soles(oferta.precio_soles)}
                                                                <span className="text-sm font-semibold text-slate-500"> / {oferta.unidad}</span>
                                                            </span>
                                                        </span>
                                                        <span className="mt-1 flex flex-wrap items-center gap-2 text-base text-slate-600">
                                                            {oferta.proveedor.nombre_comercial}
                                                            {destacado && (
                                                                <span className="bg-sun-100 text-sun-700 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-bold">
                                                                    <Star aria-hidden="true" className="size-3.5" /> Destacado
                                                                </span>
                                                            )}
                                                            {oferta.proveedor.verificado && (
                                                                <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                                                                    <BadgeCheck aria-hidden="true" className="size-4" /> Verificado
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="block text-sm text-slate-500">
                                                            {oferta.proveedor.ubicacion_exacta && oferta.proveedor.direccion
                                                                ? `${oferta.proveedor.direccion}, ${oferta.proveedor.sede}`
                                                                : `Zona: ${oferta.proveedor.sede}`}
                                                        </span>
                                                        {oferta.descripcion && (
                                                            <span className="mt-1 block text-base text-slate-700">{oferta.descripcion}</span>
                                                        )}
                                                        {elegida && (
                                                            <span className="mt-2 block text-base font-bold text-emerald-700">✓ Tu elección</span>
                                                        )}
                                                    </span>
                                                </label>
                                                <AccionesProveedor
                                                    proveedor={oferta.proveedor}
                                                    producto={oferta.nombre}
                                                    nombreLocal={nombreLocal}
                                                    ofertaId={oferta.id}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </fieldset>
                        ) : (
                            <div>
                                <p className="text-primary-700 text-base font-bold">Quién te ayuda cerca</p>
                                {aliados.length === 0 ? (
                                    <p className="mt-2 text-base text-slate-700">
                                        Aún no hay proveedores con precio para esto.{' '}
                                        <Link href={route('directorio.index')} className="text-primary-700 font-semibold underline">
                                            Ver todos los aliados
                                        </Link>
                                    </p>
                                ) : (
                                    <ul className="mt-3 space-y-3">
                                        {aliados.slice(0, 3).map((aliado) => (
                                            <li key={aliado.id} className="rounded-xl border border-slate-200 p-4">
                                                <p className="text-lg font-bold text-slate-900">{aliado.nombre_comercial}</p>
                                                <p className="text-base text-slate-600">Zona: {aliado.sede || 'Huancayo'}</p>
                                                <AccionesProveedor proveedor={aliado} producto={nombre} nombreLocal={nombreLocal} />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {onAdjuntarEvidencia && (
                            <button
                                type="button"
                                onClick={() => onAdjuntarEvidencia(actual.codigo)}
                                className="bg-primary hover:bg-primary-700 flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-lg font-bold text-white"
                            >
                                <Camera aria-hidden="true" className="size-5" /> Ya lo resolví: subir una foto
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
