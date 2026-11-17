import type { FormatoAnexoProps } from './types';

export function FormatoAnexo01({
  autoevaluacion,
  titular,
  riesgoTramite,
  clasificacion,
  codigoDocumento,
  fechaEmision,
}: Readonly<FormatoAnexoProps>) {
  const nombreComercio = autoevaluacion?.nombre_comercio || titular?.nombre_comercial || 'Establecimiento sin denominación';
  const razonSocial = titular?.razon_social || autoevaluacion?.nombre_comercio || 'Persona Natural / Jurídica';
  const rucDni = autoevaluacion?.ruc || titular?.ruc || 'No consignado';
  const direccion = autoevaluacion?.direccion || titular?.direccion || 'Huancayo, Junín';
  const giro = autoevaluacion?.funcion_economica || titular?.giro || 'Comercio / Servicios';
  const area = autoevaluacion?.area_m2 ? `${autoevaluacion.area_m2} m²` : 'Menor a 100 m²';
  const pisos = autoevaluacion?.pisos ? `${autoevaluacion.pisos} piso(s)` : '1 piso';
  const aforo = autoevaluacion?.aforo ? `${autoevaluacion.aforo} personas` : 'Menor a 20 personas';
  const esExAnte = Boolean(riesgoTramite?.es_ex_ante ?? clasificacion?.es_previa);
  const nivelRiesgo = riesgoTramite?.nivel_riesgo ?? clasificacion?.nivel ?? (esExAnte ? 'ALTO' : 'MEDIO');

  return (
    <article className="mx-auto w-full max-w-[210mm] border border-slate-300 bg-white p-8 text-slate-900 shadow-md print:max-w-none print:border-none print:p-0 print:shadow-none print:text-black">
      {/* Banner de Borrador Orientativo de Trabajo */}
      <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-center text-[10px] text-amber-900 print:border-black print:bg-slate-100 print:text-black">
        <strong className="block uppercase tracking-wider">Plantilla Orientativa de Trabajo — Borrador No Oficial Generado por CheckITSE Huancayo</strong>
        <p className="mt-0.5 text-[9px] leading-relaxed">
          Documento referencial de autoevaluación preventiva prellenado con datos declarados por el ciudadano (D.S. N° 002-2018-PCM / CENEPRED).
          No constituye documento oficial, constancia de inspección, recepción por mesa de partes ni autorización emitida por la Municipalidad Provincial de Huancayo.
        </p>
      </div>

      {/* Encabezado Normativo de Referencia */}
      <header className="border-b-2 border-slate-800 pb-3 text-center">
        <div className="flex items-center justify-between text-left text-[11px] font-semibold text-slate-600 print:text-black">
          <div>
            <p className="font-black uppercase text-slate-900 print:text-black">MUNICIPALIDAD PROVINCIAL DE HUANCAYO</p>
            <p>Gerencia de Seguridad Ciudadana y Gestión del Riesgo</p>
            <p className="text-[10px] text-slate-500 print:text-black">Subgerencia de Gestión del Riesgo de Desastres (ITSE) · Modelo Normativo</p>
          </div>
          <div className="text-right">
            <span className="rounded border border-slate-400 px-2 py-0.5 font-mono text-[10px] font-bold">
              {codigoDocumento || 'ANEXO-01'}
            </span>
            <p className="mt-1 text-[9.5px]">Fecha: {fechaEmision || 'Emisión Digital'}</p>
          </div>
        </div>

        <div className="mt-3 rounded bg-slate-100 py-1.5 text-center print:bg-slate-200">
          <h1 className="text-xs font-black uppercase tracking-wider text-slate-900 print:text-black sm:text-sm">
            ANEXO 1 — SOLICITUD DE INSPECCIÓN TÉCNICA DE SEGURIDAD EN EDIFICACIONES (ITSE)
          </h1>
          <p className="text-[9.5px] font-medium text-slate-600 print:text-black">
            Decreto Supremo N° 002-2018-PCM / Manual de Ejecución ITSE (Resolución Jefatural N° 016-2018-CENEPRED/J)
          </p>
        </div>
      </header>

      <div className="mt-4 space-y-4 text-[11px] leading-relaxed">
        {/* I. Información del Órgano Ejecutante */}
        <section className="rounded border border-slate-300 p-2.5">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-800 print:text-black">
            I. Órgano Ejecutante de la ITSE
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <span className="text-slate-500 print:text-black">Gobierno Local: </span>
              <strong>Municipalidad Provincial de Huancayo</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Departamento / Provincia: </span>
              <strong>Junín / Huancayo</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Distrito: </span>
              <strong>Huancayo</strong>
            </div>
          </div>
        </section>

        {/* II. Datos del Solicitante / Administrado */}
        <section className="rounded border border-slate-300 p-2.5">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-800 print:text-black">
            II. Datos del Administrado / Solicitante
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <span className="text-slate-500 print:text-black">Nombres y Apellidos o Razón Social: </span>
              <strong className="block">{razonSocial}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">N° de RUC / DNI: </span>
              <strong className="block font-mono">{rucDni}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Domicilio Legal: </span>
              <span className="block">{direccion}</span>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Teléfono / Correo: </span>
              <span className="block">{titular?.telefono || 'No consignado'} / {titular?.correo || 'No consignado'}</span>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Condición del Solicitante: </span>
              <span className="block font-medium">Propietario / Conductor / Representante Legal</span>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Código de Identificación Cívica: </span>
              <span className="block font-mono font-bold text-slate-800 print:text-black">
                {autoevaluacion?.codigo_acceso || autoevaluacion?.uuid_trazabilidad?.slice(0, 8)}
              </span>
            </div>
          </div>
        </section>

        {/* III. Datos del Objeto de Inspección */}
        <section className="rounded border border-slate-300 p-2.5">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-800 print:text-black">
            III. Datos del Objeto de Inspección (Establecimiento)
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <span className="text-slate-500 print:text-black">Nombre Comercial: </span>
              <strong className="block">{nombreComercio}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Giro / Actividad: </span>
              <strong className="block">{giro}</strong>
            </div>
            <div className="sm:col-span-3">
              <span className="text-slate-500 print:text-black">Dirección del Establecimiento: </span>
              <strong className="block">{direccion}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Área Techada / Ocupada: </span>
              <strong className="block">{area}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">N° de Pisos: </span>
              <strong className="block">{pisos}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Aforo Máximo: </span>
              <strong className="block">{aforo}</strong>
            </div>
          </div>
        </section>

        {/* IV. Tipo de Solicitud y Clasificación de Riesgo */}
        <section className="rounded border border-slate-300 p-2.5">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-800 print:text-black">
            IV. Modalidad de Trámite ITSE Solicitada
          </h2>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-3.5 w-3.5 rounded border border-slate-600 text-center text-[10px] font-bold leading-3 ${!esExAnte ? 'bg-slate-900 text-white print:bg-black' : ''}`}>
                {!esExAnte ? 'X' : ''}
              </span>
              <span><strong>ITSE Posterior al Otorgamiento de Licencia:</strong> Clasificado con Riesgo BAJO o MEDIO (Inspección ex-post).</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block h-3.5 w-3.5 rounded border border-slate-600 text-center text-[10px] font-bold leading-3 ${esExAnte ? 'bg-slate-900 text-white print:bg-black' : ''}`}>
                {esExAnte ? 'X' : ''}
              </span>
              <span><strong>ITSE Previa al Otorgamiento de Licencia:</strong> Clasificado con Riesgo ALTO o MUY ALTO (Inspección ex-ante).</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded border border-slate-600 text-center text-[10px] font-bold leading-3" />
              <span><strong>Renovación de Certificado de ITSE</strong> (vigencia de 2 años conforme al D.L. N° 1497).</span>
            </div>
          </div>
          <p className="mt-2 border-t border-slate-100 pt-1 text-[10px] text-slate-500 print:text-black">
            * Nivel de riesgo preliminar determinado según Matriz CENEPRED: <strong className="text-slate-800 print:text-black">{nivelRiesgo}</strong>
          </p>
        </section>

        {/* V. Declaración Jurada y Firmas */}
        <section className="mt-6 pt-2">
          <p className="text-[10px] text-slate-600 print:text-black italic">
            Declaro bajo juramento que los datos consignados en la presente solicitud corresponden a la verdad y que el establecimiento cumple con las condiciones de seguridad en edificaciones reglamentarias vigentes.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
            <div className="flex min-h-[120px] flex-col justify-between rounded border border-slate-400 p-3 text-center print:border-black">
              <div className="h-14 border-b border-dashed border-slate-300" />
              <div className="pt-1 text-[10px]">
                <strong className="block uppercase">{razonSocial}</strong>
                <span className="text-slate-500 print:text-black">DNI / RUC: {rucDni}</span>
                <span className="block font-medium text-slate-600 print:text-black">Firma del Administrado</span>
              </div>
            </div>

            <div className="flex min-h-[120px] flex-col justify-between rounded border-2 border-slate-700 p-3 text-left print:border-black">
              <div className="border-b border-slate-200 pb-1 text-center font-bold text-slate-800 print:text-black text-[10px] uppercase">
                Espacio Reservado — Mesa de Partes MPH (Trámite Oficial)
              </div>
              <div className="space-y-1 font-mono text-[9.5px] text-slate-600 print:text-black">
                <div>N° Exp: ___________________________</div>
                <div>Fecha: ____________________________</div>
                <div>Folios: _____ Hora: ________________</div>
              </div>
              <div className="text-[8px] text-slate-400 text-center italic">
                Para uso exclusivo de la Municipalidad Provincial de Huancayo en diligencia oficial
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
