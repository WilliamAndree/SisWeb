import { resolverFotoNegocio, usarFotoRespaldo } from '@/lib/imagen-negocio';
import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    ClipboardList,
    FolderOpen,
    HelpCircle,
    MapPin,
    MinusCircle,
    ShieldCheck,
} from 'lucide-react';

export interface ConteoResumen {
    readonly listo: number;
    readonly falta: number;
    readonly porRevisar: number;
    readonly noAplica: number;
}

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
    readonly esRegistrada?: boolean;
    readonly conteo: ConteoResumen;
    readonly porcentaje: number;
    /** Condiciones corregidas después de evaluar: explican por qué subió el porcentaje. */
    readonly corregidas?: number;
}

function textoModalidad(tipoTramite?: string): string {
    if (tipoTramite === 'EX_ANTE') return 'ITSE previa (antes de la licencia)';
    if (tipoTramite === 'EX_POST') return 'ITSE posterior (después de la licencia)';
    return 'No informada';
}

function mensajeEstado(conteo: ConteoResumen): { titulo: string; texto: string; clase: string } {
    const pendientes = conteo.falta + conteo.porRevisar;
    if (pendientes === 0) {
        return {
            titulo: '¡Tu local está listo para la inspección!',
            texto: 'Según lo que declaraste, cumples todo. Prepara tu expediente para el trámite.',
            clase: 'bg-emerald-500 text-white',
        };
    }
    return {
        titulo: pendientes === 1 ? 'Te falta 1 cosa' : `Te faltan ${pendientes} cosas`,
        texto: 'Corrígelas antes de pedir tu inspección. Abajo te mostramos qué hacer y quién te ayuda cerca.',
        clase: 'bg-sun-400 text-ink-900',
    };
}

/**
 * Cabecera del resumen: la foto del local, cuánto está listo en grande, los
 * contadores por estado y una sola acción principal. Los datos técnicos del
 * registro quedan en un desplegable.
 */
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
    esRegistrada = false,
    conteo,
    porcentaje,
    corregidas = 0,
}: Readonly<ResumenHeaderProps>) {
    const foto = resolverFotoNegocio(nombreComercio, funcionEconomica, uuidTrazabilidad ?? nombreComercio);
    const estadoLocal = mensajeEstado(conteo);
    const listo = conteo.falta + conteo.porRevisar === 0;
    const pct = Math.round(porcentaje);
    const tarjetas = [
        { texto: 'Listo', valor: conteo.listo, Icono: CheckCircle2, clase: 'bg-emerald-50 text-emerald-800' },
        { texto: 'Falta', valor: conteo.falta, Icono: AlertTriangle, clase: 'bg-primary-50 text-primary-800' },
        { texto: 'Por revisar', valor: conteo.porRevisar, Icono: HelpCircle, clase: 'bg-sun-50 text-sun-700' },
        { texto: 'No aplica', valor: conteo.noAplica, Icono: MinusCircle, clase: 'bg-slate-100 text-slate-700' },
    ];

    return (
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid lg:grid-cols-[1fr_1.15fr]">
                <div className="relative min-h-60 lg:min-h-full">
                    <img src={foto} alt="" onError={usarFotoRespaldo} className="absolute inset-0 h-full w-full object-cover" />
                    <div aria-hidden="true" className="from-ink-900/95 absolute inset-0 bg-gradient-to-t via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-bold ${estadoLocal.clase}`}>
                            {listo ? <ShieldCheck aria-hidden="true" className="size-5" /> : <AlertTriangle aria-hidden="true" className="size-5" />}
                            {estadoLocal.titulo}
                        </span>
                        <p className="font-display mt-3 text-3xl leading-tight font-extrabold break-words sm:text-4xl">{nombreComercio}</p>
                        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-base text-slate-200">
                            {funcionEconomica && <span>{funcionEconomica}</span>}
                            {direccion && (
                                <span className="inline-flex items-center gap-1">
                                    <MapPin aria-hidden="true" className="size-4" /> {direccion}
                                </span>
                            )}
                            {fechaEmision && (
                                <span className="inline-flex items-center gap-1">
                                    <Calendar aria-hidden="true" className="size-4" /> {fechaEmision}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="p-5 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-primary-700 text-base font-bold">Tu resultado</p>
                        <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                            {esRegistrada ? 'Registro cerrado' : 'En preparación'}
                        </span>
                    </div>
                    <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Así está tu local</h1>

                    <div className="mt-5 flex items-end gap-3">
                        <p className="font-display text-6xl leading-none font-extrabold text-slate-900">
                            {pct}
                            <span className="text-3xl text-slate-400">%</span>
                        </p>
                        <p className="pb-1 text-lg font-semibold text-slate-600">listo para la ITSE</p>
                    </div>
                    <div className="mt-3 h-3.5 overflow-hidden rounded-full bg-slate-100" role="presentation">
                        <div className={`h-full rounded-full ${listo ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-3 text-lg text-slate-700">{estadoLocal.texto}</p>
                    {corregidas > 0 && (
                        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-base font-semibold text-emerald-800">
                            <CheckCircle2 aria-hidden="true" className="size-4" />
                            Corregiste {corregidas} {corregidas === 1 ? 'cosa' : 'cosas'} desde tu evaluación
                        </p>
                    )}

                    <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {tarjetas.map(({ texto, valor, Icono, clase }) => (
                            <div key={texto} className={`rounded-2xl px-3 py-3 text-center ${clase}`}>
                                <dd className="flex items-center justify-center gap-1.5 text-3xl font-extrabold">
                                    <Icono aria-hidden="true" className="size-5" /> {valor}
                                </dd>
                                <dt className="text-base font-semibold">{texto}</dt>
                            </div>
                        ))}
                    </dl>

                    {uuidTrazabilidad && (
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href={route(listo ? 'autoevaluacion.expediente_digital' : 'autoevaluacion.subsanar_items', {
                                    uuid: uuidTrazabilidad,
                                })}
                                className="bg-primary hover:bg-primary-700 inline-flex min-h-13 items-center gap-2 rounded-xl px-6 text-lg font-bold text-white"
                            >
                                {listo ? 'Preparar mi expediente' : 'Ver lo que me falta'} <ArrowRight aria-hidden="true" className="size-5" />
                            </Link>
                            {!listo && (
                                <Link
                                    href={route('autoevaluacion.expediente_digital', { uuid: uuidTrazabilidad })}
                                    className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-13 items-center gap-2 rounded-xl px-5 text-lg font-bold text-white"
                                >
                                    <FolderOpen aria-hidden="true" className="size-5" /> Mi expediente
                                </Link>
                            )}
                            <Link
                                href={route('autoevaluacion.checklist', { uuid: uuidTrazabilidad })}
                                className="inline-flex min-h-13 items-center gap-2 rounded-xl border border-slate-300 px-5 text-lg font-semibold text-slate-800 hover:bg-slate-50"
                            >
                                <ClipboardList aria-hidden="true" className="size-5" /> {esRegistrada ? 'Ver mis respuestas' : 'Cambiar respuestas'}
                            </Link>
                        </div>
                    )}

                    <p className="mt-5 text-sm text-slate-500">
                        Es una simulación según lo que declaraste. No reemplaza la inspección municipal ni emite certificados.
                    </p>

                    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <summary className="cursor-pointer text-base font-semibold text-slate-700">Datos de tu registro</summary>
                        <dl className="mt-4 grid gap-4 text-base sm:grid-cols-2">
                            <div>
                                <dt className="text-slate-600">Nivel de riesgo estimado</dt>
                                <dd className="font-semibold">{nivelRiesgo || 'No informado'}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-600">Tipo de trámite</dt>
                                <dd className="font-semibold">{textoModalidad(tipoTramite)}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-600">Estado</dt>
                                <dd className="font-semibold">
                                    {esRegistrada || estado === 'REGISTRADA' ? 'Guardado en tu cuenta' : 'Borrador (aún puedes cambiar respuestas)'}
                                </dd>
                            </div>
                            {codigoAcceso && (
                                <div>
                                    <dt className="text-slate-600">Código de tu registro</dt>
                                    <dd className="font-mono font-semibold tracking-wider">{codigoAcceso}</dd>
                                </div>
                            )}
                            {fechaEmision && (
                                <div>
                                    <dt className="text-slate-600">Fecha</dt>
                                    <dd className="font-semibold">{fechaEmision}</dd>
                                </div>
                            )}
                            {ruc && (
                                <div>
                                    <dt className="text-slate-600">RUC</dt>
                                    <dd className="font-semibold">{ruc}</dd>
                                </div>
                            )}
                        </dl>
                    </details>
                </div>
            </div>
        </header>
    );
}
export default ResumenHeader;
