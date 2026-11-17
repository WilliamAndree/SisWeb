import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Compass,
  Flame,
  Lightbulb,
  Scale,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface GuiaPedagogicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  codigo?: string;
  titulo?: string;
  explicacionCotidiana?: string;
  queObservar?: string;
  correcto?: string[];
  incorrecto?: string[];
  normaBase?: string | null;
  articuloReferencia?: string | null;
}

/**
 * Diagrama técnico con líneas de cota para Pozo de Puesta a Tierra (R ≤ 25 Ω).
 */
function DiagramaPozoTierra() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-[#F5F5F7] p-4 text-slate-800">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Zap className="h-4 w-4 text-amber-500" />
          Croquis Técnico Normativo: Pozo a Tierra (CNE Regla 060.712)
        </span>
        <span className="rounded-full bg-emerald-50 border border-emerald-300 px-3 py-0.5 text-[11px] font-black text-emerald-800 shadow-2xs">
          Exigencia CIP: R ≤ 25 Ω
        </span>
      </div>

      <div className="w-full overflow-hidden rounded-xl bg-[#F5F5F7] border border-slate-300/80 p-3 shadow-2xs">
        <svg
          viewBox="0 0 540 280"
          className="w-full h-auto text-slate-700 font-sans select-none"
          aria-label="Diagrama de inspección técnica de pozo a tierra"
        >
          <defs>
            <marker id="arrow-pt" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#94a3b8" />
            </marker>
            <pattern id="hatch-suelo-pt" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#cbd5e1" strokeWidth="1.2" />
            </pattern>
          </defs>

          {/* Terreno / Estrato de suelo */}
          <rect x="25" y="70" width="490" height="195" fill="url(#hatch-suelo-pt)" stroke="#94a3b8" strokeDasharray="3 3" />
          <line x1="15" y1="70" x2="525" y2="70" stroke="#94a3b8" strokeWidth="2.5" />
          <text x="25" y="62" fontSize="10" fontWeight="bold" fill="#64748b">Nivel de Piso Terminado (N.P.T. ±0.00)</text>

          {/* Excavación cilíndrica del pozo con tratamiento químico */}
          <rect x="180" y="70" width="180" height="190" fill="#fef3c7" fillOpacity="0.45" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
          <text x="195" y="175" fontSize="9" fill="#92400e" fontStyle="italic">Tierra vegetal cernida +</text>
          <text x="195" y="188" fontSize="9" fill="#92400e" fontStyle="italic">dosis de sales/gel conductivo</text>

          {/* Caja de registro con tapa inspeccionable en el suelo */}
          <rect x="205" y="52" width="130" height="36" fill="#ffffff" stroke="#475569" strokeWidth="2" rx="4" />
          <rect x="215" y="52" width="110" height="10" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
          <text x="232" y="60" fontSize="7.5" fontWeight="bold" fill="#475569">TAPA DE REGISTRO</text>
          <text x="225" y="80" fontSize="10" fontWeight="extrabold" fill="#0f172a">POZO A TIERRA</text>

          {/* Conductor de cobre desde el tablero general */}
          <path d="M 60 40 L 268 40 L 268 90" fill="none" stroke="#eab308" strokeWidth="3" />
          <text x="60" y="32" fontSize="9.5" fontWeight="bold" fill="#b45309">Conductor Cu hacia Tablero Eléctrico</text>

          {/* Conector tipo AB de bronce */}
          <circle cx="268" cy="95" r="7" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
          <text x="282" y="98" fontSize="9" fontWeight="bold" fill="#78350f">Conector AB de bronce</text>

          {/* Electrodo / Varilla vertical de cobre */}
          <rect x="265" y="95" width="6" height="160" fill="#f59e0b" stroke="#b45309" strokeWidth="1" rx="2" />
          <text x="278" y="145" fontSize="9.5" fontWeight="bold" fill="#92400e">Varilla Cu 5/8&quot; x 2.40 m</text>

          {/* Línea de Cota Vertical: Profundidad h >= 2.40 m en slate-400 */}
          <line x1="385" y1="70" x2="385" y2="255" stroke="#94a3b8" strokeWidth="1.5" markerStart="url(#arrow-pt)" markerEnd="url(#arrow-pt)" />
          <line x1="360" y1="70" x2="395" y2="70" stroke="#94a3b8" strokeWidth="1" />
          <line x1="360" y1="255" x2="395" y2="255" stroke="#94a3b8" strokeWidth="1" />
          <text x="398" y="160" fontSize="11" fontWeight="bold" fill="#334155">h ≥ 2.40 m</text>
          <text x="398" y="174" fontSize="8.5" fill="#64748b">(Profundidad de varilla)</text>

          {/* Línea de Cota Horizontal: Diámetro de pozo en slate-400 */}
          <line x1="180" y1="266" x2="360" y2="266" stroke="#94a3b8" strokeWidth="1.5" markerStart="url(#arrow-pt)" markerEnd="url(#arrow-pt)" />
          <line x1="180" y1="260" x2="180" y2="272" stroke="#94a3b8" strokeWidth="1" />
          <line x1="360" y1="260" x2="360" y2="272" stroke="#94a3b8" strokeWidth="1" />
          <text x="228" y="262" fontSize="9" fontWeight="bold" fill="#334155">Ø = 0.80 m a 1.00 m</text>

          {/* Recuadro Técnico Oficial: R <= 25 Ohmios */}
          <rect x="35" y="185" width="130" height="58" rx="10" fill="#ffffff" stroke="#34C759" strokeWidth="2" />
          <text x="45" y="205" fontSize="8.5" fontWeight="bold" fill="#065f46" letterSpacing="0.5">RESISTENCIA MÁXIMA</text>
          <text x="45" y="230" fontSize="18" fontWeight="black" fill="#34C759">R ≤ 25 Ω</text>
        </svg>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
        <strong className="text-slate-900 block mb-0.5">Condiciones técnicas reglamentarias de puesta a tierra (CNE / D.S. N° 002-2018-PCM):</strong>
        1. Valor de resistencia menor o igual a 25 Ohmios comprobado con telurómetro calibrado.
        <br />
        2. Protocolo de medición de puesta a tierra vigente (antigüedad máxima de 1 año) firmado por Ingeniero Electricista o Mecánico-Electricista colegiado y habilitado (CIP).
        <br />
        3. Tapa de registro visible en el piso, rotulada y con conector AB libre de sulfatación o suciedad.
      </div>
    </div>
  );
}

/**
 * Diagrama técnico para Extintores de Seguridad (CRIT-01 / CRIT-02A).
 */
function DiagramaExtintores() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-[#F5F5F7] p-4 text-slate-800">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Flame className="h-4 w-4 text-rose-500" />
          Croquis Técnico: Instalación de Extintor PQS / Clase K (NTP 350.043-1)
        </span>
        <span className="rounded-full bg-rose-50 border border-rose-300 px-3 py-0.5 text-[11px] font-black text-rose-800 shadow-2xs">
          Altura máx: 1.50 m
        </span>
      </div>

      <div className="w-full overflow-hidden rounded-xl bg-[#F5F5F7] border border-slate-300/80 p-3 shadow-2xs">
        <svg
          viewBox="0 0 540 250"
          className="w-full h-auto text-slate-700 font-sans select-none"
          aria-label="Diagrama de instalación de extintores"
        >
          <defs>
            <marker id="arrow-ext" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Pared y piso */}
          <line x1="20" y1="220" x2="520" y2="220" stroke="#94a3b8" strokeWidth="2.5" />
          <text x="25" y="238" fontSize="10" fontWeight="bold" fill="#64748b">Nivel de Piso Terminado (N.P.T.)</text>
          <line x1="160" y1="20" x2="160" y2="220" stroke="#cbd5e1" strokeWidth="4" />

          {/* Señal Fotoluminiscente superior */}
          <rect x="220" y="30" width="70" height="40" fill="#dc2626" rx="4" stroke="#991b1b" strokeWidth="1.5" />
          <text x="232" y="47" fontSize="9" fontWeight="bold" fill="#ffffff">EXTINTOR</text>
          <rect x="245" y="52" width="20" height="14" fill="#ffffff" rx="2" />

          {/* Soporte y Extintor */}
          <rect x="238" y="95" width="34" height="85" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" rx="10" />
          <rect x="250" y="80" width="10" height="15" fill="#475569" rx="2" />
          <circle cx="264" cy="85" r="4" fill="#34C759" stroke="#15803d" strokeWidth="1" />
          <text x="282" y="90" fontSize="9" fontWeight="bold" fill="#15803d">Manómetro en franja verde</text>

          {/* Tarjeta de inspección anual */}
          <rect x="278" y="115" width="26" height="36" fill="#ffffff" stroke="#d97706" strokeWidth="1" rx="2" />
          <text x="312" y="128" fontSize="9" fontWeight="bold" fill="#92400e">Tarjeta anual de recarga</text>
          <text x="312" y="140" fontSize="8" fill="#64748b">Vigencia menor a 1 año</text>

          {/* Línea de Cota a la manija (h <= 1.50 m) en slate-400 */}
          <line x1="195" y1="95" x2="195" y2="220" stroke="#94a3b8" strokeWidth="1.5" markerStart="url(#arrow-ext)" markerEnd="url(#arrow-ext)" />
          <line x1="185" y1="95" x2="245" y2="95" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
          <text x="120" y="155" fontSize="11" fontWeight="bold" fill="#334155">h ≤ 1.50 m</text>
          <text x="108" y="168" fontSize="8" fill="#64748b">(A la manija de disparo)</text>

          {/* Línea de Cota a la señalética (h = 1.80 m) en slate-400 */}
          <line x1="390" y1="30" x2="390" y2="220" stroke="#94a3b8" strokeWidth="1.5" markerStart="url(#arrow-ext)" markerEnd="url(#arrow-ext)" />
          <line x1="290" y1="30" x2="400" y2="30" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
          <text x="402" y="125" fontSize="11" fontWeight="bold" fill="#334155">h = 1.80 m</text>
          <text x="402" y="138" fontSize="8" fill="#64748b">(Señalética visible)</text>
        </svg>
      </div>
    </div>
  );
}

/**
 * Diagrama técnico para Tableros Eléctricos y Mandil (CRIT-06 / CRIT-07 / CRIT-14A).
 */
function DiagramaTableroElectrico() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-[#F5F5F7] p-4 text-slate-800">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Zap className="h-4 w-4 text-amber-500" />
          Croquis Técnico: Tablero Eléctrico y Espacio Frontal (CNE Regla 020.024)
        </span>
        <span className="rounded-full bg-amber-50 border border-amber-300 px-3 py-0.5 text-[11px] font-black text-amber-900 shadow-2xs">
          Cota Libre: d ≥ 1.00 m
        </span>
      </div>

      <div className="w-full overflow-hidden rounded-xl bg-[#F5F5F7] border border-slate-300/80 p-3 shadow-2xs">
        <svg
          viewBox="0 0 540 260"
          className="w-full h-auto text-slate-700 font-sans select-none"
          aria-label="Diagrama técnico de tablero eléctrico y espacio frontal continuo"
        >
          <defs>
            <marker id="arrow-te" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Muro / Pared de soporte y Piso terminado */}
          <line x1="20" y1="225" x2="520" y2="225" stroke="#94a3b8" strokeWidth="2.5" />
          <text x="25" y="242" fontSize="9.5" fontWeight="bold" fill="#64748b">Nivel de Piso Terminado (N.P.T.)</text>
          <line x1="90" y1="20" x2="90" y2="225" stroke="#cbd5e1" strokeWidth="4" />

          {/* Gabinete metálico del Tablero Eléctrico */}
          <rect x="92" y="35" width="85" height="125" fill="#f8fafc" stroke="#334155" strokeWidth="2" rx="4" />
          <rect x="98" y="42" width="73" height="110" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          <text x="103" y="52" fontSize="7" fontWeight="bold" fill="#0f172a">TABLERO GENERAL</text>

          {/* Mandil protector interior (Cubre-cables) */}
          <rect x="104" y="58" width="61" height="88" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" rx="2" />

          {/* Interruptores Termomagnéticos (ITM) */}
          <rect x="110" y="66" width="16" height="22" fill="#0f172a" rx="2" />
          <rect x="130" y="66" width="16" height="22" fill="#0f172a" rx="2" />

          {/* Interruptor Diferencial (ID 30 mA) con botón de test T */}
          <rect x="110" y="98" width="22" height="26" fill="#1d4ed8" rx="2" />
          <circle cx="125" cy="104" r="2.5" fill="#ffffff" />
          <text x="123" y="106" fontSize="5" fontWeight="bold" fill="#1d4ed8">T</text>
          <rect x="136" y="98" width="22" height="26" fill="#1d4ed8" rx="2" />
          <circle cx="151" cy="104" r="2.5" fill="#ffffff" />

          {/* Indicaciones técnicas */}
          <text x="190" y="76" fontSize="9.5" fontWeight="bold" fill="#0f172a">Mandil protector (Cubre-bornes vivos)</text>
          <text x="190" y="88" fontSize="8" fill="#64748b">No deben existir cables pelados ni orificios abiertos</text>

          <text x="190" y="112" fontSize="9.5" fontWeight="bold" fill="#1d4ed8">Interruptor Diferencial 30 mA (Botón &quot;T&quot;)</text>
          <text x="190" y="124" fontSize="8" fill="#64748b">Corta fugas a tierra en milisegundos</text>

          {/* Señal de Riesgo Eléctrico exterior */}
          <polygon points="135,142 145,158 125,158" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
          <text x="133" y="155" fontSize="7" fontWeight="bold" fill="#000000">⚡</text>

          {/* Cota vertical de altura al centro del tablero en slate-400 */}
          <line x1="70" y1="95" x2="70" y2="225" stroke="#94a3b8" strokeWidth="1.5" markerStart="url(#arrow-te)" markerEnd="url(#arrow-te)" />
          <line x1="60" y1="95" x2="92" y2="95" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
          <text x="15" y="155" fontSize="10" fontWeight="bold" fill="#334155">h = 1.60 m</text>
          <text x="22" y="168" fontSize="8" fill="#64748b">(Al centro)</text>

          {/* Zona de Trabajo Demarcada en el Suelo */}
          <rect x="177" y="215" width="200" height="10" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" strokeDasharray="6 3" />
          <text x="195" y="222" fontSize="7" fontWeight="bold" fill="#854d0e">ZONA DE SEGURIDAD ELÉCTRICA EN PISO</text>

          {/* Línea de Cota Horizontal Técnica: d >= 1.00 m en slate-400 */}
          <line x1="177" y1="195" x2="377" y2="195" stroke="#94a3b8" strokeWidth="1.5" markerStart="url(#arrow-te)" markerEnd="url(#arrow-te)" />
          <line x1="177" y1="160" x2="177" y2="202" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
          <line x1="377" y1="160" x2="377" y2="202" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />

          {/* Badge de cota obligatoria */}
          <rect x="220" y="170" width="115" height="20" rx="5" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
          <text x="232" y="184" fontSize="11" fontWeight="extrabold" fill="#0f172a">d ≥ 1.00 m frontal</text>
          <text x="205" y="210" fontSize="8.5" fontWeight="bold" fill="#dc2626">Despejado sin estantes, cajas ni mercadería</text>
        </svg>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
        <strong className="text-slate-900 block mb-0.5">Condiciones técnicas verificadas en una ITSE oficial:</strong>
        1. Espacio frontal de maniobra de mínimo 1.00 metro de profundidad totalmente libre de mercadería, estantes o cajas.
        <br />
        2. Mandil o contratapa interior colocada, tapando borneras y barras vivas; solo deben asomar las palancas operables.
        <br />
        3. Interruptor diferencial de 30 mA operativo (se prueba pulsando el botón &quot;T&quot; de disparo) en circuitos de tomacorrientes.
        <br />
        4. Identificación o rotulado claro en cada interruptor termomagnético y señal de advertencia de riesgo eléctrico pegada al exterior.
      </div>
    </div>
  );
}

/**
 * Diagrama técnico para Arquitectura y Rutas de Evacuación (CRIT-03 / CRIT-04).
 */
function DiagramaEvacuacionPuerta() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-[#F5F5F7] p-4 text-slate-800">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Compass className="h-4 w-4 text-blue-500" />
          Croquis Técnico: Vía de Evacuación y Puerta de Escape (RNE A.010 / A.130)
        </span>
        <span className="rounded-full bg-blue-50 border border-blue-300 px-3 py-0.5 text-[11px] font-black text-blue-800 shadow-2xs">
          Ancho libre: a ≥ 0.90 m
        </span>
      </div>

      <div className="w-full overflow-hidden rounded-xl bg-[#F5F5F7] border border-slate-300/80 p-3 shadow-2xs">
        <svg
          viewBox="0 0 540 230"
          className="w-full h-auto text-slate-700 font-sans select-none"
          aria-label="Diagrama técnico de puerta de escape y ancho libre de evacuación"
        >
          <defs>
            <marker id="arrow-ev" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Piso de evacuación */}
          <line x1="20" y1="200" x2="520" y2="200" stroke="#94a3b8" strokeWidth="2.5" />
          <text x="25" y="218" fontSize="9.5" fontWeight="bold" fill="#64748b">Vía de Evacuación Continua hacia la Vía Pública</text>

          {/* Vano y Marco de Puerta */}
          <rect x="190" y="40" width="160" height="160" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
          <rect x="200" y="48" width="140" height="152" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />

          {/* Hoja de Puerta abierta hacia afuera (sentido de escape) */}
          <path d="M 340 48 L 410 25 L 410 177 L 340 200 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
          <text x="350" y="110" fontSize="9" fontWeight="bold" fill="#0f172a" transform="rotate(-18 350,110)">Apertura hacia el exterior</text>

          {/* Señal de SALIDA verde fotoluminiscente */}
          <rect x="235" y="22" width="70" height="20" fill="#15803d" stroke="#166534" strokeWidth="1" rx="3" />
          <text x="250" y="36" fontSize="10" fontWeight="bold" fill="#ffffff">SALIDA ➜</text>

          {/* Manija simple o Barra antipánico */}
          <line x1="210" y1="125" x2="330" y2="125" stroke="#dc2626" strokeWidth="3" />
          <text x="220" y="142" fontSize="8.5" fontWeight="bold" fill="#991b1b">Barra antipánico (si aforo &gt; 100)</text>

          {/* Línea de Cota de Ancho Libre: a >= 0.90 m a 1.20 m en slate-400 */}
          <line x1="200" y1="175" x2="340" y2="175" stroke="#94a3b8" strokeWidth="1.5" markerStart="url(#arrow-ev)" markerEnd="url(#arrow-ev)" />
          <text x="235" y="168" fontSize="10.5" fontWeight="extrabold" fill="#0f172a">a ≥ 0.90 m libre</text>
        </svg>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
        <strong className="text-slate-900 block mb-0.5">Regla de seguridad in situ:</strong>
        1. Las puertas de escape nunca deben tener candados o cerrojos cerrados durante la atención al público.
        <br />
        2. Giro obligatorio en sentido de evacuación (hacia afuera) en locales con aforo superior a 50 personas.
        <br />
        3. Ancho de pasadizos despejado, sin mercadería ni cajas obstaculizando el paso.
      </div>
    </div>
  );
}

/**
 * Selector descriptivo del croquis técnico según el código del criterio normativo.
 */
function CroquisSegunCriterio({
  codigo,
  titulo,
}: Readonly<{ codigo?: string; titulo?: string }>) {
  const cod = (codigo || '').toUpperCase();
  const text = (titulo || '').toLowerCase();

  if (cod === 'CRIT-05' || text.includes('pozo') || text.includes('puesta a tierra') || text.includes('25 ohm')) {
    return <DiagramaPozoTierra />;
  }

  if (cod === 'CRIT-01' || cod === 'CRIT-02' || cod === 'CRIT-02A' || text.includes('extintor')) {
    return <DiagramaExtintores />;
  }

  if (cod === 'CRIT-06' || cod === 'CRIT-07' || cod === 'CRIT-14A' || text.includes('tablero') || text.includes('mandil')) {
    return <DiagramaTableroElectrico />;
  }

  if (cod === 'CRIT-03' || cod === 'CRIT-04' || text.includes('puerta') || text.includes('evacuación') || text.includes('pasadizo')) {
    return <DiagramaEvacuacionPuerta />;
  }

  return null;
}

export function GuiaPedagogicaModal({
  isOpen,
  onClose,
  codigo,
  titulo,
  explicacionCotidiana,
  queObservar,
  correcto = [],
  incorrecto = [],
  normaBase,
  articuloReferencia,
}: Readonly<GuiaPedagogicaModalProps>) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4 text-left">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-900">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Guía Visual y Técnica Cívica
            </span>
            {codigo && (
              <span className="rounded-lg bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                {codigo}
              </span>
            )}
          </div>
          <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
            {titulo || '¿Cómo verificar esta condición en tu local?'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-normal">
            Orientación preventiva y parámetros técnicos para la autoevaluación ciudadana ITSE en Huancayo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Croquis Técnico Vectorial Ilustrativo */}
          <CroquisSegunCriterio codigo={codigo} titulo={titulo} />

          {/* 1. En palabras sencillas */}
          {explicacionCotidiana && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-950">
                <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                <span>¿Por qué me piden esto? (En palabras sencillas)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {explicacionCotidiana}
              </p>
            </div>
          )}

          {/* 2. Cuadrícula comparativa: Correcto vs. Incorrecto (Sin emojis) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Columna Conforme (Correcto) */}
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/30 p-4.5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-950 border-b border-emerald-200 pb-2">
                <CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Condición Conforme (Correcto)
                </span>
              </div>
              {correcto.length > 0 ? (
                <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  {correcto.map((punto) => (
                    <li key={punto} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#34C759]" />
                      <span>{punto}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Verifica que el componente cumpla con las especificaciones técnicas del manual.
                </p>
              )}
            </div>

            {/* Columna Alerta (Incorrecto) */}
            <div className="rounded-2xl border border-rose-300 bg-rose-50/30 p-4.5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-950 border-b border-rose-200 pb-2">
                <AlertTriangle className="h-4 w-4 text-[#FF3B30] shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Señales de Alerta (Incorrecto)
                </span>
              </div>
              {incorrecto.length > 0 ? (
                <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  {incorrecto.map((punto) => (
                    <li key={punto} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF3B30]" />
                      <span>{punto}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Cualquier daño físico, obstrucción o falta de mantenimiento genera observación técnica.
                </p>
              )}
            </div>
          </div>

          {/* 3. Qué observar durante la inspección */}
          {queObservar && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                <span>Qué inspecciona la autoridad técnica CENEPRED en tu local:</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {queObservar}
              </p>
            </div>
          )}

          {/* 4. Pie con Base Normativa y Botón de Cierre */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4 text-xs">
            {(normaBase || articuloReferencia) ? (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Scale className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  Base técnica: <strong className="text-slate-800">{normaBase}</strong> {articuloReferencia ? `(${articuloReferencia})` : ''}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">
                Referencia normativa: CENEPRED / D.S. N° 002-2018-PCM
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
            >
              Entendido, volver a la pregunta
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
