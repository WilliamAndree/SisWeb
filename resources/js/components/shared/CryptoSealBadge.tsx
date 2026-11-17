import { Check, Copy, Lock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export interface CryptoSealBadgeProps {
    readonly hash?: string | null;
    readonly fecha?: string | null;
    readonly esInmutable?: boolean;
    readonly className?: string;
    readonly variante?: 'compacto' | 'detallado';
}

export function CryptoSealBadge({ hash, fecha, esInmutable = true, className = '', variante = 'compacto' }: Readonly<CryptoSealBadgeProps>) {
    const [copiado, setCopiado] = useState<boolean>(false);

    if (!hash) {
        return null;
    }

    const copiarHash = async () => {
        try {
            await navigator.clipboard.writeText(hash);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            // Silencioso ante bloqueo de permisos de portapapeles
        }
    };

    const hashCorto = `${hash.slice(0, 8)}...${hash.slice(-8)}`;

    let textoEstado = 'En Proceso';
    if (esInmutable) {
        textoEstado = 'Registro cerrado';
    }

    let textoBadgeInmutabilidad = 'Borrador editable';
    if (esInmutable) {
        textoBadgeInmutabilidad = 'Huella registrada';
    }

    let textoHashVisible = hashCorto;
    if (variante === 'detallado') {
        textoHashVisible = hash;
    }

    return (
        <div
            role="region"
            aria-label="Huella de integridad registrada"
            className={`inline-flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/60 px-3.5 py-1.5 text-xs text-emerald-200 shadow-xs backdrop-blur-xs ${className}`}
        >
            <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <span className="font-bold text-emerald-300">{textoEstado}</span>
            </div>

            <div className="flex items-center gap-1.5 border-l border-emerald-500/25 pl-2.5">
                <span className="font-mono text-[10px] font-bold tracking-wider text-emerald-400/90 uppercase">SHA-256:</span>
                <span className="font-mono text-xs font-semibold break-all text-white select-all" title={`Hash SHA-256 completo: ${hash}`}>
                    {textoHashVisible}
                </span>

                <button
                    type="button"
                    onClick={copiarHash}
                    aria-label="Copiar hash SHA-256 de integridad al portapapeles"
                    title={copiado ? '¡Copiado!' : 'Copiar hash SHA-256'}
                    className="ml-1 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-900/60 text-emerald-300 transition-colors hover:bg-emerald-800 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
                >
                    {copiado ? (
                        <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                </button>
            </div>

            {fecha && (
                <div className="border-l border-emerald-500/25 pl-2.5 text-[11px] font-medium text-emerald-300/80">
                    <span>{fecha}</span>
                </div>
            )}

            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-900/40 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                <Lock className="h-2.5 w-2.5 text-emerald-400" aria-hidden="true" />
                <span>{textoBadgeInmutabilidad}</span>
            </span>
        </div>
    );
}

export default CryptoSealBadge;
