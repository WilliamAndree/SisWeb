import { CajaNotasSubsanacion } from '@/components/Evaluacion/CajaNotasSubsanacion';
import { DesgloseEspecialidades } from '@/components/Evaluacion/DesgloseEspecialidades';
import { DiagnosticoMultidimensional } from '@/components/Evaluacion/DiagnosticoMultidimensional';
import { AvisoPreventivo, FlujoCiudadano } from '@/components/Evaluacion/FlujoCiudadano';
import { HojaModeloAnexo } from '@/components/Evaluacion/HojaModeloAnexo';
import { LoQueTeFalta } from '@/components/Evaluacion/LoQueTeFalta';
import { NubeAsistenciaModal, type CriterioAsistencia } from '@/components/Evaluacion/NubeAsistenciaModal';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { RecursoEducativoModal, type RecursoEducativoData } from '@/components/RecursoEducativoModal';
import { CryptoSealBadge } from '@/components/shared/CryptoSealBadge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatearNivelRiesgo } from '@/lib/riesgo';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Building2,
    Check,
    CheckCircle2,
    ClipboardList,
    Clock,
    Coins,
    FileCheck,
    FileText,
    Files,
    HelpCircle,
    Layers,
    Loader2,
    Lock,
    RefreshCw,
    RotateCcw,
    Save,
    Scale,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Store,
    TrendingDown,
    Wrench,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ResumenHeader } from './components/ResumenHeader';

import type { FinalizarPendiente, ResumenProps } from '@/types/contrato';

/**
 * Secuencia del flujo ciudadano cívico.
 */

/**
 * Etiquetas ciudadanas de `caracteristicas_declaradas`.
 */
const CARACTERISTICAS_DECLARADAS: Record<string, { etiqueta: string; sufijo?: string }> = {
    area_m2: { etiqueta: 'Área techada', sufijo: ' m²' },
    pisos: { etiqueta: 'Número de pisos' },
    aforo: { etiqueta: 'Aforo declarado' },
    usa_glp: { etiqueta: 'Utiliza GLP' },
    galones_glp: { etiqueta: 'Cantidad de GLP almacenada', sufijo: ' galones' },
    usa_caldero: { etiqueta: 'Utiliza caldero' },
    usa_liquidos_inflamables: { etiqueta: 'Almacena o manipula líquidos inflamables' },
    combustibles_liquidos_m3: { etiqueta: 'Volumen de combustibles líquidos', sufijo: ' m³' },
    en_sotano: { etiqueta: 'Actividad en sótano o semisótano' },
    galeria_sin_itse: { etiqueta: 'En galería sin ITSE en áreas comunes' },
    tiene_equipos_fritura: { etiqueta: 'Equipos de fritura o cocción con aceites' },
    tiene_escaleras: { etiqueta: 'Escaleras de circulación' },
    tiene_estanterias_altas: { etiqueta: 'Estanterías altas o mobiliario con riesgo de volteo' },
};

/**
 * Contenido cívico de la modalidad de trámite según D.S. N° 002-2018-PCM.
 */
const MODALIDAD_TRAMITE = {
    EX_POST: {
        badge: 'Modalidad: ITSE Posterior (D.S. N° 002-2018-PCM)',
        badgeClases: 'border-sky-300 bg-sky-50 text-sky-900',
        icono: ShieldCheck,
        iconoClases: 'border-sky-200 bg-sky-100 text-sky-700',
        titulo: 'ITSE Posterior (Silencio Positivo / Ex-Post)',
        mensaje:
            'Tu establecimiento califica para tramitar la Licencia de Funcionamiento presentando la Declaración Jurada de Cumplimiento (Anexo 4). La inspección técnica de Defensa Civil se ejecuta con posterioridad.',
        plazo: 'Hasta 3 días hábiles para subsanar observaciones no relevantes.',
        detallePlazo:
            'De existir observaciones subsanables en el acta de inspección posterior, se otorga hasta 3 días hábiles para subsanar mediante declaración jurada y panel fotográfico ingresado por Mesa de Partes (sin segunda visita presencial).',
        reprogramacion:
            'Diligencia única: Si el inspector no puede acceder, se puede reprogramar por única vez dentro de los 2 días hábiles; de persistir la inasistencia o negativa, se emite Resolución Denegatoria.',
        plazoIcono: Clock,
    },
    EX_ANTE: {
        badge: 'Modalidad: ITSE Previa (Inspección Multidisciplinaria)',
        badgeClases: 'border-amber-300 bg-amber-50 text-amber-900',
        icono: ShieldAlert,
        iconoClases: 'border-amber-200 bg-amber-100 text-amber-700',
        titulo: 'ITSE Previa (Inspección Técnica Ex-Ante)',
        mensaje:
            'Requiere inspección física in situ previa al otorgamiento de la Licencia de Funcionamiento por un Grupo Inspector especializado acreditado.',
        plazo: 'Hasta 20 días hábiles para subsanar observaciones.',
        detallePlazo:
            'El grupo inspector realiza una diligencia presencial in situ. De existir observaciones subsanables, se otorga un plazo de hasta 20 días hábiles con una segunda verificación presencial in situ para constatar el levantamiento de las observaciones.',
        reprogramacion:
            'Regla de diligencia: La inspección se puede reprogramar por única vez dentro de los 2 días hábiles ante causa justificada debidamente acreditada; la inconcurrencia reiterada acarrea el fin del procedimiento y denegatoria.',
        plazoIcono: Clock,
    },
} as const;

interface TagEspecialista {
    texto: string;
    icono: string;
    clase: string;
}

/**
 * Asigna un tag sutil del especialista requerido según la disciplina normativa.
 */
function obtenerTagEspecialista(codigo: string, titulo: string, queObservar?: string): TagEspecialista {
    const cod = (codigo || '').toUpperCase().trim();
    const texto = ((titulo || '') + ' ' + (queObservar || '')).toLowerCase();

    // 1. EXTINTORES E INCENDIOS
    if (cod === 'CRIT-01' || cod === 'CRIT-02' || (texto.includes('extintor') && !texto.includes('clase k') && !texto.includes('fritura'))) {
        return {
            texto: 'Proveedor de Extintores NTP / Incendios',
            icono: '🧯',
            clase: 'bg-rose-50 text-rose-900 border-rose-200/90',
        };
    }

    if (cod === 'CRIT-02A' || texto.includes('clase k') || texto.includes('fritura') || texto.includes('aceite')) {
        return {
            texto: 'Proveedor de Extintores Clase K / Incendios',
            icono: '🧯',
            clase: 'bg-rose-50 text-rose-900 border-rose-200/90',
        };
    }

    // 2. SEÑALÉTICA Y PRIMEROS AUXILIOS
    if (cod === 'CRIT-02B' || cod === 'CRIT-09' || texto.includes('señal') || texto.includes('botiquín')) {
        return {
            texto: 'Implementación de Señalética / Rotulación',
            icono: '🏷️',
            clase: 'bg-indigo-50 text-indigo-900 border-indigo-200/90',
        };
    }

    // 3. ARQUITECTURA Y EVACUACIÓN
    if (cod === 'CRIT-04' || (texto.includes('puerta') && (texto.includes('evacuac') || texto.includes('salida')))) {
        return {
            texto: 'Adecuación de Puertas de Evacuación',
            icono: '📐',
            clase: 'bg-sky-50 text-sky-900 border-sky-200/90',
        };
    }

    if (cod === 'CRIT-03' || cod === 'CRIT-12' || texto.includes('pasadizo') || texto.includes('evacuac') || texto.includes('aforo')) {
        return {
            texto: 'Adecuación Arquitectónica y Evacuación',
            icono: '📐',
            clase: 'bg-sky-50 text-sky-900 border-sky-200/90',
        };
    }

    if (cod === 'CRIT-11' || texto.includes('escalera') || texto.includes('pasamano')) {
        return {
            texto: 'Carpintería / Pasamanos y Antideslizantes',
            icono: '📐',
            clase: 'bg-sky-50 text-sky-900 border-sky-200/90',
        };
    }

    // 4. ELÉCTRICAS
    if (cod === 'CRIT-05' || texto.includes('pozo') || texto.includes('tierra') || texto.includes('puesta a tierra')) {
        return {
            texto: 'Protocolo de Pozo a Tierra (Ing. Colegiado)',
            icono: '⚡',
            clase: 'bg-amber-50 text-amber-900 border-amber-200/90',
        };
    }

    if (cod === 'CRIT-06' || cod === 'CRIT-14A' || texto.includes('tablero') || texto.includes('mandil') || texto.includes('diferencial')) {
        return {
            texto: 'Técnico o Ing. Electricista (Tableros)',
            icono: '⚡',
            clase: 'bg-amber-50 text-amber-900 border-amber-200/90',
        };
    }

    if (cod === 'CRIT-07' || texto.includes('cable') || texto.includes('canaleta') || texto.includes('conduit') || texto.includes('mellizo')) {
        return {
            texto: 'Técnico Electricista (Canalización)',
            icono: '⚡',
            clase: 'bg-amber-50 text-amber-900 border-amber-200/90',
        };
    }

    if (cod === 'CRIT-08' || texto.includes('luces de emergencia') || texto.includes('luz de emergencia')) {
        return {
            texto: 'Instalación de Luces de Emergencia (Técnico)',
            icono: '💡',
            clase: 'bg-amber-50 text-amber-900 border-amber-200/90',
        };
    }

    // 5. GAS / GLP
    if (cod === 'CRIT-10' || texto.includes('glp') || texto.includes('gas') || texto.includes('caldero')) {
        return {
            texto: 'Técnico Especialista en GLP / Osinergmin',
            icono: '🔥',
            clase: 'bg-orange-50 text-orange-900 border-orange-200/90',
        };
    }

    // 6. ESTRUCTURAL
    if (cod === 'CRIT-13' || texto.includes('estanter') || texto.includes('anclaje') || texto.includes('mobiliario') || texto.includes('volteo')) {
        return {
            texto: 'Adecuación Estructural / Anclaje Antisísmico',
            icono: '🔨',
            clase: 'bg-slate-100 text-slate-800 border-slate-200/90',
        };
    }

    return {
        texto: 'Especialista Técnico Calificado',
        icono: '🔧',
        clase: 'bg-slate-100 text-slate-700 border-slate-200/90',
    };
}

/**
 * Determina la clave de especialidad del Directorio Cívico para pre-filtrar aliados.
 */
function obtenerEspecialidadDirectorio(codigo: string, titulo: string, queObservar?: string): string {
    const cod = (codigo || '').toUpperCase().trim();
    const texto = ((titulo || '') + ' ' + (queObservar || '')).toLowerCase();

    if (cod === 'CRIT-01' || cod === 'CRIT-02' || cod === 'CRIT-02A' || texto.includes('extintor') || texto.includes('incendio')) {
        return 'incendios';
    }

    if (
        cod === 'CRIT-05' ||
        cod === 'CRIT-06' ||
        cod === 'CRIT-07' ||
        cod === 'CRIT-08' ||
        cod === 'CRIT-14' ||
        cod === 'CRIT-14A' ||
        texto.includes('pozo') ||
        texto.includes('puesta a tierra') ||
        texto.includes('tablero') ||
        texto.includes('electr') ||
        texto.includes('luz de emergencia') ||
        texto.includes('luces de emergencia')
    ) {
        return 'electricas';
    }

    if (cod === 'CRIT-10' || texto.includes('gas') || texto.includes('glp') || texto.includes('calder')) {
        return 'gas';
    }

    if (
        cod === 'CRIT-13' ||
        cod === 'CRIT-15' ||
        texto.includes('vidrio') ||
        texto.includes('estanter') ||
        texto.includes('anclaje') ||
        texto.includes('estructur')
    ) {
        return 'estructuras';
    }

    return 'arquitectura_senaletica';
}

interface AccionCorrectivaOficial {
    norma: string;
    solucionTecnica: string;
    requerimientoProfesional?: string;
}

const ACCIONES_POR_CODIGO: Record<string, AccionCorrectivaOficial> = {
    'CRIT-04': {
        norma: 'RNE A.130 Arts. 5 y 6 / RNE A.010 Art. 26',
        solucionTecnica:
            'Acondicionar las puertas utilizadas como medios de evacuación para que abran en el sentido del flujo de los evacuantes o permanezcan abiertas en horario de atención, sin pestillos, candados ni trabas que obstruyan la libre salida.',
        requerimientoProfesional: 'Técnico cerrajero / Administrador del local',
    },
    'CRIT-11': {
        norma: 'RNE A.010 (Arts. 23 al 31) y RNE A.130 Art. 16',
        solucionTecnica:
            'Colocar pasamanos a ambos lados en escaleras de evacuación (ancho 1.20 m a 2.40 m) e instalar bandas o acabados antideslizantes de alto tránsito en los peldaños.',
        requerimientoProfesional: 'Contratista de acabados / Carpintería metálica',
    },
    'CRIT-06': {
        norma: 'CNE-U 020.202.1, 070.302 y 020.132 / Reglas 080.010 y 150.400',
        solucionTecnica:
            'Instalar placa de protección (mandil) para cubrir conexiones internas, sellar espacios de reserva con tapas ciegas e instalar interruptores diferenciales (30 mA) en todos los circuitos derivados.',
        requerimientoProfesional: 'Técnico Electricista calificado o Ing. Electricista colegiado',
    },
    'CRIT-02B': {
        norma: 'NTP 399.010-1 y RNE A.130 Art. 39',
        solucionTecnica:
            'Implementar señalización de seguridad fotoluminiscente normalizada (direccionales de salida, zona segura en caso de sismo, riesgo eléctrico y ubicación de extintores).',
        requerimientoProfesional: 'Proveedor de señalética de seguridad / Administrador',
    },
    'CRIT-01': {
        norma: 'NTP 350.043-1 / RNE A.130 Art. 163',
        solucionTecnica:
            'Efectuar recarga o mantenimiento preventivo anual con empresa autorizada de extintores, comprobar manómetro en franja verde y fijar el equipo a una altura máxima de 1.50 m con tarjeta de control vigente y señalética superior visible.',
        requerimientoProfesional: 'Empresa autorizada de mantenimiento y recarga de extintores',
    },
    'CRIT-02A': {
        norma: 'RNE A.130 Art. 165 / NTP 350.043-1 num. 8.1.4',
        solucionTecnica:
            'Instalar un extintor de Acetato de Potasio (Clase K) a no más de 9 metros de los equipos de fritura o cocción comercial con aceites, con tarjeta de control y mantenimiento vigente por empresa recargadora autorizada.',
        requerimientoProfesional: 'Proveedor acreditado de extintores Clase K',
    },
    'CRIT-03': {
        norma: 'RNE Norma A.010 Art. 25 / RNE Norma A.130 Art. 22',
        solucionTecnica:
            'Despejar completamente los pasadizos de circulación interna y rutas de evacuación hacia la salida, asegurando un ancho libre continuo mínimo de 1.20 m sin fardos, cajas de mercadería ni mobiliario.',
        requerimientoProfesional: 'Administrador del local / Personal del establecimiento',
    },
    'CRIT-05': {
        norma: 'CNE Utilización Regla 060.712 / R.J. N° 016-2018 Anexo 4',
        solucionTecnica:
            'Ejecutar mantenimiento preventivo al sistema de puesta a tierra y obtener el Certificado de Medición de Resistencia (≤ 25 Ω) con vigencia no mayor a 1 año, suscrito por Ingeniero Electricista o Mecánico-Electricista colegiado y habilitado.',
        requerimientoProfesional: 'Ingeniero Electricista o Mecánico-Electricista Colegiado',
    },
    'CRIT-07': {
        norma: 'CNE Utilización Reglas 010.010 y 070.300',
        solucionTecnica:
            'Erradicar el uso de cables mellizos expuestos y reemplazarlos por conductores no propagadores de llama (NH-80 o THHN) debidamente entubados en conduit PVC pesado o canaletas con tapa y cajas de paso cerradas.',
        requerimientoProfesional: 'Técnico Electricista calificado',
    },
    'CRIT-08': {
        norma: 'RNE Norma A.130 Art. 40 / CNE Utilización Regla 240.202',
        solucionTecnica:
            'Instalar equipos autónomos de alumbrado de emergencia de 2 faros LED con batería recargable que garantice al menos 90 minutos de autonomía, conectados permanentemente al circuito de iluminación de la zona en pasadizos, escaleras y puertas de salida.',
        requerimientoProfesional: 'Técnico electricista calificado',
    },
    'CRIT-10': {
        norma: 'D.S. N° 027-94-EM Arts. 45 y 48 / NTP 321.123',
        solucionTecnica:
            'Ubicar balones de gas GLP en lugares ventilados a nivel del terreno (terminantemente prohibidos en sótanos o semisótanos), alejados a más de 0.50 m de tomacorrientes e interruptores eléctricos. Emplear reguladores y mangueras con certificación técnica para GLP.',
        requerimientoProfesional: 'Instalador de gas registrado / Técnico calificado',
    },
    'CRIT-13': {
        norma: 'RNE Norma E.030 Cap. 9 (Elementos No Estructurales)',
        solucionTecnica:
            'Efectuar anclaje mecánico rígido de estanterías, vitrinas y racks con altura mayor a 1.80 m fijándolos a muros portantes o losa mediante escuadras metálicas o pernos de expansión para prevenir colapso sísmico sobre pasadizos.',
        requerimientoProfesional: 'Técnico de montaje y adecuación estructural',
    },
    'CRIT-14A': {
        norma: 'CNE Utilización Regla 020.024',
        solucionTecnica:
            'Garantizar un espacio de trabajo frontal continuo de al menos 1.00 metro de profundidad y ancho libre frente al tablero eléctrico, retirando cualquier mercadería o material combustible.',
        requerimientoProfesional: 'Administrador del local / Personal del establecimiento',
    },
};

interface ReglaFallback {
    coincide: (texto: string) => boolean;
    accion: AccionCorrectivaOficial;
}

const REGLAS_FALLBACK: ReglaFallback[] = [
    {
        coincide: (t) => t.includes('puerta') && (t.includes('evacuac') || t.includes('traba') || t.includes('candado')),
        accion: ACCIONES_POR_CODIGO['CRIT-04'],
    },
    {
        coincide: (t) => t.includes('escalera') && (t.includes('pasamano') || t.includes('peldaño') || t.includes('antideslizante')),
        accion: ACCIONES_POR_CODIGO['CRIT-11'],
    },
    {
        coincide: (t) => t.includes('mandil') || (t.includes('tablero') && t.includes('diferencial')),
        accion: ACCIONES_POR_CODIGO['CRIT-06'],
    },
    {
        coincide: (t) => t.includes('señal') && (t.includes('evacuac') || t.includes('fotoluminiscente') || t.includes('salida')),
        accion: ACCIONES_POR_CODIGO['CRIT-02B'],
    },
    {
        coincide: (t) => t.includes('extintor') && !t.includes('clase k') && !t.includes('fritura'),
        accion: ACCIONES_POR_CODIGO['CRIT-01'],
    },
    {
        coincide: (t) => t.includes('clase k') || t.includes('fritura') || t.includes('aceite'),
        accion: ACCIONES_POR_CODIGO['CRIT-02A'],
    },
    {
        coincide: (t) => t.includes('pasadizo') || (t.includes('ruta') && t.includes('evacuac')),
        accion: ACCIONES_POR_CODIGO['CRIT-03'],
    },
    {
        coincide: (t) => t.includes('pozo') || t.includes('puesta a tierra') || t.includes('resistencia'),
        accion: ACCIONES_POR_CODIGO['CRIT-05'],
    },
    {
        coincide: (t) => t.includes('cable mellizo') || t.includes('mellizo') || t.includes('canaliz') || t.includes('conduit'),
        accion: ACCIONES_POR_CODIGO['CRIT-07'],
    },
    {
        coincide: (t) => t.includes('luz de emergencia') || t.includes('luces de emergencia'),
        accion: ACCIONES_POR_CODIGO['CRIT-08'],
    },
    {
        coincide: (t) => t.includes('glp') || t.includes('balón') || t.includes('gas') || t.includes('caldero'),
        accion: ACCIONES_POR_CODIGO['CRIT-10'],
    },
    {
        coincide: (t) => t.includes('estanter') || t.includes('anclaje') || t.includes('volteo') || t.includes('rack'),
        accion: ACCIONES_POR_CODIGO['CRIT-13'],
    },
    {
        coincide: (t) => t.includes('espacio libre') && t.includes('tablero'),
        accion: ACCIONES_POR_CODIGO['CRIT-14A'],
    },
];

/**
 * Provee la solución técnica oficial y normativa (D.S. N° 002-2018-PCM / R.J. N° 016-2018-CENEPRED / RNE / CNE)
 * para cada no-conformidad detectada.
 */
function obtenerAccionCorrectivaOficial(codigo: string, titulo: string, queObservar?: string, accionBase?: string): AccionCorrectivaOficial {
    const cod = (codigo || '').toUpperCase().trim();

    if (cod && ACCIONES_POR_CODIGO[cod]) {
        return ACCIONES_POR_CODIGO[cod];
    }

    const texto = ((titulo || '') + ' ' + (queObservar || '') + ' ' + (accionBase || '')).toLowerCase();
    const coincidencia = REGLAS_FALLBACK.find((r) => r.coincide(texto));

    if (coincidencia) {
        return coincidencia.accion;
    }

    return {
        norma: 'D.S. N° 002-2018-PCM / Manual CENEPRED',
        solucionTecnica: accionBase || 'Implementar la adecuación física y documental conforme a las especificaciones técnicas del Manual CENEPRED.',
        requerimientoProfesional: 'Responsable técnico del establecimiento',
    };
}

interface EstimacionItem {
    codigo: string;
    titulo: string;
    rubro: string;
    min: number;
    max: number;
}

const ESTIMACION_COSTOS_REFERENCIALES: Record<string, { min: number; max: number; rubro: string }> = {
    'CRIT-01': { min: 35, max: 50, rubro: 'Mantenimiento / recarga de extintor PQS' },
    'CRIT-02A': { min: 140, max: 220, rubro: 'Extintor químico húmedo especializado Clase K' },
    'CRIT-02B': { min: 25, max: 45, rubro: 'Kit de señales fotoluminiscentes de seguridad' },
    'CRIT-03': { min: 0, max: 30, rubro: 'Despeje y señalización de anchos de paso' },
    'CRIT-04': { min: 40, max: 120, rubro: 'Cerrajería / manija de escape o adecuación de puerta' },
    'CRIT-05': { min: 180, max: 260, rubro: 'Protocolo de medición de pozo a tierra CIP (≤25 Ω)' },
    'CRIT-06': { min: 80, max: 130, rubro: 'Mandil de tablero + interruptor diferencial 30mA' },
    'CRIT-07': { min: 60, max: 140, rubro: 'Canaletas PVC + sustitución de cables mellizos' },
    'CRIT-08': { min: 60, max: 100, rubro: 'Luminaria autónoma de emergencia recargable' },
    'CRIT-10': { min: 30, max: 50, rubro: 'Manguera reforzada para GLP y abrazaderas metálicas' },
    'CRIT-11': { min: 50, max: 120, rubro: 'Pasamanos continuo y cintas antideslizantes para escalera' },
    'CRIT-13': { min: 30, max: 70, rubro: 'Arriostramiento antisísmico / escuadras para estanterías' },
    'CRIT-14A': { min: 0, max: 20, rubro: 'Despeje frontal libre de 1 m de tablero eléctrico' },
};

const COSTO_DEFECTO = { min: 50, max: 100, rubro: 'Adecuación técnica preventiva' };

function calcularEstimacionEconomica(observaciones: { codigo: string; titulo: string }[]): {
    minTotal: number;
    maxTotal: number;
    promedioTotal: number;
    items: EstimacionItem[];
} {
    if (observaciones.length === 0) {
        return { minTotal: 0, maxTotal: 0, promedioTotal: 0, items: [] };
    }

    const items: EstimacionItem[] = observaciones.map((obs) => {
        const est = ESTIMACION_COSTOS_REFERENCIALES[obs.codigo] ?? COSTO_DEFECTO;
        return {
            codigo: obs.codigo,
            titulo: obs.titulo,
            rubro: est.rubro,
            min: est.min,
            max: est.max,
        };
    });

    const minTotal = items.reduce((acc, it) => acc + it.min, 0);
    const maxTotal = items.reduce((acc, it) => acc + it.max, 0);
    const promedioTotal = Math.round((minTotal + maxTotal) / 2);

    return { minTotal, maxTotal, promedioTotal, items };
}

/**
 * Gestiona el focus trap dentro del modal de confirmación al presionar Tab / Shift+Tab.
 */
function manejarTrapFocoModal(event: KeyboardEvent, modalElement: HTMLElement | null): void {
    if (event.key !== 'Tab' || !modalElement) return;
    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusableElements.length === 0) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
    }
}

function restaurarFocoTrigger(triggerRef: { current: HTMLElement | null }): void {
    if (triggerRef.current && document.body.contains(triggerRef.current)) {
        triggerRef.current.focus();
        triggerRef.current = null;
    }
}

/**
 * Calcula las métricas agregadas y porcentajes proporcionales del resumen técnico.
 */
function calcularMetricasResumen(resumen?: ResumenProps['resumen']) {
    const totalAplicables = resumen?.total_criterios_aplicables ?? 0;
    const totalCumple = resumen?.total_cumple_declarado ?? 0;
    const totalPendienteAtender = resumen?.total_pendiente_atender ?? 0;
    const totalPorRevisar = resumen?.total_por_revisar ?? 0;
    const totalPendientes = totalPendienteAtender + totalPorRevisar;
    const esApto = totalPendientes === 0;

    const pctCumple = totalAplicables > 0 ? (totalCumple / totalAplicables) * 100 : 0;
    const pctPendiente = totalAplicables > 0 ? (totalPendienteAtender / totalAplicables) * 100 : 0;
    const pctRevisar = totalAplicables > 0 ? (totalPorRevisar / totalAplicables) * 100 : 0;

    return {
        totalAplicables,
        totalPendientes,
        esApto,
        pctCumple,
        pctPendiente,
        pctRevisar,
    };
}

function resolverModalidadTramite(clasificacion_tramite: ResumenProps['clasificacion_tramite']) {
    if (!clasificacion_tramite) return null;

    const tipo = String(clasificacion_tramite.tipo_tramite ?? '').toUpperCase();
    const contenido = MODALIDAD_TRAMITE[tipo as keyof typeof MODALIDAD_TRAMITE];
    if (!contenido) return null;

    return {
        contenido,
        nivelRiesgo: formatearNivelRiesgo(clasificacion_tramite.nivel_riesgo),
        motivos: Array.isArray(clasificacion_tramite.motivos) ? clasificacion_tramite.motivos : [],
        fuente: clasificacion_tramite.fuente,
    };
}

interface CaracteristicaDeclaradaItem {
    clave: string;
    etiqueta: string;
    texto: string;
}

function formatearValorCaracteristica(valor: unknown, sufijo?: string): string {
    if (valor === true) return 'Sí';
    if (valor === false) return 'No';
    return `${valor}${sufijo ?? ''}`;
}

function extraerCaracteristicasDeclaradas(fuente?: Record<string, unknown> | null): CaracteristicaDeclaradaItem[] {
    if (!fuente || typeof fuente !== 'object') return [];

    return Object.entries(fuente)
        .filter(([clave, valor]) => Boolean(CARACTERISTICAS_DECLARADAS[clave]) && valor !== null && valor !== undefined)
        .filter(([clave]) => clave !== 'galones_glp' || fuente.usa_glp === true)
        .filter(([clave]) => clave !== 'combustibles_liquidos_m3' || fuente.usa_liquidos_inflamables === true)
        .map(([clave, valor]) => {
            const descriptor = CARACTERISTICAS_DECLARADAS[clave];
            const texto = formatearValorCaracteristica(valor, descriptor.sufijo);
            return { clave, etiqueta: descriptor.etiqueta, texto };
        });
}

function resolverNivelRiesgoTexto(clasificacion_tramite: ResumenProps['clasificacion_tramite'], resumen: ResumenProps['resumen']): string {
    if (clasificacion_tramite?.nivel_riesgo) {
        return formatearNivelRiesgo(clasificacion_tramite.nivel_riesgo);
    }
    if ((resumen?.total_pendiente_atender ?? 0) > 0) {
        return 'Alto';
    }
    if ((resumen?.total_por_revisar ?? 0) > 0) {
        return 'Medio';
    }
    return 'Bajo / Medio';
}

function determinarEsRiesgoAlto(clasificacion_tramite: ResumenProps['clasificacion_tramite'], totalPendienteAtender?: number): boolean {
    const nr = String(clasificacion_tramite?.nivel_riesgo ?? '').toUpperCase();
    if (nr.includes('ALTO') || nr === 'MUY_ALTO' || nr === 'ALTO_MUY_ALTO') return true;
    if (clasificacion_tramite?.tipo_tramite === 'EX_ANTE') return true;
    return (totalPendienteAtender ?? 0) > 0;
}

function determinarEsModalidadExAnte(clasificacion_tramite: ResumenProps['clasificacion_tramite'], esRiesgoAlto: boolean): boolean {
    if (clasificacion_tramite) {
        return clasificacion_tramite.tipo_tramite === 'EX_ANTE';
    }
    return esRiesgoAlto;
}

function procesarErrorRespuestaFinalizar(
    status: number,
    data: { mensaje?: string; pendientes?: FinalizarPendiente[] } | null,
): { error: string; pendientes: FinalizarPendiente[] } {
    if (status === 422) {
        return {
            error: data?.mensaje ?? 'No es posible registrar la autoevaluación porque existen condiciones aplicables sin declaración.',
            pendientes: Array.isArray(data?.pendientes) ? data.pendientes : [],
        };
    }

    const fallback =
        status === 409
            ? 'Esta autoevaluación ya se encuentra registrada y protegida contra modificaciones.'
            : 'No fue posible registrar la autoevaluación. Intente nuevamente.';

    return {
        error: data?.mensaje ?? fallback,
        pendientes: [],
    };
}

function formatearFechaEmisionHero(registradaAt?: string | null): string | undefined {
    if (!registradaAt) return undefined;
    return new Date(registradaAt).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

interface AccionesSolucionCriterioProps {
    asistencia?: CriterioAsistencia | null;
    codigoCriterio?: string;
    tituloCriterio?: string;
    queObservar?: string;
    onAbrirAsistencia: (asistencia: CriterioAsistencia) => void;
}

function AccionesSolucionCriterio({
    asistencia,
    codigoCriterio,
    tituloCriterio,
    queObservar,
    onAbrirAsistencia,
}: Readonly<AccionesSolucionCriterioProps>) {
    const tieneAliados = Boolean(asistencia && Array.isArray(asistencia.aliados) && asistencia.aliados.length > 0);
    const especialidadSlug = obtenerEspecialidadDirectorio(codigoCriterio || '', tituloCriterio || '', queObservar);

    return (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
            {tieneAliados && asistencia && (
                <button
                    type="button"
                    onClick={() => onAbrirAsistencia(asistencia)}
                    className="bg-primary hover:bg-primary-700 inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-white shadow-2xs transition-colors"
                >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Ver especialistas sugeridos</span>
                </button>
            )}
            <Link
                href={route('directorio.index', { especialidad: especialidadSlug })}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
                title="Explorar especialistas habilitados para este rubro en el Directorio Cívico"
            >
                <Store className="h-3.5 w-3.5 text-slate-500" />
                <span>Ver en Directorio</span>
            </Link>
        </div>
    );
}

interface BarraFlujoSuperiorResumenProps {
    mostrarBotonGuardar: boolean;
    onAbrirGuardar: () => void;
}

function BarraFlujoSuperiorResumen({ mostrarBotonGuardar, onAbrirGuardar }: Readonly<BarraFlujoSuperiorResumenProps>) {
    return (
        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
                href={route('autoevaluacion.index')}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 transition-colors hover:text-slate-900"
            >
                <ArrowLeft className="h-4 w-4 text-slate-400" />
                <span>Volver a la Portada Cívica</span>
            </Link>

            <div className="flex items-center gap-2">
                {mostrarBotonGuardar && (
                    <button
                        type="button"
                        onClick={onAbrirGuardar}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-sm font-bold text-emerald-700 shadow-2xs transition hover:bg-emerald-50"
                    >
                        <Save className="h-3.5 w-3.5" />
                        <span>Guardar en mi cuenta</span>
                    </button>
                )}
            </div>
        </div>
    );
}

interface SeccionSaludTecnicaProps {
    resumen: ResumenProps['resumen'];
    totalAplicables: number;
    pctCumple: number;
    pctPendiente: number;
    pctRevisar: number;
}

function SeccionSaludTecnica({ resumen, totalAplicables, pctCumple, pctPendiente, pctRevisar }: Readonly<SeccionSaludTecnicaProps>) {
    return (
        <section aria-labelledby="salud-tecnica-title" className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 id="salud-tecnica-title" className="text-base font-bold text-slate-900 sm:text-lg">
                        Tus declaraciones, por estado
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Distribución descriptiva sobre {totalAplicables} condiciones normativas aplicables a tu actividad.
                    </p>
                </div>
                <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-sm font-semibold text-slate-600">
                    {totalAplicables} Condiciones aplicables
                </span>
            </div>

            {/* Barra segmentada continua estilo Health / Audit bar */}
            <div className="my-6">
                <div
                    aria-label="Distribución de respuestas declaradas; no representa un nivel de seguridad"
                    className="flex h-3.5 gap-1 overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner"
                >
                    {pctCumple > 0 && (
                        <div
                            style={{ width: `${pctCumple}%` }}
                            className="bg-success-700 h-full rounded-full transition-all duration-700"
                            title={`Cumple declarado: ${resumen?.total_cumple_declarado ?? 0}`}
                        />
                    )}
                    {pctPendiente > 0 && (
                        <div
                            style={{ width: `${pctPendiente}%` }}
                            className="bg-warning-700 h-full rounded-full transition-all duration-700"
                            title={`Por subsanar: ${resumen?.total_pendiente_atender ?? 0}`}
                        />
                    )}
                    {pctRevisar > 0 && (
                        <div
                            style={{ width: `${pctRevisar}%` }}
                            className="h-full rounded-full bg-sky-500 transition-all duration-700"
                            title={`Por verificar: ${resumen?.total_por_revisar ?? 0}`}
                        />
                    )}
                </div>
            </div>

            {/* Bento KPI Cards: 3 tarjetas métricas destacadas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-success-700/5 flex items-center gap-4 rounded-3xl border border-[#34C759]/20 p-4.5 shadow-2xs">
                    <div className="bg-success-700/15 text-success-800 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-2xs">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-success-800 block text-2xl leading-tight font-black">{resumen?.total_cumple_declarado ?? 0}</span>
                        <span className="text-sm font-bold text-slate-800">Condiciones Cumplen</span>
                        <span className="block text-sm text-slate-500">Declaración cívica conforme</span>
                    </div>
                </div>

                <div className="bg-warning-700/5 flex items-center gap-4 rounded-3xl border border-[#FF9500]/20 p-4.5 shadow-2xs">
                    <div className="bg-warning-700/15 text-warning-800 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-2xs">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-warning-800 block text-2xl leading-tight font-black">{resumen?.total_pendiente_atender ?? 0}</span>
                        <span className="text-sm font-bold text-slate-800">Por Subsanar</span>
                        <span className="block text-sm text-slate-500">Requieren atención técnica</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-3xl border border-sky-200 bg-sky-50/50 p-4.5 shadow-2xs">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-2xs">
                        <HelpCircle className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <span className="block text-2xl leading-tight font-black text-sky-950">{resumen?.total_por_revisar ?? 0}</span>
                        <span className="text-sm font-bold text-slate-800">Por Verificar</span>
                        <span className="block text-sm text-slate-500">Revisión técnica sugerida</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

type CriterioPendienteItem = NonNullable<ResumenProps['pendiente_atender']>[number];

interface TarjetaCriterioPendienteProps {
    item: CriterioPendienteItem;
    uuid?: string;
    onAbrirRecurso: (item: { codigo: string; titulo: string; recursos_educativos?: RecursoEducativoData[] }) => void;
    onAbrirAsistencia: (asistencia: CriterioAsistencia) => void;
}

function TarjetaCriterioPendiente({ item, uuid, onAbrirRecurso, onAbrirAsistencia }: Readonly<TarjetaCriterioPendienteProps>) {
    const tag = obtenerTagEspecialista(item.codigo, item.titulo, item.que_observar);
    const accionOficial = obtenerAccionCorrectivaOficial(item.codigo, item.titulo, item.que_observar, item.accion_mejora_orientativa);

    return (
        <div className="space-y-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
            {/* Cabecera del Criterio con Tag de Especialista */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-sm font-bold text-slate-900">
                        {item.codigo}
                    </span>
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm font-semibold shadow-2xs ${tag.clase}`}
                    >
                        <span>{tag.icono}</span>
                        <span>{tag.texto}</span>
                    </span>
                </div>

                {(item.norma_base || item.articulo_referencia) && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
                        {item.norma_base}
                        {item.articulo_referencia && ` (${item.articulo_referencia})`}
                    </span>
                )}
            </div>

            <h3 className="text-sm font-bold text-slate-900 sm:text-base">{item.titulo}</h3>

            {item.que_observar && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-sm text-slate-700">
                    <strong className="mb-1 block font-bold text-slate-900">Qué observar en el establecimiento:</strong>
                    {item.que_observar}
                </div>
            )}

            {item.accion_mejora_orientativa && (
                <div className="bg-warning-700/5 rounded-2xl border border-[#FF9500]/25 p-3.5 text-sm text-slate-800">
                    <strong className="text-warning-800 mb-1 block font-bold">Acción de corrección prioritaria:</strong>
                    {item.accion_mejora_orientativa}
                </div>
            )}

            {/* Solución Técnica Oficial según CENEPRED / RNE / CNE con Acordeón interactivo */}
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="solucion-tecnica" className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 px-4">
                    <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
                        <div className="flex items-center gap-2">
                            <div className="bg-warning-700/10 text-warning-800 flex h-6 w-6 items-center justify-center rounded-lg">
                                <Wrench className="h-3.5 w-3.5" />
                            </div>
                            <span>Orientación Técnica Normativa (CENEPRED / RNE)</span>
                            <span className="ml-2 rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-sm text-slate-600">
                                {accionOficial.norma}
                            </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-1 pb-3 text-sm text-slate-700">
                        <p className="leading-relaxed font-normal">{accionOficial.solucionTecnica}</p>
                        {accionOficial.requerimientoProfesional && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-600">
                                <span className="font-semibold text-slate-900">Responsable recomendado:</span>
                                <span className="text-warning-800 font-medium">{accionOficial.requerimientoProfesional}</span>
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <CajaNotasSubsanacion
                codigo={item.codigo}
                uuid={uuid}
                notaInicial={item.notas}
                placeholder="Escribe recordatorios de subsanación (ej. contacto del técnico, cotización, fecha de reparación)..."
            />

            {/* Botonera de Asistencia y Recursos */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                {item.recursos_educativos && item.recursos_educativos.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => onAbrirRecurso(item)}
                        className="hover:text-success-800 inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-slate-700 transition-colors"
                    >
                        <BookOpen className="text-success-800 h-3.5 w-3.5" />
                        <span>Guía pedagógica ({item.recursos_educativos.length})</span>
                    </button>
                ) : (
                    <span />
                )}

                <AccionesSolucionCriterio
                    asistencia={item.asistencia_tecnica}
                    codigoCriterio={item.codigo}
                    tituloCriterio={item.titulo}
                    queObservar={item.que_observar}
                    onAbrirAsistencia={onAbrirAsistencia}
                />
            </div>
        </div>
    );
}

interface SeccionPlanSubsanacionProps {
    pendienteAtender: CriterioPendienteItem[];
    totalPendienteAtender: number;
    uuid?: string;
    onAbrirRecurso: (item: { codigo: string; titulo: string; recursos_educativos?: RecursoEducativoData[] }) => void;
    onAbrirAsistencia: (asistencia: CriterioAsistencia) => void;
}

function SeccionPlanSubsanacion({
    pendienteAtender,
    totalPendienteAtender,
    uuid,
    onAbrirRecurso,
    onAbrirAsistencia,
}: Readonly<SeccionPlanSubsanacionProps>) {
    return (
        <section aria-labelledby="subsanacion-title" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-warning-700/10 text-warning-800 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 id="subsanacion-title" className="text-base font-bold text-slate-900 sm:text-lg">
                            Plan de Subsanación Preventiva
                        </h2>
                        <p className="text-sm text-slate-500">Criterios que presentan observaciones técnicas para subsanar antes de la inspección.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-warning-700/10 text-warning-800 rounded-full border border-[#FF9500]/25 px-3.5 py-1 text-sm font-bold">
                        {totalPendienteAtender} observaciones
                    </span>
                    <Link
                        href={route('directorio.index')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-100"
                    >
                        <Store className="h-3.5 w-3.5 text-slate-500" />
                        <span>Directorio</span>
                    </Link>
                </div>
            </div>

            {pendienteAtender.length === 0 ? (
                <div className="bg-success-700/5 space-y-2 rounded-2xl border border-[#34C759]/20 p-6 text-center">
                    <CheckCircle2 className="text-success-800 mx-auto h-8 w-8" />
                    <p className="text-sm font-bold text-slate-900">¡Sin observaciones críticas pendientes!</p>
                    <p className="text-sm text-slate-600">No declaraste condiciones en estado pendiente de atención preventiva.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendienteAtender.map((item) => (
                        <TarjetaCriterioPendiente
                            key={item.codigo}
                            item={item}
                            uuid={uuid}
                            onAbrirRecurso={onAbrirRecurso}
                            onAbrirAsistencia={onAbrirAsistencia}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

interface SeccionEstimadorEconomicoProps {
    pendienteAtenderCount: number;
    estimacionEconomica: ReturnType<typeof calcularEstimacionEconomica>;
}

function SeccionEstimadorEconomico({ pendienteAtenderCount, estimacionEconomica }: Readonly<SeccionEstimadorEconomicoProps>) {
    return (
        <section aria-labelledby="estimador-economico-title" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                        <Coins className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 id="estimador-economico-title" className="text-base font-bold text-slate-900 sm:text-lg">
                            Estimación de Inversión Preventiva vs. Sanción Municipal
                        </h2>
                        <p className="text-sm text-slate-500">
                            Comparativa económica de subsanación técnica local frente al Régimen de Aplicación de Sanciones (RAS Huancayo).
                        </p>
                    </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-sm font-semibold text-slate-600">
                    CUIS / Ley N° 27972
                </span>
            </div>

            {pendienteAtenderCount === 0 ? (
                <div className="bg-success-700/5 flex items-start gap-3 rounded-2xl border border-[#34C759]/25 p-5">
                    <CheckCircle2 className="text-success-800 mt-0.5 h-5 w-5 shrink-0" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">Sin pendientes según tus declaraciones</p>
                        <p className="text-sm leading-relaxed text-slate-600">
                            No declaraste condiciones pendientes en esta revisión. Esto no elimina el riesgo de sanciones ni garantiza la continuidad
                            de operación. La comparativa existente muestra como referencia{' '}
                            <strong className="text-slate-900">0.50 a 1.00 UIT (S/ 2,675 a S/ 5,350)</strong>; no es una predicción de una sanción
                            para tu establecimiento.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Tarjeta 1: Inversión Preventiva Estimada */}
                        <div className="bg-success-700/5 space-y-3 rounded-3xl border border-[#34C759]/25 p-5 shadow-2xs">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-sm font-bold text-slate-700">Inversión Preventiva Estimada</span>
                                <span className="bg-success-700/10 text-success-800 rounded-full border border-[#34C759]/30 px-2.5 py-0.5 text-sm font-bold">
                                    Mercado Huancayo
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-success-800 font-mono text-2xl font-black">
                                    S/ {estimacionEconomica.minTotal} — S/ {estimacionEconomica.maxTotal}
                                </span>
                            </div>
                            <p className="text-sm leading-snug text-slate-600">
                                Costo referencial promedio de subsanación:{' '}
                                <strong className="font-mono font-semibold text-slate-800">~S/ {estimacionEconomica.promedioTotal}</strong>{' '}
                                (materiales normalizados y mano de obra técnica local para {pendienteAtenderCount} observación
                                {pendienteAtenderCount > 1 ? 'es' : ''}).
                            </p>
                        </div>

                        {/* Tarjeta 2: Sanción Municipal por Falta de ITSE */}
                        <div className="bg-danger-700/5 space-y-3 rounded-3xl border border-[#FF3B30]/25 p-5 shadow-2xs">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-sm font-bold text-slate-700">Sanción / Clausura Municipal</span>
                                <span className="bg-danger-700/10 text-danger-700 rounded-full border border-[#FF3B30]/30 px-2.5 py-0.5 text-sm font-bold">
                                    0.50 — 1.00 UIT
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-danger-700 font-mono text-2xl font-black">S/ 2,675 — S/ 5,350</span>
                            </div>
                            <p className="text-sm leading-snug text-slate-700">
                                Multa administrativa municipal por operar sin condiciones de seguridad +{' '}
                                <strong className="text-danger-700">Clausura Temporal Inmediata</strong> y cese de ingresos comerciales.
                            </p>
                        </div>
                    </div>

                    {/* Desglose individual de costos por criterio observado */}
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <span className="block text-sm font-bold text-slate-800">Desglose orientativo por criterio observado:</span>
                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                            {estimacionEconomica.items.map((it) => (
                                <div
                                    key={it.codigo}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs"
                                >
                                    <div className="min-w-0">
                                        <span className="mr-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-sm font-bold text-slate-900">
                                            {it.codigo}
                                        </span>
                                        <span
                                            className="inline-block max-w-[170px] truncate align-middle text-sm text-slate-700 sm:max-w-[190px]"
                                            title={it.rubro}
                                        >
                                            {it.rubro}
                                        </span>
                                    </div>
                                    <span className="text-success-800 shrink-0 font-mono text-sm font-bold">
                                        S/ {it.min} - {it.max}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Callout de Retorno de la Prevención */}
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                        <p className="text-sm leading-relaxed text-amber-950">
                            <strong>Retorno de la Prevención:</strong> Subsanar estas observaciones antes de la fiscalización municipal cuesta
                            aproximadamente <strong>{Math.round(2675 / Math.max(1, estimacionEconomica.promedioTotal))} veces menos</strong> que el
                            monto mínimo de una multa municipal (S/ 2,675), asegurando la continuidad operativa ininterrumpida de tu negocio en
                            Huancayo.
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}

type CriterioPorRevisarItem = NonNullable<ResumenProps['por_revisar']>[number];

interface TarjetaCriterioPorRevisarProps {
    item: CriterioPorRevisarItem;
    uuid?: string;
    onAbrirRecurso: (item: { codigo: string; titulo: string; recursos_educativos?: RecursoEducativoData[] }) => void;
    onAbrirAsistencia: (asistencia: CriterioAsistencia) => void;
}

function TarjetaCriterioPorRevisar({ item, uuid, onAbrirRecurso, onAbrirAsistencia }: Readonly<TarjetaCriterioPorRevisarProps>) {
    const tag = obtenerTagEspecialista(item.codigo, item.titulo, item.que_observar);

    return (
        <div className="space-y-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-sm font-bold text-slate-900">
                        {item.codigo}
                    </span>
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm font-semibold shadow-2xs ${tag.clase}`}
                    >
                        <span>{tag.icono}</span>
                        <span>{tag.texto}</span>
                    </span>
                </div>
                {item.norma_base && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
                        {item.norma_base}
                    </span>
                )}
            </div>

            <h3 className="text-sm font-bold text-slate-900 sm:text-base">{item.titulo}</h3>

            {item.orientacion && (
                <div className="rounded-2xl border border-sky-200/70 bg-sky-50/70 p-3.5 text-sm text-sky-950">
                    <strong className="mb-1 block font-bold text-sky-900">Orientación para la verificación:</strong>
                    {item.orientacion}
                </div>
            )}

            <CajaNotasSubsanacion
                codigo={item.codigo}
                uuid={uuid}
                notaInicial={item.notas}
                placeholder="Escribe recordatorios para la verificación (ej. inspección pendiente con el especialista, fecha de visita)..."
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                {item.recursos_educativos && item.recursos_educativos.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => onAbrirRecurso(item)}
                        className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-slate-700 transition-colors hover:text-sky-700"
                    >
                        <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                        <span>Material técnico ({item.recursos_educativos.length})</span>
                    </button>
                ) : (
                    <span />
                )}

                <AccionesSolucionCriterio
                    asistencia={item.asistencia_tecnica}
                    codigoCriterio={item.codigo}
                    tituloCriterio={item.titulo}
                    queObservar={item.que_observar}
                    onAbrirAsistencia={onAbrirAsistencia}
                />
            </div>
        </div>
    );
}

interface SeccionPorRevisarProps {
    porRevisar: CriterioPorRevisarItem[];
    totalPorRevisar: number;
    uuid?: string;
    onAbrirRecurso: (item: { codigo: string; titulo: string; recursos_educativos?: RecursoEducativoData[] }) => void;
    onAbrirAsistencia: (asistencia: CriterioAsistencia) => void;
}

function SeccionPorRevisar({ porRevisar, totalPorRevisar, uuid, onAbrirRecurso, onAbrirAsistencia }: Readonly<SeccionPorRevisarProps>) {
    return (
        <section aria-labelledby="por-revisar-title" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                        <HelpCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 id="por-revisar-title" className="text-base font-bold text-slate-900 sm:text-lg">
                            Aspectos con Verificación Pendiente
                        </h2>
                        <p className="text-sm text-slate-500">Condiciones que requieren corroboración con un especialista calificado.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-sm font-bold text-sky-800">
                        {totalPorRevisar} por verificar
                    </span>
                    <Link
                        href={route('directorio.index')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-100"
                    >
                        <Store className="h-3.5 w-3.5 text-slate-500" />
                        <span>Directorio</span>
                    </Link>
                </div>
            </div>

            {porRevisar.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 italic">
                    No hay condiciones con verificación pendiente.
                </div>
            ) : (
                <div className="space-y-4">
                    {porRevisar.map((item) => (
                        <TarjetaCriterioPorRevisar
                            key={item.codigo}
                            item={item}
                            uuid={uuid}
                            onAbrirRecurso={onAbrirRecurso}
                            onAbrirAsistencia={onAbrirAsistencia}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

interface SeccionPuntosFuertesProps {
    cumpleDeclarado: NonNullable<ResumenProps['cumple_declarado']>;
    totalCumpleDeclarado: number;
}

function SeccionPuntosFuertes({ cumpleDeclarado, totalCumpleDeclarado }: Readonly<SeccionPuntosFuertesProps>) {
    return (
        <section aria-labelledby="cumple-title" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-success-700/10 text-success-800 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 id="cumple-title" className="text-base font-bold text-slate-900 sm:text-lg">
                            Puntos Fuertes del Establecimiento
                        </h2>
                        <p className="text-sm text-slate-500">Condiciones de seguridad que tu local ya cumple satisfactoriamente.</p>
                    </div>
                </div>
                <span className="bg-success-700/10 text-success-800 rounded-full border border-[#34C759]/25 px-3.5 py-1 text-sm font-bold">
                    {totalCumpleDeclarado} conformes
                </span>
            </div>

            {cumpleDeclarado.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 italic">
                    No se registraron declaraciones cumplidas aún.
                </div>
            ) : (
                <div className="space-y-3">
                    {cumpleDeclarado.map((item) => (
                        <div
                            key={item.codigo}
                            className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-2xs"
                        >
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-sm font-bold text-slate-900">
                                        {item.codigo}
                                    </span>
                                    <span className="bg-success-700/10 text-success-800 inline-flex items-center gap-1 rounded-full border border-[#34C759]/25 px-2.5 py-0.5 text-sm font-bold">
                                        <Check className="h-3 w-3 stroke-[3]" />
                                        Cumple declarado
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800 sm:text-sm">{item.titulo}</p>
                            </div>
                            {item.norma_base && <span className="hidden shrink-0 text-sm text-slate-400 sm:inline-block">{item.norma_base}</span>}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

interface SeccionModalidadTramiteProps {
    modalidadTramite: ReturnType<typeof resolverModalidadTramite>;
    esModalidadExAnte: boolean;
    uuid: string;
    onAbrirHojaModelo: () => void;
}

function SeccionModalidadTramite({ modalidadTramite, esModalidadExAnte, uuid, onAbrirHojaModelo }: Readonly<SeccionModalidadTramiteProps>) {
    if (!modalidadTramite) return null;

    return (
        <section aria-labelledby="modalidad-tramite-title" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${modalidadTramite.contenido.iconoClases}`}>
                    <modalidadTramite.contenido.icono className="h-5 w-5" />
                </div>
                <div>
                    <h2 id="modalidad-tramite-title" className="text-sm font-black text-slate-500">
                        Modalidad de Trámite Municipal
                    </h2>
                    <p className="text-sm font-bold text-slate-900">{modalidadTramite.contenido.titulo}</p>
                </div>
            </div>

            <p className="text-sm leading-relaxed text-slate-700">{modalidadTramite.contenido.mensaje}</p>

            <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-500">Plazo legal de subsanación</p>
                    <p className="text-sm font-bold text-slate-800">{modalidadTramite.contenido.plazo}</p>
                    {'detallePlazo' in modalidadTramite.contenido && (
                        <p className="text-sm leading-snug text-slate-600">
                            {(modalidadTramite.contenido as { detallePlazo?: string }).detallePlazo}
                        </p>
                    )}
                </div>
            </div>

            {'reprogramacion' in modalidadTramite.contenido && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div className="space-y-0.5">
                        <p className="text-sm font-bold text-amber-900">Regla de diligencia y reprogramación</p>
                        <p className="text-sm leading-snug text-amber-900">
                            {(modalidadTramite.contenido as { reprogramacion?: string }).reprogramacion}
                        </p>
                    </div>
                </div>
            )}

            {/* BOTONERA DE FORMATOS OFICIALES PARA MESA DE PARTES */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="space-y-0.5">
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        <FileText className="h-3.5 w-3.5 text-slate-600" />
                        Plantillas de Formatos Normativos (D.S. N° 002-2018-PCM)
                    </h3>
                    <p className="text-sm leading-tight text-slate-500">
                        Plantillas orientativas de autoevaluación para preparar tu documentación previa al trámite municipal.
                    </p>
                </div>

                {!esModalidadExAnte ? (
                    /* MODALIDAD EX-POST: ANEXO 4 ES EL PRINCIPAL */
                    <div className="space-y-2 pt-1">
                        <div className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3">
                            <div className="flex items-center justify-between gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/70 px-2 py-0.5 text-sm font-black text-emerald-800">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                                    Requisito Principal Mesa de Partes
                                </span>
                                <span className="font-mono text-sm font-bold text-emerald-700">D.S. 002-2018-PCM</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-emerald-950">Declaración Jurada ITSE (Anexo 4)</h4>
                                <p className="mt-0.5 text-sm leading-tight text-emerald-800">
                                    Plantilla orientativa de trabajo basada en el Anexo 4 para orientar el trámite de Licencia de Funcionamiento con
                                    inspección técnica posterior.
                                </p>
                            </div>
                            <a
                                href={route('autoevaluacion.anexo', { uuid, numero: 4 })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-primary hover:bg-primary-700 flex w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-2xs transition"
                            >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Descargar / Imprimir Declaración Jurada (Anexo 4)</span>
                            </a>
                            <button
                                type="button"
                                onClick={onAbrirHojaModelo}
                                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-emerald-400 bg-white px-3.5 py-2 text-sm font-bold text-emerald-950 shadow-2xs transition hover:bg-emerald-50"
                            >
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Guía Visual de Llenado (Hoja Modelo Anexo 4)</span>
                            </button>
                        </div>

                        <a
                            href={route('autoevaluacion.anexo', { uuid, numero: 9 })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                        >
                            <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
                            <span>Ver Solicitud de ITSE (Anexo 9 — Opcional)</span>
                        </a>
                    </div>
                ) : (
                    /* MODALIDAD EX-ANTE: BLOQUEO DE ANEXO 4 + SOLICITUD ANEXO 9 + CHECKLIST EXPEDIENTE TÉCNICO */
                    <div className="space-y-3 pt-1">
                        {/* Alerta de bloqueo normativo de Anexo 4 */}
                        <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-sm text-amber-950">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                                <span>No aplica Declaración Jurada (Anexo 4)</span>
                            </div>
                            <p className="text-sm leading-snug text-amber-900">
                                Por normativa peruana (D.S. N° 002-2018-PCM), los locales de <strong>Riesgo Alto o Muy Alto</strong> no pueden
                                presentar Anexo 4. Requieren inspección técnica multidisciplinaria previa antes de la emisión de la Licencia.
                            </p>
                        </div>

                        {/* Botón destacado Solicitud de ITSE Previa (Anexo 9) */}
                        <div className="space-y-2 rounded-xl border border-sky-300 bg-sky-50/90 p-3">
                            <div className="flex items-center justify-between gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-200/70 px-2 py-0.5 text-sm font-black text-sky-800">
                                    <FileCheck className="h-3 w-3 text-sky-700" />
                                    Requisito Principal Mesa de Partes
                                </span>
                                <span className="font-mono text-sm font-bold text-sky-700">ITSE Previa</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-sky-950">Solicitud de ITSE Previa (Anexo 9)</h4>
                                <p className="mt-0.5 text-sm leading-tight text-sky-800">
                                    Plantilla orientativa de trabajo basada en el formato de solicitud para la programación de inspección técnica
                                    multidisciplinaria.
                                </p>
                            </div>
                            <a
                                href={route('autoevaluacion.anexo', { uuid, numero: 9 })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-bold text-white shadow-2xs transition hover:bg-sky-700"
                            >
                                <ClipboardList className="h-3.5 w-3.5" />
                                <span>Descargar Solicitud de ITSE Previa (Anexo 9)</span>
                            </a>
                            <button
                                type="button"
                                onClick={onAbrirHojaModelo}
                                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-sky-400 bg-white px-3.5 py-2 text-sm font-bold text-sky-950 shadow-2xs transition hover:bg-sky-50"
                            >
                                <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                                <span>Guía Visual de Llenado (Hoja Modelo Anexo 1 / 9)</span>
                            </button>
                        </div>

                        {/* Tarjeta de Checklist de Requisitos del Expediente Técnico */}
                        <div className="space-y-2.5 rounded-xl border border-slate-300 bg-white p-3.5 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                                    <Files className="h-3.5 w-3.5 text-slate-600" />
                                    Expediente Técnico Requerido (ITSE Previa)
                                </h4>
                                <span className="font-mono text-sm font-bold text-slate-500">D.S. 002-2018-PCM</span>
                            </div>
                            <p className="text-sm leading-tight text-slate-600">
                                Para admitir a trámite su solicitud de ITSE Previa en Mesa de Partes (Huancayo), debe adjuntar la documentación
                                técnica firmada por profesionales colegiados:
                            </p>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                                        1
                                    </span>
                                    <span className="leading-snug">
                                        <strong>Planos de arquitectura (Escala 1/100 o 1/50):</strong> Distribución arquitectónica y memoria
                                        descriptiva con cálculo reglamentario de aforo, suscritos por{' '}
                                        <strong>Arquitecto colegiado y habilitado (CAP)</strong>.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                                        2
                                    </span>
                                    <span className="leading-snug">
                                        <strong>Planos y diagramas unifilares:</strong> Planos de instalaciones eléctricas, tableros y cuadro de
                                        cargas suscritos por{' '}
                                        <strong>Ingeniero Electricista o Mecánico-Electricista colegiado y habilitado (CIP).</strong>
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                                        3
                                    </span>
                                    <span className="leading-snug">
                                        <strong>Protocolo de puesta a tierra (≤ 25 Ω):</strong> Protocolo de medición vigente firmado por{' '}
                                        <strong>Ingeniero Electricista/Mecánico-Electricista colegiado habilitado (CIP)</strong> con constancia de
                                        calibración del telurómetro.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                                        4
                                    </span>
                                    <span className="leading-snug">
                                        <strong>Plan de Seguridad en Defensa Civil:</strong> Foliado y firmado en todas sus páginas por el
                                        administrado y profesional competente, incluyendo planos de señalización y evacuación.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                                        5
                                    </span>
                                    <span className="leading-snug">
                                        <strong>Certificados de operatividad y específicos:</strong> Constancias vigentes de extintores (PQS / Clase K
                                        si tiene cocina) y pruebas de hermeticidad de GLP si aplica a su giro.
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                <Link
                    href={route('autoevaluacion.informe', { uuid })}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-slate-800"
                >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Ver Informe Preventivo</span>
                </Link>
            </div>
        </section>
    );
}

interface SeccionPronosticoDiligenciaProps {
    esApto: boolean;
    tipoTramite?: string | null;
}

function SeccionPronosticoDiligencia({ esApto, tipoTramite }: Readonly<SeccionPronosticoDiligenciaProps>) {
    return (
        <section aria-label="Alcance de la orientación preventiva" className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Scale className="h-4 w-4 text-slate-600" />
                <h3 className="text-sm font-black text-slate-700">Alcance de esta orientación</h3>
            </div>

            {esApto ? (
                <div className="space-y-1 rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 text-sm text-emerald-950">
                    <strong className="block font-bold text-emerald-900">Condiciones declaradas sin pendientes:</strong>
                    <p>
                        Las condiciones declaradas se alinean con los requisitos técnicos exigidos para el trámite de ITSE (D.S. N° 002-2018-PCM).
                        Recuerda que este resultado no garantiza la aprobación oficial en la inspección física de la autoridad competente.
                    </p>
                </div>
            ) : (
                <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-sm text-amber-950">
                    <strong className="block font-bold text-amber-900">Condiciones Observadas por Subsanar:</strong>
                    <p>
                        En una diligencia municipal presencial, las observaciones no subsanadas dan lugar a un Acta de Diligencia con plazo de
                        subsanación de hasta {tipoTramite === 'EX_POST' ? '3 días' : '20 días'} hábiles. Te recomendamos corregirlas preventivamente
                        antes de tu trámite.
                    </p>
                </div>
            )}

            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-sm leading-snug text-rose-900">
                <strong className="mb-0.5 block font-bold text-rose-950">Advertencia de Denegatoria Inmediata:</strong>
                <p>
                    Incongruencia física grave de giro/riesgo o local no habilitado para operar causan denegatoria inmediata sin plazo (numeral 1.2.9
                    Manual CENEPRED).
                </p>
            </div>
        </section>
    );
}

interface SeccionCaracteristicasDeclaradasProps {
    caracteristicasDeclaradas: CaracteristicaDeclaradaItem[];
}

function SeccionCaracteristicasDeclaradas({ caracteristicasDeclaradas }: Readonly<SeccionCaracteristicasDeclaradasProps>) {
    if (caracteristicasDeclaradas.length === 0) return null;

    return (
        <section aria-label="Ficha de características declaradas">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="caracteristicas" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                    <AccordionTrigger className="px-5 py-4 text-left hover:no-underline">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <ClipboardList className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Características Físicas Declaradas ({caracteristicasDeclaradas.length})
                                </h3>
                                <p className="text-sm font-normal text-slate-500">Parámetros base usados para filtrar las condiciones aplicables.</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-slate-100 bg-slate-50/50 p-5">
                        <dl className="grid grid-cols-1 gap-2.5 text-sm">
                            {caracteristicasDeclaradas.map((caract) => (
                                <div key={caract.clave} className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                    <dt className="text-slate-600">{caract.etiqueta}</dt>
                                    <dd className="font-bold text-slate-900">{caract.texto}</dd>
                                </div>
                            ))}
                        </dl>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </section>
    );
}

interface SeccionCondicionesNoAplicablesProps {
    noAplica: NonNullable<ResumenProps['no_aplica']>;
}

function SeccionCondicionesNoAplicables({ noAplica }: Readonly<SeccionCondicionesNoAplicablesProps>) {
    if (noAplica.length === 0) return null;

    return (
        <section aria-label="Condiciones no aplicables">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="no-aplica" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                    <AccordionTrigger className="px-5 py-4 text-left hover:no-underline">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                                <ShieldAlert className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-700">Condiciones No Aplicables ({noAplica.length})</h3>
                                <p className="text-sm font-normal text-slate-400">Descartadas automáticamente por reglas del sistema.</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2.5 border-t border-slate-100 bg-slate-50/50 p-5">
                        {noAplica.map((item) => (
                            <div key={item.codigo} className="space-y-1 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-sm font-bold text-slate-800">{item.codigo}</span>
                                    <span className="text-sm text-slate-400">Excluido por motor</span>
                                </div>
                                <p className="font-semibold text-slate-800">{item.titulo}</p>
                                <p className="text-sm text-slate-500 italic">Razón: {item.motivo}</p>
                            </div>
                        ))}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </section>
    );
}

interface PieSelloValidezCivicaProps {
    autoevaluacion: ResumenProps['autoevaluacion'];
    esRegistrada: boolean;
    tieneUsuario: boolean;
    onConfirmarClick: (triggerElement: HTMLButtonElement) => void;
    resumen?: ResumenProps['resumen'];
}

function PieSelloValidezCivica({ autoevaluacion, esRegistrada, tieneUsuario, onConfirmarClick, resumen }: Readonly<PieSelloValidezCivicaProps>) {
    return (
        <footer
            aria-label="Sello de validez cívica y acciones finales"
            className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-100 shadow-xl sm:p-8"
        >
            <div className="flex flex-col items-center justify-between gap-6 border-b border-slate-800 pb-6 lg:flex-row">
                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                    <div className="flex w-28 shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950/60 p-3.5 text-center shadow-inner sm:w-32">
                        <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                            <ShieldCheck className="h-6 w-6 stroke-[2]" />
                        </div>
                        <span className="font-mono text-[9px] font-bold tracking-widest text-slate-400 uppercase">CÓDIGO DE REGISTRO</span>
                        <span className="mt-0.5 font-mono text-sm font-black tracking-wider text-emerald-400">
                            {autoevaluacion.codigo_acceso || 'CHK-ITSE'}
                        </span>
                    </div>

                    <div className="max-w-xl space-y-1.5">
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-800/80 bg-emerald-950/80 px-2.5 py-0.5 font-mono text-sm font-bold text-emerald-400">
                                <ShieldCheck className="h-3 w-3" />
                                {esRegistrada ? 'REGISTRO DE AUTOEVALUACIÓN FINALIZADO' : 'BORRADOR PREVENTIVO'}
                            </span>
                            <span className="font-mono text-sm text-slate-400">{esRegistrada ? 'VERSIÓN SELLADA' : 'FASE PREVIA'}</span>
                        </div>

                        <h3 className="text-base font-bold tracking-tight text-white">Diagnóstico Técnico Orientativo — CheckITSE Huancayo</h3>
                        <p className="text-sm leading-relaxed text-slate-400">
                            Registro de Autoevaluación Finalizado — Carácter Orientativo y No Vinculante (D.S. N° 002-2018-PCM / R.J. N°
                            016-2018-CENEPRED/J). No constituye certificado ITSE ni exime de la inspección in situ de la Municipalidad Provincial de
                            Huancayo.
                        </p>
                    </div>
                </div>

                {/* Acciones principales de cierre */}
                <div className="flex w-full shrink-0 flex-col gap-2.5 lg:w-auto">
                    {!esRegistrada ? (
                        <button
                            type="button"
                            onClick={(e) => onConfirmarClick(e.currentTarget)}
                            className="hover:bg-primary inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition"
                        >
                            <Lock className="h-4 w-4" />
                            <span>Confirmar y Registrar Autoevaluación</span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href={route('autoevaluacion.informe', { uuid: autoevaluacion.uuid })}
                                className="hover:bg-primary inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition"
                            >
                                <FileText className="h-4 w-4" />
                                <span>Ver Informe Preventivo</span>
                            </Link>

                            {(resumen?.total_pendiente_atender ?? 0) > 0 && (
                                <Link
                                    href={route('autoevaluacion.subsanar_items', { uuid: autoevaluacion.uuid })}
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition hover:bg-amber-600 active:scale-95"
                                >
                                    <Wrench className="h-4 w-4" />
                                    <span>Subsanar Observaciones ({resumen?.total_pendiente_atender})</span>
                                </Link>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Link
                            href={route('autoevaluacion.checklist', { uuid: autoevaluacion.uuid })}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                        >
                            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                            <span>{esRegistrada ? 'Ver en checklist' : 'Editar checklist'}</span>
                        </Link>

                        {tieneUsuario && (
                            <>
                                <Link
                                    href={route('mis-autoevaluaciones')}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                                >
                                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Mis Autoevaluaciones</span>
                                </Link>

                                <Link
                                    href={route('mis-autoevaluaciones.expediente', { uuid: autoevaluacion.uuid })}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                                >
                                    <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Ver Expediente</span>
                                </Link>
                            </>
                        )}

                        {esRegistrada && (
                            <Link
                                href={route('autoevaluacion.reevaluar', { uuid: autoevaluacion.uuid })}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700/80 bg-emerald-950 px-3 py-1.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-900"
                            >
                                <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Reevaluar local</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Trazabilidad y Huella de Registro (si está registrada) */}
            {esRegistrada && autoevaluacion.hash_integridad && (
                <div className="mt-4 flex flex-col justify-between gap-3 pt-4 text-sm text-slate-400 sm:flex-row sm:items-center">
                    <CryptoSealBadge
                        hash={autoevaluacion.hash_integridad}
                        fecha={
                            autoevaluacion.registrada_at ? `Sellado: ${new Date(autoevaluacion.registrada_at).toLocaleString('es-PE')}` : undefined
                        }
                        esInmutable={true}
                    />
                    <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-300">
                        <strong className="text-emerald-400">Diagnóstico Inicial Inmutable:</strong> Este registro base está protegido
                        criptográficamente. Las subsanaciones posteriores se administran en su propio espacio operativo sin modificar el snapshot
                        inicial.
                    </div>
                </div>
            )}
        </footer>
    );
}

interface ModalConfirmacionRegistroProps {
    mostrar: boolean;
    modalRef: React.RefObject<HTMLDivElement | null>;
    cancelBtnRef: React.RefObject<HTMLButtonElement | null>;
    finalizando: boolean;
    errorFinalizar: string | null;
    pendientesFinalizar: FinalizarPendiente[];
    uuid: string;
    onCerrar: () => void;
    onConfirmar: () => void;
}

function ModalConfirmacionRegistro({
    mostrar,
    modalRef,
    cancelBtnRef,
    finalizando,
    errorFinalizar,
    pendientesFinalizar,
    uuid,
    onCerrar,
    onConfirmar,
}: Readonly<ModalConfirmacionRegistroProps>) {
    if (!mostrar) return null;

    return (
        <dialog
            open
            aria-labelledby="modal-confirmar-titulo"
            className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-slate-950/70 p-4 backdrop-blur-xs transition-opacity"
        >
            <div
                ref={modalRef}
                className="animate-in fade-in zoom-in-95 relative w-full max-w-lg space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl duration-150 sm:p-7"
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 id="modal-confirmar-titulo" className="text-lg font-bold text-slate-900">
                                Confirmar y Registrar Autoevaluación
                            </h2>
                            <p className="text-sm text-slate-500">Cierre formal e inmutable del diagnóstico técnico.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="cursor-pointer rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Cerrar modal"
                        disabled={finalizando}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-1.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>Atención: Acción Definitiva e Inmutable</span>
                    </div>
                    <p className="leading-relaxed">
                        Al registrar la autoevaluación, las declaraciones quedarán guardadas como una versión sellada y ya no podrán modificarse. Si
                        posteriormente deseas realizar cambios, podrás iniciar una reevaluación conservando este registro histórico.
                    </p>
                </div>

                {errorFinalizar && (
                    <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                            <p className="font-semibold">{errorFinalizar}</p>
                        </div>

                        {pendientesFinalizar.length > 0 && (
                            <ul className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-rose-100 bg-white/80 p-2.5">
                                {pendientesFinalizar.map((pendiente) => (
                                    <li key={pendiente.codigo} className="flex flex-col gap-0.5">
                                        <span className="font-mono text-sm font-bold text-rose-900">{pendiente.codigo}</span>
                                        <span className="text-rose-800">{pendiente.titulo}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <Link
                            href={route('autoevaluacion.checklist', { uuid })}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-sm font-bold text-rose-800 transition hover:bg-rose-50"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Volver al checklist para responder</span>
                        </Link>
                    </div>
                )}

                <div className="flex flex-col items-center justify-end gap-3 pt-2 sm:flex-row">
                    <button
                        ref={cancelBtnRef}
                        type="button"
                        onClick={onCerrar}
                        disabled={finalizando}
                        className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={finalizando}
                        className="bg-primary hover:bg-primary-700 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-xs transition disabled:opacity-50 sm:w-auto"
                    >
                        {finalizando ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Registrando...</span>
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                <span>Confirmar registro</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </dialog>
    );
}

export default function Resumen({
    autoevaluacion,
    resumen = {
        total_criterios_aplicables: 0,
        total_cumple_declarado: 0,
        total_pendiente_atender: 0,
        total_por_revisar: 0,
        total_no_aplica: 0,
    },
    pendiente_atender = [],
    por_revisar = [],
    cumple_declarado = [],
    no_aplica = [],
    desglose_especialidades = null,
    clasificacion_tramite = null,
}: Readonly<ResumenProps>) {
    const { auth } = usePage().props as { auth?: { user: { id?: number; name?: string; email?: string; [key: string]: unknown } | null } };
    const [mostrarModalGuardar, setMostrarModalGuardar] = useState<boolean>(false);
    const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState<boolean>(false);
    const [modalRecurso, setModalRecurso] = useState<{
        isOpen: boolean;
        recursos: RecursoEducativoData[];
        codigo?: string;
        titulo?: string;
    }>({
        isOpen: false,
        recursos: [],
    });
    const [finalizando, setFinalizando] = useState<boolean>(false);
    const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);
    const [pendientesFinalizar, setPendientesFinalizar] = useState<FinalizarPendiente[]>([]);
    const [criterioSeleccionadoParaAsistencia, setCriterioSeleccionadoParaAsistencia] = useState<CriterioAsistencia | null>(null);
    const [modalHojaModeloAbierto, setModalHojaModeloAbierto] = useState<boolean>(false);

    const triggerRef = useRef<HTMLElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!mostrarModalConfirmacion) return;

        const timer = setTimeout(() => {
            cancelBtnRef.current?.focus();
        }, 50);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (!finalizando) {
                    setMostrarModalConfirmacion(false);
                    setErrorFinalizar(null);
                }
                return;
            }
            manejarTrapFocoModal(event, modalRef.current);
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            restaurarFocoTrigger(triggerRef);
        };
    }, [mostrarModalConfirmacion, finalizando]);

    const esRegistrada = autoevaluacion?.estado === 'REGISTRADA';

    const modalidadTramite = useMemo(() => resolverModalidadTramite(clasificacion_tramite), [clasificacion_tramite]);

    const caracteristicasDeclaradas = useMemo(
        () => extraerCaracteristicasDeclaradas(autoevaluacion?.caracteristicas_declaradas),
        [autoevaluacion?.caracteristicas_declaradas],
    );

    const { totalAplicables, esApto, pctCumple, pctPendiente, pctRevisar } = calcularMetricasResumen(resumen);

    const nivelRiesgoTexto = useMemo(() => resolverNivelRiesgoTexto(clasificacion_tramite, resumen), [clasificacion_tramite, resumen]);

    const esRiesgoAlto = useMemo(
        () => determinarEsRiesgoAlto(clasificacion_tramite, resumen?.total_pendiente_atender),
        [clasificacion_tramite, resumen?.total_pendiente_atender],
    );

    const esModalidadExAnte = useMemo(() => determinarEsModalidadExAnte(clasificacion_tramite, esRiesgoAlto), [clasificacion_tramite, esRiesgoAlto]);

    const estimacionEconomica = useMemo(() => calcularEstimacionEconomica(pendiente_atender), [pendiente_atender]);

    const abrirRecurso = (item: { codigo: string; titulo: string; recursos_educativos?: RecursoEducativoData[] }) => {
        setModalRecurso({
            isOpen: true,
            recursos: item.recursos_educativos || [],
            codigo: item.codigo,
            titulo: item.titulo,
        });
    };

    const abrirAsistencia = (asistencia: CriterioAsistencia) => {
        setCriterioSeleccionadoParaAsistencia(asistencia);
    };

    const cerrarModalConfirmacion = () => {
        if (!finalizando) {
            setMostrarModalConfirmacion(false);
            setErrorFinalizar(null);
        }
    };

    const handleFinalizar = async () => {
        setFinalizando(true);
        setErrorFinalizar(null);
        setPendientesFinalizar([]);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

            const response = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/finalizar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                setMostrarModalConfirmacion(false);
                router.visit(window.location.pathname, {
                    replace: true,
                    preserveScroll: false,
                    preserveState: false,
                });
                return;
            }

            const data = await response.json().catch(() => null);
            const resultadoError = procesarErrorRespuestaFinalizar(response.status, data);
            setErrorFinalizar(resultadoError.error);
            setPendientesFinalizar(resultadoError.pendientes);
        } catch {
            setErrorFinalizar('No fue posible registrar la autoevaluación. Verifique su conexión e intente nuevamente.');
        } finally {
            setFinalizando(false);
        }
    };

    return (
        <>
            <Head title="Diagnóstico de Autoevaluación ITSE - CheckITSE Huancayo" />

            <div className="relative min-h-screen bg-slate-50/70 py-6 font-sans sm:py-8">
                {/* Capa de textura cuadriculada sutil */}

                <div className="relative mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {/* ========================================================================= */}
                    {/* BARRA SUPERIOR DE FLUJO CÍVICO                                            */}
                    {/* ========================================================================= */}
                    <BarraFlujoSuperiorResumen mostrarBotonGuardar={!auth?.user} onAbrirGuardar={() => setMostrarModalGuardar(true)} />

                    {/* ========================================================================= */}
                    {/* A. HERO BANNER DEL SEMÁFORO DE RIESGO (Subcomponente Modular)             */}
                    {/* ========================================================================= */}
                    <FlujoCiudadano actual={3} />
                    <ResumenHeader
                        nombreComercio={autoevaluacion?.nombre_comercio}
                        uuidTrazabilidad={autoevaluacion?.uuid}
                        nivelRiesgo={nivelRiesgoTexto}
                        tipoTramite={clasificacion_tramite?.tipo_tramite}
                        estado={autoevaluacion.estado}
                        fechaEmision={formatearFechaEmisionHero(autoevaluacion?.registrada_at)}
                        codigoAcceso={autoevaluacion?.codigo_acceso ?? undefined}
                        funcionEconomica={autoevaluacion?.funcion_economica ?? undefined}
                        direccion={autoevaluacion?.direccion ?? undefined}
                        ruc={autoevaluacion?.ruc ?? undefined}
                        esApto={esApto}
                        hashIntegridad={autoevaluacion?.hash_integridad}
                        esRegistrada={esRegistrada}
                    />

                    {/* ========================================================================= */}
                    {/* B. BARRA DE SALUD TÉCNICA Y MÉTRICAS PROPORCIONALES (Bento Superior)       */}
                    {/* ========================================================================= */}
                    <AvisoPreventivo />
                    <section aria-labelledby="proximo-paso" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <h2 id="proximo-paso" className="text-xl font-semibold">
                            ¿Cómo continúo?
                        </h2>
                        <p className="mt-2 text-base text-slate-600">
                            {resumen.total_pendiente_atender > 0 || resumen.total_por_revisar > 0
                                ? 'Empieza por las condiciones pendientes y luego revisa las que no pudiste confirmar. Este orden organiza tus respuestas; no es una prioridad normativa.'
                                : 'Revisa tus declaraciones y conserva el registro cuando estés listo. Declarar que cumple no equivale a una aprobación oficial.'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <Link
                                href={`/autoevaluacion/${autoevaluacion.uuid}/subsanar-items`}
                                className="bg-primary hover:bg-primary-700 inline-flex min-h-11 items-center rounded-xl px-5 py-3 text-base font-semibold text-white"
                            >
                                Ver qué atender
                            </Link>
                            <Link
                                href={route('autoevaluacion.expediente_digital', { uuid: autoevaluacion.uuid })}
                                className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-11 items-center rounded-xl px-5 py-3 text-base font-semibold text-white"
                            >
                                Preparar mi expediente
                            </Link>
                            <Link
                                href={`/autoevaluacion/${autoevaluacion.uuid}/checklist`}
                                className="inline-flex min-h-11 items-center rounded-xl border border-slate-400 px-5 py-3 text-base font-semibold"
                            >
                                {esRegistrada ? 'Consultar mis respuestas' : 'Revisar mis respuestas'}
                            </Link>
                        </div>
                    </section>
                    {(pendiente_atender.length > 0 || por_revisar.length > 0) && (
                        <LoQueTeFalta
                            items={[
                                ...pendiente_atender.map((item) => ({ ...item, estado: 'PENDIENTE_ATENDER' })),
                                ...por_revisar.map((item) => ({ ...item, estado: 'POR_REVISAR' })),
                            ].map((item) => ({ ...item, codigo: String(item.codigo ?? ''), titulo: String(item.titulo ?? '') }))}
                            nombreLocal={autoevaluacion?.nombre_comercio}
                        />
                    )}
                    <SeccionSaludTecnica
                        resumen={resumen}
                        totalAplicables={totalAplicables}
                        pctCumple={pctCumple}
                        pctPendiente={pctPendiente}
                        pctRevisar={pctRevisar}
                    />

                    {/* ========================================================================= */}
                    {/* B.2 DIAGNÓSTICO ANALÍTICO MULTIDIMENSIONAL (CENEPRED Anexo 17)            */}
                    {/* ========================================================================= */}
                    <DiagnosticoMultidimensional
                        desglose={desglose_especialidades}
                        pendientes={pendiente_atender}
                        porRevisar={por_revisar}
                        cumple={cumple_declarado}
                        clasificacion={clasificacion_tramite}
                        nombreComercio={autoevaluacion?.nombre_comercio}
                    />

                    {/* ========================================================================= */}
                    {/* C. LAYOUT BENTO GRID DE 2 COLUMNAS (Cuerpo Central)                       */}
                    {/* ========================================================================= */}
                    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                        {/* COLUMNA IZQUIERDA (60% - Ancha): PLAN DE SUBSANACIÓN, REVISIÓN Y CUMPLIMIENTO */}
                        <div className="space-y-6 lg:col-span-7">
                            <Tabs defaultValue="pendientes" className="w-full space-y-5">
                                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/70 p-1.5">
                                    <TabsTrigger
                                        value="pendientes"
                                        className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
                                    >
                                        <AlertTriangle className="text-warning-800 h-3.5 w-3.5" />
                                        <span>Por Subsanar ({resumen?.total_pendiente_atender ?? 0})</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="por-revisar"
                                        className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
                                    >
                                        <HelpCircle className="h-3.5 w-3.5 text-sky-600" />
                                        <span>Por Verificar ({resumen?.total_por_revisar ?? 0})</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="conformes"
                                        className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
                                    >
                                        <CheckCircle2 className="text-success-800 h-3.5 w-3.5" />
                                        <span>Declaradas ({resumen?.total_cumple_declarado ?? 0})</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="economico"
                                        className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
                                    >
                                        <Coins className="h-3.5 w-3.5 text-amber-600" />
                                        <span>Inversión vs Multas</span>
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="pendientes" className="space-y-5 focus-visible:outline-hidden">
                                    <SeccionPlanSubsanacion
                                        pendienteAtender={pendiente_atender}
                                        totalPendienteAtender={resumen?.total_pendiente_atender ?? 0}
                                        uuid={autoevaluacion?.uuid}
                                        onAbrirRecurso={abrirRecurso}
                                        onAbrirAsistencia={abrirAsistencia}
                                    />
                                </TabsContent>

                                <TabsContent value="por-revisar" className="space-y-5 focus-visible:outline-hidden">
                                    <SeccionPorRevisar
                                        porRevisar={por_revisar}
                                        totalPorRevisar={resumen?.total_por_revisar ?? 0}
                                        uuid={autoevaluacion?.uuid}
                                        onAbrirRecurso={abrirRecurso}
                                        onAbrirAsistencia={abrirAsistencia}
                                    />
                                </TabsContent>

                                <TabsContent value="conformes" className="space-y-5 focus-visible:outline-hidden">
                                    <SeccionPuntosFuertes
                                        cumpleDeclarado={cumple_declarado}
                                        totalCumpleDeclarado={resumen?.total_cumple_declarado ?? 0}
                                    />
                                </TabsContent>

                                <TabsContent value="economico" className="space-y-5 focus-visible:outline-hidden">
                                    <SeccionEstimadorEconomico
                                        pendienteAtenderCount={pendiente_atender.length}
                                        estimacionEconomica={estimacionEconomica}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* COLUMNA DERECHA (40% - Lateral): TRÁMITE, ESPECIALIDADES Y DESGLOSE */}
                        <div className="space-y-6 lg:col-span-5">
                            {/* 1. TARJETA MODALIDAD DE TRÁMITE MUNICIPAL */}
                            <SeccionModalidadTramite
                                modalidadTramite={modalidadTramite}
                                esModalidadExAnte={esModalidadExAnte}
                                uuid={autoevaluacion.uuid}
                                onAbrirHojaModelo={() => setModalHojaModeloAbierto(true)}
                            />

                            {/* 2. TARJETA DESGLOSE POR ESPECIALIDAD TÉCNICA */}
                            {desglose_especialidades && (
                                <section
                                    aria-labelledby="especialidades-title"
                                    className="space-y-3.5 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
                                >
                                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                            <Layers className="h-5 w-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <h2 id="especialidades-title" className="text-base font-bold text-slate-900">
                                                Desglose por Especialidad
                                            </h2>
                                            <p className="text-sm text-slate-500">Condiciones evaluadas por disciplina técnica ITSE.</p>
                                        </div>
                                    </div>

                                    <DesgloseEspecialidades desglose={desglose_especialidades} variante="detallada" />
                                </section>
                            )}

                            {/* 3. SIMULACIÓN ORIENTATIVA DE DILIGENCIA */}
                            <SeccionPronosticoDiligencia esApto={esApto} tipoTramite={clasificacion_tramite?.tipo_tramite} />

                            {/* 4. CARACTERÍSTICAS FÍSICAS DECLARADAS (Acordeón colapsable) */}
                            <SeccionCaracteristicasDeclaradas caracteristicasDeclaradas={caracteristicasDeclaradas} />

                            {/* 5. CONDICIONES NO APLICABLES (Acordeón colapsable sutil) */}
                            <SeccionCondicionesNoAplicables noAplica={no_aplica} />
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* D. SELLO DE VALIDEZ CÍVICA Y CIERRE EJECUTIVO (Pie de Página)             */}
                    {/* ========================================================================= */}
                    <PieSelloValidezCivica
                        autoevaluacion={autoevaluacion}
                        esRegistrada={esRegistrada}
                        tieneUsuario={Boolean(auth?.user)}
                        resumen={resumen}
                        onConfirmarClick={(triggerElement) => {
                            triggerRef.current = triggerElement;
                            setErrorFinalizar(null);
                            setMostrarModalConfirmacion(true);
                        }}
                    />
                </div>
            </div>

            {/* Modal de Confirmación de Registro Formal */}
            <ModalConfirmacionRegistro
                mostrar={mostrarModalConfirmacion}
                modalRef={modalRef}
                cancelBtnRef={cancelBtnRef}
                finalizando={finalizando}
                errorFinalizar={errorFinalizar}
                pendientesFinalizar={pendientesFinalizar}
                uuid={autoevaluacion.uuid}
                onCerrar={cerrarModalConfirmacion}
                onConfirmar={handleFinalizar}
            />

            {/* Modales Auxiliares */}
            <ModalGuardarProgreso
                isOpen={mostrarModalGuardar}
                onClose={() => setMostrarModalGuardar(false)}
                uuid={autoevaluacion?.uuid}
                establecimiento={autoevaluacion?.nombre_comercio}
                destino="resumen"
            />

            <RecursoEducativoModal
                isOpen={modalRecurso.isOpen}
                onClose={() => setModalRecurso((prev) => ({ ...prev, isOpen: false }))}
                recursos={modalRecurso.recursos}
                criterioCodigo={modalRecurso.codigo}
                criterioTitulo={modalRecurso.titulo}
            />

            <NubeAsistenciaModal
                isOpen={criterioSeleccionadoParaAsistencia !== null}
                onClose={() => setCriterioSeleccionadoParaAsistencia(null)}
                criterio={criterioSeleccionadoParaAsistencia}
            />

            <HojaModeloAnexo
                isOpen={modalHojaModeloAbierto}
                onClose={() => setModalHojaModeloAbierto(false)}
                autoevaluacion={autoevaluacion}
                clasificacion={clasificacion_tramite}
                resumen={resumen}
                condicionesConformes={cumple_declarado.map((c) => ({
                    codigo: c.codigo,
                    nombre: c.titulo,
                    norma: c.norma_base ?? undefined,
                }))}
            />
        </>
    );
}
