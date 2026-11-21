/**
 * El servidor envía fechas en dos formatos: ISO 8601 ("2026-11-17T18:56:00-05:00")
 * y el formato peruano "17/11/2026 18:56". `new Date()` no entiende el segundo y
 * mostraba "Invalid Date"; aquí se leen ambos.
 */
export function leerFecha(valor?: string | null): Date | null {
    if (!valor) return null;
    const peruano = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(valor.trim());
    const fecha = peruano
        ? new Date(Number(peruano[3]), Number(peruano[2]) - 1, Number(peruano[1]), Number(peruano[4] ?? 0), Number(peruano[5] ?? 0))
        : new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** "17 de noviembre de 2026" (o null si no hay fecha válida). */
export function fechaLarga(valor?: string | null): string | null {
    const fecha = leerFecha(valor);
    return fecha ? fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
}

/** "17 nov. 2026, 18:56" (o null si no hay fecha válida). */
export function fechaConHora(valor?: string | null): string | null {
    const fecha = leerFecha(valor);
    return fecha
        ? fecha.toLocaleString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
        : null;
}
