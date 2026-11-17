import { Link } from '@inertiajs/react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Layout de acceso (login, registro y modal "Guardar progreso") con la
 * identidad "Andes": panel índigo con trama andina y formulario en tarjeta clara.
 * En celular el formulario va primero y el panel de beneficios se resume.
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
    enlaceAlterno?: {
        pregunta: string;
        accion: string;
        href: string;
    };
}

const BENEFICIOS = [
    'Guarda tus simulaciones y retómalas cuando quieras.',
    'Compara precios de proveedores de Huancayo y elige.',
    'Arma tu expediente digital listo para la municipalidad.',
] as const;

function PanelMarca({ titulo, subtitulo, badge, compacto }: Readonly<{ titulo: string; subtitulo: string; badge: string; compacto: boolean }>) {
    return (
        <section className="relative">
            <p className="text-sun-300 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-bold">
                {badge}
            </p>
            <h1 className={`mt-5 leading-tight font-bold text-white ${compacto ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl lg:text-5xl'}`}>
                {titulo}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-300">{subtitulo}</p>
            <ul className={`mt-8 space-y-4 ${compacto ? 'hidden lg:block' : 'hidden sm:block'}`}>
                {BENEFICIOS.map((beneficio) => (
                    <li key={beneficio} className="flex items-start gap-3 text-lg text-slate-200">
                        <CheckCircle2 aria-hidden="true" className="text-sun-300 mt-0.5 size-6 shrink-0" />
                        {beneficio}
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
    badge = 'Gratis para emprendedores',
    variant = 'pantalla',
    onCerrar,
    enlaceAlterno,
}: Readonly<AuthLayoutProps>) {
    const esModal = variant === 'modal';

    return (
        <div className={`bg-ink-900 trama-andina relative flex flex-col overflow-hidden text-white ${esModal ? '' : 'min-h-screen'}`}>
            <div aria-hidden="true" className="bg-primary-500/20 pointer-events-none absolute -top-32 -right-24 size-96 rounded-full blur-3xl" />
            <div aria-hidden="true" className="bg-magenta-500/15 pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full blur-3xl" />

            {esModal ? (
                onCerrar && (
                    <div className="relative z-10 flex justify-end px-4 pt-4">
                        <button
                            type="button"
                            onClick={onCerrar}
                            aria-label="Cerrar"
                            className="focus-visible:ring-sun-300 flex size-11 cursor-pointer items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                        >
                            <X aria-hidden="true" className="size-6" />
                        </button>
                    </div>
                )
            ) : (
                <header className="relative z-10">
                    <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
                        <Link
                            href="/"
                            className="focus-visible:ring-sun-300 inline-flex items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                        >
                            <span className="bg-primary-500 flex size-10 items-center justify-center rounded-xl">
                                <ShieldCheck aria-hidden="true" className="size-6 text-white" />
                            </span>
                            <span className="font-display text-xl font-bold">CheckITSE</span>
                        </Link>
                        {enlaceAlterno && (
                            <p className="text-base text-slate-300">
                                {enlaceAlterno.pregunta}{' '}
                                <Link href={enlaceAlterno.href} className="text-sun-300 font-bold underline underline-offset-4">
                                    {enlaceAlterno.accion}
                                </Link>
                            </p>
                        )}
                    </div>
                </header>
            )}

            <main
                className={`relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_minmax(0,32rem)] ${esModal ? 'pb-8' : 'py-8 lg:py-14'}`}
            >
                <div className="order-2 lg:order-1">
                    <PanelMarca titulo={titulo} subtitulo={subtitulo} badge={badge} compacto={esModal} />
                </div>
                <section className="order-1 lg:order-2">
                    <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl shadow-black/30 sm:p-9">{children}</div>
                </section>
            </main>

            {!esModal && (
                <footer className="relative z-10">
                    <div aria-hidden="true" className="franja-andina" />
                </footer>
            )}
        </div>
    );
}
