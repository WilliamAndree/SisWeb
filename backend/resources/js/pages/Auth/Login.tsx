import { Pregunta, ariaDe, claseCampo } from '@/components/form/Pregunta';
import AuthLayout from '@/layouts/AuthLayout';
import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import React, { useState } from 'react';

type DatosLogin = {
    email: string;
    password: string;
    remember: boolean;
};

/**
 * Inicio de sesión. El servidor decide el destino según el tipo de cuenta:
 * el emprendedor va a su panel y el proveedor al panel de su negocio.
 */
export default function Login() {
    const [verClave, setVerClave] = useState(false);
    const { data, setData, post, processing, errors } = useForm<DatosLogin>({
        email: '',
        password: '',
        remember: false,
    });

    const enviar = (event: React.FormEvent) => {
        event.preventDefault();
        post('/login', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Iniciar sesión - CheckITSE Huancayo" />
            <AuthLayout
                titulo="Bienvenido de vuelta"
                subtitulo="Entra a tu cuenta para seguir preparando tu local o para gestionar tu negocio de proveedor."
                enlaceAlterno={{ pregunta: '¿No tienes cuenta?', accion: 'Regístrate gratis', href: '/registro' }}
            >
                <h2 className="text-3xl font-bold text-slate-900">Iniciar sesión</h2>
                <p className="mt-2 text-lg text-slate-600">Usa el correo con el que creaste tu cuenta.</p>

                <form onSubmit={enviar} className="mt-8 space-y-6" noValidate>
                    <Pregunta id="email" etiqueta="Correo electrónico" error={errors.email}>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value.toLowerCase().trim())}
                            placeholder="tucorreo@gmail.com"
                            className={claseCampo(Boolean(errors.email))}
                            {...ariaDe('email', { error: errors.email })}
                        />
                    </Pregunta>

                    <Pregunta id="password" etiqueta="Contraseña" error={errors.password}>
                        <div className="relative">
                            <input
                                id="password"
                                type={verClave ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className={`${claseCampo(Boolean(errors.password))} pr-14`}
                                {...ariaDe('password', { error: errors.password })}
                            />
                            <button
                                type="button"
                                onClick={() => setVerClave((v) => !v)}
                                aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                className="absolute inset-y-0 right-1 flex w-12 cursor-pointer items-center justify-center text-slate-500 hover:text-slate-800"
                            >
                                {verClave ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
                            </button>
                        </div>
                    </Pregunta>

                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-lg text-slate-700">
                        <input
                            type="checkbox"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="accent-primary-700 size-5"
                        />
                        Mantener mi sesión abierta
                    </label>

                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-primary hover:bg-primary-700 flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-lg font-bold text-white disabled:opacity-60"
                    >
                        {processing ? (
                            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                        ) : (
                            <LogIn aria-hidden="true" className="size-5" />
                        )}
                        {processing ? 'Entrando…' : 'Entrar'}
                    </button>
                </form>
            </AuthLayout>
        </>
    );
}

Login.layout = (page: React.ReactNode) => page;
