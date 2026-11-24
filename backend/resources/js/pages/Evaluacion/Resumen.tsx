import { FlujoCiudadano } from '@/components/Evaluacion/FlujoCiudadano';
import { LoQueTeFalta } from '@/components/Evaluacion/LoQueTeFalta';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fechaLarga } from '@/lib/fechas';
import { formatearNivelRiesgo } from '@/lib/riesgo';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Building2,
    Check,
    CheckCircle2,
    ClipboardList,
    Clock,
    Coins,
    FileCheck,
    FileText,
    Files,
    Loader2,
    Lock,
    RefreshCw,
    RotateCcw,
    Save,
    ShieldAlert,
    ShieldCheck,
    TrendingDown,
    Wrench,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ResumenHeader } from './components/ResumenHeader';

import type { FinalizarPendiente, ResumenProps } from '@/types/contrato';

/**
 * Secuencia del flujo ciudadano cívico.
 */

/**
 * Etiquetas ciudadanas de `caracteristicas_declaradas`.
 */
const CARACTERISTICAS_DECLARADAS: Record<string, { etiqueta: string; sufijo?: string }> = {
    area_m2: { etiqueta: 'Área techada', sufijo: ' m²' },
    pisos: { etiqueta: 'Número de pisos' },
    aforo: { etiqueta: 'Aforo declarado' },
    usa_glp: { etiqueta: 'Utiliza GLP' },
    galones_glp: { etiqueta: 'Cantidad de GLP almacenada', sufijo: ' galones' },
    usa_caldero: { etiqueta: 'Utiliza caldero' },
    usa_liquidos_inflamables: { etiqueta: 'Almacena o manipula líquidos inflamables' },
    combustibles_liquidos_m3: { etiqueta: 'Volumen de combustibles líquidos', sufijo: ' m³' },
    en_sotano: { etiqueta: 'Actividad en sótano o semisótano' },
    galeria_sin_itse: { etiqueta: 'En galería sin ITSE en áreas comunes' },
    tiene_equipos_fritura: { etiqueta: 'Equipos de fritura o cocción con aceites' },
    tiene_escaleras: { etiqueta: 'Escaleras de circulación' },
    tiene_estanterias_altas: { etiqueta: 'Estanterías altas o mobiliario con riesgo de volteo' },
};

/** Pestañas del "Ver detalle técnico": una cosa a la vez en lugar de todo junto. */
const PESTANAS_DETALLE = [
    { valor: 'tramite', etiqueta: 'Tu trámite', icono: FileText },
    { valor: 'costos', etiqueta: 'Cuánto cuesta', icono: Coins },
    { valor: 'datos', etiqueta: 'Lo que ya tienes bien', icono: CheckCircle2 },
] as const;

/**
 * Contenido cívico de la modalidad de trámite según D.S. N° 002-2018-PCM.
 */
const MODALIDAD_TRAMITE = {
    EX_POST: {
        badge: 'Modalidad: ITSE Posterior (D.S. N° 002-2018-PCM)',
        badgeClases: 'border-sky-300 bg-sky-50 text-sky-900',
        icono: ShieldCheck,
        iconoClases: 'border-sky-200 bg-sky-100 text-sky-700',
        titulo: 'ITSE posterior: primero tu licencia, después la inspección',
        mensaje:
            'Pides tu licencia de funcionamiento presentando una declaración jurada (Anexo 4) en la que dices que tu local cumple. Después, la municipalidad visita tu local para comprobarlo.',
        plazo: 'Tienes hasta 3 días hábiles para corregirlo.',
        detallePlazo: 'Lo demuestras con una declaración jurada y fotos, en mesa de partes. No hay segunda visita.',
        reprogramacion:
            'Ten tu local abierto el día de la visita. Si el inspector no puede entrar, se reprograma una sola vez (en 2 días hábiles); si vuelve a pasar, te niegan el certificado.',
        plazoIcono: Clock,
    },
    EX_ANTE: {
        badge: 'Modalidad: ITSE Previa (Inspección Multidisciplinaria)',
        badgeClases: 'border-amber-300 bg-amber-50 text-amber-900',
        icono: ShieldAlert,
        iconoClases: 'border-amber-200 bg-amber-100 text-amber-700',
        titulo: 'ITSE previa: te inspeccionan antes de darte la licencia',
        mensaje:
            'Por el tamaño o la actividad de tu local, un grupo de inspectores visita tu local antes de que la municipalidad te otorgue la licencia de funcionamiento.',
        plazo: 'Tienes hasta 20 días hábiles para corregirlo.',
        detallePlazo: 'Después los inspectores vuelven a tu local para comprobar que lo corregiste.',
        reprogramacion:
            'La visita se puede reprogramar una sola vez (en 2 días hábiles) y solo con una causa justificada. Si no estás, el trámite termina y te niegan el certificado.',
        plazoIcono: Clock,
    },
} as const;

interface EstimacionItem {
    codigo: string;
    titulo: string;
    rubro: string;
    min: number;
    max: number;
}

const ESTIMACION_COSTOS_REFERENCIALES: Record<string, { min: number; max: number; rubro: string }> = {
    'CRIT-01': { min: 35, max: 50, rubro: 'Mantenimiento / recarga de extintor PQS' },
    'CRIT-02A': { min: 140, max: 220, rubro: 'Extintor químico húmedo especializado Clase K' },
    'CRIT-02B': { min: 25, max: 45, rubro: 'Kit de señales fotoluminiscentes de seguridad' },
    'CRIT-03': { min: 0, max: 30, rubro: 'Despeje y señalización de anchos de paso' },
    'CRIT-04': { min: 40, max: 120, rubro: 'Cerrajería / manija de escape o adecuación de puerta' },
    'CRIT-05': { min: 180, max: 260, rubro: 'Protocolo de medición de pozo a tierra CIP (≤25 Ω)' },
    'CRIT-06': { min: 80, max: 130, rubro: 'Mandil de tablero + interruptor diferencial 30mA' },
    'CRIT-07': { min: 60, max: 140, rubro: 'Canaletas PVC + sustitución de cables mellizos' },
    'CRIT-08': { min: 60, max: 100, rubro: 'Luminaria autónoma de emergencia recargable' },
    'CRIT-10': { min: 30, max: 50, rubro: 'Manguera reforzada para GLP y abrazaderas metálicas' },
    'CRIT-11': { min: 50, max: 120, rubro: 'Pasamanos continuo y cintas antideslizantes para escalera' },
    'CRIT-13': { min: 30, max: 70, rubro: 'Arriostramiento antisísmico / escuadras para estanterías' },
    'CRIT-14A': { min: 0, max: 20, rubro: 'Despeje frontal libre de 1 m de tablero eléctrico' },
};

const COSTO_DEFECTO = { min: 50, max: 100, rubro: 'Adecuación técnica preventiva' };

function calcularEstimacionEconomica(observaciones: { codigo: string; titulo: string }[]): {
    minTotal: number;
    maxTotal: number;
    promedioTotal: number;
    items: EstimacionItem[];
} {
    if (observaciones.length === 0) {
        return { minTotal: 0, maxTotal: 0, promedioTotal: 0, items: [] };
    }

    const items: EstimacionItem[] = observaciones.map((obs) => {
        const est = ESTIMACION_COSTOS_REFERENCIALES[obs.codigo] ?? COSTO_DEFECTO;
        return {
            codigo: obs.codigo,
            titulo: obs.titulo,
            rubro: est.rubro,
            min: est.min,
            max: est.max,
        };
    });

    const minTotal = items.reduce((acc, it) => acc + it.min, 0);
    const maxTotal = items.reduce((acc, it) => acc + it.max, 0);
    const promedioTotal = Math.round((minTotal + maxTotal) / 2);

    return { minTotal, maxTotal, promedioTotal, items };
}

/**
 * Gestiona el focus trap dentro del modal de confirmación al presionar Tab / Shift+Tab.
 */
function manejarTrapFocoModal(event: KeyboardEvent, modalElement: HTMLElement | null): void {
    if (event.key !== 'Tab' || !modalElement) return;
    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusableElements.length === 0) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
    }
}

function restaurarFocoTrigger(triggerRef: { current: HTMLElement | null }): void {
    if (triggerRef.current && document.body.contains(triggerRef.current)) {
        triggerRef.current.focus();
        triggerRef.current = null;
    }
}

/**
 * Calcula las métricas agregadas y porcentajes proporcionales del resumen técnico.
 */
function calcularMetricasResumen(resumen?: ResumenProps['resumen']) {
    const totalAplicables = resumen?.total_criterios_aplicables ?? 0;
    const totalCumple = resumen?.total_cumple_declarado ?? 0;
    const totalPendienteAtender = resumen?.total_pendiente_atender ?? 0;
    const totalPorRevisar = resumen?.total_por_revisar ?? 0;
    const totalPendientes = totalPendienteAtender + totalPorRevisar;
    const esApto = totalPendientes === 0;

    const pctCumple = totalAplicables > 0 ? (totalCumple / totalAplicables) * 100 : 0;
    const pctPendiente = totalAplicables > 0 ? (totalPendienteAtender / totalAplicables) * 100 : 0;
    const pctRevisar = totalAplicables > 0 ? (totalPorRevisar / totalAplicables) * 100 : 0;

    return {
        totalAplicables,
        totalPendientes,
        esApto,
        pctCumple,
        pctPendiente,
        pctRevisar,
    };
}

function resolverModalidadTramite(clasificacion_tramite: ResumenProps['clasificacion_tramite']) {
    if (!clasificacion_tramite) return null;

    const tipo = String(clasificacion_tramite.tipo_tramite ?? '').toUpperCase();
    const contenido = MODALIDAD_TRAMITE[tipo as keyof typeof MODALIDAD_TRAMITE];
    if (!contenido) return null;

    return {
        contenido,
        nivelRiesgo: formatearNivelRiesgo(clasificacion_tramite.nivel_riesgo),
        motivos: Array.isArray(clasificacion_tramite.motivos) ? clasificacion_tramite.motivos : [],
        fuente: clasificacion_tramite.fuente,
    };
}

interface CaracteristicaDeclaradaItem {
    clave: string;
    etiqueta: string;
    texto: string;
}

function formatearValorCaracteristica(valor: unknown, sufijo?: string): string {
    if (valor === true) return 'Sí';
    if (valor === false) return 'No';
    return `${valor}${sufijo ?? ''}`;
}

function extraerCaracteristicasDeclaradas(fuente?: Record<string, unknown> | null): CaracteristicaDeclaradaItem[] {
    if (!fuente || typeof fuente !== 'object') return [];

    return Object.entries(fuente)
        .filter(([clave, valor]) => Boolean(CARACTERISTICAS_DECLARADAS[clave]) && valor !== null && valor !== undefined)
        .filter(([clave]) => clave !== 'galones_glp' || fuente.usa_glp === true)
        .filter(([clave]) => clave !== 'combustibles_liquidos_m3' || fuente.usa_liquidos_inflamables === true)
        .map(([clave, valor]) => {
            const descriptor = CARACTERISTICAS_DECLARADAS[clave];
            const texto = formatearValorCaracteristica(valor, descriptor.sufijo);
            return { clave, etiqueta: descriptor.etiqueta, texto };
        });
}

function resolverNivelRiesgoTexto(clasificacion_tramite: ResumenProps['clasificacion_tramite'], resumen: ResumenProps['resumen']): string {
    if (clasificacion_tramite?.nivel_riesgo) {
        return formatearNivelRiesgo(clasificacion_tramite.nivel_riesgo);
    }
    if ((resumen?.total_pendiente_atender ?? 0) > 0) {
        return 'Alto';
    }
    if ((resumen?.total_por_revisar ?? 0) > 0) {
        return 'Medio';
    }
    return 'Bajo / Medio';
}

function determinarEsRiesgoAlto(clasificacion_tramite: ResumenProps['clasificacion_tramite'], totalPendienteAtender?: number): boolean {
    const nr = String(clasificacion_tramite?.nivel_riesgo ?? '').toUpperCase();
    if (nr.includes('ALTO') || nr === 'MUY_ALTO' || nr === 'ALTO_MUY_ALTO') return true;
    if (clasificacion_tramite?.tipo_tramite === 'EX_ANTE') return true;
    return (totalPendienteAtender ?? 0) > 0;
}

function determinarEsModalidadExAnte(clasificacion_tramite: ResumenProps['clasificacion_tramite'], esRiesgoAlto: boolean): boolean {
    if (clasificacion_tramite) {
        return clasificacion_tramite.tipo_tramite === 'EX_ANTE';
    }
    return esRiesgoAlto;
}

function procesarErrorRespuestaFinalizar(
    status: number,
    data: { mensaje?: string; pendientes?: FinalizarPendiente[] } | null,
): { error: string; pendientes: FinalizarPendiente[] } {
    if (status === 422) {
        return {
            error: data?.mensaje ?? 'No es posible registrar la autoevaluación porque existen condiciones aplicables sin declaración.',
            pendientes: Array.isArray(data?.pendientes) ? data.pendientes : [],
        };
    }

    const fallback =
        status === 409
            ? 'Esta autoevaluación ya se encuentra registrada y protegida contra modificaciones.'
            : 'No fue posible registrar la autoevaluación. Intente nuevamente.';

    return {
        error: data?.mensaje ?? fallback,
        pendientes: [],
    };
}

/** El servidor envía "17/11/2026 18:56": se lee con lib/fechas (antes salía "Invalid Date"). */
function formatearFechaEmisionHero(registradaAt?: string | null): string | undefined {
    return fechaLarga(registradaAt) ?? undefined;
}

interface BarraFlujoSuperiorResumenProps {
    mostrarBotonGuardar: boolean;
    onAbrirGuardar: () => void;
}

function BarraFlujoSuperiorResumen({ mostrarBotonGuardar, onAbrirGuardar }: Readonly<BarraFlujoSuperiorResumenProps>) {
    return (
        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
                href={route('autoevaluacion.index')}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 transition-colors hover:text-slate-900"
            >
                <ArrowLeft className="h-4 w-4 text-slate-400" />
                <span>Volver al inicio</span>
            </Link>

            <div className="flex items-center gap-2">
                {mostrarBotonGuardar && (
                    <button
                        type="button"
                        onClick={onAbrirGuardar}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-sm font-bold text-emerald-700 shadow-2xs transition hover:bg-emerald-50"
                    >
                        <Save className="h-3.5 w-3.5" />
                        <span>Guardar en mi cuenta</span>
                    </button>
                )}
            </div>
        </div>
    );
}

interface SeccionEstimadorEconomicoProps {
    pendienteAtenderCount: number;
    estimacionEconomica: ReturnType<typeof calcularEstimacionEconomica>;
}

function SeccionEstimadorEconomico({ pendienteAtenderCount, estimacionEconomica }: Readonly<SeccionEstimadorEconomicoProps>) {
    return (
        <section aria-labelledby="estimador-economico-title" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                        <Coins className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 id="estimador-economico-title" className="text-base font-bold text-slate-900 sm:text-lg">
                            Corregirlo ahora cuesta mucho menos que una multa
                        </h2>
                        <p className="text-sm text-slate-500">Precios referenciales en Huancayo frente a la multa municipal por no cumplir.</p>
                    </div>
                </div>
            </div>

            {pendienteAtenderCount === 0 ? (
                <div className="bg-success-700/5 flex items-start gap-3 rounded-2xl border border-[#34C759]/25 p-5">
                    <CheckCircle2 className="text-success-800 mt-0.5 h-5 w-5 shrink-0" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">Sin pendientes según tus declaraciones</p>
                        <p className="text-sm leading-relaxed text-slate-600">
                            No declaraste condiciones pendientes en esta revisión. Esto no elimina el riesgo de sanciones ni garantiza la continuidad
                            de operación. La comparativa existente muestra como referencia{' '}
                            <strong className="text-slate-900">0.50 a 1.00 UIT (S/ 2,675 a S/ 5,350)</strong>; no es una predicción de una sanción
                            para tu establecimiento.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Tarjeta 1: Inversión Preventiva Estimada */}
                        <div className="bg-success-700/5 space-y-3 rounded-3xl border border-[#34C759]/25 p-5 shadow-2xs">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-sm font-bold text-slate-700">Inversión Preventiva Estimada</span>
                                <span className="bg-success-700/10 text-success-800 rounded-full border border-[#34C759]/30 px-2.5 py-0.5 text-sm font-bold">
                                    Mercado Huancayo
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-success-800 font-mono text-2xl font-black">
                                    S/ {estimacionEconomica.minTotal} — S/ {estimacionEconomica.maxTotal}
                                </span>
                            </div>
                            <p className="text-sm leading-snug text-slate-600">
                                Costo referencial promedio de subsanación:{' '}
                                <strong className="font-mono font-semibold text-slate-800">~S/ {estimacionEconomica.promedioTotal}</strong>{' '}
                                (materiales normalizados y mano de obra técnica local para {pendienteAtenderCount} observación
                                {pendienteAtenderCount > 1 ? 'es' : ''}).
                            </p>
                        </div>

                        {/* Tarjeta 2: Sanción Municipal por Falta de ITSE */}
                        <div className="bg-danger-700/5 space-y-3 rounded-3xl border border-[#FF3B30]/25 p-5 shadow-2xs">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-sm font-bold text-slate-700">Sanción / Clausura Municipal</span>
                                <span className="bg-danger-700/10 text-danger-700 rounded-full border border-[#FF3B30]/30 px-2.5 py-0.5 text-sm font-bold">
                                    0.50 — 1.00 UIT
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-danger-700 font-mono text-2xl font-black">S/ 2,675 — S/ 5,350</span>
                            </div>
                            <p className="text-sm leading-snug text-slate-700">
                                Multa administrativa municipal por operar sin condiciones de seguridad +{' '}
                                <strong className="text-danger-700">Clausura Temporal Inmediata</strong> y cese de ingresos comerciales.
                            </p>
                        </div>
                    </div>

                    {/* Desglose individual de costos por criterio observado */}
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <span className="block text-sm font-bold text-slate-800">Cuánto cuesta cada cosa:</span>
                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                            {estimacionEconomica.items.map((it) => (
                                <div
                                    key={it.codigo}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs"
                                >
                                    <div className="min-w-0">
                                        <span className="text-sm text-slate-700" title={it.rubro}>
                                            {it.rubro}
                                        </span>
                                    </div>
                                    <span className="text-success-800 shrink-0 font-mono text-sm font-bold">
                                        S/ {it.min} - {it.max}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Callout de Retorno de la Prevención */}
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                        <p className="text-sm leading-relaxed text-amber-950">
                            <strong>Retorno de la Prevención:</strong> Subsanar estas observaciones antes de la fiscalización municipal cuesta
                            aproximadamente <strong>{Math.round(2675 / Math.max(1, estimacionEconomica.promedioTotal))} veces menos</strong> que el
                            monto mínimo de una multa municipal (S/ 2,675), asegurando la continuidad operativa ininterrumpida de tu negocio en
                            Huancayo.
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}

interface SeccionPuntosFuertesProps {
    cumpleDeclarado: NonNullable<ResumenProps['cumple_declarado']>;
    totalCumpleDeclarado: number;
}

function SeccionPuntosFuertes({ cumpleDeclarado, totalCumpleDeclarado }: Readonly<SeccionPuntosFuertesProps>) {
    return (
        <section aria-labelledby="cumple-title" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-success-700/10 text-success-800 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 id="cumple-title" className="text-base font-bold text-slate-900 sm:text-lg">
                            Lo que tu local ya tiene bien
                        </h2>
                        <p className="text-sm text-slate-500">Condiciones de seguridad que tu local ya cumple satisfactoriamente.</p>
                    </div>
                </div>
                <span className="bg-success-700/10 text-success-800 rounded-full border border-[#34C759]/25 px-3.5 py-1 text-sm font-bold">
                    {totalCumpleDeclarado} conformes
                </span>
            </div>

            {cumpleDeclarado.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 italic">
                    No se registraron declaraciones cumplidas aún.
                </div>
            ) : (
                <div className="space-y-3">
                    {cumpleDeclarado.map((item) => (
                        <div
                            key={item.codigo}
                            className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-2xs"
                        >
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="bg-success-700/10 text-success-800 inline-flex items-center gap-1 rounded-full border border-[#34C759]/25 px-2.5 py-0.5 text-sm font-bold">
                                        <Check className="h-3 w-3 stroke-[3]" />
                                        Cumple declarado
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800 sm:text-sm">{item.titulo}</p>
                            </div>
                            {item.norma_base && <span className="hidden shrink-0 text-sm text-slate-400 sm:inline-block">{item.norma_base}</span>}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

interface SeccionModalidadTramiteProps {
    modalidadTramite: ReturnType<typeof resolverModalidadTramite>;
    esModalidadExAnte: boolean;
    uuid: string;
}

function SeccionModalidadTramite({ modalidadTramite, esModalidadExAnte, uuid }: Readonly<SeccionModalidadTramiteProps>) {
    if (!modalidadTramite) return null;

    return (
        <section aria-labelledby="modalidad-tramite-title" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${modalidadTramite.contenido.iconoClases}`}>
                    <modalidadTramite.contenido.icono className="h-5 w-5" />
                </div>
                <div>
                    <h2 id="modalidad-tramite-title" className="text-sm font-black text-slate-500">
                        Tu tipo de trámite
                    </h2>
                    <p className="text-sm font-bold text-slate-900">{modalidadTramite.contenido.titulo}</p>
                </div>
            </div>

            <p className="text-sm leading-relaxed text-slate-700">{modalidadTramite.contenido.mensaje}</p>

            <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-500">Si te observan algo</p>
                    <p className="text-sm font-bold text-slate-800">{modalidadTramite.contenido.plazo}</p>
                    {'detallePlazo' in modalidadTramite.contenido && (
                        <p className="text-sm leading-snug text-slate-600">
                            {(modalidadTramite.contenido as { detallePlazo?: string }).detallePlazo}
                        </p>
                    )}
                </div>
            </div>

            {'reprogramacion' in modalidadTramite.contenido && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div className="space-y-0.5">
                        <p className="text-sm font-bold text-amber-900">El día de la visita</p>
                        <p className="text-sm leading-snug text-amber-900">
                            {(modalidadTramite.contenido as { reprogramacion?: string }).reprogramacion}
                        </p>
                    </div>
                </div>
            )}

            {/* BOTONERA DE FORMATOS OFICIALES PARA MESA DE PARTES */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="space-y-0.5">
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        <FileText className="h-3.5 w-3.5 text-slate-600" />
                        Documentos que puedes descargar
                    </h3>
                    <p className="text-sm leading-tight text-slate-500">
                        Ya vienen llenados con tus datos. Revísalos, fírmalos y llévalos a tu municipalidad.
                    </p>
                </div>

                {!esModalidadExAnte ? (
                    /* MODALIDAD EX-POST: ANEXO 4 ES EL PRINCIPAL */
                    <div className="space-y-2 pt-1">
                        <div className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3">
                            <div className="flex items-center justify-between gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/70 px-2 py-0.5 text-sm font-black text-emerald-800">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                                    El más importante
                                </span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-emerald-950">Declaración Jurada ITSE (Anexo 4)</h4>
                                <p className="mt-0.5 text-sm leading-tight text-emerald-800">
                                    Es el documento con el que pides tu licencia. Dices, bajo juramento, que tu local cumple.
                                </p>
                            </div>
                            <a
                                href={route('autoevaluacion.anexo', { uuid, numero: 4 })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-primary hover:bg-primary-700 flex w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-2xs transition"
                            >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Descargar Declaración Jurada (Anexo 4)</span>
                            </a>
                        </div>

                        <a
                            href={route('autoevaluacion.anexo', { uuid, numero: 9 })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                        >
                            <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
                            <span>Solicitud de ITSE (Anexo 9, opcional)</span>
                        </a>
                    </div>
                ) : (
                    /* MODALIDAD EX-ANTE: BLOQUEO DE ANEXO 4 + SOLICITUD ANEXO 9 + CHECKLIST EXPEDIENTE TÉCNICO */
                    <div className="space-y-3 pt-1">
                        {/* Alerta de bloqueo normativo de Anexo 4 */}
                        <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-sm text-amber-950">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                                <span>No aplica Declaración Jurada (Anexo 4)</span>
                            </div>
                            <p className="text-sm leading-snug text-amber-900">
                                Por normativa peruana (D.S. N° 002-2018-PCM), los locales de <strong>Riesgo Alto o Muy Alto</strong> no pueden
                                presentar Anexo 4. Requieren inspección técnica multidisciplinaria previa antes de la emisión de la Licencia.
                            </p>
                        </div>

                        {/* Botón destacado Solicitud de ITSE Previa (Anexo 9) */}
                        <div className="space-y-2 rounded-xl border border-sky-300 bg-sky-50/90 p-3">
                            <div className="flex items-center justify-between gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-200/70 px-2 py-0.5 text-sm font-black text-sky-800">
                                    <FileCheck className="h-3 w-3 text-sky-700" />
                                    El más importante
                                </span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-sky-950">Solicitud de ITSE Previa (Anexo 9)</h4>
                                <p className="mt-0.5 text-sm leading-tight text-sky-800">
                                    Con esta solicitud pides que programen la inspección de tu local.
                                </p>
                            </div>
                            <a
                                href={route('autoevaluacion.anexo', { uuid, numero: 9 })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-bold text-white shadow-2xs transition hover:bg-sky-700"
                            >
                                <ClipboardList className="h-3.5 w-3.5" />
                                <span>Descargar Solicitud de ITSE Previa (Anexo 9)</span>
                            </a>
                        </div>

                        {/* Tarjeta de Checklist de Requisitos del Expediente Técnico */}
                        <div className="space-y-2.5 rounded-xl border border-slate-300 bg-white p-3.5 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                                    <Files className="h-3.5 w-3.5 text-slate-600" />
                                    Expediente Técnico Requerido (ITSE Previa)
                                </h4>
                            </div>
                            <p className="text-sm leading-tight text-slate-600">
                                Para admitir a trámite su solicitud de ITSE Previa en Mesa de Partes (Huancayo), debe adjuntar la documentación
                                técnica firmada por profesionales colegiados:
                            </p>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                                        1
                                    </span>
                                    <span className="leading-snug">
                                        <strong>Planos de arquitectura (Escala 1/100 o 1/50):</strong> Distribución arquitectónica y memoria
                                        descriptiva con cálculo reglamentario de aforo, suscritos por{' '}
                                        <strong>Arquitecto colegiado y habilitado (CAP)</strong>.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                                        2
                                    </span>
                                    <span className="leading-snug">
                                        <strong>Planos y diagramas unifilares:</strong> Planos de instalaciones eléctricas, tableros y cuadro de
                                        cargas suscritos por{' '}
                                        <strong>Ingeniero Electricista o Mecánico-Electricista colegiado y habilitado (CIP).</strong>
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                                        3
                                    </span>
                                    <span className="leading-snug">
                                        <strong>Protocolo de puesta a tierra (≤ 25 Ω):</strong> Protocolo de medición vigente firmado por{' '}
                                        <strong>Ingeniero Electricista/Mecánico-Electricista colegiado habilitado (CIP)</strong> con constancia de
                                        calibración del telurómetro.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                                        4
                                    </span>
                                    <span className="leading-snug">
                                        <strong>Plan de Seguridad en Defensa Civil:</strong> Foliado y firmado en todas sus páginas por el
                                        administrado y profesional competente, incluyendo planos de señalización y evacuación.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                                        5
                                    </span>
                                    <span className="leading-snug">
                                        <strong>Certificados de operatividad y específicos:</strong> Constancias vigentes de extintores (PQS / Clase K
                                        si tiene cocina) y pruebas de hermeticidad de GLP si aplica a su giro.
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                <Link
                    href={route('autoevaluacion.informe', { uuid })}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-slate-800"
                >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Descargar mi informe (PDF)</span>
                </Link>
            </div>
        </section>
    );
}

interface SeccionCaracteristicasDeclaradasProps {
    caracteristicasDeclaradas: CaracteristicaDeclaradaItem[];
}

function SeccionCaracteristicasDeclaradas({ caracteristicasDeclaradas }: Readonly<SeccionCaracteristicasDeclaradasProps>) {
    if (caracteristicasDeclaradas.length === 0) return null;

    return (
        <section aria-label="Ficha de características declaradas">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="caracteristicas" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                    <AccordionTrigger className="px-5 py-4 text-left hover:no-underline">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <ClipboardList className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Características Físicas Declaradas ({caracteristicasDeclaradas.length})
                                </h3>
                                <p className="text-sm font-normal text-slate-500">Parámetros base usados para filtrar las condiciones aplicables.</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-slate-100 bg-slate-50/50 p-5">
                        <dl className="grid grid-cols-1 gap-2.5 text-sm">
                            {caracteristicasDeclaradas.map((caract) => (
                                <div key={caract.clave} className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                    <dt className="text-slate-600">{caract.etiqueta}</dt>
                                    <dd className="font-bold text-slate-900">{caract.texto}</dd>
                                </div>
                            ))}
                        </dl>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </section>
    );
}

interface PasosSiguientesProps {
    autoevaluacion: ResumenProps['autoevaluacion'];
    esRegistrada: boolean;
    tieneUsuario: boolean;
    pendientes: number;
    corregidas: number;
    onConfirmarClick: (triggerElement: HTMLButtonElement) => void;
}

/**
 * Cierre del resumen: qué hacer ahora, en tres pasos con un solo botón cada uno.
 * Reemplaza al antiguo "sello de validez" (hash, UUID, "versión sellada"), que no
 * le decía nada al emprendedor.
 */
function PasosSiguientes({ autoevaluacion, esRegistrada, tieneUsuario, pendientes, corregidas, onConfirmarClick }: Readonly<PasosSiguientesProps>) {
    const uuid = autoevaluacion.uuid;
    const fecha = fechaLarga(autoevaluacion.registrada_at);
    const pasos = [
        pendientes > 0
            ? {
                  icono: Wrench,
                  titulo: 'Corrige lo que te falta',
                  texto: `Tienes ${pendientes} ${pendientes === 1 ? 'cosa' : 'cosas'} por corregir. Te decimos cómo y quién te ayuda cerca.`,
                  boton: 'Empezar a corregir',
                  href: route('autoevaluacion.subsanar_items', { uuid }),
              }
            : {
                  icono: CheckCircle2,
                  titulo: 'Tu local está en orden',
                  texto:
                      corregidas > 0
                          ? `Corregiste ${corregidas} ${corregidas === 1 ? 'cosa' : 'cosas'} y ya no te falta nada. Mantenlo así hasta la inspección.`
                          : 'Según lo que declaraste, no te falta nada. Mantenlo así hasta la inspección.',
                  boton: corregidas > 0 ? 'Ver lo que corregí' : 'Ver mis respuestas',
                  href: corregidas > 0 ? route('autoevaluacion.subsanar_items', { uuid }) : route('autoevaluacion.checklist', { uuid }),
              },
        {
            icono: Files,
            titulo: 'Arma tu expediente',
            texto: 'Junta tus documentos y fotos en un solo lugar. Ahí descargas tu declaración jurada lista para firmar.',
            boton: 'Ir a mi expediente',
            href: route('autoevaluacion.expediente_digital', { uuid }),
        },
        {
            icono: FileText,
            titulo: 'Descarga tu informe',
            texto: 'Un resumen de tu local en PDF para imprimir, guardar o mostrar a tu técnico.',
            boton: 'Ver y descargar (PDF)',
            href: route('autoevaluacion.informe', { uuid }),
        },
    ];

    return (
        <section aria-labelledby="que-sigue-titulo" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-primary-700 text-sm font-bold tracking-[0.2em] uppercase">¿Qué sigue?</p>
                    <h2 id="que-sigue-titulo" className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                        Tu camino desde aquí
                    </h2>
                </div>
                {autoevaluacion.codigo_acceso && (
                    <p className="rounded-2xl bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                        Código de tu registro{' '}
                        <strong className="font-mono text-base tracking-wider text-slate-900">{autoevaluacion.codigo_acceso}</strong>
                        {fecha && <span className="block">Guardado el {fecha}</span>}
                    </p>
                )}
            </div>

            {!esRegistrada && (
                <div className="border-sun-300 bg-sun-50 mt-6 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-base text-slate-800">
                        <strong className="block text-lg">Guarda tu resultado</strong>
                        Así podrás corregir lo que falta, armar tu expediente y descargar tu informe.
                    </p>
                    <button
                        type="button"
                        onClick={(e) => onConfirmarClick(e.currentTarget)}
                        className="bg-primary hover:bg-primary-700 inline-flex min-h-13 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 text-lg font-bold text-white"
                    >
                        <Save aria-hidden="true" className="size-5" /> Guardar mi resultado
                    </button>
                </div>
            )}

            <ol className="mt-6 grid gap-4 md:grid-cols-3">
                {pasos.map((paso, i) => {
                    const Icono = paso.icono;
                    const bloqueado = !esRegistrada && i > 0;
                    return (
                        <li key={paso.titulo} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                            <div className="flex items-center gap-3">
                                <span className="bg-ink-900 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                                    {i + 1}
                                </span>
                                <Icono aria-hidden="true" className="text-primary-600 size-6" />
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-slate-900">{paso.titulo}</h3>
                            <p className="mt-1 flex-1 text-base leading-relaxed text-slate-600">{paso.texto}</p>
                            {bloqueado ? (
                                <p className="mt-4 text-sm font-semibold text-slate-500">Disponible al guardar tu resultado.</p>
                            ) : (
                                <Link
                                    href={paso.href}
                                    className={`mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold ${i === 0 ? 'bg-primary hover:bg-primary-700 text-white' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100'}`}
                                >
                                    {paso.boton} <ArrowRight aria-hidden="true" className="size-4" />
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-5 text-base">
                <Link
                    href={route('autoevaluacion.checklist', { uuid })}
                    className="text-primary-700 inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline"
                >
                    <RotateCcw aria-hidden="true" className="size-4" /> {esRegistrada ? 'Ver mis respuestas' : 'Cambiar mis respuestas'}
                </Link>
                {tieneUsuario && (
                    <Link
                        href={route('mis-autoevaluaciones')}
                        className="text-primary-700 inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline"
                    >
                        <Building2 aria-hidden="true" className="size-4" /> Mis locales
                    </Link>
                )}
                {esRegistrada && (
                    <Link
                        href={route('autoevaluacion.reevaluar', { uuid })}
                        className="text-primary-700 inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline"
                    >
                        <RefreshCw aria-hidden="true" className="size-4" /> Volver a evaluar (después de corregir)
                    </Link>
                )}
            </div>
            <p className="mt-3 text-sm text-slate-500">
                Es una simulación orientativa según lo que declaraste. No reemplaza la inspección de tu municipalidad ni emite certificados ITSE.
            </p>
        </section>
    );
}

interface ModalConfirmacionRegistroProps {
    mostrar: boolean;
    modalRef: React.RefObject<HTMLDivElement | null>;
    cancelBtnRef: React.RefObject<HTMLButtonElement | null>;
    finalizando: boolean;
    errorFinalizar: string | null;
    pendientesFinalizar: FinalizarPendiente[];
    uuid: string;
    onCerrar: () => void;
    onConfirmar: () => void;
}

function ModalConfirmacionRegistro({
    mostrar,
    modalRef,
    cancelBtnRef,
    finalizando,
    errorFinalizar,
    pendientesFinalizar,
    uuid,
    onCerrar,
    onConfirmar,
}: Readonly<ModalConfirmacionRegistroProps>) {
    if (!mostrar) return null;

    return (
        <dialog
            open
            aria-labelledby="modal-confirmar-titulo"
            className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-slate-950/70 p-4 backdrop-blur-xs transition-opacity"
        >
            <div
                ref={modalRef}
                className="animate-in fade-in zoom-in-95 relative w-full max-w-lg space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl duration-150 sm:p-7"
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 id="modal-confirmar-titulo" className="text-lg font-bold text-slate-900">
                                Confirmar y Registrar Autoevaluación
                            </h2>
                            <p className="text-sm text-slate-500">Cierre formal e inmutable del diagnóstico técnico.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="cursor-pointer rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Cerrar modal"
                        disabled={finalizando}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-1.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>Atención: Acción Definitiva e Inmutable</span>
                    </div>
                    <p className="leading-relaxed">
                        Al registrar la autoevaluación, las declaraciones quedarán guardadas como una versión sellada y ya no podrán modificarse. Si
                        posteriormente deseas realizar cambios, podrás iniciar una reevaluación conservando este registro histórico.
                    </p>
                </div>

                {errorFinalizar && (
                    <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                            <p className="font-semibold">{errorFinalizar}</p>
                        </div>

                        {pendientesFinalizar.length > 0 && (
                            <ul className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-rose-100 bg-white/80 p-2.5">
                                {pendientesFinalizar.map((pendiente) => (
                                    <li key={pendiente.codigo} className="flex flex-col gap-0.5">
                                        <span className="font-mono text-sm font-bold text-rose-900">{pendiente.codigo}</span>
                                        <span className="text-rose-800">{pendiente.titulo}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <Link
                            href={route('autoevaluacion.checklist', { uuid })}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-sm font-bold text-rose-800 transition hover:bg-rose-50"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Volver al checklist para responder</span>
                        </Link>
                    </div>
                )}

                <div className="flex flex-col items-center justify-end gap-3 pt-2 sm:flex-row">
                    <button
                        ref={cancelBtnRef}
                        type="button"
                        onClick={onCerrar}
                        disabled={finalizando}
                        className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={finalizando}
                        className="bg-primary hover:bg-primary-700 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-xs transition disabled:opacity-50 sm:w-auto"
                    >
                        {finalizando ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Registrando...</span>
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                <span>Confirmar registro</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </dialog>
    );
}

export default function Resumen({
    autoevaluacion,
    resumen = {
        total_criterios_aplicables: 0,
        total_cumple_declarado: 0,
        total_pendiente_atender: 0,
        total_por_revisar: 0,
        total_no_aplica: 0,
    },
    pendiente_atender = [],
    por_revisar = [],
    cumple_declarado = [],
    clasificacion_tramite = null,
    corregidas = 0,
}: Readonly<ResumenProps>) {
    const { auth } = usePage().props as { auth?: { user: { id?: number; name?: string; email?: string; [key: string]: unknown } | null } };
    const [mostrarModalGuardar, setMostrarModalGuardar] = useState<boolean>(false);
    const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState<boolean>(false);
    const [finalizando, setFinalizando] = useState<boolean>(false);
    const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);
    const [pendientesFinalizar, setPendientesFinalizar] = useState<FinalizarPendiente[]>([]);

    const triggerRef = useRef<HTMLElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!mostrarModalConfirmacion) return;

        const timer = setTimeout(() => {
            cancelBtnRef.current?.focus();
        }, 50);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (!finalizando) {
                    setMostrarModalConfirmacion(false);
                    setErrorFinalizar(null);
                }
                return;
            }
            manejarTrapFocoModal(event, modalRef.current);
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            restaurarFocoTrigger(triggerRef);
        };
    }, [mostrarModalConfirmacion, finalizando]);

    const esRegistrada = autoevaluacion?.estado === 'REGISTRADA';

    const modalidadTramite = useMemo(() => resolverModalidadTramite(clasificacion_tramite), [clasificacion_tramite]);

    const caracteristicasDeclaradas = useMemo(
        () => extraerCaracteristicasDeclaradas(autoevaluacion?.caracteristicas_declaradas),
        [autoevaluacion?.caracteristicas_declaradas],
    );

    const { esApto, pctCumple } = calcularMetricasResumen(resumen);

    const nivelRiesgoTexto = useMemo(() => resolverNivelRiesgoTexto(clasificacion_tramite, resumen), [clasificacion_tramite, resumen]);

    const esRiesgoAlto = useMemo(
        () => determinarEsRiesgoAlto(clasificacion_tramite, resumen?.total_pendiente_atender),
        [clasificacion_tramite, resumen?.total_pendiente_atender],
    );

    const esModalidadExAnte = useMemo(() => determinarEsModalidadExAnte(clasificacion_tramite, esRiesgoAlto), [clasificacion_tramite, esRiesgoAlto]);

    const estimacionEconomica = useMemo(() => calcularEstimacionEconomica(pendiente_atender), [pendiente_atender]);

    const cerrarModalConfirmacion = () => {
        if (!finalizando) {
            setMostrarModalConfirmacion(false);
            setErrorFinalizar(null);
        }
    };

    const handleFinalizar = async () => {
        setFinalizando(true);
        setErrorFinalizar(null);
        setPendientesFinalizar([]);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

            const response = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/finalizar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                setMostrarModalConfirmacion(false);
                router.visit(window.location.pathname, {
                    replace: true,
                    preserveScroll: false,
                    preserveState: false,
                });
                return;
            }

            const data = await response.json().catch(() => null);
            const resultadoError = procesarErrorRespuestaFinalizar(response.status, data);
            setErrorFinalizar(resultadoError.error);
            setPendientesFinalizar(resultadoError.pendientes);
        } catch {
            setErrorFinalizar('No fue posible registrar la autoevaluación. Verifique su conexión e intente nuevamente.');
        } finally {
            setFinalizando(false);
        }
    };

    return (
        <>
            <Head title="Tu resultado - CheckITSE Huancayo" />

            <div className="relative min-h-screen bg-slate-50/70 py-6 font-sans sm:py-8">
                {/* Capa de textura cuadriculada sutil */}

                <div className="relative mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {/* ========================================================================= */}
                    {/* BARRA SUPERIOR DE FLUJO CÍVICO                                            */}
                    {/* ========================================================================= */}
                    <BarraFlujoSuperiorResumen mostrarBotonGuardar={!auth?.user} onAbrirGuardar={() => setMostrarModalGuardar(true)} />

                    {/* ========================================================================= */}
                    {/* A. HERO BANNER DEL SEMÁFORO DE RIESGO (Subcomponente Modular)             */}
                    {/* ========================================================================= */}
                    <FlujoCiudadano actual={3} />
                    <ResumenHeader
                        nombreComercio={autoevaluacion?.nombre_comercio}
                        uuidTrazabilidad={autoevaluacion?.uuid}
                        nivelRiesgo={nivelRiesgoTexto}
                        tipoTramite={clasificacion_tramite?.tipo_tramite}
                        estado={autoevaluacion.estado}
                        fechaEmision={formatearFechaEmisionHero(autoevaluacion?.registrada_at)}
                        codigoAcceso={autoevaluacion?.codigo_acceso ?? undefined}
                        funcionEconomica={autoevaluacion?.funcion_economica ?? undefined}
                        direccion={autoevaluacion?.direccion ?? undefined}
                        ruc={autoevaluacion?.ruc ?? undefined}
                        esApto={esApto}
                        esRegistrada={esRegistrada}
                        porcentaje={pctCumple}
                        corregidas={corregidas}
                        conteo={{
                            listo: resumen?.total_cumple_declarado ?? 0,
                            falta: resumen?.total_pendiente_atender ?? 0,
                            porRevisar: resumen?.total_por_revisar ?? 0,
                            noAplica: resumen?.total_no_aplica ?? 0,
                        }}
                    />

                    {/* ========================================================================= */}
                    {/* B. BARRA DE SALUD TÉCNICA Y MÉTRICAS PROPORCIONALES (Bento Superior)       */}
                    {/* ========================================================================= */}
                    {(pendiente_atender.length > 0 || por_revisar.length > 0) && (
                        <LoQueTeFalta
                            items={[
                                ...pendiente_atender.map((item) => ({ ...item, estado: 'PENDIENTE_ATENDER' })),
                                ...por_revisar.map((item) => ({ ...item, estado: 'POR_REVISAR' })),
                            ].map((item) => ({ ...item, codigo: String(item.codigo ?? ''), titulo: String(item.titulo ?? '') }))}
                            nombreLocal={autoevaluacion?.nombre_comercio}
                        />
                    )}
                    {/* Detalle técnico: lo que antes era un muro de texto, ordenado en pestañas. */}
                    <details className="group rounded-3xl border border-slate-200 bg-white">
                        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-8 [&::-webkit-details-marker]:hidden">
                            <span>
                                <span className="font-display block text-xl font-bold text-slate-900 sm:text-2xl">Más detalles de tu trámite</span>
                                <span className="block text-base text-slate-600">Qué trámite te toca, qué documentos llevar y cuánto cuesta.</span>
                            </span>
                            <span className="bg-ink-900 flex size-10 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white transition group-open:rotate-45">
                                +
                            </span>
                        </summary>
                        <div className="border-t border-slate-100 p-4 sm:p-6">
                            <Tabs defaultValue="tramite" className="w-full space-y-5">
                                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/70 p-1.5">
                                    {PESTANAS_DETALLE.map(({ valor, etiqueta, icono: Icono }) => (
                                        <TabsTrigger
                                            key={valor}
                                            value={valor}
                                            className="flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-base font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                                        >
                                            <Icono aria-hidden="true" className="size-4" /> {etiqueta}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                <TabsContent value="tramite" className="focus-visible:outline-hidden">
                                    <SeccionModalidadTramite
                                        modalidadTramite={modalidadTramite}
                                        esModalidadExAnte={esModalidadExAnte}
                                        uuid={autoevaluacion.uuid}
                                    />
                                </TabsContent>

                                <TabsContent value="costos" className="focus-visible:outline-hidden">
                                    <SeccionEstimadorEconomico
                                        pendienteAtenderCount={pendiente_atender.length}
                                        estimacionEconomica={estimacionEconomica}
                                    />
                                </TabsContent>

                                <TabsContent value="datos" className="space-y-4 focus-visible:outline-hidden">
                                    <SeccionPuntosFuertes
                                        cumpleDeclarado={cumple_declarado}
                                        totalCumpleDeclarado={resumen?.total_cumple_declarado ?? 0}
                                    />
                                    <SeccionCaracteristicasDeclaradas caracteristicasDeclaradas={caracteristicasDeclaradas} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </details>

                    <PasosSiguientes
                        autoevaluacion={autoevaluacion}
                        esRegistrada={esRegistrada}
                        tieneUsuario={Boolean(auth?.user)}
                        pendientes={resumen?.total_pendiente_atender ?? 0}
                        corregidas={corregidas}
                        onConfirmarClick={(triggerElement) => {
                            triggerRef.current = triggerElement;
                            setErrorFinalizar(null);
                            setMostrarModalConfirmacion(true);
                        }}
                    />
                </div>
            </div>

            {/* Modal de Confirmación de Registro Formal */}
            <ModalConfirmacionRegistro
                mostrar={mostrarModalConfirmacion}
                modalRef={modalRef}
                cancelBtnRef={cancelBtnRef}
                finalizando={finalizando}
                errorFinalizar={errorFinalizar}
                pendientesFinalizar={pendientesFinalizar}
                uuid={autoevaluacion.uuid}
                onCerrar={cerrarModalConfirmacion}
                onConfirmar={handleFinalizar}
            />

            {/* Modales Auxiliares */}
            <ModalGuardarProgreso
                isOpen={mostrarModalGuardar}
                onClose={() => setMostrarModalGuardar(false)}
                uuid={autoevaluacion?.uuid}
                establecimiento={autoevaluacion?.nombre_comercio}
                destino="resumen"
            />
        </>
    );
}
