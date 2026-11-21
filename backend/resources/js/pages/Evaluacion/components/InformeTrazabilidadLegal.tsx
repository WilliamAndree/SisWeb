import { etiquetaEstado } from '@/data/estados';
import type { FilaMatriz } from '@/types/contrato';
import { AlertTriangle, FileText, Layers } from 'lucide-react';
import type { EvaluacionDatosFisicos } from './InformeDatosGenerales';

interface InformeTrazabilidadLegalProps {
    readonly evaluacion: EvaluacionDatosFisicos;
    /** Porcentaje que falta para estar 100 % listo, ya formateado ("18.2%"). */
    readonly gapFinal: string;
    readonly codigoRegistro?: string | null;
    readonly matrizSubsanaciones: FilaMatriz[];
}

/**
 * Cierre del informe: lo que el emprendedor corrigió, la declaración en lenguaje
 * simple y el código corto del registro. Sin UUID ni hashes: no le dicen nada a quien
 * lee el informe impreso.
 */
export function InformeTrazabilidadLegal({ evaluacion, gapFinal, codigoRegistro, matrizSubsanaciones }: Readonly<InformeTrazabilidadLegalProps>) {
    const tieneSubsanaciones = matrizSubsanaciones.length > 0;

    const nombreComercio = evaluacion.nombre_comercial || evaluacion.nombre_comercio || 'Local Comercial';
    const rucTexto = evaluacion.ruc ? `identificado con RUC N° ${evaluacion.ruc}` : 'sin RUC consignado';
    const ubicacion = evaluacion.direccion || evaluacion.sector_huancayo;
    const sectorTexto = ubicacion ? `ubicado en ${ubicacion}` : 'ubicado en el ámbito';

    const areaTexto = evaluacion.area_techada
        ? `${evaluacion.area_techada} m²`
        : evaluacion.area_m2
          ? `${evaluacion.area_m2} m²`
          : 'área técnica no declarada';

    const pisosTexto = `${evaluacion.numero_pisos ?? evaluacion.pisos ?? 1} piso(s)`;

    const aforoTexto = evaluacion.aforo_estimado
        ? `${evaluacion.aforo_estimado} personas`
        : evaluacion.aforo
          ? `${evaluacion.aforo} personas`
          : 'aforo no declarado';

    const esImagenEvidencia = (archivo?: string | null) => !!archivo && /\.(png|jpe?g|webp)$/i.test(archivo);

    const renderEvidenciaAdjunta = (fila: FilaMatriz) => {
        if (!fila.evidencia_url) {
            return <span className="mt-1 block text-[10px] text-slate-400">Sin foto</span>;
        }

        if (esImagenEvidencia(fila.evidencia_archivo)) {
            return (
                <a href={fila.evidencia_url} target="_blank" rel="noreferrer" className="mt-1 block">
                    <img
                        src={fila.evidencia_url}
                        alt={`Evidencia declarada de ${fila.codigo_item}`}
                        className="max-h-20 w-full break-inside-avoid rounded-md border border-slate-200 object-contain"
                    />
                </a>
            );
        }

        return (
            <a
                href={fila.evidencia_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex max-w-full break-inside-avoid items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-800 hover:underline"
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
                    <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">Lo que corregiste</h2>
                </div>

                <div
                    role="note"
                    aria-label="Naturaleza preventiva de las evidencias declaradas"
                    className="mb-2.5 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] leading-relaxed text-sky-900"
                >
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    <p>Son las mejoras y fotos que tú registraste. La municipalidad las comprobará en su inspección.</p>
                </div>

                {!tieneSubsanaciones ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                        <span className="text-[11px] text-slate-500">Todavía no registraste correcciones.</span>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {matrizSubsanaciones.map((fila) => (
                            <div key={fila.codigo_item} className="overflow-hidden rounded-2xl border border-slate-200">
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
                                    <span className="font-mono text-xs font-black text-rose-900">{fila.codigo_item}</span>
                                    <span className="text-[10px] text-slate-400">
                                        {etiquetaEstado(fila.estado)} · {fila.fecha_subsanacion ?? 'Sin fecha'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-[1fr_1.4fr_1fr]">
                                    <div>
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">Qué faltaba</span>
                                        <p className="mt-0.5 text-[11px] leading-snug font-semibold text-slate-800">{fila.deficiencia_inicial}</p>
                                    </div>
                                    <div>
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">Qué hiciste</span>
                                        <p className="mt-0.5 text-[11px] leading-snug text-slate-700">{fila.accion_realizada}</p>
                                    </div>
                                    <div>
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">Foto o documento</span>
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
                    El titular del establecimiento <strong>"{nombreComercio}"</strong>, {rucTexto}, {sectorTexto} de la provincia de Huancayo, con un
                    área techada declarada de <strong>{areaTexto}</strong>, distribuida en <strong>{pisosTexto}</strong> y aforo estimado para{' '}
                    <strong>{aforoTexto}</strong>, revisó voluntariamente las condiciones de seguridad de su local. Según lo que declaró, le falta un{' '}
                    <strong>{gapFinal}</strong> para estar completamente listo para la inspección.
                </p>
                <p>
                    Las condiciones técnicas fueron revisadas por el propio titular usando como referencia la{' '}
                    <strong>R.J. N° 016-2018-CENEPRED</strong>, el <strong>D.S. N° 002-2018-PCM</strong>, el Reglamento Nacional de Edificaciones
                    (Normas <strong>A.010</strong> y <strong>A.130</strong>) y el Código Nacional de Electricidad (<strong>CNE-U</strong>). Por
                    tratarse de una declaración personal, este informe <strong>no garantiza ni anticipa</strong> el resultado de la inspección
                    oficial, cuya evaluación corresponde a la autoridad municipal competente.
                </p>
            </div>

            {/* Declaración del responsable */}
            <div className="flex flex-col items-center justify-center pt-6 text-center">
                <div className="w-72 border-t border-slate-400 pt-2">
                    <span className="block text-[10px] font-bold text-slate-800 uppercase">Declaración del responsable del establecimiento</span>
                    <span className="text-[9px] text-slate-500">
                        {nombreComercio} {evaluacion.ruc ? `· RUC ${evaluacion.ruc}` : ''}
                    </span>
                </div>
                <p className="mt-2 max-w-md text-[9px] leading-relaxed text-slate-500">
                    La presente declaración es de carácter personal y preventivo. No sustituye la inspección técnica de seguridad en edificaciones
                    (ITSE) realizada por el órgano ejecutante competente ni convalida el cumplimiento normativo ante la municipalidad.
                </p>
            </div>

            {/* Pie de la hoja */}
            <div className="flex items-start gap-2 border-t border-slate-200 pt-3 text-center">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                <p className="text-[9px] leading-relaxed text-slate-500">
                    Informe preparado con CheckITSE Huancayo{codigoRegistro ? ` · Código de registro ${codigoRegistro}` : ''}. Es orientativo: no es
                    un certificado ITSE ni reemplaza la inspección de la municipalidad.
                </p>
            </div>
        </>
    );
}
