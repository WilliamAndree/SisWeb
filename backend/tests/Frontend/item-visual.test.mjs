import assert from 'node:assert/strict';
import test from 'node:test';
import { enlaceWhatsapp, mapaZona, visualDeItem } from '../../resources/js/lib/item-visual.ts';

test('cada criterio conocido tiene nombre corto y especialidad', () => {
    assert.equal(visualDeItem('CRIT-01').imagen, '/images/extintor.webp');
    assert.equal(visualDeItem('CRIT-09').nombreCorto, 'Botiquín de primeros auxilios');
    assert.equal(visualDeItem('CRIT-05').especialidad, 'electricas');
});

test('un código desconocido se resuelve por palabras del título', () => {
    assert.equal(visualDeItem('X-99', 'Extintor especializado Clase K').nombreCorto, 'Extintor Clase K para cocina');
    assert.equal(visualDeItem(null, 'Algo raro').nombreCorto, 'Algo raro');
});

test('WhatsApp agrega el código de país y un mensaje con el producto', () => {
    const url = enlaceWhatsapp('964 112 233', 'Extintor con carga vigente', 'Perfumería Billy');
    assert.match(url, /^https:\/\/wa\.me\/51964112233\?text=/);
    assert.match(decodeURIComponent(url), /Extintor con carga vigente/);
    assert.equal(enlaceWhatsapp('123', 'x'), null);
});

test('el mapa busca la zona dentro de Huancayo sin clave de API', () => {
    const mapa = mapaZona('El Tambo');
    assert.match(mapa.embed, /output=embed/);
    assert.match(decodeURIComponent(mapa.abrir), /El Tambo, Huancayo/);
});
