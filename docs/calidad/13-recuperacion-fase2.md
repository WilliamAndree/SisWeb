# Recuperación y revalidación segura de Fase 2

Fecha: 2026-11-16, America/Bogota. Estado: protecciones de Fase 2 presentes y revalidadas localmente en modo serial. No se inició desarrollo funcional de Fase 3.

## Qué se recuperó y qué se modificó

Al iniciar esta tarea, los archivos ya estaban repuestos. Se compararon con el stash 73e8e74 y se inspeccionaron antes de ejecutar. Las nueve piezas de infraestructura de Fase 2 coinciden con el respaldo: phpunit.xml, tests/TestCase.php, .gitignore, workflow, .env.testing.example, TestEnvironment.php, TestEnvironmentTest.php, tests/bootstrap.php y tests/preflight.php.

No se aplicó el stash ni se restauró o reconstruyó ningún archivo de código/configuración. También se preservaron los cuatro archivos TDD posteriores. Los únicos archivos nuevos de esta tarea son los informes 12/13 y sus evidencias; no se sobrescribieron documentos anteriores. No se ejecutó Pint porque no se modificó PHP y no correspondía reformatear trabajo posterior ajeno al alcance de recuperación.

## Validación de aislamiento

| Control | Resultado efectivo |
| --- | --- |
| Entorno resuelto por Laravel | testing |
| Conexión y servidor | mysql, 127.0.0.1:3306 |
| Base en configuración / SELECT DATABASE() | sisweb_testing / sisweb_testing |
| Identidad de conexión y privilegios | Cuenta exclusiva sisweb_testing; SHOW GRANTS aceptado solo para base exacta, sin privilegios globales o delegación |
| Validación antes de migrar | TestCase verifica al crear la aplicación, antes del setup de RefreshDatabase; bootstrap del runner verifica antes de ejecutar casos |
| URL/socket/réplicas/conexiones alternativas | Rechazadas por la guarda; conexiones adicionales retiradas del runner |
| Storage | Raíz temporal nueva por proceso; discos local/public, Storage::fake y cachés/manifiestos de arranque dentro del sandbox |
| Caché/sesión/correo | array / array / array |
| Cola | sync; conexiones remotas no disponibles |
| HTTP real | preventStrayRequests activo para el cliente Laravel; Gemini simulado |
| Secretos | .env y .env.testing ignorados, no rastreados ni modificados |

El preflight utiliza configuración real de Laravel y consultas de solo lectura al servidor. No basta el contenido de phpunit.xml. La guarda exige el nombre exacto y permisos sobre `sisweb\_testing`: el guion bajo de la concesión está escapado para no funcionar como comodín.

La evidencia previa a las primeras pruebas está en [05-preflight.txt](evidencias-recuperacion-fase2/05-preflight.txt). Cada ejecución Pest volvió a mostrar su preflight. No se utilizaron datos de desarrollo/producción ni se ejecutaron solicitudes reales a Gemini.

## Resultados reales y comparación

| Ejecución | Casos | Aprobados | Fallidos | Aserciones | Duración | Código |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Aislamiento | 24 | 24 | 0 | 40 | 1.58 s | 0 |
| Funcionales: autorización UUID y Gemini simulado | 38 | 38 | 0 | 96 | 16.60 s | 0 |
| Conjunto exacto de Fase 2 | 505 | 505 | 0 | 3983 | 67.06 s | 0 |
| Toda la suite actual, incluidos WIP TDD | 520 | 515 | 5 | 4002 | 63.77 s | 1 |

La comparación equivalente reproduce exactamente 505 aprobadas y 3983 aserciones de la Fase 2. Para ello se utilizaron los 44 archivos de pruebas del commit base más TestEnvironmentTest.php recuperado (45 archivos). El inventario se guardó explícitamente en [08-manifiesto-suite-fase2.txt](evidencias-recuperacion-fase2/08-manifiesto-suite-fase2.txt).

Además se ejecutó SIN FILTROS toda la suite actual con sus archivos posteriores. No se eliminaron, omitieron ni deshabilitaron pruebas para presentar verde. Los 15 casos adicionales proceden del WIP de Fase 3, incluidos tres casos example aún sin desarrollar. No equivalen a 15 pruebas nuevas terminadas en esta recuperación.

Las ejecuciones son independientes y repiten casos: no sumar filas como casos únicos. En total se invocaron 1087 casos contando repeticiones (24 + 38 + 505 + 520), con 1082 aprobados y 5 fallidos. No se midió cobertura.

Evidencia:

- [Guardas: salida](evidencias-recuperacion-fase2/06-aislamiento.txt), [JUnit](evidencias-recuperacion-fase2/06-aislamiento.junit.xml).
- [Funcionales: salida](evidencias-recuperacion-fase2/07-funcionales.txt), [JUnit](evidencias-recuperacion-fase2/07-funcionales.junit.xml).
- [Fase 2: salida](evidencias-recuperacion-fase2/09-suite-fase2.txt), [JUnit](evidencias-recuperacion-fase2/09-suite-fase2.junit.xml).
- [Suite actual completa: salida](evidencias-recuperacion-fase2/10-suite-actual-completa.txt), [JUnit](evidencias-recuperacion-fase2/10-suite-actual-completa.junit.xml), [lista de fallos](evidencias-recuperacion-fase2/12-fallos-suite-actual.csv).

## Cinco fallos preservados, fuera del alcance de corrección

Todos pertenecen a tests/Feature/AutorizacionUniformeTddTest.php:

- AUTH-01, token null/cadena vacía y consulta de revisión: dos casos esperaban 403 y recibieron 200.
- AUTH-01, token null/cadena vacía y guardado de croquis: dos casos esperaban 403 y recibieron 422.
- AUTH-03, invitado con token considerado válido por el fixture: esperaba 200 y recibió 403. Su causa requiere revisar el contrato de envío de cookies y el fixture; no se atribuye todavía un defecto de producción.

Los primeros cuatro son consistentes con la excepción exclusiva de testing que ya documentó la auditoría. Se conservaron los resultados; no se retiró la excepción, no se cambiaron aserciones ni se repararon fixtures en esta tarea. Eso corresponde al trabajo funcional de Fase 3, expresamente pospuesto por el usuario.

Conclusión precisa: Fase 2 está recuperada y pasa su comparación equivalente; la suite actual ampliada NO está completamente verde. No se declara resuelta la seguridad funcional de autorización por haber restaurado el aislamiento.

## Comandos y controles de preservación

```text
git status --short
git diff
git log --all --oneline --decorate
git reflog -25 --date=iso
git reflog show refs/stash --date=iso
git stash list
git ls-tree -r --name-only stash@{0}^3
git hash-object -- <archivo>
git rev-parse stash@{0}:<archivo>
git rev-parse stash@{0}^3:<archivo>
git check-ignore .env .env.testing
php tests/preflight.php
php vendor/bin/pest tests/Unit/TestEnvironmentTest.php --compact --fail-on-risky --log-junit=docs/calidad/evidencias-recuperacion-fase2/06-aislamiento.junit.xml
php vendor/bin/pest tests/Feature/AutorizacionRutasUuidTest.php tests/Feature/AnalisisMultimodalGeminiTest.php --compact --fail-on-risky --log-junit=docs/calidad/evidencias-recuperacion-fase2/07-funcionales.junit.xml
php vendor/bin/pest <45 rutas de 08-manifiesto-suite-fase2.txt> --compact --fail-on-risky --log-junit=docs/calidad/evidencias-recuperacion-fase2/09-suite-fase2.junit.xml
php vendor/bin/pest --compact --fail-on-risky --log-junit=docs/calidad/evidencias-recuperacion-fase2/10-suite-actual-completa.junit.xml
```

En PowerShell se pasó el array de las 45 rutas mediante splatting; no se alteró phpunit.xml para excluir pruebas. Todas las ejecuciones fueron seriales. Las dos selecciones completas fueron precedidas por preflight y la verificación integrada del runner.

Se compararon SHA-256 de 511 archivos preexistentes de configuración, tests, secretos locales, documentos/evidencias anteriores, almacenamiento habitual y cachés. Ninguno cambió ni desapareció. El inventario inicial y el resumen final se conservan en esta carpeta de evidencias. No se publicaron contenidos de .env/.env.testing. Los informes 00–11 y las evidencias anteriores permanecen intactos.

## Riesgos residuales y estado de cierre

- Se localizó el mecanismo de pérdida en Git y una copia exacta; no se identificó qué proceso/persona inició las operaciones ni el comando exacto de reposición. No hubo escrituras concurrentes detectadas que obligaran a detener esta recuperación.
- Guardas y WIP siguen sin commit; el stash continúa disponible. Es necesario preservar ese trabajo antes de nuevas operaciones de rama. No se hicieron commits, push, reset, clean, restore ni operaciones de modificación del stash durante esta tarea.
- Cinco fallos del WIP TDD permanecen pendientes; no se inició la corrección funcional de Fase 3.
- Solo ejecución local serial verificada. No lanzar procesos de test concurrentes contra la misma base. CI remoto y otras versiones de motor siguen sin validarse aquí.
- preventStrayRequests cubre el cliente HTTP Laravel usado por la aplicación, no un cortafuegos OS para código malicioso que use otro cliente o lea deliberadamente credenciales administrativas.
- Se conservan temporales sintéticos de pruebas. No se borraron bases existentes ni se sobrescribió .env.
- docs/ está ignorado por Git: estos informes y evidencias permanecen locales. No se ejecutaron Gemini real, Cypress ni SonarQube.

La recuperación del entorno permite retomar TDD cuando el usuario lo indique. Esta tarea termina con la infraestructura revalidada y los pendientes funcionales visibles.
