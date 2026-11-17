export type EstadoAnalisis = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'REQUIERE_REVISION' | 'FALLIDO';

export interface ResultadoAnalisisIAData {
    calidad_imagen: string;
    nivel_incertidumbre: string;
    elementos_detectados: { elemento: string; estado_visual: string; detalle: string }[];
    visual_observations: string[];
    not_observable: string[];
    photo_improvement_recommendations: string[];
    resumen_pedagogico: string;
    advertencia_legal: string;
}

export interface AnalisisEvidenciaItem {
    uuid: string;
    estado: EstadoAnalisis;
    mensaje_error: string | null;
    resultado: ResultadoAnalisisIAData | null;
}

const estados: EstadoAnalisis[] = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'REQUIERE_REVISION', 'FALLIDO'];
const objeto = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const texto = (value: unknown): string => (typeof value === 'string' ? value : '');
const lista = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

export function adaptarResultadoAnalisis(value: unknown, fuente: 'estado' | 'inicial'): ResultadoAnalisisIAData | null {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = objeto(value);
    return {
        calidad_imagen: texto(data.calidad_imagen) || 'NO_INFORMADA',
        nivel_incertidumbre: texto(data.nivel_incertidumbre) || 'NO_INFORMADA',
        elementos_detectados: Array.isArray(data.elementos_detectados)
            ? data.elementos_detectados.map(objeto).map((item) => ({
                  elemento: texto(item.element_name),
                  estado_visual: texto(item.visual_status),
                  detalle: texto(item.description),
              }))
            : [],
        visual_observations: lista(fuente === 'estado' ? data.observaciones_visuales : data.visual_observations),
        not_observable: lista(fuente === 'estado' ? data.no_observable : data.not_observable),
        photo_improvement_recommendations: lista(fuente === 'estado' ? data.recomendaciones_captura : data.photo_improvement_recommendations),
        resumen_pedagogico: texto(data.resumen_pedagogico),
        advertencia_legal: texto(data.advertencia_legal),
    };
}

export function adaptarAnalisis(value: unknown, fuente: 'estado' | 'inicial'): AnalisisEvidenciaItem | null {
    const data = objeto(value);
    const uuid = texto(fuente === 'estado' ? data.uuid_analisis : data.uuid);
    if (!uuid || !estados.includes(data.estado as EstadoAnalisis)) return null;
    return {
        uuid,
        estado: data.estado as EstadoAnalisis,
        mensaje_error: texto(data.mensaje_error) || null,
        resultado: adaptarResultadoAnalisis(data.resultado, fuente),
    };
}

export function esAnalisisTerminal(estado: EstadoAnalisis): boolean {
    return estado === 'COMPLETADO' || estado === 'REQUIERE_REVISION' || estado === 'FALLIDO';
}

export function mensajeErrorAnalisis(value: unknown, status?: number): string {
    if (status === 401 || status === 419) return 'Tu sesión venció. Vuelve a ingresar para continuar; no se ha cambiado tu declaración.';
    if (status === 403) return 'No tienes permiso para consultar este análisis.';
    const data = objeto(value);
    return (
        texto(data.mensaje) ||
        texto(data.message) ||
        'No fue posible consultar la orientación visual. Puedes reintentar sin volver a subir tu evidencia.'
    );
}

interface OpcionesSondeo {
    url: string;
    uuid: string;
    onResultado: (analisis: AnalisisEvidenciaItem) => void;
    onError: (mensaje: string) => void;
    fetcher?: typeof fetch;
    esperar?: (callback: () => void) => ReturnType<typeof setTimeout>;
}

/** Una petición a la vez; cancelar aborta también la petición en curso. */
export function sondearAnalisis({
    url,
    uuid,
    onResultado,
    onError,
    fetcher = fetch,
    esperar = (fn) => setTimeout(fn, 2000),
}: OpcionesSondeo): () => void {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let intentos = 0;
    const consultar = async () => {
        intentos++;
        try {
            const response = await fetcher(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
            const body: unknown = await response.json().catch(() => null);
            if (controller.signal.aborted) return;
            if (!response.ok && response.status < 500) {
                onError(mensajeErrorAnalisis(body, response.status));
                return;
            }
            if (response.ok) {
                const analisis = adaptarAnalisis(body, 'estado');
                if (!analisis || analisis.uuid !== uuid) {
                    onError('La respuesta del análisis no es válida. Actualiza la página para volver a consultar.');
                    return;
                }
                onResultado(analisis);
                if (esAnalisisTerminal(analisis.estado)) return;
            }
        } catch {
            if (controller.signal.aborted) return;
        }
        if (intentos >= 30) {
            onError('La consulta tardó más de lo esperado. Actualiza la página para consultar el estado; el análisis no se ha cancelado.');
            return;
        }
        timer = esperar(() => {
            void consultar();
        });
    };
    timer = esperar(() => {
        void consultar();
    });
    return () => {
        controller.abort();
        if (timer !== undefined) clearTimeout(timer);
    };
}
