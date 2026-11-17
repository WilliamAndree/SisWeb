import { BookOpen, Clock, ExternalLink, FileText, Info, Layers, PlayCircle, User, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

export interface RecursoEducativoData {
    id: number;
    criterio_normativo_id?: number | null;
    titulo: string;
    descripcion_corta: string;
    tipo: 'VIDEO' | 'GUIA_DIGITAL' | 'ENLACE_EXTERNO';
    url: string;
    fuente_autor?: string | null;
    duracion_estimada?: string | null;
}

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly recursos: RecursoEducativoData[];
    readonly criterioCodigo?: string;
    readonly criterioTitulo?: string;
}

const YOUTUBE_URL_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

function extractYouTubeEmbedUrl(url: string): string | null {
    if (!url) return null;
    const match = YOUTUBE_URL_REGEX.exec(url);
    const id = match ? match[1] : null;
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

const TIPO_ETIQUETAS: Record<string, { label: string; color: string }> = {
    VIDEO: {
        label: 'Video orientativo',
        color: 'bg-rose-50 text-rose-800 border-rose-200',
    },
    GUIA_DIGITAL: {
        label: 'Guía técnica digital',
        color: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    ENLACE_EXTERNO: {
        label: 'Enlace externo de consulta',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
    },
};

export const RecursoEducativoModal: React.FC<Readonly<Props>> = ({ isOpen, onClose, recursos, criterioCodigo, criterioTitulo }: Readonly<Props>) => {
    const [indiceActivo, setIndiceActivo] = useState<number>(0);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Reiniciar pestaña activa cuando se abre el modal o cambian los recursos
    useEffect(() => {
        if (isOpen) {
            setIndiceActivo(0);
        }
    }, [isOpen, recursos]);

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

    if (!isOpen || !recursos || recursos.length === 0) {
        return null;
    }

    const recursoActivo = recursos[indiceActivo] || recursos[0];
    const embedUrl = recursoActivo.tipo === 'VIDEO' ? extractYouTubeEmbedUrl(recursoActivo.url) : null;
    const tipoConfig = TIPO_ETIQUETAS[recursoActivo.tipo] || {
        label: recursoActivo.tipo || 'Recurso orientativo',
        color: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    };

    const renderContenidoRecurso = () => {
        if (recursoActivo.tipo === 'VIDEO') {
            return (
                <div className="space-y-2">
                    {embedUrl ? (
                        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900 shadow-inner">
                            <iframe
                                src={embedUrl}
                                title={recursoActivo.titulo}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
                            <p className="mb-2 text-sm text-neutral-600">Este video puede visualizarse directamente en su plataforma externa.</p>
                            <a
                                href={recursoActivo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                            >
                                <PlayCircle className="h-4 w-4" />
                                <span>Ver video en plataforma externa</span>
                            </a>
                        </div>
                    )}

                    {embedUrl && recursoActivo.url && (
                        <div className="flex justify-end">
                            <a
                                href={recursoActivo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 transition hover:text-rose-700"
                            >
                                <ExternalLink className="h-3 w-3" />
                                <span>Abrir en YouTube</span>
                            </a>
                        </div>
                    )}
                </div>
            );
        }

        if (recursoActivo.tipo === 'GUIA_DIGITAL') {
            return (
                <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                        <FileText className="h-4 w-4 text-blue-700" />
                        <span>Documento o guía técnica de consulta</span>
                    </div>
                    <p className="text-sm leading-relaxed text-neutral-700">{recursoActivo.descripcion_corta}</p>
                    <div className="pt-2">
                        <a
                            href={recursoActivo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700"
                        >
                            <ExternalLink className="h-4 w-4" />
                            <span>Abrir guía técnica digital</span>
                        </a>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <ExternalLink className="h-4 w-4 text-neutral-700" />
                    <span>Enlace externo de consulta preventiva</span>
                </div>
                <p className="text-sm leading-relaxed text-neutral-700">{recursoActivo.descripcion_corta}</p>
                <div className="pt-2">
                    <a
                        href={recursoActivo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-neutral-800"
                    >
                        <ExternalLink className="h-4 w-4" />
                        <span>Ir al sitio web orientativo</span>
                    </a>
                </div>
            </div>
        );
    };

    return (
        <dialog
            open
            aria-labelledby="recurso-educativo-titulo"
            className="animate-in fade-in fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-3 sm:p-4"
        >
            <button
                type="button"
                aria-label="Cerrar modal"
                tabIndex={-1}
                onClick={onClose}
                className="fixed inset-0 cursor-default bg-neutral-950/50 backdrop-blur-xs"
            />
            <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-neutral-100 bg-white p-5 text-left shadow-2xl sm:p-7">
                {/* Encabezado del Modal */}
                <div className="mb-4 flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-blue-800">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-neutral-500">Material Orientativo Complementario</span>
                                {criterioCodigo && (
                                    <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-sm font-bold text-neutral-700">
                                        {criterioCodigo}
                                    </span>
                                )}
                            </div>
                            <h2 id="recurso-educativo-titulo" className="text-sm leading-snug font-bold text-neutral-900 sm:text-base">
                                {criterioTitulo || recursoActivo.titulo}
                            </h2>
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar modal de material orientativo"
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-600 transition hover:bg-neutral-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Selector de pestañas si hay más de 1 recurso para este criterio */}
                {recursos.length > 1 && (
                    <div className="mb-4">
                        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-600">
                            <Layers className="h-3.5 w-3.5 text-neutral-500" />
                            <span>Materiales disponibles ({recursos.length}):</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {recursos.map((rec, idx) => (
                                <button
                                    key={rec.id}
                                    type="button"
                                    onClick={() => setIndiceActivo(idx)}
                                    className={`shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                        idx === indiceActivo
                                            ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                                            : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                                    }`}
                                >
                                    {idx + 1}. {rec.titulo.length > 28 ? `${rec.titulo.slice(0, 28)}…` : rec.titulo}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tarjeta del Recurso Activo */}
                <div className="space-y-4">
                    {/* Título y Badge de Tipo */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-neutral-900">{recursoActivo.titulo}</h3>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tipoConfig.color}`}>{tipoConfig.label}</span>
                    </div>

                    {/* Visualizador de Contenido según Tipo */}
                    {renderContenidoRecurso()}

                    {/* Descripción orientativa */}
                    {recursoActivo.tipo === 'VIDEO' && recursoActivo.descripcion_corta && (
                        <div className="space-y-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-sm leading-relaxed text-neutral-700">
                            <strong className="block text-sm text-neutral-500">Sobre este material</strong>
                            <span>{recursoActivo.descripcion_corta}</span>
                        </div>
                    )}

                    {/* Metadatos: Fuente y Duración */}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-neutral-500">
                        {recursoActivo.fuente_autor && (
                            <div className="inline-flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-neutral-400" />
                                <span>
                                    <strong className="font-medium text-neutral-700">Fuente:</strong> {recursoActivo.fuente_autor}
                                </span>
                            </div>
                        )}
                        {recursoActivo.duracion_estimada && (
                            <div className="inline-flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                                <span>
                                    <strong className="font-medium text-neutral-700">Duración estimada:</strong> {recursoActivo.duracion_estimada}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Disclaimer Institucional Obligatorio */}
                    <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-600">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                        <span>
                            Material educativo complementario de libre acceso proporcionado por su respectiva fuente. CheckITSE no certifica ni valida
                            oficialmente este contenido externo.
                        </span>
                    </div>

                    {/* Botón de Cierre */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full cursor-pointer rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-neutral-800 active:scale-95"
                        >
                            Cerrar material orientativo
                        </button>
                    </div>
                </div>
            </div>
        </dialog>
    );
};
