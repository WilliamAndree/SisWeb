import { AvisoPreventivo, FlujoCiudadano } from '@/components/Evaluacion/FlujoCiudadano';
import { GuiaModal } from '@/components/GuiaModal';
import { claseCampo } from '@/components/form/Pregunta';
import {
    FUNCIONES_ECONOMICAS,
    TEXTO_MODALIDAD,
    clasificarItse,
    leerNumero,
    type ClasificacionItse,
    type ModalidadItse,
} from '@/lib/clasificacion-itse';
import { FOTOS_POR_RUBRO, type RubroNegocio } from '@/lib/imagen-negocio';
import { visualDeItem } from '@/lib/item-visual';
import type { FormDataConvertible } from '@inertiajs/core';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, RefreshCw, Search } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

type ValorNumericoFlexible = string | number | null;

export interface ReevaluacionData {
    uuid: string;
    nombre_comercio: string;
    funcion_economica: string;
    ruc?: string | null;
    distrito?: string | null;
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
    distrito: string;
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

/** Lo que se revisa en todo local (con la foto de ejemplo del checklist). */
const REVISION_BASE = ['CRIT-01', 'CRIT-02B', 'CRIT-08', 'CRIT-06', 'CRIT-09'] as const;

/** Lo que se suma según lo que el emprendedor declara de su local. */
const REVISION_POR_DECLARACION: ReadonlyArray<{ codigo: string; campo: CampoSiNo }> = [
    { codigo: 'CRIT-02A', campo: 'tiene_equipos_fritura' },
    { codigo: 'CRIT-10', campo: 'usa_glp' },
    { codigo: 'CRIT-11', campo: 'tiene_escaleras' },
    { codigo: 'CRIT-13', campo: 'tiene_estanterias_altas' },
    { codigo: 'CRIT-17', campo: 'usa_caldero' },
];

const CAMPOS_DECLARACION = ['usa_glp', 'tiene_equipos_fritura', 'tiene_escaleras', 'tiene_estanterias_altas'] as const;

type CampoSiNo =
    | 'usa_glp'
    | 'tiene_equipos_fritura'
    | 'tiene_escaleras'
    | 'tiene_estanterias_altas'
    | 'usa_caldero'
    | 'usa_liquidos_inflamables'
    | 'en_sotano'
    | 'galeria_sin_itse';

/** Preguntas Sí/No que dependen del tipo de negocio (sótano y galería se preguntan a todos, aparte). */
const CAMPOS_POR_RUBRO: readonly CampoSiNo[] = [
    'usa_glp',
    'tiene_equipos_fritura',
    'usa_caldero',
    'usa_liquidos_inflamables',
    'tiene_estanterias_altas',
    'tiene_escaleras',
];

export type RubroId =
    | 'bodega'
    | 'perfumeria'
    | 'farmacia'
    | 'restaurante'
    | 'salon'
    | 'ropa'
    | 'ferreteria'
    | 'consultorio'
    | 'academia'
    | 'oficina'
    | 'hospedaje'
    | 'otro';

interface RubroNegocioOpcion {
    id: RubroId;
    nombre: string;
    ejemplos: string;
    /** Función económica que usa el motor normativo (FUNCIONES_ECONOMICAS). */
    funcion: string;
    foto: RubroNegocio;
    /** Solo estas preguntas se muestran; las demás quedan en «No» y se pueden corregir. */
    preguntas: readonly CampoSiNo[];
}

/**
 * Tipos de negocio que reconoce un emprendedor. Cada uno se traduce a la función económica
 * del D.S. 002-2018-PCM y decide qué preguntas tienen sentido: a una perfumería no se le
 * pregunta si fríe con aceite, pero sí si guarda productos inflamables (perfumes con alcohol).
 */
export const RUBROS: readonly RubroNegocioOpcion[] = [
    {
        id: 'bodega',
        nombre: 'Bodega o minimarket',
        ejemplos: 'Abarrotes, bazar',
        funcion: 'Comercio',
        foto: 'bodega',
        preguntas: ['tiene_estanterias_altas', 'usa_glp', 'tiene_escaleras'],
    },
    {
        id: 'perfumeria',
        nombre: 'Perfumería o cosméticos',
        ejemplos: 'Perfumes, maquillaje',
        funcion: 'Comercio',
        foto: 'perfumeria',
        preguntas: ['usa_liquidos_inflamables', 'tiene_estanterias_altas', 'tiene_escaleras'],
    },
    {
        id: 'farmacia',
        nombre: 'Farmacia o botica',
        ejemplos: 'Medicamentos',
        funcion: 'Comercio',
        foto: 'farmacia',
        preguntas: ['usa_liquidos_inflamables', 'tiene_estanterias_altas', 'tiene_escaleras'],
    },
    {
        id: 'restaurante',
        nombre: 'Restaurante o cafetería',
        ejemplos: 'Comida, pollería, café',
        funcion: 'Encuentro',
        foto: 'restaurante',
        preguntas: ['usa_glp', 'tiene_equipos_fritura', 'usa_caldero', 'tiene_escaleras'],
    },
    {
        id: 'salon',
        nombre: 'Salón de belleza o barbería',
        ejemplos: 'Peluquería, uñas',
        funcion: 'Comercio',
        foto: 'salon',
        preguntas: ['usa_liquidos_inflamables', 'tiene_escaleras'],
    },
    {
        id: 'ropa',
        nombre: 'Tienda de ropa o calzado',
        ejemplos: 'Boutique, zapatería',
        funcion: 'Comercio',
        foto: 'ropa',
        preguntas: ['tiene_estanterias_altas', 'tiene_escaleras'],
    },
    {
        id: 'ferreteria',
        nombre: 'Ferretería',
        ejemplos: 'Herramientas, pinturas',
        funcion: 'Comercio',
        foto: 'taller',
        preguntas: ['usa_liquidos_inflamables', 'tiene_estanterias_altas', 'usa_glp', 'tiene_escaleras'],
    },
    {
        id: 'consultorio',
        nombre: 'Consultorio de salud',
        ejemplos: 'Dental, médico, laboratorio',
        funcion: 'Salud',
        foto: 'farmacia',
        preguntas: ['tiene_escaleras'],
    },
    {
        id: 'academia',
        nombre: 'Academia o nido',
        ejemplos: 'Clases, talleres',
        funcion: 'Educacion',
        foto: 'oficina',
        preguntas: ['tiene_escaleras'],
    },
    {
        id: 'oficina',
        nombre: 'Oficina',
        ejemplos: 'Estudio, consultora',
        funcion: 'Oficinas',
        foto: 'oficina',
        preguntas: ['tiene_estanterias_altas', 'tiene_escaleras'],
    },
    {
        id: 'hospedaje',
        nombre: 'Hospedaje',
        ejemplos: 'Hostal, hotel',
        funcion: 'Hospedaje',
        foto: 'general',
        preguntas: ['usa_glp', 'usa_caldero', 'tiene_escaleras'],
    },
    { id: 'otro', nombre: 'Otro tipo', ejemplos: 'Te preguntamos todo', funcion: 'Comercio', foto: 'general', preguntas: CAMPOS_POR_RUBRO },
];

const PREGUNTAS_SI_NO: Record<CampoSiNo, { texto: string; ayuda: string }> = {
    usa_glp: { texto: '¿Usas gas (balones de GLP)?', ayuda: 'Para cocinar, calentar agua o para algún equipo del negocio.' },
    tiene_equipos_fritura: {
        texto: '¿Fríes o cocinas con aceite?',
        ayuda: 'Freidoras, cocina con mucho aceite o grasa. Si respondes Sí, te pedirán un extintor Clase K.',
    },
    usa_caldero: { texto: '¿Usas caldero?', ayuda: 'Calderas a vapor o industriales. Si respondes Sí, la inspección será antes de la licencia.' },
    usa_liquidos_inflamables: {
        texto: '¿Guardas productos que arden?',
        ayuda: 'Perfumes y alcohol, acetona, tintes, pinturas, thinner, gasolina u otros líquidos inflamables.',
    },
    tiene_estanterias_altas: {
        texto: '¿Tienes estantes o muebles altos que podrían caerse?',
        ayuda: 'Por ejemplo, anaqueles de más de 1,8 m. Deben estar fijados a la pared o al piso.',
    },
    tiene_escaleras: { texto: '¿Tu local tiene escaleras?', ayuda: 'Escaleras que usan clientes o trabajadores. Deben tener pasamanos.' },
    en_sotano: { texto: '¿Atiendes al público en un sótano?', ayuda: 'Reuniones o atención bajo el nivel de la calle.' },
    galeria_sin_itse: {
        texto: '¿Tu local está en una galería sin certificado ITSE?',
        ayuda: 'Si las áreas comunes de la galería no tienen ITSE, puede subir el nivel de riesgo de tu local.',
    },
};

const DISTRITOS = ['Huancayo', 'El Tambo', 'Chilca', 'Otro distrito de Junín'] as const;

function rubroInicial(reevaluacionDe: ReevaluacionData | null): RubroId | '' {
    // En una reevaluación no se conoce el tipo exacto: se pregunta todo.
    return reevaluacionDe ? 'otro' : '';
}

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
 * Respuesta Sí / No / Aún no lo sé con botones grandes (48 px), en la misma
 * fila en pantallas medianas y apilados en celular. Es presentacional: la
 * escritura en `useForm()` ocurre en el manejador que lo acompaña.
 */
function SelectorSiNo({ etiquetaId, descripcionId, valor, onSeleccion }: Readonly<SelectorSiNoProps>) {
    const opciones: Array<{ texto: string; valor: boolean | null }> = [
        { texto: 'No', valor: false },
        { texto: 'Sí', valor: true },
        { texto: 'Aún no lo sé', valor: null },
    ];

    return (
        <fieldset aria-labelledby={etiquetaId} aria-describedby={descripcionId} className="m-0 mt-3 grid grid-cols-3 gap-2 sm:max-w-md">
            <legend className="sr-only">Selecciona una respuesta</legend>
            {opciones.map(({ texto, valor: opcion }) => {
                const activo = (valor ?? null) === opcion;
                return (
                    <button
                        key={texto}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => onSeleccion(opcion)}
                        className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 px-2 text-base font-semibold transition focus-visible:ring-4 focus-visible:ring-emerald-100 focus-visible:outline-none ${
                            activo
                                ? 'border-primary-700 bg-primary-50 text-primary-900'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                        }`}
                    >
                        {activo && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                        {texto}
                    </button>
                );
            })}
        </fieldset>
    );
}

function construirValoresIniciales(reevaluacionDe: ReevaluacionData | null): FormEvaluacionData {
    return {
        evaluacion_origen_uuid: reevaluacionDe?.uuid ?? '',
        nombre_comercio: reevaluacionDe?.nombre_comercio ?? '',
        funcion_economica: reevaluacionDe?.funcion_economica ?? 'Comercio',
        ruc: reevaluacionDe?.ruc ?? '',
        distrito: reevaluacionDe?.distrito ?? '',
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

interface PanelLoQueRevisaremosProps {
    data: FormEvaluacionData;
    nombreRubro?: string;
}

/**
 * Vista previa de la revisión: con fotos, lo que se le va a preguntar al
 * emprendedor según lo que declaró (sin códigos ni normas a la vista).
 */
function PanelLoQueRevisaremos({ data, nombreRubro }: Readonly<PanelLoQueRevisaremosProps>) {
    const codigos = [...REVISION_BASE, ...REVISION_POR_DECLARACION.filter(({ campo }) => data[campo] === true).map(({ codigo }) => codigo)];
    const items = codigos.map((codigo) => ({ codigo, ...visualDeItem(codigo) }));

    return (
        <section aria-labelledby="revision-titulo" className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xs">
            <div className="bg-ink-900 trama-andina flex items-center gap-3 px-5 py-4 text-white sm:px-6">
                <span className="bg-primary flex size-10 shrink-0 items-center justify-center rounded-2xl">
                    <Search aria-hidden="true" className="size-5" />
                </span>
                <div>
                    <h3 id="revision-titulo" className="text-lg font-bold">
                        Esto vamos a revisar en tu {nombreRubro ? nombreRubro.toLowerCase() : 'local'}
                    </h3>
                    <p className="text-base text-slate-300">{items.length} cosas, con una foto de ejemplo cada una. Te toma unos 3 minutos.</p>
                </div>
            </div>
            <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
                {items.map((item) => (
                    <li key={item.codigo} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {item.imagen && <img src={item.imagen} alt="" loading="lazy" className="h-24 w-full object-cover sm:h-28" />}
                        <p className="p-2.5 text-sm leading-snug font-semibold text-slate-800">{item.nombreCorto}</p>
                    </li>
                ))}
            </ul>
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
            className="mb-6 flex flex-col items-start justify-between gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 text-left text-sm text-slate-900 shadow-xs sm:flex-row sm:items-center sm:text-sm"
        >
            <div className="flex items-start gap-3">
                <div className="bg-primary mt-0.5 shrink-0 rounded-2xl p-2.5 text-white">
                    <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                    <span className="rounded-full border border-emerald-200 bg-white/90 px-2 py-0.5 text-sm font-bold text-emerald-700">
                        Nueva Reevaluación Preventiva
                    </span>
                    <h2 className="mt-1 text-sm font-extrabold text-slate-900 sm:text-base">Reevaluando: {reevaluacionDe.nombre_comercio}</h2>
                    <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-slate-600">
                        Los datos del establecimiento han sido precargados desde tu evaluación anterior
                        {reevaluacionDe.fecha_anterior ? ` del ${reevaluacionDe.fecha_anterior}` : ''}. Tu evaluación previa se conservará sin cambios
                        en tu historial.
                    </p>
                </div>
            </div>
            <span className="shrink-0 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-sm font-bold text-emerald-800 shadow-2xs">
                Trazabilidad independiente
            </span>
        </div>
    );
}

interface EtiquetaPreguntaProps {
    numero: number;
    texto: string;
    htmlFor?: string;
    id?: string;
    opcional?: boolean;
}

/** Etiqueta numerada del formulario (mismo estilo que components/form/Pregunta). */
function EtiquetaPregunta({ numero, texto, htmlFor, id, opcional = false }: Readonly<EtiquetaPreguntaProps>) {
    const contenido = (
        <>
            <span className="text-primary-700 mr-1">{numero}.</span>
            {texto}
            {opcional && <span className="ml-1.5 font-normal text-slate-500">(opcional)</span>}
        </>
    );
    const clase = 'block text-lg leading-snug font-semibold text-slate-900';
    return htmlFor ? (
        <label htmlFor={htmlFor} id={id} className={clase}>
            {contenido}
        </label>
    ) : (
        <span id={id} className={clase}>
            {contenido}
        </span>
    );
}

function MensajeError({ id, mensaje }: Readonly<{ id: string; mensaje?: string }>) {
    if (!mensaje) return null;
    return (
        <p id={id} className="mt-2 flex items-start gap-2 text-base font-medium text-rose-700">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            {mensaje}
        </p>
    );
}

const claseTarjetaGrupo = 'space-y-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8';

interface SeccionIdentificacionGiroProps {
    data: FormEvaluacionData;
    setData: ActualizarCampoFormulario;
    erroresFormulario: Record<string, string>;
    errors: Partial<Record<string, string>>;
    limpiarErrorDe: (campo: string) => void;
    rubro: RubroId | '';
    onRubro: (rubro: RubroId) => void;
}

function SeccionIdentificacionGiro({
    data,
    setData,
    erroresFormulario,
    errors,
    limpiarErrorDe,
    rubro,
    onRubro,
}: Readonly<SeccionIdentificacionGiroProps>) {
    const errorNombre = obtenerErrorCampo('nombre_comercio', erroresFormulario, errors);
    const errorRuc = obtenerErrorCampo('ruc', erroresFormulario, errors);
    const errorRubro = erroresFormulario.rubro;

    return (
        <div className={claseTarjetaGrupo}>
            <div id="campo-nombre_comercio">
                <EtiquetaPregunta numero={1} texto="Nombre de tu negocio" htmlFor="est-nombre" />
                <p id="ayuda-nombre" className="mt-1 text-base text-slate-600">
                    Como aparece en tu letrero o como te conocen tus clientes.
                </p>
                <input
                    id="est-nombre"
                    type="text"
                    required
                    value={data.nombre_comercio}
                    onChange={(e) => {
                        setData('nombre_comercio', e.target.value);
                        limpiarErrorDe('nombre_comercio');
                    }}
                    placeholder="Ej. Perfumería Billy"
                    aria-invalid={Boolean(errorNombre)}
                    aria-describedby={errorNombre ? 'ayuda-nombre error-nombre' : 'ayuda-nombre'}
                    className={`mt-3 ${claseCampo(Boolean(errorNombre))}`}
                />
                <MensajeError id="error-nombre" mensaje={errorNombre} />
            </div>

            <div id="campo-rubro">
                <EtiquetaPregunta numero={2} texto="¿Qué tipo de negocio es?" id="label-rubro" />
                <p id="ayuda-rubro" className="mt-1 text-base text-slate-600">
                    Toca el que más se parezca. Así solo te preguntamos lo que corresponde a tu negocio.
                </p>
                <div
                    role="radiogroup"
                    aria-labelledby="label-rubro"
                    aria-describedby="ayuda-rubro"
                    className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3"
                >
                    {RUBROS.map((opcion) => {
                        const activo = rubro === opcion.id;
                        return (
                            <button
                                key={opcion.id}
                                type="button"
                                role="radio"
                                aria-checked={activo}
                                data-cy={`rubro-${opcion.id}`}
                                onClick={() => onRubro(opcion.id)}
                                className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 text-left transition focus-visible:ring-4 focus-visible:ring-emerald-100 focus-visible:outline-none ${
                                    activo ? 'border-primary-700 ring-primary-100 shadow-md ring-2' : 'border-slate-200 hover:border-slate-400'
                                }`}
                            >
                                <span className="relative block h-20 w-full overflow-hidden bg-slate-100">
                                    <img
                                        src={FOTOS_POR_RUBRO[opcion.foto][0]}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover transition group-hover:scale-105"
                                    />
                                    {activo && (
                                        <span className="bg-primary-700 absolute top-1.5 right-1.5 rounded-full p-1 text-white">
                                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                        </span>
                                    )}
                                </span>
                                <span className="block px-2.5 py-2">
                                    <span className="block text-sm leading-tight font-bold text-slate-900">{opcion.nombre}</span>
                                    <span className="mt-0.5 block text-xs text-slate-500">{opcion.ejemplos}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                <MensajeError id="error-rubro" mensaje={errorRubro} />
            </div>

            <div id="campo-distrito">
                <EtiquetaPregunta numero={3} texto="¿En qué distrito está tu local?" htmlFor="est-distrito" />
                <select
                    id="est-distrito"
                    value={data.distrito}
                    onChange={(e) => setData('distrito', e.target.value)}
                    className={`mt-3 cursor-pointer sm:max-w-sm ${claseCampo()}`}
                >
                    <option value="">Elige el distrito</option>
                    {DISTRITOS.map((distrito) => (
                        <option key={distrito} value={distrito}>
                            {distrito}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="est-direccion" className="block text-lg font-semibold text-slate-900">
                        Dirección <span className="font-normal text-slate-500">(opcional)</span>
                    </label>
                    <input
                        id="est-direccion"
                        type="text"
                        maxLength={255}
                        value={data.direccion}
                        onChange={(e) => setData('direccion', e.target.value)}
                        placeholder="Ej: Jr. Ancash 345"
                        className={`mt-2 ${claseCampo()}`}
                    />
                </div>
                <div>
                    <label htmlFor="est-referencia" className="block text-lg font-semibold text-slate-900">
                        Referencia <span className="font-normal text-slate-500">(opcional)</span>
                    </label>
                    <input
                        id="est-referencia"
                        type="text"
                        maxLength={255}
                        value={data.referencia}
                        onChange={(e) => setData('referencia', e.target.value)}
                        placeholder="Ej: frente al parque Huamanmarca"
                        className={`mt-2 ${claseCampo()}`}
                    />
                </div>
            </div>

            <div id="campo-ruc">
                <EtiquetaPregunta numero={4} texto="RUC del negocio" htmlFor="est-ruc" opcional />
                <p id="ayuda-ruc" className="mt-1 text-base text-slate-600">
                    Si aún no tienes RUC, déjalo vacío y continúa.
                </p>
                <input
                    id="est-ruc"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={data.ruc}
                    onChange={(e) => {
                        setData('ruc', e.target.value.replace(/\D/g, ''));
                        limpiarErrorDe('ruc');
                    }}
                    placeholder="11 dígitos"
                    aria-invalid={Boolean(errorRuc)}
                    aria-describedby={errorRuc ? 'ayuda-ruc error-ruc' : 'ayuda-ruc'}
                    className={`mt-3 sm:max-w-xs ${claseCampo(Boolean(errorRuc))}`}
                />
                <MensajeError id="error-ruc" mensaje={errorRuc} />
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

    const campos = [
        {
            campo: 'area_m2',
            id: 'est-area',
            numero: 1,
            texto: 'Área techada en metros cuadrados',
            ayuda: 'Si no lo sabes exacto, pon un aproximado. Ej. un local de 5 x 12 metros = 60 m².',
            error: errorArea,
            valor: data.area_m2,
            onChange: (v: string) => setData('area_m2', v),
            placeholder: 'Ej. 60',
            min: '0.1',
            step: '0.1',
        },
        {
            campo: 'pisos',
            id: 'est-pisos',
            numero: 2,
            texto: '¿Cuántos pisos usa tu local?',
            ayuda: 'Cuenta el sótano como un piso.',
            error: errorPisos,
            valor: data.pisos,
            onChange: (v: string) => setData('pisos', parsearEnteroOpcional(v)),
            placeholder: 'Ej. 1',
            min: '1',
            step: '1',
        },
        {
            campo: 'aforo',
            id: 'est-aforo',
            numero: 3,
            texto: '¿Cuántas personas puede haber al mismo tiempo?',
            ayuda: 'Clientes y trabajadores juntos, en el momento de más gente.',
            error: errorAforo,
            valor: data.aforo,
            onChange: (v: string) => setData('aforo', parsearEnteroOpcional(v)),
            placeholder: 'Ej. 15',
            min: '1',
            step: '1',
        },
    ] as const;

    return (
        <div className={claseTarjetaGrupo}>
            {campos.map((c) => (
                <div key={c.campo} id={`campo-${c.campo}`}>
                    <EtiquetaPregunta numero={c.numero} texto={c.texto} htmlFor={c.id} opcional />
                    <p id={`ayuda-${c.campo}`} className="mt-1 text-base text-slate-600">
                        {c.ayuda}
                    </p>
                    <input
                        id={c.id}
                        type="number"
                        inputMode={c.campo === 'area_m2' ? 'decimal' : 'numeric'}
                        min={c.min}
                        step={c.step}
                        value={c.valor}
                        onChange={(e) => {
                            c.onChange(e.target.value);
                            limpiarErrorDe(c.campo);
                        }}
                        placeholder={c.placeholder}
                        aria-invalid={Boolean(c.error)}
                        aria-describedby={c.error ? `ayuda-${c.campo} error-${c.campo}` : `ayuda-${c.campo}`}
                        className={`mt-3 sm:max-w-xs ${claseCampo(Boolean(c.error))}`}
                    />
                    <MensajeError id={`error-${c.campo}`} mensaje={c.error} />
                </div>
            ))}
        </div>
    );
}

interface PreguntaSiNoProps {
    campo: CampoSiNo;
    numero: number;
    texto: string;
    ayuda: string;
    valor: boolean | null | undefined;
    error?: string;
    onSeleccion: (valor: boolean | null) => void;
    children?: React.ReactNode;
}

function PreguntaSiNo({ campo, numero, texto, ayuda, valor, error, onSeleccion, children }: Readonly<PreguntaSiNoProps>) {
    return (
        <div id={`campo-${campo}`}>
            <EtiquetaPregunta numero={numero} texto={texto} id={`label-${campo}`} />
            <p id={`desc-${campo}`} className="mt-1 text-base text-slate-600">
                {ayuda}
            </p>
            <SelectorSiNo etiquetaId={`label-${campo}`} descripcionId={`desc-${campo}`} valor={valor} onSeleccion={onSeleccion} />
            <MensajeError id={`error-${campo}`} mensaje={error} />
            {children}
        </div>
    );
}

interface SeccionInstalacionesCondicionesProps {
    data: FormEvaluacionData;
    setData: ActualizarCampoFormulario;
    erroresFormulario: Record<string, string>;
    limpiarErrorDe: (campo: string) => void;
    relevantes: readonly CampoSiNo[];
    nombreRubro?: string;
}

/**
 * Preguntas Sí/No del local. Se muestran primero las que corresponden al tipo de negocio;
 * las demás quedan plegadas en «Otras situaciones» (ya marcadas en «No») por si el local
 * tiene algo fuera de lo común.
 */
function SeccionInstalacionesCondiciones({
    data,
    setData,
    erroresFormulario,
    limpiarErrorDe,
    relevantes,
    nombreRubro,
}: Readonly<SeccionInstalacionesCondicionesProps>) {
    const otras: CampoSiNo[] = [...CAMPOS_POR_RUBRO.filter((c) => !relevantes.includes(c)), 'en_sotano', 'galeria_sin_itse'];
    const otrasConSi = otras.some((c) => data[c] === true);

    const pregunta = (campo: CampoSiNo, numero: number) => (
        <PreguntaSiNo
            key={campo}
            campo={campo}
            numero={numero}
            texto={PREGUNTAS_SI_NO[campo].texto}
            ayuda={PREGUNTAS_SI_NO[campo].ayuda}
            valor={data[campo] as boolean | null | undefined}
            error={erroresFormulario[campo]}
            onSeleccion={(valor) => {
                setData(campo, valor);
                if (campo === 'usa_glp' && !valor) setData('galones_glp', '');
                if (campo === 'usa_liquidos_inflamables' && !valor) setData('combustibles_liquidos_m3', '');
                limpiarErrorDe(campo);
            }}
        >
            {campo === 'usa_glp' && data.usa_glp === true && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <label htmlFor="est-galones" className="block text-base font-semibold text-slate-900">
                        ¿Cuántos galones de gas tienes en total? <span className="font-normal text-slate-500">(opcional)</span>
                    </label>
                    <p id="ayuda-galones" className="mt-1 text-base text-slate-700">
                        Un balón doméstico de 10 kg tiene unos 5 galones.
                    </p>
                    <input
                        id="est-galones"
                        type="number"
                        min="0"
                        step="0.5"
                        value={data.galones_glp}
                        onChange={(e) => setData('galones_glp', e.target.value === '' ? '' : Number.parseFloat(e.target.value))}
                        placeholder="Ej. 10"
                        aria-describedby="ayuda-galones"
                        className={`mt-3 sm:max-w-xs ${claseCampo()}`}
                    />
                </div>
            )}
        </PreguntaSiNo>
    );

    return (
        <div className={claseTarjetaGrupo}>
            {nombreRubro && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900">
                    Preguntas para <strong>{nombreRubro}</strong>. Lo demás ya quedó marcado en «No»; puedes cambiarlo en «Otras situaciones».
                </p>
            )}
            {relevantes.map((campo, i) => pregunta(campo, 4 + i))}

            <details className="group rounded-xl border border-slate-300" open={otrasConSi}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-lg font-semibold text-slate-900">
                    <span>
                        Otras situaciones{' '}
                        <span className="block text-base font-normal text-slate-600 sm:inline">Solo si tu local tiene algo fuera de lo común</span>
                    </span>
                    <span aria-hidden="true" className="text-slate-500 transition group-open:rotate-180">
                        ▾
                    </span>
                </summary>
                <div className="space-y-7 border-t border-slate-200 p-5">{otras.map((campo, i) => pregunta(campo, 4 + relevantes.length + i))}</div>
            </details>
        </div>
    );
}

const GRUPOS = [
    { boton: 'Tu negocio', titulo: 'Tu negocio', ayuda: 'El nombre y el tipo de negocio son obligatorios.' },
    {
        boton: 'Cómo es tu local',
        titulo: 'Cómo es tu local',
        ayuda: 'Responde con lo que ves hoy en tu local. Si no sabes algo, elige “Aún no lo sé”.',
    },
] as const;

export default function Nueva({ reevaluacionDe = null }: Readonly<NuevaProps>) {
    const [grupo, setGrupo] = useState(0);
    const [showGuia, setShowGuia] = useState<boolean>(false);
    const [erroresFormulario, setErroresFormulario] = useState<Record<string, string>>({});
    const primerRender = useRef(true);

    const { data, setData, post, processing, errors } = useForm<FormEvaluacionData>(construirValoresIniciales(reevaluacionDe));
    const [rubro, setRubro] = useState<RubroId | ''>(() => rubroInicial(reevaluacionDe));
    const opcionRubro = RUBROS.find((r) => r.id === rubro);
    const relevantes = opcionRubro?.preguntas ?? CAMPOS_POR_RUBRO;
    // Respuestas que puso el sistema (no el usuario) al elegir el tipo de negocio.
    const autoRespondidas = useRef<Set<CampoSiNo>>(new Set());

    const elegirRubro = (id: RubroId) => {
        const opcion = RUBROS.find((r) => r.id === id);
        if (!opcion) return;
        setRubro(id);
        limpiarErrorDe('rubro');
        const cambios: Partial<FormEvaluacionData> = { funcion_economica: opcion.funcion };
        for (const campo of CAMPOS_POR_RUBRO) {
            if (opcion.preguntas.includes(campo)) {
                // Pregunta relevante: si la había respondido el sistema, se deja para el usuario.
                if (autoRespondidas.current.has(campo)) {
                    cambios[campo] = null;
                    autoRespondidas.current.delete(campo);
                }
            } else if (data[campo] == null || autoRespondidas.current.has(campo)) {
                // No aplica a este tipo de negocio: queda en «No» (se puede corregir en «Otras situaciones»).
                cambios[campo] = false;
                autoRespondidas.current.add(campo);
            }
        }
        setData((prev) => ({ ...prev, ...cambios }));
    };

    useEffect(() => {
        // Al cambiar de grupo se mueve el foco al título para lectores de pantalla,
        // pero no en la carga inicial: ahí el foco debe quedar en el inicio de la página.
        if (primerRender.current) {
            primerRender.current = false;
            return;
        }
        document.getElementById('grupo-datos')?.focus();
    }, [grupo]);

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
        if (!rubro) {
            errs.rubro = 'Elige el tipo de negocio para saber qué preguntarte.';
        }
        setErroresFormulario(errs);

        if (Object.keys(errs).length > 0) {
            const campo = Object.keys(errs)[0];
            setGrupo(['nombre_comercio', 'rubro', 'ruc'].includes(campo) ? 0 : 1);
            setTimeout(() => enfocarPrimerError(errs), 0);
            return;
        }

        if (grupo < 1) {
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
        ['Tipo de negocio', opcionRubro?.nombre ?? 'Sin elegir'],
        ['Actividad (norma ITSE)', FUNCIONES_ECONOMICAS.find((f) => f.valor === data.funcion_economica)?.etiqueta ?? data.funcion_economica],
        ['Distrito', data.distrito || 'No indicado'],
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
            respuestaSiNo(data[campo]),
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
                        <ol className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-200/60 p-1">
                            {GRUPOS.map((g, index) => (
                                <li key={g.boton}>
                                    <button
                                        type="button"
                                        disabled={processing}
                                        aria-current={grupo === index ? 'step' : undefined}
                                        onClick={() => setGrupo(index)}
                                        className={`min-h-12 w-full cursor-pointer rounded-xl px-2 py-2.5 text-base font-semibold transition ${
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
                        <h2 id="grupo-datos" tabIndex={-1} className="text-2xl font-bold text-slate-900 focus:outline-none">
                            {GRUPOS[grupo].titulo}
                        </h2>
                        <p className="mt-1 text-lg text-slate-600">{GRUPOS[grupo].ayuda}</p>
                    </div>

                    {Object.keys(errors).length > 0 && (
                        <div className="bg-danger-50 border-danger-300 text-danger-950 rounded-2xl border p-4 text-left text-sm" role="alert">
                            <div className="mb-1 flex items-center gap-2 font-bold">
                                <AlertCircle className="text-danger-600 h-4 w-4" />
                                <span>Por favor corrige los siguientes datos:</span>
                            </div>
                            <ul className="text-danger-800 list-inside list-disc space-y-0.5 text-sm">
                                {Object.entries(errors).map(([campo, err]) => (
                                    <li key={campo}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Paso 1: el negocio (tipo, ubicación y datos de identificación) */}
                    <div hidden={grupo !== 0} className="space-y-4">
                        <SeccionIdentificacionGiro
                            data={data}
                            setData={setData}
                            erroresFormulario={erroresFormulario}
                            errors={errors}
                            limpiarErrorDe={limpiarErrorDe}
                            rubro={rubro}
                            onRubro={elegirRubro}
                        />
                    </div>

                    {/* Paso 2: cómo es el local (tamaño y solo las preguntas de su tipo) + resumen */}
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
                            relevantes={relevantes}
                            nombreRubro={opcionRubro?.id === 'otro' ? undefined : opcionRubro?.nombre}
                        />
                        <section className="rounded-3xl border border-slate-200 bg-white p-6">
                            <h3 className="text-lg font-bold text-slate-900">Lo que vas a declarar</h3>
                            <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                                {resumenDatos.map(([label, value]) => (
                                    <div key={label} className="border-b border-slate-100 pb-3">
                                        <dt className="text-sm font-semibold text-slate-500">{label}</dt>
                                        <dd className="mt-1 text-base font-semibold break-words text-slate-900">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                        <PanelLoQueRevisaremos data={data} nombreRubro={opcionRubro?.id === 'otro' ? undefined : opcionRubro?.nombre} />
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        {grupo > 0 ? (
                            <button
                                type="button"
                                disabled={processing}
                                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold text-slate-700 hover:bg-slate-100"
                                onClick={() => setGrupo(grupo - 1)}
                            >
                                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                Volver al paso anterior
                            </button>
                        ) : (
                            <Link
                                href="/"
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            >
                                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                Volver a la portada
                            </Link>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-primary hover:bg-primary-700 flex min-h-13 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl px-8 text-lg font-bold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-95 disabled:opacity-60 sm:w-auto"
                        >
                            <span>{textoBotonEnviar(processing, grupo)}</span>
                            <ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

function respuestaSiNo(valor: boolean | null | undefined): string {
    if (valor == null) return 'Aún no lo sé';
    return valor ? 'Sí' : 'No';
}

function textoBotonEnviar(procesando: boolean, grupo: number): string {
    if (procesando) return 'Iniciando autoevaluación...';
    return grupo < 1 ? 'Continuar' : 'Guardar y ver las condiciones';
}
