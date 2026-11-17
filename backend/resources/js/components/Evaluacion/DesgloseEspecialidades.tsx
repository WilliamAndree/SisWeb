import React from 'react';
import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Building2, Flame, Layers, Wrench, Zap } from 'lucide-react';

import type { DesgloseEspecialidades, EspecialidadDesglose } from '@/types/contrato';

/**
 * Orden fijo de presentación. El backend siempre entrega las cuatro claves, y
 * fijarlas aquí evita que el orden dependa del orden de inserción del JSON.
 */
const ORDEN_ESPECIALIDADES: Array<{
  clave: keyof DesgloseEspecialidades;
  Icono: LucideIcon;
  tono: string;
}> = [
  { clave: 'electricas', Icono: Zap, tono: 'text-amber-600 bg-amber-50' },
  { clave: 'incendios', Icono: Flame, tono: 'text-rose-600 bg-rose-50' },
  { clave: 'arquitectura', Icono: Building2, tono: 'text-sky-600 bg-sky-50' },
  { clave: 'estructuras', Icono: Layers, tono: 'text-slate-600 bg-slate-100' },
];

/**
 * Clases del badge contextual. `alertas === 0` significa que la disciplina no
 * tiene nada que corregir; cualquier alerta la deja en estado pendiente.
 */
const BADGE_ALERTA = 'border-rose-200 bg-rose-50 text-rose-700';
const BADGE_EN_ORDEN = 'border-emerald-200 bg-emerald-50 text-emerald-700';

function mensajeAlerta(alertas: number): string {
  return alertas === 1 ? '1 alerta pendiente' : `${alertas} alertas pendientes`;
}

interface Props {
  desglose: DesgloseEspecialidades;
  /**
   * `compacta` reduce cada fila a la essentials para las tarjetas de listado;
   * `detallada` añade el conteo de condiciones cumplidas y funciona en el
   * informe de resumen.
   */
  variante?: 'compacta' | 'detallada';
  className?: string;
}

/**
 * Desglose de las condiciones declaradas agrupadas por disciplina técnica ITSE.
 *
 * Es estrictamente aditivo: si el backend no entrega la prop, quien lo consume
 * decide no renderizar nada. Las condiciones `NO_APLICA` no aparecen aquí porque
 * no son condiciones evaluadas, y las aplicables aún sin declarar tampoco
 * (aún no tienen estado que agrupar).
 */
export function DesgloseEspecialidades({
  desglose,
  variante = 'detallada',
  className = '',
}: Readonly<Props>) {
  const filas = ORDEN_ESPECIALIDADES.map(({ clave, Icono, tono }) => ({
    clave,
    Icono,
    tono,
    grupo: desglose[clave] as EspecialidadDesglose | undefined,
  })).filter((fila): fila is { clave: keyof DesgloseEspecialidades; Icono: LucideIcon; tono: string; grupo: EspecialidadDesglose } =>
    Boolean(fila.grupo)
  );

  if (filas.length === 0) {
    return null;
  }

  return (
    <ul className={`grid grid-cols-1 gap-2 ${className}`}>
      {filas.map(({ clave, Icono, tono, grupo }) => {
        const enOrden = grupo.alertas === 0;

        return (
          <li
            key={clave}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs"
          >
            <span
              aria-hidden="true"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tono}`}
            >
              <Icono className="h-3.5 w-3.5" />
            </span>

            <span className="min-w-0 flex-1 text-xs font-bold text-slate-800">
              {grupo.nombre}
            </span>

            {variante === 'detallada' && (
              <span className="text-[11px] text-slate-500">
                <strong className="font-bold text-slate-700">{grupo.cumplidas}</strong>
                <span aria-hidden="true"> / </span>
                <span className="sr-only">de </span>
                {grupo.total} en orden
              </span>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${enOrden ? BADGE_EN_ORDEN : BADGE_ALERTA}`}
              >
                {enOrden ? 'En orden' : mensajeAlerta(grupo.alertas)}
              </span>

              {!enOrden && (
                <Link
                  href={route('directorio.index', { especialidad: clave })}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs"
                  title={`Ver especialistas de ${grupo.nombre} en el Directorio Cívico`}
                >
                  <Wrench className="h-3 w-3 text-slate-500" />
                  <span>Especialistas</span>
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default DesgloseEspecialidades;
