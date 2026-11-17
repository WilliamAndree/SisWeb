import { AvisoPreventivo, FlujoCiudadano } from '@/components/Evaluacion/FlujoCiudadano';
import { GuiaModal } from '@/components/GuiaModal';
import {
    FUNCIONES_ECONOMICAS,
    TEXTO_MODALIDAD,
    clasificarItse,
    leerNumero,
    type ClasificacionItse,
    type ModalidadItse,
} from '@/lib/clasificacion-itse';
import { formatearNivelRiesgo } from '@/lib/riesgo';
import type { FormDataConvertible } from '@inertiajs/core';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Building2,
    Check,
    CheckCircle2,
    Clock,
    Flame,
    Footprints,
    Layers,
    MapPin,
    Package,
    RefreshCw,
    Store,
    UtensilsCrossed,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

type ValorNumericoFlexible = string | number | null;

export interface ReevaluacionData {
    uuid: string;
    nombre_comercio: string;
    funcion_economica: string;
    ruc?: string | null;
    direccion?: string | null;
    referencia?: string | null;
    area_m2?: ValorNumericoFlexible;
    pisos?: number | null;
    aforo?: number | null;
    usa_glp?: boolean | null;
    galones_glp?: number | null;
    usa_caldero?: boolean | null;
    usa_liquidos_inflamables?: boolean | null;
    tiene_equipos_fritura?: boolean | null;
    tiene_escaleras?: boolean | null;
    tiene_estanterias_altas?: boolean | null;
    en_sotano?: boolean | null;
    galeria_sin_itse?: boolean | null;
    combustibles_liquidos_m3?: ValorNumericoFlexible;
    fecha_anterior?: string;
    semaforo_anterior?: string;
}

interface NuevaProps {
    catalogo?: unknown[];
    reevaluacionDe?: ReevaluacionData | null;
}

interface FormEvaluacionData {
    evaluacion_origen_uuid?: string;
    nombre_comercio: string;
    funcion_economica: string;
    ruc: string;
    direccion: string;
    referencia: string;
    area_m2: string;
    pisos: number | string;
    aforo: number | string;
    usa_glp: boolean | null;
    galones_glp: number | string;
    usa_caldero: boolean | null;
    usa_liquidos_inflamables: boolean | null;
    tiene_equipos_fritura: boolean | null;
    tiene_escaleras: boolean | null;
    tiene_estanterias_altas: boolean | null;
    en_sotano?: boolean | null;
    galeria_sin_itse?: boolean | null;
    combustibles_liquidos_m3?: number | string;
    [key: string]: FormDataConvertible;
}

export interface PrecalificacionInput {
    area_m2?: ValorNumericoFlexible;
    aforo?: ValorNumericoFlexible;
    pisos?: ValorNumericoFlexible;
    funcion_economica?: string;
    usa_glp?: boolean | null;
    galones_glp?: ValorNumericoFlexible;
    usa_caldero?: boolean | null;
    usa_liquidos_inflamables?: boolean | null;
    en_sotano?: boolean | null;
    galeria_sin_itse?: boolean | null;
}

export interface PrecalificacionOrientativa {
    modalidad: ModalidadItse;
    titulo: string;
    nivel: ClasificacionItse['nivel'];
    factores: string[];
    /** Situaciones que el servidor no clasifica pero conviene consultar con la municipalidad. */
    avisos: string[];
}

/**
 * Criterios normativos que el motor de aplicabilidad habilita a partir de cada
 * declaración física del ciudadano (R.J. 016-2018-CENEPRED/J y D.S. 002-2018-PCM).
 */
const CRITERIOS_POR_DECLARACION = [
    { codigo: 'CRIT-10', etiqueta: 'Gas Licuado de Petróleo', campo: 'usa_glp' },
    { codigo: 'CRIT-02A', etiqueta: 'Cocción con aceites · Clase K', campo: 'tiene_equipos_fritura' },
    { codigo: 'CRIT-11', etiqueta: 'Escaleras y pasamanos', campo: 'tiene_escaleras' },
    { codigo: 'CRIT-13', etiqueta: 'Arriostramiento antisísmico', campo: 'tiene_estanterias_altas' },
] as const;

const CAMPOS_DECLARACION = ['usa_glp', 'tiene_equipos_fritura', 'tiene_escaleras', 'tiene_estanterias_altas'] as const;

const ESTILO_NIVEL: Record<ClasificacionItse['nivel'], { fondo: string; texto: string; borde: string }> = {
    BAJO_MEDIO: { fondo: 'bg-emerald-50', texto: 'text-emerald-900', borde: 'border-emerald-200' },
    ALTO_MUY_ALTO: { fondo: 'bg-amber-50', texto: 'text-amber-900', borde: 'border-amber-200' },
};

function tieneDatosParaClasificar(input: PrecalificacionInput): boolean {
    return (
        [input.area_m2, input.pisos, input.aforo].some((valor) => leerNumero(valor) !== null) ||
        Boolean(input.usa_glp || input.usa_caldero || input.usa_liquidos_inflamables)
    );
}

/**
 * Precalificación local y orientativa. La modalidad sale de `clasificarItse()`,
 * espejo exacto de `ItseRiskService::clasificarTramite()`, para que el ciudadano
 * vea aquí lo mismo que luego mostrará el resumen. Sótano y galería sin ITSE no
 * forman parte de esa regla del servidor: se muestran como avisos aparte.
 */
export function precalificarLocalmente(input: PrecalificacionInput): PrecalificacionOrientativa | null {
    if (!tieneDatosParaClasificar(input)) {
        return null;
    }

    const clasificacion = clasificarItse({
        funcion: input.funcion_economica,
        areaM2: leerNumero(input.area_m2),
        pisos: leerNumero(input.pisos),
        aforo: leerNumero(input.aforo),
        usaGlp: input.usa_glp,
        galonesGlp: leerNumero(input.galones_glp),
        usaCaldero: input.usa_caldero,
        usaLiquidosInflamables: input.usa_liquidos_inflamables,
    });

    const avisos: string[] = [];
    if (input.en_sotano)
        avisos.push('Actividades en sótano o semisótano: la matriz de riesgos puede elevar el nivel. Consúltalo con tu municipalidad.');
    if (input.galeria_sin_itse)
        avisos.push('Las áreas comunes de tu galería no tienen ITSE vigente: esto puede elevar el nivel de riesgo de tu local.');

    return {
        modalidad: clasificacion.modalidad,
        titulo: TEXTO_MODALIDAD[clasificacion.modalidad].titulo,
        nivel: clasificacion.nivel,
        factores:
            clasificacion.motivos.length > 0
                ? clasificacion.motivos
                : ['Tu local está dentro de los límites de tamaño y no declara factores agravantes.'],
        avisos,
    };
}

interface SelectorSiNoProps {
    etiquetaId: string;
    descripcionId: string;
    valor: boolean | null | undefined;
    onSeleccion: (valor: boolean | null) => void;
}

/**
 * Declaraciones binarias (Sí/No) presentadas como selector tipo pastilla.
 *
 * Es una pieza puramente presentacional: no guarda estado propio ni conoce el
 * motor de aplicabilidad. Recibe el valor declarado y emite la intención del
 * ciudadano, de modo que la escritura en `useForm()` sigue ocurriendo en el
 * manejador que la acompaña. El estado activo se marca con relleno sólido,
 * anillo y un icono de confirmación, para que sea inequívoco al tacto.
 */
function SelectorSiNo({ etiquetaId, descripcionId, valor, onSeleccion }: Readonly<SelectorSiNoProps>) {
    const opciones: Array<{ texto: string; valor: boolean | null }> = [
        { texto: 'No', valor: false },
        { texto: 'Sí', valor: true },
        { texto: 'Aún no lo sé', valor: null },
    ];

    return (
        <fieldset
            aria-labelledby={etiquetaId}
            aria-describedby={descripcionId}
            className="m-0 inline-flex shrink-0 flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1"
        >
            <legend className="sr-only">Selecciona una respuesta</legend>
            {opciones.map(({ texto, valor: opcion }) => {
                const activo = (valor ?? null) === opcion;

                return (
                    <button
                        key={texto}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => onSeleccion(opcion)}
                        className={`inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-95 sm:h-11 ${
                            activo
                                ? 'bg-primary text-white shadow-sm ring-1 ring-emerald-600'
                                : 'bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                        {activo && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        {texto}
                    </button>
                );
            })}
        </fieldset>
    );
}

const renderIconoIndicador = (activo: boolean, descartado: boolean) => {
    if (activo) {
        return <CheckCircle2 className="h-3 w-3" />;
    }
    if (descartado) {
        return <span aria-hidden="true">—</span>;
    }
    return <AlertTriangle className="h-3 w-3" />;
};

function claseChipCriterio(activo: boolean, descartado: boolean): string {
    if (activo) {
        return 'border-emerald-600 bg-primary text-white';
    }
    if (descartado) {
        return 'border-slate-200 bg-white text-slate-400 line-through';
    }
    return 'border-amber-200 bg-amber-50 text-amber-800';
}

function construirValoresIniciales(reevaluacionDe: ReevaluacionData | null): FormEvaluacionData {
    return {
        evaluacion_origen_uuid: reevaluacionDe?.uuid ?? '',
        nombre_comercio: reevaluacionDe?.nombre_comercio ?? '',
        funcion_economica: reevaluacionDe?.funcion_economica ?? 'Comercio',
        ruc: reevaluacionDe?.ruc ?? '',
        direccion: reevaluacionDe?.direccion ?? '',
        referencia: reevaluacionDe?.referencia ?? '',
        area_m2: String(reevaluacionDe?.area_m2 ?? ''),
        pisos: reevaluacionDe?.pisos ?? '',
        aforo: reevaluacionDe?.aforo ?? '',
        usa_glp: reevaluacionDe?.usa_glp ?? null,
        galones_glp: reevaluacionDe?.galones_glp ?? '',
        usa_caldero: reevaluacionDe?.usa_caldero ?? null,
        usa_liquidos_inflamables: reevaluacionDe?.usa_liquidos_inflamables ?? null,
        tiene_equipos_fritura: reevaluacionDe?.tiene_equipos_fritura ?? null,
        tiene_escaleras: reevaluacionDe?.tiene_escaleras ?? null,
        tiene_estanterias_altas: reevaluacionDe?.tiene_estanterias_altas ?? null,
        en_sotano: reevaluacionDe?.en_sotano ?? null,
        galeria_sin_itse: reevaluacionDe?.galeria_sin_itse ?? null,
        combustibles_liquidos_m3: reevaluacionDe?.combustibles_liquidos_m3 ?? '',
    };
}

function esNumeroMenorQue(valor: string | number | null | undefined, minimo: number): boolean {
    if (valor === '' || valor === null || valor === undefined) {
        return false;
    }
    const numero = Number(valor);
    return Number.isNaN(numero) || numero < minimo;
}

function esAreaInvalida(areaTexto: string): boolean {
    if (!areaTexto.trim()) {
        return false;
    }
    const numero = Number(areaTexto);
    return Number.isNaN(numero) || numero <= 0;
}

function esRucInvalido(ruc: string): boolean {
    const rucLimpio = ruc.trim();
    return Boolean(rucLimpio) && !/^(10|20)\d{9}$/.test(rucLimpio);
}

function validarFormularioNueva(data: FormEvaluacionData): Record<string, string> {
    const errs: Record<string, string> = {};

    // 1. Nombre comercial obligatorio
    if (!data.nombre_comercio.trim()) {
        errs.nombre_comercio = 'Ingresa el nombre comercial de tu establecimiento.';
    }

    // 2. RUC opcional pero con formato estricto si se ingresa
    if (esRucInvalido(data.ruc)) {
        errs.ruc = 'El RUC debe tener exactamente 11 dígitos numéricos y comenzar con 10 o 20.';
    }

    // 3. Escala física numérica si se ingresa
    if (esAreaInvalida(data.area_m2)) {
        errs.area_m2 = 'El área debe ser un valor mayor a 0 metros cuadrados.';
    }

    if (esNumeroMenorQue(data.pisos, 1)) {
        errs.pisos = 'El número de pisos debe ser al menos 1.';
    }

    if (esNumeroMenorQue(data.aforo, 1)) {
        errs.aforo = 'El aforo estimado debe ser al menos 1 persona.';
    }

    return errs;
}

function enfocarPrimerError(errs: Record<string, string>): void {
    const primerError = Object.keys(errs)[0];
    const elem = document.getElementById(`campo-${primerError}`) || document.getElementById(`est-${primerError}`);
    if (elem) {
        const control = elem.matches('input, select, button') ? elem : elem.querySelector<HTMLElement>('input, select, button');
        control?.focus();
        elem.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }
}

function obtenerErrorCampo(campo: string, erroresFormulario: Record<string, string>, errors: Partial<Record<string, string>>): string | undefined {
    return erroresFormulario[campo] || errors[campo];
}

function parsearEnteroOpcional(valor: string): number | '' {
    if (valor === '') return '';
    return Number.parseInt(valor, 10) || '';
}

type ActualizarCampoFormulario = <K extends keyof FormEvaluacionData>(campo: K, valor: FormEvaluacionData[K]) => void;

interface PanelPrecalificacionOrientativaProps {
    precalificacion: PrecalificacionOrientativa | null;
    data: FormEvaluacionData;
    declaracionesPendientes: number;
}

function PanelPrecalificacionOrientativa({ precalificacion, data, declaracionesPendientes }: Readonly<PanelPrecalificacionOrientativaProps>) {
    return (
        <section
            aria-label="Precalificación orientativa"
            aria-live="polite"
            className="mb-7 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-xs sm:p-6"
        >
            <div className="flex items-start gap-4">
                <div className="bg-primary shrink-0 rounded-2xl p-2.5 text-white">
                    <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-sm font-extrabold text-slate-900">Precalificación orientativa</h2>
                        {precalificacion ? (
                            <>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase ${
                                        ESTILO_NIVEL[precalificacion.nivel].fondo
                                    } ${ESTILO_NIVEL[precalificacion.nivel].texto} ${ESTILO_NIVEL[precalificacion.nivel].borde}`}
                                >
                                    {formatearNivelRiesgo(precalificacion.nivel)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                    <Clock className="h-3 w-3" />
                                    {precalificacion.titulo}
                                </span>
                            </>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                                Reúne datos
                            </span>
                        )}
                    </div>

                    {precalificacion ? (
                        <ul className="mt-3.5 space-y-1.5">
                            {precalificacion.factores.map((factor) => (
                                <li key={factor} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 sm:text-sm">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                    {factor}
                                </li>
                            ))}
                            {precalificacion.avisos.map((aviso) => (
                                <li key={aviso} className="flex items-start gap-2 text-xs leading-relaxed text-amber-900 sm:text-sm">
                                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                    {aviso}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            Completa el área, los pisos o el aforo para ver una orientación preliminar. Puedes dejarlos en blanco si no los conoces
                            con exactitud.
                        </p>
                    )}
                </div>
            </div>

            {/* Criterios que el motor habilitará según lo declarado */}
            <div className="mt-4 border-t border-emerald-200/70 pt-4">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Criterios que se activarán</span>
                    {CRITERIOS_POR_DECLARACION.map((criterio) => {
                        const estado = data[criterio.campo] as boolean | null | undefined;
                        const activo = estado === true;
                        const descartado = estado === false;
                        return (
                            <span
                                key={criterio.codigo}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${claseChipCriterio(activo, descartado)}`}
                            >
                                {renderIconoIndicador(activo, descartado)}
                                <span className="font-mono">{criterio.codigo}</span>
                                <span className="font-normal">{criterio.etiqueta}</span>
                            </span>
                        );
                    })}
                </div>

                {declaracionesPendientes > 0 && (
                    <p className="mt-2.5 text-[11px] leading-relaxed text-amber-800">
                        Faltan {declaracionesPendientes} de 4 declaraciones obligatorias. Sin ellas el motor no puede filtrar los criterios que te
                        corresponden.
                    </p>
                )}

                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                    Orientación calculada en tu navegador a partir de lo que declaras, conforme a los umbrales del{' '}
                    <strong className="font-semibold text-slate-700">Manual CENEPRED (R.J. 016-2018-CENEPRED/J)</strong> y el{' '}
                    <strong className="font-semibold text-slate-700">D.S. 002-2018-PCM</strong>. No se envía ni se registra como clasificación: la
                    determinación formal y los plazos de emisión dependen de cada municipalidad distrital.
                </p>
            </div>
        </section>
    );
}

interface BannerReevaluacionPreventivaProps {
    reevaluacionDe: ReevaluacionData;
}

function BannerReevaluacionPreventiva({ reevaluacionDe }: Readonly<BannerReevaluacionPreventivaProps>) {
    return (
        <div
            role="note"
            aria-label="Información de reevaluación preventiva"
            className="mb-6 flex flex-col items-start justify-between gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 text-left text-xs text-slate-900 shadow-xs sm:flex-row sm:items-center sm:text-sm"
        >
            <div className="flex items-start gap-3">
                <div className="bg-primary mt-0.5 shrink-0 rounded-2xl p-2.5 text-white">
                    <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                    <span className="rounded-full border border-emerald-200 bg-white/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                        Nueva Reevaluación Preventiva
                    </span>
                    <h2 className="mt-1 text-sm font-extrabold text-slate-900 sm:text-base">Reevaluando: {reevaluacionDe.nombre_comercio}</h2>
                    <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-slate-600">
                        Los datos del establecimiento han sido precargados desde tu evaluación anterior
                        {reevaluacionDe.fecha_anterior ? ` del ${reevaluacionDe.fecha_anterior}` : ''}. Tu evaluación previa se conservará sin cambios
                        en tu historial.
                    </p>
                </div>
            </div>
            <span className="shrink-0 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-800 shadow-2xs">
                Trazabilidad independiente
            </span>
        </div>
    );
}

interface SeccionIdentificacionGiroProps {
    data: FormEvaluacionData;
    setData: ActualizarCampoFormulario;
    erroresFormulario: Record<string, string>;
    errors: Partial<Record<string, string>>;
    limpiarErrorDe: (campo: string) => void;
}

function SeccionIdentificacionGiro({ data, setData, erroresFormulario, errors, limpiarErrorDe }: Readonly<SeccionIdentificacionGiroProps>) {
    const errorNombre = obtenerErrorCampo('nombre_comercio', erroresFormulario, errors);
    const errorRuc = obtenerErrorCampo('ruc', erroresFormulario, errors);

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-xs" id="campo-nombre_comercio">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Store className="h-4 w-4 text-emerald-600" /> Identificación y Giro Económico
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="est-nombre" className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                        Nombre Comercial del Establecimiento{' '}
                        <span className="text-danger-500" aria-hidden="true">
                            *
                        </span>
                    </label>
                    <input
                        id="est-nombre"
                        type="text"
                        required
                        value={data.nombre_comercio}
                        onChange={(e) => {
                            setData('nombre_comercio', e.target.value);
                            limpiarErrorDe('nombre_comercio');
                        }}
                        placeholder="Ej: Bodega Don Pepe"
                        aria-invalid={Boolean(errorNombre)}
                        aria-describedby={errorNombre ? 'error-nombre' : undefined}
                        className={`h-12 w-full rounded-2xl bg-slate-50 px-3.5 text-base font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 sm:h-11 sm:text-sm ${
                            errorNombre ? 'border-danger-400 bg-danger-50/20 border' : 'border border-slate-300'
                        }`}
                    />
                    {errorNombre && (
                        <span id="error-nombre" className="text-danger-600 mt-1 block text-xs">
                            {errorNombre}
                        </span>
                    )}
                </div>

                <div id="campo-ruc">
                    <label htmlFor="est-ruc" className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                        RUC del Titular <span className="font-semibold tracking-normal text-slate-400 normal-case">(opcional)</span>
                    </label>
                    <input
                        id="est-ruc"
                        type="text"
                        maxLength={11}
                        value={data.ruc}
                        onChange={(e) => {
                            setData('ruc', e.target.value.replace(/\D/g, ''));
                            limpiarErrorDe('ruc');
                        }}
                        placeholder="Ej: 20601234567"
                        aria-invalid={Boolean(errorRuc)}
                        aria-describedby={errorRuc ? 'error-ruc' : 'ayuda-ruc'}
                        className={`h-12 w-full rounded-2xl bg-slate-50 px-3.5 font-mono text-base font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 sm:h-11 sm:text-sm ${
                            errorRuc ? 'border-danger-400 bg-danger-50/20 border' : 'border border-slate-300'
                        }`}
                    />
                    <span id="ayuda-ruc" className="mt-1 block text-xs text-slate-500">
                        Opcional. Si no cuentas con RUC, puedes continuar tu autoevaluación libremente.
                    </span>
                    {errorRuc && (
                        <span id="error-ruc" className="text-danger-600 mt-1 block text-xs">
                            {errorRuc}
                        </span>
                    )}
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="est-funcion" className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                        Función Económica (R.J. 016-2018-CENEPRED){' '}
                        <span className="text-danger-500" aria-hidden="true">
                            *
                        </span>
                    </label>
                    <select
                        id="est-funcion"
                        required
                        value={data.funcion_economica}
                        onChange={(e) => setData('funcion_economica', e.target.value)}
                        className="h-12 w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50 px-3.5 text-base font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 sm:h-11 sm:text-sm"
                    >
                        {FUNCIONES_ECONOMICAS.map((funcion) => (
                            <option key={funcion.valor} value={funcion.valor}>
                                {funcion.etiqueta} ({funcion.ejemplos})
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}

interface SeccionEscalaFisicaProps {
    data: FormEvaluacionData;
    setData: ActualizarCampoFormulario;
    erroresFormulario: Record<string, string>;
    errors: Partial<Record<string, string>>;
    limpiarErrorDe: (campo: string) => void;
}

function SeccionEscalaFisica({ data, setData, erroresFormulario, errors, limpiarErrorDe }: Readonly<SeccionEscalaFisicaProps>) {
    const errorArea = obtenerErrorCampo('area_m2', erroresFormulario, errors);
    const errorPisos = obtenerErrorCampo('pisos', erroresFormulario, errors);
    const errorAforo = obtenerErrorCampo('aforo', erroresFormulario, errors);

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-xs">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Layers className="h-4 w-4 text-emerald-600" /> Escala Física y Capacidad (RNE G.040)
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div id="campo-area_m2">
                    <label htmlFor="est-area" className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                        Área Techada (m²) <span className="font-semibold tracking-normal text-slate-400 normal-case">(opcional)</span>
                    </label>
                    <input
                        id="est-area"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={data.area_m2}
                        onChange={(e) => {
                            setData('area_m2', e.target.value);
                            limpiarErrorDe('area_m2');
                        }}
                        placeholder="Ej: 60"
                        aria-invalid={Boolean(errorArea)}
                        aria-describedby={errorArea ? 'error-area' : undefined}
                        className={`h-12 w-full rounded-2xl bg-slate-50 px-3.5 text-base font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 sm:h-11 sm:text-sm ${
                            errorArea ? 'border-danger-400 bg-danger-50/20 border' : 'border border-slate-300'
                        }`}
                    />
                    <span className="mt-1 block text-xs text-slate-500">Si no lo sabes exacto, pon un aproximado.</span>
                    {errorArea && (
                        <span id="error-area" className="text-danger-600 mt-1 block text-xs">
                            {errorArea}
                        </span>
                    )}
                </div>

                <div id="campo-pisos">
                    <label htmlFor="est-pisos" className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                        Número de Pisos <span className="font-semibold tracking-normal text-slate-400 normal-case">(opcional)</span>
                    </label>
                    <input
                        id="est-pisos"
                        type="number"
                        min="1"
                        max="50"
                        value={data.pisos}
                        onChange={(e) => {
                            setData('pisos', parsearEnteroOpcional(e.target.value));
                            limpiarErrorDe('pisos');
                        }}
                        placeholder="Ej: 1"
                        aria-invalid={Boolean(errorPisos)}
                        aria-describedby={errorPisos ? 'error-pisos' : undefined}
                        className={`h-12 w-full rounded-2xl bg-slate-50 px-3.5 text-base font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 sm:h-11 sm:text-sm ${
                            errorPisos ? 'border-danger-400 bg-danger-50/20 border' : 'border border-slate-300'
                        }`}
                    />
                    <span className="mt-1 block text-xs text-slate-500">Cuenta el sótano como un piso.</span>
                    {errorPisos && (
                        <span id="error-pisos" className="text-danger-600 mt-1 block text-xs">
                            {errorPisos}
                        </span>
                    )}
                </div>

                <div id="campo-aforo">
                    <label htmlFor="est-aforo" className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                        Aforo Estimado <span className="font-semibold tracking-normal text-slate-400 normal-case">(opcional)</span>
                    </label>
                    <input
                        id="est-aforo"
                        type="number"
                        min="1"
                        value={data.aforo}
                        onChange={(e) => {
                            setData('aforo', parsearEnteroOpcional(e.target.value));
                            limpiarErrorDe('aforo');
                        }}
                        placeholder="Ej: 15"
                        aria-invalid={Boolean(errorAforo)}
                        aria-describedby={errorAforo ? 'error-aforo' : undefined}
                        className={`h-12 w-full rounded-2xl bg-slate-50 px-3.5 text-base font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 sm:h-11 sm:text-sm ${
                            errorAforo ? 'border-danger-400 bg-danger-50/20 border' : 'border border-slate-300'
                        }`}
                    />
                    <span className="mt-1 block text-xs text-slate-500">Personas al mismo tiempo, contando clientes y personal.</span>
                    {errorAforo && (
                        <span id="error-aforo" className="text-danger-600 mt-1 block text-xs">
                            {errorAforo}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

interface TarjetaCondicionGlpProps {
    data: FormEvaluacionData;
    setData: ActualizarCampoFormulario;
    errorGlp?: string;
    limpiarErrorDe: (campo: string) => void;
}

function TarjetaCondicionGlp({ data, setData, errorGlp, limpiarErrorDe }: Readonly<TarjetaCondicionGlpProps>) {
    return (
        <div
            id="campo-usa_glp"
            className={`rounded-2xl p-4 transition ${errorGlp ? 'bg-danger-50/40 border-danger-300 border' : 'border border-slate-100 bg-slate-50'}`}
        >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <span id="label-usa_glp" className="block text-xs font-bold text-slate-800">
                        ¿Usa Gas Licuado de Petróleo (GLP)? <span className="text-danger-500">*</span>
                    </span>
                    <span id="desc-usa_glp" className="text-xs text-slate-500">
                        Balones o tanques de GLP para cocción o proceso comercial (determina aplicabilidad de CRIT-10).
                    </span>
                </div>
                <SelectorSiNo
                    etiquetaId="label-usa_glp"
                    descripcionId="desc-usa_glp"
                    valor={data.usa_glp}
                    onSeleccion={(valor) => {
                        setData('usa_glp', valor);
                        if (!valor) {
                            setData('galones_glp', '');
                        }
                        limpiarErrorDe('usa_glp');
                    }}
                />
            </div>

            {errorGlp && <span className="text-danger-600 mt-2 block text-xs font-medium">{errorGlp}</span>}

            {data.usa_glp === true && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                    <label htmlFor="est-galones" className="mb-1 block text-xs font-bold text-amber-900 uppercase">
                        Cantidad Total Estimada de GLP (Galones){' '}
                        <span className="font-semibold tracking-normal text-amber-700 normal-case">(opcional)</span>
                    </label>
                    <input
                        id="est-galones"
                        type="number"
                        min="0"
                        step="0.5"
                        value={data.galones_glp}
                        onChange={(e) => setData('galones_glp', e.target.value === '' ? '' : Number.parseFloat(e.target.value))}
                        placeholder="Ej: 10"
                        className="h-11 w-full rounded-xl border border-amber-300 bg-white px-3 text-sm font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 sm:w-48"
                    />
                    <span className="mt-1 block text-xs text-amber-800">
                        Indica la cantidad estimada en galones si cuentas con dicha información.
                    </span>
                </div>
            )}
        </div>
    );
}

interface SeccionInstalacionesCondicionesProps {
    data: FormEvaluacionData;
    setData: ActualizarCampoFormulario;
    erroresFormulario: Record<string, string>;
    limpiarErrorDe: (campo: string) => void;
}

function SeccionInstalacionesCondiciones({ data, setData, erroresFormulario, limpiarErrorDe }: Readonly<SeccionInstalacionesCondicionesProps>) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-xs">
            <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Flame className="h-4 w-4 text-emerald-600" /> Instalaciones y Condiciones Físicas del Establecimiento
                    </h3>
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Responde Sí o No en cada condición
                    </span>
                </div>
                <p className="mt-1 mb-4 text-xs leading-relaxed text-slate-500">
                    Declara con precisión las características de tu local. El motor de aplicabilidad las utilizará para determinar qué criterios
                    normativos aplican y cuáles se excluyen de tu evaluación.
                </p>
            </div>

            <div className="space-y-4">
                {/* 1. GLP (CRIT-10) */}
                <TarjetaCondicionGlp data={data} setData={setData} errorGlp={erroresFormulario.usa_glp} limpiarErrorDe={limpiarErrorDe} />

                {/* 2. Equipos de fritura / cocción con aceites (CRIT-02A) */}
                <div
                    id="campo-tiene_equipos_fritura"
                    className={`rounded-2xl p-4 transition ${
                        erroresFormulario.tiene_equipos_fritura ? 'bg-danger-50/40 border-danger-300 border' : 'border border-slate-100 bg-slate-50'
                    }`}
                >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-2.5">
                            <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <div>
                                <span id="label-tiene_equipos_fritura" className="block text-xs font-bold text-slate-800">
                                    ¿Cuenta con freidoras o cocción con aceites y grasas? <span className="text-danger-500">*</span>
                                </span>
                                <span id="desc-tiene_equipos_fritura" className="text-xs text-slate-500">
                                    Determina la exigencia de extintor especializado Clase K (CRIT-02A).
                                </span>
                            </div>
                        </div>
                        <SelectorSiNo
                            etiquetaId="label-tiene_equipos_fritura"
                            descripcionId="desc-tiene_equipos_fritura"
                            valor={data.tiene_equipos_fritura}
                            onSeleccion={(valor) => {
                                setData('tiene_equipos_fritura', valor);
                                limpiarErrorDe('tiene_equipos_fritura');
                            }}
                        />
                    </div>

                    {erroresFormulario.tiene_equipos_fritura && (
                        <span className="text-danger-600 mt-2 block text-xs font-medium">{erroresFormulario.tiene_equipos_fritura}</span>
                    )}
                </div>

                {/* 3. Escaleras de circulación (CRIT-11) */}
                <div
                    id="campo-tiene_escaleras"
                    className={`rounded-2xl p-4 transition ${
                        erroresFormulario.tiene_escaleras ? 'bg-danger-50/40 border-danger-300 border' : 'border border-slate-100 bg-slate-50'
                    }`}
                >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-2.5">
                            <Footprints className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <div>
                                <span id="label-tiene_escaleras" className="block text-xs font-bold text-slate-800">
                                    ¿El local cuenta con escaleras de circulación? <span className="text-danger-500">*</span>
                                </span>
                                <span id="desc-tiene_escaleras" className="text-xs text-slate-500">
                                    Determina la exigencia de pasamanos y peldaños antideslizantes (CRIT-11).
                                </span>
                            </div>
                        </div>
                        <SelectorSiNo
                            etiquetaId="label-tiene_escaleras"
                            descripcionId="desc-tiene_escaleras"
                            valor={data.tiene_escaleras}
                            onSeleccion={(valor) => {
                                setData('tiene_escaleras', valor);
                                limpiarErrorDe('tiene_escaleras');
                            }}
                        />
                    </div>

                    {erroresFormulario.tiene_escaleras && (
                        <span className="text-danger-600 mt-2 block text-xs font-medium">{erroresFormulario.tiene_escaleras}</span>
                    )}
                </div>

                {/* 4. Estanterías altas o mobiliario alto (CRIT-13) */}
                <div
                    id="campo-tiene_estanterias_altas"
                    className={`rounded-2xl p-4 transition ${
                        erroresFormulario.tiene_estanterias_altas ? 'bg-danger-50/40 border-danger-300 border' : 'border border-slate-100 bg-slate-50'
                    }`}
                >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-2.5">
                            <Package className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <div>
                                <span id="label-tiene_estanterias_altas" className="block text-xs font-bold text-slate-800">
                                    ¿Cuenta con estanterías altas o mobiliario con riesgo de volteo? <span className="text-danger-500">*</span>
                                </span>
                                <span id="desc-tiene_estanterias_altas" className="text-xs text-slate-500">
                                    Determina la exigencia de arriostramiento antisísmico a pared o piso (CRIT-13).
                                </span>
                            </div>
                        </div>
                        <SelectorSiNo
                            etiquetaId="label-tiene_estanterias_altas"
                            descripcionId="desc-tiene_estanterias_altas"
                            valor={data.tiene_estanterias_altas}
                            onSeleccion={(valor) => {
                                setData('tiene_estanterias_altas', valor);
                                limpiarErrorDe('tiene_estanterias_altas');
                            }}
                        />
                    </div>

                    {erroresFormulario.tiene_estanterias_altas && (
                        <span className="text-danger-600 mt-2 block text-xs font-medium">{erroresFormulario.tiene_estanterias_altas}</span>
                    )}
                </div>

                {/* Condiciones adicionales y factores de triaje (D.S. N° 002-2018-PCM).
                    Plegadas: la mayoría de locales pequeños no las tiene. */}
                <details
                    className="group rounded-2xl border border-slate-200 bg-white"
                    open={Boolean(data.usa_caldero || data.usa_liquidos_inflamables || data.en_sotano || data.galeria_sin_itse)}
                >
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
                        <span>
                            Condiciones especiales <span className="font-normal text-slate-500">(caldero, inflamables, sótano o galería)</span>
                        </span>
                        <span aria-hidden="true" className="text-slate-400 transition group-open:rotate-180">
                            ▾
                        </span>
                    </summary>
                    <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-4 sm:grid-cols-2">
                        {/* Caldero */}
                        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                            <div>
                                <span id="label-usa_caldero" className="block text-xs font-bold text-slate-800">
                                    ¿Cuenta con caldero?
                                </span>
                                <span id="desc-usa_caldero" className="text-xs text-slate-500">
                                    Calderas industriales o de vapor (Riesgo Alto obligatorio).
                                </span>
                            </div>
                            <SelectorSiNo
                                etiquetaId="label-usa_caldero"
                                descripcionId="desc-usa_caldero"
                                valor={data.usa_caldero}
                                onSeleccion={(valor) => setData('usa_caldero', valor)}
                            />
                        </div>

                        {/* Líquidos Inflamables */}
                        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                            <div>
                                <span id="label-usa_liquidos_inflamables" className="block text-xs font-bold text-slate-800">
                                    ¿Almacena combustibles o líquidos inflamables?
                                </span>
                                <span id="desc-usa_liquidos_inflamables" className="text-xs text-slate-500">
                                    Combustibles &gt; 1 m³ (264 gal) o solventes/pinturas.
                                </span>
                            </div>
                            <SelectorSiNo
                                etiquetaId="label-usa_liquidos_inflamables"
                                descripcionId="desc-usa_liquidos_inflamables"
                                valor={data.usa_liquidos_inflamables}
                                onSeleccion={(valor) => {
                                    setData('usa_liquidos_inflamables', valor);
                                    if (!valor) setData('combustibles_liquidos_m3', '');
                                }}
                            />
                        </div>

                        {/* Actividades en Sótano o Semisótano */}
                        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                            <div>
                                <span id="label-en_sotano" className="block text-xs font-bold text-slate-800">
                                    ¿Actividad o reunión en sótano/semisótano?
                                </span>
                                <span id="desc-en_sotano" className="text-xs text-slate-500">
                                    Reuniones o atención al público bajo el nivel de la calle.
                                </span>
                            </div>
                            <SelectorSiNo
                                etiquetaId="label-en_sotano"
                                descripcionId="desc-en_sotano"
                                valor={data.en_sotano}
                                onSeleccion={(valor) => setData('en_sotano', valor)}
                            />
                        </div>

                        {/* Galería Comercial sin ITSE Matriz */}
                        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                            <div>
                                <span id="label-galeria_sin_itse" className="block text-xs font-bold text-slate-800">
                                    ¿Galería comercial sin ITSE en áreas comunes?
                                </span>
                                <span id="desc-galeria_sin_itse" className="text-xs text-slate-500">
                                    Si las áreas comunes no tienen ITSE, puede subir el nivel de riesgo de tu local.
                                </span>
                            </div>
                            <SelectorSiNo
                                etiquetaId="label-galeria_sin_itse"
                                descripcionId="desc-galeria_sin_itse"
                                valor={data.galeria_sin_itse}
                                onSeleccion={(valor) => setData('galeria_sin_itse', valor)}
                            />
                        </div>
                    </div>
                </details>
            </div>
        </div>
    );
}

const GRUPOS = [
    { boton: 'Tu local', titulo: 'Tu local', ayuda: 'Solo el nombre y el tipo de negocio son obligatorios.' },
    {
        boton: 'Características',
        titulo: 'Características del establecimiento',
        ayuda: 'Responde con lo que ves hoy en tu local. Si no sabes algo, elige “Aún no lo sé”.',
    },
    { boton: 'Revisar datos', titulo: 'Revisa antes de continuar', ayuda: 'Puedes volver a cualquier paso para corregir.' },
] as const;

const claseCampoOpcional =
    'h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3.5 text-base font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 sm:h-11 sm:text-sm';

export default function Nueva({ reevaluacionDe = null }: Readonly<NuevaProps>) {
    const [grupo, setGrupo] = useState(0);
    const [showGuia, setShowGuia] = useState<boolean>(false);
    const [erroresFormulario, setErroresFormulario] = useState<Record<string, string>>({});
    const primerRender = useRef(true);

    const { data, setData, post, processing, errors } = useForm<FormEvaluacionData>(construirValoresIniciales(reevaluacionDe));

    useEffect(() => {
        // Al cambiar de grupo se mueve el foco al título para lectores de pantalla,
        // pero no en la carga inicial: ahí el foco debe quedar en el inicio de la página.
        if (primerRender.current) {
            primerRender.current = false;
            return;
        }
        document.getElementById('grupo-datos')?.focus();
    }, [grupo]);

    const precalificacion = precalificarLocalmente(data);
    const declaracionesPendientes = CAMPOS_DECLARACION.filter((campo) => data[campo] == null).length;

    const limpiarErrorDe = (campo: string) => {
        if (!erroresFormulario[campo]) return;
        setErroresFormulario((prev) => {
            const rest = { ...prev };
            delete rest[campo];
            return rest;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validarFormularioNueva(data);
        setErroresFormulario(errs);

        if (Object.keys(errs).length > 0) {
            const campo = Object.keys(errs)[0];
            setGrupo(['nombre_comercio', 'ruc'].includes(campo) ? 0 : 1);
            setTimeout(() => enfocarPrimerError(errs), 0);
            return;
        }

        if (grupo < 2) {
            setGrupo(grupo + 1);
            return;
        }
        if (reevaluacionDe?.uuid) {
            post(`/autoevaluacion/reevaluar/${reevaluacionDe.uuid}`, { onError: () => setGrupo(0) });
        } else {
            post('/autoevaluacion', { onError: () => setGrupo(0) });
        }
    };

    const resumenDatos: Array<[string, string | number]> = [
        ['Local', data.nombre_comercio || 'Sin nombre'],
        ['Actividad', FUNCIONES_ECONOMICAS.find((f) => f.valor === data.funcion_economica)?.etiqueta ?? data.funcion_economica],
        ['Área', data.area_m2 ? data.area_m2 + ' m²' : 'No declarada'],
        ['Pisos', data.pisos || 'No declarado'],
        ['Aforo', data.aforo || 'No declarado'],
        ...CAMPOS_DECLARACION.map((campo): [string, string] => [
            {
                usa_glp: 'Uso de GLP',
                tiene_equipos_fritura: 'Equipos de fritura',
                tiene_escaleras: 'Escaleras',
                tiene_estanterias_altas: 'Estanterías altas',
            }[campo],
            data[campo] == null ? 'Aún no lo sé' : data[campo] ? 'Sí' : 'No',
        ]),
    ];

    return (
        <>
            <Head title="CheckITSE Huancayo - Datos del Establecimiento" />
            <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />

            <div className="mx-auto max-w-3xl pb-16 text-left">
                <FlujoCiudadano actual={1} />

                <div className="mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Cuéntanos sobre tu local</h1>
                    <p className="mt-2 text-base leading-relaxed text-slate-600">
                        Con estos datos elegimos solo las preguntas que aplican a tu negocio.{' '}
                        <button
                            type="button"
                            onClick={() => setShowGuia(true)}
                            className="text-primary-700 inline-flex cursor-pointer items-center gap-1 font-semibold underline underline-offset-2"
                        >
                            <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
                            Base legal
                        </button>
                    </p>
                    <AvisoPreventivo />
                </div>

                {reevaluacionDe && <BannerReevaluacionPreventiva reevaluacionDe={reevaluacionDe} />}

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <nav aria-label="Grupos de datos">
                        <ol className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200/60 p-1">
                            {GRUPOS.map((g, index) => (
                                <li key={g.boton}>
                                    <button
                                        type="button"
                                        disabled={processing}
                                        aria-current={grupo === index ? 'step' : undefined}
                                        onClick={() => setGrupo(index)}
                                        className={`min-h-11 w-full cursor-pointer rounded-xl px-2 py-2.5 text-sm font-semibold transition ${
                                            grupo === index ? 'text-primary-800 bg-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {index + 1}. {g.boton}
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </nav>

                    <div>
                        <h2 id="grupo-datos" tabIndex={-1} className="text-xl font-bold text-slate-900 focus:outline-none">
                            {GRUPOS[grupo].titulo}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">{GRUPOS[grupo].ayuda}</p>
                    </div>

                    {Object.keys(errors).length > 0 && (
                        <div className="bg-danger-50 border-danger-300 text-danger-950 rounded-2xl border p-4 text-left text-sm" role="alert">
                            <div className="mb-1 flex items-center gap-2 font-bold">
                                <AlertCircle className="text-danger-600 h-4 w-4" />
                                <span>Por favor corrige los siguientes datos:</span>
                            </div>
                            <ul className="text-danger-800 list-inside list-disc space-y-0.5 text-xs">
                                {Object.entries(errors).map(([campo, err]) => (
                                    <li key={campo}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Grupo 1: identificación y ubicación opcional */}
                    <div hidden={grupo !== 0} className="space-y-4">
                        <SeccionIdentificacionGiro
                            data={data}
                            setData={setData}
                            erroresFormulario={erroresFormulario}
                            errors={errors}
                            limpiarErrorDe={limpiarErrorDe}
                        />
                        <details className="group rounded-3xl border border-slate-200 bg-white" open={Boolean(data.direccion || data.referencia)}>
                            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-sm font-semibold text-slate-800">
                                <span className="flex items-center gap-2">
                                    <MapPin aria-hidden="true" className="h-4 w-4 text-emerald-600" />
                                    Agregar dirección <span className="font-normal text-slate-500">(opcional)</span>
                                </span>
                                <span aria-hidden="true" className="text-slate-400 transition group-open:rotate-180">
                                    ▾
                                </span>
                            </summary>
                            <div className="grid gap-4 border-t border-slate-100 p-6 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="est-direccion" className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                                        Dirección
                                    </label>
                                    <input
                                        id="est-direccion"
                                        type="text"
                                        maxLength={255}
                                        value={data.direccion}
                                        onChange={(e) => setData('direccion', e.target.value)}
                                        placeholder="Ej: Jr. Ancash 345, Huancayo"
                                        className={claseCampoOpcional}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="est-referencia" className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                                        Referencia
                                    </label>
                                    <input
                                        id="est-referencia"
                                        type="text"
                                        maxLength={255}
                                        value={data.referencia}
                                        onChange={(e) => setData('referencia', e.target.value)}
                                        placeholder="Ej: frente al parque Huamanmarca"
                                        className={claseCampoOpcional}
                                    />
                                </div>
                            </div>
                        </details>
                    </div>

                    {/* Grupo 2: escala física e instalaciones */}
                    <div hidden={grupo !== 1} className="space-y-4">
                        <SeccionEscalaFisica
                            data={data}
                            setData={setData}
                            erroresFormulario={erroresFormulario}
                            errors={errors}
                            limpiarErrorDe={limpiarErrorDe}
                        />
                        <SeccionInstalacionesCondiciones
                            data={data}
                            setData={setData}
                            erroresFormulario={erroresFormulario}
                            limpiarErrorDe={limpiarErrorDe}
                        />
                    </div>

                    {/* Grupo 3: revisión y orientación */}
                    <div hidden={grupo !== 2} className="space-y-4">
                        <section className="rounded-3xl border border-slate-200 bg-white p-6">
                            <h3 className="text-lg font-bold text-slate-900">Lo que vas a declarar</h3>
                            <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                                {resumenDatos.map(([label, value]) => (
                                    <div key={label} className="border-b border-slate-100 pb-3">
                                        <dt className="text-xs font-semibold text-slate-500 uppercase">{label}</dt>
                                        <dd className="mt-1 text-base font-semibold break-words text-slate-900">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                        <PanelPrecalificacionOrientativa
                            precalificacion={precalificacion}
                            data={data}
                            declaracionesPendientes={declaracionesPendientes}
                        />
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        {grupo > 0 ? (
                            <button
                                type="button"
                                disabled={processing}
                                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                onClick={() => setGrupo(grupo - 1)}
                            >
                                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                Volver al grupo anterior
                            </button>
                        ) : (
                            <Link
                                href="/"
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            >
                                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                Volver a la portada
                            </Link>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-primary hover:bg-primary-700 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl px-8 text-sm font-bold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-95 disabled:opacity-60 sm:w-auto"
                        >
                            <span>
                                {processing ? 'Iniciando autoevaluación...' : grupo < 2 ? 'Continuar' : 'Guardar datos y revisar condiciones'}
                            </span>
                            <ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
