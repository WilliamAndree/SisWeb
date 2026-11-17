import { BookOpen, ExternalLink, FileCheck, Info, PlayCircle, Scale, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

export interface RecursoEducativoData {
    titulo: string;
    video_url: string | null;
    tipo?: string | null;
    base_legal?: string | null;
    evidencia_sugerida?: string | null;
    descripcion?: string | null;
}

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly recurso: RecursoEducativoData | null;
}

const YOUTUBE_EMBED_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)([\w-]{11})|youtu\.be\/([\w-]{11}))/;

function youtubeEmbedUrl(url: string): string | null {
    if (!url) return null;
    const match = YOUTUBE_EMBED_REGEX.exec(url);
    const id = match ? match[1] || match[2] : null;
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export const VideoEducativoModal: React.FC<Readonly<Props>> = ({ isOpen, onClose, recurso }: Readonly<Props>) => {
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

    if (!isOpen || !recurso) return null;

    const embedUrl = recurso.video_url ? youtubeEmbedUrl(recurso.video_url) : null;
    const esRecursoWeb = Boolean(recurso.video_url) && !embedUrl;

    const renderMediaContent = () => {
        if (embedUrl) {
            return (
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900">
                    <iframe
                        src={embedUrl}
                        title={recurso.titulo}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            );
        }

        if (esRecursoWeb) {
            return (
                <a
                    href={recurso.video_url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 py-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
                >
                    <ExternalLink className="h-4 w-4" />
                    <span>Abrir recurso educativo en una nueva pestaña</span>
                </a>
            );
        }

        if (recurso.descripcion) {
            return (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-700">
                    <strong className="mb-1 block text-sm text-neutral-500">Recurso sin video</strong>
                    <p>{recurso.descripcion}</p>
                </div>
            );
        }

        return null;
    };

    return (
        <dialog
            open
            aria-labelledby="video-educativo-titulo"
            className="animate-in fade-in fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4"
        >
            <button
                type="button"
                aria-label="Cerrar modal"
                tabIndex={-1}
                onClick={onClose}
                className="fixed inset-0 cursor-default bg-neutral-950/50 backdrop-blur-xs"
            />
            <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-neutral-100 bg-white p-5 text-left shadow-2xl sm:p-7">
                {/* Cabecera del Modal */}
                <div className="mb-5 flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
                    <div className="flex items-start gap-3">
                        <div className="text-danger-900 shrink-0 rounded-xl border border-rose-100 bg-rose-50 p-2.5">
                            <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="mb-1 block text-sm font-bold text-neutral-400">Micro-learning · Guía Técnica Rápida</span>
                            <h3 id="video-educativo-titulo" className="text-sm leading-snug font-bold text-neutral-900">
                                {recurso.titulo}
                            </h3>
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar guía o video educativo"
                        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500 transition hover:bg-neutral-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Reproductor de video YouTube o enlace externo */}
                <div className="mb-5">{renderMediaContent()}</div>

                {/* Descripción educativa (alternativa textual al video) */}
                {recurso.descripcion &&
                    (recurso.video_url ? (
                        <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5 text-sm leading-relaxed text-neutral-700">
                            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                            <div>
                                <strong className="mb-0.5 block text-sm text-neutral-500">Sobre este recurso</strong>
                                <span>{recurso.descripcion}</span>
                            </div>
                        </div>
                    ) : null)}

                {/* Base Legal */}
                <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5 text-sm leading-relaxed text-neutral-700">
                    <Scale className="text-danger-900 mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                        <strong className="text-danger-900 mb-0.5 block text-sm">Base Legal</strong>
                        <span className="font-mono text-sm">{recurso.base_legal || '—'}</span>
                    </div>
                </div>

                {/* Evidencia orientativa esperada */}
                <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-sm leading-relaxed text-neutral-700">
                    <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <div>
                        <strong className="mb-0.5 block text-sm text-emerald-800">Evidencia orientativa esperada</strong>
                        <span>{recurso.evidencia_sugerida || '—'}</span>
                    </div>
                </div>

                <p className="mb-4 flex items-start gap-1.5 text-sm leading-relaxed text-neutral-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span>Información educativa y de orientación. No reemplaza la verificación que realiza la autoridad competente.</span>
                </p>

                <div className="flex items-center gap-3">
                    {recurso.video_url && embedUrl && (
                        <a
                            href={recurso.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-danger-900 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-neutral-500 transition"
                        >
                            <PlayCircle className="h-3.5 w-3.5" />
                            Ver en YouTube
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 cursor-pointer rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-neutral-800 active:scale-95"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </dialog>
    );
};
