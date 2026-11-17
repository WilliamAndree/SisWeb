# Fase 3C — TDD de subsanaciones

Se revisaron los diagnósticos y evidencias anteriores, especialmente 14–18, las guías locales de Laravel/testing, Git y los servicios/controladores implicados. Se preservó el trabajo pendiente de Fases 2, 3A y 3B. La inspección inicial de procesos no mostró otro ejecutor de pruebas ni una segunda instancia Codex; no constituye un bloqueo contra futuras ediciones externas.

El preflight confirmó testing/mysql/127.0.0.1:3307/sisweb_testing, permisos exclusivos, InnoDB recovery=0, Storage temporal, caché/sesiones/correo array, cola sync y HTTP no simulado bloqueado. La línea base se reejecutó: 569 aprobadas, 4201 aserciones, cero fallos/errores. Fuentes: evidencias-fase3c/01-preflight.txt y 02-baseline.txt/.junit.xml.

## Comportamiento y defectos

La operación guardarSubsanacion autoriza al titular antes de escribir, admite códigos normativos y legados, estados PENDIENTE/EN_PROCESO/SUBSANADO_DECLARADO, y guarda archivos e historial dentro de una transacción con eliminación compensatoria del archivo nuevo si falla SQL. Los archivos anteriores se conservan. Las reevaluaciones mantienen sus revisiones y evidencias separadas.

| ID | Defecto | Corrección | Caso |
| --- | --- | --- | --- |
| D-3C-01 | Una edición de descripción/observación sin transición ni archivo quedaba fuera de la bitácora | Detectar cambios reales de esos campos en registros existentes | SUB-3C-01 |
| D-3C-13 | Aunque se añadiera un evento por edición, la observación no formaba parte del comentario histórico y se perdía su texto previo | Guardar descripción y observación en el evento append-only | SUB-3C-03 |

Se conserva el contrato previo: crear una subsanación PENDIENTE sin archivo no genera una transición artificial; crearla EN_PROCESO sí registra la transición desde PENDIENTE. Una petición idéntica sin cambios ni archivo no añade eventos. El fixture nuevo SUB-3C-01 se ajustó a EN_PROCESO para comprobar la edición sin contradecir ese contrato. Sus expectativas de conservar las dos notas no se debilitaron.

## TDD y regresión

El primer rojo (03) incluyó errores de preparación porque GD no está instalado. Se sustituyó la generación mediante GD por bytes PNG sintéticos embebidos; no se cambiaron extensiones PHP ni XAMPP. El rojo confirmado 04 registra los defectos reales. El verde 05 aprobó los 31 casos iniciales de subsanaciones, archivos e IA.

La regresión 06 detectó una regresión introducida por min:1: Laravel interpreta tamaños de archivo en KiB y rechazaba imágenes pequeñas válidas. Se reemplazó por una comprobación explícita de tamaño cero. Los fixtures antiguos de Gemini usaban archivos vacíos con MIME/tamaño declarados: se sustituyeron por PNG sintético válido, conservando sus aserciones. La ejecución 07 detectó dos incompatibilidades de contrato (auditar creación PENDIENTE y dejar PENDIENTE un Job llamado sin cola); se corrigió la implementación para preservar las expectativas existentes. No se modificaron esas aserciones antiguas.

El rojo adicional de trazabilidad 09 registra los dos fallos de observación/payload crudo; 10 registra su verde. La selección ampliada 08 y la regresión 12 verifican también los contratos existentes. Resultados exactos finales en 22-resultados-fase3c.md.

## Requisito–caso

| Requisito | Casos |
| --- | --- |
| Historial de notas y observaciones | SUB-3C-01 y SUB-3C-03 |
| Estados inválidos y exceso de tamaño sin persistencia | SUB-3C-02 |
| Custodia, reemplazo y ausencia de duplicación de cambios idénticos | EVID-3C-06 |
| Autorización de propietarios/invitados e intrusos | AutorizacionRutasUuidTest, AutoevaluacionIntegridadCicloVidaTest y AnalisisMultimodalGeminiTest existentes; suite final |
| Rollback compensatorio y archivos anteriores | AutoevaluacionIntegridadCicloVidaTest y SubsanacionEvidenciasTest existentes |
| Independencia del snapshot/hash y reevaluaciones | AutoevaluacionIntegridadCicloVidaTest y ReevaluacionTest existentes; selección 12 |

No se impuso un catálogo exclusivamente V2 a los códigos legados ni se inventaron nuevas restricciones de transición. La inmutabilidad ORM del historial no equivale a prohibir SQL administrativo directo. No se ejecutó Fase 3D.
