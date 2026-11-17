# Fase 3B — TDD de autoevaluaciones y checklist

Alcance: creación, validación, ciclo de vida, checklist y vínculo con el sello SHA-256. Se conservan los documentos y evidencias de fases anteriores. Resultados finales y comparación en 18-resultados-fase3b.md; detalle criptográfico en 17-integridad-criptografica.md.

## Seguridad previa

Se revisaron docs/calidad/00–15, AGENTS.md, guías locales de testing y Laravel, estado Git y cambios pendientes. No existe .ai/rules. Laravel instalado 12.69.2, Pest 3.8.7. La inspección de procesos mostró una instancia Codex y ningún ejecutor de pruebas previo; no se detectaron escrituras concurrentes sobre los archivos intervenidos. Esto es una observación de la sesión, no un bloqueo del sistema operativo contra futuras ediciones.

Antes de pruebas, 01-preflight.txt confirmó configuración resuelta y servidor: APP_ENV=testing, mysql, 127.0.0.1:3307, sisweb_testing, cuenta restringida a esa base, sin privilegios globales ni GRANT OPTION, innodb_force_recovery=0. Storage está en temporal exclusivo; caché/sesión/correo array, cola sync y HTTP no simulado bloqueado. Las 27 pruebas de aislamiento iniciales aprobaron con 44 aserciones. Cada arranque de TestCase repite las guardas antes de RefreshDatabase. No se tocó la base original de XAMPP ni .env; no hubo cambios de credenciales, Docker ni servicios externos reales.

## Defectos reproducidos y correcciones mínimas

| ID | Requisito y defecto | Corrección | Caso |
| --- | --- | --- | --- |
| D-3B-01 | Entradas inválidas de GLP/caldero/inflamables se convertían a null y pasaban nullable, creando registros | Reutilizar normalizador estricto existente: conservar valores inválidos para que boolean los rechace con 422 | AUTO-01, tres casos rojos y control de fritura verde |
| D-3B-02 | Cantidad GLP textual o array se convertía a 0/1 antes de validar numeric | Convertir a float solo si is_numeric; el resto llega intacto al validador | AUTO-02, dos casos |
| D-3B-03 | Modelo permitía cambiar REGISTRADA a INICIADA, habilitando eludir después la protección de atributos sellados | Añadir estado a la lista existente de atributos sellados | AUTO-03 |

Se mantienen null para información no declarada y los valores booleanos/controlados true, false, 1, 0 y sus cadenas admitidas. Cero galones con GLP=true es válido; si no se usa GLP se mantiene la normalización histórica a null. No se inventaron nuevas referencias normativas ni umbrales. No se afirma que el defecto de estado fuese una ruta pública explotable: se reprodujo mediante el modelo Eloquent.

## Ciclo TDD auténtico

- 03-rojo conserva el primer intento: 13 fallos, 1 error, 3 aprobados, 23 aserciones; AUTO-03 tenía un fixture incompleto (porcentaje obligatorio). Ese error no cuenta como defecto de aplicación.
- Se completó el fixture con porcentaje, semáforo y detalle, antes de modificar producción. 04-rojo-confirmado: 14 fallidos por requisitos reales, 3 aprobados, 24 aserciones, salida 1. Incluye también los defectos SHA de 17.
- 05-verde: los mismos 17 casos aprobaron, 46 aserciones, salida 0; no se eliminaron ni debilitaron expectativas.
- Refactorización: el cierre usa IntegridadEvaluacionService para la huella, eliminando la serialización/hash duplicados. El método privado resolverPayload centraliza la lectura segura del snapshot. Se añadieron controles de frontera y caracterización del checklist.
- 06-checklist registró 13 aprobados y 6 fallidos, 115 aserciones. Los seis rollback fallaron únicamente porque se esperaba null en un contador con default 0. Se explicitó ese valor inicial y se comprobó conservación en 0; no hubo corrección de aplicación para estos seis casos.
- 07-refactor: 44 aprobados, 187 aserciones. Pint pasó para archivos modificados y nuevos (08 y 08b). Regresión de módulos y suite final en 18.

## Matriz requisito–caso

| Requisito | Casos y archivos | Evidencia |
| --- | --- | --- |
| Entradas adversas sin persistencia | AUTO-01/02, AutoevaluacionReglasTddTest | 04 rojo; 05 verde |
| Estado final irreversible por modelo | AUTO-03 | 04 rojo; 05 verde |
| Cliente no impone propietario/hash/estado/snapshot | AUTO-04 | 07 |
| Límites área/pisos/aforo y cero GLP | AUTO-05, dos datasets | 07 |
| GLP, fritura, escaleras y estanterías distinguen true/false/null | CHECK-3B-01, 12 datasets de ChecklistConsistenciaTddTest | 07; 09 |
| Suspensión de seis criterios revierte un lote mixto completo | CHECK-3B-02, seis datasets | 07; 09 |
| Cierre completo, contadores, rechazo de cambios y hash real | CHECK-3B-03 | 07; 09 |
| Estados CUMPLE_DECLARADO, PENDIENTE_ATENDER, POR_REVISAR y NO_APLICA automático | Casos nuevos y ApplicabilityEngineServiceTest/ChecklistDinamicoEndpointTest existentes | 09 |
| Cierre incompleto, repetición idempotente y campos sellados | CierreAutoevaluacionTest existente | 09 |
| Reevaluación raíz, historia independiente, sin copia de evidencias ni subsanaciones | ReevaluacionTest e HistorialAutoevaluacionesTest existentes | 09 |
| Propietarios, invitados legítimos e intrusos | Suite de autorización existente y regresión final | JUnit final en 18 |

Los nuevos casos de checklist caracterizan reglas ya correctas: no se fabrica una fase roja para ellos. El catálogo, seeder normativo, motor de aplicabilidad y reglas de estados del checklist no necesitaron cambios. Las pruebas existentes complementan los nuevos casos y no se contabilizan como nuevas.

## Archivos intervenidos

Aplicación: app/Http/Requests/StoreAutoevaluacionRequest.php, app/Models/Autoevaluacion.php, app/Services/Evaluacion/IntegridadEvaluacionService.php y app/Http/Controllers/EvaluacionController.php. Tests nuevos: tests/Feature/AutoevaluacionReglasTddTest.php, tests/Feature/ChecklistConsistenciaTddTest.php y tests/Unit/IntegridadEvaluacionServiceTest.php. Se preservó el trabajo pendiente de Fase 2/3A y los stubs históricos existentes; no se eliminaron ni deshabilitaron pruebas.

Referencias de API consultadas: [Laravel 12 HTTP tests](https://laravel.com/docs/12.x/http-tests) y [Pest expectations](https://pestphp.com/docs/expectations); sintaxis contrastada con los paquetes instalados. No se actualizaron dependencias.