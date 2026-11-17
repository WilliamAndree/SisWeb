/**
 * Cálculo de vigencia y renovación del certificado ITSE.
 *
 * Base: D.S. N° 002-2018-PCM, art. 15.4 (vigencia de 2 años desde la
 * expedición) y arts. 24 y 29 (la renovación se pide antes de que venza, con
 * solicitud, pago de la tasa y declaración jurada de que se mantienen las
 * condiciones). El aviso de 90 días es una recomendación práctica de CheckITSE,
 * no un plazo legal.
 */

export const ANIOS_VIGENCIA = 2;
export const DIAS_AVISO_RENOVACION = 90;

export type EstadoCertificado = 'vigente' | 'renovar-pronto' | 'vencido';

export interface VigenciaCertificado {
    vencimiento: Date;
    diasRestantes: number;
    estado: EstadoCertificado;
    /** Fecha sugerida para empezar a preparar la renovación. */
    inicioRenovacion: Date;
}

const MS_DIA = 24 * 60 * 60 * 1000;

/** Convierte "AAAA-MM-DD" (valor de <input type="date">) a fecha local sin hora. */
export function leerFecha(valor: string): Date | null {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (!partes) return null;
    const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function calcularVigencia(expedicion: Date, hoy: Date = new Date()): VigenciaCertificado {
    const vencimiento = new Date(expedicion.getFullYear() + ANIOS_VIGENCIA, expedicion.getMonth(), expedicion.getDate());
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const diasRestantes = Math.round((vencimiento.getTime() - hoySinHora.getTime()) / MS_DIA);
    const inicioRenovacion = new Date(vencimiento.getTime() - DIAS_AVISO_RENOVACION * MS_DIA);

    let estado: EstadoCertificado = 'vigente';
    if (diasRestantes < 0) estado = 'vencido';
    else if (diasRestantes <= DIAS_AVISO_RENOVACION) estado = 'renovar-pronto';

    return { vencimiento, diasRestantes, estado, inicioRenovacion };
}

function fechaIcs(fecha: Date): string {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}${mm}${dd}`;
}

/** Evento de calendario (.ics) de todo el día, con alarma una semana antes. */
export function generarRecordatorioIcs(nombreLocal: string, inicioRenovacion: Date, vencimiento: Date): string {
    const siguiente = new Date(inicioRenovacion.getTime() + MS_DIA);
    const local = nombreLocal.trim() || 'mi local';
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CheckITSE Huancayo//Renovacion ITSE//ES',
        'BEGIN:VEVENT',
        `UID:renovacion-itse-${fechaIcs(vencimiento)}-${local.replace(/[^a-zA-Z0-9]/g, '')}@checkitse`,
        `DTSTAMP:${fechaIcs(new Date())}T000000Z`,
        `DTSTART;VALUE=DATE:${fechaIcs(inicioRenovacion)}`,
        `DTEND;VALUE=DATE:${fechaIcs(siguiente)}`,
        `SUMMARY:Preparar renovación del certificado ITSE de ${local}`,
        `DESCRIPTION:Tu certificado ITSE vence el ${vencimiento.toLocaleDateString('es-PE')}. Revisa tu local en CheckITSE y solicita la renovación en tu municipalidad antes de esa fecha.`,
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Renovación ITSE',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}
