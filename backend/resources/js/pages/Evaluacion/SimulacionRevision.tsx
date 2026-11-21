import { Head, Link, router } from '@inertiajs/react';
import { Activity, ArrowLeft, CheckCircle2, FileText, Info, XCircle } from 'lucide-react';
import React, { useState } from 'react';

interface ChecklistItem {
    codigo: string;
    nombre: string;
    cumple: boolean;
    estado?: string;
    es_critico?: boolean;
    norma?: string;
}

interface SimulacionData {
    id: number;
    codigo_revision: string;
    total_observaciones: number;
    porcentaje_revision: number;
    metrica_gap: number;
    resultado: string;
    created_at: string;
    detalle_revision: Record<string, boolean>;
}

interface AutoevaluacionData {
    id: number;
    uuid_trazabilidad: string;
    hash_integridad?: string;
    nombre_comercio: string;
    funcion_economica: string;
    ruc: string;
    sector_huancayo: string;
    area_m2: number;
    pisos: number;
    aforo: number;
    usa_glp: boolean;
    tipo_tramite?: string | null;
    nivel_riesgo?: string | null;
    porcentaje_cumplimiento: number;
    semaforo: string;
    detalle_checklist: ChecklistItem[];
    simulaciones?: SimulacionData[];
}

interface Props {
    autoevaluacion: AutoevaluacionData;
}

export default function SimulacionRevision({ autoevaluacion }: Readonly<Props>) {
    // Verificaciones iniciales de la simulación: por defecto reflejan lo que el
    // ciudadano declaró como cumplido en su autoevaluación.
    const estadoInicial = autoevaluacion.detalle_checklist.reduce(
        (acc, item) => {
            acc[item.codigo] = item.estado === 'CUMPLE' || item.cumple === true;
            return acc;
        },
        {} as Record<string, boolean>,
    );

    const [verificaciones, setVerificaciones] = useState<Record<string, boolean>>(estadoInicial);
    const [processing, setProcessing] = useState<boolean>(false);

    const itemsEvaluables = autoevaluacion.detalle_checklist.filter((i) => i.estado !== 'NA');
    let totalObservaciones = 0;
    let conformesEnRevision = 0;

    itemsEvaluables.forEach((item) => {
        const conformidadDeclarada = item.estado === 'CUMPLE' || item.cumple === true;
        const conformeEnSimulacion = verificaciones[item.codigo] ?? false;

        if (conformeEnSimulacion) {
            conformesEnRevision++;
        }

        if (conformidadDeclarada !== conformeEnSimulacion) {
            totalObservaciones++;
        }
    });

    const porcentajeRevision = itemsEvaluables.length > 0 ? Math.round((conformesEnRevision / itemsEvaluables.length) * 100) : 100;

    const metricaGap = Math.round((autoevaluacion.porcentaje_cumplimiento - porcentajeRevision) * 10) / 10;

    const handleToggle = (codigo: string) => {
        setVerificaciones((prev) => {
            const nuevo = { ...prev, [codigo]: !prev[codigo] };
            return nuevo;
        });
    };

    const handleGuardarRevision = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            `/autoevaluacion/revision/${autoevaluacion.uuid_trazabilidad}`,
            {
                verificaciones,
                discrepancias: totalObservaciones,
            },
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <Head title={`Simulación de la inspección - ${autoevaluacion.nombre_comercio}`} />

            {/* Barra de navegación contextual */}
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="text-left">
                    <span className="bg-primary-50 text-primary-700 border-primary-100 rounded-full border px-2.5 py-0.5 text-sm font-bold">
                        Simulación de Revisión In Situ
                    </span>
                    <p className="mt-1 text-sm text-neutral-500">Autoevaluación preventiva · Método de contraste GAP (PUCP)</p>
                </div>

                <Link
                    href={`/autoevaluacion/resultado/${autoevaluacion.uuid_trazabilidad}`}
                    className="inline-flex items-center gap-1.5 self-start rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-600 shadow-xs transition hover:bg-neutral-50 sm:self-auto"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Volver al Resultado
                </Link>
            </div>

            <div className="mx-auto max-w-5xl space-y-6 text-left">
                {/* Cabecera del Establecimiento */}
                <div className="flex flex-col justify-between gap-4 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-xs md:flex-row md:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-danger-900 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-sm font-bold">
                                Simulación de Revisión In Situ
                            </span>
                            <span className="font-mono text-sm text-neutral-400">UUID: {autoevaluacion.uuid_trazabilidad.substring(0, 13)}...</span>
                        </div>
                        <h1 className="mt-2 text-2xl font-extrabold text-neutral-900">{autoevaluacion.nombre_comercio}</h1>
                        <p className="mt-0.5 text-sm text-neutral-500">
                            RUC: <strong className="font-mono text-neutral-700">{autoevaluacion.ruc}</strong> · Giro:{' '}
                            <strong>{autoevaluacion.funcion_economica}</strong> · Sector: <strong>{autoevaluacion.sector_huancayo}</strong>
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto">
                        {autoevaluacion.tipo_tramite && (
                            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3.5 text-center">
                                <span className="block text-sm font-bold text-neutral-400">Trámite</span>
                                <span className="text-sm font-extrabold text-neutral-900">{autoevaluacion.tipo_tramite}</span>
                            </div>
                        )}
                        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3.5 text-center">
                            <span className="block text-sm font-bold text-neutral-400">Escala</span>
                            <span className="text-sm font-extrabold text-neutral-900">
                                {autoevaluacion.area_m2} m² / {autoevaluacion.pisos} P.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Aviso de naturaleza didáctica */}
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <p className="leading-relaxed">
                        Esta herramienta te permite simular, por tu cuenta, una revisión in situ de tu establecimiento. El porcentaje resultante
                        expresa tu <strong>nivel de preparación declarado</strong> según la simulación que realices;{' '}
                        <strong>no es una probabilidad de aprobación</strong> ni un acta oficial de inspección.
                    </p>
                </div>

                {/* Panel de Contraste GAP */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-xs">
                        <span className="block text-sm font-bold text-neutral-400">1. Autoevaluación Declarada</span>
                        <span className="mt-1 block text-2xl font-extrabold text-neutral-900">{autoevaluacion.porcentaje_cumplimiento}%</span>
                        <span className="text-sm text-neutral-500">Condiciones que declaraste cumplir en tu autoevaluación.</span>
                    </div>

                    <div className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-xs">
                        <span className="block text-sm font-bold text-neutral-400">2. Revisión In Situ Simulada</span>
                        <span className="mt-1 block text-2xl font-extrabold text-emerald-700">{porcentajeRevision}%</span>
                        <span className="text-sm text-neutral-500">Resultado según la simulación que realizas ahora mismo.</span>
                    </div>

                    <div
                        className={`rounded-3xl border p-5 shadow-xs ${
                            metricaGap > 0 ? 'border-amber-200 bg-amber-50/60 text-amber-950' : 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="block text-sm font-bold">3. Brecha de Preparación (GAP)</span>
                            <Activity className="text-danger-900 h-4 w-4" />
                        </div>
                        <span className="mt-1 block text-2xl font-extrabold">{metricaGap > 0 ? `+${metricaGap}%` : `${metricaGap}%`}</span>
                        <span className="mt-0.5 block text-sm leading-tight">
                            {metricaGap > 0
                                ? 'Detectaste una brecha: hay condiciones que declaraste y que en la simulación no se mantienen.'
                                : 'Coherencia: tu declaración coincide con la simulación que realizaste.'}
                        </span>
                    </div>
                </div>

                {/* Formulario de Revisión Simulada */}
                <form onSubmit={handleGuardarRevision} className="space-y-6 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-xs">
                    <div className="flex flex-col justify-between gap-2 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center">
                        <div>
                            <h3 className="text-sm font-bold text-neutral-900">Matriz de Revisión In Situ Simulada</h3>
                            <p className="text-sm text-neutral-500">
                                Simula recorrer tu local: confirma solo aquello que verificarías físicamente como presente. Lo que no confirmes queda
                                como observación de preparación.
                            </p>
                        </div>

                        <span
                            className={`rounded-xl border px-3 py-1 text-xs font-extrabold ${
                                totalObservaciones > 0
                                    ? 'text-danger-900 border-rose-200 bg-rose-50'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            }`}
                        >
                            {totalObservaciones} Observación(es) de preparación
                        </span>
                    </div>

                    <div className="divide-y divide-neutral-100">
                        {autoevaluacion.detalle_checklist.map((item) => {
                            const conformidadDeclarada = item.estado === 'CUMPLE' || item.cumple === true;
                            const conformeEnSimulacion = verificaciones[item.codigo] ?? false;
                            const hayObservacion = item.estado !== 'NA' && conformidadDeclarada !== conformeEnSimulacion;

                            return (
                                <div
                                    key={item.codigo}
                                    className={`flex flex-col justify-between gap-3 py-4 transition-colors sm:flex-row sm:items-center ${
                                        hayObservacion ? '-mx-4 rounded-2xl bg-amber-50/40 px-4' : ''
                                    }`}
                                >
                                    <div className="flex-1 pr-3">
                                        <div className="mb-1 flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-neutral-400">{item.norma || item.codigo}</span>
                                            {item.es_critico && (
                                                <span className="text-danger-900 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold">
                                                    Falla Crítica
                                                </span>
                                            )}
                                        </div>
                                        <span className="block text-sm font-semibold text-neutral-800">{item.nombre}</span>
                                        <span className="mt-0.5 block text-sm text-neutral-400">
                                            Declarado por ciudadano:{' '}
                                            <strong className={conformidadDeclarada ? 'text-emerald-700' : 'text-danger-900'}>
                                                {item.estado || (item.cumple ? 'CUMPLE' : 'NO CUMPLE')}
                                            </strong>
                                        </span>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                                        {hayObservacion && (
                                            <span className="rounded-xl bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-800">Observación</span>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleToggle(item.codigo)}
                                            className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                                                conformeEnSimulacion
                                                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                                                    : 'text-danger-900 border-rose-200 bg-rose-100'
                                            }`}
                                        >
                                            {conformeEnSimulacion ? (
                                                <>
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    <span>Confirmado</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    <span>Con observación</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Botón de Registro de la Simulación */}
                    <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-100 pt-4 sm:flex-row">
                        <div className="text-left text-sm text-neutral-500">
                            Al registrar la simulación se generará un código preventivo <strong>PREV-ITSE-…</strong> con fines de seguimiento y
                            preparación. No es un documento oficial.
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-danger-900 hover:bg-danger-800 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-xs transition active:scale-95"
                        >
                            <FileText className="h-4 w-4" />
                            <span>{processing ? 'Procesando Simulación...' : 'Registrar Simulación de Revisión'}</span>
                        </button>
                    </div>
                </form>

                {/* Historial de Simulaciones */}
                {autoevaluacion.simulaciones && autoevaluacion.simulaciones.length > 0 && (
                    <div className="space-y-4 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-xs">
                        <h3 className="text-sm font-bold text-neutral-900">Historial de Simulaciones de Revisión</h3>
                        <div className="space-y-3">
                            {autoevaluacion.simulaciones.map((sim) => (
                                <div
                                    key={sim.id}
                                    className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-sm sm:flex-row sm:items-center"
                                >
                                    <div>
                                        <span className="text-danger-900 block font-mono text-sm font-bold">{sim.codigo_revision}</span>
                                        <span className="text-sm text-neutral-500">{sim.created_at}</span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="block text-sm text-neutral-400">Resultado</span>
                                            <span
                                                className={`font-bold ${sim.resultado === 'SIN_OBSERVACIONES' ? 'text-emerald-700' : 'text-amber-800'}`}
                                            >
                                                {sim.resultado === 'SIN_OBSERVACIONES' ? 'SIN OBSERVACIONES' : 'CON OBSERVACIONES'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-sm text-neutral-400">% Revisión</span>
                                            <span className="font-extrabold text-neutral-800">{sim.porcentaje_revision}%</span>
                                        </div>
                                        <div>
                                            <span className="block text-sm text-neutral-400">GAP</span>
                                            <span className="font-extrabold text-neutral-800">{sim.metrica_gap}%</span>
                                        </div>
                                        <div>
                                            <span className="block text-sm text-neutral-400">Observaciones</span>
                                            <span className="font-bold text-neutral-800">{sim.total_observaciones}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
