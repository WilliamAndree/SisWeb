# Fase 3D — Versionado e integridad de planos

## Contrato conservado

Un plano pertenece a una autoevaluación. Cada guardado distinto crea N+1 dentro de una transacción y conserva la versión anterior; reenvío equivalente retorna la versión existente solo si sigue íntegra. El snapshot JSON normalizado y su hash SHA-256 se preservan; no se migraron/recalcularon registros existentes. El cierre de una versión histórica no puede retirarse mediante Eloquent para eludir la guarda de campos sellados.

Se inspeccionaron PlanoEstablecimiento, VersionPlano, NivelPiso, AmbienteZona, ConectorCirculacion, ElementoEspacial, SugerenciaEspacial y AnalisisEspacial, junto con sus tablas y relaciones. No se eliminaron migraciones ni se cambiaron formatos de API/React.

## Defectos y evidencia

| ID | Defecto | Corrección | ROJO / caso |
| --- | --- | --- | --- |
| D-3D-04 | Fallo de JSON producía SHA-256 de cadena vacía | JSON_THROW_ON_ERROR en generación; verificación falla de forma conservadora | 03; PLAN-3D-01 |
| D-3D-05 | Retirar cerrada_at permitía reabrir y modificar una versión histórica | Sellar también cerrada_at cuando la versión ya estaba cerrada | 03; PLAN-3D-02 |
| D-3D-06 | Auditoría solo de conteos no detectaba cambios de valores, FK a otro piso con igual código ni null→0 | Reconstruir proyección relacional y comparar JSON canónico preservando tipos; comprobar ámbito de FK | 03, 10 y 10b; PLAN-3D-03/13/15 |
| D-3D-07 | Consulta histórica/activa podía servir snapshot adulterado | Verificación antes de exponer geometría; 409 ante discrepancia | 03; PLAN-3D-04 |
| D-3D-08 | Versión activa de otro plano podía consultarse o analizarse bajo un UUID autorizado distinto | Verificar pertenencia de la versión al plano tanto en lectura como en ejecución | 03 y 08; PLAN-3D-05/09 |
| D-3D-11 | Editor con sugerencia construía route('evidencia'), inexistente | Usar la ruta privada existente autoevaluacion.evidencia | 06; PLAN-3D-06 |
| D-3D-12 | Idempotencia comparaba hash almacenado y devolvía una versión cuyo JSON estaba corrupto | Verificar integridad antes de reutilizar; crear una versión nueva válida conservando la anterior | 06; PLAN-3D-07 |
| D-3D-13 | Elemento podía vincular subsanacion_id de otra autoevaluación | Validar pertenencia de todos los IDs vinculados antes de persistir | 06; PLAN-3D-08 |
| D-3D-14 | Estructura JSON corrupta podía causar 500 al contar/recorrer elementos | Validación estructural previa en auditoría; análisis registra ERROR_INTEGRIDAD | 08; PLAN-3D-10 |
| D-3D-15 | esVigente comparaba solo ID/hash almacenado y seguía true tras alterar el JSON activo | Recalcular huella y comprobar asociación/tipo del snapshot | 10; PLAN-3D-14 |

La proyección relacional conserva áreas almacenadas para compararlas: no las recalcula y oculta una adulteración SQL. La comparación canónica equipara la representación JSON de 2 y 2.0 pero distingue null, 0 y false. Los hashes históricos de geometría mantienen su formato previo; el JSON canónico reutilizado en la auditoría no sustituye esos hashes.

## Compatibilidad histórica explícita

El código previo permitía versiones importadas sin hijos relacionales ni metadata de generación. Las pruebas existentes usan ese contrato para analizar relaciones indeterminadas. Se conserva esa compatibilidad: no se inventan hijos ni se afirma una reconciliación SQL que no puede realizarse. Para versiones generadas por el servicio, metadata.total_niveles identifica que debe existir la proyección: borrar todos los hijos no pasa la auditoría (PLAN-3D-17). Si hay hijos, se comparan sus contenidos.

Esto no es una garantía universal de auditoría relacional para registros históricos sin metadata. Debe distinguirse una importación legítima de una pérdida de datos mediante una política de migración futura, no reparando datos reales automáticamente.

## Autorización y trazabilidad verificadas

- PLAN-3D-11: ocho endpoints rechazan terceros con 403 sin crear versiones/análisis ni resolver sugerencias.
- PLAN-3D-12: invitado con cookie legítima consulta versión y ejecuta análisis; cookie incorrecta recibe 403.
- PLAN-3D-16: bajo UUID propio, versión/sugerencia ajena retorna 404; confirmar/rechazar no cambia el registro ajeno.
- Pruebas existentes: propietario consulta/guarda, invitado legítimo, invitado sin credenciales, UUID cruzados, drift, confirmación idempotente y conservación del sello de autoevaluación.
- La selección 15 incluye AutorizacionUniformeTddTest y AutorizacionRutasUuidTest; su paridad testing/production es lógica del autorizador con etiquetas de entorno simuladas, sin conectarse a producción.

PLAN-3D-18 compara SHA-256 real con los bytes del snapshot y confirma idempotencia al reordenar propiedades de entrada. Los fixtures nuevos usan también un hash real del payload de autoevaluación. El helper histórico de ModeloEspacialVersionadoTest aún contiene un hash literal para comprobar invariancia: no se presenta como prueba de validez criptográfica del diagnóstico (H08 no se cierra por extrapolación).

## Límites

SHA-256 no es firma ni HMAC contra quien pueda sustituir simultáneamente datos y huella. Guardas Eloquent no impiden SQL administrativo directo; las adulteraciones de pruebas se hacen deliberadamente sobre registros sintéticos en sisweb_testing y con rollback. No se verificó concurrencia de procesos reales ni se añadió una garantía nueva de unicidad al inicializar planos. La guarda de versión activa y la auditoría no sustituyen una inspección oficial ni una validación completa del modelo físico.
