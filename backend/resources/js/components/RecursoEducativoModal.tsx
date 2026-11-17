import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  BookOpen,
  PlayCircle,
  ExternalLink,
  FileText,
  Clock,
  User,
  Info,
  Layers,
} from 'lucide-react';

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

export const RecursoEducativoModal: React.FC<Readonly<Props>> = ({
  isOpen,
  onClose,
  recursos,
  criterioCodigo,
  criterioTitulo,
}: Readonly<Props>) => {
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
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200 shadow-inner">
              <iframe
                src={embedUrl}
                title={recursoActivo.titulo}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-center">
              <p className="text-xs text-neutral-600 mb-2">
                Este video puede visualizarse directamente en su plataforma externa.
              </p>
              <a
                href={recursoActivo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
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
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-rose-700 transition"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Abrir en YouTube</span>
              </a>
            </div>
          )}
        </div>
      );
    }

    if (recursoActivo.tipo === 'GUIA_DIGITAL') {
      return (
        <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
          <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
            <FileText className="w-4 h-4 text-blue-700" />
            <span>Documento o guía técnica de consulta</span>
          </div>
          <p className="text-xs text-neutral-700 leading-relaxed">
            {recursoActivo.descripcion_corta}
          </p>
          <div className="pt-2">
            <a
              href={recursoActivo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir guía técnica digital</span>
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
        <div className="flex items-center gap-2 text-neutral-900 font-semibold text-sm">
          <ExternalLink className="w-4 h-4 text-neutral-700" />
          <span>Enlace externo de consulta preventiva</span>
        </div>
        <p className="text-xs text-neutral-700 leading-relaxed">
          {recursoActivo.descripcion_corta}
        </p>
        <div className="pt-2">
          <a
            href={recursoActivo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition shadow-xs cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in bg-transparent border-0 max-w-none max-h-none w-full h-full m-0"
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
        {/* Encabezado del Modal */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-800 border border-blue-100 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Material Orientativo Complementario
                </span>
                {criterioCodigo && (
                  <span className="font-mono text-[10px] font-bold bg-neutral-100 px-2 py-0.5 rounded text-neutral-700">
                    {criterioCodigo}
                  </span>
                )}
              </div>
              <h2
                id="recurso-educativo-titulo"
                className="text-sm sm:text-base font-bold text-neutral-900 leading-snug"
              >
                {criterioTitulo || recursoActivo.titulo}
              </h2>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de material orientativo"
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de pestañas si hay más de 1 recurso para este criterio */}
        {recursos.length > 1 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-neutral-600">
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              <span>Materiales disponibles ({recursos.length}):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {recursos.map((rec, idx) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => setIndiceActivo(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                    idx === indiceActivo
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
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
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${tipoConfig.color}`}
            >
              {tipoConfig.label}
            </span>
          </div>

          {/* Visualizador de Contenido según Tipo */}
          {renderContenidoRecurso()}

          {/* Descripción orientativa */}
          {recursoActivo.tipo === 'VIDEO' && recursoActivo.descripcion_corta && (
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 leading-relaxed space-y-1">
              <strong className="block text-[10px] uppercase tracking-wider text-neutral-500">
                Sobre este material
              </strong>
              <span>{recursoActivo.descripcion_corta}</span>
            </div>
          )}

          {/* Metadatos: Fuente y Duración */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 pt-1">
            {recursoActivo.fuente_autor && (
              <div className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span>
                  <strong className="font-medium text-neutral-700">Fuente:</strong>{' '}
                  {recursoActivo.fuente_autor}
                </span>
              </div>
            )}
            {recursoActivo.duracion_estimada && (
              <div className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>
                  <strong className="font-medium text-neutral-700">Duración estimada:</strong>{' '}
                  {recursoActivo.duracion_estimada}
                </span>
              </div>
            )}
          </div>

          {/* Disclaimer Institucional Obligatorio */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <span>
              Material educativo complementario de libre acceso proporcionado por su respectiva fuente. CheckITSE no certifica ni valida oficialmente este contenido externo.
            </span>
          </div>

          {/* Botón de Cierre */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
            >
              Cerrar material orientativo
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
