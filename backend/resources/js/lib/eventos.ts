/**
 * Avisa al servidor que un cliente contactó a un proveedor o eligió su
 * producto. Así el proveedor ve en su cuenta cuánto interés genera.
 * Nunca interrumpe al cliente: si falla, se ignora.
 */
export type TipoEvento = 'clic_whatsapp' | 'clic_mapa' | 'eleccion';

function tokenXsrf(): string {
    const cookie = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='));
    return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : '';
}

export function registrarEvento(tipo: TipoEvento, datos: { ofertaId?: number; proveedor?: string }): void {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    try {
        void fetch('/eventos-proveedor', {
            method: 'POST',
            keepalive: true,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': tokenXsrf() },
            body: JSON.stringify({ tipo, oferta_id: datos.ofertaId ?? null, proveedor: datos.proveedor ?? null }),
        }).catch(() => undefined);
    } catch {
        // Las estadísticas no deben afectar la experiencia del cliente.
    }
}
