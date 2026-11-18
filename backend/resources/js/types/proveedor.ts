/** Contratos de la cuenta de proveedor y de la administración. */

export type EstadoRevision = 'pendiente' | 'aprobado' | 'observado' | 'suspendido';

export interface PlanProveedor {
    id: string;
    nombre: string;
    precio: number;
    descripcion: string;
    destacado: boolean;
    etiqueta?: string;
    limite_productos?: number | null;
    beneficios: string[];
}

export interface PerfilResumen {
    nombre_comercial: string;
    plan: string;
    plan_nombre: string;
    plan_vence_el: string | null;
    estado_revision: EstadoRevision;
    observacion_revision: string | null;
    verificado: boolean;
    publicado: boolean;
}

export interface SolicitudPlanResumen {
    uuid: string;
    plan_solicitado: string;
    plan_nombre: string;
    meses: number;
    monto_soles: number;
    metodo_pago: string;
    numero_operacion: string;
    fecha_pago: string;
    estado: 'pendiente' | 'aprobada' | 'rechazada';
    observacion_admin: string | null;
    vigente_hasta: string | null;
    enviado_el: string;
}

export interface PrecioDuracion {
    meses: number;
    etiqueta: string;
    descuento: number;
    monto: number;
    por_mes: number;
    ahorro: number;
}

export const ESTADO_NEGOCIO: Record<EstadoRevision, { texto: string; clase: string; explicacion: string }> = {
    pendiente: {
        texto: 'En revisión',
        clase: 'bg-sun-100 text-sun-700',
        explicacion: 'Un administrador está revisando tu negocio. Apenas lo apruebe, los clientes te verán.',
    },
    aprobado: {
        texto: 'Publicado',
        clase: 'bg-emerald-100 text-emerald-800',
        explicacion: 'Tu negocio y tus productos activos ya aparecen para los clientes.',
    },
    observado: {
        texto: 'Con observaciones',
        clase: 'bg-primary-100 text-primary-800',
        explicacion: 'Corrige lo que te indicamos en "Mi negocio" y guarda: volverá a revisión.',
    },
    suspendido: {
        texto: 'Suspendido',
        clase: 'bg-rose-100 text-rose-800',
        explicacion: 'Tu negocio no se muestra a los clientes. Escríbenos para resolverlo.',
    },
};

export const ESTADO_PAGO: Record<SolicitudPlanResumen['estado'], { texto: string; clase: string }> = {
    pendiente: { texto: 'En revisión', clase: 'bg-sun-100 text-sun-700' },
    aprobada: { texto: 'Aprobado', clase: 'bg-emerald-100 text-emerald-800' },
    rechazada: { texto: 'Rechazado', clase: 'bg-rose-100 text-rose-800' },
};

export const soles = (monto: number) =>
    `S/ ${monto.toLocaleString('es-PE', { minimumFractionDigits: monto % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

/** "+12%" o "-5%": variación frente al periodo anterior. */
export const porcentajeCambio = (cambio: number) => `${cambio > 0 ? '+' : ''}${cambio}%`;

export const fechaCorta = (iso: string | null) =>
    iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
