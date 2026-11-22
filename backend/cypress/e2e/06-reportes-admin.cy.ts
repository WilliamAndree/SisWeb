import { CUENTAS } from '../support/e2e';

/** E2E-06 · Módulo de reportes: indicadores con datos de la base, filtros y exportación. */
describe('E2E-06 · Reportes de impacto (administración)', () => {
    // La base se reinicia antes de cada intento: un reintento no hereda los cambios del anterior.
    beforeEach(() => {
        cy.prepararBase();
        cy.ingresar(CUENTAS.admin.correo, CUENTAS.admin.clave);
    });

    it('muestra los indicadores, filtra por distrito y exporta a CSV', () => {
        const desde = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
        cy.visit(`/admin/reportes?desde=${desde}`);
        cy.get('[data-cy="kpi-locales"]')
            .invoke('text')
            .then((total) => {
                expect(Number(total)).to.be.greaterThan(0);
                cy.screenshot('E2E-06-reportes', { capture: 'fullPage' });

                cy.get('select[name="distrito"]').select('El Tambo');
                cy.contains('button', 'Aplicar filtros').click();
                cy.location('search').should('include', 'distrito=El');
                cy.get('[data-cy="kpi-locales"]')
                    .invoke('text')
                    .should((filtrado) => {
                        expect(Number(filtrado)).to.be.lessThan(Number(total));
                    });
            });
        cy.get('[data-cy="tabla-condiciones"] tbody tr').should('have.length.greaterThan', 0);
        cy.screenshot('E2E-06-reportes-filtrado');

        cy.contains('a', 'Descargar CSV')
            .invoke('attr', 'href')
            .then((href) => {
                cy.request(String(href)).then((respuesta) => {
                    expect(respuesta.status).to.eq(200);
                    expect(respuesta.body).to.contain('Preparación al evaluar (%)');
                });
            });
    });
});
