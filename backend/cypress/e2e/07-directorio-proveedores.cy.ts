/** E2E-07 · Navegación entre módulos: de la portada al directorio y filtro por especialidad. */
describe('E2E-07 · Directorio de proveedores', () => {
    // La base se reinicia antes de cada intento: un reintento no hereda los cambios del anterior.
    beforeEach(() => cy.prepararBase());

    it('navega desde la portada y filtra proveedores por especialidad', () => {
        cy.visit('/');
        cy.get('header').contains('a', 'Aliados técnicos').click();
        cy.location('pathname').should('eq', '/directorio');

        cy.contains('fieldset button', 'Extintores').click();
        cy.location('search').should('include', 'categoria=incendios');
        cy.get('#proveedores ul > li').should('have.length.greaterThan', 0);
        cy.get('#proveedores ul > li').first().should('contain.text', 'Extintores');
        cy.screenshot('E2E-07-directorio-filtrado');
    });
});
