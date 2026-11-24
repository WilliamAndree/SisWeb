import { LoQueTeFalta } from '@/components/Evaluacion/LoQueTeFalta';
import type { CriterioAsistencia } from '@/components/Evaluacion/NubeAsistenciaModal';
import { PanelResultadoAnalisisIA } from '@/components/Evaluacion/PanelResultadoAnalisisIA';
import { ProveedoresCercanosModal } from '@/components/ProveedoresCercanosModal';
import { RecursoEducativoModal } from '@/components/RecursoEducativoModal';
import { adaptarAnalisis, mensajeErrorAnalisis, sondearAnalisis } from '@/lib/analisis-ia';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Camera,
    Check,
    CheckCircle2,
    ExternalLink,
    FileCheck,
    FileSpreadsheet,
    FileText,
    FolderOpen,
    Loader2,
    MapPin,
    ShieldCheck,
    Sparkles,
    Store,
    Users,
    Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface RecursoEducativoItem {
    id: number;
    titulo: string;
    descripcion_corta: string;
    tipo: 'VIDEO' | 'GUIA_DIGITAL' | 'ENLACE_EXTERNO';
    url: string;
}

export interface CriterioObservadoItem {
    asistencia?: CriterioAsistencia | null;
    id?: number | null;
    subsanacion_id?: number | null;
    criterio_id?: number | null;
    codigo: string;
    titulo: string;
    categoria: string;
    norma_base: string;
    articulo_referencia?: string | null;
    pregunta_ciudadana?: string | null;
    que_observar?: string | null;
    accion_mejora_orientativa: string;
    estado: string;
    notas?: string | null;
    evidencia_url?: string | null;
    mime_type?: string | null;
    es_imagen?: boolean;
    es_pdf?: boolean;
    ultimo_analisis?: unknown;
    recursos_educativos?: RecursoEducativoItem[];
}

export interface SubsanacionDirectaProps {
    readonly autoevaluacion: {
        id: number;
        uuid: string;
        nombre_comercio: string;
        funcion_economica?: string | null;
        ruc?: string | null;
        direccion?: string | null;
        sector_huancayo?: string | null;
        estado: string;
        porcentaje_cumplimiento: number;
        semaforo?: string | null;
    };
    readonly items: CriterioObservadoItem[];
    readonly total_observaciones: number;
    /** Solo se ofrece la orientación con IA si el servidor tiene la clave configurada. */
    readonly analisis_ia_disponible?: boolean;
}

const TIPOS_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function SubsanacionDirecta({
    autoevaluacion,
    items: itemsIniciales,
    analisis_ia_disponible = false,
}: Readonly<SubsanacionDirectaProps>) {
    const [items, setItems] = useState(() =>
        itemsIniciales.map((item) => ({ ...item, ultimo_analisis: adaptarAnalisis(item.ultimo_analisis, 'inicial') })),
    );
    const [procesandoCodigo, setProcesandoCodigo] = useState<string | null>(null);
    const [modalProveedoresAbierto, setModalProveedoresAbierto] = useState(false);
    const [modalRecursosAbierto, setModalRecursosAbierto] = useState(false);
    const [criterioSeleccionado, setCriterioSeleccionado] = useState<CriterioObservadoItem | null>(null);
    const [notaSubsanacion, setNotaSubsanacion] = useState<Record<string, string>>({});
    const [itemParaDeclarar, setItemParaDeclarar] = useState<CriterioObservadoItem | null>(null);
    const [fotoCorreccion, setFotoCorreccion] = useState<File | null>(null);
    const [vistaFoto, setVistaFoto] = useState<string | null>(null);
    const [errorCorreccion, setErrorCorreccion] = useState<string | null>(null);
    const [solicitandoAnalisis, setSolicitandoAnalisis] = useState<Record<string, boolean>>({});
    const sondeosRef = useRef<Record<string, () => void>>({});
    const [erroresAnalisis, setErroresAnalisis] = useState<Record<string, string>>({});
    const iniciarSondeoAnalisis = useCallback(
        (codigo: string, uuid: string) => {
            sondeosRef.current[codigo]?.();
            sondeosRef.current[codigo] = sondearAnalisis({
                url: `/autoevaluacion/${autoevaluacion.uuid}/analisis/${uuid}/estado`,
                uuid,
                onResultado: (analisis) =>
                    setItems((prev) => prev.map((item) => (item.codigo === codigo ? { ...item, ultimo_analisis: analisis } : item))),
                onError: (mensaje) => setErroresAnalisis((prev) => ({ ...prev, [codigo]: mensaje })),
            });
        },
        [autoevaluacion.uuid],
    );

    useEffect(() => {
        const sondeos = sondeosRef.current;
        const normalizados = itemsIniciales.map((item) => ({ ...item, ultimo_analisis: adaptarAnalisis(item.ultimo_analisis, 'inicial') }));
        setItems(normalizados);
        normalizados.forEach((item) => {
            const analisis = item.ultimo_analisis;
            if (analisis && (analisis.estado === 'PENDIENTE' || analisis.estado === 'EN_PROCESO')) iniciarSondeoAnalisis(item.codigo, analisis.uuid);
        });
        return () => {
            Object.values(sondeos).forEach((cancelar) => cancelar());
        };
    }, [itemsIniciales, iniciarSondeoAnalisis]);

    const handleSolicitarAnalisis = async (item: CriterioObservadoItem) => {
        if (!item.subsanacion_id) return;

        setErroresAnalisis((prev) => ({ ...prev, [item.codigo]: '' }));
        setSolicitandoAnalisis((prev) => ({ ...prev, [item.codigo]: true }));
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        try {
            const res = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/evidencias/${item.subsanacion_id}/analizar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(mensajeErrorAnalisis(data, res.status));
            }

            const analisisUuid = data.analisis_uuid;
            if (typeof analisisUuid !== 'string' || !analisisUuid)
                throw new Error('La respuesta de inicio no es válida. Actualiza la página antes de reintentar.');
            setItems((prev) =>
                prev.map((it) =>
                    it.codigo === item.codigo
                        ? {
                              ...it,
                              ultimo_analisis: {
                                  uuid: analisisUuid,
                                  estado: data.estado || 'PENDIENTE',
                                  resultado: null,
                                  mensaje_error: null,
                              },
                          }
                        : it,
                ),
            );

            if (analisisUuid) {
                iniciarSondeoAnalisis(item.codigo, analisisUuid);
            }
        } catch (err: unknown) {
            const mensaje = err instanceof Error ? err.message : 'Error al solicitar orientación visual con IA.';
            setErroresAnalisis((prev) => ({ ...prev, [item.codigo]: mensaje }));
        } finally {
            setSolicitandoAnalisis((prev) => ({ ...prev, [item.codigo]: false }));
        }
    };

    const totalObservados = items.length;
    const subsanados = items.filter((it) => it.estado === 'CUMPLE_DECLARADO' || it.estado === 'CUMPLE');
    const pendientes = items.filter((it) => it.estado !== 'CUMPLE_DECLARADO' && it.estado !== 'CUMPLE');
    const todosSubsanados = totalObservados > 0 && pendientes.length === 0;

    const porcentajeAvance = totalObservados > 0 ? Math.round((subsanados.length / totalObservados) * 100) : 100;

    /** Cambia el estado de una condición en pantalla al instante (antes de que responda el servidor). */
    const marcarEnPantalla = (codigo: string, cambios: Pick<Partial<CriterioObservadoItem>, 'estado' | 'notas'>) =>
        setItems((prev) => prev.map((it) => (it.codigo === codigo ? { ...it, ...cambios } : it)));

    /** El respaldo local del checklist no debe volver a poner «Necesito atenderlo» en algo ya corregido. */
    const olvidarRespuestaLocal = (codigo: string) => {
        try {
            const clave = `checkitse-respuestas-${autoevaluacion.uuid}`;
            const guardado = JSON.parse(globalThis.localStorage?.getItem(clave) ?? '{}') as Record<string, string>;
            delete guardado[codigo];
            globalThis.localStorage?.setItem(clave, JSON.stringify(guardado));
        } catch {
            // Sin almacenamiento local: no hay nada que limpiar.
        }
    };

    const abrirCorreccion = (item: CriterioObservadoItem) => {
        setErrorCorreccion(null);
        setFotoCorreccion(null);
        setVistaFoto(null);
        setItemParaDeclarar(item);
    };

    const cerrarCorreccion = () => {
        if (vistaFoto) URL.revokeObjectURL(vistaFoto);
        setVistaFoto(null);
        setFotoCorreccion(null);
        setItemParaDeclarar(null);
    };

    const elegirFoto = (archivo: File | null) => {
        setErrorCorreccion(null);
        if (archivo && !TIPOS_FOTO.has(archivo.type)) {
            setErrorCorreccion('Usa una foto en JPG, PNG o WEBP.');
            return;
        }
        if (archivo && archivo.size > 5 * 1024 * 1024) {
            setErrorCorreccion('La foto pesa más de 5 MB. Toma otra con menos resolución.');
            return;
        }
        if (vistaFoto) URL.revokeObjectURL(vistaFoto);
        setFotoCorreccion(archivo);
        setVistaFoto(archivo ? URL.createObjectURL(archivo) : null);
    };

    /** Deshace una corrección: la condición vuelve a "por corregir" y el resumen se recalcula. */
    const handleDeshacer = (item: CriterioObservadoItem) => {
        setProcesandoCodigo(item.codigo);
        marcarEnPantalla(item.codigo, { estado: 'PENDIENTE_ATENDER' });
        router.post(
            route('autoevaluacion.subsanacion.store', { uuid: autoevaluacion.uuid }),
            {
                codigo_item: item.codigo,
                descripcion_subsanacion: item.notas && item.notas.length >= 5 ? item.notas : 'Corrección deshecha por el titular.',
                estado: 'EN_PROCESO',
            },
            { preserveScroll: true, onFinish: () => setProcesandoCodigo(null) },
        );
    };

    const handleDeclararSubsanado = async (item: CriterioObservadoItem, notaManual?: string) => {
        const nota = (notaManual ?? notaSubsanacion[item.codigo] ?? '').trim();
        const foto = fotoCorreccion;
        const estadoAnterior = item.estado;
        setProcesandoCodigo(item.codigo);
        setErrorCorreccion(null);

        // Se ve corregido de inmediato; si el servidor no lo acepta, vuelve a como estaba.
        marcarEnPantalla(item.codigo, { estado: 'CUMPLE_DECLARADO', notas: nota || item.notas });
        olvidarRespuestaLocal(item.codigo);

        const revertir = (mensaje: string) => {
            marcarEnPantalla(item.codigo, { estado: estadoAnterior });
            setErrorCorreccion(mensaje);
            setItemParaDeclarar(item);
        };

        if (foto) {
            cerrarCorreccion();
            router.post(
                route('autoevaluacion.subsanacion.store', { uuid: autoevaluacion.uuid }),
                {
                    codigo_item: item.codigo,
                    descripcion_subsanacion: nota.length >= 5 ? nota : 'Corregido en el local; adjunto foto como prueba.',
                    estado: 'SUBSANADO_DECLARADO',
                    evidencia: foto,
                },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    onError: (errores) => revertir(String(Object.values(errores)[0] ?? 'No se pudo guardar la foto. Intenta de nuevo.')),
                    onFinish: () => setProcesandoCodigo(null),
                },
            );
            return;
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/declarar-subsanado`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ criterio_id: item.criterio_id, codigo_criterio: item.codigo, nota: nota || null }),
            });
            if (!res.ok) {
                revertir(res.status === 419 ? 'Tu sesión se renovó. Vuelve a intentarlo.' : 'No se pudo guardar. Intenta de nuevo.');
                return;
            }
            cerrarCorreccion();
            // Trae del servidor el estado definitivo (evidencias, totales) sin mover la pantalla.
            router.reload({ only: ['items', 'autoevaluacion'] });
        } catch {
            revertir('Sin conexión. Revisa tu internet e intenta de nuevo.');
        } finally {
            setProcesandoCodigo(null);
        }
    };

    const abrirModalProveedores = (item: CriterioObservadoItem) => {
        setCriterioSeleccionado(item);
        setModalProveedoresAbierto(true);
    };

    const abrirModalRecursos = (item: CriterioObservadoItem) => {
        setCriterioSeleccionado(item);
        setModalRecursosAbierto(true);
    };

    return (
        <>
            <Head title={`Corregir lo que falta — ${autoevaluacion.nombre_comercio}`} />

            <div className="min-h-screen bg-slate-50 pb-16">
                {/* Cabecera: de quién es, qué hacer y a dónde ir después */}
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                        <Link
                            href={route('dashboard')}
                            className="inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-slate-600 transition hover:text-slate-900"
                        >
                            <ArrowLeft aria-hidden="true" className="size-5" />
                            Volver a mi panel
                        </Link>
                        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="flex flex-wrap items-center gap-2 text-base text-slate-600">
                                    <span className="text-primary-700 font-bold">Puesta a punto</span>
                                    {autoevaluacion.sector_huancayo && (
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin aria-hidden="true" className="size-4 text-slate-400" />
                                            {autoevaluacion.sector_huancayo}
                                        </span>
                                    )}
                                    {autoevaluacion.ruc && <span className="font-mono text-sm">RUC {autoevaluacion.ruc}</span>}
                                </p>
                                <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                                    {autoevaluacion.nombre_comercio}
                                </h1>
                                <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600">
                                    Corrige lo que falta antes de tu inspección. Cuando lo tengas listo en tu local, márcalo como resuelto.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href={route('autoevaluacion.expediente_digital', { uuid: autoevaluacion.uuid })}
                                    className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold text-white"
                                >
                                    <FolderOpen aria-hidden="true" className="size-5" /> Mi expediente
                                </Link>
                                <Link
                                    href={route('autoevaluacion.resumen', { uuid: autoevaluacion.uuid })}
                                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-base font-bold text-slate-800 hover:bg-slate-50"
                                >
                                    Ver mi resumen
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Contenido Principal */}
                <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
                    <p className="flex items-start gap-2 text-base leading-relaxed text-slate-600">
                        <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        Tus fotos y documentos se guardan en privado. Marcar algo como resuelto es una declaración tuya: CheckITSE no emite
                        certificados ni reemplaza la inspección municipal.
                    </p>

                    {/* Barra de Progreso y Estado */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <span className="text-sm font-bold text-slate-400">Tu avance</span>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                        {subsanados.length} de {totalObservados}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-500">
                                        {pendientes.length === 1
                                            ? 'te falta 1'
                                            : pendientes.length === 0
                                              ? 'todo corregido'
                                              : `te faltan ${pendientes.length}`}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                        todosSubsanados
                                            ? 'border border-emerald-300 bg-emerald-100 text-emerald-800'
                                            : 'border border-amber-300 bg-amber-100 text-amber-900'
                                    }`}
                                >
                                    {todosSubsanados ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            ¡Todo corregido!
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            {porcentajeAvance}% listo
                                        </>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Barra Visual */}
                        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={`h-full transition-all duration-500 ${todosSubsanados ? 'bg-emerald-500' : 'bg-emerald-600'}`}
                                style={{ width: `${porcentajeAvance}%` }}
                            />
                        </div>
                    </div>

                    {/* Lo que falta, en grande y con foto, con proveedores y mapa */}
                    {pendientes.length > 0 && (
                        <LoQueTeFalta
                            items={pendientes}
                            nombreLocal={autoevaluacion.nombre_comercio}
                            onAdjuntarEvidencia={(codigo) => {
                                const item = items.find((it) => it.codigo === codigo);
                                if (item) abrirCorreccion(item);
                            }}
                        />
                    )}

                    {/* Banner de Felicitación / 100% Conforme */}
                    {todosSubsanados && (
                        <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-6 shadow-sm sm:p-8">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                                        <Sparkles className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                                            ¡Excelente trabajo! Corregiste todo lo que faltaba
                                        </h2>
                                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-sm">
                                            Tu local ya figura al <strong>100 %</strong> en tu panel. Ahora arma tu expediente y descarga tu
                                            declaración jurada para presentarla en tu municipalidad.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                        href={route('dashboard')}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                                    >
                                        <Store className="h-4 w-4" />
                                        <span>Volver a mi panel</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>

                                    <a
                                        href={route('autoevaluacion.anexo', { uuid: autoevaluacion.uuid })}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                        <span>Descargar Anexo 4</span>
                                        <ExternalLink className="h-3 w-3 text-slate-400" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista de Criterios Observados */}
                    {items.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                            <h3 className="mt-4 text-base font-bold text-slate-800">No hay observaciones pendientes en este local</h3>
                            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                                Tu establecimiento cuenta con todas las condiciones declaradas conformes en esta autoevaluación preventiva.
                            </p>
                            <div className="mt-6">
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700"
                                >
                                    Volver a mi panel
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-sm font-black tracking-wider text-slate-700 uppercase">
                                    Lo que había que corregir ({items.length})
                                </h2>
                                <span className="text-sm font-semibold text-slate-400">{pendientes.length} por corregir</span>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {items.map((item) => {
                                    const estaSubsanado = item.estado === 'CUMPLE_DECLARADO' || item.estado === 'CUMPLE';
                                    const cargandoEsteItem = procesandoCodigo === item.codigo;

                                    return (
                                        <article
                                            key={item.codigo}
                                            className={`rounded-3xl border p-5 transition-all sm:p-6 ${
                                                estaSubsanado
                                                    ? 'border-emerald-300 bg-emerald-50/30'
                                                    : 'border-slate-200 bg-white shadow-2xs hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                {/* Cabecera del ítem */}
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {estaSubsanado ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-bold text-emerald-800">
                                                                <Check className="h-3 w-3 text-emerald-600" />
                                                                Corregido
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-800">
                                                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                                                Por corregir
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-base font-bold text-slate-900">{item.titulo}</h3>

                                                    {/* Pregunta o qué observar */}
                                                    {(item.que_observar || item.pregunta_ciudadana) && (
                                                        <div className="space-y-1 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                                                            <span className="block font-bold text-slate-700">Qué revisar en tu local</span>
                                                            <p>{item.que_observar || item.pregunta_ciudadana}</p>
                                                        </div>
                                                    )}

                                                    {/* Orientación técnica / Acción recomendada */}
                                                    {item.accion_mejora_orientativa && (
                                                        <div className="space-y-1 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 text-sm leading-relaxed text-emerald-950">
                                                            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                                                                <Wrench className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                                                <span>Qué hacer:</span>
                                                            </div>
                                                            <p className="text-emerald-800">{item.accion_mejora_orientativa}</p>
                                                        </div>
                                                    )}

                                                    {/* Nota previamente registrada */}
                                                    {item.notas && (
                                                        <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 text-sm font-medium text-slate-500 italic">
                                                            <strong>Lo que escribiste:</strong> "{item.notas}"
                                                        </div>
                                                    )}

                                                    {/* Aviso si la evidencia adjunta es un PDF */}
                                                    {item.evidencia_url && item.es_pdf && (
                                                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                                                            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                                            <span>
                                                                Archivo PDF custodiado como respaldo documental. (La orientación visual con IA
                                                                requiere fotografía en JPG, PNG o WebP).
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Panel de Orientación Visual con IA */}
                                                    {erroresAnalisis[item.codigo] && (
                                                        <p role="alert" className="bg-danger-50 text-danger-800 mt-3 rounded-xl p-3 text-sm">
                                                            {erroresAnalisis[item.codigo]}
                                                        </p>
                                                    )}
                                                    {item.ultimo_analisis && (
                                                        <PanelResultadoAnalisisIA
                                                            analisis={item.ultimo_analisis}
                                                            codigoCriterio={item.codigo}
                                                            onReanalizar={item.subsanacion_id ? () => handleSolicitarAnalisis(item) : undefined}
                                                            estaReanalizando={Boolean(solicitandoAnalisis[item.codigo])}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Botones de Acción */}
                                            <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-4">
                                                {/* Botón de Ayuda / Aliados Técnicos y Recursos */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => abrirModalProveedores(item)}
                                                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                                                    >
                                                        <Users className="h-4 w-4 text-emerald-600" />
                                                        <span>Quién lo vende o instala</span>
                                                    </button>

                                                    {item.recursos_educativos && item.recursos_educativos.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => abrirModalRecursos(item)}
                                                            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                                                        >
                                                            <BookOpen className="h-4 w-4 text-sky-600" />
                                                            <span>Guía / Video técnico ({item.recursos_educativos.length})</span>
                                                        </button>
                                                    )}

                                                    {estaSubsanado && (
                                                        <button
                                                            type="button"
                                                            onClick={() => abrirCorreccion(item)}
                                                            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                                                        >
                                                            <Camera className="h-4 w-4 text-slate-500" />
                                                            <span>{item.evidencia_url ? 'Cambiar foto' : 'Agregar foto'}</span>
                                                        </button>
                                                    )}

                                                    {item.evidencia_url && (
                                                        <a
                                                            href={item.evidencia_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                                                        >
                                                            <FileCheck className="h-4 w-4 text-emerald-600" />
                                                            <span>Ver foto</span>
                                                        </a>
                                                    )}

                                                    {/* Botón Asistente IA si tiene evidencia y no se ha analizado aún */}
                                                    {analisis_ia_disponible &&
                                                        item.subsanacion_id &&
                                                        item.evidencia_url &&
                                                        !item.es_pdf &&
                                                        !item.ultimo_analisis && (
                                                            <button
                                                                type="button"
                                                                disabled={Boolean(solicitandoAnalisis[item.codigo])}
                                                                onClick={() => handleSolicitarAnalisis(item)}
                                                                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2 text-sm font-bold text-indigo-700 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-100 active:scale-95 disabled:opacity-50"
                                                                title="Solicitar orientación visual con IA (Gemini)"
                                                            >
                                                                {solicitandoAnalisis[item.codigo] ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                                                ) : (
                                                                    <Sparkles className="h-4 w-4 text-indigo-600" />
                                                                )}
                                                                <span>Orientación visual con IA</span>
                                                            </button>
                                                        )}
                                                </div>

                                                {/* Botón de Subsanación */}
                                                <div>
                                                    {estaSubsanado ? (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2.5 text-sm font-bold text-emerald-800">
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                                Corregido
                                                            </span>
                                                            <button
                                                                type="button"
                                                                disabled={cargandoEsteItem}
                                                                onClick={() => handleDeshacer(item)}
                                                                className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                                            >
                                                                {cargandoEsteItem ? 'Guardando…' : 'Deshacer'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={cargandoEsteItem}
                                                            onClick={() => abrirCorreccion(item)}
                                                            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                                                        >
                                                            {cargandoEsteItem ? (
                                                                <>
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                    <span>Guardando...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Check className="h-4 w-4" />
                                                                    <span>Ya lo corregí</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Botón Final Inferior */}
                    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
                        <Link
                            href={route('dashboard')}
                            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-900"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Volver a mi panel</span>
                        </Link>

                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('autoevaluacion.resumen', { uuid: autoevaluacion.uuid })}
                                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                            >
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span>Ver mi resultado</span>
                            </Link>

                            <Link
                                href={route('autoevaluacion.informe', { uuid: autoevaluacion.uuid })}
                                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700"
                            >
                                <FileCheck className="h-4 w-4" />
                                <span>Mi informe (PDF)</span>
                            </Link>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal Confirmar Subsanación con Nota Opcional */}
            {itemParaDeclarar && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-subsanar-title"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
                >
                    <div className="max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                <Check className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 id="modal-subsanar-title" className="text-lg font-black text-slate-900">
                                    ¿Ya lo corregiste?
                                </h3>
                                <p className="text-base font-semibold text-slate-600">{itemParaDeclarar.titulo}</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="nota-subsanacion" className="block text-base font-bold text-slate-800">
                                ¿Qué hiciste? <span className="font-normal text-slate-500">(opcional)</span>
                            </label>
                            <textarea
                                id="nota-subsanacion"
                                rows={3}
                                placeholder="Ej. Compré un extintor de 6 kg y lo colgué junto a la puerta."
                                value={notaSubsanacion[itemParaDeclarar.codigo] || ''}
                                onChange={(e) =>
                                    setNotaSubsanacion({
                                        ...notaSubsanacion,
                                        [itemParaDeclarar.codigo]: e.target.value,
                                    })
                                }
                                className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-base text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <span className="block text-base font-bold text-slate-800">
                                Foto como prueba <span className="font-normal text-slate-500">(opcional)</span>
                            </span>
                            {vistaFoto && (
                                <div className="overflow-hidden rounded-2xl border border-slate-200">
                                    <img src={vistaFoto} alt="Foto de la corrección" className="max-h-56 w-full object-cover" />
                                </div>
                            )}
                            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 text-base font-bold text-emerald-800 hover:bg-emerald-100">
                                <Camera aria-hidden="true" className="h-5 w-5" />
                                {vistaFoto ? 'Tomar otra foto' : 'Tomar o elegir una foto'}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    capture="environment"
                                    className="sr-only"
                                    onChange={(e) => elegirFoto(e.target.files?.[0] ?? null)}
                                />
                            </label>
                        </div>

                        {errorCorreccion && (
                            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-base font-semibold text-rose-800">
                                {errorCorreccion}
                            </p>
                        )}

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={cerrarCorreccion}
                                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-base font-bold text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={procesandoCodigo !== null}
                                onClick={() => handleDeclararSubsanado(itemParaDeclarar, notaSubsanacion[itemParaDeclarar.codigo])}
                                className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                            >
                                {procesandoCodigo === itemParaDeclarar.codigo ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Guardando…</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        <span>Sí, ya está corregido</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Proveedores Cercanos */}
            {criterioSeleccionado && (
                <ProveedoresCercanosModal
                    isOpen={modalProveedoresAbierto}
                    onClose={() => {
                        setModalProveedoresAbierto(false);
                        setCriterioSeleccionado(null);
                    }}
                    codigo={criterioSeleccionado.codigo}
                    nombreItem={criterioSeleccionado.titulo}
                    sectorRef={autoevaluacion.sector_huancayo ?? 'Huancayo'}
                />
            )}

            {/* Modal de Recursos Educativos */}
            {criterioSeleccionado && criterioSeleccionado.recursos_educativos && (
                <RecursoEducativoModal
                    isOpen={modalRecursosAbierto}
                    onClose={() => {
                        setModalRecursosAbierto(false);
                        setCriterioSeleccionado(null);
                    }}
                    recursos={criterioSeleccionado.recursos_educativos.map((r) => ({
                        id: r.id,
                        titulo: r.titulo,
                        descripcion_corta: r.descripcion_corta,
                        tipo: r.tipo,
                        url: r.url,
                    }))}
                    criterioCodigo={criterioSeleccionado.codigo}
                    criterioTitulo={criterioSeleccionado.titulo}
                />
            )}
        </>
    );
}
