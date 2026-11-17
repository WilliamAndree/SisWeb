import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  FileText,
  Activity,
  Info,
} from 'lucide-react';

interface ChecklistItem {
  codigo: string;
  nombre: string;
  cumple: boolean;
  estado?: string;
  es_critico?: boolean;
  norma?: string;
}

interface SimulacionData {
  id: number;
  codigo_revision: string;
  total_observaciones: number;
  porcentaje_revision: number;
  metrica_gap: number;
  resultado: string;
  created_at: string;
  detalle_revision: Record<string, boolean>;
}

interface AutoevaluacionData {
  id: number;
  uuid_trazabilidad: string;
  hash_integridad?: string;
  nombre_comercio: string;
  funcion_economica: string;
  ruc: string;
  sector_huancayo: string;
  area_m2: number;
  pisos: number;
  aforo: number;
  usa_glp: boolean;
  tipo_tramite?: string | null;
  nivel_riesgo?: string | null;
  porcentaje_cumplimiento: number;
  semaforo: string;
  detalle_checklist: ChecklistItem[];
  simulaciones?: SimulacionData[];
}

interface Props {
  autoevaluacion: AutoevaluacionData;
}

export default function SimulacionRevision({ autoevaluacion }: Readonly<Props>) {
  // Verificaciones iniciales de la simulación: por defecto reflejan lo que el
  // ciudadano declaró como cumplido en su autoevaluación.
  const estadoInicial = autoevaluacion.detalle_checklist.reduce((acc, item) => {
    acc[item.codigo] = item.estado === 'CUMPLE' || item.cumple === true;
    return acc;
  }, {} as Record<string, boolean>);

  const [verificaciones, setVerificaciones] = useState<Record<string, boolean>>(estadoInicial);
  const [processing, setProcessing] = useState<boolean>(false);

  const itemsEvaluables = autoevaluacion.detalle_checklist.filter(i => i.estado !== 'NA');
  let totalObservaciones = 0;
  let conformesEnRevision = 0;

  itemsEvaluables.forEach(item => {
    const conformidadDeclarada = item.estado === 'CUMPLE' || item.cumple === true;
    const conformeEnSimulacion = verificaciones[item.codigo] ?? false;

    if (conformeEnSimulacion) {
      conformesEnRevision++;
    }

    if (conformidadDeclarada !== conformeEnSimulacion) {
      totalObservaciones++;
    }
  });

  const porcentajeRevision = itemsEvaluables.length > 0
    ? Math.round((conformesEnRevision / itemsEvaluables.length) * 100)
    : 100;

  const metricaGap = Math.round((autoevaluacion.porcentaje_cumplimiento - porcentajeRevision) * 10) / 10;

  const handleToggle = (codigo: string) => {
    setVerificaciones(prev => {
      const nuevo = { ...prev, [codigo]: !prev[codigo] };
      return nuevo;
    });
  };

  const handleGuardarRevision = (e: React.FormEvent) => {
    e.preventDefault();
    router.post(
      `/autoevaluacion/revision/${autoevaluacion.uuid_trazabilidad}`,
      {
        verificaciones,
        discrepancias: totalObservaciones,
      },
      {
        onStart: () => setProcessing(true),
        onFinish: () => setProcessing(false),
      }
    );
  };

  return (
    <>
      <Head title={`Simulación de Revisión In Situ - ${autoevaluacion.nombre_comercio}`} />

      {/* Barra de navegación contextual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full border border-primary-100">
            Simulación de Revisión In Situ
          </span>
          <p className="text-[11px] text-neutral-500 mt-1">
            Autoevaluación preventiva · Método de contraste GAP (PUCP)
          </p>
        </div>

        <Link
          href={`/autoevaluacion/resultado/${autoevaluacion.uuid_trazabilidad}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-white border border-neutral-200 px-3.5 py-2 rounded-xl hover:bg-neutral-50 shadow-xs transition self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Resultado
        </Link>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 text-left">

        {/* Cabecera del Establecimiento */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-danger-900 px-2.5 py-0.5 rounded-full border border-rose-100">
                Simulación de Revisión In Situ
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                UUID: {autoevaluacion.uuid_trazabilidad.substring(0, 13)}...
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-neutral-900 mt-2">
              {autoevaluacion.nombre_comercio}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              RUC: <strong className="font-mono text-neutral-700">{autoevaluacion.ruc}</strong> · Giro: <strong>{autoevaluacion.funcion_economica}</strong> · Sector: <strong>{autoevaluacion.sector_huancayo}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {autoevaluacion.tipo_tramite && (
              <div className="p-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase block">Trámite</span>
                <span className="text-xs font-extrabold text-neutral-900">
                  {autoevaluacion.tipo_tramite}
                </span>
              </div>
            )}
            <div className="p-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-neutral-400 uppercase block">Escala</span>
              <span className="text-xs font-extrabold text-neutral-900">
                {autoevaluacion.area_m2} m² / {autoevaluacion.pisos} P.
              </span>
            </div>
          </div>
        </div>

        {/* Aviso de naturaleza didáctica */}
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Esta herramienta te permite simular, por tu cuenta, una revisión in situ de tu establecimiento.
            El porcentaje resultante expresa tu <strong>nivel de preparación declarado</strong> según la
            simulación que realices; <strong>no es una probabilidad de aprobación</strong> ni un acta oficial
            de inspección.
          </p>
        </div>

        {/* Panel de Contraste GAP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-neutral-400 block">1. Autoevaluación Declarada</span>
            <span className="text-2xl font-extrabold text-neutral-900 mt-1 block">
              {autoevaluacion.porcentaje_cumplimiento}%
            </span>
            <span className="text-[11px] text-neutral-500">Condiciones que declaraste cumplir en tu autoevaluación.</span>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-neutral-400 block">2. Revisión In Situ Simulada</span>
            <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
              {porcentajeRevision}%
            </span>
            <span className="text-[11px] text-neutral-500">Resultado según la simulación que realizas ahora mismo.</span>
          </div>

          <div className={`border rounded-3xl p-5 shadow-xs ${
            metricaGap > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider block">3. Brecha de Preparación (GAP)</span>
              <Activity className="w-4 h-4 text-danger-900" />
            </div>
            <span className="text-2xl font-extrabold mt-1 block">
              {metricaGap > 0 ? `+${metricaGap}%` : `${metricaGap}%`}
            </span>
            <span className="text-[11px] leading-tight block mt-0.5">
              {metricaGap > 0
                ? 'Detectaste una brecha: hay condiciones que declaraste y que en la simulación no se mantienen.'
                : 'Coherencia: tu declaración coincide con la simulación que realizaste.'}
            </span>
          </div>
        </div>

        {/* Formulario de Revisión Simulada */}
        <form onSubmit={handleGuardarRevision} className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 pb-4 gap-2">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Matriz de Revisión In Situ Simulada</h3>
              <p className="text-xs text-neutral-500">
                Simula recorrer tu local: confirma solo aquello que verificarías físicamente como presente. Lo que no confirmes queda como observación de preparación.
              </p>
            </div>

            <span className={`text-xs font-extrabold px-3 py-1 rounded-xl border ${
              totalObservaciones > 0
                ? 'bg-rose-50 text-danger-900 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {totalObservaciones} Observación(es) de preparación
            </span>
          </div>

          <div className="divide-y divide-neutral-100">
            {autoevaluacion.detalle_checklist.map((item) => {
              const conformidadDeclarada = item.estado === 'CUMPLE' || item.cumple === true;
              const conformeEnSimulacion = verificaciones[item.codigo] ?? false;
              const hayObservacion = item.estado !== 'NA' && conformidadDeclarada !== conformeEnSimulacion;

              return (
                <div
                  key={item.codigo}
                  className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    hayObservacion ? 'bg-amber-50/40 -mx-4 px-4 rounded-2xl' : ''
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-neutral-400 font-mono">
                        {item.norma || item.codigo}
                      </span>
                      {item.es_critico && (
                        <span className="text-[9px] font-bold bg-rose-100 text-danger-900 px-2 py-0.5 rounded-full">
                          Falla Crítica
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-neutral-800 block">
                      {item.nombre}
                    </span>
                    <span className="text-[11px] text-neutral-400 mt-0.5 block">
                      Declarado por ciudadano: <strong className={conformidadDeclarada ? 'text-emerald-700' : 'text-danger-900'}>
                        {item.estado || (item.cumple ? 'CUMPLE' : 'NO CUMPLE')}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {hayObservacion && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-xl">
                        Observación
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggle(item.codigo)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition cursor-pointer ${
                        conformeEnSimulacion
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-rose-100 text-danger-900 border-rose-200'
                      }`}
                    >
                      {conformeEnSimulacion ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirmado</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Con observación</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón de Registro de la Simulación */}
          <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-neutral-500 text-left">
              Al registrar la simulación se generará un código preventivo <strong>PREV-ITSE-…</strong> con fines de seguimiento y preparación. No es un documento oficial.
            </div>

            <button
              type="submit"
              disabled={processing}
              className="inline-flex items-center justify-center gap-2 bg-danger-900 hover:bg-danger-800 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{processing ? 'Procesando Simulación...' : 'Registrar Simulación de Revisión'}</span>
            </button>
          </div>
        </form>

        {/* Historial de Simulaciones */}
        {autoevaluacion.simulaciones && autoevaluacion.simulaciones.length > 0 && (
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Historial de Simulaciones de Revisión</h3>
            <div className="space-y-3">
              {autoevaluacion.simulaciones.map(sim => (
                <div key={sim.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-mono font-bold text-danger-900 text-sm block">{sim.codigo_revision}</span>
                    <span className="text-neutral-500 text-[11px]">{sim.created_at}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase">Resultado</span>
                      <span className={`font-bold ${sim.resultado === 'SIN_OBSERVACIONES' ? 'text-emerald-700' : 'text-amber-800'}`}>
                        {sim.resultado === 'SIN_OBSERVACIONES' ? 'SIN OBSERVACIONES' : 'CON OBSERVACIONES'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase">% Revisión</span>
                      <span className="font-extrabold text-neutral-800">{sim.porcentaje_revision}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase">GAP</span>
                      <span className="font-extrabold text-neutral-800">{sim.metrica_gap}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase">Observaciones</span>
                      <span className="font-bold text-neutral-800">{sim.total_observaciones}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
