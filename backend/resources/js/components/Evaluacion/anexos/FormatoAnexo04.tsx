import type { FormatoAnexoProps } from './types';

export function FormatoAnexo04({
  autoevaluacion,
  titular,
  condiciones = [],
  conteo,
  codigoDocumento,
  fechaEmision,
}: Readonly<FormatoAnexoProps>) {
  const nombreComercio = autoevaluacion?.nombre_comercio || titular?.nombre_comercial || 'Establecimiento Comercial';
  const razonSocial = titular?.razon_social || autoevaluacion?.nombre_comercio || 'Administrado Titular';
  const rucDni = autoevaluacion?.ruc || titular?.ruc || 'No consignado';
  const direccion = autoevaluacion?.direccion || titular?.direccion || 'Huancayo, Junín';
  const giro = autoevaluacion?.funcion_economica || titular?.giro || 'Comercio';
  const area = autoevaluacion?.area_m2 ? `${autoevaluacion.area_m2} m²` : 'Hasta 100 m²';
  const totalCumplen = conteo?.cumple ?? condiciones.filter((c) => c.cumple || c.estado === 'CUMPLE').length;
  const totalCondiciones = conteo?.total ?? condiciones.length;

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
            <p className="text-[10px] text-slate-500 print:text-black">Subgerencia de Gestión del Riesgo de Desastres e ITSE · Modelo Normativo</p>
          </div>
          <div className="text-right">
            <span className="rounded border border-slate-400 px-2 py-0.5 font-mono text-[10px] font-bold">
              {codigoDocumento || 'ANEXO-04'}
            </span>
            <p className="mt-1 text-[9.5px]">Fecha: {fechaEmision || 'Emisión Digital'}</p>
          </div>
        </div>

        <div className="mt-3 rounded bg-slate-100 py-1.5 text-center print:bg-slate-200">
          <h1 className="text-xs font-black uppercase tracking-wider text-slate-900 print:text-black sm:text-sm">
            ANEXO 4 — DECLARACIÓN JURADA DE CUMPLIMIENTO DE LAS CONDICIONES DE SEGURIDAD EN LA EDIFICACIÓN
          </h1>
          <p className="text-[9.5px] font-medium text-slate-600 print:text-black">
            Reglamento de Inspecciones Técnicas de Seguridad en Edificaciones — D.S. N° 002-2018-PCM
          </p>
        </div>
      </header>

      <div className="mt-4 space-y-4 text-[11px] leading-relaxed">
        {/* I. Datos del Administrado y Establecimiento */}
        <section className="rounded border border-slate-300 p-2.5">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-800 print:text-black">
            I. Datos Generales del Administrado y Establecimiento
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <span className="text-slate-500 print:text-black">Nombre / Razón Social: </span>
              <strong>{razonSocial}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">N° RUC / DNI: </span>
              <strong className="font-mono">{rucDni}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Nombre Comercial: </span>
              <strong>{nombreComercio}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Giro / Actividad: </span>
              <strong>{giro}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500 print:text-black">Dirección del Establecimiento: </span>
              <strong>{direccion}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Área Techada / Ocupada: </span>
              <strong>{area}</strong>
            </div>
            <div>
              <span className="text-slate-500 print:text-black">Balance de Cumplimiento: </span>
              <strong>{totalCumplen} de {totalCondiciones} condiciones conformes</strong>
            </div>
          </div>
        </section>

        {/* II. Declaración Jurada de Cumplimiento Técnico */}
        <section className="rounded border border-slate-300 p-2.5">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-800 print:text-black">
            II. Declaración Jurada de Condiciones Técnicas de Seguridad
          </h2>
          <p className="mt-1 text-[10px] text-slate-600 print:text-black">
            Declaro bajo juramento que el establecimiento objeto de inspección cumple estrictamente con las condiciones de seguridad en las cuatro especialidades normativas:
          </p>

          <div className="mt-2 space-y-2 text-[10px]">
            <div className="rounded border border-slate-200 p-2">
              <strong className="text-slate-800 print:text-black">1. Seguridad Estructural y Acabados: </strong>
              <span>Estructuras de concreto, mampostería o metal en buen estado sin fisuras graves. Falsos cielos rasos y vidrios asegurados con láminas de seguridad contra impacto.</span>
            </div>
            <div className="rounded border border-slate-200 p-2">
              <strong className="text-slate-800 print:text-black">2. Arquitectura y Evacuación: </strong>
              <span>Puertas de salida de ancho reglamentario con apertura libre en sentido de evacuación. Vías de tránsito señalizadas con pictogramas fotoluminiscentes y aforo respetado.</span>
            </div>
            <div className="rounded border border-slate-200 p-2">
              <strong className="text-slate-800 print:text-black">3. Instalaciones Eléctricas: </strong>
              <span>Tablero eléctrico con interruptores termomagnéticos debidamente rotulados y protección diferencial de 30 mA. Pozo a tierra operativo con resistencia reglamentaria ≤ 25 Ω y cableado canalizado.</span>
            </div>
            <div className="rounded border border-slate-200 p-2">
              <strong className="text-slate-800 print:text-black">4. Protección Contra Incendios: </strong>
              <span>Extintores portátiles presurizados (PQS o Acetato de Potasio) con tarjeta de inspección vigente y luces de emergencia autónomas con batería de 90 minutos de respaldo.</span>
            </div>
          </div>
        </section>

        {/* III. Declaración Legal y Responsabilidad */}
        <section className="rounded border border-slate-200 bg-slate-50 p-2.5 text-[9.5px] leading-snug print:bg-transparent print:border-slate-300">
          <p>
            <strong>Base Legal y Responsabilidad:</strong> La presente declaración jurada se formula en el marco del Decreto Supremo N° 002-2018-PCM y el Principio de Privilegio de Controles Posteriores previsto en el TUO de la Ley N° 27444. El administrado asume total responsabilidad civil, administrativa y penal en caso de incurrir en falsedad o alteración posterior de las condiciones declaradas.
          </p>
        </section>

        {/* IV. Firmas Formales */}
        <section className="mt-8 pt-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
            <div className="flex min-h-[130px] flex-col justify-between rounded border border-slate-400 p-3 text-center print:border-black">
              <div className="h-16 border-b border-dashed border-slate-300" />
              <div className="pt-1 text-[10px]">
                <strong className="block uppercase">{razonSocial}</strong>
                <span className="text-slate-500 print:text-black">DNI / RUC: {rucDni}</span>
                <span className="block font-medium text-slate-600 print:text-black">Firma del Administrado / Titular</span>
              </div>
            </div>

            <div className="flex min-h-[130px] flex-col justify-between rounded border border-slate-400 p-3 text-center print:border-black">
              <div className="h-16 border-b border-dashed border-slate-300" />
              <div className="pt-1 text-[10px]">
                <strong className="block">RESPONSABLE TÉCNICO / VERIFICADOR</strong>
                <span className="text-slate-500 print:text-black">Ingeniero / Arquitecto Colegiado (si corresponde)</span>
                <span className="block font-medium text-slate-600 print:text-black">Registro CIP / CAP: ___________________</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
