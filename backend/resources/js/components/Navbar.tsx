import React, { useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    PlusCircle,
    ShieldCheck,
    Sparkles,
    Store,
    UserRound,
    X,
} from 'lucide-react';
import { RegistrarLocalButton } from './RegistrarLocalButton';

interface Usuario {
    readonly id: number;
    readonly name: string;
    readonly email: string;
}

/**
 * Anclas públicas de la portada. Dentro de `/` se usa un fragmento del mismo
 * documento para que el desplazamiento sea continuo y sin recarga completa;
 * desde cualquier otra página se mantiene el prefijo `/` para no romper la
 * navegación Inertia hacia la portada.
 */
const ANCLAS_PORTADA = [
    { id: 'que-es', etiqueta: '¿Qué es?' },
    { id: 'como-funciona', etiqueta: 'Cómo funciona' },
    { id: 'beneficios', etiqueta: 'Beneficios' },
    { id: 'normativa', etiqueta: 'Normativa' },
] as const;

export const Navbar: React.FC = () => {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement | null>(null);
    const props = usePage().props as { auth?: { user: Usuario | null } };
    const url = usePage().url;
    const usuario = props.auth?.user ?? null;

    useEffect(() => {
        if (!menuAbierto) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuAbierto(false);
                menuButtonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [menuAbierto]);

    const cerrarSesion = () => {
        router.post(route('logout'));
    };

    const cerraMenu = () => {
        setMenuAbierto(false);
    };

    // Determinación de estado activo mediante Ziggy
    const esInicio = Boolean(route().current('autoevaluacion.index'));
    const esAliados = Boolean(route().current('directorio.index') || route().current('directorio.*'));
    const esPanel = Boolean(route().current('dashboard') || route().current('mis-autoevaluaciones*'));
    const esMiCuenta = Boolean(route().current('perfil.show') || route().current('perfil.*'));

    const hrefAncla = (id: string) => (esInicio ? `#${id}` : `/#${id}`);

    let claseInicio = 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50';
    if (esInicio) {
        claseInicio = 'bg-emerald-50 text-emerald-700';
    }

    let claseAliados = 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50';
    if (esAliados) {
        claseAliados = 'bg-emerald-50 text-emerald-700';
    }

    let clasePanel = 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50';
    if (esPanel) {
        clasePanel = 'bg-emerald-50 text-emerald-700';
    }

    return (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-sm print:hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-4">
                <Link
                    href={route('autoevaluacion.index')}
                    onClick={cerraMenu}
                    className="flex items-center gap-2.5 shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                    <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-900/20">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-base sm:text-lg font-bold tracking-tight text-neutral-900">CheckITSE</span>
                        <span className="hidden sm:inline-flex text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            Ciudadano
                        </span>
                    </div>
                </Link>

                {/* Navegación de escritorio */}
                <nav className="hidden lg:flex items-center gap-1" aria-label="Navegación principal">
                    <Link
                        href={route('autoevaluacion.index')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${claseInicio}`}
                    >
                        Inicio
                    </Link>
                    {esInicio &&
                        ANCLAS_PORTADA.map(ancla => (
                            <a
                                key={ancla.id}
                                href={hrefAncla(ancla.id)}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                {ancla.etiqueta}
                            </a>
                        ))}

                    {usuario && (
                        <Link
                            href={route('dashboard')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${clasePanel}`}
                        >
                            Mi Panel
                        </Link>
                    )}

                    <Link
                        href={route('directorio.index')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${claseAliados}`}
                    >
                        Aliados Técnicos
                    </Link>

                    <RegistrarLocalButton variant="compact" />
                </nav>

                {usuario ? (
                    <div className="hidden lg:flex items-center gap-2.5">
                        <Link
                            href={route('perfil.show')}
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                esMiCuenta
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50/60 hover:bg-emerald-50 border-emerald-100'
                            }`}
                        >
                            <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
                                {usuario.name.charAt(0).toUpperCase()}
                            </span>
                            <span>Mi Cuenta</span>
                        </Link>

                        <button
                            type="button"
                            onClick={cerrarSesion}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-50 px-3 py-2 rounded-xl transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Cerrar Sesión
                        </button>
                    </div>
                ) : (
                    <div className="hidden lg:flex items-center gap-2">
                        <Link
                            href={route('login')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-neutral-700 transition hover:border-slate-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <UserRound className="w-3.5 h-3.5" />
                            Iniciar Sesión
                        </Link>
                        <Link
                            href={route('register')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Crear Cuenta
                        </Link>
                    </div>
                )}

                {/* Acceso rápido a la acción principal en celular y tableta */}
                <RegistrarLocalButton
                    variant="compact"
                    onClick={cerraMenu}
                    className="lg:hidden"
                />

                {/* Botón de menú colapsable */}
                <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => setMenuAbierto(prev => !prev)}
                    aria-expanded={menuAbierto}
                    aria-controls="menu-movil"
                    aria-label={menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
                    className="lg:hidden inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl text-neutral-700 border border-neutral-200 bg-white hover:bg-neutral-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                >
                    {menuAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Menú colapsable de celular y tableta */}
            {menuAbierto && (
                <nav
                    id="menu-movil"
                    aria-label="Navegación móvil"
                    className="lg:hidden border-t border-slate-200/70 bg-white/95 backdrop-blur-md max-h-[calc(100vh-4rem)] overflow-y-auto px-4 sm:px-6 py-4 space-y-2"
                >
                    <Link
                        href={route('autoevaluacion.index')}
                        onClick={cerraMenu}
                        className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${claseInicio}`}
                    >
                        Inicio
                    </Link>
                    {esInicio &&
                        ANCLAS_PORTADA.map(ancla => (
                            <a
                                key={ancla.id}
                                href={hrefAncla(ancla.id)}
                                onClick={cerraMenu}
                                className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                {ancla.etiqueta}
                            </a>
                        ))}

                    {usuario && (
                        <Link
                            href={route('dashboard')}
                            onClick={cerraMenu}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${clasePanel}`}
                        >
                            <LayoutDashboard className="w-4 h-4 text-slate-500" />
                            Mi Panel
                        </Link>
                    )}

                    <Link
                        href={route('directorio.index')}
                        onClick={cerraMenu}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${claseAliados}`}
                    >
                        <Store className="w-4 h-4" />
                        Aliados Técnicos
                    </Link>

                    {usuario ? (
                        <>
                            <div className="border-t border-slate-100 my-2 pt-2">
                                <Link
                                    href={route('perfil.show')}
                                    onClick={cerraMenu}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition"
                                >
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                                        {usuario.name.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="min-w-0">
                                        <span className="block text-xs font-bold text-neutral-900 truncate">
                                            {usuario.name}
                                        </span>
                                        <span className="block text-[10px] text-emerald-700 font-semibold">
                                            Mi Cuenta
                                        </span>
                                    </div>
                                </Link>
                            </div>

                            <button
                                type="button"
                                onClick={cerrarSesion}
                                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar Sesión
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="border-t border-slate-100 my-2 pt-2 space-y-2">
                                <Link
                                    href={route('login')}
                                    onClick={cerraMenu}
                                    className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-700 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <UserRound className="w-4 h-4" />
                                    Iniciar Sesión
                                </Link>
                                <Link
                                    href={route('register')}
                                    onClick={cerraMenu}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Crear Cuenta
                                </Link>
                            </div>
                        </>
                    )}
                </nav>
            )}
        </header>
    );
};

export default Navbar;
