import { defineConfig } from 'cypress';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Pruebas end-to-end de CheckITSE Huancayo.
 *
 * - Local y en CI corren contra una instancia aislada (APP_ENV=e2e, base sisweb_e2e),
 *   que la tarea "db:preparar" reinicia con datos conocidos antes de cada archivo de pruebas.
 * - La verificación posterior al despliegue (00-humo-despliegue) solo lee: se puede apuntar al
 *   servidor XAMPP con CYPRESS_BASE_URL=http://localhost:8081 sin tocar su base de datos.
 */
export default defineConfig({
    e2e: {
        baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://127.0.0.1:8010',
        specPattern: 'cypress/e2e/**/*.cy.ts',
        supportFile: 'cypress/support/e2e.ts',
        viewportWidth: 1366,
        viewportHeight: 900,
        // El servidor de pruebas de PHP atiende una petición a la vez: en equipos modestos conviene más margen.
        defaultCommandTimeout: 20000,
        pageLoadTimeout: 90000,
        // Las fuentes externas no influyen en la lógica: bloquearlas evita esperas por la red.
        blockHosts: ['fonts.bunny.net'],
        // Video en CI (evidencia descargable). En equipos con poca RAM se puede activar con CYPRESS_VIDEO=1.
        video: Boolean(process.env.CI || process.env.CYPRESS_VIDEO),
        screenshotOnRunFailure: true,
        screenshotsFolder: 'cypress/screenshots',
        videosFolder: 'cypress/videos',
        retries: { runMode: 1, openMode: 0 },
        setupNodeEvents(on) {
            on('task', {
                'db:preparar'() {
                    execSync('php artisan checkitse:e2e-preparar', { env: { ...process.env, APP_ENV: 'e2e' }, stdio: 'pipe' });
                    return null;
                },
            });

            // Resumen de la corrida (total, aprobadas, fallidas, tiempo) para el informe y el pipeline.
            on('after:run', (resultados) => {
                if (!resultados || !('totalTests' in resultados)) return;
                mkdirSync('cypress/reports', { recursive: true });
                writeFileSync(
                    `cypress/reports/${process.env.CYPRESS_REPORTE ?? 'resumen'}.json`,
                    JSON.stringify(
                        {
                            fecha: new Date().toISOString(),
                            navegador: `${resultados.browserName} ${resultados.browserVersion}`,
                            cypress: resultados.cypressVersion,
                            total: resultados.totalTests,
                            aprobadas: resultados.totalPassed,
                            fallidas: resultados.totalFailed,
                            pendientes: resultados.totalPending,
                            omitidas: resultados.totalSkipped,
                            duracion_ms: resultados.totalDuration,
                            escenarios: resultados.runs.flatMap((run) =>
                                run.tests.map((t) => ({
                                    archivo: run.spec.relative,
                                    titulo: t.title.join(' › '),
                                    estado: t.state,
                                    duracion_ms: t.duration,
                                    error: t.displayError ?? null,
                                })),
                            ),
                        },
                        null,
                        2,
                    ),
                );
            });
        },
    },
});
