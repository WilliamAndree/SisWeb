import type { FormatoAnexoProps } from './types';

export function FormatoAnexo03({
  autoevaluacion,
  titular,
  riesgoTramite,
  clasificacion,
  codigoDocumento,
  fechaEmision,
}: Readonly<FormatoAnexoProps>) {
  const nombreComercio = autoevaluacion?.nombre_comercio || titular?.nombre_comercial || 'Establecimiento Comercial';
  const rucDni = autoevaluacion?.ruc || titular?.ruc || 'No consignado';
  const direccion = autoevaluacion?.direccion || titular?.direccion || 'Huancayo, Junín';
  const giro = autoevaluacion?.funcion_economica || titular?.giro || 'Comercio';
  const area = autoevaluacion?.area_m2 ? `${autoevaluacion.area_m2} m²` : 'Hasta 100 m²';
  const pisos = autoevaluacion?.pisos ? `${autoevaluacion.pisos} piso(s)` : '1 piso';
  const aforo = autoevaluacion?.aforo ? `${autoevaluacion.aforo} personas` : 'Hasta 20 personas';

  const esExAnte = Boolean(riesgoTramite?.es_ex_ante ?? clasificacion?.es_previa);
  const nivelRiesgo = riesgoTramite?.nivel_riesgo ?? clasificacion?.nivel ?? (esExAnte ? 'ALTO' : 'MEDIO');
  const tipoTramite = riesgoTramite?.tipo_tramite ?? clasificacion?.tipo_tramite ?? (esExAnte ? 'ITSE PREVIA' : 'ITSE POSTERIOR');
  const usaGlp = autoevaluacion?.usa_glp ? 'SÍ' : 'NO';

  const esRiesgoBajo = nivelRiesgo === 'BAJO';
  const esRiesgoMedio = nivelRiesgo === 'MEDIO';
  const esRiesgoAlto = nivelRiesgo === 'ALTO';
  const esRiesgoMuyAlto = nivelRiesgo === 'MUY ALTO' || nivelRiesgo === 'MUY_ALTO';

  return (
    <article className="mx-auto w-full max-w-[210mm] border border-slate-300 bg-white p-8 text-slate-900 shadow-md print:max-w-none print:border-none print:p-0 print:shadow-none print:text-black">
      {/* Banner de Borrador Orientativo de Trabajo */}
      <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-center text-[10px] text-amber-900 print:border-black print:bg-slate-100 print:text-black">
        <strong className="block uppercase tracking-wider">Plantilla Orientativa de Trabajo — Borrador No Oficial Generado por CheckITSE Huancayo</strong>
        <p className="mt-0.5 text-[9px] leading-relaxed">
          Estimación referencial de riesgo para autoevaluación preventiva basada en la Matriz CENEPRED (D.S. N° 002-2018-PCM).
          No constituye calificación oficial, constancia de inspección ni resolución emitida por la Municipalidad Provincial de Huancayo.
        </p>
      </div>

      {/* Encabezado Normativo de Referencia */}
      <header className="border-b-2 border-slate-800 pb-3 text-center">
        <div className="flex items-center justify-between text-left text-[11px] font-semibold text-slate-600 print:text-black">
          <div>
            <p className="font-black uppercase text-slate-900 print:text-black">MUNICIPALIDAD PROVINCIAL DE HUANCAYO</p>
            <p>Gerencia de Seguridad Ciudadana y Gestión del Riesgo</p>
            <p className="text-[10px] text-slate-500 print:text-black">Subgerencia de Gestión del Riesgo de Desastres e ITSE · Modelo Normativo</p>
          </div>
          <div className="text-right">
            <span className="rounded border border-slate-400 px-2 py-0.5 font-mono text-[10px] font-bold">
              {codigoDocumento ? `${codigoDocumento}-ANX3` : 'ANEXO-03'}
            </span>
            <p className="mt-1 text-[9.5px]">Fecha: {fechaEmision || 'Emisión Digital'}</p>
          </div>
        </div>

        <div className="mt-3 rounded bg-slate-100 py-1.5 text-center print:bg-slate-200">
          <h1 className="text-xs font-black uppercase tracking-wider text-slate-900 print:text-black sm:text-sm">
            ANEXO 3 — REPORTE DE NIVEL DE RIESGO DEL ESTABLECIMIENTO OBJETO DE INSPECCIÓN
          </h1>
          <p className="text-[9.5px] font-medium text-slate-600 print:text-black">
            Matriz de Riesgo ITSE según D.S. N° 002-2018-PCM / Manual CENEPRED
          </p>
        </div>
      </header>

      <div className="mt-4 space-y-4 text-[11px] leading-relaxed">
        {/* I. Identificación del Establecimiento */}
        <section className="rounded border border-slate-300 p-2.5">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-800 print:text-black">
            I. Datos del Establecimiento Objeto de Inspección
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <span className="text-slate-500 print:text-black">Nombre Comercial: </span>
              <strong>{nombreComercio}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">N° de RUC: </span>
              <strong className="font-mono">{rucDni}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500 print:text-black">Dirección: </span>
              <strong>{direccion}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Función o Giro Principal: </span>
              <strong>{giro}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Aforo Máximo: </span>
              <strong>{aforo}</strong>
            </div>
          </div>
        </section>

        {/* II. Evaluación de Criterios de la Matriz de Riesgo */}
        <section className="rounded border border-slate-300 p-2.5">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-800 print:text-black">
            II. Criterios de Clasificación según Matriz de Riesgo CENEPRED
          </h2>

          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded border border-slate-200 p-2">
                <span className="text-slate-500 print:text-black block text-[10px]">Área Ocupada:</span>
                <strong className="text-xs">{area}</strong>
                <span className="block text-[9.5px] text-slate-500 print:text-black">
                  {autoevaluacion?.area_m2 && Number(autoevaluacion.area_m2) <= 100 ? '≤ 100 m² (Riesgo Bajo/Medio)' : 'Verificado en campo'}
                </span>
              </div>
              <div className="rounded border border-slate-200 p-2">
                <span className="text-slate-500 print:text-black block text-[10px]">Nivel o Pisos:</span>
                <strong className="text-xs">{pisos}</strong>
                <span className="block text-[9.5px] text-slate-500 print:text-black">
                  {autoevaluacion?.pisos && Number(autoevaluacion.pisos) <= 2 ? '1 a 2 pisos (Riesgo Bajo/Medio)' : 'Mayor altura'}
                </span>
              </div>
              <div className="rounded border border-slate-200 p-2">
                <span className="text-slate-500 print:text-black block text-[10px]">Almacenamiento GLP:</span>
                <strong className="text-xs">{usaGlp}</strong>
                <span className="block text-[9.5px] text-slate-500 print:text-black">
                  {autoevaluacion?.usa_glp ? 'Exige protocolo de seguridad' : 'Sin almacenamiento mayor'}
                </span>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-slate-600 print:text-black">
              * La matriz correlaciona la función de la edificación (RNE) con el área, altura, aforo y carga combustible para determinar si la inspección se ejecuta con carácter previo o posterior a la emisión de la licencia.
            </div>
          </div>
        </section>

        {/* III. Determinación Referencial del Nivel de Riesgo */}
        <section className="rounded border-2 border-slate-800 p-3 print:border-black">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-900 print:text-black">
            III. Estimación Referencial del Nivel de Riesgo (Matriz CENEPRED)
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-center">
            <div className={`rounded border p-2 ${esRiesgoBajo ? 'border-slate-800 bg-slate-900 text-white print:bg-black' : 'border-slate-300'}`}>
              <div className="text-[10px] uppercase font-bold">Riesgo Bajo</div>
              <div className="text-sm font-black mt-0.5">{esRiesgoBajo ? 'SELECCIONADO' : '—'}</div>
            </div>
            <div className={`rounded border p-2 ${esRiesgoMedio ? 'border-slate-800 bg-slate-900 text-white print:bg-black' : 'border-slate-300'}`}>
              <div className="text-[10px] uppercase font-bold">Riesgo Medio</div>
              <div className="text-sm font-black mt-0.5">{esRiesgoMedio ? 'SELECCIONADO' : '—'}</div>
            </div>
            <div className={`rounded border p-2 ${esRiesgoAlto ? 'border-slate-800 bg-slate-900 text-white print:bg-black' : 'border-slate-300'}`}>
              <div className="text-[10px] uppercase font-bold">Riesgo Alto</div>
              <div className="text-sm font-black mt-0.5">{esRiesgoAlto ? 'SELECCIONADO' : '—'}</div>
            </div>
            <div className={`rounded border p-2 ${esRiesgoMuyAlto ? 'border-slate-800 bg-slate-900 text-white print:bg-black' : 'border-slate-300'}`}>
              <div className="text-[10px] uppercase font-bold">Riesgo Muy Alto</div>
              <div className="text-sm font-black mt-0.5">{esRiesgoMuyAlto ? 'SELECCIONADO' : '—'}</div>
            </div>
          </div>

          <div className="mt-3 rounded bg-slate-50 p-2 text-[10.5px] print:bg-transparent">
            <div>
              <span className="text-slate-500 print:text-black">Nivel de Riesgo Concluyente: </span>
              <strong>{nivelRiesgo}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Procedimiento Técnico Aplicable: </span>
              <strong>{tipoTramite} ({esExAnte ? 'Inspección Ex-Ante' : 'Inspección Ex-Post'})</strong>
            </div>
          </div>
        </section>

        {/* IV. Firmas de Conformidad */}
        <section className="mt-8 pt-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
            <div className="flex min-h-[120px] flex-col justify-between rounded border border-slate-400 p-3 text-center print:border-black">
              <div className="h-14 border-b border-dashed border-slate-300" />
              <div className="pt-1 text-[10px]">
                <strong className="block uppercase">{nombreComercio}</strong>
                <span className="text-slate-500 print:text-black">RUC: {rucDni}</span>
                <span className="block font-medium text-slate-600 print:text-black">Firma del Administrado</span>
              </div>
            </div>

            <div className="flex min-h-[120px] flex-col justify-between rounded border border-slate-400 p-3 text-center print:border-black">
              <div className="h-14 border-b border-dashed border-slate-300" />
              <div className="pt-1 text-[10px]">
                <strong className="block">ESPACIO RESERVADO PARA LA AUTORIDAD COMPETENTE</strong>
                <span className="text-slate-500 print:text-black">Municipalidad Provincial de Huancayo</span>
                <span className="block font-medium text-slate-600 print:text-black">Para uso exclusivo en trámite oficial posterior</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
