/**
 * Respaldo normativo y científico de CheckITSE.
 *
 * Fuente única para la página /respaldo-cientifico y para docs/respaldo-cientifico.md.
 * Para agregar una referencia basta con añadir una entrada: la página la agrupa
 * por `tipo` y la enlaza con los módulos que sustenta.
 *
 * Los datos bibliográficos se tomaron de la primera página de cada documento.
 */

export type TipoReferencia = 'normativa' | 'articulo' | 'tesis';

export type ModuloSisWeb = 'clasificacion' | 'checklist' | 'croquis' | 'evidencias' | 'subsanacion' | 'autoevaluacion';

export interface Referencia {
    id: string;
    tipo: TipoReferencia;
    titulo: string;
    /** Traducción al español cuando el título original está en otro idioma. */
    tituloEs?: string;
    autores: string;
    anio: number;
    fuente: string;
    doi?: string;
    /** Qué aporta a CheckITSE, en lenguaje sencillo. */
    aporte: string;
    modulos: ModuloSisWeb[];
}

export const MODULOS: Record<ModuloSisWeb, { nombre: string; descripcion: string }> = {
    clasificacion: { nombre: 'Clasificación del trámite', descripcion: 'Define si tu ITSE es posterior o previa a la licencia.' },
    autoevaluacion: { nombre: 'Autoevaluación guiada', descripcion: 'El emprendedor revisa su propio local antes de la visita oficial.' },
    checklist: { nombre: 'Checklist de condiciones', descripcion: 'Solo muestra los criterios que aplican a tu local.' },
    croquis: { nombre: 'Croquis y rutas de evacuación', descripcion: 'Dibuja tu local y verifica que las salidas estén conectadas.' },
    evidencias: { nombre: 'Evidencias con IA', descripcion: 'Analiza tus fotos para orientar qué mejorar.' },
    subsanacion: { nombre: 'Subsanación', descripcion: 'Organiza y registra las mejoras pendientes.' },
};

export const REFERENCIAS: Referencia[] = [
    {
        id: 'ds-002-2018-pcm',
        tipo: 'normativa',
        titulo: 'Decreto Supremo N° 002-2018-PCM — Nuevo Reglamento de Inspecciones Técnicas de Seguridad en Edificaciones',
        autores: 'Presidencia del Consejo de Ministros',
        anio: 2018,
        fuente: 'Diario Oficial El Peruano',
        aporte: 'Regula la ITSE, la ECSE y la VISE, y define cuándo la inspección es previa o posterior a la licencia de funcionamiento.',
        modulos: ['clasificacion', 'checklist'],
    },
    {
        id: 'rj-016-2018-cenepred',
        tipo: 'normativa',
        titulo: 'Resolución Jefatural N° 016-2018-CENEPRED/J — Manual de Ejecución de Inspección Técnica de Seguridad en Edificaciones',
        autores: 'CENEPRED',
        anio: 2018,
        fuente: 'Centro Nacional de Estimación, Prevención y Reducción del Riesgo de Desastres',
        aporte: 'Contiene la Matriz de Riesgos con cuatro niveles (bajo, medio, alto y muy alto) por función. CheckITSE usa sus umbrales: comercio de hasta 3 pisos y 750 m², y GLP mayor a 0,45 m³ como factor agravante.',
        modulos: ['clasificacion', 'checklist', 'autoevaluacion'],
    },
    {
        id: 'anexos-manual-itse',
        tipo: 'normativa',
        titulo: 'Anexos del Manual de ITSE: 1 (solicitud), 2 y 3 (nivel de riesgo), 4 (declaración jurada), 11 y 12 (actas), 16 (CIIU por función) y 17 (marco teórico)',
        autores: 'CENEPRED',
        anio: 2018,
        fuente: 'Anexos de la R.J. N° 016-2018-CENEPRED/J',
        aporte: 'Son los formatos oficiales del trámite. CheckITSE prellena la declaración jurada (Anexo 4) y organiza las observaciones subsanables como en el Anexo 12.',
        modulos: ['autoevaluacion', 'subsanacion'],
    },
    {
        id: 'ley-30619',
        tipo: 'normativa',
        titulo: 'Ley N° 30619 — Modifica la Ley N° 28976, Ley Marco de Licencia de Funcionamiento',
        autores: 'Congreso de la República',
        anio: 2017,
        fuente: 'Citada en el Manual de Ejecución de ITSE (CENEPRED, 2018)',
        aporte: 'Establece que el certificado de ITSE tiene una vigencia de 2 años desde su expedición.',
        modulos: ['clasificacion'],
    },
    {
        id: 'rne',
        tipo: 'normativa',
        titulo: 'Reglamento Nacional de Edificaciones (RNE) — Normas A.130 (requisitos de seguridad) y G.040 (definiciones)',
        autores: 'Ministerio de Vivienda, Construcción y Saneamiento',
        anio: 2006,
        fuente: 'Reglamento Nacional de Edificaciones',
        aporte: 'Define qué cuenta como "piso" y los requisitos de evacuación, señalización y protección contra incendios que revisa el checklist.',
        modulos: ['checklist', 'croquis'],
    },
    {
        id: 'pp-0068',
        tipo: 'normativa',
        titulo: 'Programa Presupuestal 0068 — Reducción de la Vulnerabilidad y Atención de Emergencias por Desastres',
        autores: 'Estado peruano (SINAGERD)',
        anio: 2010,
        fuente: 'Creado mediante el Decreto de Urgencia N° 024-2010',
        aporte: 'Enmarca la ITSE dentro de la política nacional de prevención: reducir la vulnerabilidad de las edificaciones antes de que ocurra una emergencia.',
        modulos: ['autoevaluacion'],
    },
    {
        id: 'terzi-2025',
        tipo: 'articulo',
        titulo: 'A BIM-Based Multi-Criteria Spatial Framework for Assessing Fire Risks in Indoor Environments',
        tituloEs: 'Marco espacial multicriterio basado en BIM para evaluar riesgos de incendio en interiores',
        autores: 'Terzi, A. F.; Aksu, K.; Koçyiğit, A.; Demirel, H.',
        anio: 2025,
        fuente: 'Fire, 8(9), 361',
        doi: '10.3390/fire8090361',
        aporte: 'Muestra que combinar la información espacial del local con varios criterios ponderados mejora la evaluación del riesgo de incendio. Sustenta el croquis y el análisis espacial.',
        modulos: ['croquis', 'clasificacion'],
    },
    {
        id: 'bai-2025',
        tipo: 'articulo',
        titulo: 'Evacuation Route Determination in Indoor Architectural Environments Based on Dynamic Fire Risk Assessment',
        tituloEs: 'Determinación de rutas de evacuación en interiores basada en la evaluación dinámica del riesgo de incendio',
        autores: 'Bai, J.; Lv, X.; Nie, L.; Fang, M.',
        anio: 2025,
        fuente: 'Buildings, 15(10), 1715',
        doi: '10.3390/buildings15101715',
        aporte: 'Modela el interior como un grafo y busca rutas de evacuación con un algoritmo A* mejorado, logrando cerca de un 70 % menos de riesgo por ruta. Sustenta la verificación de conectividad de salidas del croquis.',
        modulos: ['croquis'],
    },
    {
        id: 'yan-2025',
        tipo: 'articulo',
        titulo: 'Generative design for architectural spatial layouts: a review of technical approaches',
        tituloEs: 'Diseño generativo para la distribución espacial arquitectónica: una revisión de enfoques técnicos',
        autores: 'Yan, S.; Wu, C.; Zhang, Y.',
        anio: 2025,
        fuente: 'Journal of Asian Architecture and Building Engineering, 25(4), 2775–2795',
        doi: '10.1080/13467581.2025.2512235',
        aporte: 'Revisa técnicas para generar y evaluar distribuciones de ambientes de forma automática. Sustenta las sugerencias espaciales del editor de croquis.',
        modulos: ['croquis'],
    },
    {
        id: 'zhang-2019',
        tipo: 'articulo',
        titulo: 'Taking Advantage of Collective Intelligence and BIM-Based Virtual Reality in Fire Safety Inspection for Commercial and Public Buildings',
        tituloEs:
            'Inteligencia colectiva y realidad virtual basada en BIM para la inspección de seguridad contra incendios en edificios comerciales y públicos',
        autores: 'Zhang, D.; Zhang, J.; Xiong, H.; Cui, Z.; Lu, D.',
        anio: 2019,
        fuente: 'Applied Sciences, 9(23), 5068',
        doi: '10.3390/app9235068',
        aporte: 'Propone que los propios usuarios hagan inspecciones con una lista genérica derivada de 27 checklists oficiales, porque las inspecciones anuales no alcanzan para asegurar el cumplimiento continuo. Es la base de la autoevaluación ciudadana.',
        modulos: ['autoevaluacion', 'checklist'],
    },
    {
        id: 'khan-2020',
        tipo: 'articulo',
        titulo: 'Converging Technologies for Safety Planning and Inspection Information System of Portable Firefighting Equipment',
        tituloEs: 'Tecnologías convergentes para la planificación e inspección de equipos portátiles de extinción de incendios',
        autores: 'Khan, N.; Lee, D.; Baek, C.; Park, C.',
        anio: 2020,
        fuente: 'IEEE Access',
        doi: '10.1109/ACCESS.2020.3039512',
        aporte: 'Pasa de una inspección vertical (de arriba hacia abajo) a una voluntaria y transparente, verificando extintores con fotos y reconocimiento de texto. Sustenta el análisis de evidencias con IA.',
        modulos: ['evidencias', 'subsanacion'],
    },
    {
        id: 'hamida-2019',
        tipo: 'articulo',
        titulo: 'Fire Safety in the Built-Environment: A Case Study in a Residential Facility',
        tituloEs: 'Seguridad contra incendios en el entorno construido: estudio de caso en una edificación residencial',
        autores: 'Hamida, M. B.; Hassanain, M. A.',
        anio: 2019,
        fuente: 'Architecture Civil Engineering Environment, (2)',
        doi: '10.21307/ACEE-2019-020',
        aporte: 'Propone un checklist estandarizado de gestión de seguridad contra incendios. Encontró deficiencias en salidas, puertas cortafuego y extinción, que coinciden con las áreas que revisa CheckITSE.',
        modulos: ['checklist'],
    },
    {
        id: 'cruz-2021',
        tipo: 'tesis',
        titulo: 'Inspecciones técnicas de seguridad en las edificaciones: estudio de caso en el distrito de Santa Rosa de Quives 2019-2020',
        autores: 'Cruz Poma, M.',
        anio: 2021,
        fuente: 'Tesis de maestría en Gestión Pública, Escuela de Posgrado, Lima',
        aporte: 'Analiza cómo funciona la ITSE en un gobierno local peruano. Da contexto real del trámite que enfrenta un emprendedor.',
        modulos: ['clasificacion'],
    },
    {
        id: 'tello-2014',
        tipo: 'tesis',
        titulo: 'Desarrollo de un sistema virtual de autoevaluación para la carrera profesional de Enfermería de la UNAP',
        autores: 'Tello Sánchez, C.',
        anio: 2014,
        fuente: 'Informe de suficiencia, Universidad Nacional de la Amazonía Peruana, Iquitos',
        aporte: 'Antecedente peruano de un sistema web de autoevaluación guiada por criterios. Respalda el enfoque de CheckITSE.',
        modulos: ['autoevaluacion'],
    },
    {
        id: 'calla-2020',
        tipo: 'tesis',
        titulo: 'Implementación del sistema de gestión de seguridad basado en la Ley N° 29783 en la empresa Qoryayllu S.R.L. Cusco - 2019',
        autores: 'Calla Charrez, G. J.',
        anio: 2020,
        fuente: 'Tesis de pregrado, Universidad Nacional del Altiplano, Puno',
        aporte: 'Muestra cómo una empresa peruana organiza su seguridad con diagnóstico, plan y seguimiento. Es el mismo ciclo que siguen el checklist y la subsanación.',
        modulos: ['subsanacion'],
    },
];

export const ETIQUETA_TIPO: Record<TipoReferencia, string> = {
    normativa: 'Normativa peruana',
    articulo: 'Artículos científicos',
    tesis: 'Tesis y antecedentes',
};

export function enlaceDoi(doi: string): string {
    return `https://doi.org/${doi}`;
}
