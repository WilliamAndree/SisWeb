import { CUENTAS } from '../support/e2e';

/** E2E-01 · Autenticación: rechaza credenciales incorrectas, ingresa y cierra sesión. */
describe('E2E-01 · Autenticación de usuarios', () => {
    // La base se reinicia antes de cada intento: un reintento no hereda los cambios del anterior.
    beforeEach(() => cy.prepararBase());

    it('rechaza una contraseña incorrecta', () => {
        cy.visit('/login');
        cy.get('#email').type(CUENTAS.emprendedora.correo);
        cy.get('#password').type('clave-incorrecta');
        cy.get('form').find('button[type="submit"]').click();
        cy.location('pathname').should('eq', '/login');
        cy.get('#email').should('have.attr', 'aria-invalid', 'true');
        cy.screenshot('E2E-01-login-rechazado');
    });

    it('ingresa con una cuenta válida, ve su panel y cierra sesión', () => {
        cy.ingresar(CUENTAS.emprendedora.correo, CUENTAS.emprendedora.clave);
        cy.visit('/panel-ciudadano');
        cy.contains('Minimarket El Carmen').should('be.visible');
        cy.screenshot('E2E-01-panel-emprendedora');

        cy.get('button[aria-label="Cerrar sesión"]').click();
        cy.contains('a', 'Ingresar').should('be.visible');
    });
});
