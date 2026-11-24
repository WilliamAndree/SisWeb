import { resolverFotoNegocio, usarFotoRespaldo } from '@/lib/imagen-negocio';
import { Head, usePoll } from '@inertiajs/react';
import { CheckCircle2, Clock, Maximize2, Store, TriangleAlert, Users, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LocalEnVivo {
    uuid: string;
    nombre_comercio: string;
    funcion_economica?: string | null;
    distrito?: string | null;
    responsable?: string | null;
    respondidas: number;
    total: number;
    listas: number;
    faltan: number;
    corregidas: number;
    creado?: string | null;
    actualizado?: string | null;
}

interface PanelEnVivoProps {
    readonly locales: LocalEnVivo[];
    readonly horas: number;
    readonly totales: { locales: number; listos: number; faltan: number; corregidas: number };
    readonly actualizado_a_las: string;
}

/** Cada cuánto se piden los datos nuevos al servidor (solo la lista de locales). */
const INTERVALO_MS = 4000;
/** Una tarjeta se resalta si tuvo actividad en estos últimos segundos. */
const RECIENTE_MS = 15000;

function haceCuanto(fecha: string | null | undefined, ahora: number): string {
    if (!fecha) return '';
    const segundos = Math.max(0, Math.round((ahora - new Date(fecha).getTime()) / 1000));
    if (segundos < 60) return 'hace unos segundos';
    const minutos = Math.round(segundos / 60);
    if (minutos < 60) return `hace ${minutos} min`;
    return `hace ${Math.round(minutos / 60)} h`;
}

function estadoLocal(local: LocalEnVivo): { texto: string; clase: string; barra: string } {
    if (local.respondidas === 0) return { texto: 'Empezando…', clase: 'bg-slate-100 text-slate-700', barra: 'bg-slate-300' };
    if (local.faltan === 0) return { texto: '¡Listo!', clase: 'bg-emerald-100 text-emerald-800', barra: 'bg-emerald-500' };
    const texto = local.faltan === 1 ? 'Le falta 1 cosa' : `Le faltan ${local.faltan} cosas`;
    return local.faltan <= 2
        ? { texto, clase: 'bg-amber-100 text-amber-900', barra: 'bg-amber-500' }
        : { texto, clase: 'bg-rose-100 text-rose-800', barra: 'bg-rose-500' };
}

function TarjetaLocal({ local, ahora }: Readonly<{ local: LocalEnVivo; ahora: number }>) {
    const estado = estadoLocal(local);
    const reciente = local.actualizado ? ahora - new Date(local.actualizado).getTime() < RECIENTE_MS : false;
    const avance = local.respondidas > 0 ? Math.round((local.listas / local.respondidas) * 100) : 0;

    return (
        <li
            className={`overflow-hidden rounded-3xl border-2 bg-white shadow-sm transition-all duration-500 ${
                reciente ? 'border-primary-500 ring-primary-200 scale-[1.02] ring-4' : 'border-slate-200'
            }`}
        >
            <div className="relative">
                <img
                    src={resolverFotoNegocio(local.nombre_comercio, local.funcion_economica, local.uuid)}
                    onError={usarFotoRespaldo}
                    alt=""
                    className="h-32 w-full object-cover"
                />
                <span className={`absolute top-3 left-3 rounded-full px-3 py-1 text-base font-extrabold shadow ${estado.clase}`}>{estado.texto}</span>
                {reciente && (
                    <span className="bg-primary-600 absolute top-3 right-3 rounded-full px-2.5 py-1 text-sm font-bold text-white shadow">
                        Ahora mismo
                    </span>
                )}
            </div>
            <div className="space-y-3 p-4">
                <div>
                    <p className="truncate text-xl font-bold text-slate-900">{local.nombre_comercio}</p>
                    <p className="truncate text-base text-slate-600">
                        {[local.responsable, local.distrito].filter(Boolean).join(' · ') || 'Huancayo'}
                    </p>
                </div>
                <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all duration-700 ${estado.barra}`} style={{ width: `${avance}%` }} />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 p-2">
                        <dt className="text-xs font-semibold text-slate-500">Respondió</dt>
                        <dd className="text-xl font-extrabold text-slate-900">{local.respondidas}</dd>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2">
                        <dt className="text-xs font-semibold text-emerald-700">Bien</dt>
                        <dd className="text-xl font-extrabold text-emerald-800">{local.listas}</dd>
                    </div>
                    <div className="rounded-xl bg-sky-50 p-2">
                        <dt className="text-xs font-semibold text-sky-700">Corrigió</dt>
                        <dd className="text-xl font-extrabold text-sky-800">{local.corregidas}</dd>
                    </div>
                </dl>
                <p className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Clock aria-hidden="true" className="size-4" /> {haceCuanto(local.actualizado ?? local.creado, ahora)}
                </p>
            </div>
        </li>
    );
}

/**
 * Pantalla para proyectar durante una demostración o una capacitación: muestra, casi en
 * tiempo real, los locales que los participantes registran desde su celular.
 */
export default function PanelEnVivo({ locales, horas, totales, actualizado_a_las }: PanelEnVivoProps) {
    usePoll(INTERVALO_MS, { only: ['locales', 'totales', 'actualizado_a_las'] });
    const [ahora, setAhora] = useState(() => Date.now());
    const [enlace, setEnlace] = useState('');

    useEffect(() => {
        setEnlace(globalThis.location?.host ?? '');
        const reloj = setInterval(() => setAhora(Date.now()), 1000);
        return () => clearInterval(reloj);
    }, []);

    const pantallaCompleta = () => {
        void document.documentElement.requestFullscreen?.().catch(() => undefined);
    };

    const cifras = [
        { etiqueta: 'Locales registrados', valor: totales.locales, icono: Store, clase: 'text-slate-900' },
        { etiqueta: 'Listos para la inspección', valor: totales.listos, icono: CheckCircle2, clase: 'text-emerald-700' },
        { etiqueta: 'Cosas por corregir', valor: totales.faltan, icono: TriangleAlert, clase: 'text-amber-700' },
        { etiqueta: 'Ya corregidas', valor: totales.corregidas, icono: Wrench, clase: 'text-sky-700' },
    ];

    return (
        <>
            <Head title="Panel en vivo" />
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
                <header className="bg-ink-900 trama-andina flex flex-col gap-4 rounded-3xl p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
                    <div>
                        <p className="flex items-center gap-2 text-base font-bold text-rose-300">
                            <span className="relative flex size-3">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex size-3 rounded-full bg-rose-500" />
                            </span>
                            EN VIVO · últimas {horas} h
                        </p>
                        <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl">Así van los locales de la clase</h1>
                        <p className="mt-2 text-lg text-slate-300">
                            Entra desde tu celular a <strong className="text-sun-300 text-xl">{enlace || 'checkitse-huancayo.onrender.com'}</strong>,
                            registra tu local y míralo aparecer aquí.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                        <button
                            type="button"
                            onClick={pantallaCompleta}
                            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-4 text-base font-semibold text-white hover:bg-white/20"
                        >
                            <Maximize2 aria-hidden="true" className="size-4" /> Pantalla completa
                        </button>
                        <p className="text-sm text-slate-400">Actualizado a las {actualizado_a_las}</p>
                    </div>
                </header>

                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {cifras.map(({ etiqueta, valor, icono: Icono, clase }) => (
                        <div key={etiqueta} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
                            <dt className="flex items-center gap-2 text-base font-semibold text-slate-600">
                                <Icono aria-hidden="true" className="size-5" /> {etiqueta}
                            </dt>
                            <dd className={`mt-1 text-5xl font-black tracking-tight ${clase}`}>{valor}</dd>
                        </div>
                    ))}
                </dl>

                {locales.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
                        <Users aria-hidden="true" className="mx-auto size-14 text-slate-400" />
                        <p className="mt-4 text-2xl font-bold text-slate-900">Esperando el primer local…</p>
                        <p className="mt-2 text-lg text-slate-600">Apenas alguien registre su negocio, aparecerá aquí.</p>
                    </div>
                ) : (
                    <ul aria-live="polite" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {locales.map((local) => (
                            <TarjetaLocal key={local.uuid} local={local} ahora={ahora} />
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
