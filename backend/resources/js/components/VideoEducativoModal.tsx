import React, { useEffect, useRef } from 'react';
import { X, BookOpen, PlayCircle, FileCheck, Scale, ExternalLink, Info } from 'lucide-react';

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
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200">
          <iframe
            src={embedUrl}
            title={recurso.titulo}
            className="w-full h-full"
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
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Abrir recurso educativo en una nueva pestaña</span>
        </a>
      );
    }

    if (recurso.descripcion) {
      return (
        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-700 leading-relaxed">
          <strong className="text-xs uppercase tracking-wider text-neutral-500 block mb-1">
            Recurso sin video
          </strong>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in bg-transparent border-0 max-w-none max-h-none w-full h-full m-0"
    >
      <button
        type="button"
        aria-label="Cerrar modal"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs cursor-default"
      />
      <div
        className="relative z-10 bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-7 shadow-2xl border border-neutral-100 text-left"
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100 mb-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-danger-900 border border-rose-100 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Micro-learning · Guía Técnica Rápida
              </span>
              <h3 id="video-educativo-titulo" className="text-sm font-bold text-neutral-900 leading-snug">
                {recurso.titulo}
              </h3>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía o video educativo"
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reproductor de video YouTube o enlace externo */}
        <div className="mb-5">
          {renderMediaContent()}
        </div>

        {/* Descripción educativa (alternativa textual al video) */}
        {recurso.descripcion && (recurso.video_url ? (
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 mb-3 flex items-start gap-2.5 text-xs text-neutral-700 leading-relaxed">
            <BookOpen className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-0.5">
                Sobre este recurso
              </strong>
              <span>{recurso.descripcion}</span>
            </div>
          </div>
        ) : null)}

        {/* Base Legal */}
        <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 mb-3 flex items-start gap-2.5 text-xs text-neutral-700 leading-relaxed">
          <Scale className="w-4 h-4 text-danger-900 shrink-0 mt-0.5" />
          <div>
            <strong className="text-[10px] uppercase tracking-wider text-danger-900 block mb-0.5">
              Base Legal
            </strong>
            <span className="font-mono text-[11px]">{recurso.base_legal || '—'}</span>
          </div>
        </div>

        {/* Evidencia orientativa esperada */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 mb-5 flex items-start gap-2.5 text-xs text-neutral-700 leading-relaxed">
          <FileCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-[10px] uppercase tracking-wider text-emerald-800 block mb-0.5">
              Evidencia orientativa esperada
            </strong>
            <span>{recurso.evidencia_sugerida || '—'}</span>
          </div>
        </div>

        <p className="text-[11px] text-neutral-500 leading-relaxed mb-4 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-neutral-400" />
          <span>
            Información educativa y de orientación. No reemplaza la verificación que realiza la autoridad competente.
          </span>
        </p>

        <div className="flex items-center gap-3">
          {recurso.video_url && embedUrl && (
            <a
              href={recurso.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-danger-900 transition cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Ver en YouTube
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </dialog>
  );
};
