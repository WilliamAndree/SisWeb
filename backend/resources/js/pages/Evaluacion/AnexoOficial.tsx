import { HojaModeloAnexo } from '@/components/Evaluacion/HojaModeloAnexo';
import { FormatoAnexo01, FormatoAnexo02, FormatoAnexo03, FormatoAnexo04 } from '@/components/Evaluacion/anexos';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    CheckSquare,
    Clock,
    HelpCircle,
    MinusCircle,
    Printer,
    ShieldCheck,
    Sparkles,
    Square,
} from 'lucide-react';
import { useState } from 'react';

type TabAnexo = 'resumen' | 'anexo01' | 'anexo02' | 'anexo03' | 'anexo04';

function getTabButtonClasses(tabActual: TabAnexo, tabBoton: TabAnexo): string {
    if (tabActual === tabBoton) {
        return 'bg-slate-900 text-white shadow-xs';
    }
    return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
}

type ValorMetricoNullable = number | string | null;

export interface AutoevaluacionDatos {
    id?: number;
    uuid_trazabilidad: string;
    nombre_comercio: string;
    funcion_economica?: string | null;
    ruc?: string | null;
    sector_huancayo?: string | null;
    direccion?: string | null;
    referencia?: string | null;
    area_m2?: ValorMetricoNullable;
    pisos?: ValorMetricoNullable;
    aforo?: ValorMetricoNullable;
    codigo_acceso?: string | null;
    estado?: string | null;
    registrada_at?: string | null;
    fecha?: string | null;
    hash_integridad?: string | null;
    usa_glp?: boolean | null;
    tiene_equipos_fritura?: boolean | null;
    tiene_escaleras?: boolean | null;
    tiene_estanterias_altas?: boolean | null;
    [key: string]: unknown;
}

export interface TitularDatos {
    nombre_comercial: string;
    razon_social: string;
    ruc: string;
    direccion: string;
    giro: string;
    correo?: string | null;
    telefono?: string | null;
}

export interface RiesgoTramiteDatos {
    nivel_riesgo: string;
    es_ex_ante: boolean;
    tipo_tramite: string;
    modalidad?: string;
    motivos?: string[];
    semaforo?: string | null;
    porcentaje_cumplimiento?: number | null;
}

export interface ClasificacionDatos {
    nivel: string;
    es_previa: boolean;
    tipo_tramite?: string;
    nivel_riesgo?: string;
    motivos?: string[];
}

export interface CondicionItem {
    codigo: string;
    nombre: string;
    estado: string;
    observacion?: string;
    es_critico: boolean;
    cumple?: boolean;
    categoria?: string;
    norma?: string;
}

export interface ConteoDatos {
    total: number;
    cumple: number;
    no_cumple: number;
    porcentaje: number;
    por_revisar?: number;
    na?: number;
}

export type ConteoCondiciones = ConteoDatos;

export interface AnexoOficialProps {
    numero: '4' | '9';
    autoevaluacion: AutoevaluacionDatos;
    titular: TitularDatos;
    riesgoTramite: RiesgoTramiteDatos;
    clasificacion?: ClasificacionDatos;
    condiciones: CondicionItem[];
    conteo: ConteoDatos;
    codigoDocumento: string;
    fechaEmision: string;
    urlResumen: string;
}

function resolverTipoTramiteTexto(esExAnte: boolean): string {
    return esExAnte ? 'ITSE PREVIA (Riesgo Alto o Muy Alto)' : 'ITSE POSTERIOR (Riesgo Bajo o Medio)';
}

function estadoBadge(estado: string) {
    const est = estado?.toUpperCase() ?? '';
    if (est === 'CUMPLE' || est === 'CUMPLE_DECLARADO') {
        return {
            label: 'CUMPLE',
            clases: 'text-emerald-800 bg-emerald-50 border-emerald-200 print:text-black print:bg-transparent print:border-black',
            icon: CheckCircle2,
        };
    }
    if (est === 'NO_CUMPLE' || est === 'PENDIENTE_ATENDER') {
        return {
            label: 'PENDIENTE',
            clases: 'text-amber-800 bg-amber-50 border-amber-200 print:text-black print:bg-transparent print:border-black',
            icon: Clock,
        };
    }
    if (est === 'POR_REVISAR') {
        return {
            label: 'POR REVISAR',
            clases: 'text-sky-800 bg-sky-50 border-sky-200 print:text-black print:bg-transparent print:border-black',
            icon: HelpCircle,
        };
    }
    return {
        label: 'NO APLICA',
        clases: 'text-slate-600 bg-slate-100 border-slate-200 print:text-black print:bg-transparent print:border-black',
        icon: MinusCircle,
    };
}

function resolverUrlResumen(urlResumen: string, uuidTrazabilidad?: string): string {
    if (urlResumen) {
        return urlResumen;
    }
    return uuidTrazabilidad ? route('autoevaluacion.resumen', { uuid: uuidTrazabilidad }) : '#';
}

function resolverNombreTitular(titular?: TitularDatos, autoevaluacion?: AutoevaluacionDatos, porDefecto = ''): string {
    return titular?.nombre_comercial || titular?.razon_social || autoevaluacion?.nombre_comercio || porDefecto;
}

function textoSiNo(valor?: boolean | null): string {
    return valor ? 'SÍ' : 'NO';
}

function construirClasificacionHojaModelo(
    clasificacion: ClasificacionDatos | undefined,
    riesgoTramite: RiesgoTramiteDatos | undefined,
    esExAnte: boolean,
) {
    return {
        tipo_tramite: clasificacion?.tipo_tramite ?? riesgoTramite?.tipo_tramite ?? (esExAnte ? 'EX_ANTE' : 'EX_POST'),
        nivel_riesgo: clasificacion?.nivel_riesgo ?? clasificacion?.nivel ?? riesgoTramite?.nivel_riesgo ?? (esExAnte ? 'ALTO' : 'MEDIO'),
        es_previa: esExAnte,
    };
}

function filtrarCondicionesConformes(condiciones: CondicionItem[]): CondicionItem[] {
    return condiciones.filter((c) => c.cumple ?? (c.estado === 'CUMPLE' || c.estado === 'CUMPLE_DECLARADO'));
}

interface BloquesAnexo4Props {
    condiciones: CondicionItem[];
    conteo: ConteoDatos;
    tipoTramiteTexto: string;
}

function BloquesAnexo4({ condiciones, conteo, tipoTramiteTexto }: Readonly<BloquesAnexo4Props>) {
    return (
        <>
            {/* Bloque III: Desglose Declarativo de Condiciones de Seguridad */}
            <section className="space-y-3 rounded-lg border border-slate-300 p-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <h2 className="text-[11px] font-black tracking-wider text-slate-900 uppercase">
                        III. Desglose de Condiciones de Seguridad en la Edificación Declaradas
                    </h2>
                    <span className="font-mono text-[10px] text-slate-500">Total ítems: {conteo?.total ?? 0}</span>
                </div>

                <p className="text-[10px] leading-snug text-slate-600">
                    Detalle de las condiciones técnicas mínimas de seguridad reglamentarias verificadas y declaradas bajo juramento por el titular del
                    establecimiento:
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 text-[10.5px]">
                        <thead>
                            <tr className="bg-slate-100 text-left text-slate-800 print:bg-slate-200">
                                <th className="w-16 border border-slate-300 px-2 py-1 font-bold">Código</th>
                                <th className="border border-slate-300 px-2 py-1 font-bold">Condición Técnica Normativa</th>
                                <th className="w-28 border border-slate-300 px-2 py-1 text-center font-bold">Estado Declarado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {condiciones.length > 0 ? (
                                condiciones.map((item, index) => {
                                    const badge = estadoBadge(item.estado);
                                    const IconComponent = badge.icon;
                                    return (
                                        <tr key={item.codigo || index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                            <td className="border border-slate-300 px-2 py-1 font-mono font-bold text-slate-700">{item.codigo}</td>
                                            <td className="border border-slate-300 px-2 py-1 text-slate-800">
                                                <div className="font-medium">{item.nombre}</div>
                                                {item.norma && <span className="block text-[9px] text-slate-500">Ref: {item.norma}</span>}
                                            </td>
                                            <td className="border border-slate-300 px-2 py-1 text-center">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9.5px] font-bold ${badge.clases}`}
                                                >
                                                    <IconComponent className="h-3 w-3" />
                                                    {badge.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={3} className="border border-slate-300 px-3 py-2 text-center text-slate-500">
                                        No se registran condiciones declaradas en la autoevaluación.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Resumen cuantitativo */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-[10px] text-slate-700">
                    <div className="flex items-center gap-3">
                        <span>
                            <strong>{conteo?.cumple ?? 0}</strong> Conformes
                        </span>
                        <span>·</span>
                        <span>
                            <strong>{conteo?.no_cumple ?? 0}</strong> Pendientes
                        </span>
                        <span>·</span>
                        <span>
                            <strong>{conteo?.por_revisar ?? 0}</strong> Por revisar
                        </span>
                        <span>·</span>
                        <span>
                            <strong>{conteo?.na ?? 0}</strong> No aplican
                        </span>
                    </div>
                    <span className="font-semibold text-slate-600">Modalidad Asignada: {tipoTramiteTexto}</span>
                </div>
            </section>

            {/* Bloque IV: Declaración Jurada Expresa */}
            <section className="space-y-2 rounded-lg border-2 border-slate-800 bg-slate-50/50 p-3 text-xs print:bg-transparent">
                <h2 className="text-[11px] font-black tracking-wider text-slate-900 uppercase">IV. Declaración Jurada y Compromiso Legal</h2>
                <p className="text-justify text-[10.5px] leading-relaxed text-slate-800">
                    <strong>DECLARO BAJO JURAMENTO</strong> que el establecimiento comercial individualizado en el presente instrumento cumple
                    plenamente con las Condiciones de Seguridad en Edificaciones establecidas en el D.S. N° 002-2018-PCM, el Reglamento Nacional de
                    Edificaciones (RNE), el Código Nacional de Electricidad y las normas técnicas conexas.
                </p>
                <p className="text-justify text-[10px] leading-relaxed text-slate-700">
                    Asimismo, declaro bajo juramento que toda la información consignada responde a la verdad y que mantendré las condiciones de
                    seguridad declaradas de forma permanente durante el funcionamiento de las actividades económicas, sometiéndome a las acciones de
                    fiscalización posterior que ejecute la Municipalidad Provincial de Huancayo y asumiendo las sanciones administrativas y penales en
                    caso de falsedad (Art. 34 del T.U.O. de la Ley N° 27444 y Art. 411 del Código Penal).
                </p>
            </section>
        </>
    );
}

interface BloquesAnexo9Props {
    esExAnte: boolean;
    autoevaluacion: AutoevaluacionDatos;
    conteo: ConteoDatos;
}

function BloquesAnexo9({ esExAnte, autoevaluacion, conteo }: Readonly<BloquesAnexo9Props>) {
    const clasePosterior = !esExAnte ? 'border-slate-800 bg-slate-100 font-bold print:border-black' : 'border-slate-200 text-slate-600';
    const clasePrevia = esExAnte ? 'border-slate-800 bg-slate-100 font-bold print:border-black' : 'border-slate-200 text-slate-600';

    return (
        <>
            {/* Bloque III: Modalidad de Procedimiento Solicitado */}
            <section className="space-y-2.5 rounded-lg border border-slate-300 p-3 text-xs">
                <h2 className="border-b border-slate-200 pb-1 text-[11px] font-black tracking-wider text-slate-900 uppercase">
                    III. Modalidad del Procedimiento de ITSE Solicitado
                </h2>
                <p className="text-[10.5px] text-slate-600">
                    Conforme a la matriz de riesgos del D.S. N° 002-2018-PCM y la escala física del establecimiento:
                </p>

                <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
                    <div className={`flex items-start gap-2 rounded border p-2.5 ${clasePosterior}`}>
                        {!esExAnte ? (
                            <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-900" />
                        ) : (
                            <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <div>
                            <span>ITSE Posterior al inicio de actividades</span>
                            <span className="block text-[9.5px] font-normal text-slate-500">
                                Para locales clasificados en Riesgo Bajo o Medio (hasta 3 pisos y/o hasta 750 m²).
                            </span>
                        </div>
                    </div>

                    <div className={`flex items-start gap-2 rounded border p-2.5 ${clasePrevia}`}>
                        {esExAnte ? (
                            <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-900" />
                        ) : (
                            <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <div>
                            <span>ITSE Previa al inicio de actividades</span>
                            <span className="block text-[9.5px] font-normal text-slate-500">
                                Para locales clasificados en Riesgo Alto o Muy Alto (inspección previa por Grupo Inspector).
                            </span>
                        </div>
                    </div>
                </div>

                {/* Motivo de la Solicitud */}
                <div className="border-t border-slate-200 pt-2">
                    <span className="mb-1.5 block text-[11px] font-bold text-slate-800">Motivo de la solicitud:</span>
                    <div className="grid grid-cols-1 gap-2 text-[10.5px] sm:grid-cols-3">
                        <label className="flex items-center gap-1.5">
                            <CheckSquare className="h-3.5 w-3.5 text-slate-900" />
                            <span>Licencia nueva con ITSE</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-slate-600">
                            <Square className="h-3.5 w-3.5 text-slate-400" />
                            <span>Renovación de Certificado ITSE</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-slate-600">
                            <Square className="h-3.5 w-3.5 text-slate-400" />
                            <span>Ampliación o cambio de giro</span>
                        </label>
                    </div>
                </div>
            </section>

            {/* Bloque IV: Características Físicas y Factores Normativos */}
            <section className="space-y-2 rounded-lg border border-slate-300 p-3 text-xs">
                <h2 className="border-b border-slate-200 pb-1 text-[11px] font-black tracking-wider text-slate-900 uppercase">
                    IV. Características Técnicas Relevantes Declaradas
                </h2>
                <div className="grid grid-cols-2 gap-2 text-[10.5px] sm:grid-cols-4">
                    <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <span className="block text-[9.5px] text-slate-500">Uso de GLP comercial:</span>
                        <strong className="text-slate-900">{textoSiNo(autoevaluacion?.usa_glp)}</strong>
                    </div>
                    <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <span className="block text-[9.5px] text-slate-500">Equipos de fritura / cocina:</span>
                        <strong className="text-slate-900">{textoSiNo(autoevaluacion?.tiene_equipos_fritura)}</strong>
                    </div>
                    <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <span className="block text-[9.5px] text-slate-500">Escaleras de circulación:</span>
                        <strong className="text-slate-900">{textoSiNo(autoevaluacion?.tiene_escaleras)}</strong>
                    </div>
                    <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <span className="block text-[9.5px] text-slate-500">Estanterías en altura:</span>
                        <strong className="text-slate-900">{textoSiNo(autoevaluacion?.tiene_estanterias_altas)}</strong>
                    </div>
                </div>

                {/* Resumen del autodiagnóstico cívico */}
                <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2.5 text-[10.5px] leading-relaxed">
                    <span className="font-bold text-slate-800">Resultado de Autoevaluación Preventiva: </span>
                    <span>
                        El administrado declara contar con <strong>{conteo?.cumple ?? 0} condiciones conformes</strong> y{' '}
                        <strong>{(conteo?.no_cumple ?? 0) + (conteo?.por_revisar ?? 0)} condiciones en proceso de adecuación o revisión</strong> sobre
                        un total de {conteo?.total ?? 0} ítems evaluables.
                    </span>
                </div>
            </section>

            {/* Bloque V: Petitorio Formal */}
            <section className="space-y-2 rounded-lg border-2 border-slate-800 bg-slate-50/50 p-3 text-xs print:bg-transparent">
                <h2 className="text-[11px] font-black tracking-wider text-slate-900 uppercase">V. Declaración y Petitorio</h2>
                <p className="text-justify text-[10.5px] leading-relaxed text-slate-800">
                    <strong>POR TANTO:</strong> Solicito a usted señor Alcalde se sirva admitir a trámite la presente solicitud de Inspección Técnica
                    de Seguridad en Edificaciones, disponer la programación de la diligencia correspondiente con arreglo a ley y, previo informe
                    favorable de los inspectores acreditados, expedir el{' '}
                    <strong>Certificado de Inspección Técnica de Seguridad en Edificaciones (ITSE)</strong>.
                </p>
                <p className="text-justify text-[10px] leading-relaxed text-slate-700">
                    Me comprometo a brindar todas las facilidades de acceso y verificación física al Grupo Inspector en la fecha y hora notificadas,
                    autorizando las notificaciones electrónicas correspondientes al domicilio digital consignado en la presente solicitud.
                </p>
            </section>
        </>
    );
}

interface EncabezadoTituloAnexoProps {
    esAnexo4: boolean;
    esAnexo9: boolean;
}

function EncabezadoTituloAnexo({ esAnexo4, esAnexo9 }: Readonly<EncabezadoTituloAnexoProps>) {
    return (
        <>
            {esAnexo4 && (
                <>
                    <span className="mb-1 inline-block rounded bg-slate-900 px-3 py-0.5 font-mono text-xs font-black tracking-widest text-white uppercase">
                        ANEXO 4
                    </span>
                    <h1 className="mt-1 text-base font-black tracking-tight text-slate-900 uppercase sm:text-lg">
                        DECLARACIÓN JURADA DE CUMPLIMIENTO DE LAS CONDICIONES DE SEGURIDAD EN LA EDIFICACIÓN
                    </h1>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-600">
                        Procedimiento de Inspección Técnica de Seguridad en Edificaciones Posterior (Riesgo Bajo o Riesgo Medio)
                    </p>
                </>
            )}

            {esAnexo9 && (
                <>
                    <span className="mb-1 inline-block rounded bg-slate-900 px-3 py-0.5 font-mono text-xs font-black tracking-widest text-white uppercase">
                        ANEXO 9
                    </span>
                    <h1 className="mt-1 text-base font-black tracking-tight text-slate-900 uppercase sm:text-lg">
                        SOLICITUD DE INSPECCIÓN TÉCNICA DE SEGURIDAD EN EDIFICACIONES (ITSE)
                    </h1>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-600">
                        Procedimiento de ITSE Previa o Posterior al otorgamiento de Licencia de Funcionamiento
                    </p>
                </>
            )}
        </>
    );
}

export default function AnexoOficial({
    numero,
    autoevaluacion,
    titular = {
        nombre_comercial: '',
        razon_social: '',
        ruc: '',
        direccion: '',
        giro: '',
    },
    riesgoTramite = {
        nivel_riesgo: 'MEDIO',
        es_ex_ante: false,
        tipo_tramite: 'EX_POST',
    },
    clasificacion = {
        nivel: 'MEDIO',
        es_previa: false,
    },
    condiciones = [],
    conteo = { total: 0, cumple: 0, no_cumple: 0, porcentaje: 0, por_revisar: 0, na: 0 },
    codigoDocumento,
    fechaEmision,
    urlResumen,
}: Readonly<AnexoOficialProps>) {
    const [modalHojaModeloAbierto, setModalHojaModeloAbierto] = useState<boolean>(false);
    const [tabActiva, setTabActiva] = useState<TabAnexo>('resumen');
    const esAnexo4 = String(numero) === '4';
    const esAnexo9 = String(numero) === '9';

    const esExAnte = Boolean(riesgoTramite?.es_ex_ante ?? clasificacion?.es_previa);
    const tipoTramiteTexto = resolverTipoTramiteTexto(esExAnte);
    const enlaceResumen = resolverUrlResumen(urlResumen, autoevaluacion?.uuid_trazabilidad);
    const nombreTitular = resolverNombreTitular(titular, autoevaluacion);
    const nombreTitularFirma = resolverNombreTitular(titular, autoevaluacion, 'Administrado / Titular');

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased print:bg-white print:p-0 print:text-black">
            <Head
                title={`${numero === '9' ? 'Solicitud de ITSE (Anexo 9)' : 'Declaración jurada (Anexo 4)'} - ${autoevaluacion?.nombre_comercio ?? ''}`}
            >
                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body { font-size: 11pt !important; }
                    }
                `}</style>
            </Head>

            {/* Barra de herramientas superior — Solo pantalla (print:hidden / no-print) */}
            <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-sm print:hidden">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
                    <Link
                        href={enlaceResumen}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Volver al Resumen</span>
                    </Link>

                    <div className="text-center sm:text-left">
                        <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                            {codigoDocumento}
                        </span>
                        <h1 className="text-sm font-bold text-slate-900">Tu documento, listo para imprimir</h1>
                        <p className="text-xs text-slate-500">Para PDF: pulsa «Imprimir» y elige «Guardar como PDF».</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setModalHojaModeloAbierto(true)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-950 shadow-2xs transition hover:bg-emerald-50 active:scale-95"
                        >
                            <Sparkles className="h-4 w-4 text-emerald-600" />
                            <span>Cómo llenarlo</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Imprimir o guardar en PDF</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Selector de Pestañas de Anexos CENEPRED (no-print) */}
            <nav className="no-print border-b border-slate-200 bg-white px-4 py-2.5 shadow-2xs print:hidden">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-1.5 sm:gap-2">
                    <button
                        type="button"
                        onClick={() => setTabActiva('resumen')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${getTabButtonClasses(tabActiva, 'resumen')}`}
                    >
                        Resumen Modelo
                    </button>
                    <button
                        type="button"
                        onClick={() => setTabActiva('anexo01')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${getTabButtonClasses(tabActiva, 'anexo01')}`}
                    >
                        Anexo 01 - Solicitud
                    </button>
                    <button
                        type="button"
                        onClick={() => setTabActiva('anexo02')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${getTabButtonClasses(tabActiva, 'anexo02')}`}
                    >
                        Anexo 02 - Solicitante
                    </button>
                    <button
                        type="button"
                        onClick={() => setTabActiva('anexo03')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${getTabButtonClasses(tabActiva, 'anexo03')}`}
                    >
                        Anexo 03 - Nivel de Riesgo
                    </button>
                    <button
                        type="button"
                        onClick={() => setTabActiva('anexo04')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${getTabButtonClasses(tabActiva, 'anexo04')}`}
                    >
                        Anexo 04 - Declaración Jurada
                    </button>
                </div>
            </nav>

            {/* Contenedor de la Hoja A4 */}
            <main className="mx-auto max-w-4xl p-4 sm:p-8 print:max-w-none print:p-0">
                {/* Banner de Deslinde — Plantilla Orientativa No Oficial */}
                <div className="no-print mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-2xs print:hidden">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div className="space-y-1">
                            <strong className="block text-sm font-bold text-amber-950">
                                Plantilla Orientativa de Trabajo — No Constituye Anexo Oficial Emitido por la MPH
                            </strong>
                            <p className="leading-relaxed text-amber-900">
                                Este documento reproduce el contenido modelo de los formatos normativos de CENEPRED (D.S. N° 002-2018-PCM) prellenado
                                automáticamente a partir de tu autoevaluación preventiva.
                                <strong>
                                    {' '}
                                    No tiene valor de resolución, licencia, certificado ITSE ni reemplaza la entrega formal de los formularios
                                    oficiales en Mesa de Partes de la Municipalidad Provincial de Huancayo.
                                </strong>
                            </p>
                        </div>
                    </div>
                </div>

                {tabActiva === 'anexo01' && (
                    <FormatoAnexo01
                        autoevaluacion={autoevaluacion}
                        titular={titular}
                        riesgoTramite={riesgoTramite}
                        clasificacion={clasificacion}
                        condiciones={condiciones}
                        conteo={conteo}
                        codigoDocumento={codigoDocumento}
                        fechaEmision={fechaEmision}
                    />
                )}

                {tabActiva === 'anexo02' && (
                    <FormatoAnexo02
                        autoevaluacion={autoevaluacion}
                        titular={titular}
                        riesgoTramite={riesgoTramite}
                        clasificacion={clasificacion}
                        condiciones={condiciones}
                        conteo={conteo}
                        codigoDocumento={codigoDocumento}
                        fechaEmision={fechaEmision}
                    />
                )}

                {tabActiva === 'anexo03' && (
                    <FormatoAnexo03
                        autoevaluacion={autoevaluacion}
                        titular={titular}
                        riesgoTramite={riesgoTramite}
                        clasificacion={clasificacion}
                        condiciones={condiciones}
                        conteo={conteo}
                        codigoDocumento={codigoDocumento}
                        fechaEmision={fechaEmision}
                    />
                )}

                {tabActiva === 'anexo04' && (
                    <FormatoAnexo04
                        autoevaluacion={autoevaluacion}
                        titular={titular}
                        riesgoTramite={riesgoTramite}
                        clasificacion={clasificacion}
                        condiciones={condiciones}
                        conteo={conteo}
                        codigoDocumento={codigoDocumento}
                        fechaEmision={fechaEmision}
                    />
                )}

                {tabActiva === 'resumen' && (
                    <article className="relative mx-auto border border-slate-200 bg-white p-8 shadow-lg sm:p-12 print:border-none print:p-0 print:shadow-none">
                        {/* Marca de agua institucional sutil en fondo */}
                        <div
                            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.02] select-none print:opacity-[0.03]"
                            aria-hidden="true"
                        >
                            <ShieldCheck className="h-[480px] w-[480px] text-slate-900" />
                        </div>

                        <div className="relative space-y-6 print:space-y-4">
                            {/* 1. Encabezado y Membrete Institucional */}
                            <header className="border-b-2 border-slate-800 pb-4 text-center">
                                <div className="mb-3 flex items-center justify-between gap-4 border-b border-slate-200 pb-3 text-left">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Dirigido a</p>
                                        <h2 className="text-xs font-black tracking-wider text-slate-900 uppercase">
                                            Municipalidad Provincial de Huancayo
                                        </h2>
                                        <p className="text-[10px] text-slate-500">Modelo de formato según el D.S. N° 002-2018-PCM</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className="block font-mono text-[10px] font-bold text-slate-600">CENEPRED · D.S. N° 002-2018-PCM</span>
                                        <span className="block font-mono text-[9px] text-slate-400">R.J. N° 016-2018-CENEPRED/J</span>
                                    </div>
                                </div>

                                {/* Título Principal del Anexo */}
                                <EncabezadoTituloAnexo esAnexo4={esAnexo4} esAnexo9={esAnexo9} />

                                {/* Metadatos de Expediente y Fecha */}
                                <div className="mt-3 flex flex-wrap items-center justify-between border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-600">
                                    <div>
                                        <span className="font-semibold text-slate-700">Código CheckITSE: </span>
                                        <span className="font-mono font-bold text-slate-900">{codigoDocumento}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-700">Fecha de Emisión: </span>
                                        <span className="font-medium text-slate-900">{fechaEmision}</span>
                                    </div>
                                </div>
                            </header>

                            {/* Anexo 9: Destinatario Formal */}
                            {esAnexo9 && (
                                <section className="text-xs leading-relaxed text-slate-800">
                                    <p className="font-bold text-slate-900 uppercase">SEÑOR ALCALDE DE LA MUNICIPALIDAD PROVINCIAL DE HUANCAYO</p>
                                    <p className="text-[11px] text-slate-600">
                                        ATENCIÓN: Subgerencia de Gestión del Riesgo de Desastres e Inspecciones Técnicas de Seguridad en Edificaciones
                                        (ITSE)
                                    </p>
                                </section>
                            )}

                            {/* 2. Bloque I: Datos del Administrado / Solicitante */}
                            <section className="space-y-2 rounded-lg border border-slate-300 p-3 text-xs">
                                <h2 className="border-b border-slate-200 pb-1 text-[11px] font-black tracking-wider text-slate-900 uppercase">
                                    I. Datos del Administrado / Solicitante
                                </h2>
                                <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
                                    <div>
                                        <span className="font-medium text-slate-500">Nombres y Apellidos / Razón Social: </span>
                                        <strong className="block text-slate-900 sm:inline">{nombreTitular}</strong>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-500">N° de RUC / DNI: </span>
                                        <span className="font-mono font-bold text-slate-900">{autoevaluacion?.ruc || 'No declarado'}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-500">Correo Electrónico: </span>
                                        <span className="text-slate-800">{titular?.correo || 'No declarado'}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-500">Teléfono / Celular de Contacto: </span>
                                        <span className="text-slate-800">{titular?.telefono || 'No declarado'}</span>
                                    </div>
                                </div>
                            </section>

                            {/* 3. Bloque II: Datos del Establecimiento Objeto de la ITSE */}
                            <section className="space-y-2 rounded-lg border border-slate-300 p-3 text-xs">
                                <h2 className="border-b border-slate-200 pb-1 text-[11px] font-black tracking-wider text-slate-900 uppercase">
                                    II. Datos del Establecimiento Objeto de Inspección
                                </h2>
                                <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
                                    <div className="sm:col-span-2">
                                        <span className="font-medium text-slate-500">Nombre Comercial: </span>
                                        <strong className="text-slate-900">{autoevaluacion?.nombre_comercio}</strong>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-500">Giro / Actividad Económica: </span>
                                        <span className="font-medium text-slate-800">{autoevaluacion?.funcion_economica || 'Comercio'}</span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="font-medium text-slate-500">Dirección del Establecimiento: </span>
                                        <span className="text-slate-800">{autoevaluacion?.direccion || 'No declarada'}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-500">Distrito / Provincia: </span>
                                        <span className="text-slate-800">Huancayo, Junín</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-500">Área Ocupada / Techada: </span>
                                        <strong className="text-slate-900">
                                            {autoevaluacion?.area_m2 ? `${autoevaluacion.area_m2} m²` : 'No declarada'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-500">Número de Pisos: </span>
                                        <strong className="text-slate-900">{autoevaluacion?.pisos ?? '1'}</strong>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-500">Aforo Máximo Declarado: </span>
                                        <strong className="text-slate-900">
                                            {autoevaluacion?.aforo ? `${autoevaluacion.aforo} personas` : 'No declarado'}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            {/* Bloques específicos de ANEXO 4 (Declaración Jurada de Cumplimiento) */}
                            {esAnexo4 && <BloquesAnexo4 condiciones={condiciones} conteo={conteo} tipoTramiteTexto={tipoTramiteTexto} />}

                            {/* Bloques específicos de ANEXO 9 (Solicitud ITSE) */}
                            {esAnexo9 && <BloquesAnexo9 esExAnte={esExAnte} autoevaluacion={autoevaluacion} conteo={conteo} />}

                            {/* 4. Origen del documento, en simple (sin UUID ni hash) */}
                            <p className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-[10px] leading-snug text-slate-600 print:border-slate-300 print:bg-transparent">
                                Documento preparado con CheckITSE a partir de la autoevaluación de tu local (código{' '}
                                <strong className="font-mono text-slate-900">{codigoDocumento}</strong>). Revisa que los datos sean correctos antes de
                                firmarlo.
                            </p>

                            {/* 5. Espacio Formal de Firmas y Cargo de Mesa de Partes */}
                            <section className="pt-6 print:pt-4">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 print:gap-4">
                                    {/* Cuadro izquierdo: Firma del Administrado */}
                                    <div className="flex min-h-[140px] flex-col justify-between rounded-lg border border-slate-400 p-4 text-center print:border-black">
                                        <div className="flex h-16 items-end justify-center border-b border-dashed border-slate-300 pb-1">
                                            <span className="text-[9px] text-slate-400 italic print:hidden">
                                                (Firma del administrado / representante legal)
                                            </span>
                                        </div>
                                        <div className="space-y-0.5 pt-2 text-[10px]">
                                            <strong className="block text-slate-900 uppercase">{nombreTitularFirma}</strong>
                                            <span className="block text-slate-600">DNI / RUC: {autoevaluacion?.ruc || '____________________'}</span>
                                            <span className="block text-[9px] text-slate-500">Administrado / Titular del Establecimiento</span>
                                        </div>
                                    </div>

                                    {/* Cuadro derecho: Sello de Cargo Mesa de Partes */}
                                    <div className="flex min-h-[140px] flex-col justify-between rounded-lg border-2 border-slate-800 bg-slate-50/30 p-3 text-left print:border-black print:bg-transparent">
                                        <div className="border-b border-slate-200 pb-1 text-center">
                                            <strong className="block text-[10px] tracking-wider text-slate-900 uppercase">
                                                Sello de Cargo — Mesa de Partes
                                            </strong>
                                            <span className="block text-[9px] text-slate-500">Municipalidad Provincial de Huancayo</span>
                                        </div>
                                        <div className="space-y-1 py-2 font-mono text-[10px] text-slate-700">
                                            <div>N° Expediente: _________________________</div>
                                            <div>Fecha y Hora: __________________________</div>
                                            <div>Folios: __________ Firma Receptor: ______</div>
                                        </div>
                                        <div className="border-t border-slate-200 pt-1 text-center text-[8.5px] text-slate-400 italic">
                                            Espacio reservado para trámite documentario municipal
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 6. Pie Legal Institucional */}
                            <footer className="border-t border-slate-300 pt-3 text-center text-[9.5px] leading-relaxed text-slate-500 print:text-[8.5px]">
                                <p className="font-semibold text-slate-700">
                                    Plantilla orientativa prellenada con fines preventivos de autoevaluación ciudadana · CheckITSE Huancayo (D.S. N°
                                    002-2018-PCM)
                                </p>
                                <p className="mt-0.5 text-slate-400">
                                    Este modelo reproduce los campos normativos para facilitar la preparación del administrado. No emitido ni sellado
                                    por la Municipalidad Provincial de Huancayo.
                                </p>
                            </footer>
                        </div>
                    </article>
                )}
            </main>

            <HojaModeloAnexo
                isOpen={modalHojaModeloAbierto}
                onClose={() => setModalHojaModeloAbierto(false)}
                autoevaluacion={autoevaluacion}
                clasificacion={construirClasificacionHojaModelo(clasificacion, riesgoTramite, esExAnte)}
                condicionesConformes={filtrarCondicionesConformes(condiciones)}
            />
        </div>
    );
}
