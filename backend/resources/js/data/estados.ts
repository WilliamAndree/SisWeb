export type EstadoSemaforo = 'VERDE' | 'AMBAR' | 'ROJO' | 'PENDIENTE';

export type EstadoSubsanacion = 'PENDIENTE' | 'EN_PROCESO' | 'SUBSANADO_DECLARADO';

export type EstadoChecklist = 'CUMPLE_DECLARADO' | 'PENDIENTE_ATENDER' | 'POR_REVISAR' | 'NO_APLICA';

export interface ConfigEstadoVisual {
    label: string;
    dotClass: string;
    badgeClass: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
}

const NEUTRAL: Omit<ConfigEstadoVisual, 'label' | 'dotClass'> = {
    badgeClass: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    textClass: 'text-neutral-600',
    bgClass: 'bg-neutral-100',
    borderClass: 'border-neutral-200',
};

const SUCCESS: Omit<ConfigEstadoVisual, 'label' | 'dotClass'> = {
    badgeClass: 'bg-success-100 text-success-800 border-success-200',
    textClass: 'text-success-800',
    bgClass: 'bg-success-50',
    borderClass: 'border-success-200',
};

const WARNING: Omit<ConfigEstadoVisual, 'label' | 'dotClass'> = {
    badgeClass: 'bg-warning-100 text-warning-800 border-warning-200',
    textClass: 'text-warning-800',
    bgClass: 'bg-warning-50',
    borderClass: 'border-warning-200',
};

const DANGER: Omit<ConfigEstadoVisual, 'label' | 'dotClass'> = {
    badgeClass: 'bg-danger-100 text-danger-800 border-danger-200',
    textClass: 'text-danger-900',
    bgClass: 'bg-danger-50',
    borderClass: 'border-danger-200',
};

/**
 * Fuente única de verdad visual de estados. Cualquier vista que necesite pintar un
 * semáforo, una subsanación o una respuesta del checklist debe consumir este mapa
 * en lugar de redefinir tonos, para que la escala semántica de `app.css` no se
 * fragmente en variantes hardcodeadas.
 */
export const ESTADOS_VISUALES: Record<string, ConfigEstadoVisual> = {
    // Semáforo preventivo
    VERDE: { label: 'Verde', dotClass: 'bg-success-500', ...SUCCESS },
    AMBAR: { label: 'Ámbar', dotClass: 'bg-warning-500', ...WARNING },
    ROJO: { label: 'Rojo', dotClass: 'bg-danger-600', ...DANGER },

    // Subsanación
    PENDIENTE: { label: 'Pendiente', dotClass: 'bg-neutral-400', ...NEUTRAL },
    EN_PROCESO: { label: 'En proceso', dotClass: 'bg-warning-500', ...WARNING },
    SUBSANADO_DECLARADO: { label: 'Declarado subsanado', dotClass: 'bg-success-500', ...SUCCESS },

    // Respuestas del checklist
    CUMPLE_DECLARADO: { label: 'Cumple declarado', dotClass: 'bg-success-500', ...SUCCESS },
    PENDIENTE_ATENDER: { label: 'Pendiente de atender', dotClass: 'bg-danger-600', ...DANGER },
    POR_REVISAR: { label: 'Por revisar', dotClass: 'bg-warning-500', ...WARNING },
    NO_APLICA: { label: 'No aplica', dotClass: 'bg-neutral-400', ...NEUTRAL },

    // Estados históricos de la simulación de inspección
    CUMPLE: { label: 'Cumple', dotClass: 'bg-success-500', ...SUCCESS },
    NO_CUMPLE: { label: 'No cumple', dotClass: 'bg-danger-600', ...DANGER },
    NA: { label: 'No aplica', dotClass: 'bg-neutral-400', ...NEUTRAL },
};

export const ESTADO_FALLBACK: ConfigEstadoVisual = {
    label: '',
    dotClass: 'bg-neutral-400',
    ...NEUTRAL,
};

/**
 * Etiqueta humana de un estado. Devuelve el valor crudo si el estado no está
 * registrado, para que nunca se imprima una cadena vacía en un documento legal.
 */
export function etiquetaEstado(estado: string): string {
    return ESTADOS_VISUALES[estado]?.label ?? estado;
}

export function configEstado(estado: string): ConfigEstadoVisual {
    return ESTADOS_VISUALES[estado] ?? ESTADO_FALLBACK;
}
