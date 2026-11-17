import React from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Loader2, LogIn } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';

/**
 * `useForm` exige un tipo con firma de índice, que TypeScript solo infiere para
 * alias de tipo y no para `interface`. Se declara como `type` para conservar
 * además `keyof` preciso en el tipado de errores.
 */
type DatosLogin = {
    email: string;
    password: string;
    remember: boolean;
};

/**
 * Destino tras un inicio de sesión exitoso.
 *
 * `/mis-autoevaluaciones` es la única vista que exige sesión, de modo que es
 * coherente tanto para quien llega directo desde el Navbar como para quien fue
 * expulsado de allí por `redirectGuestsTo` y terminó en esta pantalla.
 */
const DESTINO_POST_LOGIN = '/mis-autoevaluaciones';

export default function Login() {
    const { data, setData, post, processing, errors, reset } = useForm<DatosLogin>({
        email: '',
        password: '',
        remember: false,
    });

    const enviar = (event: React.FormEvent) => {
        event.preventDefault();

        post('/login', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                router.get(DESTINO_POST_LOGIN);
            },
        });
    };

    const claseInput =
        'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

    const claseInputConError = (hayError: boolean) =>
        `${claseInput} ${
            hayError
                ? 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-300 focus:border-emerald-500'
        }`;

    const claseEtiqueta = 'mb-1 block text-xs font-bold tracking-wider text-slate-500 uppercase';

    return (
        <>
            <Head title="Iniciar sesión - CheckITSE Huancayo" />

            <AuthLayout
                variant="pantalla"
                titulo="Gestiona el diagnóstico preventivo de tu negocio"
                subtitulo="Accede a tus autoevaluaciones guardadas, retoma tu avance donde lo dejaste y prepara tu local antes de la diligencia municipal."
                badge="Acceso ciudadano gratuito"
                enlaceAlterno={{
                    pregunta: '¿No tienes cuenta?',
                    accion: 'Regístrate',
                    href: '/registro',
                }}
            >
                <div className="space-y-5">
                    <div className="border-b border-slate-100 pb-4">
                        <h1 className="text-lg font-bold text-slate-900">Iniciar sesión</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Entra con el correo con el que registraste tu cuenta ciudadana.
                        </p>
                    </div>

                    <form onSubmit={enviar} className="space-y-4">
                        <div>
                            <label htmlFor="email" className={claseEtiqueta}>
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value.toLowerCase().trim())}
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? 'error-email' : undefined}
                                placeholder="tucorreo@ejemplo.com"
                                className={claseInputConError(Boolean(errors.email))}
                            />
                            {errors.email && (
                                <p id="error-email" role="alert" className="mt-1 text-xs font-semibold text-red-700">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className={claseEtiqueta}>
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? 'error-password' : undefined}
                                placeholder="Tu contraseña"
                                className={claseInputConError(Boolean(errors.password))}
                            />
                            {errors.password && (
                                <p id="error-password" role="alert" className="mt-1 text-xs font-semibold text-red-700">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                name="remember"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Mantener la sesión abierta en este dispositivo</span>
                        </label>

                        <button
                            type="submit"
                            disabled={processing}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Iniciando sesión...
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4" aria-hidden="true" />
                                    Iniciar sesión
                                </>
                            )}
                        </button>
                    </form>

                    <p className="border-t border-slate-100 pt-4 text-center text-sm leading-relaxed text-slate-500">
                        ¿Prefieres continuar como invitado? Puedes autoevaluar tu local sin cuenta y registrarte
                        más adelante para conservar tu avance.
                    </p>
                </div>
            </AuthLayout>
        </>
    );
}

/**
 * `AuthLayout` ya es el marco completo de la pantalla (fondo, cabecera
 * institucional y pie), así que la página no hereda `AppLayout`: sin esta
 * asignación, `app.tsx` envolvería el shell oscuro dentro del shell claro con
 * Navbar y se duplicarían ambas cabeceras.
 */
Login.layout = (page: React.ReactNode) => <>{page}</>;
