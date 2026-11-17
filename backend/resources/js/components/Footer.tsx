import { Link, usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

/** `ancla` marca los destinos que son un fragmento dentro de la portada. */
const ENLACES_NAVEGACION: { texto: string; href: string; ancla?: boolean }[] = [
    { texto: '¿Cómo funciona?', href: '/#como-funciona', ancla: true },
    { texto: 'Simular mi local', href: '/autoevaluacion/nueva' },
    { texto: 'Renovar mi certificado', href: '/#renovacion', ancla: true },
    { texto: 'Aliados técnicos', href: '/directorio' },
    { texto: 'Anunciar mi negocio', href: '/directorio/anunciate' },
];

const MARCO_NORMATIVO = [
    'D.S. N° 002-2018-PCM, Reglamento de ITSE',
    'R.J. N° 016-2018-CENEPRED/J, Manual de Ejecución de ITSE',
    'Reglamento Nacional de Edificaciones (RNE)',
    'Código Nacional de Electricidad (CNE-U)',
];

/**
 * Pie único de la aplicación (lo renderiza `layouts/AppLayout.tsx`): marca,
 * navegación, marco normativo y deslinde legal. Ninguna página debe duplicarlo.
 */
export default function Footer() {
    const enPortada = usePage().url === '/';
    // En la portada el ancla es un fragmento puro; fuera de ella, ruta con ancla.
    const hrefDe = (href: string, ancla?: boolean) => (ancla && enPortada ? href.replace('/#', '#') : href);

    return (
        <footer className="bg-ink-900 mt-24 text-slate-300">
            <div aria-hidden="true" className="franja-andina" />
            <div className="trama-andina px-6 pt-14 pb-10 lg:px-8">
                <div className="mx-auto grid w-full max-w-7xl gap-12 md:grid-cols-[1.4fr_1fr_1.4fr]">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="bg-primary-500 flex size-11 items-center justify-center rounded-xl text-white">
                                <ShieldCheck aria-hidden="true" className="size-6" />
                            </span>
                            <p className="font-display text-2xl font-bold text-white">CheckITSE Huancayo</p>
                        </div>
                        <p className="mt-4 max-w-sm text-base leading-relaxed">
                            Simula tu inspección de seguridad, corrige lo que falta con proveedores de tu zona y llega listo a tu municipalidad.
                        </p>
                    </div>

                    <nav aria-label="Enlaces del sitio">
                        <p className="text-sun-300 text-base font-bold">Navegación</p>
                        <ul className="mt-4 space-y-1">
                            {ENLACES_NAVEGACION.map((enlace) => (
                                <li key={enlace.href}>
                                    <Link
                                        href={hrefDe(enlace.href, enlace.ancla)}
                                        className="focus-visible:ring-sun-300 inline-flex min-h-10 items-center rounded text-base text-slate-200 transition hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                                    >
                                        {enlace.texto}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div>
                        <p className="text-sun-300 text-base font-bold">Marco normativo</p>
                        <ul className="mt-4 space-y-2 text-base">
                            {MARCO_NORMATIVO.map((norma) => (
                                <li key={norma}>{norma}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-6 text-sm leading-relaxed text-slate-400">
                    <p>
                        CheckITSE no es una inspección oficial ni reemplaza al inspector técnico de seguridad. No emite licencias, autorizaciones ni
                        certificados. Los resultados reflejan solo lo que declara cada usuario.
                    </p>
                    <p className="mt-3">© CheckITSE Huancayo · Herramienta preventiva según el D.S. N° 002-2018-PCM</p>
                </div>
            </div>
        </footer>
    );
}
