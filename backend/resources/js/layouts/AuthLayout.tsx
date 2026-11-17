import { useId, type ReactNode } from 'react';
import { CircleCheck, ShieldCheck, X } from 'lucide-react';

/**
 * Layout de autenticación Split Screen (patrón tecnológico dark).
 *
 * Existe para que el acceso a la cuenta se presente siempre igual. Hoy el único
 * flujo de autenticación es el modal `ModalGuardarProgreso`; si mañana se añaden
 * páginas de Login o Register, consumen este mismo layout sin volver a maquetar
 * la mitad institucional.
 *
 * No replica `AppLayout` a propósito: durante el acceso no hay navegación útil y
 * el Navbar dispararía un segundo modal de autenticación sobre sí mismo. El marco
 * normativo se declara aquí como garantía del servicio.
 */

type AuthLayoutVariant = 'pantalla' | 'modal';

interface AuthLayoutProps {
  children: ReactNode;
  titulo: string;
  subtitulo: string;
  badge?: string;
  variant?: AuthLayoutVariant;
  /** Solo en `modal`: controla el cierre del overlay. */
  onCerrar?: () => void;
  /**
   * Enlace de la cabecera. Opcional porque el modal ya ofrece ambas acciones con
   * sus pestañas internas, y repetirlas arriba sería redundante.
   */
  enlaceAlterno?: {
    pregunta: string;
    accion: string;
    /** Destino ya resuelto por la vista: el layout no inventa rutas. */
    href: string;
  };
}

/** Garantías cívicas del panel oscuro. */
const GARANTIAS = [
  'Sin costo ni intermediarios para comerciantes de Huancayo.',
  'Estimación alineada a D.S. N° 002-2018-PCM y R.J. 016-2018-CENEPRED.',
  'Descarga de borradores de Anexos 1, 4 y 9 listos para mesa de partes.',
] as const;

/**
 * Trazado de circuitos como fondo absoluto. Es decorativo: se oculta a lectores
 * de pantalla y no intercepta puntero para no ensuciar la navegación por teclado.
 * El `id` del patrón se deriva de `useId` porque el SVG puede llegar a montarse
 * dos veces en el mismo documento y los `id` duplicados romperían el `fill`.
 */
function CircuitosBackground() {
  const idPatterno = useId();

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-emerald-400 opacity-10"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={idPatterno} width="64" height="64" patternUnits="userSpaceOnUse">
          <path
            d="M0 16h16v16h32M16 32v32M48 0v32h16M32 48v16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle cx="16" cy="16" r="2" fill="currentColor" />
          <circle cx="48" cy="32" r="2" fill="currentColor" />
          <circle cx="16" cy="64" r="1.5" fill="currentColor" />
          <circle cx="64" cy="16" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${idPatterno})`} />
    </svg>
  );
}

interface PanelPromesaProps {
  titulo: string;
  subtitulo: string;
  badge: string;
  compacto: boolean;
}

/** Panel izquierdo: promesa institucional y garantías cívicas. */
function PanelPromesa({
  titulo,
  subtitulo,
  badge,
  compacto,
}: Readonly<PanelPromesaProps>) {
  return (
    <section className="lg:col-span-7">
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-medium text-emerald-400">
        {badge}
      </span>

      <h1
        className={
          compacto
            ? 'text-2xl leading-tight font-black tracking-tight text-white sm:text-3xl'
            : 'text-3xl leading-tight font-black tracking-tight text-white sm:text-4xl lg:text-5xl'
        }
      >
        {titulo}
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">{subtitulo}</p>

      <ul className="mt-8 space-y-3.5">
        {GARANTIAS.map((garantia) => (
          <li key={garantia} className="flex items-start gap-3">
            <CircleCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-400" aria-hidden="true" />
            <span className="text-sm leading-relaxed text-slate-300">{garantia}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AuthLayout({
  children,
  titulo,
  subtitulo,
  badge = 'Acceso ciudadano gratuito',
  variant = 'pantalla',
  onCerrar,
  enlaceAlterno,
}: Readonly<AuthLayoutProps>) {
  const esModal = variant === 'modal';

  return (
    <div
      className={
        esModal
          ? 'relative flex flex-col overflow-hidden bg-slate-950 text-slate-100'
          : 'relative flex min-h-screen flex-col justify-between overflow-hidden bg-slate-950 text-slate-100'
      }
    >
      <CircuitosBackground />

      {/* Luces de color que rompen la planitud del fondo oscuro. */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl"
        aria-hidden="true"
      />

      {esModal && onCerrar ? (
        <div className="relative z-10 flex items-center justify-end px-4 pt-4 sm:px-6">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <header className="relative z-10 border-b border-white/5">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-5">
            <a
              href="/"
              className="inline-flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold tracking-tight text-white">CheckITSE Huancayo</span>
            </a>

            {enlaceAlterno && (
              <p className="text-sm text-slate-400">
                {enlaceAlterno.pregunta}{' '}
                <a
                  href={enlaceAlterno.href}
                  className="rounded font-semibold text-emerald-400 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
                >
                  {enlaceAlterno.accion}
                </a>
              </p>
            )}
          </div>
        </header>
      )}

      <main
        className={
          esModal
            ? 'relative z-10 mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:gap-12'
            : 'relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-12'
        }
      >
        <PanelPromesa titulo={titulo} subtitulo={subtitulo} badge={badge} compacto={esModal} />

        {/* El formulario o estado que inyecta la vista va siempre sobre blanco. */}
        <section className="lg:col-span-5">
          <div className="relative rounded-2xl border border-slate-100 bg-white p-7 text-slate-900 shadow-2xl sm:p-8">
            {children}
          </div>
        </section>
      </main>

      {!esModal && (
        <footer className="relative z-10 border-t border-white/5">
          <div className="mx-auto w-full max-w-7xl px-6 py-5">
            <p className="text-xs leading-relaxed text-slate-500">
              Herramienta cívica orientativa. No sustituye la inspección técnica ni la evaluación
              oficial que emite la municipalidad.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}