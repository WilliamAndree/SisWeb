/**
 * E2E-03 · Proceso principal del negocio: un emprendedor registra su local, responde la
 * lista de condiciones (dejando una pendiente) y obtiene su resultado.
 */
describe('E2E-03 · Evaluación de un local (proceso principal)', () => {
    // La base se reinicia antes de cada intento: un reintento no hereda los cambios del anterior.
    beforeEach(() => cy.prepararBase());

    it('registra el local, responde las condiciones y ve su resultado', () => {
        cy.visit('/autoevaluacion/nueva');

        // Paso 1: el negocio. El tipo se elige con una tarjeta y define qué se pregunta después.
        cy.get('#est-nombre').type('Bodega Cypress');
        cy.get('[data-cy="rubro-bodega"]').click();
        cy.get('#est-distrito').select('Huancayo');
        cy.get('#est-ruc').type('10456789123');
        cy.get('form').find('button[type="submit"]').click();

        // Paso 2: cómo es el local (solo las preguntas de una bodega, todas en "No").
        cy.get('#est-area').type('60');
        cy.get('#est-pisos').type('1');
        cy.get('#est-aforo').type('12');
        // Solo las preguntas visibles: «Otras situaciones» está plegada y ya viene en «No».
        cy.get('form fieldset:visible').each(($grupo) => {
            cy.wrap($grupo).contains('button', /^No$/).click();
        });
        cy.get('form').find('button[type="submit"]').click();
        cy.location('pathname', { timeout: 20000 }).should('match', /\/autoevaluacion\/[\w-]+\/checklist$/);

        // Responde todas las condiciones de cada especialidad: la primera queda pendiente.
        let primera = true;
        cy.get('nav[aria-label="Especialidades normadas de la verificación"] button').each(($tab) => {
            cy.wrap($tab).click();
            cy.get('[role="radiogroup"]').each(($opciones) => {
                const indice = primera ? 1 : 0;
                primera = false;
                cy.wrap($opciones).find('label').eq(indice).click();
            });
        });
        cy.screenshot('E2E-03-condiciones-respondidas');

        cy.contains('button', 'Ver Resumen y Diagnóstico Final').should('not.be.disabled').click();
        cy.location('pathname', { timeout: 20000 }).should('match', /\/resumen$/);
        cy.contains('Así está tu local').should('be.visible');
        cy.contains('dt', 'Falta')
            .parent()
            .find('dd')
            .invoke('text')
            .then((texto) => {
                expect(Number(texto.trim())).to.be.greaterThan(0);
            });
        cy.screenshot('E2E-03-resultado');
    });
});
