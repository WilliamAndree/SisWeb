# Incidente: desaparición temporal de las protecciones de Fase 2

Fecha: 2026-11-16, America/Bogota (UTC-05:00). Investigación de recuperación, posterior a la parada de Fase 3. HEAD actual: b3d6e77; rama observada: feature/apoyo-calidad.

## Conclusión y límites de atribución

Se localizó un stash de Git con los cambios que habían desaparecido: `73e8e748c3351702f0804bf1a8d2d93c58bd5e09`, mensaje «On main: WIP fase 2 aislamiento de pruebas SisWeb», creado a las 12:06:07. Incluye modificaciones rastreadas y un tercer padre con archivos no rastreados, entre ellos las guardas de Fase 2 y los cuatro archivos TDD incompletos.

El mecanismo de apartar cambios en un stash explica su ausencia temporal del árbol de trabajo. El reflog registra a las 12:06:08 un retorno a HEAD y después varios checkouts. Esto confirma operaciones Git alrededor del incidente; NO identifica al proceso o persona que las inició, ni permite afirmar que la entrada reset correspondiera a un comando manual con --hard. No se atribuye la causa a OneDrive, Google Drive, VS Code o Codex sin evidencia adicional.

Al comenzar esta recuperación, los archivos YA estaban nuevamente presentes. Las 13 comparaciones de blobs contra el stash coinciden exactamente: cuatro archivos rastreados y nueve no rastreados. La reaparición es compatible con una reposición del stash, pero Git no registra en el reflog el comando exacto utilizado para aplicar esos contenidos. No se ejecutó stash apply/pop ni restauración durante esta investigación.

## Cronología comprobada

| Momento local | Evidencia |
| --- | --- |
| Antes del incidente | La Fase 3 verificó 505 pruebas aprobadas y 3983 aserciones; existen estado Git, diff y JUnit iniciales en evidencias-fase3. |
| 12:06:07 | refs/stash registra 73e8e74, sobre main. El padre de archivos no rastreados es 9b361c8. |
| 12:06:08 | Reflog HEAD: reset: moving to HEAD. No inferir opción ni autor a partir de esa etiqueta. |
| 12:06:36–12:08:54 | Reflog registra cambios entre main, develop y ramas feature; todos conservan HEAD b3d6e77. |
| Durante la Fase 3 | La inspección registró phpunit.xml con sisweb_test, TestCase sin guarda y archivos ausentes; se suspendieron las ejecuciones. |
| Inicio de esta recuperación | Protecciones y archivos TDD presentes; las 13 comparaciones actuales coinciden con el stash. |
| Validación de recuperación | Preflight, 24 guardas, 38 funcionales y conjunto original de 505 casos aprobados; suite actual ampliada con cinco fallos pendientes de TDD. |

La marca de modificación de varios archivos coincide con las 12:08:54, pero por sí sola no prueba qué comando o aplicación repuso los contenidos.

## Archivos afectados y comparación

| Archivo | Estado observado durante la pérdida | Estado actual verificado |
| --- | --- | --- |
| phpunit.xml | vendor/autoload.php y sisweb_test | tests/bootstrap.php y configuración de testing validada; coincide con stash |
| tests/TestCase.php | Sin guarda | Arranque mediante TestEnvironment y verificación antes de traits; coincide |
| .gitignore | Sin exclusión .env.testing | .env.testing ignorado; coincide |
| .github/workflows/tests.yml | Configuración original del repositorio | Base/cuenta exclusivas y preflight; coincide |
| .env.testing.example | Ausente | Plantilla sin contraseña real; coincide |
| tests/Support/TestEnvironment.php | Ausente | Guarda de destino, privilegios y servicios; coincide |
| tests/bootstrap.php | Ausente | Preflight obligatorio del runner; coincide |
| tests/preflight.php | Ausente | Entrada de verificación sin migraciones; coincide |
| tests/Unit/TestEnvironmentTest.php | Ausente | 24 casos de aislamiento; coincide |
| Los cuatro archivos *TddTest.php | Ausentes | Reaparecieron con el WIP; coinciden y se conservaron sin editar |

tests/Pest.php permanece con RefreshDatabase en Feature: no se cambió. Las guardas de TestCase actúan antes de sus traits. Los secretos reales .env y .env.testing no aparecen entre los archivos del stash ni en los archivos rastreados inspeccionados; ambos están ignorados actualmente. Que .env.testing apareciera temporalmente como no rastreado no demuestra que fuera versionado o enviado a un remoto.

## Fuentes revisadas

- git status, git diff, git log --all, ramas locales/remotas, reflog de HEAD y refs/stash, stash list y árboles del stash. Las ramas inspeccionadas no proporcionan un commit de Fase 2: sus protecciones son trabajo local sin commit, respaldado en el stash.
- Comparación exacta con git hash-object y git rev-parse para cada archivo; no se aplicaron parches ni se cambiaron ramas.
- Historial local de VS Code: se comprobó su directorio y se buscaron entries.json asociados a las rutas relevantes. No se encontró una versión adicional coincidente mediante esa búsqueda; no se afirma que todo historial posible esté ausente.
- Cambios pendientes: se inventariaron los archivos locales y no rastreados. No se tuvo acceso a un registro que atribuya las operaciones Git a una sesión particular de Codex o a un buffer sin guardar del IDE.
- Procesos: se observaron clientes de sincronización activos, sin evidencia de escritura del proyecto atribuible a ellos. No se observaron procesos git/php antes de las validaciones ni archivos .git/*.lock.
- Concurrencia: dos inventarios de huellas se mantuvieron iguales; observación de FileSystemWatcher durante 15 segundos sin escrituras detectadas. Esto demuestra estabilidad durante la ventana observada, no exclusividad futura del workspace.

Un comando de inspección tuvo inicialmente un error de sintaxis de canalización PowerShell y se repitió corregido. No modificó archivos ni ejecutó pruebas.

## Preservación y decisión de recuperación

No fue necesario reconstruir ni sobrescribir código: el estado recuperable ya estaba repuesto al inicio. Se conservó tanto la infraestructura de Fase 2 como el trabajo posterior. No se modificó .env/.env.testing, no se borraron bases y no se hicieron commits, push, reset, clean ni restore.

Se registraron 511 archivos protegidos: configuración, secretos locales, tests, documentos/evidencias anteriores, almacenamiento habitual y cachés de arranque. Tras las ejecuciones no cambió ni faltó ninguno. Los documentos 00–11 se mantienen como registro histórico; este informe actualiza la explicación, sin reescribir el relato de la parada.

Evidencias nuevas en `evidencias-recuperacion-fase2/`: [reflog HEAD](evidencias-recuperacion-fase2/02-reflog.txt), [reflog stash](evidencias-recuperacion-fase2/03-stash-reflog.txt), [comparación por archivo](evidencias-recuperacion-fase2/04-comparacion-stash.csv), [estado inicial](evidencias-recuperacion-fase2/01-git-inicial.txt) y [estado final](evidencias-recuperacion-fase2/11-git-final.txt).

## Riesgos pendientes

Los cambios aún no forman parte de un commit. Volver a apartarlos o reemplazarlos puede retirar las protecciones del workspace otra vez. No borrar el stash de respaldo ni cambiar de rama durante ejecuciones de pruebas. La revisión y eventual versionado deben hacerse posteriormente por decisión del usuario, sin incluir secretos.

El origen personal/proceso de las operaciones y el comando exacto de reposición siguen sin determinarse. No se detectó conflicto concurrente que impidiera esta validación; cualquier nueva escritura inesperada requiere volver a detenerse y revisar el estado.
