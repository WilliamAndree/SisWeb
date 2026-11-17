/**
 * Contrato único entre los controladores Laravel y las páginas Inertia.
 *
 * Antes de este archivo cada página declaraba sus propias interfaces locales y
 * varias declaraban nombres idénticos (`AutoevaluacionInfo` existía en
 * `Checklist.tsx` y en `Resumen.tsx`) con contenidos distintos. Eso hacía que un
 * cambio de contrato apareciera como un error de TypeScript en un archivo ajeno
 * al que realmente cambió.
 *
 * Reglas de este módulo:
 * - Un tipo por contrato de página, con el nombre que usa el `Inertia::render()`
 *   del backend correspondiente.
 * - La nulabilidad refleja la columna real. Las columnas nullable se tipan
 *   `| null` y no se asumen presentes: el informe legal se emite también sobre
 *   autoevaluaciones de invitados, que llegan con `ruc`, `sector_huancayo`,
 *   `area_m2`, `pisos` y `aforo` en `null`.
 * - Las credenciales de control de acceso (`session_token`, `token_seguridad`,
 *   `user_id`) no aparecen en ningún contrato. Están en `$hidden` del modelo y,
 *   en el informe, ni siquiera entran en `Autoevaluacion::paraInforme()`.
 */

/* -------------------------------------------------------------------------- */
/* Vocabulario compartido                                                      */
/* -------------------------------------------------------------------------- */

/** Semáforo de riesgo. `GRIS` cubre evaluaciones aún no clasificadas. */
export type SemaforoRiesgo = 'VERDE' | 'AMBAR' | 'ROJO' | 'GRIS';

/** Estados del ciclo de vida de la autoevaluación. */
export type EstadoAutoevaluacion = 'INICIADA' | 'REGISTRADA' | 'ANULADA';

/** Estado de una condición dentro del `detalle_checklist`. */
export type EstadoCondicion = 'CUMPLE' | 'NO_CUMPLE' | 'POR_REVISAR' | 'NA';

/**
 * Estados de una subsanación.
 *
 * `SUBSANADO_DECLARADO` es el valor que emite el backend
 * (`EvaluacionController::informe()` filtra por `estado === 'SUBSANADO_DECLARADO'`),
 * no `SUBSANADO`. La etiqueta humana vive en `EstadoBadge`.
 */
export type EstadoSubsanacion = 'PENDIENTE' | 'EN_PROCESO' | 'SUBSANADO_DECLARADO';

/**
 * Recurso educativo serializado por `EvaluacionController::formatearRecursoEducativo()`.
 *
 * Estructuralmente compatible con `RecursoEducativoData` de
 * `components/RecursoEducativoModal`, que es el componente que lo consume.
 */
export interface RecursoEducativoContrato {
    id: number;
    criterio_normativo_id?: number | null;
    titulo: string;
    descripcion_corta: string;
    tipo: 'VIDEO' | 'GUIA_DIGITAL' | 'ENLACE_EXTERNO';
    url: string;
    fuente_autor?: string | null;
    duracion_estimada?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Checklist (Checklist.tsx)                                                   */
/* -------------------------------------------------------------------------- */

export interface CriterioEvaluable {
    codigo: string;
    criterio_id: number;
    titulo: string;
    descripcion?: string | null;
    categoria?: string | null;
    pregunta_ciudadana: string;
    que_observar?: string | null;
    accion_mejora_orientativa?: string | null;
    tipo_criterio?: string | null;
    norma_base?: string | null;
    articulo_referencia?: string | null;
    orden?: number;
    aplicable: boolean;
    requiere_informacion: boolean;
    estado?: string | null;
    notas?: string | null;
    opciones_respuesta: string[];
    recursos_educativos?: RecursoEducativoContrato[];
}

export interface CriterioNoAplica {
    codigo: string;
    criterio_id: number;
    titulo: string;
    categoria?: string | null;
    tipo_criterio?: string | null;
    norma_base?: string | null;
    articulo_referencia?: string | null;
    orden?: number;
    aplicable: false;
    requiere_informacion: false;
    estado: string;
    motivo: string;
}

export interface CriterioInformacionPendiente {
    codigo: string;
    criterio_id: number;
    titulo: string;
    categoria?: string | null;
    tipo_criterio?: string | null;
    norma_base?: string | null;
    articulo_referencia?: string | null;
    orden?: number;
    aplicable: null;
    requiere_informacion: true;
    variable_faltante?: string | null;
    mensaje?: string | null;
    estado?: string | null;
    motivo?: string | null;
}

export interface ChecklistResumen {
    total_criterios_catalogo: number;
    total_activos: number;
    total_suspendidos: number;
    criterios_aplicables: number;
    criterios_no_aplican: number;
    criterios_requieren_informacion: number;
}

export interface ChecklistPayload {
    autoevaluacion_id: number;
    uuid: string;
    criterios: CriterioEvaluable[];
    no_aplican: CriterioNoAplica[];
    informacion_pendiente: CriterioInformacionPendiente[];
    resumen: ChecklistResumen;
}

/** Cabecera mínima que `Checklist` recibe del backend. */
export interface ChecklistAutoevaluacion {
    id: number;
    uuid: string;
    nombre_comercio: string;
    direccion?: string | null;
    estado?: EstadoAutoevaluacion;
    clasificacion_estado?: 'CONFORME' | 'OBSERVADO' | 'EN_PROCESO';
    registrada_at?: string | null;
    hash_integridad?: string | null;
    area_m2?: number | null;
    pisos?: number | null;
    aforo?: number | null;
    tiene_equipos_fritura?: boolean | null;
    tiene_escaleras?: boolean | null;
    tiene_estanterias_altas?: boolean | null;
    usa_glp?: boolean | null;
    usa_caldero?: boolean | null;
    usa_liquidos_inflamables?: boolean | null;
    caracteristicas_declaradas?: Record<string, unknown> | null;
}

/** Props de `Inertia::render('Evaluacion/Checklist')`. */
export interface ChecklistProps {
    autoevaluacion: ChecklistAutoevaluacion;
    checklist: ChecklistPayload;
}

/* -------------------------------------------------------------------------- */
/* Resumen (Resumen.tsx)                                                       */
/* -------------------------------------------------------------------------- */

export interface ResumenConteos {
    total_criterios_aplicables: number;
    total_cumple_declarado: number;
    total_pendiente_atender: number;
    total_por_revisar: number;
    total_no_aplica: number;
}

/* -------------------------------------------------------------------------- */
/* Asistencia técnica (DirectorioAliadosService)                              */
/* -------------------------------------------------------------------------- */

/** Rango de costo orientativo derivado del catálogo canónico de costos ITSE. */
export interface RangoCostoContrato {
    referencia_soles: number;
    minimo_soles: number;
    maximo_soles: number;
}

/**
 * Registro del directorio serializado por
 * `DirectorioAliadosService::registroPublico()`.
 */
export interface AliadoAsistenciaContrato {
    id: string;
    categoria: string;
    nombre_comercial: string;
    contacto_nombre: string;
    especialidad_texto: string;
    acreditacion?: string;
    entregable_oficial?: string;
    telefono: string;
    whatsapp: string;
    sede: string;
    cobertura: string;
    verificado: boolean;
    servicios: string[];
}

/**
 * Bloque de asistencia técnica embebido por
 * `EvaluacionController::construirAsistenciaTecnica()`.
 *
 * Estructuralmente compatible con `CriterioAsistencia` de
 * `components/Evaluacion/NubeAsistenciaModal`, que es el componente que lo consume.
 */
export interface AsistenciaTecnicaContrato {
    codigo: string;
    titulo: string;
    norma: string | null;
    guia_autoayuda: string[];
    rango_costo: RangoCostoContrato | null;
    aliados: AliadoAsistenciaContrato[];
}

/** Bloque de condiciones aplicables aún sin declarar. */
export interface CriterioPendienteResumen {
    codigo: string;
    titulo: string;
    pregunta_ciudadana?: string | null;
    que_observar: string;
    accion_mejora_orientativa: string;
    norma_base?: string | null;
    articulo_referencia?: string | null;
    recursos_educativos?: RecursoEducativoContrato[];
    asistencia_tecnica?: AsistenciaTecnicaContrato | null;
    notas?: string | null;
}

export interface CriterioPorRevisarResumen {
    codigo: string;
    titulo: string;
    que_observar: string;
    orientacion: string;
    norma_base?: string | null;
    articulo_referencia?: string | null;
    recursos_educativos?: RecursoEducativoContrato[];
    asistencia_tecnica?: AsistenciaTecnicaContrato | null;
    notas?: string | null;
}

export interface CriterioCumpleResumen {
    codigo: string;
    titulo: string;
    declaracion: string;
    norma_base?: string | null;
    articulo_referencia?: string | null;
    recursos_educativos?: RecursoEducativoContrato[];
    asistencia_tecnica?: AsistenciaTecnicaContrato | null;
    notas?: string | null;
}

export interface CriterioNoAplicaResumen {
    codigo: string;
    titulo: string;
    motivo: string;
    norma_base?: string | null;
    articulo_referencia?: string | null;
}

/** Una disciplina técnica ITSE y su conteo de condiciones evaluadas. */
export interface EspecialidadDesglose {
    nombre: string;
    /** Pendientes por atender más las marcadas por revisar. */
    alertas: number;
    cumplidas: number;
    /** Condiciones evaluadas de la disciplina: `alertas` + `cumplidas`. */
    total: number;
    estado: 'en_orden' | 'pendiente';
}

/**
 * Desglose complementario de las condiciones evaluadas por disciplina técnica.
 *
 * Es aditivo: no reemplaza ni altera `resumen`, `conteos_normativos` ni
 * `conteo_condiciones`. Solo las autoevaluaciones del flujo nuevo lo reciben, y
 * las condiciones `NO_APLICA` quedan excluidas por no ser condiciones evaluadas.
 */
export type DesgloseEspecialidades = Record<
    'electricas' | 'incendios' | 'arquitectura' | 'estructuras',
    EspecialidadDesglose
>;

/** Cabecera que `Resumen` recibe del backend. */
export interface ResumenAutoevaluacion {
    id?: number;
    uuid: string;
    nombre_comercio: string;
    funcion_economica?: string | null;
    ruc?: string | null;
    direccion?: string | null;
    codigo_acceso?: string | null;
    caracteristicas_declaradas?: Record<string, unknown> | null;
    estado?: EstadoAutoevaluacion;
    clasificacion_estado?: 'CONFORME' | 'OBSERVADO' | 'EN_PROCESO';
    registrada_at?: string | null;
    hash_integridad?: string | null;
}

/**
 * Modalidad de trámite que tendría la evaluación ante la ITSE, derivada en el
 * backend por `EvaluacionController::clasificarModalidadTramite()` a partir del
 * D.S. N° 002-2018-PCM y la R.J. N° 016-2018-CENEPRED/J.
 *
 * `EX_ANTE` equivale a ITSE Previa y `EX_POST` a ITSE Posterior. `fuente` distingue
 * el par persistido de la evaluación del recálculo hecho al vuelo, porque el
 * clasificador heredado ya no se ejecuta en el paso 1 y las evaluaciones nuevas
 * llegan con ambas columnas en NULL.
 */
export interface ClasificacionTramiteResumen {
    tipo_tramite: 'EX_ANTE' | 'EX_POST';
    nivel_riesgo: string;
    es_previa: boolean;
    motivos: string[];
    fuente: 'registro' | 'recalculado';
}

/** Props de `Inertia::render('Evaluacion/Resumen')`. */
export interface ResumenProps {
    autoevaluacion: ResumenAutoevaluacion;
    resumen: ResumenConteos;
    pendiente_atender?: CriterioPendienteResumen[];
    por_revisar?: CriterioPorRevisarResumen[];
    cumple_declarado?: CriterioCumpleResumen[];
    no_aplica?: CriterioNoAplicaResumen[];
    desglose_especialidades?: DesgloseEspecialidades | null;
    /** Ausente en evaluaciones legacy renderizadas con un payload anterior. */
    clasificacion_tramite?: ClasificacionTramiteResumen | null;
}

/**
 * Condición reportada por el 422 de `POST /autoevaluacion/{uuid}/finalizar`.
 *
 * `motivo` solo lo emite el backend para `informacion_pendiente`; en los criterios
 * aplicables sin declarar llega ausente.
 */
export interface FinalizarPendiente {
    codigo: string;
    titulo: string;
    motivo?: string;
}

/* -------------------------------------------------------------------------- */
/* Informe preventivo (InformePreventivo.tsx)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Cabecera pública de la autoevaluación tal como la arma
 * `Autoevaluacion::paraInforme()`.
 *
 * La lista blanca no puede filtrar columnas nuevas por descuido, a diferencia de
 * serializar el modelo completo. `detalle_checklist` conserva su forma original
 * con claves inhomogéneas: las filas del wizard de invitados solo traen `codigo`,
 * mientras que las del flujo normativo incluyen nombre, estado, cumple y es_critico.
 */
export interface InformeAutoevaluacion {
    uuid_trazabilidad: string;
    uuid?: string;
    nombre_comercio: string;
    funcion_economica: string;
    ruc: string | null;
    sector_huancayo: string | null;
    direccion: string | null;
    referencia: string | null;
    area_m2: number | null;
    pisos: number | null;
    aforo: number | null;
    tipo_tramite: string | null;
    nivel_riesgo: string | null;
    semaforo: SemaforoRiesgo;
    porcentaje_cumplimiento: number;
    evaluacion_origen_id: number | null;
    hash_integridad: string | null;
    detalle_checklist?: InformeDetalleItem[];
    area_techada?: string | null;
    aforo_estimado?: number | null;
    numero_pisos?: number | null;
    giro?: string | null;
    nombre_comercial?: string;
    condiciones_evaluadas?: CondicionEvaluada[];
}

/** Condición normativa individual hidratada por EvaluacionSyncService. */
export interface CondicionEvaluada {
    codigo: string;
    titulo: string;
    especialidad: string;
    norma_referencial: string;
    estado_actual: 'CUMPLE_DECLARADO' | 'PENDIENTE_ATENDER' | 'POR_REVISAR' | 'NO_APLICA' | string;
    notas?: string | null;
}

/** Props de autoevaluación consolidada canónicamente. */
export interface EvaluacionCompletaProps {
    area_techada: string | null;
    area_m2?: number | string | null;
    aforo_estimado: number | null;
    aforo?: number | null;
    numero_pisos: number;
    pisos?: number | null;
    giro?: string | null;
    funcion_economica?: string | null;
    nombre_comercial: string;
    nombre_comercio?: string;
    ruc?: string | null;
    direccion?: string | null;
    sector_huancayo?: string | null;
    distrito?: string | null;
    referencia?: string | null;
    tipo_tramite?: string | null;
    nivel_riesgo?: string | null;
    uuid?: string;
    uuid_trazabilidad?: string;
    hash_integridad?: string | null;
    estado?: string;
    total_aplicables?: number;
    cumplen?: number;
    observados?: number;
    por_subsanar?: number;
    por_revisar?: number;
    no_aplica?: number;
    porcentaje_cumplimiento?: number;
    estado_semaforo?: string;
    semaforo?: SemaforoRiesgo | string;
    condiciones_evaluadas?: CondicionEvaluada[];
}

/** Fila del `detalle_checklist`. Solo `codigo` está garantizado. */
export interface InformeDetalleItem {
    codigo: string;
    nombre?: string | null;
    categoria?: string | null;
    estado?: string | null;
    cumple?: boolean | null;
    es_critico?: boolean | null;
    norma?: string | null;
    titulo?: string | null;
    que_observar?: string | null;
    descripcion?: string | null;
}

/** Fila enriquecida que el backend arma en `informe()` a partir de `detalle_checklist`. */
export interface CondicionChecklist {
    codigo: string;
    nombre: string;
    categoria: string;
    estado: string;
    cumple: boolean;
    es_critico: boolean;
    norma: string;
}

/** Conteo absoluto por estado, calculado sobre `detalle_checklist`. */
export interface ConteoEstados {
    total: number;
    cumple: number;
    no_cumple: number;
    por_revisar: number;
    na: number;
}

/** Fila de la matriz de subsanaciones del informe. */
export interface FilaMatriz {
    codigo_item: string;
    nombre_condicion: string;
    deficiencia_inicial: string;
    accion_realizada: string;
    estado: EstadoSubsanacion;
    evidencia_url: string | null;
    evidencia_archivo: string | null;
    fecha_subsanacion: string | null;
}

/** Resumen cuantitativo del ciclo de subsanación. */
export interface InformeResumen {
    total_condiciones: number;
    conformes_iniciales: number;
    subsanadas_declaradas: number;
    en_proceso: number;
    pendientes: number;
    gap_final: number;
    porcentaje_subsanado: number;
}

/** Evaluación previa cuando el informe corresponde a una reevaluación. */
export interface InformeEvaluacionOrigen {
    uuid_trazabilidad: string;
    fecha: string | null;
    semaforo: SemaforoRiesgo;
    porcentaje_cumplimiento: number;
}

/** Props de `Inertia::render('Evaluacion/InformePreventivo')`. */
export interface InformePreventivoProps {
    autoevaluacion: InformeAutoevaluacion;
    evaluacion?: EvaluacionCompletaProps;
    condiciones_evaluadas?: CondicionEvaluada[];
    esReevaluacion: boolean;
    evaluacionOrigen: InformeEvaluacionOrigen | null;
    codigoInforme: string;
    fechaEmision: string;
    resumen: InformeResumen;
    detalleChecklist: CondicionChecklist[];
    conteoEstados: ConteoEstados;
    matrizSubsanaciones: FilaMatriz[];
    hashFinal: string;
    hashIntegridad: string | null;
}

/* -------------------------------------------------------------------------- */
/* Listado (MisAutoevaluaciones.tsx)                                           */
/* -------------------------------------------------------------------------- */

export interface ConteosNormativos {
    total_criterios_aplicables: number;
    cumple_declarado: number;
    pendiente_atender: number;
    por_revisar: number;
    no_aplica: number;
}

export interface ResumenSubsanaciones {
    total: number;
    subsanadas: number;
    en_proceso: number;
    pendientes: number;
}

export interface ConteoCondiciones {
    total: number;
    cumple: number;
    no_cumple: number;
    por_revisar: number;
    na: number;
}

export interface AutoevaluacionItem {
    id: number;
    uuid_trazabilidad: string;
    codigo_acceso?: string | null;
    evaluacion_origen_id?: number | null;
    evaluacion_origen_uuid?: string | null;
    nombre_comercio: string;
    funcion_economica: string;
    ruc?: string | null;
    direccion?: string | null;
    sector_huancayo?: string | null;
    usa_glp?: boolean | null;
    galones_glp?: number | null;
    area_m2?: number | null;
    pisos?: number | null;
    aforo?: number | null;
    estado?: EstadoAutoevaluacion;
    clasificacion_estado?: 'CONFORME' | 'OBSERVADO' | 'EN_PROCESO';
    registrada_at?: string | null;
    tipo_tramite?: string | null;
    nivel_riesgo?: string | null;
    es_flujo_nuevo?: boolean;
    conteos_normativos?: ConteosNormativos | null;
    desglose_especialidades?: DesgloseEspecialidades | null;
    /**
     * Modalidad de trámite (ITSE Previa vs. Posterior) que tendría esta
     * evaluación. Reutiliza el mismo contrato que expone `Resumen`, porque ambas
     * props se originan en `EvaluacionController::clasificarModalidadTramite()`.
     *
     * Opcional a propósito: solo las autoevaluaciones con la prop disponible
     * deben mostrar la modalidad; ante su ausencia la vista declara «Sin
     * clasificar» en lugar de asumir una clasificación.
     */
    clasificacion_tramite?: ClasificacionTramiteResumen | null;
    semaforo: SemaforoRiesgo;
    porcentaje_cumplimiento: number;
    fecha: string;
    fecha_corta?: string;
    created_at?: string;
    hash_integridad?: string | null;
    conteo_condiciones?: ConteoCondiciones;
    resumen_subsanaciones: ResumenSubsanaciones;
}

/** Props de `Inertia::render('Evaluacion/MisAutoevaluaciones')`. */
export interface MisAutoevaluacionesProps {
    autoevaluaciones: AutoevaluacionItem[];
}

/** Proceso preventivo que agrupa una evaluación original y sus reevaluaciones. */
export interface ProcesoPreventivo {
    id: number;
    nombre_comercio: string;
    funcion_economica: string;
    ruc?: string | null;
    direccion?: string | null;
    original: AutoevaluacionItem;
    reevaluaciones: AutoevaluacionItem[];
    ultimaEvaluacion: AutoevaluacionItem;
    tieneReevaluaciones: boolean;
    difPorcentaje: number;
    difCumple: number;
    difNoCumple: number;
    difPorRevisar: number;
    difNa: number;
}

/** Props de `Inertia::render('Evaluacion/ExpedienteLocal')`. */
export interface ExpedienteLocalProps {
    proceso: ProcesoPreventivo;
    uuidSeleccionado?: string;
}
