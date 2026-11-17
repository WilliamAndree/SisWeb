import {
    AlertTriangle,
    Bot,
    Camera,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    HelpCircle,
    Info,
    Loader2,
    RotateCw,
    Scale,
    ShieldAlert,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';

import type { AnalisisEvidenciaItem } from '@/lib/analisis-ia';
export type { AnalisisEvidenciaItem, ResultadoAnalisisIAData } from '@/lib/analisis-ia';

export interface PanelResultadoAnalisisIAProps {
    analisis: AnalisisEvidenciaItem;
    codigoCriterio: string;
    onReanalizar?: () => void;
    estaReanalizando?: boolean;
}

export function PanelResultadoAnalisisIA({
    analisis,
    codigoCriterio,
    onReanalizar,
    estaReanalizando = false,
}: Readonly<PanelResultadoAnalisisIAProps>) {
    const [detallesExpandidos, setDetallesExpandidos] = useState(false);

    const { estado, mensaje_error: errorMsg, resultado } = analisis;

    // Render para estados no terminales (PENDIENTE / EN_PROCESO)
    if (estado === 'PENDIENTE' || estado === 'EN_PROCESO') {
        return (
            <div className="mt-3 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-sky-50 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-sky-900">Analizando fotografía con IA (Gemini Multimodal)...</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-sm font-bold text-sky-800">
                                <Sparkles className="h-3 w-3" />
                                En cola preventiva
                            </span>
                        </div>
                        <p className="mt-0.5 text-sm text-sky-700">
                            Estamos procesando visualmente la evidencia para correlacionarla con el criterio {codigoCriterio}. Puedes continuar
                            revisando mientras se procesa.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Render para estado FALLIDO
    if (estado === 'FALLIDO') {
        return (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-rose-900">No fue posible completar la orientación visual asistida</h4>
                        <p className="mt-1 text-rose-700">
                            {errorMsg ||
                                'Ocurrió una interrupción temporal al consultar el servicio de orientación visual. Tu evidencia y tu declaración se mantienen intactas y protegidas.'}
                        </p>
                        {onReanalizar && (
                            <button
                                type="button"
                                disabled={estaReanalizando}
                                onClick={onReanalizar}
                                className="mt-2.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-sm font-bold text-rose-800 shadow-2xs transition hover:bg-rose-50 active:scale-95 disabled:opacity-50"
                            >
                                {estaReanalizando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                                <span>Reintentar orientación con IA</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Si no hay resultado procesado aún pero está marcado para revisión
    if (!resultado) {
        return (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-amber-900">Evidencia pendiente de revisión adicional</h4>
                        <p className="mt-1 text-amber-800">
                            {errorMsg ||
                                'La evidencia adjuntada requiere una nueva fotografía con mayor claridad o iluminación para ser orientada automáticamente.'}
                        </p>
                        {onReanalizar && (
                            <button
                                type="button"
                                disabled={estaReanalizando}
                                onClick={onReanalizar}
                                className="mt-2.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-amber-800 shadow-2xs transition hover:bg-amber-50 active:scale-95 disabled:opacity-50"
                            >
                                <RotateCw className="h-3.5 w-3.5" />
                                <span>Reintentar análisis</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Mapeo de estilos para calidad de imagen
    const getBadgeCalidad = (calidad: string) => {
        switch (calidad?.toUpperCase()) {
            case 'OPTIMA':
                return 'bg-emerald-50 text-emerald-800 border-emerald-200';
            case 'ACEPTABLE':
                return 'bg-sky-50 text-sky-800 border-sky-200';
            case 'DEFICIENTE_ILUMINACION':
            case 'DEFICIENTE_ENFOQUE':
            case 'DEFICIENTE_DISTANCIA':
                return 'bg-amber-50 text-amber-800 border-amber-200';
            case 'ILEGIBLE':
                return 'bg-rose-50 text-rose-800 border-rose-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    // Mapeo de estilos para incertidumbre
    const getBadgeIncertidumbre = (nivel: string) => {
        switch (nivel?.toUpperCase()) {
            case 'BAJO':
                return 'bg-emerald-50 text-emerald-800 border-emerald-200';
            case 'MEDIO':
                return 'bg-amber-50 text-amber-800 border-amber-200';
            case 'ALTO':
            case 'MUY_ALTO':
                return 'bg-rose-50 text-rose-800 border-rose-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    // Mapeo para estado visual de elementos
    const getBadgeEstadoVisual = (st: string) => {
        switch (st?.toUpperCase()) {
            case 'IDENTIFICADO_VISUALMENTE':
                return {
                    clase: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    icono: CheckCircle2,
                    texto: 'Identificado en foto',
                };
            case 'NO_IDENTIFICADO_EN_IMAGEN':
                return {
                    clase: 'bg-rose-50 text-rose-800 border-rose-200',
                    icono: EyeOff,
                    texto: 'No visible en foto',
                };
            case 'NO_OBSERVABLE_CON_CLARIDAD':
                return {
                    clase: 'bg-amber-50 text-amber-800 border-amber-200',
                    icono: AlertTriangle,
                    texto: 'No observable con claridad',
                };
            case 'OBSTACULIZADO':
                return {
                    clase: 'bg-orange-50 text-orange-800 border-orange-200',
                    icono: ShieldAlert,
                    texto: 'Obstaculizado / Tapado',
                };
            case 'NO_DETERMINABLE_POR_FOTOGRAFIA':
                return {
                    clase: 'bg-slate-100 text-slate-700 border-slate-200',
                    icono: Info,
                    texto: 'No determinable por fotograf?a',
                };
            default:
                return {
                    clase: 'bg-slate-100 text-slate-700 border-slate-200',
                    icono: Info,
                    texto: st,
                };
        }
    };

    const esRequiereRevision = estado === 'REQUIERE_REVISION';

    return (
        <div
            className={`mt-4 rounded-3xl border p-4 transition-all sm:p-5 ${
                esRequiereRevision
                    ? 'border-amber-300 bg-amber-50/40 shadow-xs'
                    : 'border-indigo-200/80 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 shadow-xs'
            }`}
        >
            {/* Cabecera del Panel IA */}
            <div className="flex flex-col gap-2 border-b border-indigo-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-black tracking-tight text-slate-900">Orientación Visual Asistida con IA (Gemini API)</span>
                            <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 font-mono text-sm font-bold text-indigo-700">Auxiliar</span>
                        </div>
                        <p className="text-sm text-slate-500">Evaluación asistida de la imagen adjunta para el criterio {codigoCriterio}</p>
                    </div>
                </div>

                {/* Metadatos técnicos: Calidad e Incertidumbre */}
                <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                    <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${getBadgeCalidad(
                            resultado.calidad_imagen,
                        )}`}
                    >
                        <Camera className="h-2.5 w-2.5" />
                        Calidad: {resultado.calidad_imagen}
                    </span>

                    <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${getBadgeIncertidumbre(
                            resultado.nivel_incertidumbre,
                        )}`}
                    >
                        <HelpCircle className="h-2.5 w-2.5" />
                        Incertidumbre: {resultado.nivel_incertidumbre}
                    </span>

                    {esRequiereRevision && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-900">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Requiere Mejor Foto
                        </span>
                    )}
                </div>
            </div>

            {/* Resumen Pedagógico */}
            {resultado.resumen_pedagogico && (
                <div className="mt-3.5 rounded-2xl border border-indigo-100 bg-white p-3.5 text-sm leading-relaxed text-slate-700 shadow-2xs">
                    <div className="mb-1 flex items-center gap-1.5 font-bold text-indigo-950">
                        <Bot className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                        <span>Diagnóstico pedagógico visual:</span>
                    </div>
                    <p>{resultado.resumen_pedagogico}</p>
                </div>
            )}

            {/* Elementos Detectados */}
            {resultado.elementos_detectados && resultado.elementos_detectados.length > 0 && (
                <div className="mt-3.5 space-y-2">
                    <span className="block text-sm font-black text-slate-600">Elementos Identificados en la Fotografía:</span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {resultado.elementos_detectados.map((item, idx) => {
                            const badge = getBadgeEstadoVisual(item.estado_visual);
                            const Icono = badge.icono;
                            return (
                                <div
                                    key={`${item.elemento}-${idx}`}
                                    className="rounded-2xl border border-slate-200/90 bg-white p-2.5 text-sm shadow-2xs"
                                >
                                    <div className="mb-1 flex items-start justify-between gap-1.5">
                                        <span className="leading-snug font-bold text-slate-900">{item.elemento}</span>
                                        <span
                                            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.clase}`}
                                        >
                                            <Icono className="h-2.5 w-2.5" />
                                            {badge.texto}
                                        </span>
                                    </div>
                                    {item.detalle && <p className="text-sm leading-relaxed text-slate-600">{item.detalle}</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Observaciones Visuales */}
            {resultado.visual_observations && resultado.visual_observations.length > 0 && (
                <div className="mt-3.5 space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3.5 text-sm shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Eye className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                        <span>Detalles observables en la imagen:</span>
                    </div>
                    <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-slate-600">
                        {resultado.visual_observations.map((obs, idx) => (
                            <li key={`obs-${idx}`}>{obs}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Botón para expandir/colapsar detalles técnicos */}
            <div className="mt-3.5 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setDetallesExpandidos(!detallesExpandidos)}
                    className="inline-flex cursor-pointer items-center gap-1 text-sm font-bold text-indigo-700 transition hover:text-indigo-900"
                >
                    {detallesExpandidos ? (
                        <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            <span>Ocultar límites técnicos y recomendaciones</span>
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            <span>Ver qué aspectos NO se pueden verificar en foto y recomendaciones</span>
                        </>
                    )}
                </button>

                {onReanalizar && (
                    <button
                        type="button"
                        disabled={estaReanalizando}
                        onClick={onReanalizar}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                        title="Analizar nuevamente la fotografía actual"
                    >
                        {estaReanalizando ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                        ) : (
                            <RotateCw className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span>Re-analizar foto</span>
                    </button>
                )}
            </div>

            {/* Sección Expandible: Límites de Observabilidad y Recomendaciones para la foto */}
            {detallesExpandidos && (
                <div className="mt-3 space-y-3 border-t border-slate-200/80 pt-3">
                    {/* Límites de observabilidad */}
                    {resultado.not_observable && resultado.not_observable.length > 0 && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-sm text-amber-950">
                            <div className="mb-1 flex items-center gap-1.5 font-bold text-amber-900">
                                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                <span>Aspectos técnicos que NO pueden verificarse solo con una fotografía:</span>
                            </div>
                            <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-amber-800">
                                {resultado.not_observable.map((lim, idx) => (
                                    <li key={`lim-${idx}`}>{lim}</li>
                                ))}
                            </ul>
                            <p className="mt-2 text-sm text-amber-700 italic">
                                * Las pruebas de continuidad eléctrica, resistencia de pozo a tierra, certificados de calibración o carga de
                                extintores requieren verificación física o documental colegiada.
                            </p>
                        </div>
                    )}

                    {/* Recomendaciones de captura */}
                    {resultado.photo_improvement_recommendations && resultado.photo_improvement_recommendations.length > 0 && (
                        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5 text-sm text-sky-950">
                            <div className="mb-1 flex items-center gap-1.5 font-bold text-sky-900">
                                <Camera className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                                <span>Cómo tomar una mejor fotografía para respaldar tu local:</span>
                            </div>
                            <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-sky-800">
                                {resultado.photo_improvement_recommendations.map((rec, idx) => (
                                    <li key={`rec-${idx}`}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Deslinde Legal y Pedagógico Innegociable */}
            <div className="mt-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-sm leading-relaxed text-slate-600">
                <div className="mb-0.5 flex items-center gap-1 font-bold text-slate-800">
                    <Scale className="h-3 w-3 shrink-0 text-slate-500" />
                    <span>Aviso Preventivo Ciudadano:</span>
                </div>
                <p>
                    {resultado.advertencia_legal ||
                        'Este análisis es una orientación visual automática elaborada con inteligencia artificial. No certifica el cumplimiento de normas técnicas, no sustituye pruebas instrumentales ni reemplaza la inspección técnica de seguridad en edificaciones (ITSE) realizada por inspectores municipales.'}
                </p>
            </div>
        </div>
    );
}
