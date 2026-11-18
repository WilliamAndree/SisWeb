import { OpcionesTarjeta, Pregunta, ResumenErrores, ariaDe, claseCampo } from '@/components/form/Pregunta';
import { CuentaProveedor } from '@/components/proveedor/CuentaProveedor';
import { mapaPunto, mapaZona } from '@/lib/item-visual';
import type { PerfilResumen } from '@/types/proveedor';
import { Head, useForm } from '@inertiajs/react';
import { Crosshair, Loader2, MapPin, Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Perfil extends PerfilResumen {
    especialidad: string;
    descripcion: string | null;
    telefono: string | null;
    whatsapp: string | null;
    distrito: string;
    direccion: string | null;
    latitud: number | null;
    longitud: number | null;
}

type FormPerfil = {
    nombre_comercial: string;
    especialidad: string;
    descripcion: string;
    telefono: string;
    whatsapp: string;
    distrito: string;
    direccion: string;
    latitud: string;
    longitud: string;
};

const ESPECIALIDADES = [
    { valor: 'incendios', titulo: 'Extintores y señalética', descripcion: 'Venta, recarga, luces de emergencia' },
    { valor: 'electricas', titulo: 'Electricidad y pozo a tierra', descripcion: 'Tableros, cableado, mediciones' },
    { valor: 'arquitectura_senaletica', titulo: 'Planos y evacuación', descripcion: 'Planos, croquis, señalización' },
    { valor: 'estructuras', titulo: 'Estructuras y vidrios', descripcion: 'Anclajes, pasamanos, puertas' },
];

const ETIQUETAS_PERFIL: Record<string, string> = {
    nombre_comercial: 'Nombre del negocio',
    especialidad: 'Especialidad',
    telefono: 'Teléfono',
    whatsapp: 'WhatsApp',
    distrito: 'Distrito',
    latitud: 'Ubicación',
};

function SeccionPerfil({ perfil, distritos }: Readonly<{ perfil: Perfil | null; distritos: string[] }>) {
    const [ubicando, setUbicando] = useState(false);
    const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
    const { data, setData, put, processing, errors } = useForm<FormPerfil>({
        nombre_comercial: perfil?.nombre_comercial ?? '',
        especialidad: perfil?.especialidad ?? '',
        descripcion: perfil?.descripcion ?? '',
        telefono: perfil?.telefono ?? '',
        whatsapp: perfil?.whatsapp ?? '',
        distrito: perfil?.distrito ?? '',
        direccion: perfil?.direccion ?? '',
        latitud: perfil?.latitud?.toString() ?? '',
        longitud: perfil?.longitud?.toString() ?? '',
    });

    const usarMiUbicacion = () => {
        if (!('geolocation' in navigator)) {
            setErrorUbicacion('Tu navegador no permite obtener la ubicación. Escribe tu dirección.');
            return;
        }
        setUbicando(true);
        setErrorUbicacion(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setData((d) => ({ ...d, latitud: pos.coords.latitude.toFixed(6), longitud: pos.coords.longitude.toFixed(6) }));
                setUbicando(false);
            },
            () => {
                setErrorUbicacion('No pudimos obtener tu ubicación. Revisa el permiso del navegador o escribe tu dirección.');
                setUbicando(false);
            },
            { enableHighAccuracy: true, timeout: 15000 },
        );
    };

    const lat = Number.parseFloat(data.latitud);
    const lng = Number.parseFloat(data.longitud);
    const tienePunto = Number.isFinite(lat) && Number.isFinite(lng);
    const mapa = tienePunto ? mapaPunto(lat, lng) : mapaZona([data.direccion, data.distrito].filter(Boolean).join(', ') || 'Huancayo');

    const guardar = (e: FormEvent) => {
        e.preventDefault();
        put(route('proveedor.perfil'), { preserveScroll: true });
    };

    return (
        <form onSubmit={guardar} noValidate className="space-y-8">
            <ResumenErrores errores={errors} etiquetas={ETIQUETAS_PERFIL} />

            <Pregunta id="nombre_comercial" numero={1} etiqueta="Nombre de tu negocio" error={errors.nombre_comercial}>
                <input
                    id="nombre_comercial"
                    type="text"
                    value={data.nombre_comercial}
                    onChange={(e) => setData('nombre_comercial', e.target.value)}
                    placeholder="Ej. Extintores Wanka"
                    className={claseCampo(Boolean(errors.nombre_comercial))}
                    {...ariaDe('nombre_comercial', { error: errors.nombre_comercial })}
                />
            </Pregunta>

            <Pregunta
                id="especialidad"
                numero={2}
                etiqueta="¿Qué vendes o instalas?"
                ayuda="Aparecerás en esta sección del directorio."
                error={errors.especialidad}
                grupo
            >
                <OpcionesTarjeta
                    nombre="especialidad"
                    valor={data.especialidad}
                    onCambio={(v) => setData('especialidad', v)}
                    opciones={ESPECIALIDADES}
                />
            </Pregunta>

            <Pregunta id="descripcion" numero={3} etiqueta="Cuéntales a tus clientes sobre tu negocio" opcional>
                <textarea
                    id="descripcion"
                    rows={3}
                    maxLength={600}
                    value={data.descripcion}
                    onChange={(e) => setData('descripcion', e.target.value)}
                    placeholder="Ej. Más de 10 años recargando extintores en Huancayo. Entregamos certificado."
                    className={`${claseCampo()} h-auto py-3`}
                />
            </Pregunta>

            <div className="grid gap-8 sm:grid-cols-2">
                <Pregunta id="telefono" numero={4} etiqueta="Teléfono" error={errors.telefono}>
                    <input
                        id="telefono"
                        type="tel"
                        inputMode="tel"
                        value={data.telefono}
                        onChange={(e) => setData('telefono', e.target.value)}
                        placeholder="964 123 456"
                        className={claseCampo(Boolean(errors.telefono))}
                        {...ariaDe('telefono', { error: errors.telefono })}
                    />
                </Pregunta>
                <Pregunta id="whatsapp" numero={5} etiqueta="WhatsApp" opcional ayuda="Si lo dejas vacío usamos tu teléfono." error={errors.whatsapp}>
                    <input
                        id="whatsapp"
                        type="tel"
                        inputMode="tel"
                        value={data.whatsapp}
                        onChange={(e) => setData('whatsapp', e.target.value)}
                        className={claseCampo(Boolean(errors.whatsapp))}
                        {...ariaDe('whatsapp', { ayuda: true, error: errors.whatsapp })}
                    />
                </Pregunta>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
                <Pregunta id="distrito" numero={6} etiqueta="Distrito" error={errors.distrito}>
                    <select
                        id="distrito"
                        value={data.distrito}
                        onChange={(e) => setData('distrito', e.target.value)}
                        className={`${claseCampo(Boolean(errors.distrito))} cursor-pointer`}
                        {...ariaDe('distrito', { error: errors.distrito })}
                    >
                        <option value="">Selecciona</option>
                        {distritos.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                </Pregunta>
                <Pregunta id="direccion" numero={7} etiqueta="Dirección del local" opcional>
                    <input
                        id="direccion"
                        type="text"
                        value={data.direccion}
                        onChange={(e) => setData('direccion', e.target.value)}
                        placeholder="Ej. Jr. Puno 450"
                        className={claseCampo()}
                    />
                </Pregunta>
            </div>

            <Pregunta
                id="latitud"
                numero={8}
                etiqueta="Ubica tu local en el mapa"
                ayuda="Estando en tu local, toca el botón. Así tus clientes llegan sin perderse."
                error={errors.latitud ?? errorUbicacion ?? undefined}
                opcional
                grupo
            >
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={usarMiUbicacion}
                        disabled={ubicando}
                        className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-5 text-base font-bold text-white disabled:opacity-60"
                    >
                        {ubicando ? (
                            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                        ) : (
                            <Crosshair aria-hidden="true" className="size-5" />
                        )}
                        {ubicando ? 'Buscando…' : 'Usar mi ubicación actual'}
                    </button>
                    {tienePunto && (
                        <button
                            type="button"
                            onClick={() => setData((d) => ({ ...d, latitud: '', longitud: '' }))}
                            className="min-h-12 cursor-pointer rounded-xl px-4 text-base font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Quitar punto
                        </button>
                    )}
                </div>
                <p className="mt-3 flex items-center gap-2 text-base text-slate-600">
                    <MapPin aria-hidden="true" className="text-primary-600 size-5 shrink-0" />
                    {tienePunto ? `Punto guardado: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Sin punto exacto: mostraremos tu zona.'}
                </p>
                <iframe
                    title="Vista previa de tu ubicación"
                    src={mapa.embed}
                    loading="lazy"
                    className="mt-3 h-64 w-full rounded-xl border border-slate-200"
                />
            </Pregunta>

            <button
                type="submit"
                disabled={processing}
                className="bg-primary hover:bg-primary-700 inline-flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-8 text-lg font-bold text-white disabled:opacity-60 sm:w-auto"
            >
                {processing ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <Save aria-hidden="true" className="size-5" />}
                {perfil ? 'Guardar cambios' : 'Publicar mi perfil'}
            </button>
        </form>
    );
}

export default function PerfilProveedor({ perfil, distritos }: Readonly<{ perfil: Perfil | null; distritos: string[] }>) {
    return (
        <>
            <Head title="Mi negocio - CheckITSE" />
            <CuentaProveedor
                perfil={perfil}
                seccion="perfil"
                titulo="Mi negocio"
                descripcion="Así te encuentran y te contactan los clientes. Mientras más completo, más confianza das."
            >
                <section aria-label="Datos del negocio" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
                    <SeccionPerfil perfil={perfil} distritos={distritos} />
                </section>
            </CuentaProveedor>
        </>
    );
}
