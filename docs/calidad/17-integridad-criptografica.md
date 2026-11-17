# Fase 3B — Integridad criptográfica

## Contrato preservado

IntegridadEvaluacionService ordena recursivamente claves de arrays asociativos; conserva el orden de listas y genera JSON con Unicode y barras sin escapar. SHA-256 se calcula sobre esos bytes. Es el formato canónico propio del proyecto, no una afirmación de cumplimiento de RFC 8785. Los hashes válidos existentes conservan sus bytes y no se migraron registros.

Un registro sin hash o sin snapshot verificable devuelve NO_VERIFICABLE. Una alteración del contenido sellado devuelve NO_COINCIDE. Se mantiene el método histórico que excluye metricas cuando coincide exactamente la huella del resto del snapshot.

## Defectos

| ID | Causa y reproducción | Corrección mínima | Evidencias |
| --- | --- | --- | --- |
| D-3B-04 | json_encode devuelve false para UTF-8 inválido, INF o NAN; el cast a string producía cadena vacía y una huella aparentemente válida | JSON_THROW_ON_ERROR impide generar huella si falla la serialización | HASH-02: tres rojos en 04; verdes en 05 |
| D-3B-05 | json_decode fallido o escalar se convertía con cast a array; un JSON roto/null acababa en [] y podía reportar VALIDO frente a SHA-256 de [] | Resolver snapshot sin cast coercitivo: aceptar array o JSON decodificado a array; malformados/escalares devuelven NO_VERIFICABLE y hash_calculado=null | HASH-03: cinco rojos en 04; verdes en 05 |

La reproducción usa valores reales y hash('sha256', ...), sin mocks del servicio de integridad. En HASH-03 se simula la representación histórica doblemente serializada mediante atributos crudos de Eloquent; el JSON almacenado puede ser una cadena válida cuyo contenido no constituye un snapshot válido. También se conserva su variante histórica válida en HASH-04.

Para calcular directamente desde un modelo sin snapshot utilizable se conserva el retorno vacío del contrato previo; no se sustituye por la huella de []. El verificador distingue esa falta de material verificable mediante NO_VERIFICABLE. La generación a partir de arrays no serializables arroja JsonException.

## Pruebas nuevas y relación con datos reales

| Caso | Comportamiento |
| --- | --- |
| HASH-01 | Compara JSON exacto escrito manualmente; reordena propiedades anidadas sin mutar el argumento, conserva Unicode/barras/listas y cambia hash al invertir una lista |
| HASH-02 | Tres casos: UTF-8 inválido, infinito y NAN; no producen huella |
| HASH-03 | Cinco casos: JSON roto, null, número, booleano y texto; nunca acreditan integridad de snapshot |
| HASH-04 | Snapshot histórico JSON válido conserva CANONICO_ESTRICTO |
| HASH-05 | Tres combinaciones sin hash/snapshot devuelven NO_VERIFICABLE |
| HASH-06 | Dos casos: métricas históricas legítimas y cambio real del dato; el segundo no queda oculto por el fallback |
| CHECK-3B-03 | Persiste 13 respuestas, finaliza mediante HTTP, compara huella real con los bytes JSON del snapshot persistido, valida contadores e integridad, rechaza edición con 409 y detecta posterior alteración SQL sintética |

La alteración SQL se realiza únicamente sobre el registro creado por la prueba, dentro de sisweb_testing ya verificada y con rollback del runner. Su propósito es eludir deliberadamente la guarda ORM para verificar que el detector reconoce una discrepancia. No se modifican registros preexistentes fuera de la base exclusiva de pruebas.

## Refactorización y compatibilidad

El cierre en EvaluacionController delega el cálculo en IntegridadEvaluacionService; se elimina el camino duplicado que ignoraba errores de JSON. La normalización de entrada reutiliza el helper booleano existente. El verificador y el cálculo desde modelo comparten resolverPayload. No cambian el algoritmo SHA-256, las banderas válidas de JSON, el orden de listas ni la política de métricas históricas.

Los casos de CierreAutoevaluacionTest y AutoevaluacionIntegridadCicloVidaTest existentes comprueban cierre idempotente, independencia del catálogo posterior, hashes por cambios de notas/características e inmutabilidad. Sus resultados se incluyen en la regresión de módulos, junto con los nuevos casos; no se presentan como pruebas nuevas.

## Riesgos y límites criptográficos

- H15 continúa como riesgo contractual: el fallback por presencia de metricas no exige un discriminador de versión histórica. Se probó que no oculta cambios del resto del contenido, pero las propias métricas están excluidas de esa comprobación por compatibilidad. Restringir su alcance requiere acordar la migración/versión; no se cambió silenciosamente esa regla.
- SHA-256 sin firma ni HMAC detecta discrepancias frente al hash conservado. No autentica autoría frente a un actor con capacidad de sustituir simultáneamente datos y huella.
- Las guardas de inmutabilidad actúan en Eloquent y endpoints; SQL directo o actualizaciones que omitan eventos no quedan físicamente prohibidas por una restricción de base de datos. La prueba de adulteración muestra el alcance de detección, no una garantía de almacenamiento inviolable.
- Los campos operacionales siguen siendo actualizables según el contrato existente; no se convierten en campos sellados. No se afirma cobertura total ni se midió cobertura porcentual.
- No se reparó el InnoDB original de XAMPP ni se ejecutaron Gemini real, CI remota o pruebas de concurrencia.