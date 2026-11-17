export type CategoriaChecklist = 'INCENDIOS' | 'ELECTRICIDAD' | 'EVACUACION' | 'ESTRUCTURAL_AUXILIOS';

export type EstadoChecklist = 'CUMPLE' | 'NO_CUMPLE' | 'POR_REVISAR' | 'NA';

export interface ChecklistItem {
  codigo: string;
  nombre: string;
  categoria: CategoriaChecklist;
  estado: EstadoChecklist;
  cumple: boolean;
  es_critico: boolean;
  norma: string;
  que_observar: string;
  por_que: string;
  riesgo_real: string;
  solucion: string;
}

export interface RecursoCatalogo {
  codigo: string;
  video_url: string | null;
  tipo?: string | null;
  base_legal?: string | null;
  evidencia_sugerida?: string | null;
  descripcion?: string | null;
}

export const CATEGORIA_LABELS: Record<CategoriaChecklist, string> = {
  INCENDIOS: 'Protección Contra Incendios',
  ELECTRICIDAD: 'Instalaciones Eléctricas',
  EVACUACION: 'Evacuación y Señalización',
  ESTRUCTURAL_AUXILIOS: 'Estructuras no Portantes y Auxilios',
};

export const CHECKLIST_CATALOGO_OFICIAL: ChecklistItem[] = [
  // --- 1. SEGURIDAD CONTRA INCENDIOS (RNE A.130 / NTP) ---
  {
    codigo: 'EXTINTOR_PQS',
    nombre: 'Extintor PQS con carga vigente, tarjeta de mantenimiento y manómetro operativo',
    categoria: 'INCENDIOS',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'NTP 350.043-1 / RNE A.130 Art. 163',
    que_observar: 'Mira si el manómetro apunta a la zona verde, el precinto no está roto y la tarjeta de mantenimiento está vigente.',
    por_que: 'El polvo químico seco sofoca fuegos clase ABC en fase inicial evitando la propagación súbita.',
    riesgo_real: 'Si el extintor está despresurizado o vencido, el fuego no se puede contener y deviene en siniestro total.',
    solucion: 'Contratar empresa autorizada para recarga anual y mantener tarjeta de inspección mensual visible.'
  },
  {
    codigo: 'EXTINTOR_K',
    nombre: 'Extintor de Acetato de Potasio (Tipo K) en cocinas comerciales o freidoras',
    categoria: 'INCENDIOS',
    estado: 'NA',
    cumple: true,
    es_critico: true,
    norma: 'NTP 350.043-1 Art. 7.2',
    que_observar: 'Revisa la cocina comercial: necesita un extintor distinto al PQS, señalado para aceites y grasas (fuego clase K).',
    por_que: 'El agua o PQS común provocan explosión violenta de salpicadura al contacto con aceite caliente.',
    riesgo_real: 'Quemaduras de tercer grado al personal y propagación instantánea del fuego hacia conductos de ventilación.',
    solucion: 'Instalar extintor con agente químico húmedo de acetato de potasio si se preparan frituras o se usa cocina comercial.'
  },
  {
    codigo: 'DETECTORES_HUMO',
    nombre: 'Detectores de humo fotoeléctricos autónomos o centralizados operativos',
    categoria: 'INCENDIOS',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'RNE Norma A.130 Art. 53 / NFPA 72',
    que_observar: 'Observa si hay sensores en el techo de los ambientes cerrados y si su piloto o señal indica que están operativos.',
    por_que: 'Alerta temprana acústica que permite evacuar antes de que el monóxido de carbono asfixie a los ocupantes.',
    riesgo_real: 'Inhalación letal de gases tóxicos antes de detectar llamas visibles.',
    solucion: 'Instalar sensores de humo fotoeléctricos con batería de respaldo en techos de ambientes cerrados.'
  },
  {
    codigo: 'CAMPANA_EXTRACCION',
    nombre: 'Campana extractora con filtros metálicos limpios y ducto incombustible',
    categoria: 'INCENDIOS',
    estado: 'NA',
    cumple: true,
    es_critico: false,
    norma: 'RNE Norma EM.030 / CENEPRED Anexo 4',
    que_observar: 'Retira una rejilla de la campana y verifica que los filtros metálicos no estén cubiertos de grasa endurecida.',
    por_que: 'La grasa acumulada en ductos es combustible líquido altamente inflamable a altas temperaturas.',
    riesgo_real: 'Incendio de ducto que se propaga por el falso cielo raso a todo el inmueble.',
    solucion: 'Mantenimiento y desengrase periódico de ductos y trampas de grasa metálicas.'
  },

  // --- 2. SEGURIDAD ELÉCTRICA (CNE-U / R.M. 175-2008-MEM) ---
  {
    codigo: 'DIFERENCIAL',
    nombre: 'Interruptores diferenciales de 30mA en circuitos eléctricos',
    categoria: 'ELECTRICIDAD',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'CNE-U Regla 150-400 / R.M. 175-2008-MEM',
    que_observar: 'Mira si el tablero tiene una llave con botón de prueba (T). Puedes presionarlo: debe cortar la luz y volver al restablecerla.',
    por_que: 'Corta la corriente en milisegundos al detectar fugas que pueden electrocutar a una persona.',
    riesgo_real: 'Muerte por fibrilación ventricular al tocar un equipo energizado o chispa constante que origina incendios.',
    solucion: 'Instalar una llave diferencial de 30mA (2x25A o 2x40A) por cada circuito o barra de distribución.'
  },
  {
    codigo: 'TERMOMAGNETICO',
    nombre: 'Interruptores termomagnéticos calibrados a la sección del cable (sin puentes)',
    categoria: 'ELECTRICIDAD',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'CNE-U Regla 150-400',
    que_observar: 'No tapes el tablero. Si una llave se calienta o se dispara seguido, es señal para consultar con un electricista.',
    por_que: 'Protege los conductores eléctricos frente a sobrecargas y cortocircuitos térmicos.',
    riesgo_real: 'Calentamiento de cables empotrados que funde el aislamiento e inicia fuego estructural.',
    solucion: 'Sustituir llaves sobrecalibradas o defectuosas por termomagnéticas de marca homologada.'
  },
  {
    codigo: 'TABLERO_MANDIL',
    nombre: 'Tablero eléctrico con mandil protector (resina o metálico) y sin cables expuestos',
    categoria: 'ELECTRICIDAD',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'CNE-U Regla 020.132 / Regla 070.212',
    que_observar: 'Verifica que el tablero tenga tapa cerrada y sin huecos por donde asomen cables o bornes con energía.',
    por_que: 'Evita el contacto accidental directo con barras o bornes con tensión al manipular las llaves térmicas.',
    riesgo_real: 'Arco eléctrico y quemaduras severas en manos y rostro de los dependientes.',
    solucion: 'Colocar tapa mandil con bisagras y sellar espacios libres con tapas ciegas aislantes.'
  },
  {
    codigo: 'POZO_TIERRA',
    nombre: 'Sistema de puesta a tierra con protocolo vigente (menor o igual a 25 Ohmios)',
    categoria: 'ELECTRICIDAD',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'CNE-U Regla 060.712 / R.J. 016-2018 Anexo 4',
    que_observar: 'Revisa que cuentes con el protocolo de medición de puesta a tierra con valor ≤ 25 Ω y vigencia al día (máx. 1 año).',
    por_que: 'Drena corrientes estáticas y de falla hacia el suelo, protegiendo computadoras, vitrinas y vidas.',
    riesgo_real: 'Sobretensiones transitorias y riesgo de electrocución permanente en carcasas metálicas.',
    solucion: 'Mantenimiento anual con sales/gel y protocolo de medición firmado por ingeniero electricista colegiado habilitado.'
  },
  {
    codigo: 'CABLEADO_CANALIZADO',
    nombre: 'Cables eléctricos canalizados en tuberías o canaletas libres de empalmes expuestos',
    categoria: 'ELECTRICIDAD',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'CNE-U Regla 070.212',
    que_observar: 'Recorre las paredes y mira si hay cables sueltos, parchados o unidos con cinta, sin canaleta ni tubería protectora.',
    por_que: 'El aislamiento exterior protege al cable del desgaste mecánico, roedores y humedad ambiental.',
    riesgo_real: 'Cortocircuito accidental al rozar estanterías metálicas o mercadería con cables mellizos sueltos.',
    solucion: 'Canalizar todo cableado expuesto en canaletas de PVC adosadas a la pared o tubería conduit.'
  },

  // --- 3. EVACUACIÓN Y ARQUITECTURA (RNE A.010 / A.130) ---
  {
    codigo: 'EVACUACION',
    nombre: 'Rutas y salidas de escape 100% despejadas (ancho útil mín. 0.90m - 1.20m)',
    categoria: 'EVACUACION',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'RNE Norma A.010 Art. 25 y A.130 Art. 13',
    que_observar: 'Camina desde el mostrador hasta la salida y comprueba que el pasillo quede despejado, con al menos ~1 metro de ancho.',
    por_que: 'En un sismo o pánico, los pasillos estrechos o con cajas provocan tropiezos y avalanchas humanas.',
    riesgo_real: 'Asfixia y aplastamiento por imposibilidad de desalojo del local en menos de 180 segundos.',
    solucion: 'Retirar vitrinas, mercadería o exhibidores que reduzcan el pasaje a menos del ancho normativo.'
  },
  {
    codigo: 'PUERTAS_ESCAPE',
    nombre: 'Puertas de salida de fácil apertura sin cerrojos trabados en horario de atención',
    categoria: 'EVACUACION',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'RNE Norma A.010 Art. 26',
    que_observar: 'Prueba abrir la puerta de salida en horario de atención; no debe requerir llave ni candado para salir.',
    por_que: 'En caso de pánico, una cerradura compleja o candado impide la salida inmediata.',
    riesgo_real: 'Asfixia de personas atrapadas frente a una puerta cerrada con llave durante un siniestro.',
    solucion: 'Retirar cerrojos restrictivos y asegurar apertura hacia afuera si el aforo es mayor a 50 personas.'
  },
  {
    codigo: 'LUCES_EMERG',
    nombre: 'Luces de emergencia autónomas operativas en vías de salida (autonomía 90 min)',
    categoria: 'EVACUACION',
    estado: 'NO_CUMPLE',
    cumple: false,
    es_critico: false,
    norma: 'RNE Norma A.130 Art. 39 / NTP IEC 60598-2-22',
    que_observar: 'Presiona el botón de prueba de la lámpara de emergencia: debe encenderse sola aunque cortes la luz.',
    por_que: 'En corte de energía por sismo o incendio nocturno, el humo reduce la visibilidad al 5%.',
    riesgo_real: 'Desorientación y desespero de los clientes hacia zonas sin salida.',
    solucion: 'Instalar lámparas LED autónomas conectadas a la red general con prueba mensual de batería.'
  },
  {
    codigo: 'SENALETICA',
    nombre: 'Señales fotoluminiscentes de seguridad reglamentarias (Salida, Extintor, Sismo)',
    categoria: 'EVACUACION',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'NTP 399.010-1 (Colores y Símbolos de Seguridad)',
    que_observar: 'Mira si hay carteles de SALIDA, extintor y sismo visibles en el local, sin estar tapados por publicidad.',
    por_que: 'Brillan en la oscuridad total guiando intuitivamente la evacuación y el acceso a equipos de auxilio.',
    riesgo_real: 'Tiempo perdido valioso buscando un extintor oculto o la puerta de escape.',
    solucion: 'Pegar láminas vinílicas reflectivas reglamentarias a una altura de 1.80m a 2.10m.'
  },
  {
    codigo: 'AFORO_CARTEL',
    nombre: 'Cartel de aforo máximo permitido visible en el acceso principal',
    categoria: 'EVACUACION',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'RNE Norma A.010 Art. 20',
    que_observar: 'Busca en la entrada el cartel de aforo y verifica que indique la cantidad máxima de personas permitida.',
    por_que: 'Comunica la capacidad límite de personas para evitar colapso de las vías de evacuación.',
    riesgo_real: 'Sobrecarga de ocupantes que impide la salida rápida ante emergencias sísmicas.',
    solucion: 'Fijar cartel visible en el ingreso indicando aforo conforme a cálculo técnico por m².'
  },

  // --- 4. ESTRUCTURAL Y AUXILIOS (Arriola 2024 / INDECI) ---
  {
    codigo: 'BOTIQUIN',
    nombre: 'Botiquín de primeros auxilios abastecido y adosado en pared visible',
    categoria: 'ESTRUCTURAL_AUXILIOS',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'Directiva INDECI / CENEPRED',
    que_observar: 'Abre el botiquín y verifica que tenga alcohol, gasas, vendas y curitas; que no esté vacío ni con material vencido.',
    por_que: 'Permite estabilizar cortes, contusiones menores o quemaduras previas a la llegada de paramédicos.',
    riesgo_real: 'Infección acelerada de heridas o hemorragias sin contención inmediata.',
    solucion: 'Botiquín tipo gabinete con alcohol, gasas estériles, vendas, esparadrapo y tijeras.'
  },
  {
    codigo: 'ANCLAJE_ESTANTERIAS',
    nombre: 'Anclaje sismorresistente a muro/piso de estanterías y anaqueles mayores a 1.80 m',
    categoria: 'ESTRUCTURAL_AUXILIOS',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'RNE E.030 Sismorresistente / Arriola (2024)',
    que_observar: 'Apoya la mano en la estantería más alta y sacúdela suavemente: no debe tambalear ni despegarse de la pared.',
    por_que: 'En el valle del Mantaro la amplificación de ondas sísmicas en suelos blandos vuelca muebles altos.',
    riesgo_real: 'Aplastamiento de clientes y personal por caída frontal de anaqueles pesados con mercadería.',
    solucion: 'Fijar con pernos expansivos o ángulos metálicos los parantes de estanterías hacia muros portantes.'
  },
  {
    codigo: 'LAMINADO_VIDRIOS',
    nombre: 'Vidrios crudos protegidos con láminas de seguridad de 4 micras o templados',
    categoria: 'ESTRUCTURAL_AUXILIOS',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'RNE Norma E.040 Vidrio',
    que_observar: 'Revisa los vidrios grandes cerca de la circulación y mira si tienen película de seguridad o marcas de vidrio templado.',
    por_que: 'La lámina retiene los fragmentos afilados evitando que salgan despedidos durante un terremoto.',
    riesgo_real: 'Heridas cortantes graves o amputaciones producidas por vidrios de mamparas rotas.',
    solucion: 'Instalar lámina transparente de seguridad en toda luna cruda contigua a circulación peatonal.'
  },
];