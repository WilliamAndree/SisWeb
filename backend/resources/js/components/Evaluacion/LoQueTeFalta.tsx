import type { CriterioAsistencia } from '@/components/Evaluacion/NubeAsistenciaModal';
import { enlaceWhatsapp, mapaZona, visualDeItem, type IconoItem } from '@/lib/item-visual';
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
    Phone,
    Signpost,
    Users,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';

export interface ItemFaltante {
    codigo: string;
    titulo: string;
    estado?: string | null;
    que_observar?: string | null;
    accion_mejora_orientativa?: string | null;
    asistencia?: CriterioAsistencia | null;
}

interface LoQueTeFaltaProps {
    readonly items: ItemFaltante[];
    readonly nombreLocal?: string | null;
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

function rangoCosto(asistencia?: CriterioAsistencia | null): string | null {
    const rango = asistencia?.rango_costo;
    if (!rango) return null;
    if (typeof rango === 'string') return rango;
    const r = rango as { minimo_soles?: number; maximo_soles?: number };
    if (!r.minimo_soles || !r.maximo_soles) return null;
    return `S/ ${Math.round(r.minimo_soles)} a S/ ${Math.round(r.maximo_soles)}`;
}

function guia(asistencia?: CriterioAsistencia | null): string[] {
    const g = asistencia?.guia_autoayuda;
    if (!g) return [];
    return (Array.isArray(g) ? g : [g]).slice(0, 3);
}

/**
 * Panel principal de subsanación: lo que le falta al local, en grande y con foto.
 * Al elegir un ítem muestra qué hacer, cuánto cuesta aproximadamente y qué
 * proveedores de la zona lo venden, con WhatsApp y mapa.
 */
export function LoQueTeFalta({ items, nombreLocal, onAdjuntarEvidencia }: Readonly<LoQueTeFaltaProps>) {
    const [seleccion, setSeleccion] = useState<string | null>(items[0]?.codigo ?? null);
    const [mapaDe, setMapaDe] = useState<string | null>(null);
    const panel = useRef<HTMLDivElement>(null);

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
    const aliados = actual.asistencia?.aliados ?? [];
    const costo = rangoCosto(actual.asistencia);
    const pasos = guia(actual.asistencia);

    const elegir = (codigo: string) => {
        setSeleccion(codigo);
        setMapaDe(null);
        if (window.matchMedia('(max-width: 1023px)').matches) {
            requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
    };

    return (
        <section aria-labelledby="falta-titulo" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-ink-900 trama-andina px-6 py-8 text-white sm:px-10">
                <p className="text-sun-300 text-base font-bold">Lo que te falta</p>
                <h2 id="falta-titulo" className="mt-1 text-3xl font-bold sm:text-4xl">
                    {items.length === 1 ? 'Te falta 1 cosa para estar listo' : `Te faltan ${items.length} cosas para estar listo`}
                </h2>
                <p className="mt-2 text-lg text-slate-300">Toca cada una para ver qué hacer y quién te ayuda cerca de tu local.</p>
            </div>
            <div aria-hidden="true" className="franja-andina" />

            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                {/* Lista de ítems */}
                <ul className="grid grid-cols-2 gap-3 self-start sm:grid-cols-3 lg:grid-cols-2">
                    {items.map((item) => {
                        const v = visualDeItem(item.codigo, item.titulo);
                        const activo = item.codigo === actual.codigo;
                        const porRevisar = item.estado === 'POR_REVISAR';
                        return (
                            <li key={item.codigo}>
                                <button
                                    type="button"
                                    aria-pressed={activo}
                                    onClick={() => elegir(item.codigo)}
                                    className={`group h-full w-full cursor-pointer overflow-hidden rounded-2xl border-2 bg-white text-left transition ${
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
                                    </span>
                                    <span className="block p-3 text-base leading-snug font-bold text-slate-900">{v.nombreCorto || item.titulo}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {/* Detalle del ítem elegido */}
                <div
                    ref={panel}
                    aria-live="polite"
                    className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 lg:sticky lg:top-24 lg:self-start"
                >
                    <Imagen codigo={actual.codigo} titulo={actual.titulo} alto="h-52 sm:h-64" />
                    <div className="space-y-6 p-5 sm:p-7">
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
                            <div className="bg-sun-50 border-sun-300 rounded-xl border p-4">
                                <p className="text-sun-700 text-base font-bold">Costo aproximado</p>
                                <p className="mt-1 text-2xl font-extrabold text-slate-900">{costo}</p>
                                <p className="text-sm text-slate-600">Referencial. Pide cotización para tu caso.</p>
                            </div>
                        )}

                        <div>
                            <p className="text-primary-700 text-base font-bold">Quién te ayuda cerca</p>
                            {aliados.length === 0 ? (
                                <p className="mt-2 text-base text-slate-700">
                                    Aún no tenemos proveedores para esto.{' '}
                                    <Link href={route('directorio.index')} className="text-primary-700 font-semibold underline">
                                        Ver todos los aliados
                                    </Link>
                                </p>
                            ) : (
                                <ul className="mt-3 space-y-3">
                                    {aliados.slice(0, 3).map((aliado) => {
                                        const whatsapp = enlaceWhatsapp(aliado.whatsapp || aliado.telefono || '', nombre, nombreLocal);
                                        const zona = aliado.sede || 'Huancayo';
                                        const mapa = mapaZona(zona);
                                        const verMapa = mapaDe === aliado.id;
                                        return (
                                            <li key={aliado.id} className="rounded-xl border border-slate-200 p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <p className="text-lg font-bold text-slate-900">{aliado.nombre_comercial}</p>
                                                    {aliado.verificado && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-bold text-emerald-700">
                                                            <BadgeCheck aria-hidden="true" className="size-4" /> Verificado
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 flex items-center gap-1.5 text-base text-slate-600">
                                                    <MapPin aria-hidden="true" className="size-4 shrink-0" /> Zona: {zona}
                                                    {aliado.telefono && (
                                                        <>
                                                            <span aria-hidden="true">·</span>
                                                            <Phone aria-hidden="true" className="size-4 shrink-0" /> {aliado.telefono}
                                                        </>
                                                    )}
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {whatsapp && (
                                                        <a
                                                            href={whatsapp}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white hover:bg-emerald-700"
                                                        >
                                                            <MessageCircle aria-hidden="true" className="size-5" /> Escribir por WhatsApp
                                                        </a>
                                                    )}
                                                    <button
                                                        type="button"
                                                        aria-expanded={verMapa}
                                                        onClick={() => setMapaDe(verMapa ? null : aliado.id)}
                                                        className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-5 text-base font-semibold text-slate-800 hover:bg-slate-50"
                                                    >
                                                        <MapPin aria-hidden="true" className="size-5" /> {verMapa ? 'Ocultar mapa' : 'Ver en el mapa'}
                                                    </button>
                                                </div>
                                                {verMapa && (
                                                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                                                        <iframe
                                                            title={`Mapa de la zona de ${aliado.nombre_comercial}`}
                                                            src={mapa.embed}
                                                            loading="lazy"
                                                            referrerPolicy="no-referrer-when-downgrade"
                                                            className="h-64 w-full border-0"
                                                        />
                                                        <a
                                                            href={mapa.abrir}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary-700 flex min-h-11 items-center justify-center gap-1.5 text-base font-semibold"
                                                        >
                                                            Abrir en Google Maps <ArrowRight aria-hidden="true" className="size-4" />
                                                        </a>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

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
