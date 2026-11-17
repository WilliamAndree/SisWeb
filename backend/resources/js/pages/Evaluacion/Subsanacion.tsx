import { EvidenciaUploadModal } from '@/components/EvidenciaUploadModal';
import { GuiaModal } from '@/components/GuiaModal';
import { ModalConfirmarReevaluacion } from '@/components/ModalConfirmarReevaluacion';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { ProveedoresCercanosModal } from '@/components/ProveedoresCercanosModal';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Clock, FileCheck, Info, MapPin, RefreshCw, Save, UploadCloud } from 'lucide-react';
import { useState } from 'react';

type EstadoSubsanacion = 'PENDIENTE' | 'EN_PROCESO' | 'SUBSANADO_DECLARADO';

interface SubsanacionItem {
    id: number;
    codigo_item: string;
    descripcion: string;
    observacion?: string;
    evidencia_url?: string;
    estado: EstadoSubsanacion;
    fecha_subsanacion?: string;
    created_at: string;
}

interface SimulacionData {
    id: number;
    codigo_revision: string;
    total_observaciones: number;
    resultado: string;
    detalle_revision?: Record<string, boolean>;
    subsanaciones: SubsanacionItem[];
}

interface ChecklistItem {
    codigo: string;
    nombre: string;
    norma?: string;
}

interface AutoevaluacionData {
    id: number;
    uuid_trazabilidad: string;
    nombre_comercio: string;
    ruc: string;
    sector_huancayo: string;
    tipo_tramite?: string | null;
    semaforo?: string;
    detalle_checklist: ChecklistItem[];
}

interface Props {
    readonly autoevaluacion: AutoevaluacionData;
    readonly ultimaRevision?: SimulacionData;
}

const OPCIONES_ESTADO: Array<{
    valor: EstadoSubsanacion;
    etiqueta: string;
    detalle: string;
    activo: string;
}> = [
    {
        valor: 'PENDIENTE',
        etiqueta: 'Pendiente',
        detalle: 'Aún no inicias la adecuación.',
        activo: 'bg-neutral-200 text-neutral-800 ring-1 ring-neutral-300',
    },
    {
        valor: 'EN_PROCESO',
        etiqueta: 'En Proceso',
        detalle: 'Adecuación en curso o parcial.',
        activo: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300',
    },
    {
        valor: 'SUBSANADO_DECLARADO',
        etiqueta: 'Declarado Subsanado',
        detalle: 'Completado y respaldado por ti.',
        activo: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
    },
];

export default function Subsanacion({ autoevaluacion, ultimaRevision }: Readonly<Props>) {
    const [showGuia, setShowGuia] = useState<boolean>(false);
    const [showGuardarProgreso, setShowGuardarProgreso] = useState<boolean>(false);
    const [showModalReevaluacion, setShowModalReevaluacion] = useState<boolean>(false);
    const [codigoProveedores, setCodigoProveedores] = useState<string | null>(null);
    const [itemActivoNombre, setItemActivoNombre] = useState<string | null>(null);
    const [codigoEvidencia, setCodigoEvidencia] = useState<string | null>(null);
    const { auth } = usePage().props as { auth?: { user: { id: number; name: string } | null } };
    const esInvitado = !auth?.user;

    const codigosObservados = ultimaRevision?.detalle_revision
        ? Object.keys(ultimaRevision.detalle_revision).filter((k) => ultimaRevision.detalle_revision![k] === false)
        : [];

    const itemsParaSubsanar = autoevaluacion.detalle_checklist.filter((i) => codigosObservados.includes(i.codigo));

    const subsanacionesRealizadas = ultimaRevision?.subsanaciones || [];

    const estadoOperativo = ultimaRevision?.resultado === 'SIN_OBSERVACIONES';

    const itemEvidencia = itemsParaSubsanar.find((i) => i.codigo === codigoEvidencia);
    const subEvidencia = subsanacionesRealizadas.find((s) => s.codigo_item === codigoEvidencia);

    const cambiarEstadoItem = (codigo: string, nuevo: EstadoSubsanacion, sub?: SubsanacionItem) => {
        router.post(
            `/autoevaluacion/subsanacion/${autoevaluacion.uuid_trazabilidad}`,
            {
                codigo_item: codigo,
                descripcion_subsanacion: sub?.descripcion ?? 'Adecuación preventiva registrada desde el panel de la condición.',
                estado: nuevo,
            },
            { preserveScroll: true },
        );
    };

    const badgeEstado = (estado?: EstadoSubsanacion) => {
        switch (estado) {
            case 'SUBSANADO_DECLARADO':
                return (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-sm font-bold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Declarado Subsanado
                    </span>
                );
            case 'EN_PROCESO':
                return (
                    <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-900">
                        <RefreshCw className="h-3 w-3 text-amber-700" /> En Proceso
                    </span>
                );
            case 'PENDIENTE':
                return (
                    <span className="flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-sm font-bold text-neutral-600">
                        <Clock className="h-3 w-3" /> Pendiente
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-sm font-bold text-neutral-400">
                        <Clock className="h-3 w-3" /> Sin declarar
                    </span>
                );
        }
    };

    const renderBloqueOperativo = () => {
        if (estadoOperativo) {
            return (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                    <h3 className="text-sm font-bold text-emerald-950">Sin Observaciones Declaradas</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-emerald-800">
                        Tu última simulación de revisión no registró observaciones. Mantén tus condiciones al día para conservar un buen nivel de
                        preparación.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowModalReevaluacion(true)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-xs transition hover:bg-emerald-50"
                        >
                            <RefreshCw className="h-3.5 w-3.5" /> Volver a evaluar establecimiento
                        </button>
                        <a
                            href={`/autoevaluacion/informe/${autoevaluacion.uuid_trazabilidad}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-800"
                        >
                            <FileCheck className="h-4 w-4" /> Generar Informe de Autoevaluación
                        </a>
                    </div>
                </div>
            );
        }

        return (
            <>
                {/* Tarjetas por condición observada */}
                <div className="space-y-4">
                    {itemsParaSubsanar.map((item) => {
                        const sub = subsanacionesRealizadas.find((s) => s.codigo_item === item.codigo);

                        return (
                            <div key={item.codigo} className="space-y-4 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-xs sm:p-6">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-sm font-bold text-neutral-800">{item.codigo}</span>
                                    {badgeEstado(sub?.estado)}
                                </div>
                                <h3 className="-mt-1 text-sm leading-snug font-bold text-neutral-900">{item.nombre}</h3>

                                {sub?.descripcion && <p className="text-sm leading-relaxed text-neutral-600">{sub.descripcion}</p>}

                                {sub?.evidencia_url && (
                                    <a
                                        href={`/autoevaluacion/subsanacion/${autoevaluacion.uuid_trazabilidad}/evidencia/${sub.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-danger-900 inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
                                    >
                                        <UploadCloud className="h-3.5 w-3.5" /> Ver evidencia declarada
                                    </a>
                                )}

                                {/* Cambio de estado reactivo */}
                                <div>
                                    <span className="mb-1.5 block text-sm font-bold text-neutral-500">Estado declarado de tu adecuación</span>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        {OPCIONES_ESTADO.map((opcion) => {
                                            const activo = sub?.estado === opcion.valor;

                                            return (
                                                <button
                                                    key={opcion.valor}
                                                    type="button"
                                                    onClick={() => cambiarEstadoItem(item.codigo, opcion.valor, sub)}
                                                    className={`cursor-pointer rounded-2xl border p-3 text-left transition ${
                                                        activo
                                                            ? `${opcion.activo} border-transparent`
                                                            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                                                    }`}
                                                >
                                                    <span className="block text-sm font-bold">{opcion.etiqueta}</span>
                                                    <span className="mt-0.5 block text-sm text-neutral-500">{opcion.detalle}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Acciones de soporte */}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setCodigoEvidencia(item.codigo)}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-neutral-800"
                                    >
                                        <Camera className="h-3.5 w-3.5" />
                                        {sub?.evidencia_url ? 'Actualizar evidencia' : 'Subir evidencia'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCodigoProveedores(item.codigo);
                                            setItemActivoNombre(item.nombre);
                                        }}
                                        className="text-primary-700 hover:text-primary-800 bg-primary-50/60 hover:bg-primary-50 border-primary-200 focus-visible:ring-primary-500 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-bold shadow-xs transition focus-visible:ring-2 focus-visible:outline-none"
                                    >
                                        <MapPin className="h-3.5 w-3.5" /> Buscar recursos cercanos en Huancayo
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Historial de Adecuaciones */}
                {subsanacionesRealizadas.length > 0 && (
                    <div className="space-y-3 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-xs">
                        <h3 className="text-sm font-bold text-neutral-900">Historial de tu Plan Preventivo</h3>
                        <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100">
                            {subsanacionesRealizadas.map((sub) => (
                                <div key={sub.id} className="flex flex-col justify-between gap-3 bg-white p-4 sm:flex-row sm:items-center">
                                    <div className="flex-1 pr-3">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-neutral-800">{sub.codigo_item}</span>
                                            {badgeEstado(sub.estado)}
                                        </div>
                                        <p className="text-sm leading-relaxed text-neutral-600">{sub.descripcion}</p>
                                        {sub.observacion && <p className="mt-0.5 text-sm text-neutral-400">Nota: {sub.observacion}</p>}
                                        {sub.evidencia_url && (
                                            <a
                                                href={`/autoevaluacion/subsanacion/${autoevaluacion.uuid_trazabilidad}/evidencia/${sub.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-danger-900 mt-1.5 inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
                                            >
                                                <UploadCloud className="h-3.5 w-3.5" /> Ver evidencia declarada
                                            </a>
                                        )}
                                    </div>
                                    <span className="shrink-0 font-mono text-sm text-neutral-400">{sub.fecha_subsanacion || sub.created_at}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <>
            <Head title={`Plan de Subsanación Preventiva - ${autoevaluacion.nombre_comercio}`} />
            <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />
            <ModalGuardarProgreso
                isOpen={showGuardarProgreso}
                onClose={() => setShowGuardarProgreso(false)}
                uuid={autoevaluacion.uuid_trazabilidad}
                establecimiento={autoevaluacion.nombre_comercio}
            />
            <ProveedoresCercanosModal
                isOpen={!!codigoProveedores}
                onClose={() => setCodigoProveedores(null)}
                codigo={codigoProveedores}
                nombreItem={itemActivoNombre}
                sectorRef={autoevaluacion.sector_huancayo}
            />
            {codigoEvidencia && (
                <EvidenciaUploadModal
                    key={`${codigoEvidencia}-${subEvidencia?.estado ?? ''}-${subEvidencia?.descripcion ?? ''}`}
                    isOpen
                    onClose={() => setCodigoEvidencia(null)}
                    uuid={autoevaluacion.uuid_trazabilidad}
                    codigoItem={codigoEvidencia}
                    nombreItem={itemEvidencia?.nombre}
                    estadoInicial={subEvidencia?.estado ?? 'EN_PROCESO'}
                    accionInicial={subEvidencia?.descripcion ?? ''}
                />
            )}
            <ModalConfirmarReevaluacion
                isOpen={showModalReevaluacion}
                onClose={() => setShowModalReevaluacion(false)}
                uuid={autoevaluacion.uuid_trazabilidad}
                nombreComercio={autoevaluacion.nombre_comercio}
            />

            <div className="mx-auto max-w-4xl space-y-6 text-left">
                {/* Cabecera */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-danger-900 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-sm font-bold">
                                Plan de Subsanación Preventiva
                            </span>
                            {ultimaRevision && <span className="font-mono text-sm font-bold text-neutral-500">{ultimaRevision.codigo_revision}</span>}
                        </div>
                        <h1 className="mt-2 text-2xl font-extrabold text-neutral-900 sm:text-3xl">Registro de Adecuaciones Declaradas</h1>
                        <p className="mt-0.5 text-sm text-neutral-500">
                            {autoevaluacion.nombre_comercio} · RUC: <strong className="font-mono">{autoevaluacion.ruc}</strong>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowModalReevaluacion(true)}
                            className="text-primary-700 bg-primary-50/70 hover:bg-primary-50 border-primary-200 focus-visible:ring-primary-500 inline-flex cursor-pointer items-center gap-1.5 self-start rounded-xl border px-3.5 py-2 text-sm font-semibold shadow-xs transition focus-visible:ring-2 focus-visible:outline-none sm:self-auto"
                        >
                            <RefreshCw className="h-3.5 w-3.5" /> Volver a evaluar
                        </button>

                        <Link
                            href={`/autoevaluacion/resultado/${autoevaluacion.uuid_trazabilidad}`}
                            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-600 shadow-xs transition hover:bg-neutral-50 sm:self-auto"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Resultado
                        </Link>

                        {esInvitado && (
                            <button
                                type="button"
                                onClick={() => setShowGuardarProgreso(true)}
                                className="text-primary-700 hover:text-primary-800 bg-primary-50/60 hover:bg-primary-50 border-primary-100 focus-visible:ring-primary-500 inline-flex cursor-pointer items-center gap-1.5 self-start rounded-xl border px-3.5 py-2 text-sm font-bold shadow-xs transition focus-visible:ring-2 focus-visible:outline-none sm:self-auto"
                            >
                                <Save className="h-3.5 w-3.5" /> Guardar mi progreso para continuar después
                            </button>
                        )}
                    </div>
                </div>

                {ultimaRevision && (
                    <div
                        role="note"
                        aria-label="Naturaleza preventiva de las evidencias declaradas"
                        className="mb-5 flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm leading-relaxed text-sky-900"
                    >
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p>
                            Las evidencias que adjuntes son <strong>declaradas por el ciudadano</strong> y respaldan tu adecuación con fines
                            preventivos: no han sido verificadas oficialmente por la autoridad competente y se conservan en almacenamiento privado,
                            accesible solo para ti.
                        </p>
                    </div>
                )}

                {!ultimaRevision ? (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
                        <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-amber-700" />
                        <h3 className="text-sm font-bold text-amber-950">Sin Simulación de Revisión Previo</h3>
                        <p className="mx-auto mt-1 max-w-md text-sm text-amber-800">
                            Primero realiza la simulación de revisión in situ para identificar las condiciones que requieren tu plan de preparación.
                        </p>
                        <Link
                            href={`/autoevaluacion/revision/${autoevaluacion.uuid_trazabilidad}`}
                            className="bg-danger-900 hover:bg-danger-800 mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-95"
                        >
                            Realizar Simulación de Revisión In Situ
                        </Link>
                    </div>
                ) : (
                    renderBloqueOperativo()
                )}
            </div>
        </>
    );
}
