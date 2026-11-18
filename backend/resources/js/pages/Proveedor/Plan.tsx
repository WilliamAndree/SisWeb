import { Pregunta, ResumenErrores, ariaDe, claseCampo } from '@/components/form/Pregunta';
import { CuentaProveedor } from '@/components/proveedor/CuentaProveedor';
import {
    ESTADO_PAGO,
    fechaCorta,
    soles,
    type PerfilResumen,
    type PlanProveedor,
    type PrecioDuracion,
    type SolicitudPlanResumen,
} from '@/types/proveedor';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, Copy, Crown, FileImage, Gem, Hourglass, Landmark, Loader2, Minus, Rocket, Send, Smartphone, Sprout, Upload } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface PlanPageProps {
    perfil: PerfilResumen | null;
    planes: PlanProveedor[];
    precios: Record<string, PrecioDuracion[]>;
    duraciones: Array<{ meses: number; descuento: number; etiqueta: string }>;
    metodos: Array<{ valor: string; etiqueta: string }>;
    pago: { titular: string; yape_plin: string; banco: string; cuenta: string; cci: string; es_ejemplo: boolean };
    solicitudes: SolicitudPlanResumen[];
}

type FormPago = {
    plan_solicitado: string;
    meses: number;
    metodo_pago: string;
    numero_operacion: string;
    fecha_pago: string;
    evidencia: File | null;
};

const ICONO_PLAN: Record<string, typeof Crown> = { basico: Sprout, destacado: Rocket, premium: Gem };

const ETIQUETAS_PAGO: Record<string, string> = {
    plan_solicitado: 'Plan',
    meses: 'Meses',
    metodo_pago: 'Cómo pagaste',
    numero_operacion: 'Número de operación',
    fecha_pago: 'Fecha de pago',
    evidencia: 'Comprobante',
};

const COMPARATIVA: ReadonlyArray<{ texto: string; valores: Record<string, string | boolean> }> = [
    { texto: 'Ficha con mapa y WhatsApp', valores: { basico: true, destacado: true, premium: true } },
    { texto: 'Apareces en "Lo que te falta"', valores: { basico: true, destacado: true, premium: true } },
    { texto: 'Productos con precio', valores: { basico: 'Hasta 5', destacado: 'Hasta 25', premium: 'Ilimitados' } },
    { texto: 'Sello en tu ficha', valores: { basico: false, destacado: 'Destacado', premium: 'Premium' } },
    { texto: 'Lugar en la lista', valores: { basico: 'Después', destacado: 'Antes que Básico', premium: 'Primero' } },
    { texto: 'Atención prioritaria', valores: { basico: false, destacado: false, premium: true } },
];

type Tono = 'claro' | 'destacado' | 'oscuro';

const tonoDe = (plan: PlanProveedor): Tono => {
    if (plan.id === 'premium') return 'oscuro';
    return plan.destacado ? 'destacado' : 'claro';
};

const CLASE_TONO: Record<Tono, { tarjeta: string; cinta: string; icono: string }> = {
    claro: { tarjeta: 'border border-slate-200 bg-white', cinta: 'bg-slate-800 text-white', icono: 'bg-emerald-50 text-emerald-700' },
    destacado: {
        tarjeta: 'border-sun-400 bg-white ring-4 ring-sun-300/60 lg:-translate-y-3 shadow-xl',
        cinta: 'bg-sun-400 text-ink-900',
        icono: 'bg-sun-100 text-sun-700',
    },
    oscuro: { tarjeta: 'bg-ink-900 text-white trama-andina shadow-xl', cinta: 'bg-primary text-white', icono: 'text-sun-300 bg-white/10' },
};

const hoy = () => new Date().toISOString().slice(0, 10);

function DatoCopiable({ etiqueta, valor, Icono }: Readonly<{ etiqueta: string; valor: string; Icono: typeof Copy }>) {
    const [copiado, setCopiado] = useState(false);
    const copiar = () => {
        navigator.clipboard
            ?.writeText(valor.replaceAll(' ', ''))
            .then(() => {
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
            })
            .catch(() => setCopiado(false));
    };
    return (
        <div className="flex items-center gap-3 rounded-xl bg-white p-3">
            <Icono aria-hidden="true" className="text-primary-700 size-6 shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-500">{etiqueta}</p>
                <p className="truncate text-lg font-bold text-slate-900">{valor}</p>
            </div>
            <button
                type="button"
                onClick={copiar}
                aria-label={`Copiar ${etiqueta}`}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
            >
                {copiado ? <Check aria-hidden="true" className="size-4 text-emerald-700" /> : <Copy aria-hidden="true" className="size-4" />}
                {copiado ? 'Copiado' : 'Copiar'}
            </button>
        </div>
    );
}

function Celda({ valor }: Readonly<{ valor: string | boolean }>) {
    if (valor === true) return <Check aria-label="Sí" className="mx-auto size-6 text-emerald-700" />;
    if (valor === false) return <Minus aria-label="No" className="mx-auto size-6 text-slate-300" />;
    return <span className="font-semibold text-slate-900">{valor}</span>;
}

export default function PlanProveedorPage({ perfil, planes, precios, duraciones, metodos, pago, solicitudes }: Readonly<PlanPageProps>) {
    const [meses, setMeses] = useState(duraciones[0]?.meses ?? 1);
    const pendiente = solicitudes.find((s) => s.estado === 'pendiente');
    const { data, setData, post, processing, errors, progress } = useForm<FormPago>({
        plan_solicitado: '',
        meses,
        metodo_pago: '',
        numero_operacion: '',
        fecha_pago: hoy(),
        evidencia: null,
    });

    const precioDe = (planId: string, m = meses) => precios[planId]?.find((p) => p.meses === m);
    const elegido = planes.find((p) => p.id === data.plan_solicitado);
    const precioElegido = elegido ? precioDe(elegido.id, data.meses) : undefined;

    const cambiarMeses = (m: number) => {
        setMeses(m);
        setData('meses', m);
    };

    const elegir = (planId: string) => {
        setData((d) => ({ ...d, plan_solicitado: planId, meses }));
        requestAnimationFrame(() => document.getElementById('pagar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };

    const enviar = (e: FormEvent) => {
        e.preventDefault();
        post(route('proveedor.plan.solicitar'), { forceFormData: true, preserveScroll: true });
    };

    return (
        <>
            <Head title="Mi plan - CheckITSE" />
            <CuentaProveedor
                perfil={perfil}
                seccion="plan"
                titulo="Elige tu plan"
                descripcion="Más visibilidad, más clientes. Paga por Yape, Plin o banco y sube tu comprobante: lo activamos al revisarlo."
            >
                <div className="flex flex-col items-center gap-3">
                    <p className="text-lg font-semibold text-slate-700">¿Por cuánto tiempo?</p>
                    <div
                        role="radiogroup"
                        aria-label="Duración del plan"
                        className="inline-flex flex-wrap justify-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200"
                    >
                        {duraciones.map((d) => (
                            <button
                                key={d.meses}
                                type="button"
                                role="radio"
                                aria-checked={meses === d.meses}
                                onClick={() => cambiarMeses(d.meses)}
                                className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-5 text-lg font-bold transition ${
                                    meses === d.meses ? 'bg-ink-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                {d.etiqueta}
                                {d.descuento > 0 && (
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-sm ${meses === d.meses ? 'bg-sun-400 text-ink-900' : 'bg-emerald-100 text-emerald-800'}`}
                                    >
                                        −{d.descuento}%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <ul className="grid items-stretch gap-5 lg:grid-cols-3">
                    {planes.map((plan) => {
                        const Icono = ICONO_PLAN[plan.id] ?? Crown;
                        const precio = precioDe(plan.id);
                        const actual = perfil?.plan === plan.id;
                        const tono = CLASE_TONO[tonoDe(plan)];
                        const oscuro = tonoDe(plan) === 'oscuro';
                        const gratis = plan.precio === 0;

                        return (
                            <li key={plan.id} className={`relative flex flex-col rounded-3xl p-6 sm:p-7 ${tono.tarjeta}`}>
                                {plan.etiqueta && (
                                    <span
                                        className={`absolute -top-3.5 left-6 rounded-full px-4 py-1 text-sm font-extrabold tracking-wide uppercase shadow ${tono.cinta}`}
                                    >
                                        {plan.etiqueta}
                                    </span>
                                )}
                                <div className="flex items-center gap-3">
                                    <span className={`flex size-12 items-center justify-center rounded-2xl ${tono.icono}`}>
                                        <Icono aria-hidden="true" className="size-6" />
                                    </span>
                                    <h2 className="font-display text-2xl font-extrabold">{plan.nombre}</h2>
                                </div>
                                <p className={`mt-3 text-lg ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>{plan.descripcion}</p>

                                <div className="mt-5">
                                    {gratis ? (
                                        <p className="font-display text-5xl font-extrabold">Gratis</p>
                                    ) : (
                                        <>
                                            <p className="font-display text-5xl font-extrabold">
                                                {soles(precio?.por_mes ?? plan.precio)}
                                                <span className={`text-xl font-semibold ${oscuro ? 'text-slate-300' : 'text-slate-500'}`}> /mes</span>
                                            </p>
                                            {precio && precio.meses > 1 ? (
                                                <p className={`mt-2 text-base ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    <span className="line-through">{soles(plan.precio * precio.meses)}</span>{' '}
                                                    <strong className={oscuro ? 'text-white' : 'text-slate-900'}>{soles(precio.monto)}</strong> por{' '}
                                                    {precio.etiqueta} ·{' '}
                                                    <span className={`font-bold ${oscuro ? 'text-sun-300' : 'text-emerald-700'}`}>
                                                        ahorras {soles(precio.ahorro)}
                                                    </span>
                                                </p>
                                            ) : (
                                                <p className={`mt-2 text-base ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    Menos de {soles(Math.ceil(plan.precio / 30))} al día
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <ul className="mt-6 flex-1 space-y-3">
                                    {plan.beneficios.map((b) => (
                                        <li key={b} className="flex gap-2.5 text-lg">
                                            <Check
                                                aria-hidden="true"
                                                className={`mt-1 size-5 shrink-0 ${oscuro ? 'text-sun-300' : 'text-emerald-700'}`}
                                            />
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-7">
                                    {actual && (
                                        <p
                                            className={`flex min-h-13 items-center justify-center rounded-xl border-2 text-lg font-bold ${oscuro ? 'border-white/30' : 'border-slate-200 text-slate-600'}`}
                                        >
                                            Tu plan actual
                                        </p>
                                    )}
                                    {!actual && gratis && (
                                        <p className={`text-center text-base ${oscuro ? 'text-slate-300' : 'text-slate-500'}`}>
                                            Vuelves a este plan cuando vence uno pagado.
                                        </p>
                                    )}
                                    {!actual && !gratis && (
                                        <button
                                            type="button"
                                            onClick={() => elegir(plan.id)}
                                            disabled={!perfil || Boolean(pendiente)}
                                            aria-pressed={data.plan_solicitado === plan.id}
                                            className={`flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                                oscuro ? 'bg-sun-400 text-ink-900 hover:bg-sun-300' : 'bg-primary hover:bg-primary-700 text-white'
                                            }`}
                                        >
                                            {data.plan_solicitado === plan.id ? <Check aria-hidden="true" className="size-5" /> : null}
                                            {data.plan_solicitado === plan.id ? 'Elegido' : `Quiero ${plan.nombre}`}
                                        </button>
                                    )}
                                    {actual && !gratis && (
                                        <button
                                            type="button"
                                            onClick={() => elegir(plan.id)}
                                            disabled={Boolean(pendiente)}
                                            className="text-primary-700 mt-2 w-full cursor-pointer text-base font-bold underline underline-offset-2 disabled:opacity-50"
                                        >
                                            Renovar {plan.nombre}
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>

                <section aria-labelledby="compara-titulo" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
                    <h2 id="compara-titulo" className="font-display text-2xl font-bold text-slate-900">
                        Compara en un vistazo
                    </h2>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[34rem] text-left text-lg">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th scope="col" className="py-3 pr-3 text-base font-semibold text-slate-500">
                                        Lo que obtienes
                                    </th>
                                    {planes.map((p) => (
                                        <th
                                            key={p.id}
                                            scope="col"
                                            className={`px-3 py-3 text-center font-bold ${p.destacado ? 'bg-sun-50 text-sun-700' : 'text-slate-900'}`}
                                        >
                                            {p.nombre}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARATIVA.map((fila) => (
                                    <tr key={fila.texto} className="border-b border-slate-100 last:border-0">
                                        <th scope="row" className="py-3 pr-3 font-medium text-slate-700">
                                            {fila.texto}
                                        </th>
                                        {planes.map((p) => (
                                            <td key={p.id} className={`px-3 py-3 text-center ${p.destacado ? 'bg-sun-50/60' : ''}`}>
                                                <Celda valor={fila.valores[p.id] ?? false} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {!perfil && (
                    <p className="rounded-2xl bg-slate-50 p-6 text-lg text-slate-700">
                        Para contratar un plan, primero{' '}
                        <Link href={route('proveedor.perfil.editar')} className="text-primary-700 font-bold underline underline-offset-2">
                            completa los datos de tu negocio
                        </Link>
                        .
                    </p>
                )}

                {pendiente && (
                    <p className="border-sun-300 bg-sun-50 flex flex-wrap items-center gap-2 rounded-2xl border p-5 text-lg text-slate-900">
                        <Hourglass aria-hidden="true" className="text-sun-700 size-6 shrink-0" />
                        Tu pago de <strong>{soles(pendiente.monto_soles)}</strong> para el plan <strong>{pendiente.plan_nombre}</strong> está en
                        revisión. Te avisaremos aquí apenas lo revisemos.
                    </p>
                )}

                {elegido && precioElegido && !pendiente && (
                    <section id="pagar" aria-labelledby="pagar-titulo" className="grid scroll-mt-28 gap-6 lg:grid-cols-[1fr_1.2fr]">
                        <div className="bg-ink-900 trama-andina space-y-4 rounded-3xl p-6 text-white sm:p-8">
                            <h2 id="pagar-titulo" className="font-display text-2xl font-bold">
                                Paso 1 · Paga {soles(precioElegido.monto)}
                            </h2>
                            <p className="text-lg text-slate-300">
                                Plan <strong className="text-white">{elegido.nombre}</strong> por {precioElegido.etiqueta}
                                {precioElegido.ahorro > 0 && <> · ahorras {soles(precioElegido.ahorro)}</>}. A nombre de{' '}
                                <strong className="text-white">{pago.titular}</strong>.
                            </p>
                            {pago.es_ejemplo && (
                                <p className="bg-sun-400 text-ink-900 rounded-xl p-3 text-base font-semibold">
                                    Datos de pago de ejemplo: el administrador aún debe configurarlos.
                                </p>
                            )}
                            <div className="space-y-2 text-slate-900">
                                <DatoCopiable etiqueta="Yape o Plin" valor={pago.yape_plin} Icono={Smartphone} />
                                <DatoCopiable etiqueta={`Cuenta ${pago.banco}`} valor={pago.cuenta} Icono={Landmark} />
                                <DatoCopiable etiqueta="CCI (otros bancos)" valor={pago.cci} Icono={Landmark} />
                            </div>
                        </div>

                        <form onSubmit={enviar} noValidate className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
                            <h2 className="font-display text-2xl font-bold text-slate-900">Paso 2 · Sube tu comprobante</h2>
                            <ResumenErrores errores={errors} etiquetas={ETIQUETAS_PAGO} />

                            <Pregunta id="metodo_pago" numero={1} etiqueta="¿Cómo pagaste?" error={errors.metodo_pago} grupo>
                                <div className="flex flex-wrap gap-2">
                                    {metodos.map((m) => (
                                        <label
                                            key={m.valor}
                                            className={`inline-flex min-h-12 cursor-pointer items-center rounded-xl border-2 px-4 text-base font-bold ${
                                                data.metodo_pago === m.valor
                                                    ? 'border-primary bg-primary-50 text-primary-800'
                                                    : 'border-slate-200 text-slate-700'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="metodo_pago"
                                                value={m.valor}
                                                checked={data.metodo_pago === m.valor}
                                                onChange={() => setData('metodo_pago', m.valor)}
                                                className="sr-only"
                                            />
                                            {m.etiqueta}
                                        </label>
                                    ))}
                                </div>
                            </Pregunta>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <Pregunta
                                    id="numero_operacion"
                                    numero={2}
                                    etiqueta="N.° de operación"
                                    ayuda="Aparece en tu comprobante."
                                    error={errors.numero_operacion}
                                >
                                    <input
                                        id="numero_operacion"
                                        type="text"
                                        value={data.numero_operacion}
                                        onChange={(e) => setData('numero_operacion', e.target.value)}
                                        placeholder="Ej. 04512398"
                                        className={claseCampo(Boolean(errors.numero_operacion))}
                                        {...ariaDe('numero_operacion', { ayuda: true, error: errors.numero_operacion })}
                                    />
                                </Pregunta>
                                <Pregunta id="fecha_pago" numero={3} etiqueta="Fecha de pago" error={errors.fecha_pago}>
                                    <input
                                        id="fecha_pago"
                                        type="date"
                                        max={hoy()}
                                        value={data.fecha_pago}
                                        onChange={(e) => setData('fecha_pago', e.target.value)}
                                        className={claseCampo(Boolean(errors.fecha_pago))}
                                        {...ariaDe('fecha_pago', { error: errors.fecha_pago })}
                                    />
                                </Pregunta>
                            </div>

                            <Pregunta
                                id="evidencia"
                                numero={4}
                                etiqueta="Foto o captura del comprobante"
                                ayuda="JPG, PNG, WEBP o PDF. Máximo 5 MB."
                                error={errors.evidencia}
                            >
                                <label
                                    htmlFor="evidencia"
                                    className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center ${
                                        data.evidencia ? 'border-emerald-400 bg-emerald-50' : 'hover:border-primary border-slate-300'
                                    }`}
                                >
                                    {data.evidencia ? (
                                        <FileImage aria-hidden="true" className="size-8 text-emerald-700" />
                                    ) : (
                                        <Upload aria-hidden="true" className="text-primary-700 size-8" />
                                    )}
                                    <span className="text-lg font-semibold text-slate-800">
                                        {data.evidencia ? data.evidencia.name : 'Toca para elegir el archivo'}
                                    </span>
                                </label>
                                <input
                                    id="evidencia"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={(e) => setData('evidencia', e.target.files?.[0] ?? null)}
                                    className="sr-only"
                                    {...ariaDe('evidencia', { ayuda: true, error: errors.evidencia })}
                                />
                            </Pregunta>

                            <div className="rounded-2xl bg-slate-50 p-4 text-lg text-slate-700">
                                Total: <strong className="text-2xl text-slate-900">{soles(precioElegido.monto)}</strong> · {elegido.nombre} por{' '}
                                {precioElegido.etiqueta}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="bg-primary hover:bg-primary-700 inline-flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-8 text-lg font-bold text-white disabled:opacity-60"
                            >
                                {processing ? (
                                    <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                                ) : (
                                    <Send aria-hidden="true" className="size-5" />
                                )}
                                {processing ? `Enviando… ${progress?.percentage ?? 0}%` : 'Enviar comprobante'}
                            </button>
                            <p className="text-base text-slate-600">Lo revisamos en horario de oficina. Tu plan se activa desde la aprobación.</p>
                        </form>
                    </section>
                )}

                <section aria-labelledby="dudas-titulo" className="grid gap-4 md:grid-cols-3">
                    <h2 id="dudas-titulo" className="sr-only">
                        Preguntas frecuentes
                    </h2>
                    {[
                        ['¿Cuándo se activa?', 'Cuando un administrador aprueba tu comprobante. Verás el estado en tu historial.'],
                        ['¿Qué pasa al vencer?', 'Vuelves al plan Básico sin perder tu ficha. Tus productos extra se mantienen.'],
                        ['¿Puedo renovar antes?', 'Sí. Si renuevas el mismo plan, los meses se suman al final del periodo actual.'],
                    ].map(([pregunta, respuesta]) => (
                        <article key={pregunta} className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h3 className="text-lg font-bold text-slate-900">{pregunta}</h3>
                            <p className="mt-1 text-base text-slate-600">{respuesta}</p>
                        </article>
                    ))}
                </section>

                {solicitudes.length > 0 && (
                    <section aria-labelledby="historial-titulo" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
                        <h2 id="historial-titulo" className="font-display text-2xl font-bold text-slate-900">
                            Mis pagos
                        </h2>
                        <ul className="mt-4 divide-y divide-slate-100">
                            {solicitudes.map((s) => (
                                <li key={s.uuid} className="flex flex-wrap items-start justify-between gap-3 py-4">
                                    <div className="min-w-0">
                                        <p className="text-lg font-bold text-slate-900">
                                            {s.plan_nombre} · {s.meses} {s.meses === 1 ? 'mes' : 'meses'} · {soles(s.monto_soles)}
                                        </p>
                                        <p className="text-base text-slate-600">
                                            {s.metodo_pago} · Op. {s.numero_operacion} · pagado el {fechaCorta(s.fecha_pago)}
                                        </p>
                                        {s.vigente_hasta && (
                                            <p className="text-base font-semibold text-emerald-700">Activo hasta el {fechaCorta(s.vigente_hasta)}</p>
                                        )}
                                        {s.observacion_admin && (
                                            <p className="mt-1 rounded-lg bg-rose-50 p-2 text-base text-rose-900">
                                                <strong>Motivo:</strong> {s.observacion_admin}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`rounded-full px-3 py-1 text-base font-bold ${ESTADO_PAGO[s.estado].clase}`}>
                                            {ESTADO_PAGO[s.estado].texto}
                                        </span>
                                        <a
                                            href={route('proveedor.plan.comprobante', { uuid: s.uuid })}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary-700 text-base font-semibold underline underline-offset-2"
                                        >
                                            Ver comprobante
                                        </a>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </CuentaProveedor>
        </>
    );
}
