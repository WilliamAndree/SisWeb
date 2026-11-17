import { useForm } from '@inertiajs/react';
import { CheckCircle2, FileText, ImagePlus, Info, Loader2, Sparkles, Upload, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

export type EstadoSubsanacionModal = 'PENDIENTE' | 'EN_PROCESO' | 'SUBSANADO_DECLARADO';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly uuid: string;
    readonly codigoItem: string;
    readonly nombreItem?: string;
    readonly estadoInicial?: EstadoSubsanacionModal;
    readonly accionInicial?: string;
}

const MAX_EVIDENCIA_MB = 5;
const TIPOS_PERMITIDOS = new Set<string>(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const ESTADOS: Array<{
    valor: EstadoSubsanacionModal;
    etiqueta: string;
    activo: string;
}> = [
    {
        valor: 'PENDIENTE',
        etiqueta: 'Pendiente',
        activo: 'bg-neutral-200 text-neutral-800 ring-1 ring-neutral-300',
    },
    {
        valor: 'EN_PROCESO',
        etiqueta: 'En Proceso',
        activo: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300',
    },
    {
        valor: 'SUBSANADO_DECLARADO',
        etiqueta: 'Declarado Subsanado',
        activo: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
    },
];

export const EvidenciaUploadModal: React.FC<Readonly<Props>> = ({
    isOpen,
    onClose,
    uuid,
    codigoItem,
    nombreItem,
    estadoInicial = 'EN_PROCESO',
    accionInicial = '',
}: Readonly<Props>) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const inputFileRef = useRef<HTMLInputElement>(null);
    const elementoPrevioRef = useRef<HTMLElement | null>(null);
    const [archivo, setArchivo] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [progreso, setProgreso] = useState<number>(0);
    const [errorCliente, setErrorCliente] = useState<string | null>(null);

    const form = useForm({
        codigo_item: codigoItem,
        descripcion_subsanacion: accionInicial,
        estado: estadoInicial,
        evidencia: null as File | null,
    });

    useEffect(() => {
        if (!isOpen) return;

        // Conserva el foco del control que abrió el modal para restaurarlo al cerrar.
        elementoPrevioRef.current ??= document.activeElement as HTMLElement | null;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) return;

        const elementoPrevio = elementoPrevioRef.current;
        elementoPrevioRef.current = null;

        if (elementoPrevio?.isConnected) {
            elementoPrevio.focus();
        }
    }, [isOpen]);

    const seleccionarArchivo = (file: File | null) => {
        setErrorCliente(null);

        if (preview) {
            URL.revokeObjectURL(preview);
            setPreview(null);
        }

        if (!file) {
            setArchivo(null);
            form.setData('evidencia', null);

            return;
        }

        if (!TIPOS_PERMITIDOS.has(file.type)) {
            setErrorCliente('Solo se permiten imágenes JPG/PNG/WEBP o documentos PDF.');
            inputFileRef.current?.focus();

            return;
        }

        if (file.size > MAX_EVIDENCIA_MB * 1024 * 1024) {
            setErrorCliente(`El archivo supera el límite de ${MAX_EVIDENCIA_MB} MB.`);
            inputFileRef.current?.focus();

            return;
        }

        setArchivo(file);
        form.setData('evidencia', file);

        if (file.type.startsWith('image/')) {
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (form.data.descripcion_subsanacion.trim().length < 5) {
            form.setError('descripcion_subsanacion', 'Describe la acción correctiva realizada (mínimo 5 caracteres).');

            return;
        }

        setProgreso(0);
        form.post(`/autoevaluacion/subsanacion/${uuid}`, {
            onProgress: (progress) => setProgreso(progress?.percentage ?? 0),
            onSuccess: () => {
                setProgreso(0);
                onClose();
            },
            preserveScroll: true,
            forceFormData: true,
        });
    };

    if (!isOpen) return null;

    const esImagen = Boolean(preview);

    return (
        <dialog
            open
            aria-labelledby="evidencia-upload-titulo"
            className="animate-in fade-in fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4"
        >
            <button
                type="button"
                aria-label="Cerrar modal"
                tabIndex={-1}
                onClick={onClose}
                className="fixed inset-0 cursor-default bg-neutral-950/50 backdrop-blur-xs"
            />
            <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-neutral-100 bg-white p-5 text-left shadow-2xl sm:p-7">
                {/* Cabecera del Modal */}
                <div className="mb-5 flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
                    <div className="flex items-start gap-3">
                        <div className="text-danger-900 shrink-0 rounded-xl border border-rose-100 bg-rose-50 p-2.5">
                            <ImagePlus className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="mb-1 block text-sm font-bold text-neutral-400">Gestión de Evidencias · Plan Preventivo</span>
                            <h3 id="evidencia-upload-titulo" className="text-sm leading-snug font-bold text-neutral-900">
                                Registrar evidencia y estado
                            </h3>
                            {nombreItem && (
                                <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                                    <span className="text-danger-900 font-mono font-bold">{codigoItem}</span> · {nombreItem}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar registro de evidencia"
                        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500 transition hover:bg-neutral-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Estado declarado */}
                    <div>
                        <span className="mb-1.5 block text-sm font-bold text-neutral-500">Estado Declarado de tu Adecuación</span>
                        <div className="grid grid-cols-3 gap-2">
                            {ESTADOS.map((opcion) => (
                                <button
                                    key={opcion.valor}
                                    type="button"
                                    onClick={() => form.setData('estado', opcion.valor)}
                                    className={`cursor-pointer rounded-xl border p-2.5 text-xs font-semibold transition ${
                                        form.data.estado === opcion.valor
                                            ? `${opcion.activo} border-transparent`
                                            : 'border-neutral-200 bg-white font-medium text-neutral-600 hover:bg-neutral-50'
                                    }`}
                                >
                                    {opcion.etiqueta}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Acción correctiva realizada */}
                    <div>
                        <label htmlFor="descripcion_subsanacion" className="mb-1 block text-sm font-bold text-neutral-500">
                            Acción correctiva realizada
                        </label>
                        <textarea
                            id="descripcion_subsanacion"
                            rows={3}
                            value={form.data.descripcion_subsanacion}
                            onChange={(event) => form.setData('descripcion_subsanacion', event.target.value)}
                            placeholder="Describe los trabajos o acciones realizadas, marcas y especificaciones técnicas implementadas..."
                            className="focus:border-danger-900 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm font-medium outline-none"
                        />
                        {form.errors.descripcion_subsanacion && (
                            <p className="text-danger-900 mt-1 text-sm font-medium">{form.errors.descripcion_subsanacion}</p>
                        )}
                    </div>

                    {/* Selección de archivo */}
                    <div>
                        <span className="mb-1 block text-sm font-bold text-neutral-500">
                            Evidencia (JPG, PNG, WEBP o PDF · máximo {MAX_EVIDENCIA_MB} MB)
                        </span>
                        <label className="hover:border-danger-900/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-5 text-center text-neutral-400 transition hover:bg-neutral-100">
                            <Upload className="h-6 w-6" />
                            {archivo ? (
                                <span className="text-sm font-semibold text-neutral-700">
                                    {archivo.name} ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                            ) : (
                                <span className="text-sm">Selecciona una imagen o documento PDF de evidencia</span>
                            )}
                            <input
                                ref={inputFileRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                aria-describedby="evidencia-nota-declaracion"
                                className="hidden"
                                onChange={(event) => seleccionarArchivo(event.target.files?.[0] || null)}
                            />
                        </label>

                        <p
                            id="evidencia-nota-declaracion"
                            className="mt-2 flex items-start gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-2 text-sm leading-relaxed text-sky-900"
                        >
                            <Info className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>
                                La evidencia es <strong>declarada por el ciudadano</strong> y respalda tu adecuación con fines preventivos; no es
                                verificada oficialmente por la autoridad competente y se conserva de forma privada, accesible solo para ti.
                            </span>
                        </p>

                        {/* Previsualización */}
                        {esImagen && preview && (
                            <div className="mt-3 space-y-2">
                                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                                    <img src={preview} alt="Previsualización de la evidencia" className="max-h-56 w-full object-contain" />
                                </div>
                                <p className="flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 p-2 text-sm font-medium text-indigo-700">
                                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                                    <span>
                                        Al registrar esta fotografía, podrás solicitar <strong>orientación visual asistida con IA</strong> desde el
                                        panel de subsanación.
                                    </span>
                                </p>
                            </div>
                        )}
                        {archivo && !esImagen && (
                            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
                                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                <span>
                                    Documento PDF seleccionado para respaldo documental (las orientaciones visuales automáticas con IA requieren
                                    fotografía).
                                </span>
                            </div>
                        )}

                        {errorCliente && <p className="text-danger-900 mt-1 text-sm font-medium">{errorCliente}</p>}
                        {form.errors.evidencia && <p className="text-danger-900 mt-1 text-sm font-medium">{form.errors.evidencia}</p>}
                        <div aria-live="polite" className="sr-only">
                            {errorCliente || form.errors.evidencia || ''}
                        </div>
                    </div>

                    {/* Barra de progreso */}
                    {form.processing && (
                        <div aria-live="polite">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                                <div className="h-full rounded-full bg-emerald-500 transition-all duration-200" style={{ width: `${progreso}%` }} />
                            </div>
                            <p className="mt-1.5 text-sm font-medium text-neutral-500">
                                {progreso < 100 ? `Subiendo evidencia... ${Math.round(progreso)}%` : 'Guardando registro...'}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="bg-danger-900 hover:bg-danger-800 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-70"
                        >
                            {form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            {form.processing ? 'Procesando...' : 'Registrar evidencia y estado'}
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    );
};
