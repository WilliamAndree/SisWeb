import Footer from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { useRevelarAlBajar } from '@/hooks/use-revelar-al-bajar';
import { usePage } from '@inertiajs/react';

interface AppLayoutProps {
    readonly children: React.ReactNode;
    /**
     * `completo`: el contenido ocupa todo el ancho (portadas con foto de borde a
     * borde). La página se encarga de centrar sus propias secciones.
     */
    readonly ancho?: 'contenido' | 'completo';
    /** La página empieza con una foto a pantalla completa: la barra va encima y se vuelve blanca al bajar. */
    readonly navSobreImagen?: boolean;
}

export default function AppLayout({ children, ancho = 'contenido', navSobreImagen = false }: Readonly<AppLayoutProps>) {
    useRevelarAlBajar(usePage().url);
    const claseMain =
        ancho === 'completo'
            ? 'w-full flex-1 outline-none focus:outline-none'
            : 'mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none focus:outline-none sm:px-6 sm:py-10 print:max-w-none print:p-0';

    return (
        <div className="bg-canvas flex min-h-screen flex-col font-sans text-neutral-900 antialiased print:bg-white">
            <a
                href="#main-content"
                className="focus:bg-primary-700 focus:ring-primary-500 sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:ring-2 focus:outline-none"
            >
                Saltar al contenido principal
            </a>

            {/* La barra se queda visible al bajar: el contenedor es el que es sticky. */}
            <div className={`${navSobreImagen ? 'fixed inset-x-0' : 'sticky'} top-0 z-40 print:hidden`}>
                <Navbar sobreImagen={navSobreImagen} />
            </div>

            <main id="main-content" tabIndex={-1} className={claseMain}>
                {children}
            </main>

            {/* Pie único de la aplicación: las páginas no renderizan su propio pie. */}
            <div className="print:hidden">
                <Footer />
            </div>
        </div>
    );
}
