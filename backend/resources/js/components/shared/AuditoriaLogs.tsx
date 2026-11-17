import { useState } from 'react';
import {
    Check,
    Copy,
    Fingerprint,
    FileCode2,
    History,
    ShieldAlert,
    ShieldCheck,
    Hash,
} from 'lucide-react';

export interface AuditoriaLogsProps {
    readonly uuid: string;
    readonly hashIntegridad?: string | null;
    readonly fechaRegistro?: string | null;
    readonly esInmutable?: boolean;
    readonly payloadCanonico?: Record<string, unknown> | string | null;
    readonly className?: string;
}

export function AuditoriaLogs({
    uuid,
    hashIntegridad,
    fechaRegistro,
    esInmutable = true,
    payloadCanonico,
    className = '',
}: Readonly<AuditoriaLogsProps>) {
    const [copiadoHash, setCopiadoHash] = useState<boolean>(false);
    const [copiadoUuid, setCopiadoUuid] = useState<boolean>(false);
    const [verPayload, setVerPayload] = useState<boolean>(false);

    const copiarTexto = async (texto: string, setFn: (v: boolean) => void) => {
        try {
            await navigator.clipboard.writeText(texto);
            setFn(true);
            setTimeout(() => setFn(false), 2000);
        } catch {
            // Manejo silencioso ante restricciones del portapapeles
        }
    };

    let payloadString = '';
    if (payloadCanonico) {
        if (typeof payloadCanonico === 'string') {
            payloadString = payloadCanonico;
        } else {
            payloadString = JSON.stringify(payloadCanonico, null, 2);
        }
    }

    let etiquetaInmutabilidad = 'Borrador editable';
    if (esInmutable) {
        etiquetaInmutabilidad = 'Snapshot inmutable (sellado)';
    }

    return (
        <section
            aria-label="Registro de auditoría y trazabilidad criptográfica"
            className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 ${className}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <History className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                        <h3 className="text-sm font-black tracking-tight text-slate-900">
                            Auditoría y Trazabilidad Criptográfica
                        </h3>
                        <p className="text-[11px] text-slate-500">
                            Garantía de inmutabilidad y verificación SHA-256
                        </p>
                    </div>
                </div>

                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                        esInmutable
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                >
                    {esInmutable ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    ) : (
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                    )}
                    <span>{etiquetaInmutabilidad}</span>
                </span>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
                {/* UUID de Trazabilidad */}
                <div className="flex flex-col justify-between gap-2 rounded-2xl bg-slate-50 p-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-2">
                        <Fingerprint className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="font-semibold text-slate-600">UUID de Trazabilidad:</span>
                        <span className="truncate font-mono font-bold text-slate-900 select-all">
                            {uuid}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => copiarTexto(uuid, setCopiadoUuid)}
                        aria-label="Copiar UUID de trazabilidad"
                        className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer sm:self-auto"
                    >
                        {copiadoUuid ? (
                            <>
                                <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                                <span className="text-emerald-700">Copiado</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3 w-3 text-slate-500" aria-hidden="true" />
                                <span>Copiar</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Sello Digital SHA-256 */}
                {hashIntegridad && (
                    <div className="rounded-2xl bg-slate-950 p-4 font-mono text-slate-300">
                        <div className="flex items-center justify-between gap-2 pb-2">
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                <Hash className="h-3 w-3" aria-hidden="true" />
                                Sello Digital SHA-256
                            </span>
                            <button
                                type="button"
                                onClick={() => copiarTexto(hashIntegridad, setCopiadoHash)}
                                aria-label="Copiar hash SHA-256"
                                className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white cursor-pointer"
                            >
                                {copiadoHash ? (
                                    <>
                                        <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                                        <span className="text-emerald-400">Copiado</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3 text-slate-400" aria-hidden="true" />
                                        <span>Copiar hash</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="break-all select-all text-xs font-semibold leading-relaxed text-emerald-300">
                            {hashIntegridad}
                        </p>
                    </div>
                )}

                {/* Metadata adicional de fecha */}
                {fechaRegistro && (
                    <div className="flex items-center justify-between px-1 text-slate-500">
                        <span>Fecha y hora de sellado:</span>
                        <span className="font-semibold text-slate-800">{fechaRegistro}</span>
                    </div>
                )}

                {/* Payload canónico verificado */}
                {payloadString && (
                    <div className="border-t border-slate-100 pt-3">
                        <button
                            type="button"
                            onClick={() => setVerPayload(!verPayload)}
                            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 transition hover:text-emerald-800 cursor-pointer"
                        >
                            <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                                {verPayload ? 'Ocultar payload canónico firmado' : 'Ver payload canónico firmado'}
                            </span>
                        </button>
                        {verPayload && (
                            <pre className="mt-2 max-h-52 overflow-auto rounded-2xl bg-slate-950 p-3.5 font-mono text-[10px] leading-relaxed text-slate-300">
                                {payloadString}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

export default AuditoriaLogs;
