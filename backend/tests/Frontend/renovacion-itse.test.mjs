import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularVigencia, generarRecordatorioIcs, leerFecha } from '../../resources/js/lib/renovacion-itse.ts';

test('el certificado vence 2 años después de su expedición', () => {
    const v = calcularVigencia(new Date(2025, 2, 10), new Date(2026, 0, 1));
    assert.equal(v.vencimiento.getFullYear(), 2027);
    assert.equal(v.vencimiento.getMonth(), 2);
    assert.equal(v.vencimiento.getDate(), 10);
    assert.equal(v.estado, 'vigente');
});

test('a 90 días o menos del vencimiento toca renovar pronto', () => {
    assert.equal(calcularVigencia(new Date(2024, 11, 1), new Date(2026, 9, 1)).estado, 'renovar-pronto');
    assert.equal(calcularVigencia(new Date(2024, 0, 1), new Date(2026, 0, 2)).estado, 'vencido');
});

test('leerFecha acepta solo AAAA-MM-DD', () => {
    assert.equal(leerFecha('2025-03-10')?.getDate(), 10);
    assert.equal(leerFecha('10/03/2025'), null);
    assert.equal(leerFecha(''), null);
});

test('el recordatorio .ics es un evento de calendario válido', () => {
    const ics = generarRecordatorioIcs('Perfumería Billy', new Date(2026, 11, 10), new Date(2027, 2, 10));
    assert.match(ics, /^BEGIN:VCALENDAR/);
    assert.match(ics, /DTSTART;VALUE=DATE:20261210/);
    assert.match(ics, /SUMMARY:Preparar renovación del certificado ITSE de Perfumería Billy/);
    assert.match(ics, /END:VCALENDAR$/);
});
