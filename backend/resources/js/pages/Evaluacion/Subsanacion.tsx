import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { GuiaModal } from '@/components/GuiaModal';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { ProveedoresCercanosModal } from '@/components/ProveedoresCercanosModal';
import { EvidenciaUploadModal } from '@/components/EvidenciaUploadModal';
import { ModalConfirmarReevaluacion } from '@/components/ModalConfirmarReevaluacion';
import {
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  UploadCloud,
  FileCheck,
  Save,
  MapPin,
  RefreshCw,
  Clock,
  Camera,
  Info,
} from 'lucide-react';

type EstadoSubsanacion = 'PENDIENTE' | 'EN_PROCESO' | 'SUBSANADO_DECLARADO';

interface SubsanacionItem {
  id: number;
  codigo_item: string;
  descripcion: string;
  observacion?: string;
  evidencia_url?: string;
  estado: EstadoSubsanacion;
  fecha_subsanacion?: string;
  created_at: string;
}

interface SimulacionData {
  id: number;
  codigo_revision: string;
  total_observaciones: number;
  resultado: string;
  detalle_revision?: Record<string, boolean>;
  subsanaciones: SubsanacionItem[];
}

interface ChecklistItem {
  codigo: string;
  nombre: string;
  norma?: string;
}

interface AutoevaluacionData {
  id: number;
  uuid_trazabilidad: string;
  nombre_comercio: string;
  ruc: string;
  sector_huancayo: string;
  tipo_tramite?: string | null;
  semaforo?: string;
  detalle_checklist: ChecklistItem[];
}

interface Props {
  readonly autoevaluacion: AutoevaluacionData;
  readonly ultimaRevision?: SimulacionData;
}

const OPCIONES_ESTADO: Array<{
  valor: EstadoSubsanacion;
  etiqueta: string;
  detalle: string;
  activo: string;
}> = [
  {
    valor: 'PENDIENTE',
    etiqueta: 'Pendiente',
    detalle: 'Aún no inicias la adecuación.',
    activo: 'bg-neutral-200 text-neutral-800 ring-1 ring-neutral-300',
  },
  {
    valor: 'EN_PROCESO',
    etiqueta: 'En Proceso',
    detalle: 'Adecuación en curso o parcial.',
    activo: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300',
  },
  {
    valor: 'SUBSANADO_DECLARADO',
    etiqueta: 'Declarado Subsanado',
    detalle: 'Completado y respaldado por ti.',
    activo: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
  },
];

export default function Subsanacion({ autoevaluacion, ultimaRevision }: Readonly<Props>) {
  const [showGuia, setShowGuia] = useState<boolean>(false);
  const [showGuardarProgreso, setShowGuardarProgreso] = useState<boolean>(false);
  const [showModalReevaluacion, setShowModalReevaluacion] = useState<boolean>(false);
  const [codigoProveedores, setCodigoProveedores] = useState<string | null>(null);
  const [itemActivoNombre, setItemActivoNombre] = useState<string | null>(null);
  const [codigoEvidencia, setCodigoEvidencia] = useState<string | null>(null);
  const { auth } = usePage().props as { auth?: { user: { id: number; name: string } | null } };
  const esInvitado = !auth?.user;

  const codigosObservados = ultimaRevision?.detalle_revision
    ? Object.keys(ultimaRevision.detalle_revision).filter(
        k => ultimaRevision.detalle_revision![k] === false
      )
    : [];

  const itemsParaSubsanar = autoevaluacion.detalle_checklist.filter(i =>
    codigosObservados.includes(i.codigo)
  );

  const subsanacionesRealizadas = ultimaRevision?.subsanaciones || [];

  const estadoOperativo = ultimaRevision?.resultado === 'SIN_OBSERVACIONES';

  const itemEvidencia = itemsParaSubsanar.find(i => i.codigo === codigoEvidencia);
  const subEvidencia = subsanacionesRealizadas.find(s => s.codigo_item === codigoEvidencia);

  const cambiarEstadoItem = (codigo: string, nuevo: EstadoSubsanacion, sub?: SubsanacionItem) => {
    router.post(
      `/autoevaluacion/subsanacion/${autoevaluacion.uuid_trazabilidad}`,
      {
        codigo_item: codigo,
        descripcion_subsanacion:
          sub?.descripcion ?? 'Adecuación preventiva registrada desde el panel de la condición.',
        estado: nuevo,
      },
      { preserveScroll: true }
    );
  };

  const badgeEstado = (estado?: EstadoSubsanacion) => {
    switch (estado) {
      case 'SUBSANADO_DECLARADO':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Declarado Subsanado
          </span>
        );
      case 'EN_PROCESO':
        return (
          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-amber-700" /> En Proceso
          </span>
        );
      case 'PENDIENTE':
        return (
          <span className="bg-neutral-100 text-neutral-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-neutral-200 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
      default:
        return (
          <span className="bg-white text-neutral-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-neutral-200 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Sin declarar
          </span>
        );
    }
  };

  const renderBloqueOperativo = () => {
    if (estadoOperativo) {
      return (
        <div className="p-8 rounded-3xl bg-emerald-50 border border-emerald-200 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-emerald-950">Sin Observaciones Declaradas</h3>
          <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
            Tu última simulación de revisión no registró observaciones. Mantén tus condiciones al día para conservar un buen nivel de preparación.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowModalReevaluacion(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-50 px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Volver a evaluar establecimiento
            </button>
            <a
              href={`/autoevaluacion/informe/${autoevaluacion.uuid_trazabilidad}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 rounded-xl shadow-xs"
            >
              <FileCheck className="w-4 h-4" /> Generar Informe de Autoevaluación
            </a>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Tarjetas por condición observada */}
        <div className="space-y-4">
          {itemsParaSubsanar.map(item => {
            const sub = subsanacionesRealizadas.find(s => s.codigo_item === item.codigo);

            return (
              <div
                key={item.codigo}
                className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-neutral-800 text-xs">{item.codigo}</span>
                  {badgeEstado(sub?.estado)}
                </div>
                <h3 className="text-sm font-bold text-neutral-900 leading-snug -mt-1">{item.nombre}</h3>

                {sub?.descripcion && (
                  <p className="text-xs text-neutral-600 leading-relaxed">{sub.descripcion}</p>
                )}

                {sub?.evidencia_url && (
                  <a
                    href={`/autoevaluacion/subsanacion/${autoevaluacion.uuid_trazabilidad}/evidencia/${sub.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-danger-900 hover:underline"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Ver evidencia declarada
                  </a>
                )}

                {/* Cambio de estado reactivo */}
                <div>
                  <span className="block text-[11px] font-bold uppercase text-neutral-500 mb-1.5">
                    Estado declarado de tu adecuación
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {OPCIONES_ESTADO.map(opcion => {
                      const activo = sub?.estado === opcion.valor;

                      return (
                        <button
                          key={opcion.valor}
                          type="button"
                          onClick={() => cambiarEstadoItem(item.codigo, opcion.valor, sub)}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                            activo
                              ? `${opcion.activo} border-transparent`
                              : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                          }`}
                        >
                          <span className="text-xs font-bold block">{opcion.etiqueta}</span>
                          <span className="text-[10px] text-neutral-500 mt-0.5 block">{opcion.detalle}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Acciones de soporte */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => setCodigoEvidencia(item.codigo)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {sub?.evidencia_url ? 'Actualizar evidencia' : 'Subir evidencia'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCodigoProveedores(item.codigo);
                      setItemActivoNombre(item.nombre);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-800 bg-primary-50/60 hover:bg-primary-50 border border-primary-200 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Buscar recursos cercanos en Huancayo
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Historial de Adecuaciones */}
        {subsanacionesRealizadas.length > 0 && (
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-neutral-900">Historial de tu Plan Preventivo</h3>
            <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden">
              {subsanacionesRealizadas.map(sub => (
                <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-bold text-neutral-800 text-xs">{sub.codigo_item}</span>
                      {badgeEstado(sub.estado)}
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">{sub.descripcion}</p>
                    {sub.observacion && (
                      <p className="text-[11px] text-neutral-400 mt-0.5">Nota: {sub.observacion}</p>
                    )}
                    {sub.evidencia_url && (
                      <a
                        href={`/autoevaluacion/subsanacion/${autoevaluacion.uuid_trazabilidad}/evidencia/${sub.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-danger-900 hover:underline"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Ver evidencia declarada
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                    {sub.fecha_subsanacion || sub.created_at}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <Head title={`Plan de Subsanación Preventiva - ${autoevaluacion.nombre_comercio}`} />
      <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />
      <ModalGuardarProgreso
        isOpen={showGuardarProgreso}
        onClose={() => setShowGuardarProgreso(false)}
        uuid={autoevaluacion.uuid_trazabilidad}
        establecimiento={autoevaluacion.nombre_comercio}
      />
      <ProveedoresCercanosModal
        isOpen={!!codigoProveedores}
        onClose={() => setCodigoProveedores(null)}
        codigo={codigoProveedores}
        nombreItem={itemActivoNombre}
        sectorRef={autoevaluacion.sector_huancayo}
      />
      {codigoEvidencia && (
        <EvidenciaUploadModal
          key={`${codigoEvidencia}-${subEvidencia?.estado ?? ''}-${subEvidencia?.descripcion ?? ''}`}
          isOpen
          onClose={() => setCodigoEvidencia(null)}
          uuid={autoevaluacion.uuid_trazabilidad}
          codigoItem={codigoEvidencia}
          nombreItem={itemEvidencia?.nombre}
          estadoInicial={subEvidencia?.estado ?? 'EN_PROCESO'}
          accionInicial={subEvidencia?.descripcion ?? ''}
        />
      )}
      <ModalConfirmarReevaluacion
        isOpen={showModalReevaluacion}
        onClose={() => setShowModalReevaluacion(false)}
        uuid={autoevaluacion.uuid_trazabilidad}
        nombreComercio={autoevaluacion.nombre_comercio}
      />

      <div className="max-w-4xl mx-auto space-y-6 text-left">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-danger-900 px-2.5 py-0.5 rounded-full border border-rose-100">
                Plan de Subsanación Preventiva
              </span>
              {ultimaRevision && (
                <span className="text-[10px] font-mono text-neutral-500 font-bold">
                  {ultimaRevision.codigo_revision}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-2">
              Registro de Adecuaciones Declaradas
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              {autoevaluacion.nombre_comercio} · RUC: <strong className="font-mono">{autoevaluacion.ruc}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowModalReevaluacion(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50/70 hover:bg-primary-50 border border-primary-200 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Volver a evaluar
            </button>

            <Link
              href={`/autoevaluacion/resultado/${autoevaluacion.uuid_trazabilidad}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-white border border-neutral-200 px-3.5 py-2 rounded-xl hover:bg-neutral-50 shadow-xs transition self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Resultado
            </Link>

            {esInvitado && (
              <button
                type="button"
                onClick={() => setShowGuardarProgreso(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-800 bg-primary-50/60 hover:bg-primary-50 border border-primary-100 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Save className="w-3.5 h-3.5" /> Guardar mi progreso para continuar después
              </button>
            )}
          </div>
        </div>

        {ultimaRevision && (
          <div
            role="note"
            aria-label="Naturaleza preventiva de las evidencias declaradas"
            className="mb-5 flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-[11px] leading-relaxed text-sky-900"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Las evidencias que adjuntes son <strong>declaradas por el ciudadano</strong> y respaldan tu
              adecuación con fines preventivos: no han sido verificadas oficialmente por la autoridad competente
              y se conservan en almacenamiento privado, accesible solo para ti.
            </p>
          </div>
        )}

        {!ultimaRevision ? (
          <div className="p-8 rounded-3xl bg-amber-50 border border-amber-200 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-700 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-amber-950">Sin Simulación de Revisión Previo</h3>
            <p className="text-xs text-amber-800 mt-1 max-w-md mx-auto">
              Primero realiza la simulación de revisión in situ para identificar las condiciones que requieren tu plan de preparación.
            </p>
            <Link
              href={`/autoevaluacion/revision/${autoevaluacion.uuid_trazabilidad}`}
              className="mt-4 inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-danger-900 hover:bg-danger-800 px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              Realizar Simulación de Revisión In Situ
            </Link>
          </div>
        ) : (
          renderBloqueOperativo()
        )}

      </div>
    </>
  );
}
