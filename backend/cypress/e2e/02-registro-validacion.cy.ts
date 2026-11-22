/** E2E-02 · Registro de información y validación de formularios (crear cuenta). */
describe('E2E-02 · Registro de cuenta y validación del formulario', () => {
    // La base se reinicia antes de cada intento: un reintento no hereda los cambios del anterior.
    beforeEach(() => cy.prepararBase());

    it('no deja crear la cuenta si las contraseñas no coinciden', () => {
        cy.visit('/registro');
        cy.get('#name').type('Rosa Huamán');
        cy.get('#email').type('rosa.e2e@ejemplo.pe');
        cy.get('#password').type('ClaveSegura2026!');
        cy.get('#password_confirmation').type('OtraClave2026!');
        cy.contains('button', 'Crear mi cuenta').click();
        cy.location('pathname').should('eq', '/registro');
        cy.get('[aria-invalid="true"]').should('exist');
        cy.screenshot('E2E-02-registro-validacion');
    });

    it('crea la cuenta de emprendedor y queda con la sesión iniciada', () => {
        cy.visit('/registro');
        cy.get('#name').type('Rosa Huamán');
        cy.get('#email').type('rosa.e2e@ejemplo.pe');
        cy.get('#telefono').type('964123456');
        cy.get('#password').type('ClaveSegura2026!');
        cy.get('#password_confirmation').type('ClaveSegura2026!');
        cy.contains('button', 'Crear mi cuenta').click();
        cy.location('pathname').should('not.eq', '/registro');
        cy.get('button[aria-label="Cerrar sesión"]').should('exist');
        cy.screenshot('E2E-02-cuenta-creada');
    });
});
