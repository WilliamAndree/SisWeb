import { CUENTAS, UUID_MARIA } from '../support/e2e';

/** E2E-05 · Registro y eliminación de información: subir y quitar un documento del expediente. */
describe('E2E-05 · Expediente digital: subir y eliminar un documento', () => {
    // La base se reinicia antes de cada intento: un reintento no hereda los cambios del anterior.
    beforeEach(() => {
        cy.prepararBase();
        cy.ingresar(CUENTAS.emprendedora.correo, CUENTAS.emprendedora.clave);
    });

    it('sube la declaración jurada firmada y luego la elimina', () => {
        cy.visit(`/autoevaluacion/${UUID_MARIA}/expediente-digital`);
        cy.get('[data-cy="documento-declaracion_jurada"]').as('tarjeta');

        // Tras subir, la página se recarga: se espera esa recarga antes de seguir.
        cy.intercept('GET', '**/expediente-digital').as('recarga');
        cy.get('@tarjeta').find('input[type="file"]').selectFile('cypress/fixtures/declaracion-firmada.png', { force: true });
        cy.wait('@recarga');
        cy.get('@tarjeta').contains('Listo').should('be.visible');
        cy.screenshot('E2E-05-documento-subido');

        cy.get('@tarjeta').find('[data-cy="quitar-documento"]').click();
        cy.get('@tarjeta').contains('button', 'Sí, eliminar').click();
        cy.wait('@recarga');
        cy.get('@tarjeta').contains('Listo').should('not.exist');
        cy.screenshot('E2E-05-documento-eliminado');
    });
});
