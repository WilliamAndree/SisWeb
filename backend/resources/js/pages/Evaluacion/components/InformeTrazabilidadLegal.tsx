import { etiquetaEstado } from '@/data/estados';
import type { FilaMatriz } from '@/types/contrato';
import {
    AlertTriangle,
    CalendarClock,
    FileCheck,
    FileText,
    Fingerprint,
    Hash,
    Layers,
} from 'lucide-react';
import type { EvaluacionDatosFisicos } from './InformeDatosGenerales';

interface EvaluacionTrazabilidadLegal extends EvaluacionDatosFisicos {
    uuid_trazabilidad?: string;
    uuid?: string;
}

interface InformeTrazabilidadLegalProps {
    readonly evaluacion: EvaluacionTrazabilidadLegal;
    readonly gapFinal: string;
    readonly fechaEmision: string;
    readonly matrizSubsanaciones: FilaMatriz[];
    readonly hashIntegridad: string | null;
    readonly hashFinal: string;
}

export function InformeTrazabilidadLegal({
    evaluacion,
    gapFinal,
    fechaEmision,
    matrizSubsanaciones,
    hashIntegridad,
    hashFinal,
}: Readonly<InformeTrazabilidadLegalProps>) {
    const tieneSubsanaciones = matrizSubsanaciones.length > 0;
    const uuid = evaluacion.uuid || evaluacion.uuid_trazabilidad || '';

    const nombreComercio = evaluacion.nombre_comercial || evaluacion.nombre_comercio || 'Local Comercial';
    const rucTexto = evaluacion.ruc ? `identificado con RUC N° ${evaluacion.ruc}` : 'sin RUC consignado';
    const sectorTexto = evaluacion.sector_huancayo
        ? `ubicado en el sector territorial ${evaluacion.sector_huancayo}`
        : 'ubicado en el ámbito';

    const areaTexto = evaluacion.area_techada
        ? `${evaluacion.area_techada} m²`
        : (evaluacion.area_m2 ? `${evaluacion.area_m2} m²` : 'área técnica no declarada');

    const pisosTexto = `${evaluacion.numero_pisos ?? evaluacion.pisos ?? 1} piso(s)`;

    const aforoTexto = evaluacion.aforo_estimado
        ? `${evaluacion.aforo_estimado} personas`
        : (evaluacion.aforo ? `${evaluacion.aforo} personas` : 'aforo no declarado');

    const esImagenEvidencia = (archivo?: string | null) => !!archivo && /\.(png|jpe?g|webp)$/i.test(archivo);

    const renderEvidenciaAdjunta = (fila: FilaMatriz) => {
        if (!fila.evidencia_url) {
            return (
                <span className="mt-1 block text-[10px] text-slate-400">
                    Sin evidencia declarada
                </span>
            );
        }

        if (esImagenEvidencia(fila.evidencia_archivo)) {
            return (
                <a
                    href={fila.evidencia_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block"
                >
                    <img
                        src={fila.evidencia_url}
                        alt={`Evidencia declarada de ${fila.codigo_item}`}
                        className="max-h-20 w-full rounded-md border border-slate-200 object-contain break-inside-avoid"
                    />
                </a>
            );
        }

        return (
            <a
                href={fila.evidencia_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-800 hover:underline break-inside-avoid"
            >
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate">Ver documento</span>
            </a>
        );
    };

    return (
        <>
            {/* Matriz de trazabilidad de subsanaciones */}
            <section>
                <div className="mb-2.5 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                        Matriz de Trazabilidad de Subsanaciones y Adecuaciones
                    </h2>
                </div>

                <div
                    role="note"
                    aria-label="Naturaleza preventiva de las evidencias declaradas"
                    className="mb-2.5 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] leading-relaxed text-sky-900"
                >
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    <p>
                        Evidencias <strong>declaradas por el ciudadano</strong>, no verificadas
                        oficialmente por la autoridad competente. Su trazabilidad es preventiva.
                    </p>
                </div>

                {!tieneSubsanaciones ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                        <span className="text-[11px] text-slate-500">
                            Sin adecuaciones ni subsanaciones declaradas registradas en esta autoevaluación.
                        </span>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {matrizSubsanaciones.map((fila) => (
                            <div
                                key={fila.codigo_item}
                                className="overflow-hidden rounded-2xl border border-slate-200"
                            >
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
                                    <span className="font-mono text-xs font-black text-rose-900">
                                        {fila.codigo_item}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {etiquetaEstado(fila.estado)} ·{' '}
                                        {fila.fecha_subsanacion ?? 'Sin fecha'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-[1fr_1.4fr_1fr]">
                                    <div>
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                            Deficiencia Inicial
                                        </span>
                                        <p className="mt-0.5 text-[11px] leading-snug font-semibold text-slate-800">
                                            {fila.deficiencia_inicial}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                            Acción Realizada
                                        </span>
                                        <p className="mt-0.5 text-[11px] leading-snug text-slate-700">
                                            {fila.accion_realizada}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                            Evidencia Adjunta
                                        </span>
                                        {renderEvidenciaAdjunta(fila)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Cuerpo legal concatenado y sanitizado */}
            <div className="space-y-3 text-justify text-xs leading-relaxed text-slate-700 sm:text-sm">
                <p>
                    El titular del establecimiento <strong>"{nombreComercio}"</strong>, {rucTexto},{' '}
                    {sectorTexto} de la provincia de Huancayo, con un área techada declarada de{' '}
                    <strong>{areaTexto}</strong>, distribuida en <strong>{pisosTexto}</strong> y aforo
                    estimado para <strong>{aforoTexto}</strong>, ha completado voluntariamente el ciclo
                    de autoevaluación preventiva: revisión de condiciones técnicas, simulación de revisión
                    in situ y plan de adecuaciones declaradas, con un GAP final de preparación del{' '}
                    <strong>{gapFinal}</strong>.
                </p>
                <p>
                    Las condiciones técnicas fueron revisadas por el propio titular usando como referencia
                    la <strong>R.J. N° 016-2018-CENEPRED</strong>, el <strong>D.S. N° 002-2018-PCM</strong>, el
                    Reglamento Nacional de Edificaciones (Normas <strong>A.010</strong> y{' '}
                    <strong>A.130</strong>) y el Código Nacional de Electricidad (<strong>CNE-U</strong>).
                    Por tratarse de una declaración personal, este informe{' '}
                    <strong>no garantiza ni anticipa</strong> el resultado de la inspección oficial, cuya
                    evaluación corresponde a la autoridad municipal competente.
                </p>
            </div>

            {/* Declaración del responsable */}
            <div className="flex flex-col items-center justify-center pt-6 text-center">
                <div className="w-72 border-t border-slate-400 pt-2">
                    <span className="block text-[10px] font-bold text-slate-800 uppercase">
                        Declaración del responsable del establecimiento
                    </span>
                    <span className="text-[9px] text-slate-500">
                        {nombreComercio} {evaluacion.ruc ? `· RUC ${evaluacion.ruc}` : ''}
                    </span>
                </div>
                <p className="mt-2 max-w-md text-[9px] leading-relaxed text-slate-500">
                    La presente declaración es de carácter personal y preventivo. No sustituye la inspección
                    técnica de seguridad en edificaciones (ITSE) realizada por el órgano ejecutante
                    competente ni convalida el cumplimiento normativo ante la municipalidad.
                </p>
            </div>

            {/* Trazabilidad Digital del Registro Preventivo */}
            <section className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                        Trazabilidad Digital del Registro Preventivo
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex items-start gap-2">
                        <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <div>
                            <span className="block text-[9px] font-bold tracking-wider text-slate-700 uppercase">
                                UUID de Trazabilidad
                            </span>
                            <span className="font-mono break-all text-slate-900 select-all">
                                {uuid}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <div>
                            <span className="block text-[9px] font-bold tracking-wider text-slate-700 uppercase">
                                Fecha de Generación
                            </span>
                            <span className="font-mono text-slate-900">{fechaEmision}</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                        <FileCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <div>
                            <span className="block text-[9px] font-bold tracking-wider text-emerald-600 uppercase">
                                Estado del Registro
                            </span>
                            <span className="text-xs font-black text-emerald-600">
                                Autoevaluación registrada según las respuestas declaradas
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-3 space-y-2">
                    {hashIntegridad && (
                        <div className="rounded-xl bg-slate-900 p-3 font-mono text-slate-300">
                            <div className="mb-1 flex items-center gap-1.5">
                                <Hash className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-[10px] tracking-wider text-slate-400 uppercase">
                                    Hash SHA-256 del Registro
                                </span>
                            </div>
                            <p className="text-[10px] leading-relaxed break-all select-all">{hashIntegridad}</p>
                        </div>
                    )}
                    {hashFinal && (
                        <div className="rounded-xl bg-slate-900 p-3 font-mono text-slate-300">
                            <div className="mb-1 flex items-center gap-1.5">
                                <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-[10px] tracking-wider text-slate-400 uppercase">
                                    Huella Criptográfica del Payload Consolidado
                                </span>
                            </div>
                            <p className="text-[10px] leading-relaxed break-all select-all">{hashFinal}</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Pie de la hoja */}
            <div className="flex items-start gap-2 border-t border-slate-200 pt-3 text-center">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                <p className="text-[9px] text-slate-500 leading-relaxed">
                    Informe preventivo y orientativo generado por la plataforma ciudadana CheckITSE Huancayo. El hash SHA-256 permite comprobar la integridad e inmutabilidad del contenido digital registrado, pero no acredita por sí solo la veracidad de las declaraciones ni la autenticidad física de las condiciones evaluadas. Este documento no constituye una inspección oficial ni reemplaza la evaluación de la autoridad competente.
                </p>
            </div>
        </>
    );
}
