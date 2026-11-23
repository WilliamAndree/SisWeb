/**
 * Elige la foto de portada de un local según lo que realmente vende.
 *
 * Primero busca palabras clave en el NOMBRE del negocio ("BillyEssences" →
 * perfumería) y solo si no encuentra nada usa la función económica
 * ("Comercio" es demasiado amplio: una perfumería y una bodega son ambas
 * "Comercio"). Las fotos propias están en /public/images (ver CREDITOS.md);
 * las demás se sirven desde Unsplash.
 */

export type RubroNegocio = 'perfumeria' | 'farmacia' | 'salon' | 'restaurante' | 'bodega' | 'ropa' | 'oficina' | 'gimnasio' | 'taller' | 'general';

const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export const FOTOS_POR_RUBRO: Record<RubroNegocio, readonly string[]> = {
    perfumeria: ['/images/local-perfumeria.webp'],
    farmacia: ['/images/local-farmacia.webp'],
    salon: ['/images/local-salon.webp'],
    restaurante: [
        unsplash('photo-1555396273-367ea4eb4db5'),
        unsplash('photo-1517248135467-4c7edcad34c4'),
        unsplash('photo-1552566626-52f8b828add9'),
        unsplash('photo-1559339352-11d035aa65de'),
    ],
    bodega: [
        unsplash('photo-1578916171728-46686eac8d58'),
        unsplash('photo-1604719312566-8912e9227c6a'),
        unsplash('photo-1588964895597-cfccd6e2dbf9'),
        unsplash('photo-1534723452862-4c874018d66d'),
    ],
    ropa: [
        '/images/emprendedora-tienda.webp',
        unsplash('photo-1441986300917-64674bd600d8'),
        unsplash('photo-1472851294608-062f824d29cc'),
        unsplash('photo-1489987707025-afc232f7ea0f'),
    ],
    oficina: [
        unsplash('photo-1497366216548-37526070297c'),
        unsplash('photo-1497215728101-856f4ea42174'),
        unsplash('photo-1524758631624-e2822e304c36'),
    ],
    gimnasio: [unsplash('photo-1534438327276-14e5300c3a48'), unsplash('photo-1540497077202-7c8a3999166f')],
    taller: [unsplash('photo-1581091226825-a6a2a5aee158'), unsplash('photo-1586528116311-ad8dd3c8310d')],
    general: [
        unsplash('photo-1486406146926-c627a92ad1ab'),
        unsplash('photo-1497366811353-6870744d04b2'),
        unsplash('photo-1527192491265-7e15c55b1ed2'),
    ],
};

/** Orden importante: los rubros específicos se revisan antes que los genéricos. */
const PALABRAS_CLAVE: ReadonlyArray<[RubroNegocio, readonly string[]]> = [
    ['perfumeria', ['perfum', 'essence', 'esencia', 'fragan', 'aroma', 'cosmet', 'maquillaje', 'makeup', 'beauty store']],
    ['farmacia', ['farmac', 'botica', 'drogueria', 'pharma', 'salud', 'clinic', 'consultorio', 'dental', 'odontolog', 'laboratorio']],
    ['salon', ['salon', ' spa ', 'barber', 'peluquer', ' unas ', 'nail', 'estetica', 'belleza', 'beauty']],
    [
        'restaurante',
        [
            'restaurant',
            'comida',
            'cafe',
            'cafeter',
            'coffee',
            ' bar ',
            'panader',
            'pollería',
            'polleria',
            'cevich',
            'pizzer',
            'juguer',
            'snack',
            'encuentro',
        ],
    ],
    ['ropa', ['ropa', 'boutique', 'textil', 'calzado', ' moda', 'fashion', 'zapat']],
    ['gimnasio', ['gimnasio', 'gym', 'fitness', 'crossfit', 'deporte']],
    ['taller', ['taller', 'industrial', 'mecanic', 'carpinter', 'ferreter', 'almacen', 'metal']],
    ['oficina', ['oficina', 'consultor', 'estudio', 'notar', 'abogad', 'contab', 'academia', 'educacion']],
    ['bodega', ['bodega', 'market', 'abarrote', 'minimarket', 'tienda', 'comercio']],
];

function normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function detectarRubro(nombreComercio?: string | null, funcionEconomica?: string | null): RubroNegocio {
    const nombre = ` ${normalizar(nombreComercio ?? '')} `;
    const funcion = ` ${normalizar(funcionEconomica ?? '')} `;

    for (const fuente of [nombre, funcion]) {
        for (const [rubro, claves] of PALABRAS_CLAVE) {
            if (claves.some((clave) => fuente.includes(normalizar(clave)))) {
                return rubro;
            }
        }
    }
    return 'general';
}

function hashSeed(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash = Math.trunc(hash);
    }
    return Math.abs(hash);
}

export function resolverFotoNegocio(nombreComercio?: string | null, funcionEconomica?: string | null, seed?: string | number | null): string {
    const fotos = FOTOS_POR_RUBRO[detectarRubro(nombreComercio, funcionEconomica)];
    const indice = seed ? hashSeed(String(seed)) : 0;
    return fotos[indice % fotos.length];
}

/** Foto local de respaldo si una foto remota no carga (sin conexión o retirada). */
export const FOTO_RESPALDO = '/images/emprendedora-tienda.webp';

export function usarFotoRespaldo(evento: { currentTarget: HTMLImageElement }): void {
    const img = evento.currentTarget;
    if (!img.src.endsWith(FOTO_RESPALDO)) img.src = FOTO_RESPALDO;
}
