import type { CondicionChecklist, CondicionEvaluada, ConteoEstados } from '@/types/contrato';
import { getCategoriaNombre, getEstadoBadge } from '@/utils/normativaFormatters';
import { ClipboardList } from 'lucide-react';

interface FilaCondicionGenerica {
    codigo: string;
    titulo: string;
    especialidad: string;
    norma_referencial: string;
    estado_actual: string;
    es_critico?: boolean;
    notas?: string | null;
}

interface InformeMatrizCondicionesProps {
    readonly conteo: ConteoEstados;
    readonly condicionesEvaluadas?: CondicionEvaluada[];
    readonly condicionesChecklist?: CondicionChecklist[];
}

export function InformeMatrizCondiciones({
    conteo,
    condicionesEvaluadas,
    condicionesChecklist,
}: Readonly<InformeMatrizCondicionesProps>) {
    // Normalizar lista de condiciones priorizando las respuestas vivas
    const items: FilaCondicionGenerica[] =
        condicionesEvaluadas && condicionesEvaluadas.length > 0
            ? condicionesEvaluadas.map((c) => ({
                  codigo: c.codigo,
                  titulo: c.titulo,
                  especialidad: c.especialidad,
                  norma_referencial: c.norma_referencial,
                  estado_actual: c.estado_actual,
                  notas: c.notas,
              }))
            : (condicionesChecklist || []).map((c) => ({
                  codigo: c.codigo,
                  titulo: c.nombre,
                  especialidad: c.categoria,
                  norma_referencial: c.norma,
                  estado_actual: c.estado,
                  es_critico: c.es_critico,
              }));

    return (
        <section>
            <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                        Matriz Completa de Condiciones Evaluadas ({conteo.total})
                    </h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-500">
                    Diagnóstico Integral por Condición
                </span>
            </div>

            {/* Resumen cuantitativo por estado */}
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
                    <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                        Total
                    </span>
                    <span className="text-sm font-black text-slate-900">{conteo.total}</span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 text-center">
                    <span className="block text-[9px] font-bold tracking-wider text-emerald-600 uppercase">
                        Cumple
                    </span>
                    <span className="text-sm font-black text-emerald-600">{conteo.cumple}</span>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 text-center">
                    <span className="block text-[9px] font-bold tracking-wider text-rose-600 uppercase">
                        No Cumple
                    </span>
                    <span className="text-sm font-black text-rose-600">{conteo.no_cumple}</span>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 text-center">
                    <span className="block text-[9px] font-bold tracking-wider text-amber-600 uppercase">
                        Por Revisar
                    </span>
                    <span className="text-sm font-black text-amber-600">{conteo.por_revisar}</span>
                </div>
                <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-100/70 p-2.5 text-center sm:col-span-1">
                    <span className="block text-[9px] font-bold tracking-wider text-slate-600 uppercase">
                        No Aplica
                    </span>
                    <span className="text-sm font-black text-slate-700">{conteo.na}</span>
                </div>
            </div>

            {/* Lista de todas las condiciones de la autoevaluación */}
            <div className="space-y-2">
                {items.map((item, idx) => {
                    const badge = getEstadoBadge(item.estado_actual);
                    const BadgeIcon = badge.icon;
                    const catNombre = getCategoriaNombre(item.especialidad);

                    return (
                        <div
                            key={`${item.codigo}-${idx}`}
                            className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-black text-slate-800">
                                        {item.codigo}
                                    </span>
                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                                        {catNombre}
                                    </span>
                                    {item.es_critico && (
                                        <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800">
                                            Crítico
                                        </span>
                                    )}
                                </div>
                                <div
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}
                                >
                                    <BadgeIcon className="h-3 w-3" />
                                    <span>{badge.label}</span>
                                </div>
                            </div>
                            <div className="mt-2">
                                <p className="text-xs leading-snug font-semibold text-slate-900">
                                    {item.titulo}
                                </p>
                                {item.norma_referencial && (
                                    <p className="mt-1 font-mono text-[9px] text-slate-400">
                                        Ref: {item.norma_referencial}
                                    </p>
                                )}
                                {item.notas && (
                                    <p className="mt-1 text-[10px] text-slate-500 italic">
                                        Nota: {item.notas}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
