import { router } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Info, RefreshCw, ShieldCheck, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly uuid: string;
    readonly nombreComercio?: string;
    readonly fechaAnterior?: string;
}

export const ModalConfirmarReevaluacion: React.FC<Readonly<Props>> = ({
    isOpen,
    onClose,
    uuid,
    nombreComercio = 'tu establecimiento',
    fechaAnterior,
}: Readonly<Props>) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        triggerRef.current ??= document.activeElement as HTMLElement | null;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (triggerRef.current) {
                triggerRef.current.focus();
                triggerRef.current = null;
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleContinuar = () => {
        onClose();
        router.visit(`/autoevaluacion/reevaluar/${uuid}`);
    };

    const modalContent = (
        <dialog
            open
            aria-labelledby="modal-reevaluacion-title"
            aria-describedby="modal-reevaluacion-desc"
            className="animate-in fade-in fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 duration-200"
        >
            <button
                type="button"
                aria-label="Cerrar modal"
                tabIndex={-1}
                onClick={onClose}
                className="fixed inset-0 cursor-default bg-neutral-900/60 backdrop-blur-xs"
            />
            <div
                ref={modalRef}
                className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-neutral-100 bg-white p-6 text-left shadow-2xl sm:p-7"
            >
                <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-primary-50 text-primary-700 border-primary-100 shrink-0 rounded-2xl border p-2.5">
                            <RefreshCw className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="text-primary-700 bg-primary-50 border-primary-100 rounded-full border px-2 py-0.5 text-sm font-bold">
                                Preparación Preventiva ITSE
                            </span>
                            <h2 id="modal-reevaluacion-title" className="mt-1 text-lg font-extrabold text-neutral-900 sm:text-xl">
                                ¿Volver a evaluar este establecimiento?
                            </h2>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar ventana de confirmación"
                        className="cursor-pointer rounded-xl p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div id="modal-reevaluacion-desc" className="space-y-3.5 py-4 text-sm text-neutral-600 sm:text-sm">
                    <p className="leading-relaxed">
                        Vas a iniciar una <strong>nueva autoevaluación</strong> para <strong className="text-neutral-900">{nombreComercio}</strong>
                        {fechaAnterior ? ` (evaluado el ${fechaAnterior})` : ''}.
                    </p>

                    <div className="space-y-2 rounded-2xl border border-neutral-200/70 bg-neutral-50 p-4 text-sm">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>
                                <strong>Datos precargados:</strong> El nombre, RUC, giro y área se reutilizarán para que no tengas que escribirlos de
                                nuevo.
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <ShieldCheck className="text-primary-600 mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                <strong>Evaluación anterior intacta:</strong> Tu evaluación previa se conservará sin modificaciones con sus
                                declaraciones, registro y fecha original.
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <span>
                                <strong>Nuevo checklist independiente:</strong> Las condiciones de autoevaluación iniciarán listas para que declares
                                el estado actualizado de tu local.
                            </span>
                        </div>
                    </div>

                    <p className="flex items-start gap-1.5 pt-1 text-sm leading-relaxed text-neutral-500">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        <span>Esta nueva autoevaluación tendrá su propio resultado, identificador y trazabilidad independiente.</span>
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleContinuar}
                        className="bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500 inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-xs transition focus-visible:ring-2 focus-visible:outline-none active:scale-95"
                    >
                        <span>Continuar con la reevaluación</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </dialog>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
