# Fase 2 — Resultados de validación del entorno

Fecha: 2026-11-16, America/Bogota. Cierre documental 11:56 UTC-05:00. Referencia inicial b3d6e77, cambios locales sin commit. PHP 8.2.12, Laravel 12.69.2, Pest 3.8.7, PHPUnit 11.5.56; servidor MariaDB local 10.4.32.

## Configuración efectiva antes de ejecutar pruebas

El preflight arranca Laravel, lee su repositorio de configuración y consulta SELECT DATABASE(), CURRENT_USER() y SHOW GRANTS; no es una lectura aislada de phpunit.xml.

| Propiedad | Resultado verificado |
| --- | --- |
| Entorno | testing |
| Conexión/driver | mysql |
| Host/puerto | 127.0.0.1:3306 |
| Base en configuración | sisweb_testing |
| Base seleccionada por servidor | sisweb_testing |
| Cuenta restringida | Sí; solo privilegios sobre la base exacta, sin globales ni delegación |
| Storage | Directorio temporal nuevo por proceso, externo al almacenamiento habitual |
| Cache/sesión/correo | array / array / array |
| Cola | sync, sin conexiones remotas disponibles |
| HTTP no simulado | Bloqueado |

La salida se mostró antes del conjunto pequeño, de la selección con RefreshDatabase y de la suite completa. Cada arranque TestCase vuelve a verificar antes del setup de los traits. Desarrollo permanece en sisweb y no se utilizó para pruebas.

Evidencia de preflight previo a regresión: [10-preflight-suite.txt](evidencias-fase2/10-preflight-suite.txt). El temporal de la suite completa fue `C:/Users/USUARIO/AppData/Local/Temp/sisweb-tests-11548-1ee4d6e521db5b17`; el preflight separado utiliza otro directorio.

## Resultados finales reales

| Ejecución | Casos | Aprobados | Fallidos/errores | Risky | Aserciones | Duración | Salida |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| Guardas TestEnvironmentTest | 24 | 24 | 0 | 0 | 40 | 1.74 s | 0 |
| Autorización UUID + Gemini simulado | 38 | 38 | 0 | 0 | 96 | 25.30 s | 0 |
| Suite completa tras Pint | 505 | 505 | 0 | 0 | 3983 | 84.14 s | 0 |

La suite final contiene las 24 pruebas nuevas y las existentes: no sumar las filas para calcular casos únicos. JUnit final contiene 505 nodos testcase y ningún failure/error. No se omitieron casos en la salida final. No se generó cobertura; estos resultados no significan cobertura total.

- Guardas: [salida](evidencias-fase2/07-guardas.txt), [JUnit](evidencias-fase2/07-guardas.junit.xml).
- Selección: [salida](evidencias-fase2/09-seleccion.txt), [JUnit](evidencias-fase2/09-seleccion.junit.xml).
- Suite completa: [salida](evidencias-fase2/11-suite-completa.txt), [JUnit](evidencias-fase2/11-suite-completa.junit.xml).

Comandos ejecutados:

```text
php tests/preflight.php
php vendor/bin/pest tests/Unit/TestEnvironmentTest.php --compact --fail-on-risky --log-junit=docs/calidad/evidencias-fase2/07-guardas.junit.xml
php vendor/bin/pest tests/Feature/AutorizacionRutasUuidTest.php tests/Feature/AnalisisMultimodalGeminiTest.php --compact --fail-on-risky --log-junit=docs/calidad/evidencias-fase2/09-seleccion.junit.xml
php vendor/bin/pint --dirty --format agent
php vendor/bin/pint tests/Support/TestEnvironment.php tests/Unit/TestEnvironmentTest.php tests/bootstrap.php tests/preflight.php --format agent
php vendor/bin/pest --compact --fail-on-risky --log-junit=docs/calidad/evidencias-fase2/11-suite-completa.junit.xml
git diff --check
```

Pint corrigió imports/formato en el código de pruebas; la suite completa se ejecutó después. git diff --check no reportó problemas. No se modificaron archivos PHP de app ni migraciones.

## Comprobaciones negativas y de archivos

Se lanzó preflight en proceso separado con DB_DATABASE=sisweb. Resultado: rechazo explícito y código 1 ANTES de abrir la conexión, sin ejecutar migraciones ni casos. La variable temporal se restauró. Evidencia: [12-destino-rechazado.txt](evidencias-fase2/12-destino-rechazado.txt).

Las guardas también prueban rechazo de root, host/puerto ajenos, socket, URL, réplicas, motor alternativo, privilegios globales, otra base, comodín underscore, roles y delegación. Un caso simula la migración real de evidencias usando solo discos temporales; otro comprueba que Storage::fake permanece en el sandbox y S3 no está configurado. HTTP sin fake lanza excepción; el fake permitido mantiene el bloqueo de otros destinos.

Se registraron huellas SHA-256 de .env y de archivos existentes bajo storage/app, storage/logs y bootstrap/cache antes de las pruebas con BD; se comparó el conjunto después:

- Archivos antes: 411.
- Archivos después: 411.
- Añadidos, eliminados o modificados en esos conjuntos: 0.
- .env sin cambios: sí.

Evidencia: [resumen posterior](evidencias-fase2/13-archivos-protegidos-despues.json) y [manifiesto anterior](evidencias-fase2/08-archivos-protegidos-antes.json). Las huellas no sustituyen una auditoría de toda la máquina; prueban que el conjunto inspeccionado permaneció intacto durante la selección y regresión. No se hicieron lecturas de registros reales para comparar bases.

## Incidencias de implementación conservadas

No se presentan los intentos iniciales como una ejecución limpia:

1. Antes de cualquier prueba, el primer preflight falló porque Laravel interpretó una ruta temporal Windows como relativa. Se añadió el prefijo de unidad para cachés absolutas. Ninguna migración se ejecutó en ese intento.
2. Primera ejecución de guardas: 24 risky, 40 aserciones y sin fallos de aserción; no se contabiliza como 24 aprobadas. La confirmación de un caso mostró “Test code or tested code removed error handlers other than its own”. [Salida inicial](evidencias-fase2/02-guardas.txt), [diagnóstico](evidencias-fase2/03-diagnostico-risky.txt).
3. Un intento de restaurar handlers mediante HandleExceptions::flushState en el preflight independiente falló: PHPUnit todavía no tenía inicializado su registro. La validación se detuvo y no se lanzó el siguiente conjunto. [Evidencia](evidencias-fase2/04-preflight.txt).
4. Se corrigió el preflight para arrancar configuración/proveedores sin instalar handlers globales. Los TestCase conservan el tratamiento normal de Laravel. Las 24 guardas y después 505 casos completos terminaron sin risky.
5. Una escritura append del resultado negativo tuvo un bloqueo temporal de archivo de Windows; se repitió la comprobación y se guardó el resultado mediante una escritura única. No fue un fallo de producto ni de aislamiento.

Contando repeticiones: 592 invocaciones de casos (567 aprobadas y 25 risky iniciales; 0 fallos de aserción/errores de caso). El conjunto único verificado en la ejecución final es 505. Los errores de preflight citados no ejecutaron casos y no se suman como pruebas fallidas.

No se declara un ciclo TDD rojo-verde de una regla de negocio. Esta fase implementó y validó infraestructura; las incidencias del arranque están registradas como tales, no como defectos de negocio reproducidos.

## Estado y riesgos pendientes

SisWeb queda preparado para INICIAR TDD y regresión local SERIAL con el harness verificado. No se avanzó a Fase 3.

- Pendiente: excepción de autorización exclusiva de testing. No se modificó; requiere caracterización y ajuste de fixtures en trabajo posterior.
- Pendiente: ejecución remota del workflow actualizado en MariaDB 10.11/PHP 8.4. No hay commit ni push; su éxito no está verificado.
- Pendiente: paralelismo seguro, limpieza controlada de temporales y matriz de motores/versiones. No ejecutar dos suites sobre la misma base al mismo tiempo.
- El bloqueo de red cubre el cliente HTTP Laravel utilizado por los servicios inspeccionados. No es cortafuegos para futuros clientes nativos ni sandbox OS para código no confiable. Más límites en [05-aislamiento-pruebas.md](05-aislamiento-pruebas.md).
- Base nueva y cuenta de pruebas permanecen disponibles; no contienen datos reales y RefreshDatabase puede reiniciarlas. No se realizaron borrados de recursos existentes.
- Documentación/evidencias siguen ignoradas por Git conforme a la regla actual. Sin staging, commits ni push.
