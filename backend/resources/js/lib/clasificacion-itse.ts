/**
 * Clasificación orientativa de la modalidad de ITSE (posterior o previa).
 *
 * Es un espejo exacto de `App\Services\ItseRiskService::clasificarTramite()`,
 * que es la fuente de verdad del servidor. Existe solo para dar una respuesta
 * inmediata en el navegador (portada y formulario de datos) sin enviar nada.
 * Si cambia una regla, se cambia primero en el servicio PHP y luego aquí; la
 * prueba `tests/Frontend/clasificacion-itse.test.mjs` fija los mismos casos.
 *
 * Base normativa: Matriz de Riesgos del Manual de Ejecución de ITSE
 * (R.J. N° 016-2018-CENEPRED/J), que aplica el D.S. N° 002-2018-PCM.
 *  - Comercio (función 7.1): hasta 3 pisos y hasta 750 m² → riesgo bajo/medio.
 *  - Factores adicionales: GLP > 0.45 m³ (118.18 gal) o uso de caldero elevan el riesgo.
 */

export type ModalidadItse = 'EX_POST' | 'EX_ANTE';

export interface DatosClasificacion {
    funcion?: string | null;
    areaM2?: number | null;
    pisos?: number | null;
    aforo?: number | null;
    usaGlp?: boolean | null;
    galonesGlp?: number | null;
    usaCaldero?: boolean | null;
    usaLiquidosInflamables?: boolean | null;
}

export interface ClasificacionItse {
    modalidad: ModalidadItse;
    /** Mismo valor que `nivel_riesgo` del servidor. */
    nivel: 'BAJO_MEDIO' | 'ALTO_MUY_ALTO';
    motivos: string[];
}

export const LIMITES_ITSE = {
    comercioAreaMaxima: 750,
    comercioPisosMaximos: 3,
    especialAreaMaxima: 500,
    especialPisosMaximos: 2,
    especialAforoMaximo: 100,
    glpGalonesMaximos: 118.18,
} as const;

/** Funciones cuya escala se evalúa con los umbrales especiales del servidor. */
export const FUNCIONES_ESCALA_ESPECIAL = ['Salud', 'Educacion', 'Hospedaje', 'Industrial', 'Encuentro'] as const;

export const FUNCIONES_ECONOMICAS: ReadonlyArray<{ valor: string; etiqueta: string; ejemplos: string }> = [
    { valor: 'Comercio', etiqueta: 'Comercio', ejemplos: 'Bodegas, tiendas, farmacias, bazares' },
    { valor: 'Encuentro', etiqueta: 'Encuentro', ejemplos: 'Restaurantes, cafeterías, bares' },
    { valor: 'Hospedaje', etiqueta: 'Hospedaje', ejemplos: 'Hoteles, hostales' },
    { valor: 'Salud', etiqueta: 'Salud', ejemplos: 'Consultorios, clínicas, laboratorios' },
    { valor: 'Educacion', etiqueta: 'Educación', ejemplos: 'Academias, nidos, colegios' },
    { valor: 'Industrial', etiqueta: 'Industrial', ejemplos: 'Talleres, carpinterías, fábricas' },
    { valor: 'Oficinas', etiqueta: 'Oficinas', ejemplos: 'Oficinas y servicios administrativos' },
];

function limitesFisicos(funcion: string, area: number | null, pisos: number | null, aforo: number | null): string[] {
    if (funcion === 'Comercio') {
        const motivos: string[] = [];
        if (pisos !== null && pisos > LIMITES_ITSE.comercioPisosMaximos) {
            motivos.push(`Supera los ${LIMITES_ITSE.comercioPisosMaximos} pisos de altura (${pisos} pisos registrados).`);
        }
        if (area !== null && area > LIMITES_ITSE.comercioAreaMaxima) {
            motivos.push(`Supera los ${LIMITES_ITSE.comercioAreaMaxima} m² de área techada (${area} m² registrados).`);
        }
        return motivos;
    }

    const esEspecial = (FUNCIONES_ESCALA_ESPECIAL as ReadonlyArray<string>).includes(funcion);
    const superaEscala =
        (area !== null && area > LIMITES_ITSE.especialAreaMaxima) ||
        (pisos !== null && pisos > LIMITES_ITSE.especialPisosMaximos) ||
        (aforo !== null && aforo > LIMITES_ITSE.especialAforoMaximo);

    return esEspecial && superaEscala ? [`La función '${funcion}' clasifica en Riesgo Alto por su escala/aforo.`] : [];
}

function factoresAgravantes(datos: DatosClasificacion): string[] {
    const motivos: string[] = [];
    const galones = datos.galonesGlp ?? 0;

    if (datos.usaCaldero) {
        motivos.push('Presencia de caldero en el establecimiento.');
    }
    if (datos.usaGlp && galones > LIMITES_ITSE.glpGalonesMaximos) {
        motivos.push('Almacenamiento de GLP superior a 118.18 galones (0.45 m³).');
    } else if (datos.usaGlp && galones <= 0) {
        motivos.push('Uso de GLP comercial reportado.');
    }
    if (datos.usaLiquidosInflamables) {
        motivos.push('Almacenamiento o manipulación de líquidos combustibles o reactivos inflamables.');
    }

    return motivos;
}

function numeroONulo(valor: number | null | undefined): number | null {
    return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

export function clasificarItse(datos: DatosClasificacion): ClasificacionItse {
    const motivos = [
        ...limitesFisicos(datos.funcion || 'Comercio', numeroONulo(datos.areaM2), numeroONulo(datos.pisos), numeroONulo(datos.aforo)),
        ...factoresAgravantes(datos),
    ];
    const esPrevia = motivos.length > 0;

    return {
        modalidad: esPrevia ? 'EX_ANTE' : 'EX_POST',
        nivel: esPrevia ? 'ALTO_MUY_ALTO' : 'BAJO_MEDIO',
        motivos,
    };
}

/** Convierte el texto de un input numérico en número o `null` si está vacío o es inválido. */
export function leerNumero(valor: string | number | null | undefined): number | null {
    if (valor === null || valor === undefined || valor === '') return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
}

export const TEXTO_MODALIDAD: Record<ModalidadItse, { titulo: string; resumen: string }> = {
    EX_POST: {
        titulo: 'ITSE posterior a la licencia',
        resumen: 'Tramitas tu licencia de funcionamiento con una declaración jurada y la inspección se hace después.',
    },
    EX_ANTE: {
        titulo: 'ITSE previa a la licencia',
        resumen: 'Necesitas una inspección favorable antes de que te otorguen la licencia de funcionamiento.',
    },
};
