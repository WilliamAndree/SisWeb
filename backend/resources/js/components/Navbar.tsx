import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { RegistrarLocalButton } from './RegistrarLocalButton';

interface Usuario {
    readonly id: number;
    readonly name: string;
    readonly email: string;
}

interface EnlaceNav {
    readonly etiqueta: string;
    readonly href: string;
    readonly activo: boolean;
}

const claseFoco = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

function claseEnlace(activo: boolean, movil = false): string {
    const base = movil ? 'block rounded-xl px-4 py-3 text-sm font-semibold' : 'rounded-full px-3.5 py-2 text-sm font-semibold';
    const estado = activo ? 'bg-primary-50 text-primary-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
    return `${base} ${estado} transition ${claseFoco}`;
}

export const Navbar: React.FC = () => {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement | null>(null);
    const { auth } = usePage().props as { auth?: { user: Usuario | null } };
    const usuario = auth?.user ?? null;

    useEffect(() => {
        if (!menuAbierto) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuAbierto(false);
                menuButtonRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [menuAbierto]);

    const esInicio = Boolean(route().current('autoevaluacion.index'));
    const cerrarMenu = () => setMenuAbierto(false);
    const cerrarSesion = () => router.post(route('logout'));

    const enlaces: EnlaceNav[] = [
        { etiqueta: 'Inicio', href: route('autoevaluacion.index'), activo: esInicio },
        { etiqueta: 'Cómo funciona', href: esInicio ? '#como-funciona' : '/#como-funciona', activo: false },
        { etiqueta: 'Aliados técnicos', href: route('directorio.index'), activo: Boolean(route().current('directorio.*')) },
    ];
    if (usuario) {
        enlaces.push({
            etiqueta: 'Mi panel',
            href: route('dashboard'),
            activo: Boolean(route().current('dashboard') || route().current('mis-autoevaluaciones*')),
        });
    }

    const renderEnlace = (enlace: EnlaceNav, movil = false) => {
        const props = {
            className: claseEnlace(enlace.activo, movil),
            'aria-current': enlace.activo ? ('page' as const) : undefined,
            onClick: movil ? cerrarMenu : undefined,
        };
        // Las anclas de la portada usan <a> para que el navegador haga el desplazamiento.
        return enlace.href.includes('#') ? (
            <a key={enlace.etiqueta} href={enlace.href} {...props}>
                {enlace.etiqueta}
            </a>
        ) : (
            <Link key={enlace.etiqueta} href={enlace.href} {...props}>
                {enlace.etiqueta}
            </Link>
        );
    };

    const inicial = usuario?.name.charAt(0).toUpperCase() ?? '';

    return (
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md print:hidden">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <Link
                    href={route('autoevaluacion.index')}
                    onClick={cerrarMenu}
                    className={`flex shrink-0 items-center gap-2.5 rounded-xl ${claseFoco}`}
                >
                    <span className="bg-ink-900 flex size-9 items-center justify-center rounded-xl text-white">
                        <ShieldCheck aria-hidden="true" className="text-primary-300 size-5" />
                    </span>
                    <span className="leading-tight">
                        <span className="block text-base font-extrabold tracking-tight text-slate-900">CheckITSE</span>
                        <span className="hidden text-[11px] font-medium text-slate-500 sm:block">Huancayo</span>
                    </span>
                </Link>

                <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
                    {enlaces.map((enlace) => renderEnlace(enlace))}
                </nav>

                <div className="hidden items-center gap-2 lg:flex">
                    {usuario ? (
                        <>
                            <Link
                                href={route('perfil.show')}
                                className={`flex items-center gap-2 rounded-full border border-slate-200 py-1 pr-3 pl-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${claseFoco}`}
                            >
                                <span className="bg-primary flex size-7 items-center justify-center rounded-full text-xs font-bold text-white">
                                    {inicial}
                                </span>
                                Mi cuenta
                            </Link>
                            <button
                                type="button"
                                onClick={cerrarSesion}
                                aria-label="Cerrar sesión"
                                className={`flex size-9 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 ${claseFoco}`}
                            >
                                <LogOut aria-hidden="true" className="size-4" />
                            </button>
                        </>
                    ) : (
                        <Link href={route('login')} className={claseEnlace(false)}>
                            Ingresar
                        </Link>
                    )}
                    <RegistrarLocalButton variant="compact" />
                </div>

                <div className="flex items-center gap-2 lg:hidden">
                    {/* En pantallas muy angostas (< 380 px) el botón vive dentro del menú. */}
                    <RegistrarLocalButton variant="compact" onClick={cerrarMenu} className="max-[379px]:hidden" />
                    <button
                        ref={menuButtonRef}
                        type="button"
                        onClick={() => setMenuAbierto((prev) => !prev)}
                        aria-expanded={menuAbierto}
                        aria-controls="menu-movil"
                        aria-label={menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
                        className={`flex size-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 ${claseFoco}`}
                    >
                        {menuAbierto ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>
                </div>
            </div>

            {menuAbierto && (
                <nav
                    id="menu-movil"
                    aria-label="Navegación móvil"
                    className="max-h-[calc(100vh-4rem)] space-y-1 overflow-y-auto border-t border-slate-200/70 bg-white px-4 py-4 lg:hidden"
                >
                    <RegistrarLocalButton variant="large" onClick={cerrarMenu} className="mb-3 w-full min-[380px]:hidden" />
                    {enlaces.map((enlace) => renderEnlace(enlace, true))}
                    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                        {usuario ? (
                            <>
                                <Link href={route('perfil.show')} onClick={cerrarMenu} className={claseEnlace(false, true)}>
                                    Mi cuenta · {usuario.name}
                                </Link>
                                <button
                                    type="button"
                                    onClick={cerrarSesion}
                                    className={`flex w-full cursor-pointer items-center gap-2 text-left ${claseEnlace(false, true)}`}
                                >
                                    <LogOut aria-hidden="true" className="size-4" /> Cerrar sesión
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href={route('login')} onClick={cerrarMenu} className={claseEnlace(false, true)}>
                                    Ingresar
                                </Link>
                                <Link href={route('register')} onClick={cerrarMenu} className={claseEnlace(false, true)}>
                                    Crear cuenta gratis
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            )}
        </header>
    );
};

export default Navbar;
