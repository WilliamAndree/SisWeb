import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Download,
    Eye,
    FileText,
    FolderCheck,
    Info,
    Loader2,
    Printer,
    RefreshCw,
    Trash2,
    UploadCloud,
} from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';

interface ArchivoSubido {
    id: number;
    nombre: string;
    mime: string;
    tamano_bytes: number;
    hash_corto: string;
    subido_el: string | null;
    url: string;
}

interface DocumentoExpediente {
    tipo: string;
    titulo: string;
    descripcion: string;
    como_conseguirlo: string;
    base_legal: string;
    formatos: string[];
    obligatorio: boolean;
    archivo: ArchivoSubido | null;
}

interface ExpedienteDigitalProps {
    autoevaluacion: { uuid: string; nombre_comercio: string; direccion?: string | null; ruc?: string | null; codigo_acceso?: string | null };
    modalidad: 'EX_POST' | 'EX_ANTE';
    documentos: DocumentoExpediente[];
    tamano_maximo_mb: number;
}

const formatoTamano = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const formatoFecha = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

interface TarjetaDocumentoProps {
    numero: number;
    documento: DocumentoExpediente;
    uuid: string;
    tamanoMaximoMb: number;
}

function TarjetaDocumento({ numero, documento, uuid, tamanoMaximoMb }: Readonly<TarjetaDocumentoProps>) {
    const [progreso, setProgreso] = useState<number | null>(null);
    const [arrastrando, setArrastrando] = useState(false);
    const [confirmarBorrado, setConfirmarBorrado] = useState(false);
    const [errorLocal, setErrorLocal] = useState<string | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const idInput = `archivo-${documento.tipo}`;
    const listo = documento.archivo !== null;
    const extensiones = documento.formatos.map((f) => `.${f}`).join(',');

    const subir = (archivo: File | undefined) => {
        if (!archivo) return;
        const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
        if (!documento.formatos.includes(extension)) {
            setErrorLocal('Formato no permitido. Sube un PDF o una foto (JPG, PNG o WebP).');
            return;
        }
        if (archivo.size > tamanoMaximoMb * 1048576) {
            setErrorLocal(`El archivo pesa más de ${tamanoMaximoMb} MB.`);
            return;
        }
        setErrorLocal(null);
        router.post(
            route('autoevaluacion.expediente_digital.store', { uuid, tipo: documento.tipo }),
            { archivo },
            {
                forceFormData: true,
                preserveScroll: true,
                onProgress: (evento) => setProgreso(evento?.percentage ?? null),
                onError: (errores) => setErrorLocal(errores.archivo ?? 'No se pudo subir el archivo. Inténtalo otra vez.'),
                onFinish: () => {
                    setProgreso(null);
                    if (input.current) input.current.value = '';
                },
            },
        );
    };

    const alSoltar = (e: DragEvent) => {
        e.preventDefault();
        setArrastrando(false);
        subir(e.dataTransfer.files?.[0]);
    };

    const borrar = () => {
        if (!documento.archivo) return;
        router.delete(route('autoevaluacion.expediente_digital.destroy', { uuid, documento: documento.archivo.id }), {
            preserveScroll: true,
            onFinish: () => setConfirmarBorrado(false),
        });
    };

    const mensajeError = errorLocal;
    const esImagen = documento.archivo?.mime.startsWith('image/');

    return (
        <li id={`doc-${documento.tipo}`} className={`rounded-2xl border-2 bg-white p-5 sm:p-7 ${listo ? 'border-emerald-300' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-xl leading-snug font-bold text-slate-900">
                    <span className="text-primary-700 mr-1.5">{numero}.</span>
                    {documento.titulo}
                </h3>
                <span
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                        listo
                            ? 'bg-emerald-100 text-emerald-800'
                            : documento.obligatorio
                              ? 'bg-primary-100 text-primary-800'
                              : 'bg-slate-100 text-slate-700'
                    }`}
                >
                    {listo ? '✓ Listo' : documento.obligatorio ? 'Obligatorio' : 'Opcional'}
                </span>
            </div>
            <p className="mt-2 text-base leading-relaxed text-slate-700">{documento.descripcion}</p>
            <p className="mt-2 flex items-start gap-2 text-base text-slate-600">
                <Info aria-hidden="true" className="text-primary-600 mt-0.5 size-5 shrink-0" />
                <span>
                    <strong className="font-semibold text-slate-800">Cómo conseguirlo: </strong>
                    {documento.como_conseguirlo}
                </span>
            </p>

            {documento.archivo ? (
                <div className="mt-5 flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
                    {esImagen ? (
                        <img
                            src={documento.archivo.url}
                            alt={`Vista previa de ${documento.titulo}`}
                            className="h-24 w-32 shrink-0 rounded-lg object-cover"
                        />
                    ) : (
                        <span className="bg-primary-50 text-primary-700 flex h-24 w-32 shrink-0 items-center justify-center rounded-lg">
                            <FileText aria-hidden="true" className="size-10" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold text-slate-900">{documento.archivo.nombre}</p>
                        <p className="text-base text-slate-600">
                            {formatoTamano(documento.archivo.tamano_bytes)} · {formatoFecha(documento.archivo.subido_el)}
                        </p>
                        <p className="text-sm text-slate-500">Código de verificación: {documento.archivo.hash_corto}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 print:hidden">
                        <a
                            href={documento.archivo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 hover:bg-slate-100"
                        >
                            <Eye aria-hidden="true" className="size-5" /> Ver
                        </a>
                        <label
                            htmlFor={idInput}
                            className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 hover:bg-slate-100"
                        >
                            <RefreshCw aria-hidden="true" className="size-5" /> Reemplazar
                        </label>
                        {confirmarBorrado ? (
                            <span className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={borrar}
                                    className="min-h-12 cursor-pointer rounded-xl bg-rose-600 px-4 text-base font-bold text-white"
                                >
                                    Sí, eliminar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmarBorrado(false)}
                                    className="min-h-12 cursor-pointer rounded-xl px-3 text-base font-semibold text-slate-700"
                                >
                                    Cancelar
                                </button>
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmarBorrado(true)}
                                aria-label={`Eliminar ${documento.titulo}`}
                                className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-3 text-base font-semibold text-rose-700 hover:bg-rose-50"
                            >
                                <Trash2 aria-hidden="true" className="size-5" />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <label
                    htmlFor={idInput}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setArrastrando(true);
                    }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={alSoltar}
                    className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition print:hidden ${
                        arrastrando ? 'border-primary-600 bg-primary-50' : 'hover:border-primary-400 hover:bg-primary-50/40 border-slate-300'
                    }`}
                >
                    <UploadCloud aria-hidden="true" className="text-primary-600 size-10" />
                    <span className="text-lg text-slate-800">
                        <span className="text-primary-700 font-bold underline underline-offset-2">Elige el archivo</span> o arrástralo aquí
                    </span>
                    <span className="text-sm text-slate-500">
                        PDF, JPG, PNG o WebP · máximo {tamanoMaximoMb} MB · también puedes tomar una foto con tu celular
                    </span>
                </label>
            )}

            <input
                ref={input}
                id={idInput}
                type="file"
                accept={extensiones}
                className="sr-only"
                onChange={(e) => subir(e.target.files?.[0])}
                aria-describedby={mensajeError ? `${idInput}-error` : undefined}
            />

            {progreso !== null && (
                <div className="mt-4" aria-live="polite">
                    <p className="flex items-center gap-2 text-base font-semibold text-slate-700">
                        <Loader2 aria-hidden="true" className="size-5 animate-spin" /> Subiendo… {Math.round(progreso)} %
                    </p>
                    <div className="mt-2 h-2.5 rounded-full bg-slate-100">
                        <div className="bg-primary h-2.5 rounded-full transition-[width]" style={{ width: `${progreso}%` }} />
                    </div>
                </div>
            )}
            {mensajeError && (
                <p id={`${idInput}-error`} role="alert" className="mt-3 flex items-start gap-2 text-base font-medium text-rose-700">
                    <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" /> {mensajeError}
                </p>
            )}
            <p className="mt-3 text-sm text-slate-500">Base legal: {documento.base_legal}</p>
        </li>
    );
}

export default function ExpedienteDigital({ autoevaluacion, modalidad, documentos, tamano_maximo_mb }: Readonly<ExpedienteDigitalProps>) {
    const { flash } = usePage().props as { flash?: { success?: string | null } };
    const obligatorios = documentos.filter((d) => d.obligatorio);
    const obligatoriosListos = obligatorios.filter((d) => d.archivo).length;
    const subidos = documentos.filter((d) => d.archivo).length;
    const completo = obligatorios.length > 0 && obligatoriosListos === obligatorios.length;
    const porcentaje = obligatorios.length ? Math.round((obligatoriosListos / obligatorios.length) * 100) : 0;
    const esPrevia = modalidad === 'EX_ANTE';

    return (
        <>
            <Head title={`Expediente digital - ${autoevaluacion.nombre_comercio}`} />

            <Link
                href={route('autoevaluacion.resumen', { uuid: autoevaluacion.uuid })}
                className="text-primary-700 inline-flex min-h-11 items-center gap-2 text-base font-semibold hover:underline print:hidden"
            >
                <ArrowLeft aria-hidden="true" className="size-5" /> Volver a mi resumen
            </Link>

            <header className="bg-ink-900 trama-andina relative mt-3 overflow-hidden rounded-3xl pb-[18px] text-white print:bg-white print:text-black">
                <div aria-hidden="true" className="franja-andina absolute inset-x-0 bottom-0 print:hidden" />
                <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                    <div>
                        <p className="text-sun-300 inline-flex items-center gap-2 text-base font-bold print:text-black">
                            <FolderCheck aria-hidden="true" className="size-5" /> Expediente digital
                        </p>
                        <h1 className="mt-2 text-3xl leading-tight font-bold sm:text-4xl">{autoevaluacion.nombre_comercio}</h1>
                        <p className="mt-3 text-lg text-slate-300 print:text-black">
                            {esPrevia
                                ? 'Tu local es de riesgo alto: la ley pide 6 documentos técnicos junto a tu solicitud de licencia.'
                                : 'Tu local es de riesgo bajo o medio: solo es obligatoria la declaración jurada. Lo demás te ayuda a llegar mejor preparado.'}
                        </p>
                        {autoevaluacion.direccion && <p className="mt-2 text-base text-slate-400 print:text-black">{autoevaluacion.direccion}</p>}
                    </div>
                    <div className="rounded-2xl bg-white p-5 text-slate-900">
                        <p className="text-base font-semibold text-slate-600">Documentos obligatorios</p>
                        <p className="mt-1 text-4xl font-extrabold">
                            {obligatoriosListos} <span className="text-2xl text-slate-400">de {obligatorios.length}</span>
                        </p>
                        <div className="mt-3 h-3 rounded-full bg-slate-100">
                            <div className={`h-3 rounded-full ${completo ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${porcentaje}%` }} />
                        </div>
                        <p className={`mt-3 text-base font-semibold ${completo ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {completo
                                ? '¡Listo para presentar!'
                                : `Te falta${obligatorios.length - obligatoriosListos === 1 ? '' : 'n'} ${obligatorios.length - obligatoriosListos}`}
                        </p>
                    </div>
                </div>
            </header>

            {flash?.success && (
                <p
                    role="status"
                    className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-lg font-semibold text-emerald-800 print:hidden"
                >
                    <CheckCircle2 aria-hidden="true" className="size-6" /> {flash.success}
                </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3 print:hidden">
                {subidos > 0 && (
                    <a
                        href={route('autoevaluacion.expediente_digital.zip', { uuid: autoevaluacion.uuid })}
                        className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-13 items-center gap-2 rounded-xl px-6 text-lg font-bold text-white"
                    >
                        <Download aria-hidden="true" className="size-5" /> Descargar todo (ZIP)
                    </a>
                )}
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex min-h-13 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-lg font-semibold text-slate-800 hover:bg-slate-50"
                >
                    <Printer aria-hidden="true" className="size-5" /> Imprimir ficha de revisión
                </button>
            </div>

            <ol className="mt-8 space-y-5 print:hidden">
                {documentos.map((documento, indice) => (
                    <TarjetaDocumento
                        key={documento.tipo}
                        numero={indice + 1}
                        documento={documento}
                        uuid={autoevaluacion.uuid}
                        tamanoMaximoMb={tamano_maximo_mb}
                    />
                ))}
            </ol>

            {/* Ficha de revisión: vista rápida para quien revisa (también se imprime) */}
            <section aria-labelledby="ficha-titulo" className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <h2 id="ficha-titulo" className="text-2xl font-bold text-slate-900">
                    Ficha de revisión
                </h2>
                <p className="mt-1 text-base text-slate-600">
                    Resumen para quien revise el expediente. {autoevaluacion.codigo_acceso && `Código: ${autoevaluacion.codigo_acceso}.`}
                    {autoevaluacion.ruc && ` RUC: ${autoevaluacion.ruc}.`}
                </p>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-left text-base">
                        <thead>
                            <tr className="border-b-2 border-slate-300 text-slate-700">
                                <th scope="col" className="py-3 pr-3">
                                    N°
                                </th>
                                <th scope="col" className="py-3 pr-3">
                                    Documento
                                </th>
                                <th scope="col" className="py-3 pr-3">
                                    Tipo
                                </th>
                                <th scope="col" className="py-3 pr-3">
                                    Estado
                                </th>
                                <th scope="col" className="py-3">
                                    Verificación
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {documentos.map((d, i) => (
                                <tr key={d.tipo} className="border-b border-slate-200">
                                    <td className="py-3 pr-3 text-slate-500">{i + 1}</td>
                                    <td className="py-3 pr-3 font-semibold text-slate-900">{d.titulo}</td>
                                    <td className="py-3 pr-3 text-slate-700">{d.obligatorio ? 'Obligatorio' : 'Opcional'}</td>
                                    <td
                                        className={`py-3 pr-3 font-bold ${d.archivo ? 'text-emerald-700' : d.obligatorio ? 'text-primary-700' : 'text-slate-500'}`}
                                    >
                                        {d.archivo ? '✓ Entregado' : 'Falta'}
                                    </td>
                                    <td className="py-3 font-mono text-sm text-slate-500">{d.archivo?.hash_corto ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                    El código de verificación son los primeros caracteres de la huella SHA-256 del archivo: si el archivo cambia, el código cambia.
                </p>
            </section>
        </>
    );
}
