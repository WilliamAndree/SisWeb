import { CUENTAS, UUID_MARIA } from '../support/e2e';

/**
 * E2E-04 · Actualización de registros: la emprendedora corrige una condición por su cuenta
 * (solo describiendo lo que hizo) y su resultado se actualiza; luego deshace la corrección.
 */
describe('E2E-04 · Corrección de lo que falta', () => {
    // La base se reinicia antes de cada intento: un reintento no hereda los cambios del anterior.
    beforeEach(() => {
        cy.prepararBase();
        cy.ingresar(CUENTAS.emprendedora.correo, CUENTAS.emprendedora.clave);
    });

    it('una corrección por cuenta propia actualiza el resumen y se puede deshacer', () => {
        cy.visit(`/autoevaluacion/${UUID_MARIA}/resumen`);
        cy.contains('dt', 'Falta').parent().find('dd').should('contain.text', '2');

        cy.visit(`/autoevaluacion/${UUID_MARIA}/subsanar-items`);
        cy.contains('button', 'Ya lo corregí').first().click();
        cy.get('#nota-subsanacion').type('Compré el extintor en una ferretería del centro y lo instalé.');
        cy.get('[role="dialog"]').find('button').last().click();
        cy.contains('Corregido').should('be.visible');
        cy.screenshot('E2E-04-corregido');

        cy.visit(`/autoevaluacion/${UUID_MARIA}/resumen`);
        cy.contains('dt', 'Falta').parent().find('dd').should('contain.text', '1');
        cy.contains('Corregiste 1 cosa').should('be.visible');
        cy.screenshot('E2E-04-resumen-actualizado');

        cy.visit(`/autoevaluacion/${UUID_MARIA}/subsanar-items`);
        cy.contains('button', 'Deshacer').click();
        cy.contains('button', 'Deshacer').should('not.exist');
        cy.visit(`/autoevaluacion/${UUID_MARIA}/resumen`);
        cy.contains('dt', 'Falta').parent().find('dd').should('contain.text', '2');
    });
});
