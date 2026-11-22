/**
 * E2E-00 · Verificación posterior al despliegue (solo lectura).
 * Se ejecuta contra el servidor XAMPP (CYPRESS_BASE_URL=http://localhost:8081) al terminar
 * scripts/desplegar-xampp.ps1 -Verificar, y también dentro del pipeline de CI.
 */
describe('E2E-00 · Verificación del despliegue', () => {
    it('la aplicación responde: salud, portada, directorio e ingreso', () => {
        cy.request('/up').its('status').should('eq', 200);

        cy.visit('/');
        cy.get('h1').should('contain.text', 'Abre tu negocio');
        cy.contains('a', 'Simular mi local gratis').should('have.attr', 'href').and('include', '/autoevaluacion/nueva');

        cy.visit('/directorio');
        // El título se anima al bajar: se comprueba que exista con su texto, no su animación.
        cy.get('#proveedores-titulo').should('contain.text', 'Proveedores');

        cy.visit('/login');
        cy.get('#email').should('be.visible');
        cy.screenshot('E2E-00-despliegue-login');
    });
});
