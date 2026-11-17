import { Link, usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

/** `ancla` marca los destinos que son un fragmento dentro de la portada. */
const ENLACES_NAVEGACION: { texto: string; href: string; ancla?: boolean }[] = [
  { texto: '¿Cómo funciona?', href: '/#como-funciona', ancla: true },
  { texto: 'Proveedores', href: '/directorio' },
  { texto: 'Autoevaluar mi local', href: '/autoevaluacion/nueva' },
];

/**
 * Compendio normativo de referencia. Vive en el cuerpo del footer y no en un
 * slot `children` para que Home y Directorio muestren exactamente el mismo
 * bloque, sin depender de que cada página lo reescriba.
 */
const MARCO_NORMATIVO: { norma: string; detalle: string }[] = [
  {
    norma: 'Manual CENEPRED',
    detalle: 'Inspección Técnica de Seguridad en Edificaciones (ITSE)',
  },
  { norma: 'R.J. N° 016-2018-CENEPRED/J', detalle: '' },
  { norma: 'D.S. N° 002-2018-PCM', detalle: '' },
  { norma: 'Reglamento Nacional de Edificaciones (RNE)', detalle: '' },
  { norma: 'Código Nacional de Electricidad (CNE-U)', detalle: '' },
];

/**
 * Pie institucional único de la aplicación: lo renderiza `layouts/AppLayout.tsx`.
 *
 * Concentra en un solo lugar lo que la plataforma es y lo que no es: la marca
 * institucional, el marco normativo de referencia y el deslinde legal. Ninguna
 * página debe renderizar su propio pie ni duplicar esos bloques.
 */
export default function Footer() {
  const url = usePage().url;
  const enPortada = url === '/';

  // En la portada el destino se resuelve como fragmento puro; fuera de ella, como
  // ruta con ancla. Ir a `/#ancla` desde `/` no desplaza: Inertia no gestiona el
  // scroll cuando la URL resultante es la misma página.
  const hrefDe = (href: string, ancla?: boolean) => (ancla && enPortada ? href.replace('/#', '#') : href);

  return (
    <footer className="mt-16 border-t border-slate-100 bg-white px-6 pt-12 pb-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <p className="text-lg font-bold text-slate-900">CheckITSE Huancayo</p>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
              Sistema de autoevaluación y diagnóstico de seguridad para comerciantes de Huancayo. Prepárate antes de
              la inspección municipal oficial de ITSE.
            </p>
          </div>

          <nav aria-label="Enlaces institucionales" className="md:text-right">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Navegación</p>
            <ul className="mt-3 space-y-2">
              {ENLACES_NAVEGACION.map((enlace) => (
                <li key={enlace.href}>
                  <Link
                    href={hrefDe(enlace.href, enlace.ancla)}
                    className="inline-flex min-h-[36px] items-center text-sm font-medium text-slate-600 transition hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-lg"
                  >
                    {enlace.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Marco normativo de referencia</p>
            <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-slate-600">
              {MARCO_NORMATIVO.map((entrada) => (
                <li key={entrada.norma}>
                  <span className="font-semibold text-slate-700">{entrada.norma}</span>
                  {entrada.detalle && ` — ${entrada.detalle}`}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Alcance del servicio</p>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
              CheckITSE Huancayo no constituye inspección oficial ni reemplaza la labor del inspector técnico de
              seguridad. No emite licencias, autorizaciones, certificaciones ni actas. Los resultados reflejan
              únicamente las condiciones declaradas por el ciudadano.
            </p>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-slate-500">Herramienta gratuita. Sin registros obligatorios.</p>

        <p className="mt-12 text-xs text-slate-400">
          © CheckITSE • Herramienta de autoevaluación preventiva según D.S. N° 002-2018-PCM
        </p>
      </div>
    </footer>
  );
}