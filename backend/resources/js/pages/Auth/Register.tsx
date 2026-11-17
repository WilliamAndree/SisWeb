import React from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, Loader2, UserPlus } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';

/**
 * `useForm` exige un tipo con firma de índice, que TypeScript solo infiere para
 * alias de tipo y no para `interface`. Se declara como `type` para conservar
 * además `keyof` preciso en el tipado de errores.
 */
type DatosRegistro = {
    name: string;
    email: string;
    telefono: string;
    password: string;
    password_confirmation: string;
};

/**
 * Destino tras un registro exitoso.
 *
 * La cuenta recién creada todavía no tiene autoevaluaciones vinculadas, así que el
 * paso natural es el alta de un local nuevo. Quien ya venía auditando el suyo
 * sigue por el guardado contextual del avance.
 */
const DESTINO_POST_REGISTRO = '/autoevaluacion/nueva';

export default function Register() {
    const { data, setData, post, processing, errors, clearErrors, setError } = useForm<DatosRegistro>({
        name: '',
        email: '',
        telefono: '',
        password: '',
        password_confirmation: '',
    });

    const enviar = (event: React.FormEvent) => {
        event.preventDefault();
        clearErrors();

        // `POST /registro` no valida `password_confirmation` (su contrato no cambia),
        // así que la coincidencia se verifica aquí para no aceptar en silencio una
        // contraseña distinta a la que el ciudadano cree haber confirmado.
        if (data.password !== data.password_confirmation) {
            setError('password_confirmation', 'Las contraseñas no coinciden.');

            return;
        }

        post('/registro', {
            preserveScroll: true,
            onSuccess: () => router.get(DESTINO_POST_REGISTRO),
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

    const mensajeError = (campo: keyof DatosRegistro, id: string) =>
        errors[campo] ? (
            <p id={id} role="alert" className="mt-1 text-xs font-semibold text-red-700">
                {errors[campo]}
            </p>
        ) : null;

    return (
        <>
            <Head title="Crear cuenta - CheckITSE Huancayo" />

            <AuthLayout
                variant="pantalla"
                titulo="Gestiona el diagnóstico preventivo de tu negocio"
                subtitulo="Crea tu cuenta ciudadana para conservar cada autoevaluación, comparar su evolución y generar borradores de Anexos ITSE listos para mesa de partes."
                badge="Registro gratuito"
                enlaceAlterno={{
                    pregunta: '¿Ya tienes cuenta?',
                    accion: 'Inicia sesión',
                    href: '/login',
                }}
            >
                <div className="space-y-5">
                    <div className="border-b border-slate-100 pb-4">
                        <h1 className="text-lg font-bold text-slate-900">Crear cuenta</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            La cuenta es opcional: puedes autoevaluar tu local como invitado y crearla más adelante.
                        </p>
                    </div>

                    <form onSubmit={enviar} className="space-y-4">
                        <div>
                            <label htmlFor="name" className={claseEtiqueta}>
                                Nombre de comerciante / Razón social
                            </label>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                required
                                maxLength={255}
                                autoComplete="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                aria-invalid={Boolean(errors.name)}
                                aria-describedby={errors.name ? 'error-name' : undefined}
                                placeholder="Ej. Ana Quispe"
                                className={claseInputConError(Boolean(errors.name))}
                            />
                            {mensajeError('name', 'error-name')}
                        </div>

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
                                // `register()` aplica la regla `lowercase` y el proyecto no
                                // publica `lang/`, así que normalizar aquí evita que el
                                // layout muestre el mensaje de validación en inglés.
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value.toLowerCase().trim())}
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? 'error-email' : undefined}
                                placeholder="tucorreo@ejemplo.com"
                                className={claseInputConError(Boolean(errors.email))}
                            />
                            {mensajeError('email', 'error-email')}
                        </div>

                        <div>
                            <label htmlFor="telefono" className={claseEtiqueta}>
                                Teléfono (opcional)
                            </label>
                            <input
                                id="telefono"
                                type="tel"
                                name="telefono"
                                maxLength={20}
                                autoComplete="tel"
                                value={data.telefono}
                                onChange={(e) => setData('telefono', e.target.value)}
                                aria-invalid={Boolean(errors.telefono)}
                                aria-describedby={errors.telefono ? 'error-telefono' : undefined}
                                placeholder="Ej. 987 654 321"
                                className={claseInputConError(Boolean(errors.telefono))}
                            />
                            {mensajeError('telefono', 'error-telefono')}
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
                                minLength={8}
                                autoComplete="new-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? 'error-password' : 'ayuda-password'}
                                placeholder="Mínimo 8 caracteres"
                                className={claseInputConError(Boolean(errors.password))}
                            />
                            {errors.password ? (
                                mensajeError('password', 'error-password')
                            ) : (
                                <p id="ayuda-password" className="mt-1 text-xs text-slate-500">
                                    Usa al menos 8 caracteres.
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password_confirmation" className={claseEtiqueta}>
                                Confirmar contraseña
                            </label>
                            <input
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                aria-invalid={Boolean(errors.password_confirmation)}
                                aria-describedby={errors.password_confirmation ? 'error-password-confirmacion' : undefined}
                                placeholder="Repite tu contraseña"
                                className={claseInputConError(Boolean(errors.password_confirmation))}
                            />
                            {mensajeError('password_confirmation', 'error-password-confirmacion')}
                        </div>

                        <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm leading-relaxed text-slate-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                            <span>
                                Al crear tu cuenta, tus autoevaluaciones se conservan de forma segura y podrás
                                retomarlas cuando desees.
                            </span>
                        </p>

                        <button
                            type="submit"
                            disabled={processing}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Creando cuenta...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                                    Crear cuenta
                                </>
                            )}
                        </button>
                    </form>
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
Register.layout = (page: React.ReactNode) => <>{page}</>;
