import { CryptoSealBadge } from '@/components/shared/CryptoSealBadge';
import { Building2, Calendar, MapPin } from 'lucide-react';
export interface ResumenHeaderProps {
    readonly nombreComercio?: string;
    readonly uuidTrazabilidad?: string;
    readonly nivelRiesgo: string;
    readonly tipoTramite?: string;
    readonly estado?: string;
    readonly fechaEmision?: string;
    readonly codigoAcceso?: string;
    readonly funcionEconomica?: string;
    readonly direccion?: string;
    readonly ruc?: string;
    readonly esApto?: boolean;
    readonly hashIntegridad?: string | null;
    readonly esRegistrada?: boolean;
}

export function ResumenHeader({
    nombreComercio = 'Local comercial',
    uuidTrazabilidad,
    nivelRiesgo,
    tipoTramite,
    estado,
    fechaEmision,
    codigoAcceso,
    funcionEconomica,
    direccion,
    ruc,
    hashIntegridad,
    esRegistrada = false,
}: Readonly<ResumenHeaderProps>) {
    return (
        <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-primary-800 text-sm font-semibold">Según lo que declaraste</p>
                <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                    {esRegistrada ? 'Registro cerrado' : 'En preparación'}
                </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Tu resumen de autoevaluación</h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-base text-slate-700">
                <span className="inline-flex items-center gap-2 font-semibold break-words">
                    <Building2 className="size-5 shrink-0" aria-hidden="true" />
                    {nombreComercio}
                </span>
                {funcionEconomica && <span>{funcionEconomica}</span>}
                {direccion && (
                    <span className="inline-flex items-start gap-2 break-words">
                        <MapPin className="size-5 shrink-0" aria-hidden="true" />
                        {direccion}
                    </span>
                )}
                {fechaEmision && (
                    <span className="inline-flex items-center gap-2">
                        <Calendar className="size-5" aria-hidden="true" />
                        {fechaEmision}
                    </span>
                )}
            </div>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
                Consulta qué necesitas atender o revisar. Las respuestas y la clasificación orientativa no acreditan la seguridad del establecimiento
                ni garantizan una aprobación oficial.
            </p>
            <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">Ver clasificación, datos e integridad del registro</summary>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="text-slate-600">Nivel de riesgo estimado</dt>
                        <dd className="font-semibold">{nivelRiesgo || 'No informado'}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-600">Modalidad orientativa</dt>
                        <dd className="font-semibold">
                            {tipoTramite === 'EX_ANTE'
                                ? 'ITSE Previa (Ex-Ante)'
                                : tipoTramite === 'EX_POST'
                                  ? 'ITSE Posterior (Ex-Post)'
                                  : 'No informada'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-slate-600">Estado del registro</dt>
                        <dd>{estado || (esRegistrada ? 'REGISTRADA' : 'INICIADA')}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-600">Referencia</dt>
                        <dd className="break-all">{codigoAcceso || uuidTrazabilidad || 'No informada'}</dd>
                    </div>
                    {ruc && (
                        <div>
                            <dt className="text-slate-600">RUC declarado</dt>
                            <dd>{ruc}</dd>
                        </div>
                    )}
                </dl>
                {hashIntegridad ? (
                    <div className="mt-4">
                        <CryptoSealBadge hash={hashIntegridad} fecha={fechaEmision} esInmutable={esRegistrada} />
                        <p className="mt-2 text-sm text-slate-600">
                            Huella registrada. Su presencia no equivale a una verificación de integridad ni a una certificación oficial.
                        </p>
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-600">No hay una huella de integridad disponible para mostrar.</p>
                )}
            </details>
        </header>
    );
}
export default ResumenHeader;
