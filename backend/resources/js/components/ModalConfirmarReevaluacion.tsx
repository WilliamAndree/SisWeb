import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { RefreshCw, ArrowRight, X, ShieldCheck, CheckCircle2, Info } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 bg-transparent border-0 max-w-none max-h-none w-full h-full m-0"
    >
      <button
        type="button"
        aria-label="Cerrar modal"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs cursor-default"
      />
      <div
        ref={modalRef}
        className="relative z-10 bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-neutral-100 text-left overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-primary-50 text-primary-700 border border-primary-100 rounded-2xl shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                Preparación Preventiva ITSE
              </span>
              <h2 id="modal-reevaluacion-title" className="text-lg sm:text-xl font-extrabold text-neutral-900 mt-1">
                ¿Volver a evaluar este establecimiento?
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de confirmación"
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div id="modal-reevaluacion-desc" className="py-4 space-y-3.5 text-xs sm:text-sm text-neutral-600">
          <p className="leading-relaxed">
            Vas a iniciar una <strong>nueva autoevaluación</strong> para{' '}
            <strong className="text-neutral-900">{nombreComercio}</strong>
            {fechaAnterior ? ` (evaluado el ${fechaAnterior})` : ''}.
          </p>

          <div className="space-y-2 rounded-2xl bg-neutral-50 p-4 border border-neutral-200/70 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Datos precargados:</strong> El nombre, RUC, giro y área se reutilizarán para que no tengas que escribirlos de nuevo.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
              <span>
                <strong>Evaluación anterior intacta:</strong> Tu evaluación previa se conservará sin modificaciones con sus declaraciones, registro y fecha original.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Nuevo checklist independiente:</strong> Las condiciones de autoevaluación iniciarán listas para que declares el estado actualizado de tu local.
              </span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-500 leading-relaxed flex items-start gap-1.5 pt-1">
            <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
            <span>
              Esta nueva autoevaluación tendrá su propio resultado, identificador y trazabilidad independiente.
            </span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleContinuar}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <span>Continuar con la reevaluación</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </dialog>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
