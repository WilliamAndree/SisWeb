# Fase 3B — Resultados finales

Estado: completada localmente. **569 pruebas aprobadas, 0 fallidas, 0 errores, 0 omitidas y 4201 aserciones.** Ejecución Pest serial con fail-on-risky, salida 0. Duración de consola: 69,98 s; tiempo agregado JUnit: 68,745223 s. Evidencia primaria: [salida completa](evidencias-fase3b/11-regresion-final.txt), [JUnit](evidencias-fase3b/11-regresion-final.junit.xml) y [resumen extraído de XML](evidencias-fase3b/13-resumen-junit.json).

## Antes y después

| Medición | Pruebas aprobadas | Fallos | Errores | Omitidas | Aserciones |
| --- | ---: | ---: | ---: | ---: | ---: |
| Línea base Fase 3A (última ejecución previa documentada) | 525 | 0 | 0 | 0 | 4014 |
| Fase 3B final ejecutada | 569 | 0 | 0 | 0 | 4201 |
| Incremento | 44 | 0 | 0 | 0 | 187 |

Se añadieron 44 casos en tres archivos: 10 en AutoevaluacionReglasTddTest, 19 en ChecklistConsistenciaTddTest y 15 en IntegridadEvaluacionServiceTest. No se eliminaron, omitieron ni deshabilitaron pruebas existentes. La línea base previa se compara con el resultado nuevo; no se presenta como otra ejecución realizada antes de modificar código en esta fase.

## Defectos y evidencias TDD

Se encontraron y corrigieron cinco defectos reproducibles:

1. D-3B-01: booleanos inválidos convertidos a null evadían nullable|boolean. Se conserva el valor inválido para obtener 422, sin crear un registro.
2. D-3B-02: cantidades GLP no numéricas se convertían a 0/1 antes de validar. Solo se convierten números válidos; el resto se rechaza con 422.
3. D-3B-03: Eloquent permitía reabrir REGISTRADA a INICIADA. Estado pasa a ser atributo sellado. No se afirma una explotación HTTP de este defecto.
4. D-3B-04: error de serialización producía el hash de una cadena vacía. JSON_THROW_ON_ERROR evita emitir una huella en esos casos.
5. D-3B-05: snapshots JSON inválidos podían transformarse en [] y acreditar una huella incorrecta. Se elimina la coerción y se devuelve NO_VERIFICABLE.

| Evidencia en evidencias-fase3b/ | Total | Aprobadas | Fallos | Errores | Aserciones | Interpretación |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 02-aislamiento-inicial | 27 | 27 | 0 | 0 | 44 | Protección previa aprobada |
| 03-rojo | 17 | 3 | 13 | 1 | 23 | Incluye un error de fixture; no cuenta como defecto |
| 04-rojo-confirmado | 17 | 3 | 14 | 0 | 24 | ROJO auténtico de cinco defectos |
| 05-verde | 17 | 17 | 0 | 0 | 46 | Mismos requisitos tras corrección mínima |
| 06-checklist | 19 | 13 | 6 | 0 | 115 | Expectativa incorrecta de contador inicial null frente a default 0 |
| 07-refactor | 44 | 44 | 0 | 0 | 187 | Nuevos casos completos y refactor del cierre |
| 09-modulos-aislamiento | 200 | 200 | 0 | 0 | 1501 | Regresión de módulos e infraestructura |
| 11-regresion-final | 569 | 569 | 0 | 0 | 4201 | Suite completa serial posterior a formato |

No sumar estas filas como pruebas únicas: hay ejecuciones repetidas. El archivo 03 conserva el error de preparación original y 06 conserva la expectativa de prueba incorrecta. Los casos del checklist que ya funcionaban se registran como caracterización verde, sin inventar defectos ni fases rojas.

La refactorización centraliza el cálculo de cierre en IntegridadEvaluacionService y la lectura segura del snapshot en resolverPayload. Pint aprobó (08-pint.txt y 08b-pint-nuevos.txt). La regresión posterior confirma que no cambian hashes válidos, acceso legítimo, reevaluaciones ni reglas normativas existentes.

## Archivos modificados en esta fase

| Archivo | Cambio |
| --- | --- |
| app/Http/Requests/StoreAutoevaluacionRequest.php | Normalización estricta de booleanos y cantidades GLP |
| app/Models/Autoevaluacion.php | Protección del estado final |
| app/Services/Evaluacion/IntegridadEvaluacionService.php | Errores JSON explícitos y snapshots validados sin coerción |
| app/Http/Controllers/EvaluacionController.php | Cierre usa el servicio central de integridad |
| tests/Feature/AutoevaluacionReglasTddTest.php | Nuevo: 10 casos |
| tests/Feature/ChecklistConsistenciaTddTest.php | Nuevo: 19 casos |
| tests/Unit/IntegridadEvaluacionServiceTest.php | Nuevo: 15 casos |
| docs/calidad/03-matriz-hallazgos.csv | Añade cinco defectos y actualiza caracterización H15, que sigue pendiente contractualmente |
| docs/calidad/11-matriz-trazabilidad-actualizada.csv | Requisitos R00/R05/R06/R11 y nuevo R12 |
| docs/calidad/16-tdd-autoevaluaciones-checklist.md | Diagnóstico, rojo-verde-refactor y matriz de casos |
| docs/calidad/17-integridad-criptografica.md | Contrato, hashes reales, compatibilidad y límites |
| docs/calidad/18-resultados-fase3b.md | Este informe |
| docs/calidad/evidencias-fase3b/ | Salidas auténticas, XML y preservación |

Las líneas de implementación están registradas en 12-lineas.txt. Los cambios que ya existían en workflow, gitignore, phpunit, TestCase, helpers de siete tests y trait de autorización no son cambios nuevos de Fase 3B y se preservaron.

## Aislamiento confirmado y preservación

El preflight 10 verificó otra vez Laravel y servidor antes de toda la suite: testing/mysql/127.0.0.1:3307/sisweb_testing; cuenta exclusiva sin permisos globales ni GRANT OPTION; InnoDB recovery=0. Storage temporal por proceso, caché/sesión/correo array y cola sync permanecen aislados; preventStrayRequests bloquea HTTP real. No se contactó Gemini. Las guardas se ejecutan también antes de los traits y migraciones de cada TestCase.

Se guardó el estado Git y diff inicial y se tomaron huellas SHA-256 de archivos preexistentes en 00-huellas.json. La comparación final 14-preservacion.json confirma que solo cambiaron los cuatro archivos de aplicación y las dos matrices autorizadas. .env, .env.testing, almacenamiento habitual, guardas, tests anteriores y evidencias de otras fases permanecen intactos. No se tocaron credenciales, datos/configuración del XAMPP original, stashes ni historial Git. No se hicieron commits ni push. docs/ continúa ignorado por Git, por lo que los informes y evidencias son locales.

## Comandos reproducibles principales

Desde la raíz real del proyecto SisWeb/SisWeb, con la instancia nativa ya disponible:

```powershell
php tests/preflight.php
php vendor/bin/pest tests/Unit/TestEnvironmentTest.php --compact --colors=never
php vendor/bin/pest tests/Unit/IntegridadEvaluacionServiceTest.php tests/Feature/AutoevaluacionReglasTddTest.php tests/Feature/ChecklistConsistenciaTddTest.php --compact --colors=never
php vendor/bin/pest --compact --colors=never --fail-on-risky
```

Si el preflight falla o el destino no es 3307/sisweb_testing, detenerse. No ejecutar otra suite en paralelo contra la misma base. Los comandos de evidencia añadieron --log-junit y guardaron salida/código en archivos separados; los comandos anteriores no sobrescriben esas evidencias históricas. Para reproducir ROJO usar el estado previo y los casos de esa etapa en un checkout aislado, sin revertir automáticamente este workspace.

## Riesgos y preparación de Fase 3C

El entorno está preparado para iniciar Fase 3C previa verificación del preflight; no se inició automáticamente. Se preserva el runtime nativo de pruebas, sin desinstalar ni usar Docker.

Pendientes: H15 carece de discriminador histórico para el fallback de métricas; SHA-256 no es firma ni protección contra sustitución conjunta de snapshot y huella; las guardas ORM no impiden SQL administrativo directo. La recuperación del servidor original de XAMPP está fuera de alcance y sigue pendiente. Los riesgos del módulo IA (incluido H04) no se cerraron mediante esta fase. No se ejecutaron pruebas paralelas, CI remota, frontend, Cypress ni Sonar; no se midió cobertura porcentual ni se afirma cobertura total.