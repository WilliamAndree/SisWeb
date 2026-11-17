/**
 * Mapa centralizado de etiquetas de nivel de riesgo para presentación cívica ciudadana.
 */
export const MAPA_NIVEL_RIESGO: Record<string, string> = {
    BAJO: 'Riesgo bajo',
    MEDIO: 'Riesgo medio',
    BAJO_MEDIO: 'Riesgo bajo o medio',
    ALTO: 'Riesgo alto',
    MUY_ALTO: 'Riesgo muy alto',
    ALTO_MUY_ALTO: 'Riesgo alto o muy alto',
};

/**
 * Formatea un nivel de riesgo técnico a texto cívico legible.
 * Cualquier valor desconocido o ausente retorna 'Riesgo por definir', nunca el valor crudo.
 */
export function formatearNivelRiesgo(nivel?: string | null): string {
    if (!nivel) {
        return 'Riesgo por definir';
    }

    const normalizado = nivel.toUpperCase().trim().replace(/\s+/g, '_');
    return MAPA_NIVEL_RIESGO[normalizado] ?? 'Riesgo por definir';
}
