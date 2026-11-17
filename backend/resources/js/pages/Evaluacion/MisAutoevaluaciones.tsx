import type { DashboardKpis } from '@/pages/Dashboard/Dashboard';
import Dashboard from '@/pages/Dashboard/Dashboard';
import type { AutoevaluacionItem } from '@/types/contrato';

export interface MisAutoevaluacionesProps {
  readonly autoevaluaciones: readonly AutoevaluacionItem[];
  readonly records?: readonly AutoevaluacionItem[];
  readonly kpis?: DashboardKpis;
}

export default function MisAutoevaluaciones({
  autoevaluaciones = [],
  records,
  kpis,
}: Readonly<MisAutoevaluacionesProps>) {
  const items = records ?? autoevaluaciones;
  const total = items.length;
  const aprobados = items.filter(r => (r.porcentaje_cumplimiento ?? 0) >= 100).length;
  const observados = items.filter(r => (r.porcentaje_cumplimiento ?? 0) < 100).length;

  const dashboardKpis: DashboardKpis = kpis ?? {
    total_locales: total,
    aprobados,
    sin_observaciones: aprobados,
    observados,
    en_proceso: 0,
    riesgo_dominante: 'MEDIO',
  };

  return <Dashboard records={items} kpis={dashboardKpis} />;
}
