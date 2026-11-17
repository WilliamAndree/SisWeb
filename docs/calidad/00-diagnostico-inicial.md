# Diagnóstico inicial — SisWeb / CheckITSE Huancayo

Fecha: 2026-11-16, America/Bogota. Referencia inspeccionada: `b3d6e77`.

## Alcance y método

Auditoría estática del workspace real: manifiestos, locks, dependencias instaladas, controladores, modelos, servicios prioritarios, requests, rutas, migraciones, frontend, tests, workflows y Sonar. Se leyó `docs/auditoria/informe_auditoria_fase1.md`; sus resultados históricos no se consideran ejecuciones actuales. La solicitud adjunta más reciente exige no implementar correcciones y prevalece sobre la petición anterior de implementación TDD.

Se aplicaron AGENTS.md y `.agents/skills/laravel-best-practices/SKILL.md`. No se encontró `.ai/rules`. No se ejecutaron tests, migraciones, seeders, scanner, solicitudes a Gemini, instalaciones, commits ni push. No se leyó ni sobrescribió `.env`, ni se consultaron registros de la aplicación. Solo se creó documentación.

## Primera corrección necesaria

El aislamiento NO está verificado. No ejecutar todavía la suite, ni asumir que Unit evita persistencia. Primero aislar BD, discos y comunicaciones externas, con guardas anteriores al arranque y a las migraciones.

- `phpunit.xml:25-26`: MySQL y `sisweb_test`, sin force. No existe `.env.testing`.
- `.github/workflows/tests.yml:22,35`: crea y exporta `test`. El manejador instalado de PHPUnit (`vendor/phpunit/phpunit/src/TextUI/Configuration/PhpHandler.php:110-118`) conserva variables exportadas salvo force. Divergencia confirmada; no demuestra que CI falle por base inexistente: normalmente conserva `test`.
- No se verificaron host, cuenta, permisos ni base efectiva local. TestCase no tiene guarda; Pest aplica RefreshDatabase a Feature y cuatro archivos Unit también lo utilizan.
- La migración `2026_09_24_040035_move_evidencias_to_private_storage.php:15-28` escribe en discos public/local y elimina el directorio público evidencias. `config/filesystems.php:31-42` usa almacenamiento normal. No asumir que Storage::fake en beforeEach se ejecuta antes de las migraciones.
- bootstrap/cache contiene packages.php y services.php, sin config.php en esta inspección; ello no acredita aislamiento futuro.

## Tecnologías y versiones observadas

| Componente | Versión | Evidencia |
| --- | --- | --- |
| PHP CLI | 8.2.12 | php --version |
| Laravel | 12.69.2 | composer show y composer.lock |
| Inertia PHP / React | 2.0.27 / 2.0.3 | Composer, lock JS y node_modules |
| Sanctum | 4.3.3 | Composer |
| Pest / plugin Laravel | 3.8.7 / 3.2.0 | Composer |
| PHPUnit | 11.5.56 | composer.lock; ejecución no verificada |
| React | 19.0.0 | lock y node_modules |
| TypeScript | 5.7.3 | lock y node_modules |
| Vite / Tailwind | 6.1.1 / 4.0.8 | lock y node_modules |
| Node local | 24.19.0 | node --version |
| CI declarado | PHP 8.4, Node 22, MariaDB 10.11 | tests.yml |

README:8 anuncia Laravel 11, pero la dependencia instalada es Laravel 12. Servidor de BD local y servidor Sonar actual: no verificados.

## Hallazgos principales

1. Alta: aislamiento insuficiente de BD y almacenamiento ante pruebas con migraciones.
2. Alta: autorización distinta en testing: EvaluacionHelperTrait:245-251 permite borradores anónimos sin token por compatibilidad de fixtures. Puede ocultar defectos; no se afirma bypass productivo.
3. Alta: ValidacionResultadoIAService:56-69 convierte enums inválidos a ACEPTABLE, PARCIALMENTE_PERTINENTE y MEDIO. AnalisisEvidenciaService:175-177 puede marcar COMPLETADO al no recibir ILEGIBLE ni NO_RELACIONADA. Confirmado por lectura; reproducción pendiente.
4. Media: idempotencia IA mediante consulta seguida de create sin exclusión atómica visible; duplicación concurrente potencial.
5. Media: controlador de 1932 líneas y trait de 766; mezcla de dominios y superficie de regresión.
6. Media: docs ignorado, artefactos scanner/cobertura versionados, sin generación de cobertura ni Quality Gate en los workflows inspeccionados.

La matriz distingue hechos, riesgos y verificaciones pendientes. No hay defectos reproducidos dinámicamente ni correcciones en esta fase.

## Seguridad: defensas y límites

Login valida credenciales, limita peticiones y regenera sesión. Logout invalida sesión y regenera token CSRF. Las rutas web conservan el grupo web sin exclusiones CSRF explícitas en bootstrap/app.php. No sustituye una prueba CSRF efectiva: el entorno de tests puede omitir esta protección.

Simulación GET/POST llama ahora al autorizador (EvaluacionController:186,196). Este comprueba propietario, token con hash_equals y sesión inmediata restringida a INICIADA. Las descargas comprueban titular y pertenencia. Autoevaluacion oculta session_token/token_seguridad/user_id. H-03/H-20 del informe previo no deben repetirse indiscriminadamente como abiertos; sí queda la excepción exclusiva de testing.

Uploads: máximo 5120 KB, tipos jpeg/png/webp/pdf, disco privado, SHA-256 y transacción con eliminación compensatoria. IA admite imágenes, verifica hash antes de enviar, aplica timeout/reintentos y JSON. El prompt de seguridad es defensa parcial, no evidencia de inmunidad a inyección.

git ls-files muestra .env.example, no .env. Búsqueda limitada de patrones de claves privadas/tokens en app/config/routes/resources/tests/.github/.env.example: sin coincidencias. No se auditó todo el historial ni todos los formatos de secretos; no se declara ausencia de filtraciones. No se hizo auditoría de vulnerabilidades de dependencias.

## Métricas y límites

- 44 archivos *Test.php: 7 Unit y 37 Feature; no equivalen a 44 casos ni a pruebas aprobadas.
- Líneas físicas: controlador 1932 + trait 766 = 2698. No es medición de complejidad ni duplicación.
- Clover histórico: generated=1793644912, 2026-11-02 18:41:52 UTC; 54 archivos, 5375 statements, 4609 cubiertos: 85,75% de sentencias DEL ARTEFACTO. Rutas C:\xampp\htdocs\SisWeb distintas al workspace. No atribuible al HEAD actual sin regenerar.
- report-task.txt conserva una tarea Sonar histórica; no demuestra éxito ni Quality Gate. README:38 afirma PASSED/0.09%, no verificado.
- test-results/.last-run.json contiene status failed y failedTests vacío; no identifica runner ni acredita Cypress.
- Tests ejecutados aquí: 0. Aprobadas/fallidas actuales: no determinadas. Cobertura actual, complejidad, duplicación y calificaciones Sonar: pendientes.

## Evidencia reproducible

Lecturas con Get-Content/rg; git status --porcelain, git ls-files, git check-ignore, git rev-parse --short HEAD; php --version; composer show --direct --no-ansi; node --version. Estado Git inicial sin cambios reportados. Referencias archivo:línea corresponden a esta inspección. /docs está ignorado; no se cambió esa regla ni el índice.

La búsqueda inicial sin directorio efectivo recorrió ubicaciones ajenas y se descartó; después se utilizó Set-Location con ErrorAction Stop. Se corrigió un error de sintaxis PowerShell; versiones JS se obtuvieron por búsqueda directa tras fallar ConvertFrom-Json. Son incidencias de inspección, no tests del producto fallidos.
