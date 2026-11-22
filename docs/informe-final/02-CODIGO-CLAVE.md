# Código clave del proyecto (extraído del repositorio)

Repositorio: https://github.com/WilliamAndree/SisWeb · Cada bloque es el contenido real del archivo indicado.

## Configuración de Cypress

Archivo: `backend/cypress.config.ts`

```ts
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
        defaultCommandTimeout: 10000,
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
                    'cypress/reports/resumen.json',
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
```

## Comandos de apoyo de Cypress

Archivo: `backend/cypress/support/e2e.ts`

```ts
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
    cy.location('pathname').should('not.eq', '/login');
});

Cypress.Commands.add('prepararBase', () => {
    cy.task('db:preparar', null, { timeout: 180000 });
});

// La pantalla de bienvenida de la portada solo aparece una vez por sesión: se omite en las pruebas.
Cypress.on('window:before:load', (ventana) => {
    ventana.sessionStorage.setItem('checkitse-entrada-vista', '1');
});
```

## Escenario E2E-03 (proceso principal)

Archivo: `backend/cypress/e2e/03-evaluacion-local.cy.ts`

```ts
/**
 * E2E-03 · Proceso principal del negocio: un emprendedor registra su local, responde la
 * lista de condiciones (dejando una pendiente) y obtiene su resultado.
 */
describe('E2E-03 · Evaluación de un local (proceso principal)', () => {
    // La base se reinicia antes de cada intento: un reintento no hereda los cambios del anterior.
    beforeEach(() => cy.prepararBase());

    it('registra el local, responde las condiciones y ve su resultado', () => {
        cy.visit('/autoevaluacion/nueva');

        // Grupo 1: datos del local.
        cy.get('#est-nombre').type('Bodega Cypress');
        cy.get('#est-funcion').select('Comercio');
        cy.get('#est-ruc').type('10456789123');
        cy.get('form').find('button[type="submit"]').click();

        // Grupo 2: características físicas (todas las preguntas Sí/No en "No").
        cy.get('#est-area').type('60');
        cy.get('#est-pisos').type('1');
        cy.get('#est-aforo').type('12');
        // Solo las preguntas visibles: las de «¿Tu local tiene algo especial?» están plegadas.
        cy.get('form fieldset:visible').each(($grupo) => {
            cy.wrap($grupo).contains('button', /^No$/).click();
        });
        cy.get('form').find('button[type="submit"]').click();

        // Grupo 3: revisión y envío.
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
```

## Escenario E2E-04 (actualización de registros)

Archivo: `backend/cypress/e2e/04-correccion-pendientes.cy.ts`

```ts
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
```

## Escenario E2E-06 (reportes)

Archivo: `backend/cypress/e2e/06-reportes-admin.cy.ts`

```ts
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
```

## Pipeline de CI (GitHub Actions)

Archivo: `.github/workflows/tests.yml`

```yaml
name: tests

# Pipeline de integración continua (CI) de CheckITSE Huancayo.
#
#   1. pruebas     → pruebas PHP (Pest) con cobertura + matriz de monitoreo.
#   2. e2e         → pruebas end-to-end con Cypress contra la aplicación levantada en el runner.
#   3. sonarqube   → análisis estático y Quality Gate (solo si el servidor SonarQube es accesible:
#                    variable SONAR_HOST_URL y secreto SONAR_TOKEN). Si no, se ejecuta en el equipo
#                    del equipo con scripts/sonar.ps1 (SonarQube corre en Docker local).
#
# El despliegue (CD) lo hace el propio servidor XAMPP con scripts/desplegar-xampp.ps1: trae la
# versión de main que pasó este pipeline (el servidor no tiene IP pública para recibir un push).
#
# Se usa PHP 8.2, la misma versión del servidor XAMPP donde se despliega.

on:
  push:
    branches:
      - develop
      - main
  pull_request:
    branches:
      - develop
      - main

permissions:
  contents: read

jobs:
  pruebas:
    name: Pruebas PHP y cobertura
    runs-on: ubuntu-latest

    services:
      mariadb:
        image: mariadb:10.11
        env:
          MARIADB_ROOT_PASSWORD: root
          MARIADB_DATABASE: sisweb_testing
          MARIADB_USER: sisweb_testing
          MARIADB_PASSWORD: sisweb-ci-only
        ports:
          - 3306:3306
        options: >-
          --health-cmd="healthcheck.sh --connect --innodb_initialized"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=10

    env:
      DB_CONNECTION: mysql
      DB_HOST: 127.0.0.1
      DB_PORT: 3306
      APP_ENV: testing
      DB_DATABASE: sisweb_testing
      DB_USERNAME: sisweb_testing
      DB_PASSWORD: sisweb-ci-only

    defaults:
      run:
        working-directory: backend

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup PHP (misma versión que el servidor)
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: pdo_mysql, zip
          tools: composer:v2
          # PCOV mide cobertura mucho más rápido y con menos memoria que Xdebug.
          coverage: pcov
          ini-values: memory_limit=-1

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install Node Dependencies
        run: npm ci
        env:
          CYPRESS_INSTALL_BINARY: '0'

      - name: Build Assets
        run: npm run build

      - name: Install Dependencies
        run: composer install --no-interaction --prefer-dist --optimize-autoloader

      - name: Copy Environment File
        run: cp .env.testing.example .env.testing

      - name: Restrict Testing Account to Exact Database
        env:
          MYSQL_PWD: root
        run: |
          docker exec --interactive --env MYSQL_PWD "${{ job.services.mariadb.id }}" mariadb --user=root <<'SQL'
          REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'sisweb_testing'@'%';
          GRANT ALL PRIVILEGES ON `sisweb\_testing`.* TO 'sisweb_testing'@'%';
          SQL

      - name: Verify Testing Isolation
        run: php tests/preflight.php

      - name: Tests
        run: php -d memory_limit=-1 -d pcov.directory=app ./vendor/bin/pest --fail-on-risky --coverage-clover coverage.xml --log-junit junit.xml

      # Si algo falla, cada prueba fallida aparece como anotación con su nombre y mensaje.
      - name: Señalar pruebas fallidas
        if: failure() && hashFiles('backend/junit.xml') != ''
        run: |
          php -r '$x = simplexml_load_file("junit.xml"); foreach ($x->xpath("//testcase[failure or error]") as $t) { $m = (string) ($t->failure ?? $t->error); echo "::error title=".$t["class"]."::".$t["name"]." — ".str_replace(["\r","\n"], " ", substr($m, 0, 400)).PHP_EOL; }'

      # Matriz de doble entrada (procesos × indicadores) para el control y monitoreo.
      - name: Matriz de control y monitoreo
        if: always()
        continue-on-error: true
        run: |
          php artisan checkitse:matriz-monitoreo --salida=storage/monitoreo
          cat storage/monitoreo/matriz-monitoreo.md >> "$GITHUB_STEP_SUMMARY"

      - name: Guardar reportes (cobertura, JUnit y matriz)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: reportes-pruebas
          path: |
            backend/coverage.xml
            backend/junit.xml
            backend/storage/monitoreo/
          if-no-files-found: ignore

  e2e:
    name: Pruebas end-to-end (Cypress)
    runs-on: ubuntu-latest

    services:
      mariadb:
        image: mariadb:10.11
        env:
          MARIADB_ROOT_PASSWORD: root
          MARIADB_DATABASE: sisweb_e2e
        ports:
          - 3306:3306
        options: >-
          --health-cmd="healthcheck.sh --connect --innodb_initialized"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=10

    defaults:
      run:
        working-directory: backend

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: pdo_mysql, zip
          tools: composer:v2
          coverage: none

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install Dependencies
        run: |
          npm ci
          npx cypress install
          composer install --no-interaction --prefer-dist --optimize-autoloader

      - name: Build Assets
        run: npm run build

      - name: Preparar entorno e2e
        run: |
          cp .env.e2e.example .env.e2e
          sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=root/' .env.e2e

      - name: Levantar la aplicación
        env:
          APP_ENV: e2e
        run: |
          php artisan serve --host=127.0.0.1 --port=8010 > storage/logs/servidor-e2e.log 2>&1 &
          for i in $(seq 1 40); do curl -fs http://127.0.0.1:8010/up && break; sleep 1; done

      - name: Cypress
        env:
          APP_ENV: e2e
        run: npx cypress run --browser electron

      - name: Resumen de Cypress
        if: always()
        run: |
          if [ -f cypress/reports/resumen.json ]; then
            php -r '$r = json_decode(file_get_contents("cypress/reports/resumen.json"), true); echo "## Cypress\n\n| Total | Aprobadas | Fallidas | Tiempo |\n|---|---|---|---|\n| {$r["total"]} | {$r["aprobadas"]} | {$r["fallidas"]} | ".round($r["duracion_ms"]/1000, 1)." s |\n";' >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: Guardar evidencias de Cypress
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: evidencias-cypress
          path: |
            backend/cypress/screenshots/
            backend/cypress/videos/
            backend/cypress/reports/
            backend/storage/logs/
          if-no-files-found: ignore

  sonarqube:
    name: Análisis de calidad (SonarQube)
    needs: pruebas
    runs-on: ubuntu-latest
    # Solo si hay un servidor SonarQube accesible desde Internet configurado en el repositorio.
    if: ${{ vars.SONAR_HOST_URL != '' }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Descargar cobertura
        uses: actions/download-artifact@v4
        with:
          name: reportes-pruebas
          path: backend

      - name: Análisis SonarQube
        uses: SonarSource/sonarqube-scan-action@v5
        with:
          projectBaseDir: backend
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ vars.SONAR_HOST_URL }}

      - name: Quality Gate
        uses: SonarSource/sonarqube-quality-gate-action@v1
        timeout-minutes: 5
        with:
          scanMetadataReportFile: backend/.scannerwork/report-task.txt
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ vars.SONAR_HOST_URL }}
```

## Pipeline de calidad de código (linter)

Archivo: `.github/workflows/lint.yml`

```yaml
name: linter

on:
  push:
    branches:
      - develop
      - main
  pull_request:
    branches:
      - develop
      - main

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install Dependencies
        run: |
          composer install -q --no-ansi --no-interaction --no-scripts --no-progress --prefer-dist
          npm ci
        env:
          CYPRESS_INSTALL_BINARY: '0'

      # Modo verificacion: falla si hay archivos sin formatear en lugar de reescribirlos.
      - name: Run Pint
        run: vendor/bin/pint --test

      - name: Check Frontend Format
        run: npm run format:check

      - name: Lint Frontend
        run: npx eslint .

      - name: Tipos (frontend y pruebas Cypress)
        run: |
          npx tsc --noEmit -p .
          npx tsc --noEmit -p cypress
```

## Configuración del análisis de SonarQube

Archivo: `backend/sonar-project.properties`

```properties
sonar.projectKey=ITSE
sonar.projectName=CheckITSE Huancayo
sonar.projectVersion=1.1

# Local: http://localhost:9000 (el script scripts/sonar.ps1 lo levanta en Docker).
sonar.host.url=http://localhost:9000

# Código que se audita: backend Laravel (PHP) y frontend React/TypeScript.
sonar.sources=app,routes,resources/js,database,config
sonar.exclusions=vendor/**,node_modules/**,public/**,storage/**,bootstrap/cache/**,resources/css/**,resources/js/ssr.jsx

# Pruebas automatizadas (Pest y pruebas de interfaz en Node).
sonar.tests=tests
sonar.test.inclusions=tests/**/*Test.php,tests/Frontend/**

# TypeScript: copia de tsconfig.json compatible con el TypeScript interno de SonarQube 9.9.
sonar.typescript.tsconfigPaths=tsconfig.sonar.json

# Cobertura PHP (Clover). Se genera con: php vendor/bin/pest --coverage-clover coverage.xml
# Requiere Xdebug o PCOV; si el archivo no existe, el análisis sigue sin cobertura.
sonar.php.coverage.reportPaths=coverage.xml
# La cobertura se mide sobre la lógica PHP (app/). Las pantallas React se validan con
# las pruebas de navegador (tests/Frontend) y config/database/routes son declaraciones.
# Siguen analizándose por bugs, vulnerabilidades y mantenibilidad; solo no cuentan para cobertura.
sonar.coverage.exclusions=resources/js/**,config/**,database/**,routes/**

# Datos de demostración: no son lógica de la aplicación, no cuentan como duplicados.
sonar.cpd.exclusions=database/seeders/**,config/aliados.php

sonar.sourceEncoding=UTF-8
```

## Despliegue en el servidor XAMPP (CD)

Archivo: `scripts/desplegar-xampp.ps1`

```powershell
<#
.SYNOPSIS
    Despliegue continuo (CD) de CheckITSE en el servidor XAMPP: Apache 2.4 + PHP 8.2 + MariaDB 10.4.

.DESCRIPTION
    El servidor asignado es un equipo Windows con XAMPP, sin IP pública: GitHub Actions no
    puede conectarse a él. Por eso el despliegue es de tipo "pull": el servidor trae la última
    versión que ya pasó el pipeline de integración continua (rama main) y la publica.

      1. Obtiene la versión validada (rama main) y comprueba en la API de GitHub que su
         pipeline de CI terminó en verde; si no, se detiene sin desplegar.
      2. Instala dependencias (Composer y npm) y construye el frontend (Vite).
      3. Aplica las migraciones de base de datos.
      4. Optimiza Laravel para producción (config, rutas y vistas en caché).
      5. Registra el sitio en Apache (puerto 8081) si aún no lo está y reinicia Apache.
      6. Verifica: /up responde 200 y, con -Verificar, ejecuta las pruebas de humo de Cypress
         contra la aplicación desplegada.

.EXAMPLE
    .\scripts\desplegar-xampp.ps1
    .\scripts\desplegar-xampp.ps1 -SinPull -Verificar     # despliega lo que hay en disco y verifica con Cypress
#>
param(
    [string]$Remoto = 'william',
    [string]$Rama = 'main',
    [switch]$SinPull,
    [switch]$Verificar,
    [switch]$Forzar
)

$ErrorActionPreference = 'Stop'
# Terminales integradas (VS Code) definen ELECTRON_RUN_AS_NODE=1 y eso impide abrir el navegador de Cypress.
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backend = Join-Path $raiz 'backend'
$url = 'http://localhost:8081'
$vhosts = 'C:\xampp\apache\conf\extra\httpd-vhosts.conf'
$include = 'Include "C:/xampp/htdocs/SisWeb/deploy/xampp/checkitse.conf"'

function Paso([string]$texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Ejecutar([string]$comando) {
    & cmd /c $comando
    if ($LASTEXITCODE -ne 0) { throw "Falló: $comando" }
}

Push-Location $backend
try {
    if (-not $SinPull) {
        Paso "1/6 Obteniendo la versión validada ($Remoto/$Rama)"
        Ejecutar "git fetch $Remoto $Rama"

        # Puerta de calidad: solo se despliega un commit cuyo pipeline de GitHub terminó en verde.
        $sha = (& git rev-parse "$Remoto/$Rama").Trim()
        $repo = ((& git remote get-url $Remoto) -replace '^https://([^@]+@)?github\.com/', '' -replace '\.git$', '').Trim()
        $checks = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/commits/$sha/check-runs" -Headers @{ 'User-Agent' = 'checkitse-despliegue' }
        $noVerdes = @($checks.check_runs | Where-Object { $_.status -ne 'completed' -or $_.conclusion -notin @('success', 'skipped', 'neutral') })
        if ($checks.total_count -eq 0 -or $noVerdes.Count -gt 0) {
            $detalle = ($noVerdes | ForEach-Object { "$($_.name): $($_.status)/$($_.conclusion)" }) -join ', '
            if (-not $Forzar) { throw "El commit $($sha.Substring(0,7)) no pasó el pipeline de CI ($detalle). No se despliega. Usa -Forzar solo en una emergencia." }
            Write-Warning "Se despliega sin CI en verde por -Forzar ($detalle)."
        }
        else {
            Write-Host "CI en verde para $($sha.Substring(0,7)): $($checks.total_count) verificaciones aprobadas." -ForegroundColor Green
        }

        Ejecutar "git merge --ff-only $Remoto/$Rama"
    }

    Paso '2/6 Instalando dependencias y construyendo el frontend'
    Ejecutar 'composer install --no-interaction --prefer-dist --optimize-autoloader'
    Ejecutar 'npm ci --no-audit --no-fund'
    Ejecutar 'npm run build'

    Paso '3/6 Aplicando migraciones'
    Ejecutar 'php artisan migrate --force'

    Paso '4/6 Optimizando para producción'
    Ejecutar 'php artisan optimize:clear'
    Ejecutar 'php artisan optimize'

    Paso '5/6 Publicando en Apache (puerto 8081)'
    if (-not (Select-String -Path $vhosts -SimpleMatch 'SisWeb/deploy/xampp/checkitse.conf' -Quiet)) {
        Add-Content -Path $vhosts -Value "`n$include"
    }
    Ejecutar 'C:\xampp\apache\bin\httpd.exe -t'
    # Reinicio "suave": si Apache corre como proceso de XAMPP, se reinicia; si no, se inicia.
    Get-Process httpd -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Process -FilePath 'C:\xampp\apache\bin\httpd.exe' -WindowStyle Hidden
    Start-Sleep -Seconds 3

    Paso '6/6 Verificando que la aplicación responda'
    $salud = Invoke-WebRequest -Uri "$url/up" -UseBasicParsing -TimeoutSec 30
    if ($salud.StatusCode -ne 200) { throw "La aplicación no respondió en $url/up" }
    Write-Host "OK: $url/up respondió $($salud.StatusCode)." -ForegroundColor Green

    if ($Verificar) {
        $env:CYPRESS_BASE_URL = $url
        Ejecutar 'npx cypress run --spec cypress/e2e/00-humo-despliegue.cy.ts'
    }

    Write-Host "`nDespliegue listo: $url" -ForegroundColor Green
}
finally {
    Pop-Location
}
```

## VirtualHost de Apache (versionado)

Archivo: `deploy/xampp/checkitse.conf`

```apache
# CheckITSE Huancayo — despliegue en el servidor XAMPP (Apache 2.4 + PHP 8.2 + MariaDB 10.4).
#
# Se activa agregando UNA línea al final de C:\xampp\apache\conf\extra\httpd-vhosts.conf:
#   Include "C:/xampp/htdocs/SisWeb/deploy/xampp/checkitse.conf"
# (scripts/desplegar-xampp.ps1 la agrega si falta). La aplicación queda en http://localhost:8081
# y el resto de htdocs sigue funcionando en el puerto 80.
Listen 8081

<VirtualHost *:8081>
    ServerName localhost
    # Solo se publica la carpeta public/: el código, .env y storage quedan fuera del alcance web.
    DocumentRoot "C:/xampp/htdocs/SisWeb/backend/public"

    <Directory "C:/xampp/htdocs/SisWeb/backend/public">
        Options -Indexes +FollowSymLinks
        # Laravel usa public/.htaccess (mod_rewrite) para enrutar todo a index.php.
        AllowOverride All
        Require all granted
    </Directory>

    # Las subidas de evidencias permiten hasta 7 MB (más margen del formulario).
    LimitRequestBody 10485760

    ErrorLog "logs/checkitse-error.log"
    CustomLog "logs/checkitse-access.log" common
</VirtualHost>
```

## Servicio del módulo de reportes

Archivo: `backend/app/Services/ReportesImpactoService.php`

```php
<?php

namespace App\Services;

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\EventoProveedor;
use App\Services\Evaluacion\SubsanacionSyncService;
use Database\Seeders\DemoImpactoSeeder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Reportes de impacto: miden si CheckITSE ayuda a que los locales de Huancayo lleguen
 * preparados a su inspección ITSE. Todo se calcula con los registros de la base de datos.
 *
 * Indicadores principales:
 *  1. Locales evaluados en el periodo.
 *  2. Preparación al evaluar vs. preparación actual (antes / después de usar CheckITSE).
 *  3. Locales listos para la inspección (semáforo verde).
 *  4. Tasa de corrección: condiciones corregidas / condiciones que faltaban al evaluar.
 *  5. Contactos con proveedores por WhatsApp (el canal de la tienda de aliados).
 */
class ReportesImpactoService
{
    public function __construct(private readonly SubsanacionSyncService $correcciones) {}

    public const ORIGENES = ['todos', 'reales', 'demo'];

    public const ESTADOS = ['VERDE', 'AMBAR', 'ROJO'];

    private const ETIQUETA_ESTADO = ['VERDE' => 'Listo', 'AMBAR' => 'Casi listo', 'ROJO' => 'Necesita atención'];

    /**
     * @param  array{desde?: ?string, hasta?: ?string, distrito?: ?string, giro?: ?string, estado?: ?string, origen?: ?string}  $entrada
     * @return array<string, mixed>
     */
    public function generar(array $entrada): array
    {
        $filtros = $this->normalizarFiltros($entrada);
        $locales = $this->consulta($filtros)->with('subsanaciones')->orderBy('registrada_at')->get();
        $filas = $locales->map(fn (Autoevaluacion $a): array => $this->fila($a));

        $faltabanAlInicio = $filas->sum('faltaban');
        $corregidas = $filas->sum('corregidas');
        $listos = $filas->where('estado', 'VERDE')->count();

        return [
            'filtros' => $filtros,
            'opciones' => $this->opciones(),
            'indicadores' => [
                'locales' => $filas->count(),
                'preparacion_inicial' => $this->promedio($filas->pluck('preparacion_inicial')),
                'preparacion_actual' => $this->promedio($filas->pluck('preparacion_actual')),
                'listos' => $listos,
                'porcentaje_listos' => $filas->isEmpty() ? 0.0 : round($listos * 100 / $filas->count(), 1),
                'faltaban_al_inicio' => $faltabanAlInicio,
                'corregidas' => $corregidas,
                'tasa_correccion' => $faltabanAlInicio === 0 ? 0.0 : round($corregidas * 100 / $faltabanAlInicio, 1),
                'dias_promedio_correccion' => $this->promedio($filas->pluck('dias_correccion')->filter(fn ($d) => $d !== null)),
                'contactos_whatsapp' => $this->contactosWhatsapp($filtros),
            ],
            'por_mes' => $this->porMes($filas, $filtros),
            'por_estado' => collect(self::ESTADOS)->map(fn (string $e): array => [
                'estado' => $e,
                'etiqueta' => self::ETIQUETA_ESTADO[$e],
                'locales' => $filas->where('estado', $e)->count(),
            ])->all(),
            'por_distrito' => $filas->groupBy('distrito')->map(fn (Collection $g, string $distrito): array => [
                'distrito' => $distrito,
                'locales' => $g->count(),
                'preparacion_inicial' => $this->promedio($g->pluck('preparacion_inicial')),
                'preparacion_actual' => $this->promedio($g->pluck('preparacion_actual')),
                'listos' => $g->where('estado', 'VERDE')->count(),
            ])->sortByDesc('locales')->values()->all(),
            'condiciones' => $this->condiciones($locales),
            'registros' => $filas->sortByDesc('fecha')->take(25)->values()->all(),
            'totales_origen' => [
                'reales' => $this->consulta([...$filtros, 'origen' => 'reales'])->count(),
                'demo' => $this->consulta([...$filtros, 'origen' => 'demo'])->count(),
            ],
        ];
    }

    /** Una fila por local, también usada para exportar a CSV. @return Collection<int, array<string, mixed>> */
    public function filasParaExportar(array $entrada): Collection
    {
        return $this->consulta($this->normalizarFiltros($entrada))->with('subsanaciones')->orderBy('registrada_at')->get()
            ->map(fn (Autoevaluacion $a): array => $this->fila($a));
    }

    /**
     * @param  array<string, mixed>  $entrada
     * @return array{desde: string, hasta: string, distrito: string, giro: string, estado: string, origen: string}
     */
    private function normalizarFiltros(array $entrada): array
    {
        $fecha = function (?string $valor, Carbon $porDefecto): Carbon {
            try {
                return $valor ? Carbon::parse($valor) : $porDefecto;
            } catch (\Throwable) {
                return $porDefecto;
            }
        };
        $desde = $fecha($entrada['desde'] ?? null, now()->subMonths(6)->startOfMonth())->startOfDay();
        $hasta = $fecha($entrada['hasta'] ?? null, now())->endOfDay();
        if ($desde->greaterThan($hasta)) {
            [$desde, $hasta] = [$hasta->copy()->startOfDay(), $desde->copy()->endOfDay()];
        }

        return [
            'desde' => $desde->toDateString(),
            'hasta' => $hasta->toDateString(),
            'distrito' => (string) ($entrada['distrito'] ?? ''),
            'giro' => (string) ($entrada['giro'] ?? ''),
            'estado' => in_array($entrada['estado'] ?? '', self::ESTADOS, true) ? (string) $entrada['estado'] : '',
            'origen' => in_array($entrada['origen'] ?? '', self::ORIGENES, true) ? (string) $entrada['origen'] : 'todos',
        ];
    }

    /** @param  array<string, string>  $filtros  @return Builder<Autoevaluacion> */
    private function consulta(array $filtros): Builder
    {
        return Autoevaluacion::query()
            ->where('estado', Autoevaluacion::ESTADO_REGISTRADA)
            ->whereBetween('registrada_at', [Carbon::parse($filtros['desde'])->startOfDay(), Carbon::parse($filtros['hasta'])->endOfDay()])
            ->when($filtros['distrito'] !== '', fn (Builder $q) => $q->where('distrito', $filtros['distrito']))
            ->when($filtros['giro'] !== '', fn (Builder $q) => $q->where('funcion_economica', $filtros['giro']))
            ->when($filtros['estado'] !== '', fn (Builder $q) => $q->where('semaforo', $filtros['estado']))
            ->when($filtros['origen'] === 'demo', fn (Builder $q) => $q->where('codigo_acceso', 'like', DemoImpactoSeeder::PREFIJO.'%'))
            ->when($filtros['origen'] === 'reales', fn (Builder $q) => $q->where(fn (Builder $r) => $r
                ->whereNull('codigo_acceso')
                ->orWhere('codigo_acceso', 'not like', DemoImpactoSeeder::PREFIJO.'%')));
    }

    /** @return array<string, mixed> */
    private function fila(Autoevaluacion $local): array
    {
        $inicial = $this->estadoInicial($local);
        $codigos = $this->correcciones->codigosCorregidos($local);
        $corregidas = $local->subsanaciones->where('estado', SubsanacionSyncService::ESTADO_SUBSANADO)->whereIn('codigo_item', $codigos);
        $ultimaCorreccion = $corregidas->max('fecha_subsanacion');

        return [
            'codigo' => $local->codigo_acceso,
            'nombre' => $local->nombre_comercio,
            'distrito' => $local->distrito ?: 'Sin distrito',
            'giro' => $local->funcion_economica,
            'fecha' => $local->registrada_at?->toDateString(),
            'aplicables' => $inicial['aplicables'],
            'faltaban' => $inicial['faltaban'],
            'corregidas' => $codigos->count(),
            'preparacion_inicial' => $inicial['preparacion'],
            'preparacion_actual' => round((float) $local->porcentaje_cumplimiento, 1),
            'estado' => $local->semaforo,
            'dias_correccion' => $ultimaCorreccion && $local->registrada_at
                ? (int) max(0, $local->registrada_at->startOfDay()->diffInDays(Carbon::parse($ultimaCorreccion)->startOfDay()))
                : null,
        ];
    }

    /**
     * Cómo estaba el local al evaluar, leído de su foto sellada (payload canónico).
     *
     * @return array{aplicables: int, faltaban: int, preparacion: float}
     */
    private function estadoInicial(Autoevaluacion $local): array
    {
        $criterios = collect(($local->payload_canonico ?? [])['criterios'] ?? [])
            ->filter(fn ($c): bool => is_array($c) && ($c['aplicabilidad'] ?? '') === 'APLICA');
        $aplicables = $criterios->count();
        $cumplian = $criterios->where('estado_declarado', 'CUMPLE_DECLARADO')->count();

        return [
            'aplicables' => $aplicables,
            'faltaban' => $aplicables - $cumplian,
            'preparacion' => $aplicables === 0 ? 0.0 : round($cumplian * 100 / $aplicables, 1),
        ];
    }

    /**
     * Las condiciones que más faltan al evaluar y cuántas se corrigieron después.
     *
     * @param  Collection<int, Autoevaluacion>  $locales
     * @return array<int, array<string, mixed>>
     */
    private function condiciones(Collection $locales): array
    {
        $faltaban = [];
        foreach ($locales as $local) {
            foreach (($local->payload_canonico ?? [])['criterios'] ?? [] as $c) {
                if (($c['aplicabilidad'] ?? '') === 'APLICA' && ($c['estado_declarado'] ?? '') !== 'CUMPLE_DECLARADO') {
                    $faltaban[$c['codigo']] = ($faltaban[$c['codigo']] ?? 0) + 1;
                }
            }
        }
        $corregidas = $locales
            ->flatMap(fn (Autoevaluacion $local) => $this->correcciones->codigosCorregidos($local))
            ->countBy()
            ->all();
        $titulos = CriterioNormativo::whereIn('codigo_criterio', array_keys($faltaban))->pluck('titulo', 'codigo_criterio');

        return collect($faltaban)
            ->map(fn (int $total, string $codigo): array => [
                'codigo' => $codigo,
                'titulo' => $titulos[$codigo] ?? $codigo,
                'faltaban' => $total,
                'corregidas' => (int) min($total, $corregidas[$codigo] ?? 0),
                'porcentaje_corregido' => round(min($total, $corregidas[$codigo] ?? 0) * 100 / $total, 1),
            ])
            ->sortByDesc('faltaban')
            ->values()
            ->take(10)
            ->all();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $filas
     * @param  array<string, string>  $filtros
     * @return array<int, array{mes: string, etiqueta: string, evaluados: int, listos: int}>
     */
    private function porMes(Collection $filas, array $filtros): array
    {
        $meses = [];
        $cursor = Carbon::parse($filtros['desde'])->startOfMonth();
        $fin = Carbon::parse($filtros['hasta'])->startOfMonth();
        while ($cursor->lessThanOrEqualTo($fin) && count($meses) < 24) {
            $clave = $cursor->format('Y-m');
            $delMes = $filas->filter(fn (array $f): bool => str_starts_with((string) $f['fecha'], $clave));
            $meses[] = [
                'mes' => $clave,
                'etiqueta' => ucfirst($cursor->locale('es')->isoFormat('MMM YY')),
                'evaluados' => $delMes->count(),
                'listos' => $delMes->where('estado', 'VERDE')->count(),
            ];
            $cursor->addMonth();
        }

        return $meses;
    }

    /** @param  array<string, string>  $filtros */
    private function contactosWhatsapp(array $filtros): int
    {
        return EventoProveedor::query()
            ->where('tipo', EventoProveedor::CLIC_WHATSAPP)
            ->whereBetween('created_at', [Carbon::parse($filtros['desde'])->startOfDay(), Carbon::parse($filtros['hasta'])->endOfDay()])
            ->count();
    }

    /** @return array{distritos: array<int, string>, giros: array<int, string>} */
    private function opciones(): array
    {
        $base = Autoevaluacion::query()->where('estado', Autoevaluacion::ESTADO_REGISTRADA);

        return [
            'distritos' => (clone $base)->whereNotNull('distrito')->distinct()->orderBy('distrito')->pluck('distrito')->values()->all(),
            'giros' => (clone $base)->whereNotNull('funcion_economica')->distinct()->orderBy('funcion_economica')->pluck('funcion_economica')->values()->all(),
        ];
    }

    /** @param  Collection<int, mixed>  $valores */
    private function promedio(Collection $valores): float
    {
        return $valores->isEmpty() ? 0.0 : round((float) $valores->avg(), 1);
    }
}
```

## Controlador del módulo de reportes

Archivo: `backend/app/Http/Controllers/ReportesController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Services\ReportesImpactoService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Módulo de reportes de impacto (solo administración). Muestra, con los registros de
 * la base de datos, si los locales que usan CheckITSE llegan más preparados a su ITSE.
 */
class ReportesController extends Controller
{
    private const FILTROS = ['desde', 'hasta', 'distrito', 'giro', 'estado', 'origen'];

    public function __construct(private readonly ReportesImpactoService $reportes) {}

    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Reportes', $this->reportes->generar($request->only(self::FILTROS)));
    }

    /** Descarga en CSV (se abre en Excel) los locales que cumplen los filtros. */
    public function exportar(Request $request): StreamedResponse
    {
        $filas = $this->reportes->filasParaExportar($request->only(self::FILTROS));
        $columnas = [
            'codigo' => 'Código', 'nombre' => 'Local', 'distrito' => 'Distrito', 'giro' => 'Giro', 'fecha' => 'Fecha de evaluación',
            'aplicables' => 'Condiciones aplicables', 'faltaban' => 'Faltaban al evaluar', 'corregidas' => 'Corregidas',
            'preparacion_inicial' => 'Preparación al evaluar (%)', 'preparacion_actual' => 'Preparación actual (%)',
            'estado' => 'Estado', 'dias_correccion' => 'Días hasta la última corrección',
        ];

        return response()->streamDownload(function () use ($filas, $columnas): void {
            $salida = fopen('php://output', 'w');
            fwrite($salida, "\xEF\xBB\xBF"); // BOM: Excel reconoce las tildes.
            fputcsv($salida, array_values($columnas), ';');
            foreach ($filas as $fila) {
                fputcsv($salida, array_map(fn (string $clave) => $fila[$clave] ?? '', array_keys($columnas)), ';');
            }
            fclose($salida);
        }, 'reporte-impacto-checkitse-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
```

