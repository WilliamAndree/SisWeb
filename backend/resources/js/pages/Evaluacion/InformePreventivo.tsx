import { CryptoSealBadge } from '@/components/shared/CryptoSealBadge';
import { formatearNivelRiesgo } from '@/lib/riesgo';
import type { ConteoEstados, InformePreventivoProps } from '@/types/contrato';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CalendarClock,
    CheckCircle2,
    ExternalLink,
    FileCheck,
    FileText,
    Gauge,
    Info,
    Layers,
    ShieldCheck,
} from 'lucide-react';
import { useMemo } from 'react';
import { InformeDatosGenerales } from './components/InformeDatosGenerales';
import { InformeMatrizCondiciones } from './components/InformeMatrizCondiciones';
import { InformeTrazabilidadLegal } from './components/InformeTrazabilidadLegal';

export default function InformePreventivo({
    autoevaluacion,
    evaluacion: evaluacionProp,
    condiciones_evaluadas,
    esReevaluacion = false,
    evaluacionOrigen = null,
    codigoInforme,
    fechaEmision,
    resumen,
    detalleChecklist = [],
    conteoEstados,
    matrizSubsanaciones = [],
    hashFinal,
    hashIntegridad,
}: Readonly<InformePreventivoProps>) {
    const evaluacion = evaluacionProp ?? autoevaluacion;
    const uuid = evaluacion.uuid || autoevaluacion.uuid_trazabilidad;

    const urlSeguimiento = `/autoevaluacion/resultado/${uuid}`;
    const urlSubsanar = route('autoevaluacion.subsanar_items', { uuid });

    const esExAnte = evaluacion.tipo_tramite === 'EX_ANTE';
    const nivelRiesgoLegible = formatearNivelRiesgo(evaluacion.nivel_riesgo);
    const gapFinal = `${(resumen?.gap_final ?? 0).toFixed(1)}%`;

    const subtipoTramite = evaluacion.tipo_tramite
        ? (esExAnte ? 'ITSE Previa (Ex-Ante)' : 'ITSE Posterior (Ex-Post)')
        : 'Evaluación preventiva';

    const conteo = useMemo<ConteoEstados>(() => {
        if (conteoEstados) {
            return conteoEstados;
        }

        const conds = condiciones_evaluadas ?? [];
        if (conds.length > 0) {
            return {
                total: conds.filter((c) => c.estado_actual !== 'NO_APLICA').length,
                cumple: conds.filter((c) => c.estado_actual === 'CUMPLE_DECLARADO').length,
                no_cumple: conds.filter((c) => c.estado_actual === 'PENDIENTE_ATENDER').length,
                por_revisar: conds.filter((c) => c.estado_actual === 'POR_REVISAR').length,
                na: conds.filter((c) => c.estado_actual === 'NO_APLICA').length,
            };
        }

        return {
            total: detalleChecklist.length,
            cumple: detalleChecklist.filter((c) => c.estado === 'CUMPLE').length,
            no_cumple: detalleChecklist.filter((c) => c.estado === 'NO_CUMPLE').length,
            por_revisar: detalleChecklist.filter((c) => c.estado === 'POR_REVISAR').length,
            na: detalleChecklist.filter((c) => c.estado === 'NA').length,
        };
    }, [conteoEstados, condiciones_evaluadas, detalleChecklist]);

    const semaforoInfo = useMemo(() => {
        const sem = (evaluacion.semaforo || autoevaluacion.semaforo)?.toUpperCase() ?? 'VERDE';
        if (sem === 'VERDE') {
            return {
                dotColor: 'bg-emerald-600',
                textColor: 'text-emerald-600',
                label: 'VERDE — Sin incumplimientos declarados',
                desc: 'Según las respuestas registradas en esta autoevaluación, no se consignaron observaciones técnicas pendientes.',
            };
        }
        if (sem === 'AMBAR' || sem === 'ÁMBAR' || sem === 'AMARILLO') {
            return {
                dotColor: 'bg-amber-500',
                textColor: 'text-amber-600',
                label: 'ÁMBAR — Presenta aspectos por revisar',
                desc: 'Presenta condiciones técnicas observadas o pendientes de verificación previa a una inspección oficial.',
            };
        }
        return {
            dotColor: 'bg-rose-600',
            textColor: 'text-rose-600',
            label: 'ROJO — Requiere atención prioritaria',
            desc: 'Se identificaron condiciones de seguridad críticas declaradas como no conformes que requieren subsanación urgente.',
        };
    }, [evaluacion.semaforo, autoevaluacion.semaforo]);

    const es100Cumplimiento =
        (evaluacion.porcentaje_cumplimiento ?? autoevaluacion.porcentaje_cumplimiento) >= 100 &&
        conteo.no_cumple === 0 &&
        conteo.por_revisar === 0;

    const metricas = [
        {
            icon: Layers,
            label: 'Condiciones Evaluadas',
            value: `${resumen?.total_condiciones ?? conteo.total}`,
            sub: 'Ítems técnicos detectables',
        },
        {
            icon: CheckCircle2,
            label: 'Conformes Iniciales',
            value: `${resumen?.conformes_iniciales ?? conteo.cumple}`,
            sub: 'Al momento de la autoevaluación',
        },
        {
            icon: FileCheck,
            label: 'Subsanadas Declaradas',
            value: `${resumen?.subsanadas_declaradas ?? 0}`,
            sub: `${resumen?.en_proceso ?? 0} en proceso · ${resumen?.pendientes ?? conteo.no_cumple} pendientes`,
        },
        {
            icon: Gauge,
            label: 'GAP Final de Preparación',
            value: gapFinal,
            sub: 'Asimetría informativa del ciclo',
        },
    ];

    const nombreComercial = evaluacion.nombre_comercial || evaluacion.nombre_comercio || 'Establecimiento';

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <Head
                title={`${
                    esReevaluacion ? 'Informe Preventivo Reevaluación' : 'Informe de Autoevaluación Preventiva ITSE'
                } - ${nombreComercial}`}
            />

            {/* Acciones de navegación superior */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                    href={urlSeguimiento}
                    className="flex items-center gap-1 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver al Resultado
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                    <a
                        href={urlSubsanar}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
                    >
                        <span>Gestionar subsanaciones en la plataforma</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>

            {/* Hoja física pericial del informe */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] select-none"
                    aria-hidden="true"
                >
                    <ShieldCheck className="h-[460px] w-[460px] text-emerald-600" />
                </div>

                <div className="relative space-y-5 p-6 sm:p-10 md:p-12">
                    {/* 1. Encabezado + aviso legal */}
                    <header className="border-b-2 border-double border-emerald-600/80 pb-5">
                        <div className="mb-3 flex justify-center">
                            <span className="rounded-xl bg-emerald-600 p-2.5 text-white">
                                <ShieldCheck className="h-7 w-7" />
                            </span>
                        </div>
                        <span className="block text-center text-[10px] font-bold tracking-[0.22em] text-emerald-600 uppercase">
                            Asistente Cívico CheckITSE Huancayo
                        </span>

                        <h1 className="mt-2 text-center text-lg leading-snug font-black tracking-tight text-slate-900 uppercase sm:text-2xl">
                            {esReevaluacion
                                ? 'Informe Preventivo — Reevaluación'
                                : 'Informe de Autoevaluación Preventiva ITSE'}
                        </h1>

                        {esReevaluacion && (
                            <div className="mt-3 rounded-xl border border-sky-300 bg-sky-50/80 p-3 text-left">
                                <div className="flex items-start gap-2">
                                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                                    <div className="text-[11px] leading-relaxed text-sky-900">
                                        <strong className="font-bold">Nota contextual de reevaluación:</strong>{' '}
                                        Este informe corresponde a una <strong>reevaluación preventiva</strong> del establecimiento.
                                        {evaluacionOrigen?.uuid_trazabilidad && (
                                            <span>
                                                {' '}
                                                Evaluación original de referencia: UUID{' '}
                                                <span className="font-mono font-semibold">
                                                    {evaluacionOrigen.uuid_trazabilidad}
                                                </span>
                                                {evaluacionOrigen.fecha && ` (${evaluacionOrigen.fecha})`}.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                                D.S. N° 002-2018-PCM
                            </span>
                            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                                R.J. N° 016-2018-CENEPRED/J
                            </span>
                            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                                RNE A.010 / A.130 · CNE-U
                            </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-50/70 px-3 py-1.5">
                                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">
                                    N° de Informe:
                                </span>
                                <span className="font-mono text-xs font-black text-emerald-600">
                                    {codigoInforme}
                                </span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                                <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase">Fecha:</span>
                                <span className="font-mono text-[11px] font-bold text-slate-800">
                                    {fechaEmision}
                                </span>
                            </div>
                        </div>

                        {(hashIntegridad || hashFinal) && (
                            <div className="mt-3 flex justify-center">
                                <CryptoSealBadge
                                    hash={hashIntegridad || hashFinal}
                                    fecha={fechaEmision}
                                    esInmutable={true}
                                />
                            </div>
                        )}

                        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-left">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <div className="text-[10px] leading-relaxed text-amber-950">
                                    <strong className="block font-bold uppercase tracking-wider text-amber-900">
                                        Aviso Preventivo Importante — No Oficial
                                    </strong>
                                    Este documento es de carácter estrictamente informativo, educativo y preventivo.
                                    Ha sido generado de forma automatizada a partir de las declaraciones voluntarias
                                    del responsable del establecimiento.{' '}
                                    <strong>
                                        No constituye certificado de ITSE, no otorga aprobación ni autorización
                                        municipal, y no convalida condiciones de seguridad ante ninguna autoridad u
                                        órgano ejecutante.
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* 2. Datos generales declarados del establecimiento */}
                    <InformeDatosGenerales
                        evaluacion={evaluacion}
                        nivelRiesgoLegible={nivelRiesgoLegible}
                        subtipoTramite={subtipoTramite}
                    />

                    {/* 3. Resumen de diagnóstico preventivo */}
                    <section>
                        <div className="mb-2.5 flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-emerald-600" />
                            <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                                Resumen de Diagnóstico Preventivo
                            </h2>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
                                    <span
                                        className={`h-3 w-3 shrink-0 rounded-full ${semaforoInfo.dotColor}`}
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                            Semáforo Preventivo
                                        </span>
                                        <span className={`text-sm font-black ${semaforoInfo.textColor}`}>
                                            {evaluacion.semaforo || autoevaluacion.semaforo}
                                        </span>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                        GAP Final de Preparación
                                    </span>
                                    <span className="text-sm font-black text-emerald-600">{gapFinal}</span>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                        Subsanación Declarada
                                    </span>
                                    <span className="text-sm font-black text-emerald-600">
                                        {resumen?.porcentaje_subsanado ?? (es100Cumplimiento ? 100 : 0)}%
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-left">
                                <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                    Diagnóstico Declarado
                                </span>
                                <p className="mt-0.5 text-xs font-bold text-slate-800">{semaforoInfo.label}</p>
                                <p className="mt-0.5 text-[10px] text-slate-600">{semaforoInfo.desc}</p>
                                {es100Cumplimiento && (
                                    <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-[10px] text-emerald-600">
                                        <strong>Nota de conformidad declarada:</strong> Según las respuestas
                                        declaradas en esta autoevaluación, no se identificaron incumplimientos
                                        declarados en las condiciones evaluadas. Este informe tiene carácter
                                        preventivo y no sustituye la inspección oficial ITSE.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-2.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
                            {metricas.map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-xl border border-slate-200 bg-white p-3"
                                >
                                    <div className="mb-1 flex items-center gap-1.5">
                                        <item.icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                        <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                            {item.label}
                                        </span>
                                    </div>
                                    <p className="text-sm leading-snug font-black text-slate-900">{item.value}</p>
                                    <p className="mt-0.5 text-[9px] text-slate-400">{item.sub}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 4. Matriz Completa de Condiciones Evaluadas */}
                    <InformeMatrizCondiciones
                        conteo={conteo}
                        condicionesEvaluadas={condiciones_evaluadas}
                        condicionesChecklist={detalleChecklist}
                    />

                    {/* 5. Trazabilidad Legal, Matriz de Subsanaciones y Huella Criptográfica */}
                    <InformeTrazabilidadLegal
                        evaluacion={evaluacion}
                        gapFinal={gapFinal}
                        fechaEmision={fechaEmision}
                        matrizSubsanaciones={matrizSubsanaciones}
                        hashIntegridad={hashIntegridad}
                        hashFinal={hashFinal}
                    />
                </div>
            </div>
        </div>
    );
}
