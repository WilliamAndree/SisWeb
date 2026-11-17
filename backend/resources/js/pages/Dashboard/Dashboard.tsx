import { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  Flame,
  Hash,
  MapPin,
  Plus,
  RotateCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wrench,
} from 'lucide-react';
import type { AutoevaluacionItem } from '@/types/contrato';
import { RegistrarLocalButton } from '@/components/RegistrarLocalButton';
import { formatearNivelRiesgo } from '@/lib/riesgo';

export interface DashboardKpis {
  readonly total_locales: number;
  readonly aprobados: number;
  readonly sin_observaciones?: number;
  readonly observados: number;
  readonly en_proceso: number;
  readonly riesgo_dominante: string;
}

export interface DashboardProps {
  readonly records: readonly AutoevaluacionItem[];
  readonly kpis: DashboardKpis;
}

const FOTOS_RESTAURANTES = [
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80',
] as const;

const FOTOS_BODEGAS = [
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=800&q=80',
] as const;

const FOTOS_ROPA = [
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80',
] as const;

const FOTOS_OFICINAS = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
] as const;

const FOTOS_GIMNASIOS = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=800&q=80',
] as const;

const FOTOS_TALLERES = [
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
] as const;

const FOTOS_GENERAL = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
] as const;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = Math.trunc(hash);
  }
  return Math.abs(hash);
}

function resolverFotoLocal(funcionEconomica?: string | null, seed?: string | number | null): string {
  const indice = seed ? hashSeed(String(seed)) : 0;
  const norm = (funcionEconomica ?? '').toLowerCase();

  if (
    norm.includes('restaurante') ||
    norm.includes('comida') ||
    norm.includes('cafeter') ||
    norm.includes('bar') ||
    norm.includes('panader')
  ) {
    return FOTOS_RESTAURANTES[indice % FOTOS_RESTAURANTES.length];
  }
  if (
    norm.includes('bodega') ||
    norm.includes('market') ||
    norm.includes('abarrote') ||
    norm.includes('comercio') ||
    norm.includes('tienda')
  ) {
    return FOTOS_BODEGAS[indice % FOTOS_BODEGAS.length];
  }
  if (
    norm.includes('ropa') ||
    norm.includes('boutique') ||
    norm.includes('textil') ||
    norm.includes('calzado')
  ) {
    return FOTOS_ROPA[indice % FOTOS_ROPA.length];
  }
  if (
    norm.includes('oficina') ||
    norm.includes('consultor') ||
    norm.includes('servicio') ||
    norm.includes('estudio') ||
    norm.includes('notar')
  ) {
    return FOTOS_OFICINAS[indice % FOTOS_OFICINAS.length];
  }
  if (norm.includes('gimnasio') || norm.includes('deporte') || norm.includes('fitness')) {
    return FOTOS_GIMNASIOS[indice % FOTOS_GIMNASIOS.length];
  }
  if (
    norm.includes('taller') ||
    norm.includes('industrial') ||
    norm.includes('mecanic') ||
    norm.includes('almacen') ||
    norm.includes('ferreter')
  ) {
    return FOTOS_TALLERES[indice % FOTOS_TALLERES.length];
  }
  return FOTOS_GENERAL[indice % FOTOS_GENERAL.length];
}

function resolverClaseRiesgo(nivel?: string | null): string {
  const norm = (nivel ?? '').toUpperCase();
  if (norm.includes('BAJO')) {
    return 'bg-emerald-500/90 text-white border-emerald-400';
  }
  if (norm.includes('MEDIO')) {
    return 'bg-amber-500/90 text-white border-amber-400';
  }
  if (norm.includes('ALTO') || norm.includes('MUY')) {
    return 'bg-rose-600/90 text-white border-rose-500';
  }
  return 'bg-slate-700/90 text-white border-slate-600';
}

interface LocalCardProps {
  readonly record: AutoevaluacionItem;
}

function LocalCard({ record }: Readonly<LocalCardProps>) {
  const [copiadoUuid, setCopiadoUuid] = useState(false);
  const [copiadoHash, setCopiadoHash] = useState(false);

  const clasificacion = record.clasificacion_estado ?? (
    record.estado !== 'REGISTRADA'
      ? 'EN_PROCESO'
      : ((record.porcentaje_cumplimiento ?? 0) >= 100 ? 'CONFORME' : 'OBSERVADO')
  );

  const esConforme = clasificacion === 'CONFORME';
  const esObservado = clasificacion === 'OBSERVADO';
  const esEnProceso = clasificacion === 'EN_PROCESO';

  const nivelRiesgo = record.nivel_riesgo ?? record.clasificacion_tramite?.nivel_riesgo ?? 'MEDIO';
  const claseRiesgo = resolverClaseRiesgo(nivelRiesgo);
  const fotoPortada = resolverFotoLocal(
    record.funcion_economica,
    record.uuid_trazabilidad ?? record.id ?? record.nombre_comercio
  );

  const conteo = record.conteo_condiciones ?? {
    total: 0,
    cumple: 0,
    no_cumple: 0,
    por_revisar: 0,
    na: 0,
  };

  let totalObservaciones = 0;
  if ((record.resumen_subsanaciones?.pendientes ?? 0) > 0) {
    totalObservaciones = record.resumen_subsanaciones.pendientes;
  } else {
    totalObservaciones = (conteo.no_cumple ?? 0) + (conteo.por_revisar ?? 0);
  }

  const copiarTexto = async (texto: string, setFn: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(texto);
      setFn(true);
      setTimeout(() => setFn(false), 2000);
    } catch {
      // Silencioso ante bloqueo de portapapeles
    }
  };

  let badgeEstadoBg = 'bg-emerald-500 text-white';
  let badgeEstadoTexto = 'CONFORME';
  let badgeIcono = <ShieldCheck className="h-3 w-3" aria-hidden="true" />;
  let circuloCumplimientoBg = 'bg-emerald-600 text-white border-emerald-400';

  if (esObservado) {
    badgeEstadoBg = 'bg-amber-500 text-white';
    badgeEstadoTexto = 'CON OBSERVACIONES';
    badgeIcono = <AlertTriangle className="h-3 w-3" aria-hidden="true" />;
    circuloCumplimientoBg = 'bg-amber-500 text-white border-amber-300';
  } else if (esEnProceso) {
    badgeEstadoBg = 'bg-slate-700 text-white';
    badgeEstadoTexto = 'EN PROCESO';
    badgeIcono = <Clock className="h-3 w-3" aria-hidden="true" />;
    circuloCumplimientoBg = 'bg-slate-700 text-white border-slate-500';
  }

  return (
    <article
      aria-label={`Expediente comercial de ${record.nombre_comercio}`}
      className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
    >
      {/* 1. Cabecera con Imagen Fotográfica y Overlays */}
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={fotoPortada}
          alt={`Fachada de ${record.nombre_comercio}`}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />

        {/* Gradiente oscuro cinematográfico */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-black/30" />

        {/* Badges superiores flotantes */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase shadow-xs ${badgeEstadoBg}`}
            >
              {badgeIcono}
              {badgeEstadoTexto}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/60 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
              <MapPin className="h-3 w-3 text-emerald-400" aria-hidden="true" />
              {record.sector_huancayo || 'Huancayo'}
            </span>

            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-xs ${claseRiesgo}`}
            >
              {formatearNivelRiesgo(nivelRiesgo)}
            </span>
          </div>

          <Link
            href={route('autoevaluacion.reevaluar', { uuid: record.uuid_trazabilidad })}
            aria-label={`Reevaluar ${record.nombre_comercio}`}
            title="Iniciar reevaluación preventiva"
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-xs transition hover:bg-white/40 active:scale-95"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Título del local e información en el pie de la foto */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1 drop-shadow-sm">
            <h3 className="truncate text-lg font-black tracking-tight text-white">
              {record.nombre_comercio}
            </h3>
            {(() => {
              const tieneDatosFisicos = (record.area_m2 ?? 0) > 0 || (record.aforo ?? 0) > 0;
              const datosFisicosTexto = tieneDatosFisicos
                ? [
                    (record.area_m2 ?? 0) > 0 ? `${record.area_m2} m²` : null,
                    (record.aforo ?? 0) > 0 ? `${record.aforo} pers.` : null,
                  ].filter(Boolean).join(' • ')
                : 'Datos del local por completar';

              return (
                <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-200">
                  {record.funcion_economica} • {datosFisicosTexto}
                </p>
              );
            })()}
          </div>

          {/* Círculo flotante de porcentaje */}
          <div
            className={`flex shrink-0 flex-col items-center justify-center rounded-2xl border px-2.5 py-1 text-center shadow-md backdrop-blur-xs ${circuloCumplimientoBg}`}
          >
            <span className="text-sm font-black leading-none tracking-tight">
              {record.porcentaje_cumplimiento}%
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/90">
              Cumpl.
            </span>
          </div>
        </div>
      </div>

      {/* 2. Cuerpo de la Tarjeta */}
      <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
        <div className="space-y-3.5">
          {/* Caja de alerta de estado */}
          {esConforme ? (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-950">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <div className="leading-tight">
                <strong className="font-bold">APTO PARA MESA DE PARTES</strong>
                <p className="text-[11px] text-emerald-800">
                  Condiciones técnicas de seguridad 100% conformes según autodeclaración.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="leading-tight">
                <strong className="font-bold">REQUIERE SUBSANACIÓN TÉCNICA</strong>
                <p className="text-[11px] text-amber-800">
                  Se detectaron {totalObservaciones} condiciones observadas pendientes de evidencia.
                </p>
              </div>
            </div>
          )}

          {/* Dirección y Condición de Gas */}
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="truncate">{record.direccion || 'Dirección no consignada'}</span>
            </div>

            <div className="flex items-center gap-1.5 truncate">
              <Flame
                className={`h-3.5 w-3.5 shrink-0 ${record.usa_glp ? 'text-amber-500' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              <span className="truncate font-medium">
                {record.usa_glp ? 'Gas GLP Declarado' : 'Sin instalación de Gas'}
              </span>
            </div>
          </div>

          {/* Barra de Progreso y Desglose */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
              <span>Cumplimiento normativo</span>
              <span className="text-slate-800 font-bold">
                {conteo.cumple} conformes de {conteo.total || record.area_m2 ? conteo.total : '-'}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  esConforme ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, record.porcentaje_cumplimiento))}%`,
                }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              {conteo.cumple} conformes • {conteo.no_cumple + conteo.por_revisar} observados • {conteo.na} no aplican
            </p>
          </div>

          {/* Detalles técnicos plegados */}
          <details className="group rounded-2xl border border-slate-200/60 bg-slate-50/80 p-2.5 text-[11px] font-mono text-slate-600 transition">
            <summary className="flex cursor-pointer items-center justify-between font-sans text-xs font-bold text-slate-600 hover:text-slate-900 select-none">
              <span>Detalles técnicos</span>
              <span className="text-[10px] font-normal text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>

            <div className="mt-2 space-y-1.5 border-t border-slate-200/60 pt-2 font-mono">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 truncate">
                  <Hash className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">Código: {record.uuid_trazabilidad.slice(0, 8)}...</span>
                </div>
                <button
                  type="button"
                  onClick={() => copiarTexto(record.uuid_trazabilidad, setCopiadoUuid)}
                  aria-label="Copiar código de expediente"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 cursor-pointer"
                >
                  {copiadoUuid ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiadoUuid ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              {record.hash_integridad && (
                <div className="flex items-center justify-between gap-1 text-slate-700">
                  <div className="flex items-center gap-1 truncate">
                    <Fingerprint className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      Firma: {record.hash_integridad.slice(0, 12)}...
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copiarTexto(record.hash_integridad!, setCopiadoHash)}
                    aria-label="Copiar firma"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 cursor-pointer"
                  >
                    {copiadoHash ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiadoHash ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              )}
            </div>
          </details>
        </div>

        {/* 3. Botones de Acción Inferiores */}
        <div className="border-t border-slate-100 pt-4 space-y-2">
          {/* Botón Primario */}
          <Link
            href={route('autoevaluacion.resumen', { uuid: record.uuid_trazabilidad })}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-[0.99]"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Ver Estado y Trazabilidad</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          {/* Botones Secundarios */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={route('autoevaluacion.checklist', { uuid: record.uuid_trazabilidad })}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
            >
              <ClipboardList className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Checklist
            </Link>

            <Link
              href={route('autoevaluacion.informe', { uuid: record.uuid_trazabilidad })}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
            >
              <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Informe
            </Link>

            <Link
              href={route('mis-autoevaluaciones.expediente', { uuid: record.uuid_trazabilidad })}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Expediente
            </Link>

            <a
              href={route('autoevaluacion.anexo', { uuid: record.uuid_trazabilidad })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
            >
              <ExternalLink className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>Anexos</span>
            </a>

            {!esConforme && totalObservaciones > 0 && (
              <Link
                href={route('autoevaluacion.subsanar_items', { uuid: record.uuid_trazabilidad })}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 active:scale-95"
              >
                <Wrench className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                <span>Subsanar ({totalObservaciones})</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard({ records, kpis }: Readonly<DashboardProps>) {
  const [busqueda, setBusqueda] = useState('');
  const [pestanaActiva, setPestanaActiva] = useState<'locales' | 'trazabilidad'>('locales');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'conformes' | 'observados'>('todos');

  // Promedio de cumplimiento global
  const promedioCumplimiento = useMemo(() => {
    if (records.length === 0) return 0;
    const suma = records.reduce((acc, r) => acc + (r.porcentaje_cumplimiento ?? 0), 0);
    return Math.round(suma / records.length);
  }, [records]);

  // Total de expedientes sellados con hash SHA-256
  const expedientesSellados = useMemo(() => {
    return records.filter((r) => Boolean(r.hash_integridad));
  }, [records]);

  // Filtro compuesto por texto y estado
  const localesFiltrados = useMemo(() => {
    let filtrados = [...records];

    if (filtroEstado === 'conformes') {
      filtrados = filtrados.filter((r) => (r.clasificacion_estado ?? '') === 'CONFORME');
    } else if (filtroEstado === 'observados') {
      filtrados = filtrados.filter((r) => (r.clasificacion_estado ?? '') === 'OBSERVADO');
    }

    if (!busqueda.trim()) {
      return filtrados;
    }

    const q = busqueda.toLowerCase();
    return filtrados.filter((r) => {
      const nombre = (r.nombre_comercio ?? '').toLowerCase();
      const ruc = (r.ruc ?? '').toLowerCase();
      const dir = (r.direccion ?? '').toLowerCase();
      const uuid = (r.uuid_trazabilidad ?? '').toLowerCase();
      return nombre.includes(q) || ruc.includes(q) || dir.includes(q) || uuid.includes(q);
    });
  }, [records, filtroEstado, busqueda]);

  return (
    <>
      <Head title="Panel del Contribuyente — CheckITSE" />

      <div className="space-y-6 sm:space-y-8">
        {/* Cabecera Principal */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/60">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                Autoevaluación ITSE Huancayo
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Panel Ciudadano
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitoreo y gestión de condiciones de seguridad ITSE de tus establecimientos comerciales en Huancayo.
            </p>
          </div>

          {records.length === 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <RegistrarLocalButton variant="large" />
            </div>
          )}
        </div>

        {/* 1. Métricas Superiores (3 Tarjetas KPI) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Tarjeta 1: Nivel de Cumplimiento Normativo */}
          <div className="flex flex-col justify-between h-full rounded-2xl p-5 border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Nivel de Cumplimiento Normativo
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tight text-slate-900">
                  {promedioCumplimiento}%
                </span>
                <span className="text-xs font-bold text-slate-500">promedio global</span>
              </div>

              {/* Barra de progreso */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${promedioCumplimiento}%` }}
                />
              </div>

              <p className="mt-2 text-xs font-semibold text-emerald-900">
                {kpis.aprobados} de {kpis.total_locales} {kpis.total_locales === 1 ? 'local con autoevaluación conforme' : 'locales con autoevaluación conforme'}
              </p>
            </div>
          </div>

          {/* Tarjeta 2: Locales con observaciones */}
          <div className="flex flex-col justify-between h-full rounded-2xl p-5 border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Locales con observaciones
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tight text-slate-900">
                  {kpis.observados}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {kpis.observados === 1 ? 'local por revisar' : 'locales por revisar'}
                </span>
              </div>

              {kpis.observados > 0 ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                  <p className="leading-relaxed">
                    <strong>Aviso preventivo:</strong> Tienes {kpis.observados} {kpis.observados === 1 ? 'local con condiciones por corregir' : 'locales con condiciones por corregir'} antes de solicitar tu inspección.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  Todos tus locales están al día sin observaciones pendientes.
                </p>
              )}
            </div>
          </div>

          {/* Tarjeta 3: Tus expedientes guardados */}
          <div className="flex flex-col justify-between h-full rounded-2xl p-5 border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Tus expedientes guardados
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tight text-slate-900">
                  {expedientesSellados.length}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {expedientesSellados.length === 1 ? 'expediente guardado' : 'expedientes guardados'}
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Tu información está guardada y protegida para respaldo de tu negocio.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Pestañas y Filtros */}
        <div className="space-y-6 sm:space-y-8">
          {/* Selector de pestañas principal */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setPestanaActiva('locales')}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                pestanaActiva === 'locales'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              <span>Mis Locales y Expedientes ITSE ({records.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setPestanaActiva('trazabilidad')}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                pestanaActiva === 'trazabilidad'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Fingerprint className="h-4 w-4" aria-hidden="true" />
              <span>Expedientes Guardados ({expedientesSellados.length})</span>
            </button>
          </div>

          {/* Barra de herramientas: Búsqueda, Filtros píldora y botón Nuevo Local */}
          {pestanaActiva === 'locales' && (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Buscador */}
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Buscar por nombre comercial, dirección o UUID..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                />
              </div>

              {/* Botones píldora de filtro rápido */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFiltroEstado('todos')}
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    filtroEstado === 'todos'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Todos ({records.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroEstado('conformes')}
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    filtroEstado === 'conformes'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Sin Observaciones ({kpis.aprobados})
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroEstado('observados')}
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    filtroEstado === 'observados'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Con Observaciones ({kpis.observados})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Cuadrícula de Tarjetas de Locales (grid 2 columnas) */}
        {pestanaActiva === 'locales' && (
          <div>
            {localesFiltrados.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8 sm:p-12 text-center">
                <Store className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
                <h3 className="mt-4 text-base font-bold text-slate-800">
                  {records.length === 0
                    ? 'Aún no tienes locales guardados en tu panel'
                    : 'No se encontraron locales que coincidan con la búsqueda'}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                  {records.length === 0
                    ? 'Al registrar un local podrás retomar tu autoevaluación y subsanar observaciones sin empezar de cero. Si ya realizaste una autoevaluación como invitado, puedes guardarla en tu panel iniciando sesión desde tu avance.'
                    : 'Prueba modificando los filtros o el texto de búsqueda.'}
                </p>
                {records.length === 0 && (
                  <div className="mt-6">
                    <RegistrarLocalButton variant="large" />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {localesFiltrados.map((record) => (
                  <LocalCard key={record.uuid_trazabilidad} record={record} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Expedientes Guardados */}
        {pestanaActiva === 'trazabilidad' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Expedientes Guardados con Respaldo Digital
                </h3>
                <p className="text-xs text-slate-500">
                  Registro seguro y protegido de tus autoevaluaciones según normativa ITSE.
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 font-mono text-xs font-bold text-white">
                {expedientesSellados.length} {expedientesSellados.length === 1 ? 'Expediente' : 'Expedientes'}
              </span>
            </div>

            {expedientesSellados.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Aún no tienes expedientes formalmente sellados con hash SHA-256. Finaliza una autoevaluación para generar el registro inmutable.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-2">Establecimiento</th>
                      <th className="py-3 px-2">UUID de Trazabilidad</th>
                      <th className="py-3 px-2">Hash SHA-256</th>
                      <th className="py-3 px-2">Fecha de Sellado</th>
                      <th className="py-3 px-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expedientesSellados.map((exp) => (
                      <tr key={exp.uuid_trazabilidad} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-2 font-bold text-slate-900">
                          {exp.nombre_comercio}
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-600 select-all">
                          {exp.uuid_trazabilidad.slice(0, 12)}...
                        </td>
                        <td className="py-3 px-2 font-mono font-semibold text-emerald-700 select-all">
                          {exp.hash_integridad?.slice(0, 16)}...
                        </td>
                        <td className="py-3 px-2 text-slate-500">
                          {exp.registrada_at || exp.fecha || '-'}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Link
                            href={route('mis-autoevaluaciones.expediente', { uuid: exp.uuid_trazabilidad })}
                            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Ver Expediente
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. Banner Inferior de Aliados Técnicos */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200/90 bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-950 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl space-y-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-800/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
                <Users className="h-3 w-3" aria-hidden="true" />
                Red de Profesionales Verificados
              </span>
              <h3 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                ¿Necesitas técnicos autorizados para tu establecimiento comercial?
              </h3>
              <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                Encuentra ingenieros colegiados, especialistas en puesta a tierra, electricistas certificados y proveedores de extintores homologados en Huancayo.
              </p>
            </div>

            <Link
              href={route('directorio.index')}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold text-emerald-950 shadow-md transition hover:bg-emerald-50 active:scale-95"
            >
              <Store className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>Directorio de Aliados Técnicos</span>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
