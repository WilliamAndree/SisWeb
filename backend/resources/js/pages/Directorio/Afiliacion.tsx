import { OpcionesTarjeta, Pregunta, ResumenErrores, ariaDe, claseCampo } from '@/components/form/Pregunta';
import type { PlanProveedor } from '@/pages/Directorio/Index';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

interface Opcion {
    valor: string;
    etiqueta: string;
}

interface AfiliacionProps {
    planes: PlanProveedor[];
    planSeleccionado: string | null;
    rubros: Opcion[];
    distritos: Opcion[];
}

interface FormAfiliacion {
    [key: string]: string;
    plan: string;
    nombre_comercial: string;
    rubro: string;
    distrito: string;
    contacto_nombre: string;
    numero_documento: string;
    telefono: string;
    email: string;
    comentario: string;
}

const PASOS = ['Tu plan y tu negocio', 'Datos de contacto', 'Revisar y enviar'] as const;

const ETIQUETAS: Record<string, string> = {
    plan: 'Plan',
    nombre_comercial: 'Nombre del negocio',
    rubro: 'Qué ofreces',
    distrito: 'Distrito',
    contacto_nombre: 'Tu nombre',
    numero_documento: 'DNI o RUC',
    telefono: 'Celular',
    email: 'Correo',
    notas: 'Comentario',
};

const DESCRIPCION_RUBRO: Record<string, string> = {
    incendios: 'Venta y recarga de extintores, señales, luces de emergencia',
    electricas: 'Pozo a tierra, tableros, instalaciones eléctricas',
    arquitectura_senaletica: 'Planos, croquis y rutas de evacuación',
    estructuras: 'Anclajes, vidrios de seguridad, puertas',
};

function esCorreoValido(correo: string): boolean {
    const partes = correo.trim().split('@');
    return partes.length === 2 && partes[0].length > 0 && partes[1].includes('.') && !/\s/.test(correo.trim());
}

/** Reglas por campo, iguales a SolicitudAfiliacionRequest. Cada una devuelve el mensaje o null. */
const REGLAS: Record<number, Array<[keyof FormAfiliacion, (d: FormAfiliacion) => string | null]>> = {
    0: [
        ['plan', (d) => (d.plan ? null : 'Elige un plan.')],
        ['nombre_comercial', (d) => (d.nombre_comercial.trim().length >= 3 ? null : 'Escribe el nombre de tu negocio (mínimo 3 letras).')],
        ['rubro', (d) => (d.rubro ? null : 'Elige qué ofreces.')],
        ['distrito', (d) => (d.distrito ? null : 'Elige tu distrito.')],
    ],
    1: [
        ['contacto_nombre', (d) => (d.contacto_nombre.trim().length >= 3 ? null : 'Escribe tu nombre completo.')],
        ['numero_documento', (d) => (/^(\d{8}|\d{11})$/.test(d.numero_documento) ? null : 'Debe tener 8 dígitos (DNI) u 11 dígitos (RUC).')],
        ['telefono', (d) => (/^[0-9+\s\-()]{7,25}$/.test(d.telefono) ? null : 'Escribe un celular válido, por ejemplo 964 123 456.')],
        ['email', (d) => (esCorreoValido(d.email) ? null : 'Escribe un correo válido, por ejemplo nombre@gmail.com.')],
    ],
};

function validarPaso(paso: number, data: FormAfiliacion): Record<string, string> {
    const errores: Record<string, string> = {};
    for (const [campo, regla] of REGLAS[paso] ?? []) {
        const mensaje = regla(data);
        if (mensaje) errores[campo] = mensaje;
    }
    return errores;
}

export default function Afiliacion({ planes, planSeleccionado, rubros, distritos }: Readonly<AfiliacionProps>) {
    const { flash } = usePage().props as { flash?: { success?: string | null } };
    const [paso, setPaso] = useState(0);
    const [erroresLocales, setErroresLocales] = useState<Record<string, string>>({});
    const tituloPaso = useRef<HTMLHeadingElement>(null);
    const primerRender = useRef(true);

    const { data, setData, transform, post, processing, errors } = useForm<FormAfiliacion>({
        plan: planSeleccionado ?? planes.find((p) => p.destacado)?.id ?? '',
        nombre_comercial: '',
        rubro: '',
        distrito: '',
        contacto_nombre: '',
        numero_documento: '',
        telefono: '',
        email: '',
        comentario: '',
    });

    useEffect(() => {
        if (primerRender.current) {
            primerRender.current = false;
            return;
        }
        tituloPaso.current?.focus();
    }, [paso]);

    const plan = planes.find((p) => p.id === data.plan);
    const errores: Record<string, string | undefined> = { ...errors, ...erroresLocales };

    const cambiar = (campo: keyof FormAfiliacion, valor: string) => {
        setData(campo, valor);
        if (erroresLocales[campo]) {
            setErroresLocales((prev) => {
                const resto = { ...prev };
                delete resto[campo];
                return resto;
            });
        }
    };

    const enviar = (e: FormEvent) => {
        e.preventDefault();
        if (paso < 2) {
            const nuevos = validarPaso(paso, data);
            setErroresLocales(nuevos);
            if (Object.keys(nuevos).length === 0) setPaso(paso + 1);
            return;
        }
        transform((d) => ({
            nombre_comercial: d.nombre_comercial,
            contacto_nombre: d.contacto_nombre,
            numero_documento: d.numero_documento,
            telefono: d.telefono,
            email: d.email,
            rubro: d.rubro,
            distrito: d.distrito,
            notas: [`Plan de interés: ${plan?.nombre ?? d.plan}`, d.comentario.trim()].filter(Boolean).join('\n'),
        }));
        post(route('directorio.afiliarse'), {
            preserveScroll: false,
            onError: (errs) => setPaso(['nombre_comercial', 'rubro', 'distrito'].some((c) => c in errs) ? 0 : 1),
        });
    };

    if (flash?.success) {
        return (
            <>
                <Head title="Solicitud enviada - CheckITSE" />
                <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center sm:p-12">
                    <CheckCircle2 aria-hidden="true" className="text-primary-600 mx-auto size-16" />
                    <h1 className="mt-5 text-3xl font-extrabold text-slate-900">¡Solicitud enviada!</h1>
                    <p className="mt-3 text-lg leading-relaxed text-slate-600">
                        Recibimos tus datos. Te escribiremos por WhatsApp o correo para activar tu plan.
                    </p>
                    <ol className="mx-auto mt-8 max-w-md space-y-4 text-left">
                        {[
                            'Revisamos tus datos y tu especialidad.',
                            'Te contactamos para confirmar el plan.',
                            'Publicamos tu ficha en el directorio.',
                        ].map((texto, i) => (
                            <li key={texto} className="flex items-center gap-3 text-lg text-slate-800">
                                <span className="bg-primary-50 text-primary-800 flex size-9 shrink-0 items-center justify-center rounded-full font-bold">
                                    {i + 1}
                                </span>
                                {texto}
                            </li>
                        ))}
                    </ol>
                    <Link
                        href={route('directorio.index')}
                        className="bg-primary hover:bg-primary-700 mt-10 inline-flex min-h-13 items-center gap-2 rounded-xl px-7 text-lg font-bold text-white"
                    >
                        Volver al directorio
                    </Link>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Anuncia tu negocio - CheckITSE" />
            <div className="mx-auto max-w-3xl">
                <Link
                    href={`${route('directorio.index')}#anunciate`}
                    className="text-primary-700 inline-flex min-h-11 items-center gap-2 text-base font-semibold hover:underline"
                >
                    <ArrowLeft aria-hidden="true" className="size-5" /> Volver a los planes
                </Link>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Anuncia tu negocio en CheckITSE</h1>
                <p className="mt-3 text-lg leading-relaxed text-slate-600">
                    Completa 3 pasos cortos. Te tomará unos 2 minutos y no pagas nada hasta que te contactemos.
                </p>
                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-base text-slate-700">
                    <li className="flex items-center gap-2">
                        <Clock aria-hidden="true" className="text-primary-700 size-5" /> 2 minutos
                    </li>
                    <li className="flex items-center gap-2">
                        <ShieldCheck aria-hidden="true" className="text-primary-700 size-5" /> Tus datos no se publican sin tu permiso
                    </li>
                </ul>

                {/* Progreso */}
                <nav aria-label="Pasos de la solicitud" className="mt-8">
                    <p className="text-base font-semibold text-slate-700">
                        Paso {paso + 1} de {PASOS.length}: <span className="text-slate-900">{PASOS[paso]}</span>
                    </p>
                    <ol className="mt-3 grid grid-cols-3 gap-2">
                        {PASOS.map((nombre, i) => (
                            <li key={nombre} aria-current={i === paso ? 'step' : undefined}>
                                <span className={`block h-2 rounded-full ${i <= paso ? 'bg-primary' : 'bg-slate-200'}`} />
                                <span className="sr-only">
                                    {nombre}
                                    {i < paso ? ' (completado)' : ''}
                                </span>
                            </li>
                        ))}
                    </ol>
                </nav>

                <form onSubmit={enviar} noValidate className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                    <h2 ref={tituloPaso} tabIndex={-1} className="text-2xl font-bold text-slate-900 focus:outline-none">
                        {PASOS[paso]}
                    </h2>

                    <div className="mt-6">
                        <ResumenErrores errores={errores} etiquetas={ETIQUETAS} />
                    </div>

                    <div className="mt-6 space-y-8" hidden={paso !== 0}>
                        <Pregunta id="plan" numero={1} etiqueta="¿Qué plan quieres?" ayuda="Puedes cambiarlo después." error={errores.plan} grupo>
                            <OpcionesTarjeta
                                nombre="plan"
                                columnas={3}
                                valor={data.plan}
                                onCambio={(v) => cambiar('plan', v)}
                                opciones={planes.map((p) => ({
                                    valor: p.id,
                                    titulo: p.nombre,
                                    descripcion: p.precio === 0 ? 'Gratis' : `S/ ${p.precio} al mes`,
                                }))}
                            />
                        </Pregunta>
                        <Pregunta
                            id="nombre_comercial"
                            numero={2}
                            etiqueta="Nombre de tu negocio"
                            ayuda="Como lo conocen tus clientes."
                            error={errores.nombre_comercial}
                        >
                            <input
                                id="nombre_comercial"
                                type="text"
                                autoComplete="organization"
                                value={data.nombre_comercial}
                                onChange={(e) => cambiar('nombre_comercial', e.target.value)}
                                placeholder="Ej. Extintores Wanka"
                                className={claseCampo(Boolean(errores.nombre_comercial))}
                                {...ariaDe('nombre_comercial', { ayuda: true, error: errores.nombre_comercial })}
                            />
                        </Pregunta>
                        <Pregunta id="rubro" numero={3} etiqueta="¿Qué ofreces?" error={errores.rubro} grupo>
                            <OpcionesTarjeta
                                nombre="rubro"
                                valor={data.rubro}
                                onCambio={(v) => cambiar('rubro', v)}
                                opciones={rubros.map((r) => ({ valor: r.valor, titulo: r.etiqueta, descripcion: DESCRIPCION_RUBRO[r.valor] }))}
                            />
                        </Pregunta>
                        <Pregunta id="distrito" numero={4} etiqueta="¿En qué distrito está tu negocio?" error={errores.distrito}>
                            <select
                                id="distrito"
                                value={data.distrito}
                                onChange={(e) => cambiar('distrito', e.target.value)}
                                className={`${claseCampo(Boolean(errores.distrito))} cursor-pointer sm:max-w-sm`}
                                {...ariaDe('distrito', { error: errores.distrito })}
                            >
                                <option value="">Selecciona un distrito</option>
                                {distritos.map((d) => (
                                    <option key={d.valor} value={d.valor}>
                                        {d.etiqueta}
                                    </option>
                                ))}
                            </select>
                        </Pregunta>
                    </div>

                    <div className="mt-6 space-y-8" hidden={paso !== 1}>
                        <Pregunta id="contacto_nombre" numero={5} etiqueta="Tu nombre completo" error={errores.contacto_nombre}>
                            <input
                                id="contacto_nombre"
                                type="text"
                                autoComplete="name"
                                value={data.contacto_nombre}
                                onChange={(e) => cambiar('contacto_nombre', e.target.value)}
                                className={claseCampo(Boolean(errores.contacto_nombre))}
                                {...ariaDe('contacto_nombre', { error: errores.contacto_nombre })}
                            />
                        </Pregunta>
                        <Pregunta
                            id="numero_documento"
                            numero={6}
                            etiqueta="DNI o RUC"
                            ayuda="8 dígitos si es DNI, 11 si es RUC."
                            error={errores.numero_documento}
                        >
                            <input
                                id="numero_documento"
                                type="text"
                                inputMode="numeric"
                                maxLength={11}
                                value={data.numero_documento}
                                onChange={(e) => cambiar('numero_documento', e.target.value.replace(/\D/g, ''))}
                                className={`${claseCampo(Boolean(errores.numero_documento))} sm:max-w-xs`}
                                {...ariaDe('numero_documento', { ayuda: true, error: errores.numero_documento })}
                            />
                        </Pregunta>
                        <Pregunta
                            id="telefono"
                            numero={7}
                            etiqueta="Celular con WhatsApp"
                            ayuda="Aquí te escribirán tus clientes."
                            error={errores.telefono}
                        >
                            <input
                                id="telefono"
                                type="tel"
                                autoComplete="tel"
                                inputMode="tel"
                                value={data.telefono}
                                onChange={(e) => cambiar('telefono', e.target.value)}
                                placeholder="Ej. 964 123 456"
                                className={`${claseCampo(Boolean(errores.telefono))} sm:max-w-xs`}
                                {...ariaDe('telefono', { ayuda: true, error: errores.telefono })}
                            />
                        </Pregunta>
                        <Pregunta id="email" numero={8} etiqueta="Correo electrónico" error={errores.email}>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={data.email}
                                onChange={(e) => cambiar('email', e.target.value)}
                                placeholder="nombre@gmail.com"
                                className={claseCampo(Boolean(errores.email))}
                                {...ariaDe('email', { error: errores.email })}
                            />
                        </Pregunta>
                        <Pregunta id="comentario" numero={9} etiqueta="¿Algo más que debamos saber?" opcional>
                            <textarea
                                id="comentario"
                                rows={3}
                                maxLength={800}
                                value={data.comentario}
                                onChange={(e) => cambiar('comentario', e.target.value)}
                                placeholder="Ej. También hacemos mantenimiento de detectores de humo."
                                className={`${claseCampo()} h-auto py-3`}
                            />
                        </Pregunta>
                    </div>

                    {paso === 2 && (
                        <div className="mt-6 space-y-6">
                            {plan && (
                                <div className="border-primary-200 bg-primary-50 rounded-xl border p-5">
                                    <p className="text-primary-800 text-base font-semibold">Plan elegido</p>
                                    <p className="mt-1 text-2xl font-extrabold text-slate-900">
                                        {plan.nombre} · {plan.precio === 0 ? 'Gratis' : `S/ ${plan.precio} al mes`}
                                    </p>
                                </div>
                            )}
                            <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200">
                                {(
                                    [
                                        ['Negocio', data.nombre_comercial, 0],
                                        ['Qué ofreces', rubros.find((r) => r.valor === data.rubro)?.etiqueta ?? '', 0],
                                        ['Distrito', distritos.find((d) => d.valor === data.distrito)?.etiqueta ?? '', 0],
                                        ['Nombre', data.contacto_nombre, 1],
                                        ['DNI o RUC', data.numero_documento, 1],
                                        ['Celular', data.telefono, 1],
                                        ['Correo', data.email, 1],
                                    ] as Array<[string, string, number]>
                                ).map(([etiqueta, valor, pasoCampo]) => (
                                    <div key={etiqueta} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                                        <dt className="text-base text-slate-600">{etiqueta}</dt>
                                        <dd className="flex items-center gap-3 text-lg font-semibold break-all text-slate-900">
                                            {valor}
                                            <button
                                                type="button"
                                                onClick={() => setPaso(pasoCampo)}
                                                className="text-primary-700 cursor-pointer text-base font-semibold underline underline-offset-2"
                                            >
                                                Cambiar<span className="sr-only"> {etiqueta}</span>
                                            </button>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            <p className="flex items-start gap-2 text-base leading-relaxed text-slate-600">
                                <MessageCircle aria-hidden="true" className="text-primary-700 mt-0.5 size-5 shrink-0" />
                                Al enviar aceptas que te contactemos para activar tu plan. Puedes cancelar cuando quieras.
                            </p>
                        </div>
                    )}

                    <div className="mt-10 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        {paso > 0 ? (
                            <button
                                type="button"
                                onClick={() => setPaso(paso - 1)}
                                className="inline-flex min-h-13 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-lg font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                <ArrowLeft aria-hidden="true" className="size-5" /> Atrás
                            </button>
                        ) : (
                            <span />
                        )}
                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-primary hover:bg-primary-700 inline-flex min-h-13 cursor-pointer items-center justify-center gap-2 rounded-xl px-8 text-lg font-bold text-white disabled:opacity-60"
                        >
                            {processing && <Loader2 aria-hidden="true" className="size-5 animate-spin" />}
                            {paso < 2 ? 'Continuar' : 'Enviar solicitud'}
                            {!processing &&
                                (paso < 2 ? <ArrowRight aria-hidden="true" className="size-5" /> : <Send aria-hidden="true" className="size-5" />)}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
