import assert from 'node:assert/strict';
import test from 'node:test';
import { clasificarItse, leerNumero } from '../../resources/js/lib/clasificacion-itse.ts';

// Casos espejo de ItseRiskService::clasificarTramite() (fuente de verdad en el servidor).
test('comercio de 3 pisos y 750 m² sigue en ITSE posterior', () => {
    const r = clasificarItse({ funcion: 'Comercio', areaM2: 750, pisos: 3, aforo: 400 });
    assert.equal(r.modalidad, 'EX_POST');
    assert.equal(r.nivel, 'BAJO_MEDIO');
    assert.deepEqual(r.motivos, []);
});

test('comercio que supera pisos o área pasa a ITSE previa con ambos motivos', () => {
    const r = clasificarItse({ funcion: 'Comercio', areaM2: 751, pisos: 4 });
    assert.equal(r.modalidad, 'EX_ANTE');
    assert.equal(r.motivos.length, 2);
});

test('funciones especiales usan 500 m², 2 pisos o 100 personas', () => {
    assert.equal(clasificarItse({ funcion: 'Encuentro', aforo: 100 }).modalidad, 'EX_POST');
    assert.equal(clasificarItse({ funcion: 'Encuentro', aforo: 101 }).modalidad, 'EX_ANTE');
    assert.equal(clasificarItse({ funcion: 'Salud', pisos: 3 }).modalidad, 'EX_ANTE');
    assert.equal(clasificarItse({ funcion: 'Educacion', areaM2: 501 }).modalidad, 'EX_ANTE');
    assert.equal(clasificarItse({ funcion: 'Oficinas', areaM2: 2000, pisos: 9 }).modalidad, 'EX_POST');
});

test('GLP: sin cantidad o sobre 118.18 gal agrava; cantidad pequeña declarada no', () => {
    assert.equal(clasificarItse({ usaGlp: true }).modalidad, 'EX_ANTE');
    assert.equal(clasificarItse({ usaGlp: true, galonesGlp: 10 }).modalidad, 'EX_POST');
    assert.equal(clasificarItse({ usaGlp: true, galonesGlp: 118.19 }).modalidad, 'EX_ANTE');
});

test('caldero y líquidos inflamables agravan siempre', () => {
    assert.equal(clasificarItse({ usaCaldero: true }).modalidad, 'EX_ANTE');
    assert.equal(clasificarItse({ usaLiquidosInflamables: true }).modalidad, 'EX_ANTE');
});

test('leerNumero ignora vacíos y valores no numéricos', () => {
    assert.equal(leerNumero(''), null);
    assert.equal(leerNumero('abc'), null);
    assert.equal(leerNumero('12.5'), 12.5);
});
