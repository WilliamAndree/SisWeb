import { GuiaModal } from '@/components/GuiaModal';
import { ModalConfirmarReevaluacion } from '@/components/ModalConfirmarReevaluacion';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { RecursoEducativoData, VideoEducativoModal } from '@/components/VideoEducativoModal';
import { CATEGORIA_LABELS, CategoriaChecklist, CHECKLIST_CATALOGO_OFICIAL, RecursoCatalogo } from '@/data/checklistCatalogo';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Clock,
    DollarSign,
    ExternalLink,
    FileText,
    Hash,
    HelpCircle,
    Info,
    PlayCircle,
    Printer,
    RefreshCw,
    Save,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CryptoSealBadge } from '@/components/shared/CryptoSealBadge';
import { formatearNivelRiesgo } from '@/lib/riesgo';

interface TareaPlan {
    codigo: string;
    item: string;
    tarea: string;
    prioridad: 'Alta' | 'Media' | 'Baja';
    dias_plazo: number;
    costo_soles: number;
    norma: string;
}

interface PlanAccionData {
    tareas: TareaPlan[];
    costo_total: number;
    total_items: number;
}

interface AutoevaluacionData {
    id: number;
    uuid_trazabilidad: string;
    hash_integridad?: string;
    nombre_comercio: string;
    funcion_economica: string;
    ruc: string;
    sector_huancayo: string;
    direccion?: string | null;
    referencia?: string | null;
    area_m2: number;
    pisos: number;
    aforo: number;
    usa_glp: boolean;
    galones_glp: number;
    tipo_tramite?: string | null;
    nivel_riesgo?: string | null;
    porcentaje_cumplimiento: number;
    semaforo: 'VERDE' | 'AMBAR' | 'ROJO';
    detalle_checklist: Array<{
        codigo: string;
        nombre: string;
        cumple: boolean;
        estado?: string;
        es_critico?: boolean;
        norma?: string;
    }>;
    plan_accion_costos?: PlanAccionData;
    evaluacion_origen_id?: number | null;
    evaluacion_origen?: {
        id: number;
        uuid_trazabilidad: string;
        created_at?: string;
    } | null;
    created_at: string;
}

interface PendienteDetalle {
    numero: number;
    codigo: string;
    nombre: string;
    estado: 'CUMPLE' | 'NO_CUMPLE' | 'POR_REVISAR' | 'NA';
    es_critico: boolean;
    norma?: string;
    categoria?: CategoriaChecklist;
    por_que?: string;
    que_observar?: string;
    solucion?: string;
    recurso?: RecursoCatalogo | null;
}

interface Props {
    autoevaluacion: AutoevaluacionData;
    catalogo?: RecursoCatalogo[];
}

type EstadoDeclarado = AutoevaluacionData['detalle_checklist'][number];

function estadoDe(item: EstadoDeclarado): PendienteDetalle['estado'] {
    const estado = item.estado ?? (item.cumple ? 'CUMPLE' : 'NO_CUMPLE');
    if (estado === 'CUMPLE' || estado === 'NO_CUMPLE' || estado === 'POR_REVISAR' || estado === 'NA') {
        return estado;
    }

    return item.cumple ? 'CUMPLE' : 'NO_CUMPLE';
}

const PLAN_ACCION_VACIO: PlanAccionData = {
    tareas: [],
    costo_total: 0,
    total_items: 0,
};

function construirUrlSimulacion(uuid?: string): string {
    if (!uuid) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/autoevaluacion/revision/${uuid}`;
}

function resolverDescripcionAmbar(noCumpleCount: number, porRevisarCount: number): string {
    if (noCumpleCount > 0) {
        return `Declaraste ${noCumpleCount} condición(es) como pendiente(s) de atender y ${porRevisarCount} aspecto(s) todavía por revisar. Avanza en tu preparación y registra tu plan de subsanación preventiva. El resultado refleja lo declarado en esta autoevaluación.`;
    }

    if (porRevisarCount > 0) {
        return `Declaraste ${porRevisarCount} aspecto(s) que todavía están por revisar. Completar esas verificaciones te permite afinar tu nivel de preparación antes de una eventual visita técnica. El resultado refleja lo declarado en esta autoevaluación.`;
    }

    return 'Existen condiciones que aún declaras como no cumplidas o por revisar. Avanza en preparación y registra tu plan de subsanación preventiva. El resultado refleja lo declarado en esta autoevaluación.';
}

function resolverDescripcionRojo(hayFallaCritica: boolean, hayNoCumple: boolean, hayPorRevisar: boolean): string {
    if (hayFallaCritica) {
        return 'Declaraste fallas críticas de seguridad (riesgo de incendio o electrocución). Por tu seguridad, prioriza atenderlas antes de una eventual visita técnica municipal. El resultado refleja lo declarado en esta autoevaluación.';
    }

    if (hayNoCumple) {
        return 'Declaraste varias condiciones como pendientes de atender. Tu nivel de preparación es bajo; revisa el detalle y prioriza las acciones de mejora. El resultado refleja lo declarado en esta autoevaluación.';
    }

    if (hayPorRevisar) {
        return 'Aún tienes aspectos por revisar antes de considerar completa tu preparación. No declaraste incumplimientos confirmados; determina el estado real de cada aspecto señalado. El resultado refleja lo declarado en esta autoevaluación.';
    }

    return 'Autoevaluación procesada según lo declarado en este registro.';
}

function resolverDescripcionSemaforo(
    semaforo: AutoevaluacionData['semaforo'],
    noCumpleCount: number,
    porRevisarCount: number,
    hayFallaCritica: boolean,
): string {
    if (semaforo === 'VERDE') {
        return 'Declaraste cumplir todas las condiciones técnicas de seguridad que corresponden a tu establecimiento, según tu propia evaluación. Mantén la evidencia de cada condición al día. El resultado refleja lo declarado en esta autoevaluación. No constituye una aprobación o certificación oficial.';
    }

    if (semaforo === 'AMBAR') {
        return resolverDescripcionAmbar(noCumpleCount, porRevisarCount);
    }

    return resolverDescripcionRojo(hayFallaCritica, noCumpleCount > 0, porRevisarCount > 0);
}

interface ConfiguracionSemaforoResultado {
    titulo: string;
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    descripcion: string;
    icono: typeof CheckCircle2;
}

const ESTILOS_SEMAFORO_BASE: Record<string, Omit<ConfiguracionSemaforoResultado, 'descripcion'>> = {
    VERDE: {
        titulo: 'Nivel de Preparación Alto',
        bg: 'bg-[#34C759]/10',
        border: 'border-[#34C759]/30',
        text: 'text-[#1b7931]',
        badgeBg: 'bg-[#34C759]',
        icono: CheckCircle2,
    },
    AMBAR: {
        titulo: 'Nivel de Preparación Medio (Con Observaciones)',
        bg: 'bg-[#FF9500]/10',
        border: 'border-[#FF9500]/30',
        text: 'text-[#9a5b00]',
        badgeBg: 'bg-[#FF9500]',
        icono: AlertTriangle,
    },
    ROJO: {
        titulo: 'Nivel de Preparación Crítico',
        bg: 'bg-[#FF3B30]/10',
        border: 'border-[#FF3B30]/30',
        text: 'text-[#c9251d]',
        badgeBg: 'bg-[#FF3B30]',
        icono: ShieldAlert,
    },
};

const ESTILO_SEMAFORO_DEFECTO: Omit<ConfiguracionSemaforoResultado, 'descripcion'> = {
    titulo: 'Autoevaluado',
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    text: 'text-neutral-800',
    badgeBg: 'bg-neutral-700',
    icono: ShieldCheck,
};

function resolverConfigSemaforo(
    semaforo: AutoevaluacionData['semaforo'],
    descripcion: string,
): ConfiguracionSemaforoResultado {
    const base = ESTILOS_SEMAFORO_BASE[semaforo] || ESTILO_SEMAFORO_DEFECTO;
    return {
        ...base,
        descripcion,
    };
}

function consejoProfesional(pendiente: PendienteDetalle): string {
    switch (pendiente.categoria) {
        case 'ELECTRICIDAD':
            return 'Para condiciones eléctricas, evita modificaciones por tu cuenta. Si requieres intervenir el tablero, el cableado o el pozo a tierra, conviene que lo revise un profesional electricista calificado.';
        case 'INCENDIOS':
            return 'Para equipos de protección contra incendios (recarga de extintores, mantenimiento o instalación), considera contar con una empresa o técnico autorizado para esas intervenciones.';
        case 'EVACUACION':
            return 'Para rutas de salida, puertas o señalización, si después de revisar no tienes certeza del cumplimiento, consulta a un profesional en instalaciones.';
        case 'ESTRUCTURAL_AUXILIOS':
            return 'Para anclajes, vidrios o elementos estructurales, si después de revisar no tienes certeza del cumplimiento, conviene consultar a un ingeniero o profesional calificado.';
        default:
            return 'Si después de revisar no tienes certeza sobre el cumplimiento técnico del aspecto, conviene consultar a un profesional calificado.';
    }
}

function claseBadgeEstadoChecklist(estado?: string): string {
    if (estado === 'CUMPLE') return 'bg-[#34C759]/10 text-[#1b7931] border border-[#34C759]/30';
    if (estado === 'POR_REVISAR') return 'bg-[#FF9500]/10 text-[#9a5b00] border border-[#FF9500]/30';
    if (estado === 'NA') return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
    return 'bg-[#FF3B30]/10 text-[#c9251d] border border-[#FF3B30]/30';
}

function etiquetaEstadoChecklist(item: EstadoDeclarado): string {
    if (item.estado) return item.estado;
    return item.cumple ? 'CUMPLE' : 'NO CUMPLE';
}

function clasePrioridadTarea(prioridad: TareaPlan['prioridad']): string {
    if (prioridad === 'Alta') return 'bg-[#FF3B30]/10 text-[#c9251d] border border-[#FF3B30]/30';
    if (prioridad === 'Media') return 'bg-[#FF9500]/10 text-[#9a5b00] border border-[#FF9500]/30';
    return 'bg-neutral-100 text-neutral-700 border border-neutral-200';
}

interface DetalleOrientacionPendienteProps {
    pendiente: PendienteDetalle;
}

function DetalleOrientacionPendiente({ pendiente }: Readonly<DetalleOrientacionPendienteProps>) {
    return (
        <div id={`orientacion-${pendiente.codigo}`} className="mt-2 space-y-3.5 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-5">
            <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl border border-neutral-200 bg-white p-2 text-neutral-800 shadow-2xs">
                    <BookOpen className="h-4 w-4" />
                </div>
                <div>
                    <strong className="block text-xs font-bold text-neutral-900">¿Qué identificaste?</strong>
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-700">{pendiente.por_que || pendiente.nombre}</p>
                </div>
            </div>

            {pendiente.que_observar && (
                <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-xl border border-[#FF9500]/30 bg-[#FF9500]/10 p-2 text-[#9a5b00] shadow-2xs">
                        <Info className="h-4 w-4" />
                    </div>
                    <div>
                        <strong className="block text-xs font-bold text-neutral-900">¿Qué puedes revisar?</strong>
                        <p className="mt-0.5 text-xs leading-relaxed text-neutral-700">{pendiente.que_observar}</p>
                    </div>
                </div>
            )}

            {pendiente.solucion && (
                <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-xl border border-[#34C759]/30 bg-[#34C759]/10 p-2 text-[#1b7931] shadow-2xs">
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                        <strong className="block text-xs font-bold text-neutral-900">¿Qué puedes hacer?</strong>
                        <p className="mt-0.5 text-xs leading-relaxed text-neutral-700">{pendiente.solucion}</p>
                    </div>
                </div>
            )}

            <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl border border-amber-200/60 bg-amber-50 p-2 text-amber-800 shadow-2xs">
                    <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                    <strong className="block text-xs font-bold text-neutral-900">¿Cuándo conviene consultar a un profesional?</strong>
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-700">{consejoProfesional(pendiente)}</p>
                </div>
            </div>

            {pendiente.recurso?.base_legal && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-[#FF3B30]/20 bg-[#FF3B30]/5 p-3.5 text-xs text-neutral-700">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#c9251d]" />
                    <div>
                        <strong className="block text-[10px] tracking-wider font-bold text-[#c9251d] uppercase">Base legal referencial</strong>
                        <span className="font-mono text-xs">{pendiente.recurso.base_legal}</span>
                    </div>
                </div>
            )}

            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-neutral-500 pt-1">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span>
                    Esta orientación es educativa y preventiva. Lo que registres refleja tu declaración ciudadana; no reemplaza la
                    verificación que realiza la autoridad competente.
                </span>
            </p>
        </div>
    );
}

interface TarjetaPendienteItemProps {
    pendiente: PendienteDetalle;
    onAbrirRecurso: (pendiente: PendienteDetalle) => void;
}

function TarjetaPendienteItem({
    pendiente,
    onAbrirRecurso,
}: Readonly<TarjetaPendienteItemProps>) {
    const esNoCumple = pendiente.estado === 'NO_CUMPLE';
    const badgeEstado = esNoCumple ? 'Pendiente identificado' : 'Por revisar';
    const badgeClases = esNoCumple
        ? 'border border-[#FF3B30]/30 bg-[#FF3B30]/10 text-[#c9251d]'
        : 'border border-[#FF9500]/30 bg-[#FF9500]/10 text-[#9a5b00]';

    return (
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-7 text-left shadow-sm transition-all hover:border-neutral-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-xs font-black text-white shadow-xs">
                        {pendiente.numero}
                    </span>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${badgeClases}`}>
                                {badgeEstado}
                            </span>
                            {pendiente.es_critico && esNoCumple && (
                                <span className="rounded-full bg-[#FF3B30] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-xs">
                                    Prioridad crítica
                                </span>
                            )}
                        </div>
                        <h4 className="mt-2 text-base font-bold text-neutral-900 leading-snug">{pendiente.nombre}</h4>
                        {pendiente.categoria && (
                            <p className="mt-1 text-xs text-neutral-500">
                                Categoría: <strong className="text-neutral-700">{CATEGORIA_LABELS[pendiente.categoria]}</strong>
                                {pendiente.norma && <span className="ml-2 font-mono text-neutral-400">{pendiente.norma}</span>}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {pendiente.por_que && <p className="mt-3 text-xs leading-relaxed text-neutral-600">{pendiente.por_que}</p>}

            <div className="mt-4 pt-2 border-t border-neutral-100">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value={`orientacion-${pendiente.codigo}`} className="border-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <AccordionTrigger className="py-2 px-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:no-underline text-xs font-bold text-neutral-800 transition">
                                <span className="flex items-center gap-2">
                                    <HelpCircle className="h-4 w-4 text-[#FF9500]" />
                                    <span>Consultar orientación técnica</span>
                                </span>
                            </AccordionTrigger>

                            {pendiente.recurso?.video_url && (
                                <button
                                    type="button"
                                    onClick={() => onAbrirRecurso(pendiente)}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                                >
                                    <PlayCircle className="h-4 w-4 text-[#34C759]" />
                                    <span>Ver guía / video</span>
                                </button>
                            )}
                        </div>
                        <AccordionContent className="pt-3 pb-0">
                            <DetalleOrientacionPendiente pendiente={pendiente} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}

interface EncabezadoResultadoProps {
    readonly esReevaluacion: boolean;
    readonly hashIntegridad?: string | null;
    readonly fecha?: string | null;
}

function EncabezadoResultado({
    esReevaluacion,
    hashIntegridad,
    fecha,
}: Readonly<EncabezadoResultadoProps>) {
    return (
        <>
            {/* Encabezado Cívico de la Autoevaluación */}
            <div className="mb-6 text-left print:break-inside-avoid">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-rose-800 uppercase">
                        {esReevaluacion ? 'Nueva Autoevaluación Preventiva' : 'Autoevaluación Preventiva'} · Huancayo
                    </span>
                    {esReevaluacion && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                            Resultado Actualizado
                        </span>
                    )}
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
                    {esReevaluacion ? 'Resultado de tu nueva autoevaluación' : 'Resultado de tu autoevaluación'}
                </h1>
                <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                    {esReevaluacion
                        ? 'Esta evaluación se realizó nuevamente para revisar el estado actual declarado del establecimiento.'
                        : 'Diagnóstico cívico de preparación técnica de seguridad para tu establecimiento comercial.'}
                </p>

                {/* Sello Criptográfico SHA-256 e Integridad */}
                {hashIntegridad && (
                    <div className="mt-3">
                        <CryptoSealBadge
                            hash={hashIntegridad}
                            fecha={fecha}
                            esInmutable={true}
                        />
                    </div>
                )}
            </div>

            {/* Referencia contextual para reevaluaciones */}
            {esReevaluacion && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-4 text-left text-xs text-emerald-950 print:break-inside-avoid">
                    <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <div className="space-y-1">
                        <p className="font-bold text-emerald-900">
                            Esta es una nueva autoevaluación. La evaluación anterior se conserva sin cambios.
                        </p>
                        <p className="text-[11px] leading-relaxed text-emerald-800/90">
                            Esta evaluación se realizó nuevamente para revisar el estado actual declarado del establecimiento. Este resultado
                            refleja exclusivamente lo que declaraste en esta nueva evaluación.
                        </p>
                    </div>
                </div>
            )}

            {/* Aviso preventivo de no-oficialidad */}
            <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3.5 text-left text-xs text-neutral-600 print:break-inside-avoid">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                <p className="text-[11px] leading-relaxed">
                    <strong>Aviso preventivo:</strong> Este resultado corresponde a una autoevaluación declarada por el ciudadano y no constituye
                    una aprobación, certificación ni inspección oficial.
                </p>
            </div>
        </>
    );
}

interface TabFichaProps {
    autoevaluacion: AutoevaluacionData;
    configSemaforo: ConfiguracionSemaforoResultado;
    urlSimulacion: string;
    detalleChecklist: EstadoDeclarado[];
}

function TabFicha({
    autoevaluacion,
    configSemaforo,
    urlSimulacion,
    detalleChecklist,
}: Readonly<TabFichaProps>) {
    const IconoSemaforo = configSemaforo.icono;
    const ubicacionTexto = [autoevaluacion.direccion, autoevaluacion.referencia].filter(Boolean).join(' · ');

    return (
        <div className="space-y-6">
            {/* Tarjeta del Semáforo */}
            <div className={`rounded-3xl border p-6 sm:p-8 text-left shadow-sm ${configSemaforo.bg} ${configSemaforo.border}`}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-4">
                        <div className={`shrink-0 rounded-2xl p-3.5 text-white shadow-xs ${configSemaforo.badgeBg}`}>
                            <IconoSemaforo className="h-7 w-7" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shadow-xs ${configSemaforo.badgeBg}`}
                                >
                                    Nivel {autoevaluacion.semaforo}
                                </span>
                                <span className="text-xs font-bold text-neutral-600">
                                    {autoevaluacion.porcentaje_cumplimiento}% de Preparación Declarada
                                </span>
                            </div>
                            <h2 className={`mt-1.5 text-2xl font-black tracking-tight ${configSemaforo.text}`}>{configSemaforo.titulo}</h2>
                            <p className="mt-1 max-w-xl text-xs leading-relaxed text-neutral-600">{configSemaforo.descripcion}</p>
                        </div>
                    </div>

                    {autoevaluacion.tipo_tramite && (
                        <div className="border-t border-neutral-200/60 pt-3 sm:border-t-0 sm:pt-0 sm:text-right">
                            <span className="block text-[10px] font-bold text-neutral-400 uppercase">Modalidad Proyectada:</span>
                            <span className="text-sm font-extrabold text-neutral-900">
                                {autoevaluacion.tipo_tramite === 'EX_POST' ? 'ITSE Posterior (Ex-Post)' : 'ITSE Previa (Ex-Ante)'}
                            </span>
                            {autoevaluacion.nivel_riesgo && (
                                <span className="mt-0.5 block text-[10px] text-neutral-500">
                                    Riesgo declarado: <strong>{formatearNivelRiesgo(autoevaluacion.nivel_riesgo)}</strong>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Expediente de Autoevaluación Preventiva con Trazabilidad */}
            <div className="space-y-6 rounded-3xl border border-neutral-200/80 bg-white p-6 text-left shadow-sm sm:p-8">
                <div className="flex flex-col items-start justify-between gap-4 border-b border-neutral-100 pb-6 sm:flex-row sm:items-center">
                    <div>
                        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-700 uppercase">
                            Expediente Digital de Autoevaluación Preventiva · Huancayo
                        </span>
                        <h3 className="mt-2 text-xl font-extrabold text-neutral-900">{autoevaluacion.nombre_comercio}</h3>
                        <p className="mt-0.5 text-xs text-neutral-500">
                            RUC: <strong className="font-mono">{autoevaluacion.ruc}</strong> · Giro:{' '}
                            <strong>{autoevaluacion.funcion_economica}</strong>
                        </p>
                        {ubicacionTexto && (
                            <p className="mt-0.5 text-xs text-neutral-500">
                                {ubicacionTexto}
                            </p>
                        )}
                    </div>

                    {/* Enlace de seguimiento */}
                    <div className="flex items-center gap-4 self-center rounded-2xl border border-neutral-100 bg-neutral-50 p-4 sm:self-auto shadow-2xs">
                        <div className="space-y-1 text-[10px] text-neutral-500">
                            <span className="block text-xs font-bold text-neutral-800">Seguimiento Preventivo</span>
                            <p className="leading-tight text-neutral-500">
                                Abre tu simulación de revisión in situ y da seguimiento a tu plan de preparación.
                            </p>
                            <a
                                href={urlSimulacion}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#34C759] inline-flex items-center gap-1 pt-1 font-bold hover:underline"
                            >
                                <span>Simulación de Revisión In Situ</span>
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Parámetros de Escala y Emplazamiento */}
                <div className="grid grid-cols-2 gap-4 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-5 text-xs sm:grid-cols-4">
                    <div>
                        <span className="block text-[10px] font-bold text-neutral-400 uppercase">Área Techada</span>
                        <span className="font-bold text-neutral-800">{autoevaluacion.area_m2} m²</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-neutral-400 uppercase">Pisos / Aforo</span>
                        <span className="font-bold text-neutral-800">
                            {autoevaluacion.pisos} piso(s) / {autoevaluacion.aforo} pers.
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-neutral-400 uppercase">Carga Térmica</span>
                        <span className="font-bold text-neutral-800">
                            {autoevaluacion.usa_glp ? `${autoevaluacion.galones_glp} Galones GLP` : 'Sin GLP'}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-neutral-400 uppercase">Sector Territorial</span>
                        <span className="block truncate font-bold text-neutral-800">{autoevaluacion.sector_huancayo}</span>
                    </div>
                </div>

                {/* Trazabilidad criptográfica SHA-256 */}
                <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-neutral-900 p-4 font-mono text-[11px] text-neutral-300 sm:flex-row sm:items-center">
                    <div className="flex max-w-full items-center gap-2 truncate">
                        <Hash className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span className="text-neutral-400">UUID:</span>
                        <span className="text-white select-all">{autoevaluacion.uuid_trazabilidad}</span>
                    </div>
                    {autoevaluacion.hash_integridad && (
                        <CryptoSealBadge
                            hash={autoevaluacion.hash_integridad}
                            fecha={autoevaluacion.created_at}
                            esInmutable={true}
                        />
                    )}
                </div>

                {/* Detalle del Checklist Resumido */}
                <div>
                    <h4 className="mb-3 text-xs font-bold tracking-wider text-neutral-400 uppercase">
                        Condiciones de Seguridad Autodeclaradas
                    </h4>
                    <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100">
                        {detalleChecklist.map((item) => (
                            <div key={item.codigo} className="flex items-center justify-between bg-white p-3.5 text-xs">
                                <div className="pr-4">
                                    <span className="block font-medium text-neutral-800">{item.nombre}</span>
                                    {item.norma && <span className="font-mono text-[10px] text-neutral-400">{item.norma}</span>}
                                </div>
                                <span
                                    className={`shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-bold ${claseBadgeEstadoChecklist(item.estado)}`}
                                >
                                    {etiquetaEstadoChecklist(item)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface TabPendientesProps {
    autoevaluacionUuid: string;
    noCumple: PendienteDetalle[];
    porRevisar: PendienteDetalle[];
    cumpleCount: number;
    naCount: number;
    onAbrirRecurso: (pendiente: PendienteDetalle) => void;
}

function TabPendientes({
    autoevaluacionUuid,
    noCumple,
    porRevisar,
    cumpleCount,
    naCount,
    onAbrirRecurso,
}: Readonly<TabPendientesProps>) {
    const pendientesTotal = noCumple.length + porRevisar.length;
    const hayNoCumple = noCumple.length > 0;

    return (
        <div className="space-y-6">
            {/* Encabezado con resumen declarado */}
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 text-left shadow-sm">
                <span className="rounded-full border border-[#FF3B30]/30 bg-[#FF3B30]/10 px-3 py-1 text-[10px] font-bold tracking-wider text-[#c9251d] uppercase">
                    Identificación de pendientes
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-neutral-900">Aspectos que requieren atención</h3>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-500">
                    Resumen de lo que declaraste, diferenciando los pendientes que identificaste de los aspectos que todavía están por
                    revisar. El estado de cada condición refleja tu autoevaluación ciudadana.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                    <div className="rounded-2xl border border-[#FF3B30]/30 bg-[#FF3B30]/5 p-4 text-left shadow-2xs">
                        <span className="block text-[10px] font-bold text-[#c9251d] uppercase">Pendientes identificados</span>
                        <span className="text-2xl font-black text-[#c9251d]">{noCumple.length}</span>
                    </div>
                    <div className="rounded-2xl border border-[#FF9500]/30 bg-[#FF9500]/5 p-4 text-left shadow-2xs">
                        <span className="block text-[10px] font-bold text-[#9a5b00] uppercase">Por revisar</span>
                        <span className="text-2xl font-black text-[#9a5b00]">{porRevisar.length}</span>
                    </div>
                    <div className="rounded-2xl border border-[#34C759]/30 bg-[#34C759]/5 p-4 text-left shadow-2xs">
                        <span className="block text-[10px] font-bold text-[#1b7931] uppercase">Declaras cumplir</span>
                        <span className="text-2xl font-black text-[#1b7931]">{cumpleCount}</span>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-left shadow-2xs">
                        <span className="block text-[10px] font-bold text-neutral-500 uppercase">No aplica</span>
                        <span className="text-2xl font-black text-neutral-700">{naCount}</span>
                    </div>
                </div>
            </div>

            {pendientesTotal === 0 ? (
                <div className="rounded-3xl border border-[#34C759]/30 bg-[#34C759]/5 p-8 text-center shadow-sm">
                    <CheckCircle2 className="mx-auto mb-2 h-9 w-9 text-[#34C759]" />
                    <h4 className="text-base font-bold text-[#1b7931]">
                        Declaraste que todos los aspectos revisados cumplen, según tu propia evaluación
                    </h4>
                    <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-[#1b7931]/90">
                        Declaraste que los {cumpleCount} aspectos que corresponden a tu establecimiento están atendidos
                        {naCount > 0 ? ` (y ${naCount} no aplica(n) según tus respuestas)` : ''}. Mantén tus evidencias al día.
                    </p>
                    <p className="mx-auto mt-2 max-w-xl text-[11px] text-[#1b7931]/75">
                        El resultado refleja lo declarado en esta autoevaluación. No constituye una aprobación o certificación oficial.
                    </p>
                </div>
            ) : (
                <>
                    {hayNoCumple && (
                        <section aria-labelledby="grupo-no-cumple" className="space-y-4">
                            <div className="flex items-center gap-2">
                                <h4 id="grupo-no-cumple" className="text-xs font-black tracking-wider text-neutral-500 uppercase">
                                    Pendientes que identificaste (declaraste que aún no están atendidos)
                                </h4>
                                <span className="rounded-full bg-[#FF3B30] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                    {noCumple.length}
                                </span>
                            </div>
                            {noCumple.map((pendiente) => (
                                <TarjetaPendienteItem
                                    key={pendiente.codigo}
                                    pendiente={pendiente}
                                    onAbrirRecurso={onAbrirRecurso}
                                />
                            ))}
                        </section>
                    )}

                    {porRevisar.length > 0 && (
                        <section aria-labelledby="grupo-por-revisar" className="space-y-4">
                            <div className="flex items-center gap-2">
                                <h4 id="grupo-por-revisar" className="text-xs font-black tracking-wider text-neutral-500 uppercase">
                                    Aspectos todavía por revisar (aún no tienes certeza)
                                </h4>
                                <span className="rounded-full bg-[#FF9500] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                    {porRevisar.length}
                                </span>
                            </div>
                            <p className="-mt-1 text-xs text-neutral-500">
                                Que un aspecto esté «por revisar» no significa que incumpla: solo declaraste que todavía no determinaste
                                su estado. Completar estas verificaciones te permite afinar tu nivel de preparación.
                            </p>
                            {porRevisar.map((pendiente) => (
                                <TarjetaPendienteItem
                                    key={pendiente.codigo}
                                    pendiente={pendiente}
                                    onAbrirRecurso={onAbrirRecurso}
                                />
                            ))}
                        </section>
                    )}

                    {hayNoCumple && (
                        <div className="flex items-start gap-3 rounded-3xl border border-[#FF3B30]/30 bg-[#FF3B30]/5 p-5 text-left text-xs text-neutral-700 shadow-2xs">
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#c9251d]" />
                            <p>
                                Cuando declares que una condición quedó atendida, podrás registrarlo en tu{' '}
                                <Link
                                    href={`/autoevaluacion/subsanacion/${autoevaluacionUuid}`}
                                    className="font-bold text-[#c9251d] underline"
                                >
                                    Plan de Subsanación Preventiva
                                </Link>{' '}
                                y llevar el seguimiento de tus acciones de mejora.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

interface EstadoVacioPlanProps {
    porRevisarCount: number;
}

function EstadoVacioPlan({ porRevisarCount }: Readonly<EstadoVacioPlanProps>) {
    if (porRevisarCount > 0) {
        return (
            <div className="rounded-3xl border border-[#FF9500]/30 bg-[#FF9500]/5 p-8 text-center shadow-sm">
                <AlertTriangle className="mx-auto mb-2 h-9 w-9 text-[#FF9500]" />
                <h4 className="text-sm font-bold text-[#9a5b00]">No declaraste pendientes con acciones de mejora</h4>
                <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-[#9a5b00]/90">
                    Aún tienes {porRevisarCount} aspecto(s) por revisar. La orientación aparece en la pestaña «Aspectos que
                    requieren atención»: determina el estado real de cada condición para decidir si necesitas una acción de
                    mejora.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-3xl border border-[#34C759]/30 bg-[#34C759]/5 p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-2 h-9 w-9 text-[#34C759]" />
            <h4 className="text-sm font-bold text-[#1b7931]">Sin brechas declaradas</h4>
            <p className="mt-1 text-xs leading-relaxed text-[#1b7931]/90">
                Declaraste cumplir todas las condiciones evaluadas. Mantén tus evidencias al día para conservar un buen nivel
                de preparación.
            </p>
        </div>
    );
}

interface TabPlanProps {
    autoevaluacionUuid: string;
    plan: PlanAccionData;
    porRevisarCount: number;
    onSolicitarReevaluacion: () => void;
}

function TabPlan({
    autoevaluacionUuid,
    plan,
    porRevisarCount,
    onSolicitarReevaluacion,
}: Readonly<TabPlanProps>) {
    return (
        <div className="space-y-6">
            {/* Encabezado del Presupuesto */}
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 text-left shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <span className="rounded-full border border-[#FF3B30]/30 bg-[#FF3B30]/10 px-3 py-1 text-[10px] font-bold tracking-wider text-[#c9251d] uppercase">
                            Referencia Técnica y Económica Local
                        </span>
                        <h3 className="mt-2 text-xl font-extrabold text-neutral-900">
                            Plan de Preparación y Presupuesto de Adecuación
                        </h3>
                        <p className="mt-0.5 text-xs text-neutral-500">
                            Ruta orientativa para cerrar las brechas que declaras antes de una eventual visita técnica municipal.
                        </p>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-neutral-200/70 bg-neutral-50 p-4 text-right shadow-2xs">
                        <span className="block text-[10px] font-bold text-neutral-400 uppercase">Presupuesto Estimado</span>
                        <span className="text-2xl font-black text-[#c9251d]">S/ {plan.costo_total.toFixed(2)}</span>
                        <span className="block text-[10px] text-neutral-500">Mano de obra y materiales Huancayo</span>
                    </div>
                </div>
            </div>

            {/* Listado de Tareas Priorizadas */}
            {plan.tareas.length === 0 ? (
                <EstadoVacioPlan porRevisarCount={porRevisarCount} />
            ) : (
                <div className="space-y-3.5">
                    {plan.tareas.map((tarea) => (
                        <div
                            key={`${tarea.codigo}-${tarea.tarea}`}
                            className="space-y-3 rounded-3xl border border-neutral-200/80 bg-white p-6 text-left shadow-sm"
                        >
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${clasePrioridadTarea(tarea.prioridad)}`}
                                    >
                                        Prioridad {tarea.prioridad} ({tarea.dias_plazo} días sugerido)
                                    </span>
                                    <span className="font-mono text-[10px] text-neutral-400">{tarea.norma}</span>
                                </div>

                                <span className="self-end rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-900 sm:self-auto">
                                    Costo Est: S/ {tarea.costo_soles.toFixed(2)}
                                </span>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-neutral-900">{tarea.tarea}</h4>
                                <p className="mt-0.5 text-xs text-neutral-500">
                                    Condición declarada pendiente: <strong className="text-neutral-700">{tarea.item}</strong>
                                </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px] text-neutral-400">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    Plazo sugerido: {tarea.dias_plazo} días hábiles
                                </span>
                                <span className="text-neutral-500">R.J. 016-2018 Num. 2.1.1.2</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tarjeta de Fundamento */}
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-4 text-left text-xs text-neutral-600">
                <strong className="mb-1 block font-bold text-neutral-800">
                    Referencia Metodológica:
                </strong>
                <p>
                    La estructuración secuencial de acciones con plazos y presupuesto referencial reduce las brechas que suelen detectarse en
                    las visitas técnicas de fiscalización municipal (USM, 2026). Este plan es una orientación didáctica, no un requisito
                    oficial.
                </p>
            </div>

            {/* Siguiente paso */}
            <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row print:hidden">
                <button
                    type="button"
                    onClick={onSolicitarReevaluacion}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-5 py-3.5 text-xs font-semibold text-neutral-700 shadow-xs transition hover:bg-neutral-50 sm:w-auto"
                >
                    <RefreshCw className="h-4 w-4 text-[#34C759]" />
                    <span>Volver a evaluar establecimiento</span>
                </button>

                <Link
                    href={`/autoevaluacion/revision/${autoevaluacionUuid}`}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-6 py-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-95 sm:w-auto"
                >
                    <span>Continuar con la Simulación de Revisión In Situ</span>
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}

export default function Resultado({
    autoevaluacion,
    catalogo = [],
}: Readonly<Props>) {
    const [showGuia, setShowGuia] = useState<boolean>(false);
    const [showGuardarProgreso, setShowGuardarProgreso] = useState<boolean>(false);
    const [showModalReevaluacion, setShowModalReevaluacion] = useState<boolean>(false);
    const [recursoActivo, setRecursoActivo] = useState<RecursoEducativoData | null>(null);
    const { auth } = usePage().props as { auth?: { user: { id: number; name: string } | null } };
    const esInvitado = !auth?.user;
    const esReevaluacion = Boolean(autoevaluacion.evaluacion_origen_id || autoevaluacion.evaluacion_origen);

    const urlSimulacion = construirUrlSimulacion(autoevaluacion.uuid_trazabilidad);
    const plan = autoevaluacion.plan_accion_costos || PLAN_ACCION_VACIO;

    const recursosPorCodigo = useMemo(
        () => new Map<string, RecursoCatalogo>(catalogo.map((recurso) => [recurso.codigo, recurso])),
        [catalogo],
    );

    const catalogoPorCodigo = useMemo(
        () => new Map(CHECKLIST_CATALOGO_OFICIAL.map((item) => [item.codigo, item])),
        [],
    );

    const detalleChecklist = useMemo(
        () => autoevaluacion.detalle_checklist || [],
        [autoevaluacion.detalle_checklist],
    );

    const pendientes = useMemo<PendienteDetalle[]>(() => {
        return detalleChecklist.map((item: EstadoDeclarado, idx: number): PendienteDetalle => {
            const catalogoItem = catalogoPorCodigo.get(item.codigo);

            return {
                ...item,
                numero: idx + 1,
                estado: estadoDe(item),
                es_critico: item.es_critico ?? false,
                categoria: catalogoItem?.categoria,
                por_que: catalogoItem?.por_que,
                que_observar: catalogoItem?.que_observar,
                solucion: catalogoItem?.solucion,
                recurso: recursosPorCodigo.get(item.codigo) ?? null,
            };
        });
    }, [detalleChecklist, recursosPorCodigo, catalogoPorCodigo]);

    const noCumple = pendientes.filter((p) => p.estado === 'NO_CUMPLE');
    const porRevisar = pendientes.filter((p) => p.estado === 'POR_REVISAR');
    const cumpleCount = pendientes.filter((p) => p.estado === 'CUMPLE').length;
    const naCount = pendientes.filter((p) => p.estado === 'NA').length;
    const hayFallaCritica = noCumple.some((p) => p.es_critico);
    const pendientesTotal = noCumple.length + porRevisar.length;

    const descripcionSemaforo = resolverDescripcionSemaforo(
        autoevaluacion.semaforo,
        noCumple.length,
        porRevisar.length,
        hayFallaCritica,
    );
    const configSemaforo = resolverConfigSemaforo(autoevaluacion.semaforo, descripcionSemaforo);

    const abrirRecurso = (pendiente: PendienteDetalle) => {
        if (!pendiente.recurso?.video_url) return;

        setRecursoActivo({
            titulo: pendiente.nombre,
            video_url: pendiente.recurso.video_url,
            tipo: pendiente.recurso.tipo,
            base_legal: pendiente.recurso.base_legal,
            evidencia_sugerida: pendiente.recurso.evidencia_sugerida,
            descripcion: pendiente.recurso.descripcion,
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const prefijoTitulo = esReevaluacion
        ? 'Resultado de tu nueva autoevaluación'
        : 'Resultado de tu autoevaluación';

    return (
        <>
            <Head title={`${prefijoTitulo} - ${autoevaluacion.nombre_comercio}`} />

            <div className="print:hidden">
                <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />
                <ModalGuardarProgreso
                    isOpen={showGuardarProgreso}
                    onClose={() => setShowGuardarProgreso(false)}
                    uuid={autoevaluacion.uuid_trazabilidad}
                    establecimiento={autoevaluacion.nombre_comercio}
                />
                <ModalConfirmarReevaluacion
                    isOpen={showModalReevaluacion}
                    onClose={() => setShowModalReevaluacion(false)}
                    uuid={autoevaluacion.uuid_trazabilidad}
                    nombreComercio={autoevaluacion.nombre_comercio}
                />
                <VideoEducativoModal isOpen={!!recursoActivo} onClose={() => setRecursoActivo(null)} recurso={recursoActivo} />
            </div>

            <div className="mx-auto max-w-4xl print:max-w-none">
                {/* Barra Superior con Acciones Rápidas */}
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/autoevaluacion"
                            className="inline-flex items-center gap-1 rounded-2xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-600 shadow-2xs transition hover:text-neutral-900"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Nueva Simulación
                        </Link>

                        {esInvitado && (
                            <button
                                type="button"
                                onClick={() => setShowGuardarProgreso(true)}
                                className="border border-[#34C759]/30 bg-[#34C759]/10 text-[#1b7931] hover:bg-[#34C759]/20 focus-visible:ring-[#34C759] inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold shadow-2xs transition focus-visible:ring-2 focus-visible:outline-none"
                            >
                                <Save className="h-3.5 w-3.5" />
                                Guardar mi progreso para continuar después
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowModalReevaluacion(true)}
                            className="border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-semibold shadow-2xs transition"
                        >
                            <RefreshCw className="h-3.5 w-3.5 text-[#34C759]" />
                            <span>Volver a evaluar</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Imprimir / Exportar PDF</span>
                        </button>

                        <Link
                            href={`/autoevaluacion/subsanacion/${autoevaluacion.uuid_trazabilidad}`}
                            className="bg-[#FF3B30] hover:bg-[#E0342A] inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Plan de Subsanación Preventiva</span>
                        </Link>
                    </div>
                </div>

                <EncabezadoResultado
                    esReevaluacion={esReevaluacion}
                    hashIntegridad={autoevaluacion.hash_integridad}
                    fecha={autoevaluacion.created_at}
                />

                {/* Tabs de shadcn para Ficha, Atención y Plan de Costos */}
                <Tabs defaultValue="ficha" className="w-full">
                    <div className="mb-8 flex justify-center print:hidden">
                        <TabsList className="h-12 rounded-3xl bg-neutral-100/90 p-1.5 shadow-2xs">
                            <TabsTrigger
                                value="ficha"
                                className="rounded-2xl px-5 py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm"
                            >
                                <ShieldCheck className="mr-2 h-4 w-4 text-[#34C759]" />
                                Ficha y Trazabilidad
                            </TabsTrigger>
                            <TabsTrigger
                                value="pendientes"
                                className="rounded-2xl px-5 py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm"
                            >
                                <AlertTriangle className="mr-2 h-4 w-4 text-[#FF9500]" />
                                Atención ({pendientesTotal})
                            </TabsTrigger>
                            {plan.tareas.length > 0 && (
                                <TabsTrigger
                                    value="plan"
                                    className="rounded-2xl px-5 py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm"
                                >
                                    <DollarSign className="mr-2 h-4 w-4 text-[#34C759]" />
                                    Plan de Costos ({plan.total_items})
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    <TabsContent value="ficha" className="m-0 focus-visible:outline-none">
                        <TabFicha
                            autoevaluacion={autoevaluacion}
                            configSemaforo={configSemaforo}
                            urlSimulacion={urlSimulacion}
                            detalleChecklist={detalleChecklist}
                        />
                    </TabsContent>

                    <TabsContent value="pendientes" className="m-0 focus-visible:outline-none">
                        <TabPendientes
                            autoevaluacionUuid={autoevaluacion.uuid_trazabilidad}
                            noCumple={noCumple}
                            porRevisar={porRevisar}
                            cumpleCount={cumpleCount}
                            naCount={naCount}
                            onAbrirRecurso={abrirRecurso}
                        />
                    </TabsContent>

                    {plan.tareas.length > 0 && (
                        <TabsContent value="plan" className="m-0 focus-visible:outline-none">
                            <TabPlan
                                autoevaluacionUuid={autoevaluacion.uuid_trazabilidad}
                                plan={plan}
                                porRevisarCount={porRevisar.length}
                                onSolicitarReevaluacion={() => setShowModalReevaluacion(true)}
                            />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </>
    );
}
