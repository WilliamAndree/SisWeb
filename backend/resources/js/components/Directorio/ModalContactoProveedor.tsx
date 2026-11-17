import type { AliadoAsistenciaContrato } from '@/types/contrato';
import { Check, Copy, ExternalLink, FileCheck, MapPin, MessageCircle, Phone, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly aliado: AliadoAsistenciaContrato | null;
    readonly distritoSeleccionado?: string | null;
}

function resolverServicioTexto(entregableOficial?: string | null, servicios?: string[] | null): string {
    if (entregableOficial) {
        return entregableOficial;
    }
    if (servicios && servicios.length > 0 && servicios[0]) {
        return servicios[0];
    }
    return 'adecuación de seguridad ITSE';
}

export function ModalContactoProveedor({ isOpen, onClose, aliado, distritoSeleccionado }: Readonly<Props>) {
    const [copiado, setCopiado] = useState(false);

    if (!isOpen || !aliado) {
        return null;
    }

    const distrito = distritoSeleccionado || aliado.sede || 'Huancayo';
    const servicioTexto = resolverServicioTexto(aliado.entregable_oficial, aliado.servicios);

    const plantillaMensaje = `Hola ${aliado.nombre_comercial}, encontré su contacto en el Directorio Cívico CheckITSE Huancayo. Requiero cotización para [${servicioTexto}] para mi local comercial en ${distrito}.`;

    const numeroWhatsapp = (aliado.whatsapp || aliado.telefono || '').replace(/\D/g, '');
    const urlWhatsapp = numeroWhatsapp ? `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(plantillaMensaje)}` : null;

    const numeroTelefono = (aliado.telefono || '').replace(/\D/g, '');

    const copiarMensaje = async () => {
        try {
            await navigator.clipboard.writeText(plantillaMensaje);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
        } catch {
            // Fallback
        }
    };

    return (
        <dialog
            open
            aria-labelledby="modal-contacto-titulo"
            className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs duration-200 border-0 max-w-none max-h-none w-full h-full m-0"
        >
            <div className="animate-in zoom-in-95 relative w-full max-w-lg space-y-5 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl duration-200">
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black tracking-wider text-emerald-800 uppercase">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            Contacto Cívico Transparente
                        </span>
                        <h2 id="modal-contacto-titulo" className="text-lg leading-tight font-black text-slate-900">
                            {aliado.nombre_comercial}
                        </h2>
                        {aliado.contacto_nombre && <p className="text-xs font-medium text-slate-500">Atención: {aliado.contacto_nombre}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar ventana de contacto"
                        className="cursor-pointer rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Acreditación Técnica y Ubicación */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {aliado.acreditacion && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 font-bold text-sky-900">
                            <FileCheck className="h-3.5 w-3.5 text-sky-700" />
                            {aliado.acreditacion}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {aliado.sede} · Cobertura: {aliado.cobertura || 'Huancayo'}
                    </span>
                </div>

                {/* Documentación Técnica para Trámite (Formato Normativo) */}
                {aliado.entregable_oficial && (
                    <div className="space-y-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-emerald-900 uppercase">
                            <FileCheck className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                            <span>Documentación Técnica para Trámite (Formato Normativo)</span>
                        </div>
                        <p className="text-xs leading-relaxed font-medium text-emerald-950">{aliado.entregable_oficial}</p>
                    </div>
                )}

                {/* Plantilla de Mensaje para Cotización */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Plantilla de mensaje de contacto recomendada:</span>
                        <button
                            type="button"
                            onClick={copiarMensaje}
                            className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-emerald-700 transition hover:text-emerald-800"
                        >
                            {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiado ? '¡Copiado!' : 'Copiar texto'}</span>
                        </button>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 select-all">
                        {plantillaMensaje}
                    </div>
                </div>

                {/* Deslinde de No Intermediación */}
                <p className="text-[11px] leading-relaxed text-slate-500">
                    CheckITSE Huancayo es una iniciativa ciudadana preventiva. No cobra comisiones, no fija precios, no intermedia en la contratación ni garantiza la idoneidad del prestador. El contacto y acuerdo se realiza de manera directa y privada entre el establecimiento comercial y el especialista independiente.
                </p>

                {/* Botonera de Contacto */}
                <div className="flex flex-col items-center gap-2 border-t border-slate-100 pt-2 sm:flex-row">
                    {urlWhatsapp ? (
                        <a
                            href={urlWhatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 sm:flex-1"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span>Continuar por WhatsApp</span>
                            <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                    ) : null}

                    {numeroTelefono ? (
                        <a
                            href={`tel:${numeroTelefono}`}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 sm:w-auto"
                        >
                            <Phone className="h-4 w-4 text-slate-500" />
                            <span>Llamar</span>
                        </a>
                    ) : null}

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-transparent px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:text-slate-800 sm:w-auto"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </dialog>
    );
}
