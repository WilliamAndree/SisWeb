# Pruebas

## Entorno aislado

Las pruebas **nunca** usan la base de desarrollo. `backend/tests/bootstrap.php` ejecuta un *preflight* que aborta la suite si no se cumplen todas estas condiciones:

- `APP_ENV=testing` con la conexión `mysql`.
- La base y la cuenta se llaman exactamente `sisweb_testing`, y la cuenta tiene permisos solo sobre esa base.
- El almacenamiento es temporal por proceso, y la caché, la sesión, la cola y el correo funcionan en memoria.
- Las peticiones HTTP externas (por ejemplo, a Gemini) están bloqueadas.

La configuración local está en `backend/.env.testing`, que no se versiona. La plantilla es `backend/.env.testing.example`.

## Ejecutar en local (Windows)

La instancia QA es un MariaDB independiente en `127.0.0.1:3307` con sus datos en `backend/scratch/qa-mariadb-native/`:

```powershell
.\scripts\start-qa-mariadb.ps1
cd backend
php tests/preflight.php           # muestra el destino resuelto sin ejecutar pruebas
php vendor/bin/pest --compact     # suite completa
php vendor/bin/pest tests/Feature/FlujosCriticosTddTest.php   # un archivo
php vendor/bin/pest --filter="nombre del caso"                 # un caso
```

Pruebas del frontend:

```powershell
cd backend
npm run build            # el test UX usa public/build/manifest.json
npm run test:frontend
```

El test UX-01 abre Microsoft Edge en modo headless (o el navegador indicado en `UX_BROWSER`) y guarda capturas en `docs/producto/evidencias-ux01/`.

## Organización

| Carpeta | Contenido |
| --- | --- |
| `tests/Feature` | Flujos HTTP completos: autorización, checklist, subsanación, evidencias, Gemini y croquis |
| `tests/Unit` | Geometría, integridad canónica y entorno de pruebas |
| `tests/Frontend` | Contratos de UX y lógica del análisis con IA (Node) |
| `tests/Support` | Fixtures (`EspacioFixture`, `GeminiFixture`) y `TestEnvironment` |

## Integración continua

`.github/workflows/tests.yml` levanta MariaDB 10.11 con la cuenta restringida, compila los assets, ejecuta el preflight y luego `pest --fail-on-risky`.

`.github/workflows/lint.yml` verifica Pint, Prettier y ESLint en modo de solo lectura.

Ambos workflows se ejecutan en `push` y en Pull Requests hacia `main` y `develop`.

## Calidad estática

```powershell
cd backend
vendor/bin/pint --test
npm run format:check
npx eslint .
```

SonarQube se configura en `backend/sonar-project.properties`. El reporte de cobertura (`coverage.xml`) se genera localmente y no se versiona.
