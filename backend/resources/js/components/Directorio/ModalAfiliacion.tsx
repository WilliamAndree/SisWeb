import { useForm } from '@inertiajs/react';
import { CheckCircle2, Loader2, Send, Store, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';
import type { FC } from 'react';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    /** Numero de WhatsApp institucional, opcional */
    readonly whatsapp?: string;
}

interface AfiliacionFormData {
    [key: string]: string;
    nombre_comercial: string;
    contacto_nombre: string;
    numero_documento: string;
    telefono: string;
    email: string;
    rubro: string;
    distrito: string;
    notas: string;
}

export const ModalAfiliacion: FC<Readonly<Props>> = ({ isOpen, onClose }: Readonly<Props>) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const { data, setData, post, processing, errors, reset, wasSuccessful } = useForm<AfiliacionFormData>({
        nombre_comercial: '',
        contacto_nombre: '',
        numero_documento: '',
        telefono: '',
        email: '',
        rubro: 'electricas',
        distrito: 'Huancayo',
        notas: '',
    });

    const manejarTeclado = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();

                return;
            }

            if (event.key !== 'Tab') return;

            const panel = panelRef.current;
            if (!panel) return;

            const enfocables = Array.from(
                panel.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            );

            if (enfocables.length === 0) return;

            const primero = enfocables[0];
            const ultimo = enfocables.at(-1);
            if (!primero || !ultimo) return;

            if (event.shiftKey && document.activeElement === primero) {
                event.preventDefault();
                ultimo.focus();
            } else if (!event.shiftKey && document.activeElement === ultimo) {
                event.preventDefault();
                primero.focus();
            }
        },
        [onClose],
    );

    useEffect(() => {
        if (!isOpen) return;

        const anteriormenteFocalizado = document.activeElement as HTMLElement | null;

        document.addEventListener('keydown', manejarTeclado);
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', manejarTeclado);
            document.body.style.overflow = '';
            anteriormenteFocalizado?.focus?.();
        };
    }, [isOpen, manejarTeclado]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('directorio.afiliarse'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
            },
        });
    };

    return (
        <dialog
            open
            aria-labelledby="modal-afiliacion-titulo"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent border-0 max-w-none max-h-none w-full h-full m-0"
        >
            <button
                type="button"
                aria-label="Cerrar modal"
                tabIndex={-1}
                onClick={onClose}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm cursor-default"
            />
            <div
                ref={panelRef}
                className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white text-left shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <Store className="h-5 w-5" />
                        </span>
                        <div>
                            <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase">
                                Red de Aliados Técnicos
                            </span>
                            <h2 id="modal-afiliacion-titulo" className="text-base font-bold text-slate-900 leading-snug">
                                Postular al Directorio Cívico
                            </h2>
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar modal"
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="p-6">
                    {wasSuccessful ? (
                        <div className="py-8 text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
                                <CheckCircle2 className="h-9 w-9" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">¡Postulación Registrada con Éxito!</h3>
                            <p className="text-xs leading-relaxed text-slate-600 max-w-sm mx-auto">
                                Tu solicitud de afiliación ha sido registrada en el sistema. El equipo técnico validará los datos para incorporarte al directorio cívico de Huancayo.
                            </p>
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="min-h-[44px] px-6 rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-slate-800"
                                >
                                    Cerrar y volver al directorio
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <p className="text-xs leading-relaxed text-slate-500">
                                La postulación al catálogo es gratuita y de carácter informativo. Los prestadores registrados figuran como referencia técnica independiente para comerciantes que buscan resolver observaciones preventivas.
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="nombre_comercial" className="block text-xs font-bold text-slate-700 mb-1">
                                        Nombre Comercial / Razón Social <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        id="nombre_comercial"
                                        type="text"
                                        required
                                        value={data.nombre_comercial}
                                        onChange={(e) => setData('nombre_comercial', e.target.value)}
                                        placeholder="Ej: Ingeniería Eléctrica Mantaro S.A.C."
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                                    />
                                    {errors.nombre_comercial && (
                                        <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.nombre_comercial}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="contacto_nombre" className="block text-xs font-bold text-slate-700 mb-1">
                                            Contacto / Especialista <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            id="contacto_nombre"
                                            type="text"
                                            required
                                            value={data.contacto_nombre}
                                            onChange={(e) => setData('contacto_nombre', e.target.value)}
                                            placeholder="Ej: Ing. Elmer Ccahuana"
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                                        />
                                        {errors.contacto_nombre && (
                                            <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.contacto_nombre}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="numero_documento" className="block text-xs font-bold text-slate-700 mb-1">
                                            RUC o DNI <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            id="numero_documento"
                                            type="text"
                                            required
                                            maxLength={11}
                                            value={data.numero_documento}
                                            onChange={(e) => setData('numero_documento', e.target.value)}
                                            placeholder="8 u 11 dígitos"
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                                        />
                                        {errors.numero_documento && (
                                            <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.numero_documento}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="telefono" className="block text-xs font-bold text-slate-700 mb-1">
                                            Teléfono / WhatsApp <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            id="telefono"
                                            type="tel"
                                            required
                                            value={data.telefono}
                                            onChange={(e) => setData('telefono', e.target.value)}
                                            placeholder="Ej: 976541230"
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                                        />
                                        {errors.telefono && (
                                            <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.telefono}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
                                            Correo Electrónico <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            required
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="correo@ejemplo.pe"
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                                        />
                                        {errors.email && (
                                            <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.email}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="rubro" className="block text-xs font-bold text-slate-700 mb-1">
                                            Especialidad Técnica <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            id="rubro"
                                            value={data.rubro}
                                            onChange={(e) => setData('rubro', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                                        >
                                            <option value="electricas">Instalaciones Eléctricas y Pozo a Tierra</option>
                                            <option value="incendios">Extintores y Detección de Humo</option>
                                            <option value="arquitectura_senaletica">Señalética Celtex y Evacuación</option>
                                            <option value="estructuras">Estructuras y Vidrios de Seguridad</option>
                                        </select>
                                        {errors.rubro && (
                                            <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.rubro}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="distrito" className="block text-xs font-bold text-slate-700 mb-1">
                                            Sede / Distrito <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            id="distrito"
                                            value={data.distrito}
                                            onChange={(e) => setData('distrito', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                                        >
                                            <option value="Huancayo">Huancayo Centro</option>
                                            <option value="El Tambo">El Tambo</option>
                                            <option value="Chilca">Chilca</option>
                                            <option value="Huancayo Metropolitano">Huancayo Metropolitano (Todos)</option>
                                        </select>
                                        {errors.distrito && (
                                            <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.distrito}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="notas" className="block text-xs font-bold text-slate-700 mb-1">
                                        Servicios ofrecidos / Colegiatura / Registro (Opcional)
                                    </label>
                                    <textarea
                                        id="notas"
                                        rows={2}
                                        value={data.notas}
                                        onChange={(e) => setData('notas', e.target.value)}
                                        placeholder="Ej: Medición de pozos a tierra con protocolo firmado CIP, recarga conforme a norma NTP 350.043-1..."
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                                    />
                                    {errors.notas && (
                                        <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.notas}</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Registrando solicitud...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            <span>Enviar solicitud de afiliación</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </dialog>
    );
};
