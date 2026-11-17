import { Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, CheckCircle2, Coins, FileCheck, Info, MapPin, MessageCircle, Phone, ShieldCheck, Wrench, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Registro de aliado del directorio, con la forma que devuelve
 * DirectorioAliadosService::obtenerPorCategoria en el backend.
 */
export interface AliadoAsistencia {
    id: string;
    nombre_comercial: string;
    contacto_nombre?: string | null;
    especialidad_texto?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    sede?: string | null;
    cobertura?: string | null;
    verificado?: boolean;
    servicios?: string[] | null;
    categoria?: string | null;
    acreditacion?: string | null;
    entregable_oficial?: string | null;
}

export interface RangoCostoReferencial {
    referencia_soles: number;
    minimo_soles: number;
    maximo_soles: number;
}

/**
 * Criterio normativo que originó la consulta. `guia_autoayuda` admite texto
 * suelto o la lista de pasos que produce el servicio, y `rango_costo` admite
 * texto ya formateado o el rango estructurado.
 */
export interface CriterioAsistencia {
    codigo: string;
    titulo: string;
    norma?: string | null;
    guia_autoayuda?: string | string[] | null;
    rango_costo?: string | RangoCostoReferencial | null;
    aliados?: AliadoAsistencia[] | null;
}

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly criterio: CriterioAsistencia | null;
}

type PestanaId = 'autoayuda' | 'directorio' | 'costo';

/**
 * Etiqueta del badge de identificación. Deliberadamente NO afirma certificación
 * institucional: el directorio es referencial y la verificación real de cada
 * especialista corresponde al ciudadano, no a CheckITSE.
 */
const ETIQUETA_VERIFICACION = 'Especialista de Referencia';

const PESTANAS: { id: PestanaId; etiqueta: string }[] = [
    { id: 'autoayuda', etiqueta: 'Autoayuda' },
    { id: 'directorio', etiqueta: 'Directorio verificado' },
    { id: 'costo', etiqueta: 'Costo estimado' },
];

const FORMATO_SOLES = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

function soloDigitos(valor: string | null | undefined): string {
    return (valor ?? '').replace(/\D/g, '');
}

function enlaceWhatsApp(numero: string | null | undefined, mensaje: string): string | null {
    const digitos = soloDigitos(numero);

    return digitos ? `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}` : null;
}

function guiaComoLista(valor: string | string[] | null | undefined): string[] {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor.filter((paso): paso is string => Boolean(paso?.trim()));

    return valor
        .split('\n')
        .map((paso) => paso.trim())
        .filter(Boolean);
}

/** Devuelve el rango ya sea como texto o como objeto estructurado del servicio. */
function rangoComoTexto(valor: string | RangoCostoReferencial | null | undefined): string | null {
    if (!valor) return null;
    if (typeof valor === 'string') return valor.trim() || null;

    const { referencia_soles: referencia, minimo_soles: minimo, maximo_soles: maximo } = valor;

    if (typeof minimo === 'number' && typeof maximo === 'number') {
        return `${FORMATO_SOLES.format(minimo)} a ${FORMATO_SOLES.format(maximo)}`;
    }

    return typeof referencia === 'number' ? FORMATO_SOLES.format(referencia) : null;
}

function renderInsigniaAliado(aliado: AliadoAsistencia) {
    if (aliado.acreditacion) {
        return (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-sm font-bold text-sky-900">
                <ShieldCheck className="h-3 w-3 text-sky-600" />
                {aliado.acreditacion}
            </span>
        );
    }

    if (aliado.verificado) {
        return (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                {ETIQUETA_VERIFICACION}
            </span>
        );
    }

    return null;
}

export const NubeAsistenciaModal: React.FC<Readonly<Props>> = ({ isOpen, onClose, criterio }: Readonly<Props>) => {
    const [pestanaActiva, setPestanaActiva] = useState<PestanaId>('autoayuda');
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const pasosGuia = useMemo(() => guiaComoLista(criterio?.guia_autoayuda), [criterio?.guia_autoayuda]);
    const rangoCosto = useMemo(() => rangoComoTexto(criterio?.rango_costo), [criterio?.rango_costo]);
    const aliados = useMemo(() => criterio?.aliados ?? [], [criterio?.aliados]);

    // Volver a la primera pestaña en cada apertura evita que el usuario herede
    // la pestaña de un criterio anterior.
    useEffect(() => {
        if (isOpen) {
            setPestanaActiva('autoayuda');
        }
    }, [isOpen, criterio?.codigo]);

    const manejarTeclado = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();

                return;
            }

            if (event.key !== 'Tab') return;

            // Trampa de foco: el tabulador no debe escapar del modal hacia la página.
            const panel = panelRef.current;
            if (!panel) return;

            const enfocables = Array.from(
                panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
            );

            if (enfocables.length === 0) return;

            const primero = enfocables[0];
            const ultimo = enfocables.at(-1);

            if (!primero || !ultimo) return;

            if (event.shiftKey && document.activeElement === primero) {
                event.preventDefault();
                ultimo.focus();
            } else if (!event.shiftKey && document.activeElement === ultimo) {
                event.preventDefault();
                primero.focus();
            }
        },
        [onClose],
    );

    useEffect(() => {
        if (!isOpen) return;

        const anteriormenteFocalizado = document.activeElement as HTMLElement | null;

        document.addEventListener('keydown', manejarTeclado);
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', manejarTeclado);
            document.body.style.overflow = '';
            anteriormenteFocalizado?.focus?.();
        };
    }, [isOpen, manejarTeclado]);

    if (!isOpen || !criterio) return null;

    const mensajeWhatsApp = `Hola, requiero cotización para subsanar la observación de ${
        criterio.titulo
    } en Huancayo. ¿Podrían indicarme disponibilidad y precio referencial?`;

    const moverPestana = (direccion: 1 | -1) => {
        const indiceActual = PESTANAS.findIndex((pestana) => pestana.id === pestanaActiva);
        const indiceSiguiente = (indiceActual + direccion + PESTANAS.length) % PESTANAS.length;

        setPestanaActiva(PESTANAS[indiceSiguiente].id);
    };

    return (
        <dialog
            open
            aria-labelledby="nube-asistencia-titulo"
            className="animate-in fade-in fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-3 sm:p-4"
        >
            <button
                type="button"
                aria-label="Cerrar modal"
                tabIndex={-1}
                onClick={onClose}
                className="fixed inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm transition-opacity"
            />
            <div
                ref={panelRef}
                className="relative z-10 max-h-[85vh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white text-left shadow-2xl"
            >
                {/* Encabezado institucional */}
                <header className="flex items-start justify-between gap-4 rounded-t-2xl bg-slate-900 px-5 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 rounded-xl bg-emerald-600 p-2.5 text-white">
                            <Wrench className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="mb-1 block text-sm font-bold text-slate-400">Nube de Asistencia Técnica</span>
                            <h2 id="nube-asistencia-titulo" className="text-sm leading-snug font-bold text-white sm:text-base">
                                {criterio.titulo}
                            </h2>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400">
                                <span className="font-mono font-bold text-emerald-400">{criterio.codigo}</span>
                                {criterio.norma && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span>{criterio.norma}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar la nube de asistencia técnica"
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                {/* Selector de pestañas */}
                <div
                    role="tablist"
                    aria-label="Opciones de asistencia"
                    className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3 sm:px-5"
                >
                    {PESTANAS.map((pestana) => {
                        const activo = pestana.id === pestanaActiva;

                        return (
                            <button
                                key={pestana.id}
                                id={`nube-asistencia-tab-${pestana.id}`}
                                type="button"
                                role="tab"
                                aria-selected={activo}
                                aria-controls={`nube-asistencia-panel-${pestana.id}`}
                                tabIndex={activo ? 0 : -1}
                                onClick={() => setPestanaActiva(pestana.id)}
                                onKeyDown={(event) => {
                                    if (event.key === 'ArrowRight') {
                                        event.preventDefault();
                                        moverPestana(1);
                                    } else if (event.key === 'ArrowLeft') {
                                        event.preventDefault();
                                        moverPestana(-1);
                                    }
                                }}
                                className={`-mb-px min-h-[44px] cursor-pointer border-b-2 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none ${
                                    activo
                                        ? 'border-emerald-600 text-emerald-700'
                                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                }`}
                            >
                                {pestana.etiqueta}
                            </button>
                        );
                    })}
                </div>

                {/* Panel: Autoayuda */}
                {pestanaActiva === 'autoayuda' && (
                    <section
                        role="tabpanel"
                        id="nube-asistencia-panel-autoayuda"
                        aria-labelledby="nube-asistencia-tab-autoayuda"
                        tabIndex={0}
                        className="flex flex-col gap-4 px-5 py-5 focus-visible:outline-2 focus-visible:outline-emerald-600 sm:px-6 sm:py-6"
                    >
                        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                            <p className="text-sm leading-relaxed text-emerald-900">
                                <strong>Qué exige la norma.</strong>{' '}
                                {criterio.norma
                                    ? `El criterio se sustenta en ${criterio.norma}.`
                                    : 'Este criterio se sustenta en la normativa técnica vigente.'}{' '}
                                Antes de contratar, puedes revisar y subsanar por tu cuenta los puntos de la guía y volver a evaluar.
                            </p>
                        </div>

                        {pasosGuia.length > 0 ? (
                            <div>
                                <h3 className="mb-2 text-sm font-bold text-slate-500">Cómo subsanarlo en tu establecimiento</h3>
                                <ol className="flex flex-col gap-2">
                                    {pasosGuia.map((paso, indice) => (
                                        <li key={paso} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                                                {indice + 1}
                                            </span>
                                            <span className="text-sm leading-relaxed text-slate-600">{paso}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                                <Info className="mx-auto mb-2 h-5 w-5 text-slate-400" />
                                <p className="text-sm font-semibold text-slate-700">No hay guía de autoayuda disponible para este criterio.</p>
                                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
                                    Consulta al proveedor del directorio o a la oficina de defensa civil de tu municipalidad para el detalle técnico
                                    de la subsanación.
                                </p>
                            </div>
                        )}

                        {rangoCosto && (
                            <p className="text-sm leading-relaxed text-slate-500">
                                Si decides contratar, el rango referencial de este criterio se muestra en la pestaña{' '}
                                <strong className="text-slate-700">Costo estimado</strong>.
                            </p>
                        )}
                    </section>
                )}

                {/* Panel: Directorio verificado */}
                {pestanaActiva === 'directorio' && (
                    <section
                        role="tabpanel"
                        id="nube-asistencia-panel-directorio"
                        aria-labelledby="nube-asistencia-tab-directorio"
                        tabIndex={0}
                        className="flex flex-col gap-4 px-5 py-5 focus-visible:outline-2 focus-visible:outline-emerald-600 sm:px-6 sm:py-6"
                    >
                        {aliados.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
                                <MapPin className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                                <p className="text-sm font-bold text-slate-700">Todavía no hay aliados registrados para este criterio.</p>
                                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
                                    Puedes consultar cualquier especialista de seguridad del Valle del Mantaro y validar directamente su experiencia y
                                    sus tarifas.
                                </p>
                            </div>
                        ) : (
                            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {aliados.map((aliado) => {
                                    const whatsapp = enlaceWhatsApp(aliado.whatsapp ?? aliado.telefono, mensajeWhatsApp);
                                    const telefono = soloDigitos(aliado.telefono);
                                    const servicios = aliado.servicios ?? [];

                                    return (
                                        <li
                                            key={aliado.id}
                                            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="text-sm leading-snug font-bold text-slate-900 sm:text-sm">
                                                        {aliado.nombre_comercial}
                                                    </h3>
                                                    {aliado.contacto_nombre && (
                                                        <p className="mt-0.5 text-sm text-slate-500">{aliado.contacto_nombre}</p>
                                                    )}
                                                </div>
                                                {renderInsigniaAliado(aliado)}
                                            </div>

                                            {aliado.especialidad_texto && (
                                                <p className="mt-2 text-sm leading-relaxed font-semibold text-slate-600">
                                                    {aliado.especialidad_texto}
                                                </p>
                                            )}

                                            {(aliado.sede || aliado.cobertura) && (
                                                <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-slate-500">
                                                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                                    {[aliado.sede, aliado.cobertura].filter(Boolean).join(' · ')}
                                                </p>
                                            )}

                                            {aliado.entregable_oficial && (
                                                <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-sm text-emerald-950">
                                                    <div className="flex items-center gap-1 font-bold text-emerald-900">
                                                        <FileCheck className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                                                        <span>Documentación Técnica para Trámite (Formato Normativo):</span>
                                                    </div>
                                                    <p className="mt-0.5 leading-relaxed font-medium text-emerald-900">{aliado.entregable_oficial}</p>
                                                </div>
                                            )}

                                            {servicios.length > 0 && (
                                                <ul className="mt-3 flex flex-col gap-1.5">
                                                    {servicios.map((servicio) => (
                                                        <li key={servicio} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                                                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                                                            {servicio}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}

                                            <div className="mt-auto flex flex-wrap items-center gap-2 pt-3.5">
                                                {whatsapp && (
                                                    <a
                                                        href={whatsapp}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                                                    >
                                                        <MessageCircle className="h-3.5 w-3.5" />
                                                        WhatsApp
                                                    </a>
                                                )}
                                                {telefono && (
                                                    <a
                                                        href={`tel:${telefono}`}
                                                        className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                                                    >
                                                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                                                        Llamar
                                                    </a>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row">
                            <div className="flex items-start gap-2.5">
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                <p className="text-sm leading-relaxed text-slate-600">
                                    Directorio cívico de orientación. Contratación directa entre privados sin comisiones ni aval oficial.
                                </p>
                            </div>
                            <Link
                                href="/directorio"
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-bold text-white shadow-2xs transition hover:bg-slate-800"
                            >
                                <span>Directorio completo</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </section>
                )}

                {/* Panel: Costo estimado */}
                {pestanaActiva === 'costo' && (
                    <section
                        role="tabpanel"
                        id="nube-asistencia-panel-costo"
                        aria-labelledby="nube-asistencia-tab-costo"
                        tabIndex={0}
                        className="flex flex-col gap-4 px-5 py-5 focus-visible:outline-2 focus-visible:outline-emerald-600 sm:px-6 sm:py-6"
                    >
                        {rangoCosto ? (
                            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                <div className="shrink-0 rounded-xl bg-emerald-600 p-2.5 text-white">
                                    <Coins className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500">Rango referencial de subsanación</h3>
                                    <p className="mt-1 text-lg leading-tight font-bold text-slate-900">{rangoCosto}</p>
                                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                        Estimación aproximada para {criterio.titulo.toLowerCase()} en un establecimiento del Valle del Mantaro. El
                                        valor final depende del alcance del trabajo y de los materiales empleados.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
                                <Coins className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                                <p className="text-sm font-bold text-slate-700">No hay rango referencial para este criterio.</p>
                                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
                                    Solicita una cotización directa a los especialistas del directorio para conocer el costo de tu caso particular.
                                </p>
                            </div>
                        )}

                        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                            <div className="text-sm leading-relaxed text-amber-900">
                                <p className="font-bold">CheckITSE no fija precios ni cobra comisiones.</p>
                                <p className="mt-1">
                                    El monto mostrado es una orientación calculada con costos promedio de la región, no una tarifa oficial. CheckITSE
                                    no interviene en la contratación, no retiene comisión alguna y no responde por el acuerdo económico que cierres
                                    con el proveedor. El pago es directo entre tu y el profesional.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Pie de cierre */}
                <footer className="border-t border-slate-200 px-5 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] w-full cursor-pointer rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
                    >
                        Entendido
                    </button>
                </footer>
            </div>
        </dialog>
    );
};
