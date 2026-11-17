# Fase 2 — Aislamiento del entorno de pruebas

Fecha: 2026-11-16, America/Bogota. Referencia inicial: b3d6e77, con cambios locales sin commit. Cierre documental: 11:56 UTC-05:00. Alcance: infraestructura de pruebas; no se implementó Fase 3 ni se cambiaron reglas de negocio.

## Diagnóstico técnico confirmado

Se leyeron los cinco documentos 00–04 de docs/calidad, AGENTS.md y las guías locales laravel-best-practices/testing-best-practices. No existe .ai/rules. Se inspeccionaron las APIs realmente instaladas de Laravel 12.69.2, Pest 3.8.7 y PHPUnit 11.5.56.

Desarrollo declara mysql, 127.0.0.1:3306 y base sisweb. El servidor local respondió MariaDB 10.4.32. La inspección inicial solo consultó metadatos: no existían ni la base sisweb_testing ni la cuenta homónima. No se consultaron registros de usuarios o evaluaciones ni se utilizó la base de desarrollo para tests.

Problemas originales:

- No existía .env.testing. phpunit.xml declaraba sisweb_test y CI creaba test; las variables heredadas podían cambiar el destino efectivo.
- RefreshDatabase se aplica a todas las Feature y también a ApplicabilityEngineServiceTest, GeoLocationServiceTest, NormativaArchitectureModelsTest y RecursoEducativoTest dentro de Unit. Ejecuta migraciones y transacciones; no basta seleccionar Unit para evitar escrituras.
- La migración 2026_09_24_040035_move_evidencias_to_private_storage.php copia evidencias de public a local y elimina la carpeta pública. Aislar solamente SQL no protegía los archivos; un fake instalado después del arranque podía llegar tarde.
- No había guarda de conexión ni prohibición global de HTTP no simulado. El almacenamiento y los servicios persistentes seguían disponibles desde configuración normal.
- El autorizador contiene una excepción exclusiva de testing para anónimos INICIADA sin token. Se revisó y documentó; permanece sin cambios para no alterar reglas y fixtures en esta fase.

## Cambios realizados

| Archivo | Cambio y motivo |
| --- | --- |
| .env.testing | Nuevo archivo local, ignorado; clave de aplicación ficticia y credencial aleatoria exclusiva de la cuenta de pruebas. No copiar .env ni sus secretos. |
| .env.testing.example | Plantilla sin contraseña real; base/usuario sisweb_testing, servicios locales de prueba y clave de aplicación pública solo para tests. |
| .gitignore | Ignora expresamente .env.testing. No se cambió la regla existente de docs. |
| phpunit.xml | Carga tests/bootstrap.php; fija APP_ENV=testing y conexión mysql; elimina el nombre divergente sisweb_test. El destino real se valida, no se sobrescribe silenciosamente si llega uno inseguro. |
| tests/Support/TestEnvironment.php | Centraliza arranque aislado, validación de conexión/permisos efectivos y almacenamiento temporal por proceso. |
| tests/bootstrap.php | Preflight obligatorio al iniciar Pest/PHPUnit: falla con código 1 antes de descubrir/ejecutar casos si el destino no es seguro. |
| tests/preflight.php | Entrada de solo lectura para mostrar la configuración resuelta por Laravel antes de ejecutar cualquier prueba. |
| tests/TestCase.php | Reutiliza el mismo arranque y verificación antes del setup de traits, incluido RefreshDatabase, también al recrear la aplicación. |
| tests/Unit/TestEnvironmentTest.php | 24 casos de seguridad del entorno: destinos/permisos rechazados, HTTP, configuración persistente, Storage y migración de archivos. No usa RefreshDatabase. |
| .github/workflows/tests.yml | Base/cuenta exclusivas en servicio efímero, permisos exactos, .env.testing desde plantilla, preflight antes de Pest y fail-on-risky. |
| docs/calidad/05-aislamiento-pruebas.md | Diseño, alcance, preparación y riesgos. |
| docs/calidad/06-resultados-validacion-entorno.md | Resultados reales y enlaces a evidencias de esta ejecución. |
| docs/calidad/evidencias-fase2/ | Salidas, JUnit y comparación de archivos protegidos. |

tests/Pest.php, app, config, rutas y migraciones existentes no se modificaron. No se eliminó ninguna migración ni se tocó información de usuarios/evaluaciones.

## Protección de base de datos

Se creó una base NUEVA vacía sisweb_testing y una cuenta NUEVA sisweb_testing@127.0.0.1. El aprovisionamiento rechazaba modificar cualquiera de esos recursos si ya existía. La contraseña aleatoria se guardó únicamente en .env.testing y no se imprimió. No se otorgaron permisos globales ni GRANT OPTION.

La conexión permitida exige simultáneamente: entorno testing, driver/conexión mysql, host 127.0.0.1, puerto 3306, nombre exacto sisweb_testing y cuenta sisweb_testing. Se rechazan DB_URL, sockets y configuraciones read/write alternativas. Se eliminan conexiones adicionales y Redis de la configuración del runner.

Antes de proveedores se instala la configuración segura, mediante afterBootstrapping(LoadConfiguration). El resolver de conexiones valida antes de crear PDO y antes de ejecutar consultas. El preflight y cada TestCase verifican además SELECT DATABASE(), CURRENT_USER() y SHOW GRANTS. Solo se acepta USAGE global más ALL PRIVILEGES para la base exacta, sin delegación ni roles.

Importante en MySQL/MariaDB: el guion bajo puede ser comodín en privilegios sobre bases. La concesión utiliza `sisweb\_testing` y el verificador rechaza la variante no escapada. La cuenta no tiene permisos para modificar sisweb u otras bases. El runner nunca recibe la cuenta administrativa.

Las migraciones destructivas de RefreshDatabase se ejecutaron solamente tras esa validación, dentro de la base nueva exclusiva. No se ejecutó migrate:fresh manualmente contra bases existentes de desarrollo/producción.

## Protección de almacenamiento y servicios

Antes de cargar configuración, useStoragePath apunta a un directorio NUEVO con nombre aleatorio bajo el temporal del sistema, por proceso. Los discos local/public, Storage::fake, vistas compiladas, sesiones de archivo, logs y cachés/manifiestos de arranque se sitúan allí. Se deshabilitan enlaces públicos y discos remotos. La resolución de cachés contempla prefijos absolutos de Windows.

Cache y sesiones usan array; correo usa array; cola usa sync y solo dispone de esa conexión. No hay persistencia en tablas de jobs, Redis o SMTP. Sync puede ejecutar un job en el mismo proceso: su red sigue bloqueada, y las pruebas de despacho pueden usar Queue::fake.

Todo Factory HTTP de Laravel recibe preventStrayRequests antes de proveedores. Las respuestas Http::fake explícitas siguen funcionando; una URL sin fake lanza StrayRequestException antes de salir a red. Se fija una clave Gemini ficticia y reintentos 0. Las dos pruebas de bloqueo incluyen Gemini y otro destino. No hubo llamadas reales a Gemini.

Se rechaza configuración cacheada; no se borra la caché del entorno habitual. El preflight usa bootstrap sin instalar handlers globales de excepción para no interferir con PHPUnit; los casos reales conservan los handlers normales de Laravel. El código está exclusivamente en tests: producción no lo registra.

## Uso reproducible

```text
php tests/preflight.php
php vendor/bin/pest tests/Unit/TestEnvironmentTest.php --compact --fail-on-risky
php vendor/bin/pest tests/Feature/AutorizacionRutasUuidTest.php tests/Feature/AnalisisMultimodalGeminiTest.php --compact --fail-on-risky
php vendor/bin/pest --compact --fail-on-risky
```

El preflight debe terminar en código 0 y mostrar base_config/base_server sisweb_testing (claves del reporte: database_config/database_server). Si devuelve error, detenerse y resolverlo; no desactivar la guarda, sustituir la cuenta por root ni forzar otro nombre.

En otro equipo: copiar la plantilla a .env.testing, aprovisionar una base vacía exclusiva y cuenta restringida equivalentes, y completar la contraseña local. La plantilla por sí sola no crea MySQL. Las variables heredadas inseguras se rechazan: no se confía en el nombre del archivo .env.testing. No utilizar las credenciales de la plantilla/CI para producción.

El workflow remoto usa MariaDB 10.11 efímero. El paso administrativo limita los permisos únicamente en ese contenedor nuevo; los tests usan siempre la cuenta restringida. CI no se ejecutó ni publicó desde esta sesión.

## Riesgos residuales y límites

- La excepción de autorización exclusiva de testing sigue pendiente. El entorno ya permite caracterizarla con TDD en una fase posterior; los 38 casos seleccionados actuales no prueban paridad completa con producción.
- El aislamiento es del harness y de los servicios usados por el código inspeccionado, no una sandbox de sistema operativo para código malicioso. No cubre un test futuro que lea deliberadamente .env, construya PDO con credenciales administrativas, use cURL/Guzzle directo o escriba rutas absolutas de producción. No introducir esos accesos; requerir contenedor/cuenta OS aislada para ejecutar código no confiable.
- Solo ejecución serial verificada. No lanzar suites simultáneas contra la misma base; paralelismo requiere bases/cuentas por trabajador y guardas específicas. Las variantes paralelas de nombre no están autorizadas.
- Temporales sintéticos se conservan para evitar borrados amplios; no hay limpieza recursiva automática. La base de pruebas es desechable y se reinicia con RefreshDatabase: nunca guardar datos reales allí.
- Repositorios con config cacheada son rechazados. Preparar un checkout de pruebas sin esa caché; no limpiar la caché de un despliegue real para forzar el runner.
- No se probaron todos los escenarios de fallo físico de disco/servidor, ni CI remoto, ni otras versiones de MySQL. No se midió cobertura ni se ejecutó Sonar/Cypress.
- docs/ continúa ignorado por Git. Archivos y evidencias existen localmente; no se añadieron al índice, no hay commit ni push.

Referencias de APIs: código de vendor instalado y documentación oficial [Testing Laravel 12](https://laravel.com/framework/docs/12.x/testing), [HTTP client Laravel 12](https://laravel.com/framework/docs/12.x/http-client).
