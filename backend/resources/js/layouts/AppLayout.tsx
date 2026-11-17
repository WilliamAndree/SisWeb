import Footer from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

interface AppLayoutProps {
    readonly children: React.ReactNode;
}

export default function AppLayout({ children }: Readonly<AppLayoutProps>) {
    return (
        <div className="bg-canvas flex min-h-screen flex-col font-sans text-neutral-900 antialiased print:bg-white">
            <a
                href="#main-content"
                className="focus:bg-primary-700 focus:ring-primary-500 sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg focus:ring-2 focus:outline-none"
            >
                Saltar al contenido principal
            </a>

            <div className="print:hidden">
                <Navbar />
            </div>

            <main
                id="main-content"
                tabIndex={-1}
                className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none focus:outline-none sm:px-6 sm:py-10 print:max-w-none print:p-0"
            >
                {children}
            </main>

            {/* Pie único de la aplicación. Las páginas no deben renderizar su
                propio `Footer`: el marco normativo y el deslinde legal ya viven
                aquí, de modo que no se dupliquen entre Home y Directorio. */}
            <div className="print:hidden">
                <Footer />
            </div>
        </div>
    );
}
