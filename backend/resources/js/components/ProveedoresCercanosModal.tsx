import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  Loader2,
  Search,
  Navigation,
  Info,
  Target,
  Store,
} from 'lucide-react';

export interface ProveedorCercano {
  id: number;
  razon_social: string;
  nombre_comercial?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  latitud: number;
  longitud: number;
  servicios_ofrecidos?: string | null;
  distancia_km: number;
}

interface RespuestaProveedores {
  codigo: string;
  categoria: string;
  nombre_categoria: string;
  radio_km: number;
  radio_extendido: boolean;
  proveedores: ProveedorCercano[];
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly codigo: string | null;
  readonly nombreItem?: string | null;
  readonly sectorRef?: string | null;
}

// Referencia aproximada: centro de Huancayo. El directorio es comunitario y
// referencial; no se solicita ubicación GPS del navegador porque el sistema no
// registra coordenadas del establecimiento.
const LAT_REFERENCIA = -12.068;
const LON_REFERENCIA = -75.21;

const OPCIONES_RADIO = [
  { etiqueta: '5 km', valor: 5 },
  { etiqueta: '10 km', valor: 10 },
  { etiqueta: 'Valle del Mantaro', valor: 25 },
];

function whatsappUrl(numero: string | null | undefined): string | null {
  const digitos = (numero ?? '').replace(/\D/g, '');

  return digitos ? `https://wa.me/${digitos}` : null;
}

function osmUrl(latitud: number, longitud: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=16/${latitud}/${longitud}`;
}

export const ProveedoresCercanosModal: React.FC<Readonly<Props>> = ({ isOpen, onClose, codigo, nombreItem, sectorRef }: Readonly<Props>) => {
  const [radio, setRadio] = useState<number>(5);
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaProveedores | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const cargarRecursos = useCallback(
    async (radioKm: number) => {
      if (!codigo) return;

      setCargando(true);
      setError(null);
      setRespuesta(null);

      try {
        const params = new URLSearchParams({
          lat: String(LAT_REFERENCIA),
          lon: String(LON_REFERENCIA),
          radio: String(radioKm),
        });
        const res = await fetch(`/autoevaluacion/recursos-cercanos/${encodeURIComponent(codigo)}?${params}`);

        if (!res.ok) {
          throw new Error('No fue posible consultar los recursos cercanos en este momento.');
        }

        setRespuesta((await res.json()) as RespuestaProveedores);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error de red al consultar los recursos cercanos.');
      } finally {
        setCargando(false);
      }
    },
    [codigo]
  );

  useEffect(() => {
    if (!isOpen || !codigo) return;

    setRespuesta(null);
    setError(null);
    setRadio(5);
    void cargarRecursos(5);
  }, [isOpen, codigo, cargarRecursos]);

  useEffect(() => {
    if (!isOpen) return;

    const anteriormenteFocalizado = document.activeElement as HTMLElement | null;

    const manejarTeclado = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();

        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const enfocables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
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
    };

    window.addEventListener('keydown', manejarTeclado);
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', manejarTeclado);
      document.body.style.overflow = '';
      anteriormenteFocalizado?.focus?.();
    };
  }, [isOpen, onClose]);

  const cambiarRadio = (valor: number) => {
    setRadio(valor);
    void cargarRecursos(valor);
  };

  if (!isOpen || !codigo) return null;

  return (
    <dialog
      open
      aria-labelledby="recursos-cercanos-titulo"
      aria-describedby="recursos-cercanos-intro"
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
        ref={panelRef}
        className="relative z-10 bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-7 shadow-2xl border border-neutral-100 text-left"
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary-50 rounded-xl text-primary-700 border border-primary-100 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Directorio Comunitario · Valle del Mantaro
              </span>
              <h3 id="recursos-cercanos-titulo" className="text-sm font-bold text-neutral-900 leading-snug">
                Recursos cercanos
              </h3>
              {nombreItem && (
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  <span className="font-mono font-bold text-primary-700">{codigo}</span> · {nombreItem}
                </p>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar recursos cercanos"
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Texto introductorio */}
        <p id="recursos-cercanos-intro" className="text-xs text-neutral-600 leading-relaxed">
          Consulta algunas opciones cercanas que podrían ayudarte a atender aspectos pendientes de tu establecimiento.
          Esta lista es solo una ayuda referencial.
        </p>

        {/* Aviso de carácter referencial */}
        <div
          role="note"
          aria-label="Aviso sobre el carácter referencial de los recursos"
          className="mt-3 flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-[11px] leading-relaxed text-sky-900"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            <strong>Aviso importante:</strong> estos recursos son referenciales. CheckITSE no verifica ni certifica que los
            proveedores estén autorizados, disponibles o especializados para realizar el trabajo que necesitas.
          </p>
        </div>

        {/* Relación con el aspecto pendiente */}
        {nombreItem && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-[11px] leading-relaxed text-neutral-700">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-700" />
            <p>
              <strong>Aspecto relacionado:</strong> {nombreItem}.
              <br />
              Puedes consultar recursos relacionados con este tipo de trabajo. Es solo una orientación.
            </p>
          </div>
        )}

        {/* Zona del establecimiento (referencia aproximada) */}
        {sectorRef && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-neutral-200 bg-white px-3.5 py-3 text-[11px] leading-relaxed text-neutral-600">
            <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <p>
              Zona de tu establecimiento registrada: <strong>{sectorRef}</strong>. La cercanía real de cada recurso debe
              verificarse directamente con el proveedor.
            </p>
          </div>
        )}

        {/* Selector de radio de búsqueda */}
        <div className="mt-4">
          <span className="block text-[11px] font-bold uppercase text-neutral-500 mb-1.5">
            Radio de búsqueda aproximado
          </span>
          <div className="grid grid-cols-3 gap-2">
            {OPCIONES_RADIO.map(opcion => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => cambiarRadio(opcion.valor)}
                className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  radio === opcion.valor
                    ? 'bg-primary-50 border-primary-300 text-primary-800 font-bold ring-1 ring-primary-300'
                    : 'bg-white border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50'
                }`}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium">
            <Navigation className="w-3 h-3" />
            Distancias aproximadas medidas desde el centro de Huancayo como referencia
          </p>
        </div>

        {/* Estado de carga / error */}
        {cargando && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-neutral-500 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            Consultando recursos referenciales...
          </div>
        )}

        {!cargando && error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-danger-900 font-medium">
            {error}
          </div>
        )}

        {!cargando && !error && respuesta && (
          <>
            {respuesta.radio_extendido && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 mb-3 flex items-start gap-2">
                <Search className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Sin resultados dentro del radio seleccionado; se muestran los recursos más cercanos del Valle del Mantaro.
                </span>
              </div>
            )}

            {respuesta.proveedores.length === 0 ? (
              <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-100 text-center">
                <MapPin className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-neutral-700">
                  No encontramos recursos referenciales para este aspecto.{' '}
                  <span className="font-normal text-neutral-500">({respuesta.nombre_categoria})</span>
                </p>
                <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
                  Puedes buscar un proveedor especializado en tu zona y verificar directamente sus servicios, disponibilidad
                  y condiciones.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden">
                {respuesta.proveedores.map(proveedor => {
                  const wa = whatsappUrl(proveedor.whatsapp);
                  const nombre = proveedor.nombre_comercial || proveedor.razon_social;

                  return (
                    <div key={proveedor.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-white">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-neutral-900">{nombre}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-full px-2 py-0.5">
                            <MapPin className="w-3 h-3" /> ≈ {proveedor.distancia_km.toFixed(1)} km
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                          {[proveedor.distrito, proveedor.direccion].filter(Boolean).join(' · ')}
                        </p>
                        {proveedor.servicios_ofrecidos && (
                          <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                            {proveedor.servicios_ofrecidos}
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          {proveedor.telefono && (
                            <a
                              href={`tel:${proveedor.telefono}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 px-2.5 py-1.5 rounded-lg transition"
                            >
                              <Phone className="w-3 h-3" /> Llamar
                            </a>
                          )}
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition"
                            >
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </a>
                          )}
                          <a
                            href={osmUrl(proveedor.latitud, proveedor.longitud)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1.5 rounded-lg transition"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver en el mapa
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-[10px] leading-relaxed text-neutral-500">
              Información referencial comunitaria. No implica recomendación, garantía, autorización oficial ni relación con la
              inspección municipal.
            </div>
          </>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </dialog>
  );
};
