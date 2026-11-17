import type { FormatoAnexoProps } from './types';

export function FormatoAnexo02({
  autoevaluacion,
  titular,
  codigoDocumento,
  fechaEmision,
}: Readonly<FormatoAnexoProps>) {
  const nombreComercio = autoevaluacion?.nombre_comercio || titular?.nombre_comercial || 'Establecimiento Comercial';
  const razonSocial = titular?.razon_social || autoevaluacion?.nombre_comercio || 'Administrado Titular';
  const rucDni = autoevaluacion?.ruc || titular?.ruc || 'No consignado';
  const direccion = autoevaluacion?.direccion || titular?.direccion || 'Huancayo, Junín';
  const giro = autoevaluacion?.funcion_economica || titular?.giro || 'Comercio General';

  const condicionesPrevias = [
    {
      item: '1',
      descripcion: 'La edificación o establecimiento se encuentra totalmente culminado, con acabados instalados, mobiliario y equipamiento propio para el giro o actividad comercial solicitada.',
      cumple: true,
    },
    {
      item: '2',
      descripcion: 'El establecimiento cuenta con suministro formal de energía eléctrica y agua potable, sin conexiones clandestinas ni cables mellizos expuestos.',
      cumple: true,
    },
    {
      item: '3',
      descripcion: 'No se realizan actividades distintas a las solicitadas ni se comparten áreas con giros incompatibles de alto riesgo no declarados.',
      cumple: true,
    },
    {
      item: '4',
      descripcion: 'Las vías de evacuación (pasajes, escaleras, accesos y salidas) se encuentran expeditas, libres de mercadería, rejas u obstáculos.',
      cumple: true,
    },
    {
      item: '5',
      descripcion: 'El establecimiento no invade la vía pública ni áreas de retiro municipal no autorizadas con estructuras fijas o publicidad antirreglamentaria.',
      cumple: true,
    },
  ];

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
              {codigoDocumento ? `${codigoDocumento}-ANX2` : 'ANEXO-02'}
            </span>
            <p className="mt-1 text-[9.5px]">Fecha: {fechaEmision || 'Emisión Digital'}</p>
          </div>
        </div>

        <div className="mt-3 rounded bg-slate-100 py-1.5 text-center print:bg-slate-200">
          <h1 className="text-xs font-black uppercase tracking-wider text-slate-900 print:text-black sm:text-sm">
            ANEXO 2 — INFORMACIÓN DEL SOLICITANTE Y DECLARACIÓN DE CONDICIONES PREVIAS
          </h1>
          <p className="text-[9.5px] font-medium text-slate-600 print:text-black">
            Requisito previo obligatorio conforme al Art. 14 del D.S. N° 002-2018-PCM
          </p>
        </div>
      </header>

      <div className="mt-4 space-y-4 text-[11px] leading-relaxed">
        {/* I. Datos de Identificación */}
        <section className="rounded border border-slate-300 p-2.5">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-800 print:text-black">
            I. Datos del Solicitante y Establecimiento
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <span className="text-slate-500 print:text-black">Nombre o Razón Social: </span>
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
              <span className="text-slate-500 print:text-black">Giro Declarado: </span>
              <strong>{giro}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500 print:text-black">Dirección del Establecimiento: </span>
              <strong>{direccion}</strong>
            </div>
          </div>
        </section>

        {/* II. Declaración de Condiciones Previas */}
        <section className="rounded border border-slate-300 p-2.5">
          <h2 className="border-b border-slate-200 pb-1 font-bold uppercase text-slate-800 print:text-black">
            II. Verificación Obligatoria de Condiciones Previas
          </h2>
          <p className="mt-1 text-[10px] text-slate-600 print:text-black">
            El administrado manifiesta bajo juramento que el establecimiento cumple con cada una de las siguientes condiciones indispensables para el inicio y desarrollo de la diligencia de inspección:
          </p>

          <table className="mt-2 w-full border-collapse border border-slate-300 text-[10.5px]">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800 print:bg-slate-200">
                <th className="border border-slate-300 px-2 py-1 text-center w-8">N°</th>
                <th className="border border-slate-300 px-2 py-1 text-left">Condición Previa Exigida por Normativa</th>
                <th className="border border-slate-300 px-2 py-1 text-center w-14">SÍ</th>
                <th className="border border-slate-300 px-2 py-1 text-center w-14">NO</th>
              </tr>
            </thead>
            <tbody>
              {condicionesPrevias.map((cond) => (
                <tr key={cond.item}>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">{cond.item}</td>
                  <td className="border border-slate-300 px-2 py-1.5">{cond.descripcion}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                    {cond.cumple ? 'X' : ''}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                    {!cond.cumple ? 'X' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* III. Declaración y Firma */}
        <section className="mt-6 pt-2">
          <div className="rounded border border-slate-200 bg-slate-50 p-2.5 text-[9.5px] leading-snug print:bg-transparent print:border-slate-300">
            <strong>Declaración Jurada:</strong> Manifiesto con carácter de declaración jurada que la información y condiciones previas señaladas son verdaderas y se mantienen operativas. En caso de falsedad, me someto a las sanciones estipuladas en el TUO de la Ley N° 27444 y el Código Penal.
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
            <div className="flex min-h-[120px] flex-col justify-between rounded border border-slate-400 p-3 text-center print:border-black">
              <div className="h-14 border-b border-dashed border-slate-300" />
              <div className="pt-1 text-[10px]">
                <strong className="block uppercase">{razonSocial}</strong>
                <span className="text-slate-500 print:text-black">DNI / RUC: {rucDni}</span>
                <span className="block font-medium text-slate-600 print:text-black">Firma del Administrado / Solicitante</span>
              </div>
            </div>

            <div className="flex min-h-[120px] flex-col justify-between rounded border border-slate-400 p-3 text-center print:border-black">
              <div className="h-14 border-b border-dashed border-slate-300" />
              <div className="pt-1 text-[10px]">
                <strong className="block">ESPACIO RESERVADO PARA RECEPCIÓN MUNICIPAL</strong>
                <span className="text-slate-500 print:text-black">Municipalidad Provincial de Huancayo</span>
                <span className="block font-medium text-slate-600 print:text-black">Para uso en trámite presencial / mesa de partes</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
