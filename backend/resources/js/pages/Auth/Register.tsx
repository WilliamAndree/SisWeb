import { OpcionesTarjeta, Pregunta, ariaDe, claseCampo } from '@/components/form/Pregunta';
import AuthLayout from '@/layouts/AuthLayout';
import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import React, { useState } from 'react';

type DatosRegistro = {
    tipo_cuenta: 'cliente' | 'proveedor';
    name: string;
    email: string;
    telefono: string;
    password: string;
    password_confirmation: string;
};

/**
 * Registro con dos tipos de cuenta:
 *  - cliente (emprendedor): simula su local y prepara su expediente.
 *  - proveedor: publica sus productos con precio y su ubicación.
 * El servidor redirige a cada uno a su punto de partida.
 */
export default function Register() {
    const [verClave, setVerClave] = useState(false);
    const { data, setData, post, processing, errors, clearErrors, setError } = useForm<DatosRegistro>({
        tipo_cuenta: new URLSearchParams(window.location.search).get('tipo') === 'proveedor' ? 'proveedor' : 'cliente',
        name: '',
        email: '',
        telefono: '',
        password: '',
        password_confirmation: '',
    });
    const esProveedor = data.tipo_cuenta === 'proveedor';

    const enviar = (event: React.FormEvent) => {
        event.preventDefault();
        clearErrors();
        if (data.password !== data.password_confirmation) {
            setError('password_confirmation', 'Las contraseñas no coinciden.');
            return;
        }
        post('/registro', { preserveScroll: true });
    };

    const campoClave = (id: 'password' | 'password_confirmation', autoComplete: string) => (
        <div className="relative">
            <input
                id={id}
                type={verClave ? 'text' : 'password'}
                autoComplete={autoComplete}
                value={data[id]}
                onChange={(e) => setData(id, e.target.value)}
                className={`${claseCampo(Boolean(errors[id]))} pr-14`}
                {...ariaDe(id, { ayuda: id === 'password', error: errors[id] })}
            />
            <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                aria-label={verClave ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                className="absolute inset-y-0 right-1 flex w-12 cursor-pointer items-center justify-center text-slate-500 hover:text-slate-800"
            >
                {verClave ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
            </button>
        </div>
    );

    return (
        <>
            <Head title="Crear cuenta - CheckITSE Huancayo" />
            <AuthLayout
                titulo={esProveedor ? 'Vende a los negocios que te necesitan' : 'Prepara tu local y llega listo a tu ITSE'}
                subtitulo={
                    esProveedor
                        ? 'Publica tus productos con precio y tu ubicación. Te verán justo cuando a un local le falte lo que vendes.'
                        : 'Guarda tus simulaciones, compara precios de proveedores y arma tu expediente digital.'
                }
                badge={esProveedor ? 'Cuenta de proveedor' : 'Cuenta gratuita para emprendedores'}
                enlaceAlterno={{ pregunta: '¿Ya tienes cuenta?', accion: 'Inicia sesión', href: '/login' }}
            >
                <h2 className="text-3xl font-bold text-slate-900">Crear cuenta</h2>
                <form onSubmit={enviar} className="mt-6 space-y-6" noValidate>
                    <Pregunta id="tipo_cuenta" numero={1} etiqueta="¿Cómo usarás CheckITSE?" error={errors.tipo_cuenta} grupo>
                        <OpcionesTarjeta
                            nombre="tipo_cuenta"
                            columnas={1}
                            valor={data.tipo_cuenta}
                            onCambio={(v) => setData('tipo_cuenta', v)}
                            opciones={[
                                { valor: 'cliente', titulo: 'Soy emprendedor', descripcion: 'Quiero preparar mi local para la ITSE.' },
                                {
                                    valor: 'proveedor',
                                    titulo: 'Soy proveedor',
                                    descripcion: 'Vendo extintores, señales, instalaciones u otros servicios.',
                                },
                            ]}
                        />
                    </Pregunta>

                    <Pregunta
                        id="name"
                        numero={2}
                        etiqueta={esProveedor ? 'Tu nombre (responsable del negocio)' : 'Tu nombre y apellido'}
                        error={errors.name}
                    >
                        <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className={claseCampo(Boolean(errors.name))}
                            {...ariaDe('name', { error: errors.name })}
                        />
                    </Pregunta>

                    <Pregunta id="email" numero={3} etiqueta="Correo electrónico" error={errors.email}>
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

                    <Pregunta id="telefono" numero={4} etiqueta="Celular" opcional={!esProveedor} error={errors.telefono}>
                        <input
                            id="telefono"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={data.telefono}
                            onChange={(e) => setData('telefono', e.target.value)}
                            placeholder="Ej. 964 123 456"
                            className={claseCampo(Boolean(errors.telefono))}
                            {...ariaDe('telefono', { error: errors.telefono })}
                        />
                    </Pregunta>

                    <Pregunta id="password" numero={5} etiqueta="Crea una contraseña" ayuda="Mínimo 8 caracteres." error={errors.password}>
                        {campoClave('password', 'new-password')}
                    </Pregunta>

                    <Pregunta id="password_confirmation" numero={6} etiqueta="Repite la contraseña" error={errors.password_confirmation}>
                        {campoClave('password_confirmation', 'new-password')}
                    </Pregunta>

                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-primary hover:bg-primary-700 flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-lg font-bold text-white disabled:opacity-60"
                    >
                        {processing ? (
                            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                        ) : (
                            <UserPlus aria-hidden="true" className="size-5" />
                        )}
                        {processing ? 'Creando cuenta…' : esProveedor ? 'Crear cuenta de proveedor' : 'Crear mi cuenta'}
                    </button>
                </form>
            </AuthLayout>
        </>
    );
}

Register.layout = (page: React.ReactNode) => page;
