/**
 * Cómo se "ve" cada criterio pendiente: foto, nombre corto para el emprendedor
 * y especialidad del directorio que lo vende o instala.
 *
 * Se resuelve primero por código del catálogo normativo (CRIT-xx) y, si el
 * código no es conocido, por palabras del título.
 */

export type IconoItem =
    | 'extintor'
    | 'senal'
    | 'electricidad'
    | 'luz'
    | 'botiquin'
    | 'gas'
    | 'escalera'
    | 'estante'
    | 'alarma'
    | 'cocina'
    | 'caldero'
    | 'aforo';

export interface VisualItem {
    nombreCorto: string;
    imagen: string | null;
    icono: IconoItem;
    /** Valor de `categoria` en el directorio de aliados. */
    especialidad: 'incendios' | 'electricas' | 'arquitectura_senaletica' | 'estructuras' | null;
}

const POR_CODIGO: Record<string, VisualItem> = {
    'CRIT-01': { nombreCorto: 'Extintor con carga vigente', imagen: '/images/extintor.webp', icono: 'extintor', especialidad: 'incendios' },
    'CRIT-02A': { nombreCorto: 'Extintor Clase K para cocina', imagen: '/images/cocina-comercial.webp', icono: 'extintor', especialidad: 'incendios' },
    'CRIT-02B': {
        nombreCorto: 'Señales de seguridad y evacuación',
        imagen: '/images/salida-emergencia.webp',
        icono: 'senal',
        especialidad: 'arquitectura_senaletica',
    },
    'CRIT-03': {
        nombreCorto: 'Rutas de evacuación libres',
        imagen: '/images/salida-emergencia.webp',
        icono: 'senal',
        especialidad: 'arquitectura_senaletica',
    },
    'CRIT-04': { nombreCorto: 'Puertas de salida sin trabas', imagen: '/images/salida-emergencia.webp', icono: 'senal', especialidad: 'estructuras' },
    'CRIT-05': {
        nombreCorto: 'Pozo a tierra con certificado',
        imagen: '/images/tablero-electrico.webp',
        icono: 'electricidad',
        especialidad: 'electricas',
    },
    'CRIT-06': {
        nombreCorto: 'Tablero eléctrico con tapa y diferencial',
        imagen: '/images/tablero-electrico.webp',
        icono: 'electricidad',
        especialidad: 'electricas',
    },
    'CRIT-07': {
        nombreCorto: 'Cables protegidos en canaletas',
        imagen: '/images/tablero-electrico.webp',
        icono: 'electricidad',
        especialidad: 'electricas',
    },
    'CRIT-08': { nombreCorto: 'Luces de emergencia', imagen: '/images/luz-emergencia.webp', icono: 'luz', especialidad: 'incendios' },
    'CRIT-09': { nombreCorto: 'Botiquín de primeros auxilios', imagen: '/images/botiquin.webp', icono: 'botiquin', especialidad: null },
    'CRIT-10': { nombreCorto: 'Instalación segura de gas', imagen: '/images/balon-gas.webp', icono: 'gas', especialidad: null },
    'CRIT-11': { nombreCorto: 'Escaleras con pasamanos', imagen: '/images/escalera-pasamanos.webp', icono: 'escalera', especialidad: 'estructuras' },
    'CRIT-12': { nombreCorto: 'Cartel de aforo', imagen: null, icono: 'aforo', especialidad: 'arquitectura_senaletica' },
    'CRIT-13': { nombreCorto: 'Estantes anclados a la pared', imagen: '/images/estanteria.webp', icono: 'estante', especialidad: 'estructuras' },
    'CRIT-14A': {
        nombreCorto: 'Espacio libre frente al tablero',
        imagen: '/images/tablero-electrico.webp',
        icono: 'electricidad',
        especialidad: 'electricas',
    },
    'CRIT-14B': { nombreCorto: 'Materiales lejos del calor', imagen: '/images/extintor.webp', icono: 'extintor', especialidad: 'incendios' },
    'CRIT-15': { nombreCorto: 'Detectores y alarma contra incendios', imagen: null, icono: 'alarma', especialidad: 'incendios' },
    'CRIT-16': { nombreCorto: 'Campana extractora de cocina', imagen: '/images/cocina-comercial.webp', icono: 'cocina', especialidad: null },
    'CRIT-17': { nombreCorto: 'Caldero revisado', imagen: null, icono: 'caldero', especialidad: null },
};

const POR_PALABRA: ReadonlyArray<[RegExp, string]> = [
    [/clase k/i, 'CRIT-02A'],
    [/extintor/i, 'CRIT-01'],
    [/señal|senal|evacuaci/i, 'CRIT-02B'],
    [/pozo|tierra/i, 'CRIT-05'],
    [/tablero|cable|el[ée]ctric/i, 'CRIT-06'],
    [/luz|luces|emergencia/i, 'CRIT-08'],
    [/botiqu/i, 'CRIT-09'],
    [/glp|gas/i, 'CRIT-10'],
    [/escaler/i, 'CRIT-11'],
    [/estanter|mobiliario/i, 'CRIT-13'],
    [/alarma|detector|humo/i, 'CRIT-15'],
];

const GENERICO: VisualItem = { nombreCorto: '', imagen: null, icono: 'senal', especialidad: null };

export function visualDeItem(codigo?: string | null, titulo?: string | null): VisualItem {
    if (codigo && POR_CODIGO[codigo]) return POR_CODIGO[codigo];
    const coincidencia = POR_PALABRA.find(([patron]) => patron.test(titulo ?? ''));
    if (coincidencia) return POR_CODIGO[coincidencia[1]];
    return { ...GENERICO, nombreCorto: titulo ?? 'Condición por atender' };
}

/** Enlace de WhatsApp con un mensaje ya escrito sobre lo que le falta al local. */
export function enlaceWhatsapp(numero: string, producto: string, local?: string | null): string | null {
    const limpio = numero.replace(/\D/g, '');
    if (limpio.length < 9) return null;
    const conPais = limpio.startsWith('51') ? limpio : `51${limpio}`;
    const paraLocal = local ? ` para mi local "${local}"` : '';
    const mensaje = `Hola, vi su negocio en CheckITSE. Necesito cotizar: ${producto}${paraLocal} en Huancayo.`;
    return `https://wa.me/${conPais}?text=${encodeURIComponent(mensaje)}`;
}

/** Mapa de un punto exacto (coordenadas que registró el propio proveedor). */
export function mapaPunto(latitud: number, longitud: number): { embed: string; abrir: string } {
    const punto = `${latitud},${longitud}`;
    return {
        embed: `https://www.google.com/maps?q=${punto}&z=17&output=embed`,
        abrir: `https://www.google.com/maps/dir/?api=1&destination=${punto}`,
    };
}

/** Mapa para un proveedor: punto exacto si lo registró, si no, su zona. */
export function mapaProveedor(p: { latitud?: number | null; longitud?: number | null; sede?: string | null }): {
    embed: string;
    abrir: string;
    exacto: boolean;
} {
    if (typeof p.latitud === 'number' && typeof p.longitud === 'number') {
        return { ...mapaPunto(p.latitud, p.longitud), exacto: true };
    }
    return { ...mapaZona(p.sede || 'Huancayo'), exacto: false };
}

/** Búsqueda de Google Maps por zona. No requiere clave de API. */
export function mapaZona(zona: string): { embed: string; abrir: string } {
    const consulta = `${zona}, Huancayo, Junín, Perú`;
    return {
        embed: `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&z=14&output=embed`,
        abrir: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`,
    };
}
