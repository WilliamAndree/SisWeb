# Fase 3D — Resultados finales

Fase completada con 16 grupos de defectos reproducidos y corregidos. Se añadieron 72 casos con 143 aserciones sin modificar pruebas existentes para obtener verde. Los casos parametrizados no se contabilizan como defectos independientes. La regresión introducida por un límite demasiado estricto de vértices (GEO-3D-09) también fue detectada y corregida; no se cuenta como defecto preexistente.

## Resultados ejecutados

| Ejecución | Pruebas | Fallos | Errores | Aserciones |
| --- | ---: | ---: | ---: | ---: |
| Línea base repetida, 02 | 631 | 0 | 0 | 4381 |
| Nuevos casos tras refactor, 13 | 72 | 0 | 0 | 143 |
| Módulos, autorización y aislamiento, 15 | 190 | 0 | 0 | 440 |
| Suite completa serial, 17 | 703 | 0 | 0 | 4524 |

La selección 15 incluye 27 pruebas de aislamiento. No sumar las selecciones: comparten casos. La suite final no registra pruebas omitidas; terminó con código 0, 101.21 segundos de consola (99.254388 segundos JUnit). El incremento frente a la línea base es 72 pruebas y 143 aserciones. No se midió cobertura de código ni se afirma cobertura total.

## Evidencia rojo–verde–refactor

Los archivos TXT y JUnit originales se conservan en [evidencias-fase3d](evidencias-fase3d/). El resumen extraído de XML está en [18-resumen-junit.json](evidencias-fase3d/18-resumen-junit.json).

| Etapa | Resultado auténtico | Continuación |
| --- | --- | --- |
| 03 ROJO inicial | 21 casos, 21 fallos | 04 quedó con un fallo: referencia SQL vertical; 05 aprobó los 21 |
| 06 ROJO integración | 4 casos, 4 fallos | 07 aprobó 4/9 aserciones |
| 08 ROJO fronteras | 4 casos, 4 fallos | 09 aprobó 80/224 |
| 10 y 10b ROJO consistencia | 2 + 1 casos fallidos | 11 aprobó 62/125 |
| 12 ROJO precisión | 3 casos fallidos, incluido GEO-3D-09 introducido durante la corrección | 13 aprobó 72/143 |
| 14 y 14b formato | Pint satisfactorio | 15 y 17 verificaron el código final |

El intento rechazado por el revisor automático antes de reanudar no se presenta como ejecución. La evidencia roja válida es la ejecución 03 posterior. Los documentos [23](23-tdd-geometria.md), [24](24-versionado-integridad-planos.md) y [25](25-analisis-conectividad.md) relacionan requisitos, causas, casos y correcciones. Los comandos principales se conservan en 20-comandos.md.

## Archivos de esta fase

Se modificaron seis archivos de aplicación:

- app/Services/Espacio/Geometria/GeometriaPuntoSegmento.php: entradas finitas y proximidad sin redondeo prematuro.
- app/Services/Espacio/GestionEspacialService.php: validación, polígonos, área estable, persistencia en dos pasadas, idempotencia y auditoría relacional.
- app/Services/Espacio/AnalisisEspacialService.php: identidad piso+código, conexiones verticales y cola BFS.
- app/Http/Controllers/PlanoEstablecimientoController.php: integridad/pertenencia de versiones y URL de evidencia privada.
- app/Models/VersionPlano.php: impedir reapertura de versiones cerradas.
- app/Models/AnalisisEspacial.php: comprobar contenido real y pertenencia al determinar vigencia.

Nuevos tests: tests/Unit/GeometriaRobustezTddTest.php (8), tests/Feature/CroquisIntegridadTddTest.php (52), tests/Feature/ConectividadGrafosTddTest.php (12). Nuevo soporte: tests/Support/EspacioFixture.php. Documentación: 23–26, evidencias-fase3d y matrices 03/11. Los cambios Git previos de otras fases se conservaron; git status completo no representa exclusivamente esta fase.

## Seguridad y conservación

El preflight final 16 verificó configuración resuelta y servidor efectivo: APP_ENV=testing, mysql, 127.0.0.1:3307, sisweb_testing, cuenta restringida, innodb_force_recovery=0. Storage temporal, caché/sesiones/correo array, cola sync y solicitudes HTTP no simuladas bloqueadas. No se contactó Gemini. No se tocaron datos del XAMPP original ni se recuperaron bases corruptas.

La comparación contra las huellas iniciales se registra en 21-preservacion.json: solo se permiten los seis archivos de aplicación y las matrices indicadas. Conserva .env, .env.testing, pruebas anteriores, guardas, frontend, documentos de producto y evidencias anteriores. No se realizaron commits, push, reset, limpieza indiscriminada, Cypress ni SonarQube. No hubo cambios frontend; por tanto no correspondía compilación TypeScript por esta fase.

## Riesgos y preparación UX/UI

El backend espacial queda validado por esta regresión para continuar la planificación UX/UI, sin iniciar automáticamente el rediseño. Deben atenderse en esa fase las discrepancias de contratos DTO/sondeo ya documentadas en docs/producto. No se certifica un flujo visual completo por pruebas backend.

Persisten H05 (concurrencia IA), H15 (fallback contractual) y H08 (fixture histórico con hash simulado); no se declaran resueltos por esta fase. Las importaciones históricas sin hijos ni metadata conservan compatibilidad y no tienen garantía de reconciliación SQL completa. SHA-256 no es una firma/HMAC y las guardas Eloquent no impiden SQL administrativo. La suite es serial; el grafo de 100 ambientes es funcional, no un benchmark ni prueba concurrente. La detección de cruces es cuadrática en vértices. Listas planas de códigos pueden repetir etiquetas entre pisos: usar piso+código del detalle. No se reparó el XAMPP original, no se ejecutaron trabajadores reales ni CI, y el análisis preventivo no constituye certificación oficial de evacuación o ITSE.
