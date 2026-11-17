import { CATEGORIA_LABELS, type CategoriaChecklist } from '@/data/checklistCatalogo';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    MinusCircle,
    type LucideIcon,
} from 'lucide-react';

export interface EstadoBadgeConfig {
    label: string;
    bg: string;
    icon: LucideIcon;
}

/**
 * Retorna la configuración visual del badge (etiqueta, estilo y el icono Lucide)
 * correspondiente a un estado normativo de autoevaluación o checklist.
 */
export function getEstadoBadge(estado?: string | null): EstadoBadgeConfig {
    const estadoNormalizado = estado?.toUpperCase() ?? 'NA';
    switch (estadoNormalizado) {
        case 'CUMPLE':
        case 'CUMPLE_DECLARADO':
            return {
                label: 'CUMPLE',
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                icon: CheckCircle2,
            };
        case 'PENDIENTE_ATENDER':
            return {
                label: 'POR SUBSANAR',
                bg: 'bg-rose-50 text-rose-800 border-rose-200',
                icon: AlertCircle,
            };
        case 'NO_CUMPLE':
            return {
                label: 'NO CUMPLE',
                bg: 'bg-rose-50 text-rose-800 border-rose-200',
                icon: AlertCircle,
            };
        case 'POR_REVISAR':
            return {
                label: 'POR REVISAR',
                bg: 'bg-amber-50 text-amber-800 border-amber-200',
                icon: AlertTriangle,
            };
        case 'NA':
        case 'NO_APLICA':
        default:
            return {
                label: 'NO APLICA',
                bg: 'bg-slate-100 text-slate-600 border-slate-200',
                icon: MinusCircle,
            };
    }
}

/**
 * Retorna la denominación amigable de una categoría o especialidad normativa.
 */
export function getCategoriaNombre(categoria?: string | null): string {
    if (!categoria) {
        return 'Seguridad General';
    }
    if (categoria in CATEGORIA_LABELS) {
        return CATEGORIA_LABELS[categoria as CategoriaChecklist];
    }
    return categoria;
}

/**
 * Formatea el área techada sanitizando valores nulos o literales 'null'.
 */
export function formatearArea(area?: number | string | null): string {
    if (area === null || area === undefined || area === '' || area === 'null') {
        return 'Área no declarada';
    }
    return `${area} m²`;
}

/**
 * Formatea el aforo estimado del establecimiento.
 */
export function formatearAforo(aforo?: number | string | null): string {
    if (aforo === null || aforo === undefined || aforo === '' || aforo === 'null') {
        return 'Aforo no declarado';
    }
    return `${aforo} personas`;
}

/**
 * Formatea el número de pisos garantizando un fallback mínimo de 1 piso.
 */
export function formatearPisos(pisos?: number | string | null): string {
    const val = pisos ?? 1;
    return `${val} piso(s)`;
}
