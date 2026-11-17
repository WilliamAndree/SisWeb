import { AlertCircle, BookOpen, Scale, ShieldCheck, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
}

export const GuiaModal: React.FC<Readonly<Props>> = ({ isOpen, onClose }) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <dialog
            open
            aria-labelledby="guia-modal-titulo"
            className="animate-in fade-in fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4"
        >
            <button
                type="button"
                aria-label="Cerrar modal"
                tabIndex={-1}
                onClick={onClose}
                className="fixed inset-0 cursor-default bg-neutral-950/50 backdrop-blur-xs"
            />
            <div className="relative z-10 max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-neutral-100 bg-white p-6 text-left shadow-2xl sm:p-7">
                {/* Cabecera del Modal */}
                <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-neutral-100 bg-white pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="text-danger-900 rounded-xl border border-rose-100 bg-rose-50 p-2">
                            <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 id="guia-modal-titulo" className="text-sm font-bold text-neutral-900">
                                Compendio Normativo ITSE y Base Legal
                            </h3>
                            <span className="font-mono text-sm text-neutral-400">D.S. N° 002-2018-PCM · R.J. N° 016-2018-CENEPRED</span>
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar guía normativa"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500 transition hover:bg-neutral-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Declaración de Naturaleza Cívica Preventiva */}
                <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3.5 text-sm leading-relaxed text-neutral-600">
                    <ShieldCheck className="text-danger-900 mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                        <strong className="mb-0.5 block font-semibold text-neutral-900">Carácter del Simulador Cívico:</strong>
                        <p>
                            Herramienta pedagógica y preventiva independiente. Permite al comerciante revisar por su cuenta las condiciones técnicas
                            de seguridad de su establecimiento y prepararse mejor antes de una eventual inspección, reduciendo la asimetría
                            informativa y promoviendo una cultura de prevención.
                        </p>
                    </div>
                </div>

                {/* Clasificación de Modalidad de Trámite */}
                <div className="mb-4">
                    <span className="mb-2 block text-sm font-bold text-neutral-400">Clasificación de Riesgo según Función y Escala Física</span>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* ITSE Posterior */}
                        <div className="space-y-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-left">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-extrabold text-emerald-800">Riesgo Bajo / Medio</span>
                                <Scale className="h-3.5 w-3.5 text-emerald-700" />
                            </div>
                            <h4 className="text-sm font-bold text-emerald-950">ITSE Posterior (Ex-Post)</h4>
                            <p className="text-sm leading-relaxed text-emerald-900">
                                Aplica a comercios con área techada ≤ 750 m² y hasta 3 pisos sin factores agravantes. La Licencia de Funcionamiento se
                                tramita previamente y la verificación técnica se realiza con posterioridad.
                            </p>
                        </div>

                        {/* ITSE Previa */}
                        <div className="space-y-1.5 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-left">
                            <div className="flex items-center justify-between">
                                <span className="text-danger-900 text-sm font-extrabold">Riesgo Alto / Muy Alto</span>
                                <AlertCircle className="text-danger-900 h-3.5 w-3.5" />
                            </div>
                            <h4 className="text-sm font-bold text-rose-950">ITSE Previa (Ex-Ante)</h4>
                            <p className="text-sm leading-relaxed text-rose-950">
                                Aplica cuando el área supera 750 m², más de 3 pisos, giros especiales (hospedaje/salud &gt;100 pers.), presencia de
                                calderos o GLP &gt; 118.18 galones. Exige inspección técnica favorable previa a la licencia.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Articulado Técnico de Referencia */}
                <div className="mb-4 space-y-2 rounded-2xl border border-neutral-200/80 bg-white p-3.5 text-sm text-neutral-600">
                    <strong className="block text-sm font-bold text-neutral-800">Marco Reglamentario Aplicado en el Checklist:</strong>
                    <ul className="list-inside list-disc space-y-1 font-mono text-sm text-neutral-500">
                        <li>
                            <strong>Protección contra Incendios:</strong> NTP 350.043-1 / RNE A.130 Art. 163
                        </li>
                        <li>
                            <strong>Instalaciones Eléctricas:</strong> CNE-U Reglas 020.132, 150-400 / R.M. 175-2008-MEM
                        </li>
                        <li>
                            <strong>Evacuación y Aforo:</strong> RNE A.010 Arts. 20, 25 / NTP 399.010-1
                        </li>
                        <li>
                            <strong>Resiliencia Sísmica Huancayo:</strong> RNE E.030 / Arriola (2024)
                        </li>
                    </ul>
                </div>

                <p className="mb-4 text-center text-sm leading-relaxed text-neutral-400">
                    Sustento Académico: Modelado algorítmico de riesgo bajo ISO 9126 (Quispe Yana, 2019) y simulación preventiva para reducción de
                    siniestralidad (Revista G-Nerando, 2024).
                </p>

                <button
                    type="button"
                    onClick={onClose}
                    className="w-full cursor-pointer rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-neutral-800 active:scale-95"
                >
                    Entendido
                </button>
            </div>
        </dialog>
    );
};
