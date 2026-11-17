import type { LucideIcon } from 'lucide-react';
import {
    Building2,
    FileCheck,
    Fingerprint,
    MapPin,
    Ruler,
    Scale,
    Users,
} from 'lucide-react';

export interface EvaluacionDatosFisicos {
    nombre_comercio?: string;
    nombre_comercial?: string;
    funcion_economica?: string | null;
    giro?: string | null;
    ruc?: string | null;
    sector_huancayo?: string | null;
    area_techada?: string | null;
    area_m2?: number | string | null;
    numero_pisos?: number | null;
    pisos?: number | null;
    aforo_estimado?: number | null;
    aforo?: number | null;
    nivel_riesgo?: string | null;
    tipo_tramite?: string | null;
}

interface InformeDatosGeneralesProps {
    readonly evaluacion: EvaluacionDatosFisicos;
    readonly nivelRiesgoLegible: string;
    readonly subtipoTramite: string;
}

export function InformeDatosGenerales({
    evaluacion,
    nivelRiesgoLegible,
    subtipoTramite,
}: Readonly<InformeDatosGeneralesProps>) {
    const areaTexto = evaluacion.area_techada
        ? `${evaluacion.area_techada} m²`
        : (evaluacion.area_m2 ? `${evaluacion.area_m2} m²` : 'Área no declarada');

    const aforoTexto = evaluacion.aforo_estimado
        ? `${evaluacion.aforo_estimado} personas`
        : (evaluacion.aforo ? `${evaluacion.aforo} personas` : 'Aforo no declarado');

    const pisosTexto = `${evaluacion.numero_pisos ?? evaluacion.pisos ?? 1} piso(s)`;

    const datosGenerales: Array<{ icon: LucideIcon; label: string; value: string; sub?: string }> = [
        {
            icon: Building2,
            label: 'Nombre Comercial',
            value: evaluacion.nombre_comercial || evaluacion.nombre_comercio || 'No declarado',
            sub: `Giro declarado: ${evaluacion.giro || evaluacion.funcion_economica || 'General'}`,
        },
        {
            icon: Fingerprint,
            label: 'RUC',
            value: evaluacion.ruc ?? 'No declarado',
            sub: 'Contribuyente declarante',
        },
        {
            icon: MapPin,
            label: 'Ubicación en Huancayo',
            value: evaluacion.sector_huancayo ?? 'No declarado',
            sub: 'Referencia territorial declarada',
        },
        {
            icon: Ruler,
            label: 'Área Techada',
            value: areaTexto,
            sub: pisosTexto,
        },
        {
            icon: Users,
            label: 'Aforo Estimado',
            value: aforoTexto,
            sub: 'Capacidad declarada',
        },
        ...(evaluacion.nivel_riesgo || evaluacion.tipo_tramite
            ? [
                  {
                      icon: Scale,
                      label: 'Riesgo Declarado',
                      value: nivelRiesgoLegible,
                      sub: subtipoTramite,
                  },
              ]
            : []),
    ];

    return (
        <section>
            <div className="mb-2.5 flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                    Datos Generales Declarados del Establecimiento
                </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                {datosGenerales.map((item) => (
                    <div
                        key={item.label}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                    >
                        <div className="mb-1 flex items-center gap-1.5">
                            <item.icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                {item.label}
                            </span>
                        </div>
                        <p className="text-xs leading-snug font-bold break-words text-slate-900">
                            {item.value}
                        </p>
                        <p className="mt-0.5 text-[9px] text-slate-400">{item.sub}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
