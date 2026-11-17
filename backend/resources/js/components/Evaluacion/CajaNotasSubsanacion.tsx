import { Check, FileEdit } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface CajaNotasSubsanacionProps {
    codigo: string;
    uuid?: string;
    notaInicial?: string | null;
    placeholder?: string;
    className?: string;
}

export function CajaNotasSubsanacion({
    codigo,
    uuid = 'general',
    notaInicial = '',
    placeholder = 'Ej. Cotizado con Ing. Mantaro para el jueves / Falta comprar candado y retirar mercadería...',
    className = '',
}: Readonly<CajaNotasSubsanacionProps>) {
    const storageKey = `checkitse_nota_${uuid}_${codigo}`;

    const [nota, setNota] = useState<string>(() => {
        try {
            const guardado = localStorage.getItem(storageKey);
            if (guardado !== null) {
                return guardado;
            }
        } catch {
            // Ignorar excepciones de localStorage
        }
        return (notaInicial || '').trim();
    });

    const [guardadoReciente, setGuardadoReciente] = useState<boolean>(false);

    useEffect(() => {
        // Si notaInicial cambia desde el servidor y no hay valor local
        try {
            const guardado = localStorage.getItem(storageKey);
            if (guardado === null && notaInicial) {
                setNota(notaInicial.trim());
            }
        } catch {
            // Ignorar excepciones de localStorage
        }
    }, [notaInicial, storageKey]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNota(val);

        try {
            if (val.trim()) {
                localStorage.setItem(storageKey, val);
            } else {
                localStorage.removeItem(storageKey);
            }
            setGuardadoReciente(true);
            const timer = setTimeout(() => setGuardadoReciente(false), 2000);
            return () => clearTimeout(timer);
        } catch {
            // Ignorar excepciones de almacenamiento
        }
    };

    const renderIndicadorGuardado = () => {
        if (guardadoReciente) {
            return (
                <span className="animate-in fade-in inline-flex items-center gap-1 text-sm font-bold text-emerald-700 duration-200">
                    <Check className="h-3 w-3 text-emerald-600" />
                    Guardado en este equipo
                </span>
            );
        }

        if (nota.trim().length > 0) {
            return <span className="text-sm font-medium text-slate-400">Autoguardado ✓</span>;
        }

        return null;
    };

    return (
        <div className={`space-y-1.5 rounded-2xl border border-slate-200/90 bg-slate-50/90 p-3.5 shadow-2xs transition-all ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <label htmlFor={`nota-subsanacion-${codigo}`} className="flex items-center gap-1.5 font-bold text-slate-800">
                    <FileEdit className="h-3.5 w-3.5 text-slate-600" />
                    <span>📝 Mis notas de gestión / técnico contratado:</span>
                </label>

                <div className="flex items-center gap-2">
                    {renderIndicadorGuardado()}
                    <span className="font-mono text-sm text-slate-400">{nota.length}/1000</span>
                </div>
            </div>

            <textarea
                id={`nota-subsanacion-${codigo}`}
                value={nota}
                onChange={handleChange}
                maxLength={1000}
                rows={2}
                placeholder={placeholder}
                className="min-h-[64px] w-full resize-y rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />

            <p className="text-sm leading-tight text-slate-500">
                Anotación privada de apoyo para tu cotización y subsanación física antes de la inspección.
            </p>
        </div>
    );
}
