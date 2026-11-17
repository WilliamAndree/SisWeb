import { PanelResultadoAnalisisIA } from '@/components/Evaluacion/PanelResultadoAnalisisIA';
import { EvidenciaUploadModal } from '@/components/EvidenciaUploadModal';
import { ProveedoresCercanosModal } from '@/components/ProveedoresCercanosModal';
import { RecursoEducativoModal } from '@/components/RecursoEducativoModal';
import { adaptarAnalisis, mensajeErrorAnalisis, sondearAnalisis } from '@/lib/analisis-ia';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Building2,
    Camera,
    Check,
    CheckCircle2,
    ExternalLink,
    FileCheck,
    FileSpreadsheet,
    FileText,
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
}

export default function SubsanacionDirecta({ autoevaluacion, items: itemsIniciales }: Readonly<SubsanacionDirectaProps>) {
    const [items, setItems] = useState(() =>
        itemsIniciales.map((item) => ({ ...item, ultimo_analisis: adaptarAnalisis(item.ultimo_analisis, 'inicial') })),
    );
    const [procesandoCodigo, setProcesandoCodigo] = useState<string | null>(null);
    const [modalProveedoresAbierto, setModalProveedoresAbierto] = useState(false);
    const [modalRecursosAbierto, setModalRecursosAbierto] = useState(false);
    const [criterioSeleccionado, setCriterioSeleccionado] = useState<CriterioObservadoItem | null>(null);
    const [criterioEvidenciaModal, setCriterioEvidenciaModal] = useState<CriterioObservadoItem | null>(null);
    const [notaSubsanacion, setNotaSubsanacion] = useState<Record<string, string>>({});
    const [itemParaDeclarar, setItemParaDeclarar] = useState<CriterioObservadoItem | null>(null);
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

    const handleDeclararSubsanado = async (item: CriterioObservadoItem, notaManual?: string) => {
        setProcesandoCodigo(item.codigo);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const res = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/declarar-subsanado`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    criterio_id: item.criterio_id,
                    codigo_criterio: item.codigo,
                    nota: notaManual || notaSubsanacion[item.codigo] || null,
                }),
            });

            if (!res.ok) {
                throw new Error('No fue posible declarar la condición en este momento.');
            }

            // Actualizar estado local inmediatamente
            setItems((prev) =>
                prev.map((it) =>
                    it.codigo === item.codigo
                        ? {
                              ...it,
                              estado: 'CUMPLE_DECLARADO',
                              notas: notaManual || notaSubsanacion[item.codigo] || it.notas,
                          }
                        : it,
                ),
            );

            setItemParaDeclarar(null);
        } catch {
            // Fallback con Inertia router si fetch directo falla por red
            router.post(
                `/autoevaluacion/${autoevaluacion.uuid}/declarar-subsanado`,
                {
                    criterio_id: item.criterio_id,
                    codigo_criterio: item.codigo,
                    nota: notaManual || notaSubsanacion[item.codigo] || null,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setItems((prev) => prev.map((it) => (it.codigo === item.codigo ? { ...it, estado: 'CUMPLE_DECLARADO' } : it)));
                        setItemParaDeclarar(null);
                    },
                },
            );
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
            <Head title={`Puesta a Punto y Subsanación — ${autoevaluacion.nombre_comercio}`} />

            <div className="min-h-screen bg-slate-50 pb-16">
                {/* Cabecera Superior */}
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-slate-800"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver al Panel Ciudadano
                                </Link>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-sm font-bold text-amber-800">
                                        <Wrench className="h-3 w-3 text-amber-600" />
                                        Puesta a Punto ITSE
                                    </span>
                                    {autoevaluacion.sector_huancayo && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-700">
                                            <MapPin className="h-3 w-3 text-slate-400" />
                                            {autoevaluacion.sector_huancayo}
                                        </span>
                                    )}
                                    {autoevaluacion.ruc && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-sm text-slate-600">
                                            RUC: {autoevaluacion.ruc}
                                        </span>
                                    )}
                                </div>

                                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                    Subsanación y Puesta a Punto — {autoevaluacion.nombre_comercio}
                                </h1>
                                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-sm">
                                    Corrige de forma preventiva las condiciones de seguridad observadas antes de tu inspección técnica municipal. Una
                                    vez subsanada la observación en tu local, márcala como cumplida.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center">
                                <Link
                                    href={route('autoevaluacion.croquis', { uuid: autoevaluacion.uuid })}
                                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-2xs transition hover:bg-indigo-100 active:scale-95"
                                >
                                    <Building2 className="h-4 w-4 text-indigo-600" />
                                    <span>Croquis 2D</span>
                                </Link>

                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                                >
                                    Ir al Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Contenido Principal */}
                <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
                    {/* Banner de Trazabilidad, Evidencias, Orientación Visual y Deslinde Cívico */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-950">
                            <div className="mb-1 flex items-center gap-1.5 font-bold text-sky-900">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" />
                                <span>Declaración Cívica</span>
                            </div>
                            <p className="text-sm leading-relaxed text-sky-800">
                                Al marcar una condición como subsanada, registras una declaración voluntaria de cumplimiento para tu preparación
                                preventiva.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950">
                            <div className="mb-1 flex items-center gap-1.5 font-bold text-emerald-900">
                                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                                <span>Custodia de Evidencias</span>
                            </div>
                            <p className="text-sm leading-relaxed text-emerald-800">
                                Puedes adjuntar fotografías o certificados (máx. 5 MB). Se almacenan en entorno privado y con respaldo hash SHA-256.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-sm text-indigo-950">
                            <div className="mb-1 flex items-center gap-1.5 font-bold text-indigo-900">
                                <Sparkles className="h-4 w-4 shrink-0 text-indigo-600" />
                                <span>Orientación Visual IA</span>
                            </div>
                            <p className="text-sm leading-relaxed text-indigo-800">
                                Asistencia fotográfica con Gemini para detectar elementos visibles, limitaciones y sugerencias de mejora preventiva.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950">
                            <div className="mb-1 flex items-center gap-1.5 font-bold text-amber-900">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                                <span>Sin Valor Municipal</span>
                            </div>
                            <p className="text-sm leading-relaxed text-amber-800">
                                CheckITSE no emite certificados ITSE ni reemplaza la inspección técnica de seguridad efectuada por inspectores
                                municipales.
                            </p>
                        </div>
                    </div>

                    {/* Barra de Progreso y Estado */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <span className="text-sm font-bold text-slate-400">Progreso de Subsanación</span>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                        {subsanados.length} de {totalObservados}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-500">
                                        {pendientes.length === 1
                                            ? '1 condición pendiente por regularizar'
                                            : `${pendientes.length} condiciones pendientes por regularizar`}
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
                                            100% de Condiciones Declaradas Subsanadas
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            {porcentajeAvance}% Completado
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
                                            ¡Excelente trabajo! Has subsanado todas las observaciones
                                        </h2>
                                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-sm">
                                            Todas las condiciones observadas han sido declaradas como subsanadas por el titular. En tu Panel Ciudadano
                                            este local figura con <strong>100% de cumplimiento declarado</strong> como preparación preventiva para tu
                                            trámite oficial ante la municipalidad.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                        href={route('dashboard')}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                                    >
                                        <Store className="h-4 w-4" />
                                        <span>Volver al Dashboard</span>
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
                                    Regresar al Panel Ciudadano
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-sm font-black tracking-wider text-slate-700 uppercase">
                                    Condiciones Técnicas Observadas ({items.length})
                                </h2>
                                <span className="text-sm font-semibold text-slate-400">{pendientes.length} por resolver</span>
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
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 font-mono text-sm font-bold text-white">
                                                            {item.codigo}
                                                        </span>

                                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-700">
                                                            {item.categoria}
                                                        </span>

                                                        {item.norma_base && (
                                                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-sm font-medium text-slate-600">
                                                                <BookOpen className="h-3 w-3 text-slate-400" />
                                                                {item.norma_base}
                                                                {item.articulo_referencia ? ` — Art. ${item.articulo_referencia}` : ''}
                                                            </span>
                                                        )}

                                                        {estaSubsanado ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-bold text-emerald-800">
                                                                <Check className="h-3 w-3 text-emerald-600" />
                                                                Subsanado y conforme
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-800">
                                                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                                                Por regularizar
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-base font-bold text-slate-900">{item.titulo}</h3>

                                                    {/* Pregunta o qué observar */}
                                                    {(item.que_observar || item.pregunta_ciudadana) && (
                                                        <div className="space-y-1 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                                                            <span className="block font-bold text-slate-700">
                                                                ¿Qué verificar en tu establecimiento?
                                                            </span>
                                                            <p>{item.que_observar || item.pregunta_ciudadana}</p>
                                                        </div>
                                                    )}

                                                    {/* Orientación técnica / Acción recomendada */}
                                                    {item.accion_mejora_orientativa && (
                                                        <div className="space-y-1 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 text-sm leading-relaxed text-emerald-950">
                                                            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                                                                <Wrench className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                                                <span>Acción correctiva recomendada:</span>
                                                            </div>
                                                            <p className="text-emerald-800">{item.accion_mejora_orientativa}</p>
                                                        </div>
                                                    )}

                                                    {/* Nota previamente registrada */}
                                                    {item.notas && (
                                                        <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 text-sm font-medium text-slate-500 italic">
                                                            <strong>Anotación del comerciante:</strong> "{item.notas}"
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
                                                        <span>Contactar especialistas Huancayo</span>
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

                                                    <button
                                                        type="button"
                                                        onClick={() => setCriterioEvidenciaModal(item)}
                                                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                                                    >
                                                        <Camera className="h-4 w-4 text-slate-500" />
                                                        <span>{item.evidencia_url ? 'Actualizar evidencia' : 'Adjuntar evidencia (foto/PDF)'}</span>
                                                    </button>

                                                    {item.evidencia_url && (
                                                        <a
                                                            href={item.evidencia_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                                                        >
                                                            <FileCheck className="h-4 w-4 text-emerald-600" />
                                                            <span>Ver evidencia</span>
                                                        </a>
                                                    )}

                                                    {/* Botón Asistente IA si tiene evidencia y no se ha analizado aún */}
                                                    {item.subsanacion_id && item.evidencia_url && !item.es_pdf && !item.ultimo_analisis && (
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
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="inline-flex min-h-[44px] cursor-default items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2.5 text-sm font-bold text-emerald-800"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                            <span>Condición Subsanada</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={cargandoEsteItem}
                                                            onClick={() => setItemParaDeclarar(item)}
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
                                                                    <span>Ya lo subsané / Marcar como Cumple</span>
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
                            <span>Volver al Panel Ciudadano</span>
                        </Link>

                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('autoevaluacion.resumen', { uuid: autoevaluacion.uuid })}
                                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                            >
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span>Ver Diagnóstico Inicial (Resumen)</span>
                            </Link>

                            <Link
                                href={route('autoevaluacion.informe', { uuid: autoevaluacion.uuid })}
                                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700"
                            >
                                <FileCheck className="h-4 w-4" />
                                <span>Ver Informe Preventivo</span>
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
                    <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                <Check className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 id="modal-subsanar-title" className="text-base font-black text-slate-900">
                                    Declarar Condición Subsanada
                                </h3>
                                <span className="font-mono text-sm font-bold text-slate-500">
                                    {itemParaDeclarar.codigo} — {itemParaDeclarar.titulo}
                                </span>
                            </div>
                        </div>

                        <p className="text-sm leading-relaxed text-slate-600">
                            Al marcar esta condición como cumplida, confirmas bajo declaración cívica que tu local en Huancayo cuenta con esta
                            condición de seguridad debidamente implementada.
                        </p>

                        <div className="space-y-1.5">
                            <label htmlFor="nota-subsanacion" className="block text-sm font-bold text-slate-700">
                                ¿Cómo lo solucionaste? (Opcional)
                            </label>
                            <textarea
                                id="nota-subsanacion"
                                rows={3}
                                placeholder="Ej. Se instaló extintor PQS de 6 kg recargado con certificado y cartel fotoluminiscente..."
                                value={notaSubsanacion[itemParaDeclarar.codigo] || ''}
                                onChange={(e) =>
                                    setNotaSubsanacion({
                                        ...notaSubsanacion,
                                        [itemParaDeclarar.codigo]: e.target.value,
                                    })
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setItemParaDeclarar(null)}
                                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={procesandoCodigo !== null}
                                onClick={() => handleDeclararSubsanado(itemParaDeclarar, notaSubsanacion[itemParaDeclarar.codigo])}
                                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                            >
                                {procesandoCodigo === itemParaDeclarar.codigo ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        <span>Confirmar Cumplimiento</span>
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

            {/* Modal de Carga de Evidencia Fotográfica / PDF Voluntaria */}
            {criterioEvidenciaModal && (
                <EvidenciaUploadModal
                    isOpen={Boolean(criterioEvidenciaModal)}
                    onClose={() => setCriterioEvidenciaModal(null)}
                    uuid={autoevaluacion.uuid}
                    codigoItem={criterioEvidenciaModal.codigo}
                    nombreItem={criterioEvidenciaModal.titulo}
                    estadoInicial="SUBSANADO_DECLARADO"
                    accionInicial={criterioEvidenciaModal.notas || ''}
                />
            )}
        </>
    );
}
