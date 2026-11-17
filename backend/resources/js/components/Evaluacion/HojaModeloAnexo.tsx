import { AlertTriangle, CheckCircle2, CheckSquare, Info, Printer, Sparkles, Square, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type ValorMetricoNullable = number | string | null;

export interface HojaModeloAnexoProps {
    isOpen: boolean;
    onClose: () => void;
    autoevaluacion?: {
        uuid?: string;
        uuid_trazabilidad?: string;
        nombre_comercio?: string;
        ruc?: string | null;
        direccion?: string | null;
        funcion_economica?: string | null;
        area_m2?: ValorMetricoNullable;
        pisos?: ValorMetricoNullable;
        aforo?: ValorMetricoNullable;
        usa_glp?: boolean | null;
        codigo_acceso?: string | null;
        caracteristicas_declaradas?: Record<string, unknown> | null;
    } | null;
    clasificacion?: {
        tipo_tramite?: string;
        nivel_riesgo?: string;
        es_previa?: boolean;
    } | null;
    resumen?: {
        nivel_riesgo?: string;
        tipo_tramite?: string;
        total_cumple_declarado?: number;
        total_pendiente_atender?: number;
        total_por_revisar?: number;
    } | null;
    condicionesConformes?: Array<{
        codigo: string;
        nombre: string;
        norma?: string;
    }>;
}

const CASO_EJEMPLO = {
    nombre_comercio: 'Cafetería y Panadería Dulce Mantaro',
    titular_nombre: 'María Elena Quispe Alanya',
    dni_ruc: '20608765432',
    condicion_solicitante: 'Conductor / Inquilino',
    direccion: 'Jr. Puno N° 450, Huancayo Centro',
    distrito: 'Huancayo, Junín',
    telefono: '964123456',
    correo: 'contacto@dulcemantaro.pe',
    funcion_economica: 'Cafetería, Pastelería y Venta de Pan',
    area_ocupada: '65.00 m²',
    area_techada: '65.00 m²',
    pisos: '1 piso',
    aforo: '28 personas',
    nivel_riesgo: 'Riesgo Medio (ITSE Posterior)',
    tipo_tramite: 'ITSE POSTERIOR',
    codigo_acceso: 'CHK-HYO-450',
};

const CONDICIONES_DEFECTO = [
    { codigo: 'CRIT-01', nombre: 'Extintores operativos con tarjeta de recarga vigente (NTP 350.043-1)' },
    { codigo: 'CRIT-05', nombre: 'Pozo de puesta a tierra con resistencia ≤ 25 Ω y protocolo CIP vigente' },
    { codigo: 'CRIT-06', nombre: 'Tablero eléctrico con interruptores termomagnéticos y diferencial de 30 mA' },
    { codigo: 'CRIT-02B', nombre: 'Señales de seguridad fotoluminiscentes y rutas de evacuación (NTP 399.010-1)' },
    { codigo: 'CRIT-08', nombre: 'Luces de emergencia autónomas operativas en vías de tránsito y salida' },
    { codigo: 'CRIT-03', nombre: 'Pasajes y puertas de evacuación libres de obstáculos con ancho reglamentario' },
];

const CASILLAS_CRITICAS = [
    { id: 1, label: '1. Áreas' },
    { id: 2, label: '2. Aforo' },
    { id: 3, label: '3. Solicitante' },
    { id: 4, label: '4. Riesgo' },
    { id: 5, label: '5. Giro' },
] as const;

type DatosHojaModelo = typeof CASO_EJEMPLO;

function determinarEsExAnte(clasificacion: HojaModeloAnexoProps['clasificacion'], resumen: HojaModeloAnexoProps['resumen']): boolean {
    return Boolean(
        clasificacion?.es_previa ||
            clasificacion?.tipo_tramite === 'EX_ANTE' ||
            clasificacion?.nivel_riesgo === 'ALTO_MUY_ALTO' ||
            resumen?.nivel_riesgo === 'ALTO_MUY_ALTO' ||
            resumen?.tipo_tramite === 'EX_ANTE',
    );
}

function obtenerFormatoPorDefecto(esExAnte: boolean): '4' | '1' {
    return esExAnte ? '1' : '4';
}

function textoDeclarado(valor: string | null | undefined, porDefecto: string): string {
    return valor || porDefecto;
}

function medidaDeclarada(valor: number | string | null | undefined, sufijo: string, porDefecto: string): string {
    return valor ? `${valor} ${sufijo}` : porDefecto;
}

function consolidarDatosHojaModelo(
    usarEjemplo: boolean,
    autoevaluacion: HojaModeloAnexoProps['autoevaluacion'],
    esExAntePorDefecto: boolean,
): DatosHojaModelo {
    if (usarEjemplo) {
        return CASO_EJEMPLO;
    }

    return {
        nombre_comercio: textoDeclarado(autoevaluacion?.nombre_comercio, 'Mi Establecimiento Comercial'),
        titular_nombre: textoDeclarado(autoevaluacion?.nombre_comercio, 'Por completar en físico'),
        dni_ruc: textoDeclarado(autoevaluacion?.ruc, 'Por completar en físico'),
        condicion_solicitante: 'Conductor / Inquilino (Marcar según corresponda)',
        direccion: textoDeclarado(autoevaluacion?.direccion, 'Dirección exacta en Huancayo / El Tambo / Chilca'),
        distrito: 'Huancayo, Junín',
        telefono: 'Por completar en físico',
        correo: 'Por completar en físico',
        funcion_economica: textoDeclarado(autoevaluacion?.funcion_economica, 'Actividad comercial exacta'),
        area_ocupada: medidaDeclarada(autoevaluacion?.area_m2, 'm²', 'Por completar'),
        area_techada: medidaDeclarada(autoevaluacion?.area_m2, 'm²', 'Por completar'),
        pisos: medidaDeclarada(autoevaluacion?.pisos, 'piso(s)', '1 piso'),
        aforo: medidaDeclarada(autoevaluacion?.aforo, 'personas', 'Por verificar'),
        nivel_riesgo: esExAntePorDefecto ? 'Riesgo Alto o Muy Alto (ITSE Previa)' : 'Riesgo Bajo o Medio (ITSE Posterior)',
        tipo_tramite: esExAntePorDefecto ? 'ITSE PREVIA' : 'ITSE POSTERIOR',
        codigo_acceso: textoDeclarado(autoevaluacion?.codigo_acceso, 'CHK-PROV'),
    };
}

function obtenerClaseCasillaCritica(casillaResaltada: number | null, idCasilla: number): string {
    return casillaResaltada === idCasilla ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400' : 'border-slate-200 bg-slate-50/70';
}

interface BarraSuperiorControlesProps {
    esAnexo4: boolean;
    usarEjemplo: boolean;
    onSelectFormato: (formato: '4' | '1') => void;
    onToggleEjemplo: () => void;
    onImprimir: () => void;
    onClose: () => void;
}

function BarraSuperiorControles({
    esAnexo4,
    usarEjemplo,
    onSelectFormato,
    onToggleEjemplo,
    onImprimir,
    onClose,
}: Readonly<BarraSuperiorControlesProps>) {
    return (
        <header className="no-print flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-5 py-4 text-white">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-emerald-300 uppercase">
                        <Sparkles className="h-3 w-3" />
                        DSS Ciudadano · Huancayo
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Guía Visual de Llenado Asistido</span>
                </div>
                <h2 id="hoja-modelo-modal-title" className="text-base font-black tracking-tight text-white sm:text-lg">
                    Plantilla Orientativa de Trabajo: {esAnexo4 ? 'Modelo Anexo 4 (Declaración Jurada)' : 'Modelo Anexo 1 / 9 (Solicitud de ITSE)'}
                </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {/* Selector de Anexo */}
                <div className="flex rounded-xl border border-slate-700 bg-slate-800 p-1 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => onSelectFormato('4')}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${
                            esAnexo4 ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Anexo 4 (Ex-Post)
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelectFormato('1')}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${
                            !esAnexo4 ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Anexo 1 / 9 (Ex-Ante)
                    </button>
                </div>

                {/* Switch de Datos (Ejemplo vs Declarados) */}
                <button
                    type="button"
                    onClick={onToggleEjemplo}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                    title="Alternar entre los datos calculados de tu autoevaluación y un caso modelo de Huancayo"
                >
                    {usarEjemplo ? (
                        <>
                            <ToggleRight className="h-4 w-4 text-emerald-400" />
                            <span className="font-bold text-emerald-300">Datos de Ejemplo</span>
                        </>
                    ) : (
                        <>
                            <ToggleLeft className="h-4 w-4 text-sky-400" />
                            <span className="font-bold text-sky-300">Mis Datos Declarados</span>
                        </>
                    )}
                </button>

                {/* Botón Imprimir */}
                <button
                    type="button"
                    onClick={onImprimir}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
                >
                    <Printer className="h-4 w-4" />
                    <span>Imprimir Hoja Modelo</span>
                </button>

                {/* Botón Cerrar */}
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                    aria-label="Cerrar modal"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
}

interface LeyendaCasillasCriticasProps {
    casillaResaltada: number | null;
    onToggleCasilla: (id: number) => void;
}

function LeyendaCasillasCriticas({ casillaResaltada, onToggleCasilla }: Readonly<LeyendaCasillasCriticasProps>) {
    return (
        <section aria-label="Casillas críticas para mesa de partes" className="no-print shrink-0 border-b border-amber-200 bg-amber-50/90 px-5 py-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div className="space-y-0.5">
                        <p className="text-xs font-bold text-amber-950">
                            5 Casillas Críticas de Mesa de Partes (Municipalidad Provincial de Huancayo)
                        </p>
                        <p className="text-[11px] leading-tight text-amber-800">
                            Haz clic en cualquiera de las 5 casillas críticas para ver el criterio exacto que evitará que ventanilla observe tu
                            expediente.
                        </p>
                    </div>
                </div>

                {/* Botonera de Casillas Críticas */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    {CASILLAS_CRITICAS.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => onToggleCasilla(c.id)}
                            className={`cursor-pointer rounded-lg border px-2.5 py-1 transition ${
                                casillaResaltada === c.id
                                    ? 'border-amber-700 bg-amber-600 text-white shadow-xs'
                                    : 'border-amber-300 bg-white text-amber-900 hover:bg-amber-100/70'
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}

interface MembreteInstitucionalHojaProps {
    esAnexo4: boolean;
    usarEjemplo: boolean;
    codigoAcceso: string;
}

function MembreteInstitucionalHoja({ esAnexo4, usarEjemplo, codigoAcceso }: Readonly<MembreteInstitucionalHojaProps>) {
    return (
        <header className="space-y-1 border-b-2 border-slate-900 pb-3 text-center">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-left">
                <div>
                    <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase">Municipalidad Provincial de Huancayo</h3>
                    <p className="text-[10px] font-semibold text-slate-600">Gerencia de Seguridad Ciudadana y Gestión del Riesgo de Desastres</p>
                    <p className="text-[9px] text-slate-500">Subgerencia de Gestión del Riesgo de Desastres e Inspecciones Técnicas (ITSE)</p>
                </div>
                <div className="text-right font-mono text-[9px] text-slate-500">
                    <span className="block font-bold text-slate-700">D.S. N° 002-2018-PCM</span>
                    <span>R.J. N° 016-2018-CENEPRED/J</span>
                </div>
            </div>

            {/* Título del Formato */}
            <div className="pt-2">
                <span className="inline-block rounded bg-slate-900 px-3 py-0.5 font-mono text-[11px] font-black tracking-widest text-white uppercase">
                    {esAnexo4 ? 'ANEXO 4 (HOJA MODELO DE ORIENTACIÓN)' : 'ANEXO 1 / 9 (HOJA MODELO DE ORIENTACIÓN)'}
                </span>
                <h1 className="mt-1 text-sm leading-snug font-black text-slate-900 uppercase sm:text-base">
                    {esAnexo4
                        ? 'DECLARACIÓN JURADA DE CUMPLIMIENTO DE LAS CONDICIONES DE SEGURIDAD EN LA EDIFICACIÓN'
                        : 'SOLICITUD DE INSPECCIÓN TÉCNICA DE SEGURIDAD EN EDIFICACIONES (ITSE)'}
                </h1>
                <p className="text-[10px] font-medium text-slate-600">
                    {esAnexo4
                        ? 'Procedimiento de ITSE Posterior (Riesgo Bajo o Riesgo Medio — Art. 14 del D.S. N° 002-2018-PCM)'
                        : 'Procedimiento de ITSE Previa (Riesgo Alto o Riesgo Muy Alto — Art. 21 del D.S. N° 002-2018-PCM)'}
                </p>
            </div>

            {/* Leyenda de Código de Referencia */}
            <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-1 text-[9.5px] text-slate-500">
                <span>
                    <strong>Folio Asistido:</strong> <span className="font-mono text-slate-800">{codigoAcceso}</span>
                </span>
                <span>
                    <strong>Modo:</strong>{' '}
                    <span className="font-semibold text-slate-700">{usarEjemplo ? 'Caso Ejemplo Huancayo' : 'Datos Declarados en CheckITSE'}</span>
                </span>
                <span>
                    <strong>Ubicación:</strong> Huancayo, Junín
                </span>
            </div>
        </header>
    );
}

interface SeccionCondicionesTecnicasProps {
    esAnexo4: boolean;
    listaCondiciones: Array<{ codigo: string; nombre: string; norma?: string }>;
}

function SeccionCondicionesTecnicas({ esAnexo4, listaCondiciones }: Readonly<SeccionCondicionesTecnicasProps>) {
    if (esAnexo4) {
        return (
            <section className="space-y-2 rounded-xl border border-slate-300 p-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <h4 className="text-[11px] font-black tracking-wider text-slate-900 uppercase">
                        III. Condiciones de Seguridad Verificadas (Pre-llenado de Cumplimiento)
                    </h4>
                    <span className="font-mono text-[10px] font-bold text-emerald-800">{listaCondiciones.length} condiciones conformes</span>
                </div>

                <p className="text-[10.5px] text-slate-600">
                    En el formato físico ante la municipalidad, marca con un aspa [X] en la columna <strong>CUMPLE</strong> en las siguientes
                    condiciones que registraste como conformes en tu autoevaluación:
                </p>

                <div className="space-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50/40 p-2.5">
                    {listaCondiciones.slice(0, 6).map((c) => (
                        <div
                            key={c.codigo}
                            className="flex items-start justify-between gap-2 border-b border-emerald-100 pb-1 text-[10.5px] last:border-none"
                        >
                            <div className="flex items-start gap-1.5">
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                <span className="text-slate-800">
                                    <strong className="font-mono text-slate-900">{c.codigo}:</strong> {c.nombre}
                                </span>
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black text-emerald-800">
                                [X] CUMPLE
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-2 rounded-xl border border-slate-300 p-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="text-[11px] font-black tracking-wider text-slate-900 uppercase">
                    III. Petitorio y Expediente Técnico Colegiado (ITSE Previa)
                </h4>
                <span className="font-mono text-[10px] font-bold text-sky-800">D.S. N° 002-2018-PCM</span>
            </div>

            <p className="text-[10.5px] leading-relaxed text-slate-600">
                Para locales de <strong>Riesgo Alto o Muy Alto</strong>, en la solicitud física debes marcar la opción{' '}
                <strong>ITSE Previa al inicio de actividades</strong> y adjuntar el expediente técnico con firmas colegiadas:
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1 text-[10.5px] sm:grid-cols-2">
                <div className="space-y-0.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <span className="block font-bold text-slate-900">📐 Planos de Arquitectura y Aforo</span>
                    <span className="block text-[10px] text-slate-600">Firmados y sellados por Arquitecto (CAP Habilitado).</span>
                </div>
                <div className="space-y-0.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <span className="block font-bold text-slate-900">⚡ Planos Eléctricos y Pozo a Tierra</span>
                    <span className="block text-[10px] text-slate-600">Firmados por Ing. Electricista/Mecánico (CIP Habilitado).</span>
                </div>
            </div>
        </section>
    );
}

export function HojaModeloAnexo({
    isOpen,
    onClose,
    autoevaluacion,
    clasificacion,
    resumen,
    condicionesConformes = [],
}: Readonly<HojaModeloAnexoProps>) {
    const esExAntePorDefecto = determinarEsExAnte(clasificacion, resumen);

    const [formatoActivo, setFormatoActivo] = useState<'4' | '1'>(obtenerFormatoPorDefecto(esExAntePorDefecto));
    const [usarEjemplo, setUsarEjemplo] = useState<boolean>(false);
    const [casillaResaltada, setCasillaResaltada] = useState<number | null>(null);

    // Sincronizar el formato inicial cuando cambia el estado de riesgo
    useEffect(() => {
        if (isOpen) {
            setFormatoActivo(obtenerFormatoPorDefecto(esExAntePorDefecto));
        }
    }, [isOpen, esExAntePorDefecto]);

    // Cerrar con Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const esAnexo4 = formatoActivo === '4';
    const datos = consolidarDatosHojaModelo(usarEjemplo, autoevaluacion, esExAntePorDefecto);
    const listaCondiciones = condicionesConformes.length > 0 ? condicionesConformes : CONDICIONES_DEFECTO;

    const imprimir = () => {
        window.print();
    };

    const alternarCasillaResaltada = (id: number) => {
        setCasillaResaltada((actual) => (actual === id ? null : id));
    };

    return (
        <dialog
            open
            aria-labelledby="hoja-modelo-modal-title"
            className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center overflow-y-auto border-0 bg-slate-900/75 p-2 backdrop-blur-xs sm:p-4 print:static print:overflow-visible print:bg-white print:p-0"
        >
            {/* Estilos CSS específicos para impresión A4 */}
            <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #hoja-modelo-imprimible, #hoja-modelo-imprimible * {
            visibility: visible !important;
          }
          #hoja-modelo-imprimible {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

            <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl print:max-h-none print:rounded-none print:border-none print:shadow-none">
                {/* BARRA SUPERIOR DE ACCIONES Y CONTROLES (NO IMPRIMIBLE) */}
                <BarraSuperiorControles
                    esAnexo4={esAnexo4}
                    usarEjemplo={usarEjemplo}
                    onSelectFormato={setFormatoActivo}
                    onToggleEjemplo={() => setUsarEjemplo(!usarEjemplo)}
                    onImprimir={imprimir}
                    onClose={onClose}
                />

                {/* LEYENDA VISUAL Y RESUMEN PEDAGÓGICO DE LAS 5 CASILLAS CRÍTICAS (NO IMPRIMIBLE) */}
                <LeyendaCasillasCriticas casillaResaltada={casillaResaltada} onToggleCasilla={alternarCasillaResaltada} />

                {/* CUERPO DEL FORMATO OFICIAL (SILUETA A4 INTERACTIVA E IMPRIMIBLE) */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8 print:overflow-visible print:bg-white print:p-0">
                    <article
                        id="hoja-modelo-imprimible"
                        className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-slate-300 bg-white p-6 shadow-lg sm:p-10 print:max-w-none print:border-none print:p-0 print:shadow-none"
                    >
                        {/* Membrete Institucional Oficial */}
                        <MembreteInstitucionalHoja esAnexo4={esAnexo4} usarEjemplo={usarEjemplo} codigoAcceso={datos.codigo_acceso} />

                        {/* SECCIÓN I: DATOS DEL ADMINISTRADO / SOLICITANTE */}
                        <section className="space-y-2 rounded-xl border border-slate-300 p-3.5 text-xs">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                <h4 className="text-[11px] font-black tracking-wider text-slate-900 uppercase">
                                    I. Datos del Administrado / Solicitante
                                </h4>
                                <span className="rounded-full border border-amber-300 bg-amber-100/70 px-2 py-0.5 text-[9.5px] font-bold text-amber-800">
                                    ✍️ ZONA GUÍA: Completar a mano
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 text-[11px] sm:grid-cols-2">
                                <div>
                                    <span className="block text-[10px] text-slate-500">Nombres y Apellidos / Razón Social:</span>
                                    <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50/50 p-1.5 font-bold text-slate-900">
                                        {datos.titular_nombre}
                                    </div>
                                </div>

                                <div>
                                    <span className="block text-[10px] text-slate-500">N° de DNI / RUC:</span>
                                    <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50/50 p-1.5 font-mono font-bold text-slate-900">
                                        {datos.dni_ruc}
                                    </div>
                                </div>

                                {/* CASILLA CRÍTICA 3: CONDICIÓN DEL SOLICITANTE */}
                                <div
                                    className={`rounded-xl border p-2.5 transition sm:col-span-2 ${obtenerClaseCasillaCritica(casillaResaltada, 3)}`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                        <span className="text-[11px] font-bold text-slate-700">Condición del Solicitante:</span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                                            🚩 Casilla Crítica #3
                                        </span>
                                    </div>

                                    {/* Opciones de condición */}
                                    <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[10.5px]">
                                        <label className="flex items-center gap-1.5 font-medium text-slate-700">
                                            <Square className="h-3.5 w-3.5 text-slate-400" />
                                            <span>Propietario del inmueble</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 font-bold text-emerald-900">
                                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                                            <span>Conductor / Inquilino / Administrador</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 font-medium text-slate-700">
                                            <Square className="h-3.5 w-3.5 text-slate-400" />
                                            <span>Representante Legal</span>
                                        </label>
                                    </div>

                                    {/* Tooltip / Nota Pedagógica Casilla 3 */}
                                    <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-white p-2 text-[10px] leading-relaxed text-amber-950">
                                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                        <span>
                                            <strong>Instrucción para Mesa de Partes:</strong> «Si alquilas el local, marca Conductor/Administrador.
                                            Solo marca Propietario si el inmueble es tuyo.»
                                        </span>
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <span className="block text-[10px] text-slate-500">Dirección Fiscal / Contacto en Huancayo:</span>
                                    <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50/50 p-1.5 text-slate-900">
                                        {datos.direccion}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECCIÓN II: DATOS DEL ESTABLECIMIENTO OBJETO DE INSPECCIÓN */}
                        <section className="space-y-3 rounded-xl border border-slate-300 p-3.5 text-xs">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                <h4 className="text-[11px] font-black tracking-wider text-slate-900 uppercase">
                                    II. Datos del Establecimiento Objeto de la ITSE
                                </h4>
                                <span className="rounded-full border border-sky-300 bg-sky-100/70 px-2 py-0.5 text-[9.5px] font-bold text-sky-800">
                                    🟦 DATOS TÉCNICOS PRECALCULADOS POR CHECKITSE
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 text-[11px] sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <span className="block text-[10px] text-slate-500">Nombre Comercial del Establecimiento:</span>
                                    <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-2 text-xs font-black text-slate-900">
                                        {datos.nombre_comercio}
                                    </div>
                                </div>

                                {/* CASILLA CRÍTICA 5: GIRO O ACTIVIDAD COMERCIAL */}
                                <div
                                    className={`rounded-xl border p-2.5 transition sm:col-span-2 ${obtenerClaseCasillaCritica(casillaResaltada, 5)}`}
                                >
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-[11px] font-bold text-slate-700">Giro o Actividad Económica:</span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                                            🚩 Casilla Crítica #5
                                        </span>
                                    </div>

                                    <div className="mt-1 rounded-lg border border-sky-300 bg-sky-50/90 p-2 font-bold text-sky-950">
                                        {datos.funcion_economica}
                                    </div>

                                    {/* Tooltip / Nota Pedagógica Casilla 5 */}
                                    <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-white p-2 text-[10px] leading-relaxed text-amber-950">
                                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                        <span>
                                            <strong>Instrucción para Mesa de Partes:</strong> «Escribe la actividad exacta tal como figura en tu
                                            solicitud de Licencia, no uses términos genéricos como &apos;Ventas varias&apos;».
                                        </span>
                                    </div>
                                </div>

                                {/* CASILLA CRÍTICA 1: ÁREA OCUPADA VS ÁREA TECHADA */}
                                <div
                                    className={`rounded-xl border p-2.5 transition sm:col-span-2 ${obtenerClaseCasillaCritica(casillaResaltada, 1)}`}
                                >
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-[11px] font-bold text-slate-700">Área del Establecimiento (Base vs. Techos):</span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                                            🚩 Casilla Crítica #1
                                        </span>
                                    </div>

                                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg border border-sky-300 bg-sky-50/90 p-2 text-center">
                                            <span className="block text-[10px] font-semibold text-slate-500">Área Ocupada (Piso):</span>
                                            <strong className="font-mono text-sm text-slate-900">{datos.area_ocupada}</strong>
                                        </div>
                                        <div className="rounded-lg border border-sky-300 bg-sky-50/90 p-2 text-center">
                                            <span className="block text-[10px] font-semibold text-slate-500">Área Techada Total:</span>
                                            <strong className="font-mono text-sm text-slate-900">{datos.area_techada}</strong>
                                        </div>
                                    </div>

                                    {/* Tooltip / Nota Pedagógica Casilla 1 */}
                                    <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-white p-2 text-[10px] leading-relaxed text-amber-950">
                                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                        <span>
                                            <strong>Instrucción para Mesa de Partes:</strong> «Área Ocupada es la base del piso; Área Techada es la
                                            suma de todos los techos/pisos que usas. Ambas deben coincidir con tu Licencia de Funcionamiento.»
                                        </span>
                                    </div>
                                </div>

                                {/* CASILLA CRÍTICA 2: AFORO MÁXIMO CALCULADO */}
                                <div className={`rounded-xl border p-2.5 transition ${obtenerClaseCasillaCritica(casillaResaltada, 2)}`}>
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-[11px] font-bold text-slate-700">Aforo Máximo de Personas:</span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                                            🚩 Casilla Crítica #2
                                        </span>
                                    </div>

                                    <div className="mt-1 rounded-lg border border-sky-300 bg-sky-50/90 p-2 text-center font-mono text-sm font-bold text-sky-950">
                                        {datos.aforo}
                                    </div>

                                    {/* Tooltip / Nota Pedagógica Casilla 2 */}
                                    <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-white p-2 text-[10px] leading-relaxed text-amber-950">
                                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                        <span>
                                            <strong>Instrucción para Mesa de Partes:</strong> «Copia este número exacto. Si tu restaurante supera 50
                                            personas, por norma no puedes usar Anexo 4, debes ir con Anexo 1.»
                                        </span>
                                    </div>
                                </div>

                                {/* CASILLA CRÍTICA 4: NIVEL DE RIESGO Y TIPO DE PROCEDIMIENTO */}
                                <div className={`rounded-xl border p-2.5 transition ${obtenerClaseCasillaCritica(casillaResaltada, 4)}`}>
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-[11px] font-bold text-slate-700">Nivel de Riesgo ITSE:</span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                                            🚩 Casilla Crítica #4
                                        </span>
                                    </div>

                                    <div className="mt-1 rounded-lg border border-sky-300 bg-sky-50/90 p-2 text-center text-xs font-bold text-sky-950">
                                        {datos.nivel_riesgo}
                                    </div>

                                    {/* Tooltip / Nota Pedagógica Casilla 4 */}
                                    <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-white p-2 text-[10px] leading-relaxed text-amber-950">
                                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                        <span>
                                            <strong>Instrucción para Mesa de Partes:</strong> «Copia el nivel que calculó el sistema. No lo alteres
                                            para evitar que ventanilla te rechace el expediente.»
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECCIÓN III: CONDICIONES TÉCNICAS DECLARADAS (ANEXO 4) O PETITORIO (ANEXO 1/9) */}
                        <SeccionCondicionesTecnicas esAnexo4={esAnexo4} listaCondiciones={listaCondiciones} />

                        {/* SECCIÓN IV: FIRMA Y HUELLA DACTILAR */}
                        <section className="space-y-3 rounded-xl border border-slate-300 p-4 text-xs">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                <h4 className="text-[11px] font-black tracking-wider text-slate-900 uppercase">
                                    IV. Declaración Jurada, Firma Manuscrita y Huella Dactilar
                                </h4>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9.5px] font-bold text-amber-800">✍️ ZONA DE FIRMA</span>
                            </div>

                            <p className="text-[10px] leading-snug text-slate-600">
                                El titular o representante legal debe firmar idéntico al DNI y estampar la huella dactilar del dedo índice derecho
                                sobre el formato impreso:
                            </p>

                            <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                                {/* Cuadro de Firma y Huella */}
                                <div className="space-y-2 rounded-xl border-2 border-dashed border-slate-400 bg-slate-50/50 p-4 text-center">
                                    <div className="flex h-14 items-end justify-center border-b border-dashed border-slate-300 pb-1">
                                        <span className="text-[10px] text-slate-400 italic">(Firma manuscrita idéntica al DNI)</span>
                                    </div>
                                    <div className="text-[10.5px]">
                                        <strong className="block text-slate-900">{datos.titular_nombre}</strong>
                                        <span className="block text-[10px] text-slate-600">DNI / RUC: {datos.dni_ruc}</span>
                                    </div>
                                </div>

                                {/* Cuadro de Huella Dactilar */}
                                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-400 bg-slate-50/50 p-3 text-center">
                                    <div className="flex h-16 w-12 items-center justify-center rounded border border-slate-300 bg-white text-[9px] text-slate-400">
                                        Huella
                                    </div>
                                    <span className="mt-1 text-[9.5px] font-semibold text-slate-600">Índice Derecho</span>
                                </div>
                            </div>
                        </section>

                        {/* Pie Legal Institucional de la Hoja Modelo */}
                        <footer className="space-y-0.5 border-t border-slate-200 pt-3 text-center text-[9.5px] text-slate-500">
                            <p className="font-semibold text-slate-700">
                                CheckITSE Huancayo — Herramienta Cívica y Académica de Apoyo al Administrado
                            </p>
                            <p>
                                Esta Hoja Modelo es un instrumento orientativo para guiar el llenado del formato oficial ante la Municipalidad
                                Provincial de Huancayo. No sustituye la presentación física ni el pago de derechos de trámite administrativo.
                            </p>
                        </footer>
                    </article>
                </div>

                {/* PIE DE CIERRE DEL MODAL (NO IMPRIMIBLE) */}
                <footer className="no-print flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                    <p className="text-xs text-slate-500">
                        Consejo: Imprime esta hoja guía y úsala como borrador mientras rellenas el formato físico que te entreguen en mesa de partes.
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={imprimir}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
                        >
                            <Printer className="h-4 w-4 text-emerald-400" />
                            <span>Imprimir Hoja Guía</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                        >
                            Cerrar
                        </button>
                    </div>
                </footer>
            </div>
        </dialog>
    );
}

export default HojaModeloAnexo;
