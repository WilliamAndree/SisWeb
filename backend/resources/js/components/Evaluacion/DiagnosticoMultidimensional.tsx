import type { DesgloseEspecialidades } from '@/types/contrato';
import { AlertTriangle, CheckCircle2, Clock, Flame, Footprints, Layers, Scale, ShieldAlert, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import React from 'react';

export interface CriterioResumenItem {
    codigo: string;
    titulo: string;
    es_critico?: boolean;
    que_observar?: string;
    norma_base?: string | null;
}

export interface DiagnosticoMultidimensionalProps {
    /** Desglose por 4 disciplinas proveniente del backend (si existe) */
    desglose?: DesgloseEspecialidades | null;
    /** Criterios con observaciones (pendientes de atender) */
    pendientes?: CriterioResumenItem[];
    /** Criterios marcados por verificar */
    porRevisar?: CriterioResumenItem[];
    /** Criterios declarados conformes */
    cumple?: CriterioResumenItem[];
    /** Clasificación del trámite */
    clasificacion?: {
        tipo_tramite?: string;
        nivel_riesgo?: string;
        es_previa?: boolean;
        motivos?: string[];
    } | null;
    /** Nombre del comercio */
    nombreComercio?: string;
    className?: string;
}

/**
 * Clasifica un código o texto en uno de los 2 ejes canónicos de CENEPRED (Anexo 17).
 */
export function clasificarEnEjeCenepred(codigo: string, titulo: string = ''): 'incendio_electrico' | 'evacuacion_estructural' {
    const cod = codigo.toUpperCase();
    const text = titulo.toLowerCase();

    if (
        cod.startsWith('CRIT-01') || // Extintor PQS
        cod.startsWith('CRIT-02A') || // Extintor K
        cod.startsWith('CRIT-05') || // Pozo a tierra
        cod.startsWith('CRIT-06') || // Tablero y diferencial
        cod.startsWith('CRIT-07') || // Cables canalizados / mellizos
        cod.startsWith('CRIT-08') || // Luces de emergencia (circuito eléctrico)
        cod.startsWith('CRIT-10') || // GLP
        cod.startsWith('CRIT-14') || // Mandil / espacio libre tablero
        cod.includes('EXTINTOR') ||
        cod.includes('DIFERENCIAL') ||
        cod.includes('TERMOMAGNETICO') ||
        cod.includes('TABLERO') ||
        cod.includes('CABLEADO') ||
        cod.includes('TIERRA') ||
        cod.includes('GLP') ||
        cod.includes('CAMPANA') ||
        cod.includes('DETECTOR') ||
        text.includes('extintor') ||
        text.includes('pozo a tierra') ||
        text.includes('puesta a tierra') ||
        text.includes('tablero') ||
        text.includes('diferencial') ||
        text.includes('cable') ||
        text.includes('gas') ||
        text.includes('glp') ||
        text.includes('calder') ||
        text.includes('eléctr')
    ) {
        return 'incendio_electrico';
    }

    return 'evacuacion_estructural';
}

interface MetricasEjes {
    total1: number;
    cumplidas1: number;
    alertas1: number;
    total2: number;
    cumplidas2: number;
    alertas2: number;
}

function calcularMetricasDesdeDesglose(desglose: DesgloseEspecialidades): MetricasEjes {
    const elec = desglose.electricas ?? { total: 0, cumplidas: 0, alertas: 0 };
    const inc = desglose.incendios ?? { total: 0, cumplidas: 0, alertas: 0 };
    const arq = desglose.arquitectura ?? { total: 0, cumplidas: 0, alertas: 0 };
    const est = desglose.estructuras ?? { total: 0, cumplidas: 0, alertas: 0 };

    return {
        total1: elec.total + inc.total,
        cumplidas1: elec.cumplidas + inc.cumplidas,
        alertas1: elec.alertas + inc.alertas,
        total2: arq.total + est.total,
        cumplidas2: arq.cumplidas + est.cumplidas,
        alertas2: arq.alertas + est.alertas,
    };
}

function calcularMetricasDesdeListas(
    cumple: CriterioResumenItem[],
    pendientes: CriterioResumenItem[],
    porRevisar: CriterioResumenItem[],
): MetricasEjes {
    let total1 = 0;
    let cumplidas1 = 0;
    let alertas1 = 0;
    let total2 = 0;
    let cumplidas2 = 0;
    let alertas2 = 0;

    cumple.forEach((it) => {
        if (clasificarEnEjeCenepred(it.codigo, it.titulo) === 'incendio_electrico') {
            cumplidas1++;
            total1++;
        } else {
            cumplidas2++;
            total2++;
        }
    });

    [...pendientes, ...porRevisar].forEach((it) => {
        if (clasificarEnEjeCenepred(it.codigo, it.titulo) === 'incendio_electrico') {
            alertas1++;
            total1++;
        } else {
            alertas2++;
            total2++;
        }
    });

    return { total1, cumplidas1, alertas1, total2, cumplidas2, alertas2 };
}

function calcularMetricasEjes(
    desglose: DesgloseEspecialidades | null | undefined,
    cumple: CriterioResumenItem[],
    pendientes: CriterioResumenItem[],
    porRevisar: CriterioResumenItem[],
): MetricasEjes {
    if (desglose) {
        return calcularMetricasDesdeDesglose(desglose);
    }

    return calcularMetricasDesdeListas(cumple, pendientes, porRevisar);
}

function calcularPorcentajeConformidad(cumplidas: number, total: number): number {
    return total > 0 ? Math.min(100, Math.max(0, Math.round((cumplidas / total) * 100))) : 100;
}

function calcularDiasEstimadosResolucion(alertas1: number, alertas2: number): string {
    if (alertas1 === 0 && alertas2 === 0) {
        return '0 días (Cumplimiento inmediato)';
    }
    if (alertas1 > 0 && alertas2 > 0) {
        return '3 a 5 días hábiles (Intervención técnica integral)';
    }
    if (alertas1 > 0) {
        return '2 a 4 días hábiles (Adecuación eléctrica y extintores)';
    }
    return '1 a 3 días hábiles (Despeje y señalética de rutas)';
}

function obtenerAnalisisPrevalencia(esEje1Conforme: boolean, esEje2Conforme: boolean): { diagnosticoPrevalencia: string; estiloPrevalencia: string } {
    if (esEje1Conforme && esEje2Conforme) {
        return {
            diagnosticoPrevalencia:
                'Ambos ejes evaluados se encuentran en estado CONFORME según tu autodeclaración. Tu establecimiento presenta las condiciones orientadas a tramitar la Licencia de Funcionamiento con ITSE Posterior (Declaración Jurada - Anexo 4).',
            estiloPrevalencia: 'border-emerald-300 bg-emerald-50/80 text-emerald-950',
        };
    }
    if (!esEje1Conforme && esEje2Conforme) {
        return {
            diagnosticoPrevalencia:
                'Aunque el Eje de Evacuación cumple al 100%, prevalece el riesgo del Eje de Incendio y Seguridad Eléctrica por existir observaciones en tableros, puesta a tierra o extintores. Por norma CENEPRED, el riesgo no se promedia para garantizar la vida humana.',
            estiloPrevalencia: 'border-rose-300 bg-rose-50/90 text-rose-950',
        };
    }
    if (esEje1Conforme && !esEje2Conforme) {
        return {
            diagnosticoPrevalencia:
                'Aunque las instalaciones de fuego y electricidad están en orden, prevalece la criticidad del Eje de Evacuación y Estructuras. Anchos de paso obstruidos o puertas trabadas impiden la evacuación en sismos e incendios.',
            estiloPrevalencia: 'border-amber-300 bg-amber-50/90 text-amber-950',
        };
    }
    return {
        diagnosticoPrevalencia:
            'Ambos ejes normativos presentan no-conformidades activas. El establecimiento se clasifica en el rango crítico más elevado, siendo mandatorio subsanar las alertas prioritarias antes de solicitar la verificación municipal.',
        estiloPrevalencia: 'border-rose-300 bg-rose-50/90 text-rose-950',
    };
}

function obtenerClasesContenedorEje(esConforme: boolean, alertas: number, esPrevia: boolean): string {
    if (esConforme) {
        return 'border-emerald-200 bg-emerald-50/30';
    }
    if (alertas > 0 && esPrevia) {
        return 'border-rose-200 bg-rose-50/30';
    }
    return 'border-amber-200 bg-amber-50/30';
}

interface EstilosTarjetaEje {
    claseIcono: string;
    claseBadge: string;
    clasePorcentaje: string;
    claseBarra: string;
}

function obtenerEstilosTarjetaEje(variante: 'incendio' | 'evacuacion', esConforme: boolean): EstilosTarjetaEje {
    if (esConforme) {
        return {
            claseIcono: 'bg-emerald-100 text-emerald-700',
            claseBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            clasePorcentaje: 'text-emerald-700',
            claseBarra: 'bg-emerald-500',
        };
    }

    if (variante === 'incendio') {
        return {
            claseIcono: 'bg-rose-100 text-rose-700',
            claseBadge: 'bg-rose-50 text-rose-800 border-rose-200',
            clasePorcentaje: 'text-rose-600',
            claseBarra: 'bg-rose-500',
        };
    }

    return {
        claseIcono: 'bg-amber-100 text-amber-700',
        claseBadge: 'bg-amber-50 text-amber-900 border-amber-200',
        clasePorcentaje: 'text-amber-700',
        claseBarra: 'bg-amber-500',
    };
}

interface TarjetaEjeProps {
    variante: 'incendio' | 'evacuacion';
    etiquetaEje: string;
    titulo: string;
    descripcion: string;
    iconoPrincipal: React.ReactNode;
    iconoAlerta: React.ReactNode;
    esConforme: boolean;
    esPrevia: boolean;
    pct: number;
    cumplidas: number;
    total: number;
    alertas: number;
    children: React.ReactNode;
}

function TarjetaEje({
    variante,
    etiquetaEje,
    titulo,
    descripcion,
    iconoPrincipal,
    iconoAlerta,
    esConforme,
    esPrevia,
    pct,
    cumplidas,
    total,
    alertas,
    children,
}: Readonly<TarjetaEjeProps>) {
    const claseContenedor = obtenerClasesContenedorEje(esConforme, alertas, esPrevia);
    const estilos = obtenerEstilosTarjetaEje(variante, esConforme);
    const textoAlertas = alertas === 1 ? 'Alerta' : 'Alertas';

    return (
        <div className={`space-y-4 rounded-2xl border p-5 shadow-2xs transition-shadow ${claseContenedor}`}>
            {/* Cabecera del Eje */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${estilos.claseIcono}`}>{iconoPrincipal}</div>
                    <div>
                        <span className="block text-[10px] font-black tracking-wider text-slate-500 uppercase">{etiquetaEje}</span>
                        <h3 className="text-sm leading-snug font-black text-slate-900">{titulo}</h3>
                    </div>
                </div>

                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${estilos.claseBadge}`}>
                    {esConforme ? (
                        <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Conforme</span>
                        </>
                    ) : (
                        <>
                            {iconoAlerta}
                            <span>
                                {alertas} {textoAlertas}
                            </span>
                        </>
                    )}
                </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">{descripcion}</p>

            {/* Barra de Score / Conformidad */}
            <div className="space-y-1.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Conformidad del Eje</span>
                    <span className={`font-mono font-black ${estilos.clasePorcentaje}`}>{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div style={{ width: `${pct}%` }} className={`h-full rounded-full transition-all duration-700 ${estilos.claseBarra}`} />
                </div>
                <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-500">
                    <span>
                        {cumplidas} de {total} condiciones conformes
                    </span>
                    <span>{alertas} por subsanar</span>
                </div>
            </div>

            {/* Criterios clave fiscalizados en este eje */}
            <div className="space-y-2 border-t border-slate-200/60 pt-1">
                <span className="block text-[11px] font-bold text-slate-700">Criterios Normativos Evaluados:</span>
                <ul className="space-y-1.5 text-xs text-slate-600">{children}</ul>
            </div>
        </div>
    );
}

export function DiagnosticoMultidimensional({
    desglose,
    pendientes = [],
    porRevisar = [],
    cumple = [],
    clasificacion,
    nombreComercio,
    className = '',
}: Readonly<DiagnosticoMultidimensionalProps>) {
    const { total1, cumplidas1, alertas1, total2, cumplidas2, alertas2 } = calcularMetricasEjes(desglose, cumple, pendientes, porRevisar);

    // Porcentajes de conformidad protegidos
    const pct1 = calcularPorcentajeConformidad(cumplidas1, total1);
    const pct2 = calcularPorcentajeConformidad(cumplidas2, total2);

    const esPrevia = Boolean(clasificacion?.es_previa || clasificacion?.tipo_tramite === 'EX_ANTE');

    const esEje1Conforme = alertas1 === 0;
    const esEje2Conforme = alertas2 === 0;

    // Tiempo estimado de resolución técnica
    const totalAlertas = alertas1 + alertas2;
    const diasEstimadosResolucion = calcularDiasEstimadosResolucion(alertas1, alertas2);

    // Análisis del Principio de Prevalencia
    const { diagnosticoPrevalencia, estiloPrevalencia } = obtenerAnalisisPrevalencia(esEje1Conforme, esEje2Conforme);

    return (
        <section
            aria-label="Diagnóstico analítico multidimensional de riesgo por ejes CENEPRED"
            className={`space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7 ${className}`}
        >
            {/* 1. Cabecera Institucional del Diagnóstico */}
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-2xs">
                        <Scale className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
                                Diagnóstico Analítico Multidimensional de Riesgo
                            </h2>
                            <span className="hidden items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-indigo-800 uppercase sm:inline-flex">
                                Anexo 17 CENEPRED
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                            Evaluación desglosada {nombreComercio ? `para "${nombreComercio}" ` : ''}por los dos ejes determinantes de la seguridad en
                            edificaciones (D.S. N° 002-2018-PCM / R.J. N° 016-2018-CENEPRED/J).
                        </p>
                    </div>
                </div>

                <span className="w-fit rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-[11px] font-bold text-slate-500">
                    Matriz de Riesgo CENEPRED (D.S. N° 002-2018-PCM)
                </span>
            </div>

            {/* 2. Cuadrantes de los Dos Ejes Normativos */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* ========================================================================= */}
                {/* EJE 1: RIESGO DE INCENDIO Y SEGURIDAD ELÉCTRICA                           */}
                {/* ========================================================================= */}
                <TarjetaEje
                    variante="incendio"
                    etiquetaEje="Eje Determinante 1"
                    titulo="Riesgo de Incendio y Seguridad Eléctrica"
                    descripcion="Protección contra fuego, sobrecargas eléctricas, cortocircuitos, descargas atmosféricas y control seguro de combustibles."
                    iconoPrincipal={<Flame className="h-5 w-5" />}
                    iconoAlerta={<ShieldAlert className="h-3.5 w-3.5 text-rose-600" />}
                    esConforme={esEje1Conforme}
                    esPrevia={esPrevia}
                    pct={pct1}
                    cumplidas={cumplidas1}
                    total={total1}
                    alertas={alertas1}
                >
                    <li className="flex items-start gap-2">
                        <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span>
                            <strong>Tableros Eléctricos:</strong> Interruptor diferencial 30 mA y mandil protector sin cables expuestos.
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span>
                            <strong>Puesta a Tierra:</strong> Protocolo de medición ≤ 25 Ω suscrito por ingeniero electricista colegiado habilitado
                            (CIP).
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                        <span>
                            <strong>Extintores Operativos:</strong> Recarga anual vigente NTP 350.043-1 (PQS y Acetato Clase K).
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                        <span>
                            <strong>Combustibles / Gas GLP:</strong> Tanques y balones en zonas ventiladas alejados de fuentes de calor.
                        </span>
                    </li>
                </TarjetaEje>

                {/* ========================================================================= */}
                {/* EJE 2: RIESGO DE EVACUACIÓN Y SEGURIDAD ESTRUCTURAL                       */}
                {/* ========================================================================= */}
                <TarjetaEje
                    variante="evacuacion"
                    etiquetaEje="Eje Determinante 2"
                    titulo="Riesgo de Evacuación y Seguridad Estructural"
                    descripcion="Fluidez en rutas de salida, ancho normativo de pasadizos, puertas de escape, aforo regulado y estabilidad sismorresistente."
                    iconoPrincipal={<Footprints className="h-5 w-5" />}
                    iconoAlerta={<AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                    esConforme={esEje2Conforme}
                    esPrevia={false}
                    pct={pct2}
                    cumplidas={cumplidas2}
                    total={total2}
                    alertas={alertas2}
                >
                    <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
                        <span>
                            <strong>Pasadizos y Rutas:</strong> Ancho continuo libre de mercadería ≥ 1.20 m (RNE A.010 Art. 25).
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span>
                            <strong>Puertas de Escape:</strong> Apertura hacia el exterior sin cerraduras trabadas durante atención.
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span>
                            <strong>Luces y Señalética:</strong> Luminarias autónomas de 90 min y señales fotoluminiscentes de salida.
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                        <span>
                            <strong>Arriostramiento Sísmico:</strong> Anclaje mecánico rígido de estanterías y muebles &gt; 1.80 m.
                        </span>
                    </li>
                </TarjetaEje>
            </div>

            {/* 3. Banner Pedagógico del Principio de Prevalencia del Mayor Riesgo */}
            <div className={`space-y-3 rounded-2xl border p-5 ${estiloPrevalencia}`}>
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-2xs">
                        <Scale className="h-4 w-4 text-slate-900" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black tracking-wider uppercase">Principio de Prevalencia del Mayor Riesgo (Anexo 17 CENEPRED)</h4>
                        <span className="text-[11px] font-medium opacity-90">Criterio de ingeniería de seguridad humana no compensatoria</span>
                    </div>
                </div>

                <p className="text-xs leading-relaxed">
                    Conforme a la normativa nacional (<strong>Anexo 17 CENEPRED / D.S. N° 002-2018-PCM</strong>), el nivel de riesgo final{' '}
                    <strong>no es un promedio aritmético</strong>: si un establecimiento tiene condiciones seguras en evacuación pero presenta
                    observaciones críticas en electricidad o fuego, <strong>prevalece el nivel de mayor riesgo para salvaguardar la vida</strong>. Una
                    sola falla crítica en el eje de incendio impide la aprobación de la ITSE.
                </p>

                <div className="space-y-1 rounded-xl border border-black/5 bg-white/70 p-3.5 text-xs font-medium">
                    <strong className="block text-[11px] tracking-wider text-slate-700 uppercase">
                        Diagnóstico específico para tu establecimiento:
                    </strong>
                    <p className="leading-relaxed">{diagnosticoPrevalencia}</p>
                </div>
            </div>

            {/* 4. Bloque de Métricas Analíticas Consolidadas */}
            <div className="grid grid-cols-1 gap-3.5 border-t border-slate-100 pt-2 sm:grid-cols-3">
                <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <span className="block text-[10px] font-black tracking-wider text-slate-500 uppercase">Nivel Global Resultante</span>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className={`h-4 w-4 ${esPrevia ? 'text-rose-600' : 'text-emerald-600'}`} />
                        <span className="text-sm font-bold text-slate-900">{esPrevia ? 'Riesgo Alto / Muy Alto' : 'Riesgo Bajo / Medio'}</span>
                    </div>
                    <span className="block text-[10px] text-slate-500">
                        {esPrevia ? 'Trámite ITSE Previa (Anexo 9)' : 'Trámite ITSE Posterior (Anexo 4)'}
                    </span>
                </div>

                <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <span className="block text-[10px] font-black tracking-wider text-slate-500 uppercase">Conformidad por Eje</span>
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-800">
                        <span className={esEje1Conforme ? 'text-emerald-700' : 'text-rose-600'}>Incendio: {pct1}%</span>
                        <span className="text-slate-300">·</span>
                        <span className={esEje2Conforme ? 'text-emerald-700' : 'text-amber-700'}>Evacuación: {pct2}%</span>
                    </div>
                    <span className="block text-[10px] text-slate-500">
                        {totalAlertas === 0 ? 'Sin alertas activas' : `${totalAlertas} alertas combinadas`}
                    </span>
                </div>

                <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <span className="block text-[10px] font-black tracking-wider text-slate-500 uppercase">Tiempo Estimado de Subsanación</span>
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-600" />
                        <span className="text-xs leading-tight font-bold text-slate-900">{diasEstimadosResolucion}</span>
                    </div>
                    <span className="block text-[10px] text-slate-500">Plazo preventivo referencial Huancayo</span>
                </div>
            </div>
        </section>
    );
}
