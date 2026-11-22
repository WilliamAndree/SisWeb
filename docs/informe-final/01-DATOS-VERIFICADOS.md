# Datos verificados del proyecto CheckITSE Huancayo (fuente única para el informe)

> Todas las cifras de este archivo se obtuvieron ejecutando el sistema, sus pruebas y sus herramientas el
> **22 de noviembre de 2026**. Cada dato indica de qué evidencia sale. Si un dato no está aquí, el informe
> debe poner «[completar]»; no se debe suponer.
>
> - Repositorio: https://github.com/WilliamAndree/SisWeb (ramas `main`, `develop` y `feature/rediseno-emprendedor`).
> - Versión del código evaluada y desplegada: commit **0ec9db8** («feat(servidor): cola de trabajos y tareas programadas en XAMPP sin servicios de fondo»).
> - Aplicación desplegada: http://localhost:8081 (servidor XAMPP del equipo).

---

## 0. Datos que debe completar el equipo

| Dato | Valor |
|---|---|
| Universidad / facultad / escuela | [completar] |
| Sección / NRC | [completar] |
| Docente | [completar] |
| Integrante 1 (nombre y código) | [completar] |
| Integrante 2 (nombre y código) | [completar] |
| Integrante 3 (nombre y código) | [completar] |
| Fecha de entrega | [completar] |

Pista para completar: los commits del repositorio están firmados por tres cuentas institucionales `@continental.edu.pe` (códigos 75448767, 73076280 y 74416060), lo que sugiere Universidad Continental; **confirmar** nombres, códigos y universidad antes de usarlos.

---

## 1. Descripción general del proyecto existente

**Nombre:** CheckITSE Huancayo (repositorio *SisWeb*).

**Problema que resuelve.** En Huancayo (distritos de Huancayo, El Tambo y Chilca), los emprendedores que abren o
renuevan un local comercial deben aprobar la **Inspección Técnica de Seguridad en Edificaciones (ITSE)**, regulada por
el D.S. N.° 002-2018-PCM. Muchos llegan a la inspección sin saber qué condiciones se verifican (extintor vigente,
luces de emergencia, señalización, pozo a tierra, tablero eléctrico, rutas de evacuación, etc.), por lo que reciben
observaciones, pierden tiempo, pagan multas o sufren clausuras. No existía una herramienta local, gratuita y en
lenguaje sencillo que les permitiera **revisar su local antes de la inspección**, saber qué les falta, corregirlo y
reunir los documentos.

**Qué hace el sistema (módulos existentes antes de esta práctica):**

| Módulo | Responsabilidad |
|---|---|
| Portada y directorio | Explica el ITSE, los riesgos de no tenerlo y muestra el directorio de proveedores (aliados técnicos) por especialidad. |
| Autoevaluación del local | Asistente de 3 pasos (datos del local, características físicas, revisión). El motor de aplicabilidad (`ApplicabilityEngineService`) decide qué condiciones normativas aplican según giro, área, pisos y aforo. |
| Lista de condiciones (checklist) | El emprendedor responde cada condición (Sí cumple / No cumple / No sé / No aplica) agrupada por especialidad. |
| Resumen y diagnóstico | Calcula el porcentaje de preparación y un semáforo (Listo / Casi listo / Necesita atención) con `ItseRiskService`; sella la evaluación con un hash SHA-256 (`payload_canonico` + `hash_integridad`). |
| Corrección de lo que falta (subsanación) | El emprendedor marca «Ya lo corregí» con una foto o una nota; `SubsanacionSyncService` actualiza el resultado y permite deshacer. |
| Expediente digital | Subida y eliminación de documentos (declaración jurada, croquis, constancia de pozo a tierra…), almacenados en disco privado. |
| Informe y anexos | Informe preventivo imprimible y formatos de anexo. |
| Cuenta de proveedor | El proveedor publica productos, ve visitas y clics a WhatsApp y solicita planes. |
| Administración | Pagos de planes, negocios registrados, vencimientos. |
| Análisis de evidencias con IA (opcional) | Gemini da una orientación sobre la foto de una corrección (no reemplaza al inspector). |

**Usuarios:** emprendedor (cliente), proveedor y administración.

**Tamaño del código (SonarQube y conteo de archivos):** 43 787 líneas de código (ncloc) en 243 archivos analizados;
28 modelos Eloquent, 40 migraciones, 9 controladores de la aplicación más el de autenticación, 30 páginas React y 42 componentes React; 71 archivos de
pruebas PHP y 7 de pruebas de interfaz (Node). Historial en Git: 73 commits en la rama `main` hasta 0ec9db8.

**Estado previo a esta práctica:** el sistema ya funcionaba en local con `php artisan serve`, tenía pruebas PHP (Pest)
y un análisis puntual con SonarQube, pero **no** tenía: pruebas end-to-end con Cypress, despliegue en el servidor
XAMPP, pipeline que bloquee el despliegue si fallan las pruebas, ni un módulo de reportes de impacto. El pipeline de
GitHub Actions existía pero estaba fallando (ver 4.4).

---

## 2. Actividad 1 — Arquitectura de software

### 2.1 Arquitectura actual (1.1)

- **Tipo:** monolito modular en capas (Laravel 12 + Inertia.js 2 + React 19). Un solo proyecto y un solo despliegue:
  el frontend React vive en `backend/resources/js`, Vite lo compila a `public/build` y Laravel lo sirve.
- **Capas:**
  1. **Presentación** — React 19 + TypeScript + Tailwind CSS 4 (`resources/js/pages`, `components`, `layouts`, `hooks`).
  2. **Aplicación** — rutas (`routes/web.php`) con middleware `auth`, `admin` (`EnsureUserIsAdmin`), CSRF y `throttle`
     (p. ej. login 5 intentos/min); controladores HTTP; servicios de negocio; comandos Artisan y tarea programada.
  3. **Dominio / datos** — 28 modelos Eloquent sobre MariaDB; archivos privados en `storage/app`.
- **Comunicación entre componentes:** el navegador pide una URL; Laravel ejecuta el controlador y responde con
  **Inertia**: la primera carga trae HTML y las siguientes navegaciones traen **JSON** con las *props* de la página
  (no hay una API REST separada). Los formularios se envían por POST/PUT/DELETE con token CSRF. Los controladores
  delegan la lógica en servicios.
- **Interacción con la base de datos:** Eloquent ORM sobre PDO MySQL. Transacciones en las operaciones que tocan varias
  tablas (sellado de la evaluación, correcciones). Sesiones, caché y cola de trabajos también se guardan en la base
  (`SESSION_DRIVER=database`, `CACHE_STORE=database`, `QUEUE_CONNECTION=database`).
- **Dependencias entre módulos:** Autoevaluación → motor de aplicabilidad → criterios normativos; Resumen → `ItseRiskService`;
  Corrección → `SubsanacionSyncService` → respuestas de la autoevaluación; Expediente → autoevaluación; Directorio →
  proveedores → eventos (clics a WhatsApp); Reportes → autoevaluaciones + subsanaciones + eventos de proveedor.

**Controladores:** `EvaluacionController`, `ExpedienteDigitalController`, `PlanoEstablecimientoController`,
`DirectorioController`, `EventosProveedorController`, `ProveedorPanelController`, `MisRegistrosController`,
`AdminController`, `ReportesController` (nuevo) y los de `Auth`.

**Servicios principales:** `ApplicabilityEngineService`, `ItseRiskService`, `Evaluacion/SubsanacionSyncService`,
`Evaluacion/IntegridadEvaluacionService`, `Evaluacion/EvidenciaPrivadaService`, `Espacio/*` (croquis y análisis
espacial), `AI/GeminiMultimodalService` y `AI/AnalisisEvidenciaService`, `PlanesProveedorService`,
`EstadisticasProveedorService`, `DirectorioAliadosService`, `Monitoreo/MatrizMonitoreoService`,
`ReportesImpactoService` (nuevo).

**Comandos y tareas:** `checkitse:vencer-planes` (programado diario 00:10), `checkitse:sincronizar-subsanaciones`,
`checkitse:matriz-monitoreo`, `checkitse:e2e-preparar` (nuevo; solo funciona con `APP_ENV=e2e` y una base cuyo nombre
termine en `_e2e`).

### 2.2 Adaptación y ajustes realizados (1.2)

| Aspecto | Situación / ajuste realizado | Por qué |
|---|---|---|
| Organización frontend/backend | Se mantiene el monolito Inertia: un solo proceso PHP sirve todo. | El servidor es un equipo con 11.8 GB de RAM compartida; un solo servicio web (Apache + PHP) consume menos que un frontend Node separado más una API. |
| Separación de responsabilidades | La lógica nueva de reportes se puso en un servicio (`ReportesImpactoService`) y no en el controlador; las correcciones usan un único servicio (`SubsanacionSyncService`) como fuente de verdad. | Facilita pruebas unitarias y evita cálculos duplicados. |
| Comunicación | Inertia (HTML + JSON). Nuevos endpoints internos: `GET /admin/reportes`, `GET /admin/reportes/exportar` (CSV) y `GET /up` (salud, usado por el despliegue y Cypress). | Sin API pública adicional que mantener. |
| Conexiones a la base de datos | Tres bases separadas: `sisweb` (producción), `sisweb_testing` (Pest) y `sisweb_e2e` (Cypress). El comando de preparación e2e se niega a correr sobre otra base. | Las pruebas nunca tocan datos reales. |
| Configuración por entorno | `.env` (producción: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=http://localhost:8081`), `.env.testing`, `.env.e2e` (no versionados; se versionan solo los `*.example`). | Las credenciales no se suben al repositorio. |
| Rutas sensibles a mayúsculas | `config/inertia.php` apunta a `resources/js/pages` (minúsculas). | En Linux (runner de CI) las rutas distinguen mayúsculas; era la causa de que las pruebas fallaran en el pipeline. |
| Compatibilidad con el despliegue | Sitio de Apache versionado en `deploy/xampp/checkitse.conf` (puerto 8081, `DocumentRoot` a `backend/public`, `AllowOverride All`, límite de subida 10 MB). | Reproducible y sin editar a mano la configuración de XAMPP. |
| Servicios externos | Gemini es **opcional**: si no hay clave o falla, el sistema sigue funcionando. Fuentes tipográficas desde Bunny Fonts; mapas y videos embebidos. | La funcionalidad principal no depende de servicios de terceros. |

### 2.3 Tabla de APIs y servicios externos (1.3)

| API o servicio | Funcionalidad en CheckITSE | Información intercambiada | Justificación |
|---|---|---|---|
| **Google Gemini API** (`generativelanguage.googleapis.com/v1beta`, método `generateContent`) | Orientación automática sobre la foto que sube el emprendedor al corregir una condición. | **Envía:** imagen (`inline_data`, base64 con su tipo MIME) + instrucción con la condición a revisar. **Recibe:** JSON (`response_mime_type: application/json`) con la valoración orientativa. Se procesa en segundo plano (`AnalisisEvidenciaJob`). | Ayuda al emprendedor a saber si su evidencia es adecuada antes de la inspección. Es opcional: el resultado es solo orientativo. |
| **WhatsApp (enlaces `wa.me`)** | Contactar a un proveedor desde el directorio. | **Envía:** número del proveedor y mensaje prellenado en la URL. **Recibe:** nada (abre WhatsApp). El sistema registra el clic como `eventos_proveedor` (tipo `clic_whatsapp`). | Canal de contacto más usado por los negocios de la zona; el clic alimenta el indicador «contactos por WhatsApp». |
| **Google Maps (embed y enlaces) / OpenStreetMap** | Mostrar la ubicación de proveedores y locales. | **Envía:** coordenadas o dirección en la URL del mapa. **Recibe:** mapa embebido (iframe). | Ubicar proveedores cercanos sin claves de API ni costos. |
| **YouTube sin cookies** (`youtube-nocookie.com/embed`) | Videos educativos sobre cada condición. | **Envía:** identificador del video. **Recibe:** reproductor embebido. | Material educativo sin rastreo de cookies. |
| **Bunny Fonts** (`fonts.bunny.net`) | Tipografías de la interfaz. | **Recibe:** hojas CSS y archivos de fuente. | Alternativa a Google Fonts respetuosa de la privacidad. |
| **API REST de GitHub** (`/repos/{repo}/commits/{sha}/check-runs`) | Usada por el script de despliegue: comprueba que el commit pasó el pipeline antes de desplegar. | **Envía:** identificador del commit. **Recibe:** lista de verificaciones con estado y conclusión. | Puerta de calidad del despliegue (no se publica código que no pasó CI). |
| **API web de SonarQube** (`/api/qualitygates/project_status`, `/api/measures/component`) | Consulta de métricas y Quality Gate para las evidencias. | **Envía:** clave del proyecto (`ITSE`). **Recibe:** métricas en JSON. | Evidencia verificable de calidad. |

Endpoints internos propios (no externos): `GET /up` (salud), `POST /eventos-proveedor` (registro de visitas/clics,
limitado a 60/min), `GET /admin/reportes`, `GET /admin/reportes/exportar`.

### 2.4 Figura de la Actividad 1

- **Figura D1** — `figuras/D1-arquitectura-software.png`: capas, módulos, servicios, base de datos, almacenamiento
  privado y servicios externos.
- **Figura D3** — `figuras/D3-modelo-datos.png`: tablas principales y relaciones (apoyo para «interacción con la base de datos»).

---

## 3. Actividad 2 — Arquitectura tecnológica y adaptación al servidor

### 3.1 Tabla de tecnologías (2.1)

| Componente | Tecnología | Propósito |
|---|---|---|
| Frontend | React 19 + TypeScript 5 + Tailwind CSS 4 (Radix UI / shadcn/ui), compilado con Vite 6 | Interfaz de usuario (SPA servida por Inertia). |
| Backend | PHP 8.2 + Laravel 12 (Inertia Laravel 2, Sanctum 4) | Lógica de negocio, rutas, autenticación, servicios. |
| Base de datos | MariaDB 10.4.32 (XAMPP); MariaDB 10.11 en el pipeline | Persistencia de información. |
| Framework | Laravel 12 (backend) + Inertia.js 2 (puente) + React 19 (frontend) | Estructuración del desarrollo. |
| Entorno de desarrollo | Visual Studio Code, Node.js 24.19 / npm 11.17, Composer 2.10.2, XAMPP | Desarrollo del código. |
| Control de versiones | Git 2.55 + GitHub (repositorio WilliamAndree/SisWeb) | Gestión del código fuente. |
| Servidor | Equipo Windows 11 con XAMPP: Apache 2.4.58 + PHP 8.2.12 + MariaDB 10.4.32 | Alojamiento y ejecución. |
| Automatización | Cypress 16.2.1 (navegador Electron 146) | Pruebas end-to-end automatizadas. |
| Pruebas unitarias / integración | Pest 3 (PHPUnit 11) + `node --test` | Pruebas del backend y de utilidades del frontend. |
| Calidad | SonarQube 9.9 LTS Community (Docker) + Laravel Pint, ESLint, Prettier, `tsc` | Análisis estático del código. |
| CI/CD | GitHub Actions (CI) + script PowerShell `scripts/desplegar-xampp.ps1` (CD por *pull* con puerta de CI) | Automatización de integración y despliegue. |

### 3.2 Características del servidor (2.2)

Fuente: `scripts/info-servidor.ps1` → `evidencias-texto-servidor.txt`.

| Característica | Información |
|---|---|
| Sistema operativo | Microsoft Windows 11 Home Single Language (build 22621, 64 bits) |
| Procesador | Intel Core i5-11400H @ 2.70 GHz, 6 núcleos / 12 hilos |
| Memoria RAM | 11.8 GB (compartida con el entorno de desarrollo) |
| Almacenamiento | Disco C: 238 GB total, 61 GB libres |
| Servidor web | Apache 2.4.58 (Win64), XAMPP; sitio en el puerto 8081 |
| Runtime | PHP 8.2.12 (ZTS, VC++ 2019 x64); Node.js 24.19.0 / npm 11.17.0 (solo para construir el frontend); Composer 2.10.2 |
| Base de datos | MariaDB 10.4.32 (binario de mariadb.org para Win64) |
| Contenedores | Docker 29.9.3 disponible (Docker Desktop); se usa solo para SonarQube y para la medición de cobertura, no para servir la aplicación |
| Servicios permitidos | Apache, MySQL/MariaDB (panel de XAMPP), PHP CLI (Artisan), Git, Node/npm, Docker Desktop |
| Extensiones PHP presentes | bcmath, ctype, curl, fileinfo, json, mbstring, openssl, pdo_mysql, tokenizer, xml, zip |
| Límites de PHP | `memory_limit=512M`, `post_max_size=40M`, `upload_max_filesize=40M` (Apache limita la subida a 10 MB) |
| Restricciones | Sin IP pública (red local): GitHub no puede conectarse al servidor para hacer *push* del despliegue. RAM limitada y compartida: SonarQube (Java) y Cypress no deben correr a la vez con todo lo demás. Windows sin cron/systemd ni servicios de fondo para PHP: la cola de trabajos (análisis con IA) y las tareas programadas (vencimiento de planes) necesitan un mecanismo propio (ver 3.3). No hay certificado HTTPS (uso local). Faltan las extensiones `gd` e `intl` (el proyecto no las requiere). MariaDB 10.4 es más antigua que la 10.11 del pipeline (las migraciones se probaron en ambas). |

### 3.3 Justificación de la adaptación (2.3)

- **Compatibilidad:** Laravel 12 requiere PHP ≥ 8.2 → XAMPP trae PHP 8.2.12. MariaDB 10.4 es compatible con el
  controlador `mysql` de Laravel. El pipeline usa **la misma versión de PHP (8.2)** que el servidor.
- **Frontend:** no necesita un servidor Node en producción: Vite lo compila a archivos estáticos (`public/build`) que
  Apache entrega. Node solo se usa durante el despliegue para construir.
- **Backend:** Apache + `mod_rewrite` (`AllowOverride All`) dirigen todo a `public/index.php`.
- **Base de datos:** base `sisweb` en el MariaDB de XAMPP; las migraciones se aplican con `php artisan migrate --force`
  en cada despliegue.
- **Variables de entorno:** `.env` de producción en el servidor (no versionado); `APP_DEBUG=false`; en CI las
  credenciales de base de datos son de un contenedor temporal.
- **Dependencias:** `composer install --optimize-autoloader` y `npm ci` en cada despliegue (versiones fijadas por los
  archivos *lock*).
- **Distribución de servicios:** Apache + PHP + MariaDB en el servidor; pruebas e integración en los runners de GitHub
  (en la nube); SonarQube en Docker en el equipo del equipo de desarrollo.
- **Tareas de fondo sin cron:** en lugar de un proceso permanente (`queue:work` siempre encendido consume memoria),
  el Programador de tareas de Windows ejecuta `php artisan schedule:run` cada minuto con `php-win.exe` (sin ventana).
  Laravel ejecuta entonces `checkitse:vencer-planes` (diario 00:10) y `queue:work --stop-when-empty` (cada minuto, sin
  solaparse), que procesa la cola y termina. Se activa una sola vez con `scripts/tareas-xampp.ps1` (y se quita con
  `-Quitar`); la prueba `ProgramadorTareasTest` verifica que ambas tareas estén programadas. Mientras no se active,
  el sistema funciona igual, pero el análisis opcional con IA queda en espera y los planes vencidos no se degradan solos.
- **Uso eficiente de recursos:** caché de configuración, rutas y vistas (`php artisan optimize`); el pipeline pesado
  (pruebas con cobertura y Cypress) corre en GitHub, no en el servidor; Cypress se ejecuta con `--disable-gpu`.

### 3.4 Diseño del pipeline (2.4)

| Etapa | Actividad | Herramienta o mecanismo | Dónde se ejecuta y por qué |
|---|---|---|---|
| 1. Control de versiones | Registrar los cambios; ramas `feature/*` → `develop` → `main`. | Git + GitHub | Equipo de desarrollo → GitHub. |
| 2. Integración | Cada *push* o *pull request* a `develop`/`main` dispara los flujos `linter` y `tests`. | GitHub Actions (`.github/workflows/lint.yml` y `tests.yml`) | Runners `ubuntu-latest` de GitHub: el servidor no tiene IP pública ni recursos para ejecutar el pipeline completo. |
| 3. Construcción | `npm ci`, `npm run build` (Vite), `composer install --optimize-autoloader`. | npm, Vite, Composer | En CI (para probar) y otra vez en el servidor durante el despliegue. |
| 4. Pruebas | Calidad de estilo (Pint, Prettier, ESLint, `tsc`); pruebas PHP con cobertura (Pest + PCOV, MariaDB 10.11 temporal); pruebas end-to-end (**Cypress**, base `sisweb_e2e`). | Pest, Cypress | GitHub Actions (jobs `quality`, `Pruebas PHP y cobertura`, `Pruebas end-to-end (Cypress)`). También local con `scripts/cypress.ps1`. |
| 5. Calidad | Análisis estático + Quality Gate. | **SonarQube** 9.9 LTS | En Docker en el equipo del equipo (`scripts/cobertura-docker.ps1` + `scripts/sonar.ps1`). El job `sonarqube` del pipeline ya está escrito, pero solo se activa si se configura un SonarQube accesible desde Internet (`vars.SONAR_HOST_URL`); por eso aparece como *skipped*. |
| 6. Despliegue | Trae `main`, **verifica en la API de GitHub que el commit pasó el CI**, instala dependencias, construye, migra, optimiza, publica en Apache y reinicia. | `scripts/desplegar-xampp.ps1` (CD por *pull*) | En el propio servidor XAMPP (es el único que puede llegar a sí mismo). |
| 7. Verificación | `GET /up` debe responder 200 y se ejecuta la prueba de humo **E2E-00** de Cypress contra `http://localhost:8081`. | Invoke-WebRequest + Cypress | En el servidor, al final del despliegue (`-Verificar`). |

**Puerta de calidad del despliegue (real, no solo documentada):** si alguna verificación del commit no está en
`success`, `skipped` o `neutral`, el script se detiene con «El commit … no pasó el pipeline de CI. No se despliega».
Solo con `-Forzar` (emergencia) se puede saltar, y deja una advertencia.

**Evidencia del despliegue del commit 0ec9db8** (`evidencias/registro-despliegue-xampp.txt`):

```
==> 1/6 Obteniendo la versión validada (william/main)
CI en verde para 0ec9db8: 8 verificaciones aprobadas.
==> 2/6 Instalando dependencias y construyendo el frontend
==> 3/6 Aplicando migraciones
==> 4/6 Optimizando para producción
==> 5/6 Publicando en Apache (puerto 8081)
==> 6/6 Verificando que la aplicación responda
OK: http://localhost:8081/up respondió 200.
Cypress E2E-00: Tests 1, Passing 1, Failing 0 — All specs passed! (00:06)
Despliegue listo: http://localhost:8081
```

Las 8 verificaciones del commit 0ec9db8 (consultadas en la API de GitHub) son las 4 siguientes, una vez por la ejecución
en `main` y otra por la de `develop` (el mismo commit se publicó en ambas ramas): `quality` (flujo linter) — success;
`Pruebas PHP y cobertura` — success; `Pruebas end-to-end (Cypress)` — success; `Análisis de calidad (SonarQube)` —
skipped. Resultado de la
verificación posterior: `evidencias/cypress-despliegue/resumen-verificacion-despliegue.json` (1/1 aprobada, 6.2 s).

**Duraciones del pipeline para 0ec9db8 en `main`** (captura G-02, run #59): flujo `tests` 3 min 10 s en total; job *Pruebas PHP
y cobertura* 1 min 47 s; job *Pruebas end-to-end (Cypress)* 3 min 8 s (en paralelo); *Análisis de calidad (SonarQube)*
omitido. Flujo `linter` en `main`: 2 min 20 s. Enlace del run: https://github.com/WilliamAndree/SisWeb/actions/runs/45062599725

### 3.5 Figura de la Actividad 2

- **Figura D2** — `figuras/D2-arquitectura-tecnologica.png`: entorno de desarrollo, GitHub, GitHub Actions (CI),
  Cypress, SonarQube (Docker local), servidor XAMPP (Apache 8081 + PHP + MariaDB), aplicación desplegada y flujo del pipeline.

---

## 4. Actividad 3 — Cypress

### 4.1 Integración (3.1)

| Elemento | Configuración |
|---|---|
| Instalación | `cypress@16.2.1` como dependencia de desarrollo en `backend/package.json`. |
| Configuración | `backend/cypress.config.ts`: `baseUrl` = `CYPRESS_BASE_URL` o `http://127.0.0.1:8010`; viewport 1366×900; `defaultCommandTimeout` 20 s; `pageLoadTimeout` 90 s; reintentos 1 en modo `run`; video solo en CI; capturas en `cypress/screenshots`; bloquea `fonts.bunny.net`; al terminar escribe `cypress/reports/resumen.json`. |
| Entorno de pruebas | Instancia aislada: `APP_ENV=e2e` carga `.env.e2e` con base **`sisweb_e2e`**. La tarea `db:preparar` ejecuta `php artisan checkitse:e2e-preparar` (migra desde cero y siembra datos conocidos) **antes de cada escenario**. El comando se niega si el entorno no es `e2e` o la base no termina en `_e2e`. |
| Organización | `cypress/e2e/` (8 archivos `00-…` a `07-…`), `cypress/support/e2e.ts` (cuentas de prueba y comandos `cy.ingresar`, `cy.prepararBase`), `cypress/fixtures/declaracion-firmada.png`, `cypress/tsconfig.json`. |
| Dirección de la aplicación | Local/CI: `php artisan serve` en `127.0.0.1:8010`. Tras el despliegue: `CYPRESS_BASE_URL=http://localhost:8081` (solo la prueba de humo, que no modifica datos). |
| Verificación de comunicación | E2E-00 hace `cy.request('/up')` (200) y visita portada, directorio e ingreso. |
| Ejecución local | `scripts/cypress.ps1` (levanta MariaDB si hace falta, crea `sisweb_e2e`, inicia el servidor, ejecuta Cypress y muestra el resumen). |

Datos de prueba sembrados (`E2eSeeder`): catálogo normativo, proveedores, cuentas de demostración
(emprendedora `donamaria@huancayo.pe` / `password123` con el local «Minimarket El Carmen»; administración
`admin@checkitse.local` / `CheckItse2026!`) y los 42 locales de demostración para reportes. Son cuentas de la base de
pruebas, no de producción.

### 4.2 Fichas de los escenarios (3.2) — 8 escenarios, 10 casos

Resultados de la corrida completa del 22/11/2026 (`evidencias/cypress/resumen-cypress.json`).

**E2E-00 · Verificación del despliegue** (`00-humo-despliegue.cy.ts`)
- Funcionalidad: disponibilidad general (salud, portada, directorio, ingreso).
- Objetivo: comprobar que la aplicación desplegada responde y sus páginas principales cargan.
- Datos de prueba: ninguno (solo lectura).
- Procedimiento: `GET /up`; visitar `/` y verificar el título «Abre tu negocio…» y el botón «Simular mi local gratis» que apunta a `/autoevaluacion/nueva`; visitar `/directorio` y verificar el título «Proveedores»; visitar `/login` y ver el campo de correo.
- Resultado esperado: `/up` = 200 y todos los elementos visibles.
- Resultado obtenido: todo correcto (4.2 s en la suite; 6.2 s contra el servidor XAMPP tras el despliegue). Capturas: `E2E-00-despliegue-login.png`.
- Estado: **Aprobado**.

**E2E-01 · Autenticación de usuarios** (`01-autenticacion.cy.ts`) — 2 casos
- Funcionalidad: inicio y cierre de sesión.
- Objetivo: rechazar credenciales incorrectas y permitir el acceso con credenciales válidas.
- Datos de prueba: `donamaria@huancayo.pe` con clave incorrecta `clave-incorrecta`; luego con `password123`.
- Procedimiento: (a) escribir correo y clave errónea, enviar; (b) ingresar con la clave correcta, abrir `/panel-ciudadano`, ver «Minimarket El Carmen», pulsar «Cerrar sesión».
- Resultado esperado: (a) se queda en `/login` y el campo correo queda marcado `aria-invalid="true"`; (b) ve su panel con su local y, al salir, aparece «Ingresar».
- Resultado obtenido: (a) 19.9 s, correcto; (b) 25.3 s, correcto. Capturas: `E2E-01-login-rechazado.png`, `E2E-01-panel-emprendedora.png`.
- Estado: **Aprobado** (2/2).

**E2E-02 · Registro de cuenta y validación del formulario** (`02-registro-validacion.cy.ts`) — 2 casos
- Funcionalidad: registro de información / validación de formularios.
- Objetivo: impedir el registro con contraseñas distintas y crear la cuenta cuando los datos son válidos.
- Datos de prueba: nombre «Rosa Huamán», correo `rosa.e2e@ejemplo.pe`, teléfono 964123456, clave `ClaveSegura2026!` (y `OtraClave2026!` como confirmación errónea).
- Procedimiento: llenar el formulario de `/registro` y pulsar «Crear mi cuenta» (primero con confirmación distinta, luego igual).
- Resultado esperado: (a) se queda en `/registro` con un campo `aria-invalid="true"`; (b) sale de `/registro` con la sesión iniciada (botón «Cerrar sesión» presente).
- Resultado obtenido: (a) 22.5 s, correcto; (b) 28.8 s, correcto. Capturas: `E2E-02-registro-validacion.png`, `E2E-02-cuenta-creada.png`.
- Estado: **Aprobado** (2/2).

**E2E-03 · Evaluación de un local (proceso principal)** (`03-evaluacion-local.cy.ts`)
- Funcionalidad: autoevaluación completa (proceso principal del negocio).
- Objetivo: registrar un local, responder todas las condiciones y obtener el resultado.
- Datos de prueba: «Bodega Cypress», giro Comercio, RUC 10456789123, 60 m², 1 piso, aforo 12, todas las características especiales en «No»; la primera condición se responde «No cumple» y las demás «Sí cumple».
- Procedimiento: completar los 3 pasos del asistente; en el checklist recorrer cada especialidad y responder; pulsar «Ver Resumen y Diagnóstico Final».
- Resultado esperado: llega a `/autoevaluacion/{id}/resumen`, muestra «Así está tu local» y el contador «Falta» es mayor que 0.
- Resultado obtenido: 29.9 s, correcto. Capturas: `E2E-03-condiciones-respondidas.png`, `E2E-03-resultado.png`.
- Estado: **Aprobado**.

**E2E-04 · Corrección de lo que falta** (`04-correccion-pendientes.cy.ts`)
- Funcionalidad: actualización de registros (subsanación).
- Objetivo: verificar que una corrección declarada solo con una nota descuenta lo pendiente y que se puede deshacer.
- Datos de prueba: local de la emprendedora de demostración (2 condiciones pendientes); nota «Compré el extintor en una ferretería del centro y lo instalé.».
- Procedimiento: ver el resumen (Falta = 2) → «Ya lo corregí» en la primera condición → escribir la nota → confirmar → volver al resumen → «Deshacer» → volver al resumen.
- Resultado esperado: tras corregir, Falta = 1 y aparece «Corregiste 1 cosa»; tras deshacer, Falta = 2.
- Resultado obtenido: 33.7 s, correcto. Capturas: `E2E-04-corregido.png`, `E2E-04-resumen-actualizado.png`.
- Estado: **Aprobado**.

**E2E-05 · Expediente digital: subir y eliminar un documento** (`05-expediente-documentos.cy.ts`)
- Funcionalidad: registro y eliminación de información (archivos).
- Objetivo: subir la declaración jurada firmada y luego eliminarla.
- Datos de prueba: archivo `cypress/fixtures/declaracion-firmada.png`.
- Procedimiento: abrir `/autoevaluacion/{id}/expediente-digital`, seleccionar el archivo en la tarjeta «declaración jurada», esperar la recarga (intercepción de red), pulsar el botón de papelera «Eliminar declaración jurada» y confirmar «Sí, eliminar».
- Resultado esperado: la tarjeta muestra «Listo» tras subir y deja de mostrarlo tras eliminar.
- Resultado obtenido: 29.6 s, correcto. Capturas: `E2E-05-documento-subido.png`, `E2E-05-documento-eliminado.png`.
- Estado: **Aprobado**.

**E2E-06 · Reportes de impacto (administración)** (`06-reportes-admin.cy.ts`)
- Funcionalidad: módulo de reportes (Actividad 5).
- Objetivo: comprobar que los indicadores salen de la base, que el filtro funciona y que se exporta el CSV.
- Datos de prueba: cuenta `admin@checkitse.local`; filtro «Desde» = hace 365 días; distrito «El Tambo».
- Procedimiento: abrir `/admin/reportes`, leer el indicador «Locales evaluados», filtrar por El Tambo, revisar la tabla de condiciones y descargar el CSV.
- Resultado esperado: total > 0; con el filtro el total baja; la tabla tiene filas; el CSV responde 200 y contiene la columna «Preparación al evaluar (%)».
- Resultado obtenido: 28.2 s, correcto. Capturas: `E2E-06-reportes.png`, `E2E-06-reportes-filtrado.png`.
- Estado: **Aprobado**.

**E2E-07 · Directorio de proveedores** (`07-directorio-proveedores.cy.ts`)
- Funcionalidad: navegación entre módulos.
- Objetivo: ir de la portada al directorio y filtrar por especialidad.
- Datos de prueba: categoría «Extintores».
- Procedimiento: en la portada pulsar «Aliados técnicos»; en el directorio pulsar «Extintores».
- Resultado esperado: URL `/directorio?categoria=incendios`, lista con al menos un proveedor y el primero muestra «Extintores».
- Resultado obtenido: 25.0 s, correcto. Captura: `E2E-07-directorio-filtrado.png`.
- Estado: **Aprobado**.

### 4.3 Resultados (3.3)

| Medida | Valor |
|---|---|
| Archivos de prueba (escenarios) | 8 |
| Pruebas ejecutadas (casos `it`) | 10 |
| Aprobadas | 10 |
| Fallidas | 0 |
| Porcentaje de aprobación | 100 % |
| Reintentos usados | 0 |
| Tiempo de ejecución (local, Windows) | 247.3 s (≈ 4 min 7 s), Cypress 16.2.1, Electron 146 |
| Tiempo en el pipeline (job de GitHub Actions, incluye instalación) | 3 min 8 s (commit 0ec9db8, `main`; incluye instalar Cypress y preparar la base) |
| Errores identificados en la corrida final | Ninguno |

**Errores encontrados y corregidos durante la implementación** (análisis de resultados):
1. Elementos ocultos: las preguntas plegadas del asistente no se podían pulsar → se seleccionan solo los grupos visibles (`fieldset:visible`).
2. Animaciones de aparición al bajar: algunos títulos son invisibles hasta hacer scroll → se valida el texto, no la visibilidad.
3. Reintentos que heredaban datos del intento anterior → la base se reinicia antes de **cada** escenario (`beforeEach(prepararBase)`).
4. Carrera en la subida de archivos (la página se recarga) → se intercepta la recarga con `cy.intercept` y se espera.
5. Servidor de PHP de un solo hilo en equipos modestos → tiempos de espera mayores (20 s/90 s) y fuentes externas bloqueadas.
6. En el pipeline, la prueba de humo devolvía 500 porque la base del runner estaba vacía → se agregó el paso «Preparar entorno e2e» antes de levantar la app.
7. **Defecto real de la aplicación detectado gracias a E2E-04:** una corrección se contaba dos veces («Corregiste 2» en lugar de 1) → se corrigió `SubsanacionSyncService::codigosCorregidos()` (cuenta cada condición una sola vez, con su última corrección).

### 4.4 Integración con el pipeline (3.4)

- **Etapa:** etapa 4 (Pruebas), job `Pruebas end-to-end (Cypress)` del flujo `tests`, en paralelo con las pruebas PHP, en cada *push* o *pull request* a `develop` y `main`.
- **Pasos del job:** instalar PHP 8.2 y Node 22 → `npm ci` + `npx cypress install` + `composer install` → `npm run build` → crear `.env.e2e` y ejecutar `checkitse:e2e-preparar` sobre un MariaDB 10.11 temporal → `php artisan serve` (espera hasta que `/up` responda) → `npx cypress run --browser electron`.
- **Condición para continuar:** todas las pruebas deben pasar. El despliegue (etapa 6) consulta el estado de estos jobs en la API de GitHub y **no despliega** si alguno falló.
- **Si una prueba falla:** el job termina en rojo, el commit queda marcado como fallido, cada escenario fallido aparece como **anotación** con su mensaje de error, las últimas líneas de `laravel.log` se muestran como advertencias, y el script de despliegue se niega a publicar esa versión.
- **Presentación y almacenamiento de resultados:** tabla resumen (Total / Aprobadas / Fallidas / Tiempo) en el *Job Summary* de GitHub; artefacto descargable `evidencias-cypress` con capturas, videos, `resumen.json` y logs. Localmente, `cypress/reports/resumen.json` y capturas en `cypress/screenshots`.
- **Tras el despliegue:** el servidor ejecuta E2E-00 contra `http://localhost:8081` (resumen en `cypress/reports/resumen-despliegue.json`).

Evidencias: `evidencias/github/G-02-pipeline-tests-main.png` (run #59 en verde), `G-03-job-cypress.png` (detalle del job, run 45062599725, job 137331621766), `G-01-actions-lista.png` (historial de ejecuciones en verde en `main` y `develop`), `evidencias/cypress/salida-consola-cypress.txt`.

---

## 5. Actividad 4 — SonarQube

### 5.1 Configuración (4.1)

| Elemento | Detalle |
|---|---|
| Servidor | SonarQube 9.9 LTS Community en Docker (`sonarqube:lts-community`, contenedor `sonarqube-server`, http://localhost:9000). |
| Proyecto | Clave `ITSE`, nombre «CheckITSE Huancayo», versión 1.1 (`backend/sonar-project.properties`). |
| Código analizado | `app`, `routes`, `resources/js`, `database`, `config` (PHP y TypeScript/React). Excluidos: `vendor`, `node_modules`, `public`, `storage`, `bootstrap/cache`, CSS. |
| Pruebas | `tests/**/*Test.php` y `tests/Frontend/**`. |
| TypeScript | `tsconfig.sonar.json` (compatible con el analizador de SonarQube 9.9). |
| Cobertura | Archivo Clover `coverage.xml` generado por Pest + PCOV en un contenedor desechable (`scripts/cobertura-docker.ps1`: MariaDB temporal + PHP 8.2). Se mide sobre `app/` (lógica PHP); las pantallas React se prueban con Cypress y `node --test`. |
| Duplicados | Los *seeders* de datos de demostración y `config/aliados.php` se excluyen del cálculo de duplicados. |
| Analizador | Imagen oficial `sonarsource/sonar-scanner-cli` en Docker (`scripts/sonar.ps1`); no requiere instalar Java. El token se pasa como parámetro o variable de entorno, nunca se guarda en el repositorio. |
| Quality Gate | «Sonar way» sobre el código nuevo (respecto de la versión anterior, 18/11/2026): calificaciones de confiabilidad, seguridad y mantenibilidad A, cobertura ≥ 80 % y duplicación ≤ 3 %. |

### 5.2 Integración con el pipeline (4.2)

- **Momento:** etapa 5 (Calidad), después de las pruebas PHP (porque necesita su cobertura).
- **Dónde y por qué:** SonarQube necesita Java y ~2–3 GB de RAM; el servidor XAMPP no tiene IP pública, así que un
  runner de GitHub no puede consultarlo. Por eso el análisis se ejecuta en Docker en el equipo de desarrollo antes de
  integrar a `main`. El job `sonarqube` del flujo `tests` ya está implementado (escaneo + `sonarqube-quality-gate-action`,
  que detiene el pipeline si el Quality Gate falla) y se activa automáticamente si se configura un servidor SonarQube
  accesible (variable `SONAR_HOST_URL` y secreto `SONAR_TOKEN`); mientras tanto figura como *skipped* en GitHub.
- **Condiciones de ejecución:** cobertura generada primero; token válido; contenedor activo.
- **Presentación:** panel web del proyecto (`http://localhost:9000/dashboard?id=ITSE`) y API web (JSON guardado en `evidencias/sonarqube/`).
- **Tratamiento de problemas:** los *bugs*, vulnerabilidades y *hotspots* se corrigen antes de integrar. Ejemplo real
  de esta práctica: el Quality Gate **falló** por 18 *security hotspots* (uso de `mt_rand` en el generador de datos de
  demostración); se corrigió en el código (generador con semilla fija) en lugar de marcarlos como «seguros», y el Quality
  Gate volvió a **aprobar** (commit feed4e9).
- **Condición para continuar o detener:** política del equipo: no se integra a `main` con el Quality Gate en rojo; en el
  job automatizado, `sonarqube-quality-gate-action` hace fallar el pipeline.

### 5.3 Métricas (4.3)

Fuente: `evidencias/sonarqube/metricas.json`, `quality-gate.json`, `ultimo-analisis.json` (API de SonarQube).
Análisis del código del commit **0ec9db8 (el mismo que está desplegado)** ejecutado el **22/11/2026 a las 19:59 UTC (14:59 hora de Perú)**.

| Métrica | Resultado | Interpretación |
|---|---|---|
| Quality Gate | **OK** (Passed) | Cumple todas las condiciones del «Sonar way» sobre el código nuevo: confiabilidad A, seguridad A, mantenibilidad A, cobertura nueva 94.9 % (≥ 80 %), duplicación nueva 0.62 % (≤ 3 %). |
| Bugs | 0 | No se detectaron defectos probables. Calificación de confiabilidad A. |
| Vulnerabilities | 0 | Sin problemas de seguridad. Calificación de seguridad A. *Security hotspots*: 0 pendientes (100 % revisados). |
| Code Smells | 734 | Problemas de mantenibilidad (deuda técnica estimada 2 546 min ≈ 42 h). Calificación de mantenibilidad A. Ver detalle abajo. |
| Coverage | 90.0 % | Porcentaje de líneas de `app/` ejecutadas por las 775 pruebas PHP (7 678 líneas a cubrir, 771 sin cubrir). |
| Duplicated Lines | 3.2 % | 3.2 % del código total; en el código nuevo es 0.62 %, bajo el umbral de 3 %. Los seeders de demostración y config/aliados.php no cuentan para este cálculo. |

Tamaño analizado: 43 787 líneas de código en 243 archivos.

**Detalle de los code smells** (`code-smells-por-carpeta-y-regla.json`):

| Por severidad | Cantidad |
|---|---|
| BLOCKER | 0 |
| CRITICAL | 50 |
| MAJOR | 644 |
| MINOR | 28 |
| INFO | 12 |

| Regla más frecuente | Qué significa | Cantidad |
|---|---|---|
| php:S103 | Líneas demasiado largas (textos normativos, mensajes y datos) | 569 |
| php:S112 | Se lanza una excepción genérica en lugar de una propia | 18 |
| php:S1808 | Formato que no sigue el estándar PSR | 18 |
| typescript:S3776 | Funciones con complejidad cognitiva alta | 17 |
| typescript:S3358 | Operadores ternarios anidados | 16 |
| php:S1192 | Cadenas de texto repetidas que deberían ser constantes | 16 |
| php:S3776 | Funciones PHP con complejidad cognitiva alta | 16 |
| typescript:S6479 | Índice del arreglo usado como `key` en listas de React | 10 |

| Carpeta con más observaciones | Cantidad |
|---|---|
| app/Services/Espacio (croquis y análisis espacial) | 130 |
| app/Http/Controllers | 97 |
| database/seeders (datos normativos y de demostración) | 95 |
| app/Services (servicios generales) | 67 |
| app/Services/Monitoreo | 66 |
| app/Services/AI | 51 |
| routes | 41 |
| app/Console/Commands | 31 |

### 5.4 Respuestas (4.4)

1. **¿Qué resultado obtuvo el proyecto en el Quality Gate?** **Aprobado (OK / Passed).** Se cumplen las 5 condiciones sobre el código nuevo: confiabilidad A, seguridad A, mantenibilidad A, cobertura del código nuevo 94.9 % (mínimo 80 %) y duplicación del código nuevo 0.62 % (máximo 3 %). Antes de corregir los 18 *security hotspots* el Quality Gate había fallado.
2. **¿Qué problemas fueron identificados?** 0 bugs y 0 vulnerabilidades. Se identificaron 734 *code smells* (50 CRITICAL, 644 MAJOR, 28 MINOR, 12 INFO, ninguno BLOCKER). El más
   frecuente es la regla `php:S103` (líneas demasiado largas, sobre todo
   textos normativos y datos de demostración). Le siguen el uso de excepciones genéricas (`php:S112`), detalles de formato
   del estándar PSR (`php:S1808`) y funciones con complejidad cognitiva alta en
   TypeScript (`typescript:S3776`). Durante la práctica también aparecieron 18 *security hotspots* (`mt_rand`), ya corregidos.
3. **¿Qué componentes presentan mayores observaciones?** `app/Services/Espacio` (130, lógica geométrica del croquis con funciones extensas), `app/Http/Controllers` (97), `database/seeders` (95, líneas largas con textos normativos y de demostración), servicios generales de `app/Services` (67) y `app/Services/Monitoreo` (66). En el frontend, las observaciones principales son de complejidad cognitiva (`typescript:S3776`, 17) y ternarios anidados (`typescript:S3358`, 16).
4. **¿Qué mejoras deberían implementarse?** (a) Partir las líneas largas y mover textos normativos a archivos de datos;
   (b) reemplazar `\Exception` genérica por excepciones propias del dominio; (c) dividir las funciones y componentes con
   complejidad cognitiva alta (servicios de `Espacio`, componentes del croquis); (d) subir la cobertura de los servicios
   espaciales; (e) publicar SonarQube en un servidor accesible para activar el job automático del pipeline.
5. **¿Cómo contribuye SonarQube al aseguramiento de la calidad?** Mide de forma objetiva y repetible la confiabilidad,
   seguridad, mantenibilidad, cobertura y duplicación; el Quality Gate convierte esas métricas en una decisión
   (aprobar/rechazar) sobre el código nuevo, y detectó problemas reales que las pruebas no detectan (los 18 *hotspots*).
6. **¿Cómo se relaciona el análisis con la integración continua?** Es la etapa 5 del pipeline: se ejecuta después de las
   pruebas (usa su reporte de cobertura) y antes de integrar a `main`, que es la rama que se despliega. El job
   automático con Quality Gate bloqueante ya está en `tests.yml` y se activa al disponer de un servidor accesible;
   hoy se ejecuta con el mismo escáner en Docker local por la restricción de red del servidor.

**Capturas del panel** (tomadas del SonarQube local con la sesión del administrador del proyecto):
`S-00-panel-codigo-total.png` (pestaña *Overall Code*: Passed, 0 bugs, 0 vulnerabilidades, 0 hotspots revisados al
100 %, 734 code smells, cobertura 90.0 %, duplicación 3.2 %; en «Activity» se ve el Quality Gate **Failed** a la 1:05 y
**Passed** a la 1:24 tras corregir los hotspots), `S-01-panel-general.png` (pestaña *New Code*), `S-02-issues.png`
(issues por severidad), `S-03-cobertura.png` (cobertura por carpeta) y `S-04-actividad.png` (historial de análisis).
El panel muestra el aviso «You're running a version of SonarQube that is no longer active»: SonarQube 9.9 LTS ya no
recibe soporte; se recomienda actualizar a la versión LTA vigente (ver recomendaciones).

---

## 6. Actividad 5 — Reportes funcionales e impacto

### 6.1 Indicadores (5.1)

Todos se calculan en `app/Services/ReportesImpactoService.php` con los registros de la base (no hay valores fijos).
Se consideran las autoevaluaciones **registradas (selladas)** dentro del rango de fechas y filtros.

| # | Indicador | Cálculo | Qué evidencia |
|---|---|---|---|
| 1 | Locales evaluados | Número de autoevaluaciones selladas en el periodo. | Alcance/uso del sistema. |
| 2 | Preparación promedio **al evaluar → hoy** | «Antes»: % de condiciones aplicables que se cumplían al sellar (se lee de la foto sellada `payload_canonico`, que nunca se modifica). «Después»: `porcentaje_cumplimiento` actual, que sube con cada corrección. | Mejora real del local gracias al sistema. |
| 3 | Listos para la inspección | Locales en semáforo VERDE y su porcentaje sobre el total. | Resultado final esperado. |
| 4 | Tasa de corrección | Condiciones corregidas ÷ condiciones que faltaban al evaluar × 100 (cada condición se cuenta una sola vez). | Si el emprendedor actúa sobre lo que le falta. |
| 5 | Días para corregir | Promedio de días entre el sellado y la última corrección de cada local. | Rapidez de la mejora. |
| 6 | Contactos por WhatsApp | Clics al botón de WhatsApp de proveedores (`eventos_proveedor`, tipo `clic_whatsapp`) en el periodo. Depende del proveedor, no del local: respeta los filtros de fecha y origen, no los de distrito/giro/estado. | Conexión entre emprendedores y proveedores. |

### 6.2 Módulo implementado (5.2)

- Ruta `GET /admin/reportes` (solo administración; menú «Reportes») — página `resources/js/pages/Admin/Reportes.tsx`.
- **Filtros:** fecha desde/hasta, distrito, giro (función económica), estado (semáforo) y **origen** (todos / reales / demostración). Se envían por la URL (GET), así que cada vista filtrada se puede compartir.
- **Indicadores:** 6 tarjetas (tabla anterior).
- **Gráficos:** evaluaciones y locales listos por mes (barras), preparación antes vs. después por distrito, distribución por estado.
- **Tablas:** condiciones que más faltaban (top 10, con cuántas se corrigieron y %) y últimos 25 locales.
- **Exportación:** `GET /admin/reportes/exportar` → CSV con los mismos filtros (UTF-8 con BOM, separador `;`, se abre en Excel).
- **Pruebas:** `tests/Feature/ReportesImpactoTest.php` (5 pruebas: acceso solo admin; indicadores iguales a los registros de la base; los filtros cambian el resultado; CSV con una fila por local; WhatsApp respeta el filtro de origen) + escenario Cypress E2E-06.

**Origen de los datos (decirlo explícitamente en el informe):** la base de producción tiene **1 evaluación real**
(un emprendedor real que usó el sistema) y **42 evaluaciones de demostración** con código `DEMO-` y cuentas
`@checkitse.local`, generadas por `DemoImpactoSeeder` **usando el propio motor del sistema** (mismo motor de
aplicabilidad, cálculo de riesgo, sellado y servicio de correcciones) a lo largo de 6 meses, para probar los reportes
con volumen. El filtro «Origen» permite ver cada grupo por separado y la página lo indica debajo de los filtros.

### 6.3 Cifras obtenidas (consultadas el 22/11/2026, periodo 22/11/2025 – 22/11/2026)

Fuente: `evidencias/reportes-consulta-servicio.json` (salida del servicio) y capturas R-01 a R-05.

| Indicador | Todos (43) | Solo reales (1) | Solo demostración (42) |
|---|---|---|---|
| Locales evaluados | 43 | 1 | 42 |
| Preparación al evaluar → hoy | 74.4 % → 88.9 % (+14.5 pp) | 81.8 % → 100 % | 74.2 % → 88.7 % |
| Listos para la inspección | 11 (25.6 %) | 1 (100 %) | 10 (23.8 %) |
| Condiciones que faltaban / corregidas | 113 / 64 | 2 / 2 | 111 / 62 |
| Tasa de corrección | 56.6 % | 100 % | 55.9 % |
| Días promedio para corregir | 14.9 | 4 | 15.2 |
| Contactos por WhatsApp | 180 | 0 | 180 |

**Por estado (todos):** Listo 11 · Casi listo 10 · Necesita atención 22.

**Por distrito (todos):**

| Distrito | Locales | Preparación al evaluar | Preparación hoy | Listos |
|---|---|---|---|---|
| El Tambo | 17 | 69.3 % | 86.9 % | 3 |
| Huancayo | 14 | 80.0 % | 91.0 % | 3 |
| Chilca | 12 | 75.1 % | 89.4 % | 5 |

**Por mes (evaluados / listos):** jun-26 4/1 · jul-26 5/0 · ago-26 4/0 · sep-26 7/3 · oct-26 12/4 · nov-26 11/3
(meses anteriores sin registros).

**Condiciones que más faltaban (top 10):**

| Código | Condición | Faltaban | Corregidas | % |
|---|---|---|---|---|
| CRIT-01 | Extintor portátil adecuado y vigente | 18 | 11 | 61.1 |
| CRIT-08 | Luces de emergencia autónomas operativas | 15 | 11 | 73.3 |
| CRIT-05 | Puesta a tierra con constancia documental ≤25 Ω | 14 | 8 | 57.1 |
| CRIT-02B | Señalización básica de seguridad y evacuación | 14 | 7 | 50.0 |
| CRIT-07 | Cables canalizados, sin cables expuestos o «mellizos» | 12 | 5 | 41.7 |
| CRIT-06 | Tablero con mandil protector y diferencial en tomacorrientes | 9 | 6 | 66.7 |
| CRIT-13 | Mobiliario alto y estanterías con arriostramiento antisísmico | 8 | 5 | 62.5 |
| CRIT-03 | Rutas y pasadizos de evacuación libres de obstáculos | 7 | 3 | 42.9 |
| CRIT-14A | Espacio libre de 1 metro frente al tablero eléctrico | 7 | 5 | 71.4 |
| CRIT-04 | Puertas de evacuación libres de trabas durante atención | 6 | 2 | 33.3 |

**Filtros de las capturas:**
- R-03 (distrito El Tambo): 17 locales; 69.3 % → 86.9 %; 3 listos (17.6 %); 53 faltaban / 30 corregidas (56.6 %); 16.3 días.
- R-04 (origen: reales): 1 local; 81.8 % → 100 %; 1 listo; tasa 100 %; 4 días; WhatsApp 0.
- R-05 (estado «Necesita atención» + giro «Encuentro»): 5 locales; 80.0 % → 89.1 %; 0 listos; 11 faltaban / 5 corregidas (45.5 %); 14.7 días.

### 6.4 Análisis del impacto funcional (5.3)

1. **¿Qué problema busca solucionar el software?** Que los emprendedores de Huancayo lleguen a la ITSE sin saber qué se
   les va a verificar, lo que provoca observaciones, multas, clausuras y pérdida de tiempo y dinero. CheckITSE les
   permite revisar su local antes, saber exactamente qué falta, corregirlo con apoyo de proveedores y reunir su expediente.
2. **¿Qué indicadores permiten evaluar los resultados?** Los 6 de la tabla 6.1; los principales son la preparación
   antes/después, la tasa de corrección y los locales listos.
3. **¿Cómo contribuye el software a mejorar el proceso?** Convierte la norma en una lista concreta y adaptada a cada
   local; registra qué faltaba en una foto sellada; permite corregir y ver el avance; conecta con proveedores por
   WhatsApp. En los datos disponibles, la preparación promedio sube de 74.4 % a 88.9 % (+14.5 puntos) y se corrige el
   56.6 % de lo que faltaba.
4. **¿Qué información facilita la toma de decisiones?** Las condiciones que más faltan (extintor, luces de emergencia,
   pozo a tierra, señalización) indican dónde enfocar campañas o alianzas con proveedores; el reporte por distrito
   muestra que **El Tambo** es el que llega menos preparado (69.3 %); el reporte por mes muestra la evolución del uso;
   el CSV permite análisis externos.
5. **¿Qué beneficios se esperan obtener?** (beneficios **potenciales**, no medidos todavía): menos observaciones y
   multas en la inspección real; menor tiempo para obtener el certificado; más ventas para proveedores locales;
   información agregada útil para la municipalidad.
6. **¿Qué resultados concretos se pueden demostrar con los datos disponibles?** (resultados **medidos**):
   - Con el **registro real** (1 local): preparación de 81.8 % a 100 %, 2 de 2 condiciones corregidas en 4 días, local listo para la inspección.
   - Con los **datos de demostración** generados con el motor del sistema (42 locales): preparación de 74.2 % a 88.7 %, 55.9 % de corrección, 15.2 días en promedio, 180 contactos por WhatsApp. Demuestran que los cálculos, filtros, gráficos y exportación funcionan con volumen; **no** son resultados de usuarios reales.
   - Que los reportes leen la base: la prueba automatizada compara cada indicador con una consulta directa a la base y E2E-06 comprueba que el filtro cambia el resultado.

**Comparación antes / después:** «antes» = estado del local al sellar la evaluación (foto inmutable); «después» = estado
actual tras las correcciones. Para comparar el resultado **en la inspección municipal real** (aprobó / fue observado)
hace falta recoger ese dato; se propone como trabajo futuro.

**Beneficios medidos vs. esperados:**

| Tipo | Beneficio | Evidencia |
|---|---|---|
| Medido (real) | Un local real pasó de 81.8 % a 100 % y quedó listo en 4 días. | R-04, consulta del servicio. |
| Medido (demostración) | +14.5 pp de preparación promedio; 56.6 % de corrección. | R-01, R-02. |
| Medido (funcional) | Los indicadores coinciden con la base y los filtros funcionan. | `ReportesImpactoTest`, E2E-06. |
| Esperado | Menos observaciones/multas en la ITSE real; menos tiempo hasta el certificado. | Requiere seguimiento con datos de la municipalidad. |
| Esperado | Más contactos y ventas para proveedores locales. | Requiere más usuarios reales. |

---

## 7. Otras pruebas automatizadas (complemento)

| Conjunto | Resultado | Fuente |
|---|---|---|
| Pruebas PHP (Pest) | 775 pruebas aprobadas, 0 fallidas (5 356 aserciones) | `scripts/cobertura-docker.ps1` y job de CI |
| Pruebas de interfaz (`node --test`) | 30/30 aprobadas | `npm run test:frontend` |
| Estilo y tipos | Pint, Prettier, ESLint y `tsc` sin errores | flujo `linter` en verde |

Antes de esta práctica el pipeline de GitHub estaba fallando: las pruebas no encontraban las páginas de Inertia en
Linux (`js/Pages` vs `js/pages`), faltaba PCOV para la cobertura y el linter tenía errores. Se corrigieron y desde el
commit 19bb291 todos los flujos están en verde.

---

## 8. Organización del trabajo grupal (sección V)

| Integrante | Responsabilidad principal | Actividades |
|---|---|---|
| [Integrante 1] | Arquitectura y tecnologías | Análisis de la arquitectura, tabla de APIs, adaptación al servidor XAMPP, sitio de Apache, script de despliegue, diagramas D1–D3. |
| [Integrante 2] | Automatización y calidad | Configuración de Cypress, 8 escenarios (10 casos), integración en GitHub Actions, configuración de SonarQube, corrección de *hotspots*, interpretación de métricas. |
| [Integrante 3] | Reportes e integración | Módulo de reportes (servicio, controlador, página, CSV), indicadores, datos de demostración, pruebas del módulo, apoyo en el despliegue. |

Los tres integrantes revisaron el pipeline completo y deben poder explicar la arquitectura y las herramientas.
(El equipo puede ajustar esta distribución a lo que realmente hizo cada uno.)

---

## 8b. Matrices para el informe

### M-1 Matriz de trazabilidad: requisito de la guía → implementación → evidencia

| Req. guía | Qué pide | Implementación en el proyecto | Verificación / evidencia |
|---|---|---|---|
| 1.1 | Arquitectura actual | Monolito modular Laravel + Inertia + React (sección 2.1) | Figura D1, D3 |
| 1.2 | Adaptación de la arquitectura | `config/inertia.php`, 3 bases separadas, `.env` por entorno, sitio Apache versionado | Pipeline en verde (G-01, G-02) |
| 1.3 | Diagrama + APIs | D1 + tabla de 7 APIs/servicios (2.3) | Figura D1 |
| 2.1 | Tabla de tecnologías | Sección 3.1 | `evidencias-texto-servidor.txt` |
| 2.2 | Características del servidor | `scripts/info-servidor.ps1` | `evidencias-texto-servidor.txt` |
| 2.3 | Adaptación tecnológica | Vite estático, `optimize`, PHP 8.2 en CI y servidor, tareas sin cron (`tareas-xampp.ps1`) | `ProgramadorTareasTest` |
| 2.4 | Pipeline de 7 etapas | `tests.yml`, `lint.yml`, `desplegar-xampp.ps1` con puerta de CI | `registro-despliegue-xampp.txt`, G-02 |
| 2.5 | Diagrama tecnológico | D2 | Figura D2 |
| 3.1 | Integrar Cypress | `cypress.config.ts`, base `sisweb_e2e`, `checkitse:e2e-preparar` | E2E-00 |
| 3.2 | ≥ 5 escenarios con ficha | 8 escenarios / 10 casos (4.2) | Capturas E2E-00 a E2E-07 |
| 3.3 | Resultados | 10/10, 247.3 s | `resumen-cypress.json` |
| 3.4 | Cypress en el pipeline | Job `Pruebas end-to-end (Cypress)` + E2E-00 tras el despliegue | G-03, `resumen-verificacion-despliegue.json` |
| 4.1 | Configurar SonarQube | `sonar-project.properties`, `sonar.ps1`, `cobertura-docker.ps1` | S-00 a S-04 |
| 4.2 | SonarQube en el pipeline | Job `sonarqube` condicional + ejecución local antes de integrar | `tests.yml`, S-04 |
| 4.3 | Métricas | Tabla 5.3 | `metricas.json`, `quality-gate.json` |
| 4.4 | 6 preguntas | Sección 5.4 | — |
| 5.1 | ≥ 3 indicadores | 6 indicadores (6.1) | R-01 |
| 5.2 | Módulo con filtros, gráficos, tablas, datos reales | `/admin/reportes` + CSV | R-01 a R-05, `ReportesImpactoTest`, E2E-06 |
| 5.3 | Impacto, 6 preguntas, medido vs. esperado | Sección 6.4 | `reportes-consulta-servicio.json` |

### M-2 Matriz de cobertura de escenarios Cypress (tipos sugeridos por la guía)

| Tipo sugerido en la guía (3.2) | E2E-00 | E2E-01 | E2E-02 | E2E-03 | E2E-04 | E2E-05 | E2E-06 | E2E-07 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Autenticación de usuarios | | ✔ | | | ✔ | ✔ | ✔ | |
| Registro de información | | | ✔ | ✔ | | ✔ | | |
| Actualización de registros | | | | | ✔ | | | |
| Eliminación de información | | | | | | ✔ | | |
| Validación de formularios | | ✔ | ✔ | | | | | |
| Navegación entre módulos | ✔ | | | | | | | ✔ |
| Procesos principales del negocio | | | | ✔ | ✔ | ✔ | ✔ | |
| Verificación de despliegue | ✔ | | | | | | | |

(E2E-04, 05 y 06 inician sesión como paso previo, por eso también ejercitan la autenticación.)

### M-3 Matriz de responsabilidades (RACI) por actividad

R = responsable, A = aprueba, C = consultado, I = informado. Ajustar a lo que realmente hizo cada integrante.

| Actividad | Integrante 1 | Integrante 2 | Integrante 3 |
|---|:-:|:-:|:-:|
| Act. 1 Arquitectura de software | R/A | C | C |
| Act. 2 Tecnología, servidor y pipelines | R | C | A |
| Act. 3 Cypress | C | R/A | I |
| Act. 4 SonarQube | I | R/A | C |
| Act. 5 Reportes e impacto | C | I | R/A |
| Informe y sustentación | R | R | R |

### M-4 Matriz de control y monitoreo (procesos × indicadores)

Generada por el propio sistema con `php artisan checkitse:matriz-monitoreo` a partir del reporte JUnit de las pruebas,
la cobertura Clover y la API de SonarQube. Archivos: `evidencias/matriz-monitoreo/matriz-monitoreo.md` (tabla),
`matriz-monitoreo.xlsx` (Excel) e `historial.csv`. El pipeline de CI también la publica en el resumen de cada ejecución.

| Nivel | Código | Proceso | Pruebas | Fallidas | % Éxito | Cobertura % | Bugs | Vuln. | Code smells | Estado | Observación |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: | --- |
| Estratégico | E1 | Modelo de negocio y planes | 2 | 0 | 100 | 89.5 | 0 | 0 | 7 | 🟢 Verde | Sin observaciones |
| Estratégico | E2 | Calidad y mejora continua | 85 | 0 | 100 | 98.6 | 0 | 0 | 66 | 🟢 Verde | Sin observaciones |
| Misional | M1 | Registro del local | 47 | 0 | 100 | 93.4 | 0 | 0 | 45 | 🟢 Verde | Sin observaciones |
| Misional | M2 | Autoevaluación ITSE | 127 | 0 | 100 | 96.5 | 0 | 0 | 33 | 🟢 Verde | Sin observaciones |
| Misional | M3 | Resultado y plan de mejora | 42 | 0 | 100 | 85 | 0 | 0 | 19 | 🟢 Verde | Sin observaciones |
| Misional | M4 | Subsanación con proveedores | 109 | 0 | 100 | 89.3 | 0 | 0 | 72 | 🟢 Verde | Sin observaciones |
| Misional | M5 | Expediente digital | 150 | 0 | 100 | 87.5 | 0 | 0 | 148 | 🟢 Verde | Sin observaciones |
| Misional | M6 | Seguimiento del local | 75 | 0 | 100 | 100 | 0 | 0 | 2 | 🟢 Verde | Sin observaciones |
| Soporte | S1 | Cuentas y accesos | 47 | 0 | 100 | 97.9 | 0 | 0 | 0 | 🟢 Verde | Sin observaciones |
| Soporte | S2 | Gestión de proveedores | 13 | 0 | 100 | 92.7 | 0 | 0 | 24 | 🟢 Verde | Sin observaciones |
| Soporte | S3 | Cobros de planes | 19 | 0 | 100 | 100 | 0 | 0 | 0 | 🟢 Verde | Sin observaciones |
| Soporte | S4 | Administración y monitoreo | 30 | 0 | 100 | 96.9 | 0 | 0 | 37 | 🟢 Verde | Sin observaciones |
| Soporte | S5 | Plataforma y datos | 48 | 0 | 100 | 96.1 | 0 | 0 | 5 | 🟢 Verde | Sin observaciones |

Nota: la suma de la columna «Pruebas» (794) supera las 775 pruebas porque algunas pruebas verifican más de un proceso y se cuentan en cada uno.

Resumen: 775 pruebas (0 fallidas), cobertura de la lógica 90.2 % (calculada por la matriz sobre el Clover; SonarQube informa 90.0 % con su propio conteo de líneas), Quality Gate aprobado, 13 de 13 procesos en verde (100 %). Regla del semáforo: verde = todas sus pruebas pasan, cobertura ≥ mínimo y sin bugs ni vulnerabilidades; amarillo = pruebas pasan pero falta cobertura o alguna prueba declarada; rojo = alguna prueba falla, no hay pruebas o hay bugs/vulnerabilidades.

---

## 9. Índice de figuras (insertar en este orden)

| N.° | Archivo | Título sugerido | Sección |
|---|---|---|---|
| 1 | `figuras/D1-arquitectura-software.png` | Arquitectura de software de CheckITSE Huancayo | Act. 1 |
| 2 | `figuras/D3-modelo-datos.png` | Modelo de datos principal | Act. 1 |
| 3 | `figuras/D2-arquitectura-tecnologica.png` | Arquitectura tecnológica y flujo del pipeline | Act. 2 |
| 4 | `evidencias/github/G-01-actions-lista.png` | Historial de ejecuciones de GitHub Actions | Act. 2 |
| 5 | `evidencias/github/G-02-pipeline-tests-main.png` | Pipeline `tests` del commit 0ec9db8 en `main` | Act. 2 / 3 |
| 6 | `evidencias/app/A-02-salud-up-200.png` | Verificación de salud de la aplicación desplegada (`/up`) | Act. 2 |
| 7 | `evidencias/app/A-01-portada-desplegada.png` | Aplicación desplegada en Apache (puerto 8081) | Act. 2 |
| 8 | `evidencias/cypress-despliegue/E2E-00-despliegue-login.png` | Prueba de humo tras el despliegue | Act. 2 / 3 |
| 9 | `evidencias/cypress/E2E-01-login-rechazado.png` | E2E-01: credenciales incorrectas | Act. 3 |
| 10 | `evidencias/cypress/E2E-01-panel-emprendedora.png` | E2E-01: ingreso correcto | Act. 3 |
| 11 | `evidencias/cypress/E2E-02-registro-validacion.png` | E2E-02: validación del registro | Act. 3 |
| 12 | `evidencias/cypress/E2E-02-cuenta-creada.png` | E2E-02: cuenta creada | Act. 3 |
| 13 | `evidencias/cypress/E2E-03-condiciones-respondidas.png` | E2E-03: condiciones respondidas | Act. 3 |
| 14 | `evidencias/cypress/E2E-03-resultado.png` | E2E-03: resultado de la evaluación | Act. 3 |
| 15 | `evidencias/cypress/E2E-04-corregido.png` | E2E-04: corrección registrada | Act. 3 |
| 16 | `evidencias/cypress/E2E-04-resumen-actualizado.png` | E2E-04: resumen actualizado | Act. 3 |
| 17 | `evidencias/cypress/E2E-05-documento-subido.png` | E2E-05: documento subido | Act. 3 |
| 18 | `evidencias/cypress/E2E-05-documento-eliminado.png` | E2E-05: documento eliminado | Act. 3 |
| 19 | `evidencias/cypress/E2E-06-reportes.png` | E2E-06: reportes | Act. 3 |
| 20 | `evidencias/cypress/E2E-06-reportes-filtrado.png` | E2E-06: reportes filtrados | Act. 3 |
| 21 | `evidencias/cypress/E2E-07-directorio-filtrado.png` | E2E-07: directorio filtrado | Act. 3 |
| 22 | `evidencias/github/G-03-job-cypress.png` | Job de Cypress en GitHub Actions | Act. 3 |
| 23 | `evidencias/sonarqube/S-00-panel-codigo-total.png` | Panel de SonarQube: código total y Quality Gate | Act. 4 |
| 24 | `evidencias/sonarqube/S-01-panel-general.png` | Panel de SonarQube: código nuevo | Act. 4 |
| 25 | `evidencias/sonarqube/S-02-issues.png` | Problemas detectados por SonarQube (por severidad) | Act. 4 |
| 26 | `evidencias/sonarqube/S-03-cobertura.png` | Cobertura por carpeta | Act. 4 |
| 27 | `evidencias/sonarqube/S-04-actividad.png` | Historial de análisis (Failed → Passed) | Act. 4 |
| 28 | `evidencias/app/R-01-reportes-indicadores.png` | Indicadores del módulo de reportes | Act. 5 |
| 29 | `evidencias/app/R-02-reportes-completo.png` | Módulo de reportes completo (gráficos y tablas) | Act. 5 |
| 30 | `evidencias/app/R-03-reportes-filtro-distrito.png` | Reporte filtrado por distrito (El Tambo) | Act. 5 |
| 31 | `evidencias/app/R-04-reportes-solo-reales.png` | Reporte solo con registros reales | Act. 5 |
| 32 | `evidencias/app/R-05-reportes-filtro-estado-giro.png` | Reporte filtrado por estado y giro | Act. 5 |
| 33 | `evidencias/app/A-03-directorio.png` | Directorio de proveedores desplegado | Anexo |
| 34 | `evidencias/app/A-04-admin-panel.png` | Panel de administración con el menú Reportes | Anexo |

Fuente de las figuras 1–3: elaboración propia. Resto: captura del sistema CheckITSE / GitHub / SonarQube.

---

## 10. Cómo cubre el proyecto cada criterio de la rúbrica (lista de control, no copiar)

| Criterio | Puntaje máx. | Cómo se cubre |
|---|---|---|
| 1. Arquitectura de software | 4 | Arquitectura actual (2.1), ajustes (2.2), tabla de APIs con datos enviados/recibidos y justificación (2.3), diagramas D1 y D3. |
| 2. Arquitectura tecnológica y servidor | 3 | Tabla de tecnologías, tabla del servidor con restricciones reales, justificación, pipeline de 7 etapas indicando dónde corre cada una y por qué, puerta de CI en el despliegue, evidencia del despliegue, diagrama D2. |
| 3. Cypress | 5 | 8 escenarios / 10 casos (mínimo exigido: 5), fichas completas, 10/10 aprobadas, job en el pipeline que bloquea el despliegue, evidencias. |
| 4. SonarQube | 4 | Configuración, análisis con cobertura, métricas e interpretación, 6 respuestas, integración (job condicional + ejecución local) y corrección real de *hotspots*. |
| 5. Reportes e impacto | 4 | 6 indicadores (mínimo: 3), filtros por fecha/distrito/giro/estado/origen, gráficos, tablas, CSV, datos de la base, distinción medido/esperado y real/demostración. |

---

## 10b. Recomendaciones sugeridas (con base en los resultados)

1. Publicar SonarQube en un servidor accesible (o usar SonarQube Cloud) y definir `SONAR_HOST_URL` / `SONAR_TOKEN` en GitHub para activar el job automático con Quality Gate bloqueante; de paso, actualizar SonarQube 9.9 (sin soporte) a la versión LTA vigente.
2. Reducir los 734 code smells empezando por `app/Services/Espacio` y `app/Http/Controllers` (complejidad y líneas largas), y reemplazar excepciones genéricas por excepciones del dominio.
3. Activar las tareas de fondo en el servidor con `scripts/tareas-xampp.ps1` y, si el servidor pasa a producción real, añadir HTTPS y respaldo automático de la base de datos.
4. Recoger el resultado de la inspección municipal real (aprobó / fue observado) para medir el impacto final del sistema con datos de usuarios reales, no solo de demostración.
5. Ampliar Cypress a los flujos de proveedor (publicar productos, solicitar plan) y ejecutar la prueba de humo de forma programada contra el servidor.

---

## 11. Referencias (APA 7)

- Cypress.io. (2026). *Cypress documentation*. https://docs.cypress.io
- GitHub. (2026). *GitHub Actions documentation*. https://docs.github.com/actions
- Inertia.js. (2025). *Inertia.js documentation*. https://inertiajs.com
- Laravel. (2025). *Laravel 12.x documentation*. https://laravel.com/docs/12.x
- Presidencia del Consejo de Ministros. (2018). *Decreto Supremo N.° 002-2018-PCM que aprueba el Reglamento de Inspecciones Técnicas de Seguridad en Edificaciones*. Diario Oficial El Peruano.
- SonarSource. (2023). *SonarQube 9.9 LTS documentation*. https://docs.sonarsource.com/sonarqube/9.9/
- The Apache Software Foundation. (2023). *Apache HTTP Server version 2.4 documentation*. https://httpd.apache.org/docs/2.4/
- Pressman, R. S., & Maxim, B. R. (2020). *Software engineering: A practitioner's approach* (9.ª ed.). McGraw-Hill Education.

---

## 12. Anexos sugeridos

- A. Enlace al repositorio y a la ejecución del pipeline: https://github.com/WilliamAndree/SisWeb y https://github.com/WilliamAndree/SisWeb/actions/runs/45062599725
- B. Registro completo del despliegue: `evidencias/registro-despliegue-xampp.txt`.
- C. Características del servidor: `evidencias-texto-servidor.txt`.
- D. Salida completa de Cypress: `evidencias/cypress/salida-consola-cypress.txt` y `resumen-cypress.json`.
- E. Resultados de SonarQube (JSON): `evidencias/sonarqube/`.
- F. Fragmentos de código: `02-CODIGO-CLAVE.md` (configuración de Cypress, un escenario, pipeline, script de despliegue, servicio de reportes, configuración de SonarQube, sitio de Apache).
