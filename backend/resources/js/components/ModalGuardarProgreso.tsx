import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Info, Loader2, LogIn, UserPlus } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';

type Pestania = 'crear' | 'iniciar';

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** Autoevaluación cuyo avance se quiere conservar. Obligatorio: este modal solo
   *  existe para el contexto de pausar una autoevaluación, no como acceso genérico
   *  a la cuenta. El acceso genérico vive en las rutas `/login` y `/registro`. */
  readonly uuid: string;
  readonly establecimiento?: string | null;
  readonly destino?: 'checklist' | 'resumen' | null;
}

function obtenerCsrf(): string {
  if (typeof document === 'undefined') return '';

  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

/**
 * Aviso de pausa con guardado de avance.
 *
 * Antes de la Fase 1 este componente también era la pantalla de acceso a la cuenta
 * del Navbar, montada con `uuid={null}`: login, registro y vinculación ocurrían
 * sobre un overlay sin URL. Ese caso ya no existe; el acceso a la cuenta se
 * resuelve en `/login` y `/registro`, y aquí solo queda la decisión contextual de
 * pausar el checklist para conservar el avance.
 *
 * El formulario de acceso se mantiene embebido a propósito: interrumpir el flujo
 * con un viaje a otra pantalla obligaría al ciudadano a transporting el estado del
 * formulario para volver. Quien prefiera la pantalla completa tiene los enlaces
 * visibles al pie.
 */
export const ModalGuardarProgreso: React.FC<Readonly<Props>> = ({
  isOpen,
  onClose,
  uuid,
  establecimiento = null,
  destino = null,
}) => {
  const [pestania, setPestania] = useState<Pestania>('crear');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setPestania('crear');
    setNombre('');
    setTelefono('');
    setEmail('');
    setPassword('');
    setError(null);
    setCargando(false);
    setGuardado(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const endpoint = pestania === 'crear' ? '/registro' : '/login';
    const payload =
      pestania === 'crear'
        ? { name: nombre, email, password, telefono: telefono || undefined }
        : { email, password };

    try {
      const respuesta = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': obtenerCsrf(),
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        if (respuesta.status === 429) {
          setError('Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo.');
        } else {
          const mensaje = datos.errors
            ? Object.values(datos.errors).flat()[0]
            : (datos.message ?? 'No pudimos completar la operación. Inténtalo nuevamente.');

          setError(String(mensaje));
        }
        setCargando(false);
        return;
      }

      const payloadVincular: { uuid: string; destino?: string } = { uuid };
      if (destino) {
        payloadVincular.destino = destino;
      }

      router.post('/autoevaluacion/vincular-cuenta', payloadVincular, {
        preserveScroll: true,
        onSuccess: () => {
          setGuardado(true);
          setCargando(false);
        },
        onError: err => {
          setCargando(false);
          setError(Object.values(err)[0] ?? 'No pudimos guardar tu autoevaluación. Inténtalo nuevamente.');
        },
      });
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'Failed to fetch'
          ? 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.'
          : 'Ocurrió un error inesperado. Inténtalo nuevamente.'
      );
      setCargando(false);
    }
  };

  const classeInput =
    'w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none';

  const classeBotonEnvio =
    'flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

  const renderBotonTexto = () => {
    if (cargando) {
      return (
        <>
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Guardando...
        </>
      );
    }

    if (pestania === 'crear') {
      return (
        <>
          <UserPlus aria-hidden="true" className="h-4 w-4" />
          Crear cuenta y guardar progreso
        </>
      );
    }

    return (
      <>
        <LogIn aria-hidden="true" className="h-4 w-4" />
        Iniciar sesión y guardar progreso
      </>
    );
  };

  /* Contenido de la tarjeta blanca: el shell dark y la mitad institucional
     los aporta `AuthLayout`, que se reutiliza tal cual en la variante modal. */
  const contenido = (
    <>
      {/* Cabecera */}
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 id="guardar-progreso-titulo" className="text-lg font-bold text-slate-900">
          Pausar y guardar mi avance
        </h2>
        <p className="mt-1 text-sm text-slate-500">Conserva tu avance y retómalo cuando quieras</p>
      </div>

      {guardado ? (
        /* -------- Estado de éxito -------- */
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Tu autoevaluación se guardó correctamente</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Ya puedes continuar tu autoevaluación y consultar tu progreso cuando lo necesites desde
              &quot;Mis autoevaluaciones&quot;.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href={route('mis-autoevaluaciones')}
              onClick={onClose}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none text-center"
            >
              Ver mis autoevaluaciones
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
            >
              Entendido, continuar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Aclaración: invitado vs cuenta */}
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <p>
              Puedes completar tu autoevaluación sin crear una cuenta. Si creas o inicias sesión, guardaremos
              este avance en tu cuenta y podrás retomarlo cuando quieras.
            </p>
          </div>

          {establecimiento && (
            <p className="text-left text-xs text-slate-500">
              Guardarás el avance de <strong className="text-slate-800">{establecimiento}</strong>. Si
              continúas como invitado, conserva el enlace de seguimiento de esta autoevaluación.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-left text-red-800"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Pestañas / Selector de Modo */}
          <fieldset className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 border-0 m-0 min-w-0">
            <legend className="sr-only">Modo de autenticación para guardar avance</legend>
            <button
              type="button"
              aria-pressed={pestania === 'crear'}
              onClick={() => setPestania('crear')}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                pestania === 'crear' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Crear cuenta
            </button>
            <button
              type="button"
              aria-pressed={pestania === 'iniciar'}
              onClick={() => setPestania('iniciar')}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                pestania === 'iniciar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              Ya tengo cuenta
            </button>
          </fieldset>

          <form onSubmit={manejarEnvio} className="space-y-3">
            {pestania === 'crear' && (
              <div>
                <label
                  htmlFor="progreso-nombre"
                  className="mb-1 block text-xs font-bold tracking-wider text-slate-500 uppercase"
                >
                  Nombre y apellido
                </label>
                <input
                  id="progreso-nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Ana Quispe"
                  autoComplete="name"
                  className={classeInput}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="progreso-email"
                className="mb-1 block text-xs font-bold tracking-wider text-slate-500 uppercase"
              >
                Correo electrónico
              </label>
              <input
                id="progreso-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
                className={classeInput}
              />
            </div>

            {pestania === 'crear' && (
              <div>
                <label
                  htmlFor="progreso-telefono"
                  className="mb-1 block text-xs font-bold tracking-wider text-slate-500 uppercase"
                >
                  Teléfono (opcional)
                </label>
                <input
                  id="progreso-telefono"
                  type="tel"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="Ej. 987 654 321"
                  autoComplete="tel"
                  className={classeInput}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="progreso-password"
                className="mb-1 block text-xs font-bold tracking-wider text-slate-500 uppercase"
              >
                Contraseña
              </label>
              <input
                id="progreso-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete={pestania === 'crear' ? 'new-password' : 'current-password'}
                className={classeInput}
              />
            </div>

            <button type="submit" disabled={cargando} className={classeBotonEnvio}>
              {renderBotonTexto()}
            </button>
          </form>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-slate-500 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
            >
              Continuar como invitado
            </button>
          </div>

          <p className="text-center text-xs leading-relaxed text-slate-400">
            Al crear tu cuenta, tus autoevaluaciones se conservan de forma segura y podrás retomarlas
            cuando desees.
          </p>

          {/* El acceso a la cuenta también vive en rutas canónicas: quien prefiera
              una pantalla completa, con URL propia y navegación de navegador, las
              tiene disponibles sin perder el enlace de seguimiento del local. */}
          <p className="border-t border-slate-100 pt-3 text-center text-xs text-slate-500">
            ¿Prefieres la pantalla completa?{' '}
            <Link
              href="/login"
              onClick={onClose}
              className="rounded font-semibold text-emerald-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              Iniciar sesión
            </Link>{' '}
            o{' '}
            <Link
              href="/registro"
              onClick={onClose}
              className="rounded font-semibold text-emerald-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              crear una cuenta
            </Link>
            .
          </p>
        </div>
      )}
    </>
  );

  return createPortal(
    <dialog
      open
      aria-labelledby="guardar-progreso-titulo"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-0 backdrop-blur-sm sm:p-4 border-0 max-w-none max-h-none w-full h-full m-0"
    >
      <AuthLayout
        variant="modal"
        onCerrar={onClose}
        badge="Guarda tu avance sin costo"
        titulo="Gestiona el diagnóstico preventivo de tu negocio"
        subtitulo="Accede a tus evaluaciones guardadas, genera borradores oficiales de Anexos ITSE y prepara tu local antes de la diligencia municipal."
      >
        <div className="mx-auto max-h-[85vh] overflow-y-auto sm:max-h-[80vh]">{contenido}</div>
      </AuthLayout>
    </dialog>,
    document.body,
  );
};