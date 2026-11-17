import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Info,
  Printer,
  Sparkles,
  Square,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';

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

function determinarEsExAnte(
  clasificacion: HojaModeloAnexoProps['clasificacion'],
  resumen: HojaModeloAnexoProps['resumen'],
): boolean {
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

function medidaDeclarada(
  valor: number | string | null | undefined,
  sufijo: string,
  porDefecto: string,
): string {
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
    direccion: textoDeclarado(
      autoevaluacion?.direccion,
      'Dirección exacta en Huancayo / El Tambo / Chilca',
    ),
    distrito: 'Huancayo, Junín',
    telefono: 'Por completar en físico',
    correo: 'Por completar en físico',
    funcion_economica: textoDeclarado(
      autoevaluacion?.funcion_economica,
      'Actividad comercial exacta',
    ),
    area_ocupada: medidaDeclarada(autoevaluacion?.area_m2, 'm²', 'Por completar'),
    area_techada: medidaDeclarada(autoevaluacion?.area_m2, 'm²', 'Por completar'),
    pisos: medidaDeclarada(autoevaluacion?.pisos, 'piso(s)', '1 piso'),
    aforo: medidaDeclarada(autoevaluacion?.aforo, 'personas', 'Por verificar'),
    nivel_riesgo: esExAntePorDefecto
      ? 'Riesgo Alto o Muy Alto (ITSE Previa)'
      : 'Riesgo Bajo o Medio (ITSE Posterior)',
    tipo_tramite: esExAntePorDefecto ? 'ITSE PREVIA' : 'ITSE POSTERIOR',
    codigo_acceso: textoDeclarado(autoevaluacion?.codigo_acceso, 'CHK-PROV'),
  };
}

function obtenerClaseCasillaCritica(casillaResaltada: number | null, idCasilla: number): string {
  return casillaResaltada === idCasilla
    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400'
    : 'border-slate-200 bg-slate-50/70';
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
    <header className="no-print bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="h-3 w-3" />
            DSS Ciudadano · Huancayo
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            Guía Visual de Llenado Asistido
          </span>
        </div>
        <h2 id="hoja-modelo-modal-title" className="text-base sm:text-lg font-black tracking-tight text-white">
          Plantilla Orientativa de Trabajo: {esAnexo4 ? 'Modelo Anexo 4 (Declaración Jurada)' : 'Modelo Anexo 1 / 9 (Solicitud de ITSE)'}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Selector de Anexo */}
        <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => onSelectFormato('4')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              esAnexo4
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Anexo 4 (Ex-Post)
          </button>
          <button
            type="button"
            onClick={() => onSelectFormato('1')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              !esAnexo4
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Anexo 1 / 9 (Ex-Ante)
          </button>
        </div>

        {/* Switch de Datos (Ejemplo vs Declarados) */}
        <button
          type="button"
          onClick={onToggleEjemplo}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
          title="Alternar entre los datos calculados de tu autoevaluación y un caso modelo de Huancayo"
        >
          {usarEjemplo ? (
            <>
              <ToggleRight className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300 font-bold">Datos de Ejemplo</span>
            </>
          ) : (
            <>
              <ToggleLeft className="h-4 w-4 text-sky-400" />
              <span className="text-sky-300 font-bold">Mis Datos Declarados</span>
            </>
          )}
        </button>

        {/* Botón Imprimir */}
        <button
          type="button"
          onClick={onImprimir}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          <span>Imprimir Hoja Modelo</span>
        </button>

        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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

function LeyendaCasillasCriticas({
  casillaResaltada,
  onToggleCasilla,
}: Readonly<LeyendaCasillasCriticasProps>) {
  return (
    <section
      aria-label="Casillas críticas para mesa de partes"
      className="no-print bg-amber-50/90 border-b border-amber-200 px-5 py-3 shrink-0"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-amber-950">
              5 Casillas Críticas de Mesa de Partes (Municipalidad Provincial de Huancayo)
            </p>
            <p className="text-[11px] text-amber-800 leading-tight">
              Haz clic en cualquiera de las 5 casillas críticas para ver el criterio exacto que evitará que ventanilla observe tu expediente.
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
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                casillaResaltada === c.id
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/70'
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

function MembreteInstitucionalHoja({
  esAnexo4,
  usarEjemplo,
  codigoAcceso,
}: Readonly<MembreteInstitucionalHojaProps>) {
  return (
    <header className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
      <div className="flex items-center justify-between text-left border-b border-slate-200 pb-2">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Municipalidad Provincial de Huancayo
          </h3>
          <p className="text-[10px] text-slate-600 font-semibold">
            Gerencia de Seguridad Ciudadana y Gestión del Riesgo de Desastres
          </p>
          <p className="text-[9px] text-slate-500">
            Subgerencia de Gestión del Riesgo de Desastres e Inspecciones Técnicas (ITSE)
          </p>
        </div>
        <div className="text-right font-mono text-[9px] text-slate-500">
          <span className="block font-bold text-slate-700">D.S. N° 002-2018-PCM</span>
          <span>R.J. N° 016-2018-CENEPRED/J</span>
        </div>
      </div>

      {/* Título del Formato */}
      <div className="pt-2">
        <span className="inline-block bg-slate-900 text-white font-mono text-[11px] font-black px-3 py-0.5 rounded tracking-widest uppercase">
          {esAnexo4 ? 'ANEXO 4 (HOJA MODELO DE ORIENTACIÓN)' : 'ANEXO 1 / 9 (HOJA MODELO DE ORIENTACIÓN)'}
        </span>
        <h1 className="text-sm sm:text-base font-black uppercase text-slate-900 mt-1 leading-snug">
          {esAnexo4
            ? 'DECLARACIÓN JURADA DE CUMPLIMIENTO DE LAS CONDICIONES DE SEGURIDAD EN LA EDIFICACIÓN'
            : 'SOLICITUD DE INSPECCIÓN TÉCNICA DE SEGURIDAD EN EDIFICACIONES (ITSE)'}
        </h1>
        <p className="text-[10px] text-slate-600 font-medium">
          {esAnexo4
            ? 'Procedimiento de ITSE Posterior (Riesgo Bajo o Riesgo Medio — Art. 14 del D.S. N° 002-2018-PCM)'
            : 'Procedimiento de ITSE Previa (Riesgo Alto o Riesgo Muy Alto — Art. 21 del D.S. N° 002-2018-PCM)'}
        </p>
      </div>

      {/* Leyenda de Código de Referencia */}
      <div className="flex items-center justify-between text-[9.5px] text-slate-500 pt-1 border-t border-dashed border-slate-200">
        <span>
          <strong>Folio Asistido:</strong>{' '}
          <span className="font-mono text-slate-800">{codigoAcceso}</span>
        </span>
        <span>
          <strong>Modo:</strong>{' '}
          <span className="font-semibold text-slate-700">
            {usarEjemplo ? 'Caso Ejemplo Huancayo' : 'Datos Declarados en CheckITSE'}
          </span>
        </span>
        <span>
          <strong>Ubicación:</strong>{' '}Huancayo, Junín
        </span>
      </div>
    </header>
  );
}

interface SeccionCondicionesTecnicasProps {
  esAnexo4: boolean;
  listaCondiciones: Array<{ codigo: string; nombre: string; norma?: string }>;
}

function SeccionCondicionesTecnicas({
  esAnexo4,
  listaCondiciones,
}: Readonly<SeccionCondicionesTecnicasProps>) {
  if (esAnexo4) {
    return (
      <section className="border border-slate-300 rounded-xl p-3.5 space-y-2 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
            III. Condiciones de Seguridad Verificadas (Pre-llenado de Cumplimiento)
          </h4>
          <span className="text-[10px] font-mono text-emerald-800 font-bold">
            {listaCondiciones.length} condiciones conformes
          </span>
        </div>

        <p className="text-[10.5px] text-slate-600">
          En el formato físico ante la municipalidad, marca con un aspa [X] en la columna <strong>CUMPLE</strong> en las siguientes condiciones que registraste como conformes en tu autoevaluación:
        </p>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-2.5 space-y-1.5">
          {listaCondiciones.slice(0, 6).map((c) => (
            <div
              key={c.codigo}
              className="flex items-start justify-between gap-2 text-[10.5px] border-b border-emerald-100 last:border-none pb-1"
            >
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-slate-800">
                  <strong className="font-mono text-slate-900">{c.codigo}:</strong>{' '}{c.nombre}
                </span>
              </div>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                [X] CUMPLE
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="border border-slate-300 rounded-xl p-3.5 space-y-2 text-xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
          III. Petitorio y Expediente Técnico Colegiado (ITSE Previa)
        </h4>
        <span className="text-[10px] font-mono text-sky-800 font-bold">
          D.S. N° 002-2018-PCM
        </span>
      </div>

      <p className="text-[10.5px] text-slate-600 leading-relaxed">
        Para locales de <strong>Riesgo Alto o Muy Alto</strong>, en la solicitud física debes marcar la opción <strong>ITSE Previa al inicio de actividades</strong> y adjuntar el expediente técnico con firmas colegiadas:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] pt-1">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-0.5">
          <span className="font-bold text-slate-900 block">📐 Planos de Arquitectura y Aforo</span>
          <span className="text-[10px] text-slate-600 block">Firmados y sellados por Arquitecto (CAP Habilitado).</span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-0.5">
          <span className="font-bold text-slate-900 block">⚡ Planos Eléctricos y Pozo a Tierra</span>
          <span className="text-[10px] text-slate-600 block">Firmados por Ing. Electricista/Mecánico (CIP Habilitado).</span>
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

  const [formatoActivo, setFormatoActivo] = useState<'4' | '1'>(
    obtenerFormatoPorDefecto(esExAntePorDefecto),
  );
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
  const listaCondiciones =
    condicionesConformes.length > 0 ? condicionesConformes : CONDICIONES_DEFECTO;

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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:static print:bg-white print:p-0 print:overflow-visible border-0 max-w-none max-h-none w-full h-full m-0"
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

      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
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
        <LeyendaCasillasCriticas
          casillaResaltada={casillaResaltada}
          onToggleCasilla={alternarCasillaResaltada}
        />

        {/* CUERPO DEL FORMATO OFICIAL (SILUETA A4 INTERACTIVA E IMPRIMIBLE) */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100 flex-1 print:p-0 print:bg-white print:overflow-visible">
          <article
            id="hoja-modelo-imprimible"
            className="mx-auto max-w-3xl bg-white border border-slate-300 p-6 sm:p-10 shadow-lg rounded-2xl print:border-none print:shadow-none print:p-0 print:max-w-none space-y-5"
          >
            {/* Membrete Institucional Oficial */}
            <MembreteInstitucionalHoja
              esAnexo4={esAnexo4}
              usarEjemplo={usarEjemplo}
              codigoAcceso={datos.codigo_acceso}
            />

            {/* SECCIÓN I: DATOS DEL ADMINISTRADO / SOLICITANTE */}
            <section className="border border-slate-300 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                  I. Datos del Administrado / Solicitante
                </h4>
                <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full">
                  ✍️ ZONA GUÍA: Completar a mano
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Nombres y Apellidos / Razón Social:</span>
                  <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50/50 p-1.5 font-bold text-slate-900">
                    {datos.titular_nombre}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">N° de DNI / RUC:</span>
                  <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50/50 p-1.5 font-mono font-bold text-slate-900">
                    {datos.dni_ruc}
                  </div>
                </div>

                {/* CASILLA CRÍTICA 3: CONDICIÓN DEL SOLICITANTE */}
                <div
                  className={`sm:col-span-2 rounded-xl p-2.5 transition border ${obtenerClaseCasillaCritica(
                    casillaResaltada,
                    3,
                  )}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-slate-700 font-bold text-[11px]">
                      Condición del Solicitante:
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      🚩 Casilla Crítica #3
                    </span>
                  </div>

                  {/* Opciones de condición */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[10.5px]">
                    <label className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Square className="h-3.5 w-3.5 text-slate-400" />
                      <span>Propietario del inmueble</span>
                    </label>
                    <label className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <CheckSquare className="h-4 w-4 text-emerald-600" />
                      <span>Conductor / Inquilino / Administrador</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Square className="h-3.5 w-3.5 text-slate-400" />
                      <span>Representante Legal</span>
                    </label>
                  </div>

                  {/* Tooltip / Nota Pedagógica Casilla 3 */}
                  <div className="mt-2 rounded-lg border border-amber-200 bg-white p-2 text-[10px] leading-relaxed text-amber-950 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Instrucción para Mesa de Partes:</strong>{' '}«Si alquilas el local, marca Conductor/Administrador. Solo marca Propietario si el inmueble es tuyo.»
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-500 block text-[10px]">Dirección Fiscal / Contacto en Huancayo:</span>
                  <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50/50 p-1.5 text-slate-900">
                    {datos.direccion}
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN II: DATOS DEL ESTABLECIMIENTO OBJETO DE INSPECCIÓN */}
            <section className="border border-slate-300 rounded-xl p-3.5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                  II. Datos del Establecimiento Objeto de la ITSE
                </h4>
                <span className="text-[9.5px] font-bold text-sky-800 bg-sky-100/70 border border-sky-300 px-2 py-0.5 rounded-full">
                  🟦 DATOS TÉCNICOS PRECALCULADOS POR CHECKITSE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block text-[10px]">Nombre Comercial del Establecimiento:</span>
                  <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-2 font-black text-slate-900 text-xs">
                    {datos.nombre_comercio}
                  </div>
                </div>

                {/* CASILLA CRÍTICA 5: GIRO O ACTIVIDAD COMERCIAL */}
                <div
                  className={`sm:col-span-2 rounded-xl p-2.5 transition border ${obtenerClaseCasillaCritica(
                    casillaResaltada,
                    5,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-700 font-bold text-[11px]">
                      Giro o Actividad Económica:
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      🚩 Casilla Crítica #5
                    </span>
                  </div>

                  <div className="mt-1 rounded-lg border border-sky-300 bg-sky-50/90 p-2 font-bold text-sky-950">
                    {datos.funcion_economica}
                  </div>

                  {/* Tooltip / Nota Pedagógica Casilla 5 */}
                  <div className="mt-2 rounded-lg border border-amber-200 bg-white p-2 text-[10px] leading-relaxed text-amber-950 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Instrucción para Mesa de Partes:</strong>{' '}«Escribe la actividad exacta tal como figura en tu solicitud de Licencia, no uses términos genéricos como &apos;Ventas varias&apos;».
                    </span>
                  </div>
                </div>

                {/* CASILLA CRÍTICA 1: ÁREA OCUPADA VS ÁREA TECHADA */}
                <div
                  className={`sm:col-span-2 rounded-xl p-2.5 transition border ${obtenerClaseCasillaCritica(
                    casillaResaltada,
                    1,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-700 font-bold text-[11px]">
                      Área del Establecimiento (Base vs. Techos):
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      🚩 Casilla Crítica #1
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <div className="rounded-lg border border-sky-300 bg-sky-50/90 p-2 text-center">
                      <span className="text-[10px] text-slate-500 font-semibold block">Área Ocupada (Piso):</span>
                      <strong className="text-sm font-mono text-slate-900">{datos.area_ocupada}</strong>
                    </div>
                    <div className="rounded-lg border border-sky-300 bg-sky-50/90 p-2 text-center">
                      <span className="text-[10px] text-slate-500 font-semibold block">Área Techada Total:</span>
                      <strong className="text-sm font-mono text-slate-900">{datos.area_techada}</strong>
                    </div>
                  </div>

                  {/* Tooltip / Nota Pedagógica Casilla 1 */}
                  <div className="mt-2 rounded-lg border border-amber-200 bg-white p-2 text-[10px] leading-relaxed text-amber-950 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Instrucción para Mesa de Partes:</strong>{' '}«Área Ocupada es la base del piso; Área Techada es la suma de todos los techos/pisos que usas. Ambas deben coincidir con tu Licencia de Funcionamiento.»
                    </span>
                  </div>
                </div>

                {/* CASILLA CRÍTICA 2: AFORO MÁXIMO CALCULADO */}
                <div
                  className={`rounded-xl p-2.5 transition border ${obtenerClaseCasillaCritica(
                    casillaResaltada,
                    2,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-700 font-bold text-[11px]">
                      Aforo Máximo de Personas:
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      🚩 Casilla Crítica #2
                    </span>
                  </div>

                  <div className="mt-1 rounded-lg border border-sky-300 bg-sky-50/90 p-2 font-mono font-bold text-sm text-sky-950 text-center">
                    {datos.aforo}
                  </div>

                  {/* Tooltip / Nota Pedagógica Casilla 2 */}
                  <div className="mt-2 rounded-lg border border-amber-200 bg-white p-2 text-[10px] leading-relaxed text-amber-950 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Instrucción para Mesa de Partes:</strong>{' '}«Copia este número exacto. Si tu restaurante supera 50 personas, por norma no puedes usar Anexo 4, debes ir con Anexo 1.»
                    </span>
                  </div>
                </div>

                {/* CASILLA CRÍTICA 4: NIVEL DE RIESGO Y TIPO DE PROCEDIMIENTO */}
                <div
                  className={`rounded-xl p-2.5 transition border ${obtenerClaseCasillaCritica(
                    casillaResaltada,
                    4,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-700 font-bold text-[11px]">
                      Nivel de Riesgo ITSE:
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      🚩 Casilla Crítica #4
                    </span>
                  </div>

                  <div className="mt-1 rounded-lg border border-sky-300 bg-sky-50/90 p-2 font-bold text-xs text-sky-950 text-center">
                    {datos.nivel_riesgo}
                  </div>

                  {/* Tooltip / Nota Pedagógica Casilla 4 */}
                  <div className="mt-2 rounded-lg border border-amber-200 bg-white p-2 text-[10px] leading-relaxed text-amber-950 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Instrucción para Mesa de Partes:</strong>{' '}«Copia el nivel que calculó el sistema. No lo alteres para evitar que ventanilla te rechace el expediente.»
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN III: CONDICIONES TÉCNICAS DECLARADAS (ANEXO 4) O PETITORIO (ANEXO 1/9) */}
            <SeccionCondicionesTecnicas
              esAnexo4={esAnexo4}
              listaCondiciones={listaCondiciones}
            />

            {/* SECCIÓN IV: FIRMA Y HUELLA DACTILAR */}
            <section className="border border-slate-300 rounded-xl p-4 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                  IV. Declaración Jurada, Firma Manuscrita y Huella Dactilar
                </h4>
                <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  ✍️ ZONA DE FIRMA
                </span>
              </div>

              <p className="text-[10px] text-slate-600 leading-snug">
                El titular o representante legal debe firmar idéntico al DNI y estampar la huella dactilar del dedo índice derecho sobre el formato impreso:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Cuadro de Firma y Huella */}
                <div className="rounded-xl border-2 border-dashed border-slate-400 p-4 text-center space-y-2 bg-slate-50/50">
                  <div className="h-14 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                    <span className="text-[10px] text-slate-400 italic">
                      (Firma manuscrita idéntica al DNI)
                    </span>
                  </div>
                  <div className="text-[10.5px]">
                    <strong className="block text-slate-900">{datos.titular_nombre}</strong>
                    <span className="text-slate-600 block text-[10px]">DNI / RUC: {datos.dni_ruc}</span>
                  </div>
                </div>

                {/* Cuadro de Huella Dactilar */}
                <div className="rounded-xl border-2 border-dashed border-slate-400 p-3 flex flex-col items-center justify-center text-center bg-slate-50/50">
                  <div className="h-16 w-12 border border-slate-300 rounded bg-white flex items-center justify-center text-[9px] text-slate-400">
                    Huella
                  </div>
                  <span className="text-[9.5px] text-slate-600 mt-1 font-semibold">
                    Índice Derecho
                  </span>
                </div>
              </div>
            </section>

            {/* Pie Legal Institucional de la Hoja Modelo */}
            <footer className="border-t border-slate-200 pt-3 text-center text-[9.5px] text-slate-500 space-y-0.5">
              <p className="font-semibold text-slate-700">
                CheckITSE Huancayo — Herramienta Cívica y Académica de Apoyo al Administrado
              </p>
              <p>
                Esta Hoja Modelo es un instrumento orientativo para guiar el llenado del formato oficial ante la Municipalidad Provincial de Huancayo. No sustituye la presentación física ni el pago de derechos de trámite administrativo.
              </p>
            </footer>
          </article>
        </div>

        {/* PIE DE CIERRE DEL MODAL (NO IMPRIMIBLE) */}
        <footer className="no-print bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500">
            Consejo: Imprime esta hoja guía y úsala como borrador mientras rellenas el formato físico que te entreguen en mesa de partes.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={imprimir}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
            >
              <Printer className="h-4 w-4 text-emerald-400" />
              <span>Imprimir Hoja Guía</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
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
