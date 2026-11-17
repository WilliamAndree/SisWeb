import assert from 'node:assert/strict';
import test from 'node:test';
import { detectarRubro, resolverFotoNegocio } from '../../resources/js/lib/imagen-negocio.ts';

test('el nombre del negocio manda sobre la función económica genérica', () => {
    assert.equal(detectarRubro('BillyEssences', 'Comercio'), 'perfumeria');
    assert.equal(detectarRubro('Perfumería Aroma Andino', 'Comercio'), 'perfumeria');
    assert.equal(detectarRubro('Botica San Juan', 'Comercio'), 'farmacia');
    assert.equal(detectarRubro('Café Wanka', 'Encuentro'), 'restaurante');
});

test('sin pistas en el nombre se usa la función económica', () => {
    assert.equal(detectarRubro('Mi negocio', 'Comercio'), 'bodega');
    assert.equal(detectarRubro('Local 12', 'Encuentro'), 'restaurante');
    assert.equal(detectarRubro('Local 12', 'Hospedaje'), 'general');
});

test('la perfumería usa la foto propia de perfumes', () => {
    assert.equal(resolverFotoNegocio('BillyEssences', 'Comercio', 'uuid-1'), '/images/local-perfumeria.webp');
});

test('palabras cortas solo coinciden como palabra completa', () => {
    assert.equal(detectarRubro('Bodega España', 'Comercio'), 'bodega');
    assert.equal(detectarRubro('Relax Spa', 'Comercio'), 'salon');
});
