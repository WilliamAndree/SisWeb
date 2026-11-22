/// <reference types="cypress" />

/** Cuentas sembradas por E2eSeeder en la base sisweb_e2e. */
export const CUENTAS = {
    emprendedora: { correo: 'donamaria@huancayo.pe', clave: 'password123' },
    admin: { correo: 'admin@checkitse.local', clave: 'CheckItse2026!' },
};

/** Local de Doña María: registrado con 2 condiciones pendientes. */
export const UUID_MARIA = 'b1ffcd88-8b1a-4de7-aa5c-5aa8ac271b22';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /** Inicia sesión por el formulario real de /login. */
            ingresar(correo: string, clave: string): Chainable<void>;
            /** Reinicia la base de pruebas con los datos conocidos. */
            prepararBase(): Chainable<void>;
        }
    }
}

Cypress.Commands.add('ingresar', (correo: string, clave: string) => {
    cy.visit('/login');
    cy.get('#email').clear().type(correo);
    cy.get('#password').clear().type(clave, { log: false });
    cy.get('form').find('button[type="submit"]').click();
    cy.location('pathname', { timeout: 30000 }).should('not.eq', '/login');
});

Cypress.Commands.add('prepararBase', () => {
    cy.task('db:preparar', null, { timeout: 180000 });
});

// La pantalla de bienvenida de la portada solo aparece una vez por sesión: se omite en las pruebas.
Cypress.on('window:before:load', (ventana) => {
    ventana.sessionStorage.setItem('checkitse-entrada-vista', '1');
});
