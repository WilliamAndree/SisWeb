# Fase 3C — Resultados finales

Estado: completada localmente. **631 pruebas aprobadas, 0 fallos, 0 errores, 0 omitidas y 4381 aserciones.** Pest completo serial con --fail-on-risky, salida 0; duración de consola 72,41 s y tiempo JUnit 71,184231 s. Fuente primaria: [salida](evidencias-fase3c/14-regresion-final.txt), [JUnit](evidencias-fase3c/14-regresion-final.junit.xml) y [resumen extraído](evidencias-fase3c/16-resumen-junit.json).

## Comparación medida

| Métrica | Baseline reejecutada 02 | Regresión final 14 | Diferencia |
| --- | ---: | ---: | ---: |
| Aprobadas | 569 | 631 | +62 |
| Fallos / errores / omitidas | 0 / 0 / 0 | 0 / 0 / 0 | 0 |
| Aserciones | 4201 | 4381 | +180 |

Se incorporaron 62 casos: ValidacionResultadoIAServiceTest (27), EvidenciasSeguridadTddTest (13) y GeminiResilienciaTddTest (22). GeminiFixture aporta datos/imagen sintéticos compartidos. No se eliminaron, deshabilitaron ni cambiaron aserciones de pruebas antiguas. AnalisisMultimodalGeminiTest solo cambia el helper para usar bytes de imagen reales en lugar de archivos vacíos declarados como imágenes.

Se documentan **14 defectos reproducidos y corregidos**, agrupados por contrato en 19–21 y registrados como D-3C-01 a D-3C-14 en la matriz 03. Son defectos de funcionalidad, integridad y validación; no se presentan los catorce como vulnerabilidades explotadas públicamente. H04 queda corregido; H05 concurrente permanece pendiente.

## Evidencia auténtica del ciclo

| Ejecución | Total | Aprobadas | Fallos | Errores | Aserciones |
| --- | ---: | ---: | ---: | ---: | ---: |
| 02 baseline | 569 | 569 | 0 | 0 | 4201 |
| 03 primer rojo | 27 | 0 | 18 | 9 | 20 |
| 04 rojo confirmado | 27 | 0 | 27 | 0 | 36 |
| 04b límites/certificación rojo | 4 | 0 | 4 | 0 | 4 |
| 05 verde inicial | 31 | 31 | 0 | 0 | 71 |
| 06 primera regresión de módulos | 56 | 39 | 12 | 5 | 208 |
| 07 refactor intermedio | 64 | 62 | 2 | 0 | 239 |
| 08 casos ampliados | 89 | 89 | 0 | 0 | 318 |
| 09 trazabilidad rojo | 2 | 0 | 2 | 0 | 7 |
| 10 trazabilidad verde | 2 | 2 | 0 | 0 | 10 |
| 12 módulos, integridad y aislamiento | 178 | 178 | 0 | 0 | 655 |
| 14 regresión completa final | 631 | 631 | 0 | 0 | 4381 |

No sumar filas como casos únicos. Los nueve errores iniciales fueron fixtures que requerían GD, no defectos de aplicación. Se sustituyeron por PNG sintético sin modificar el entorno. Los fallos de 06 incluyen una regresión introducida por min:1 (KiB en vez de bytes) y fixtures vacíos anteriores. La corrección preserva imágenes pequeñas válidas y rechaza tamaño cero.

Los dos fallos de 07 revelaron contratos existentes que debían preservarse: la creación PENDIENTE sin archivo no genera transición histórica, y una ejecución directa/síncrona sin worker termina FALLIDO. Se ajustó implementación y preparación de nuevos fixtures para representar edición EN_PROCESO y un Job asíncrono real simulado. No se debilitaron las aserciones antiguas ni se fabricó una fase roja para casos que ya eran correctos.

Refactorización: validación estricta separada del saneamiento, retirada de defaults optimistas, confinamiento de ruta reutilizado y estado de reintento condicionado al tipo de ejecución. Pint ejecutado en archivos modificados y nuevos: 11/11b. La selección 12 y la suite 14 se ejecutaron después del formato. Las fases rojas 04/04b/09 y verdes 05/08/10 conservan salidas, JUnit y códigos reales.

## Archivos de aplicación

| Archivo | Cambio |
| --- | --- |
| app/Http/Controllers/EvaluacionController.php | Código seguro, rechazo de archivo vacío, bitácora de ediciones/observaciones, ruta y hash antes de descargar |
| app/Services/Evaluacion/EvidenciaPrivadaService.php (nuevo) | Confinamiento de rutas por prefijo y realpath |
| app/Services/AI/ValidacionResultadoIAService.php | Tipos/enums/listas/textos estrictos y rechazo de afirmaciones oficiales explícitas |
| app/Services/AI/AnalisisEvidenciaService.php | Imagen reconocible, ruta confinada, criterio coincidente y estados conservadores |
| app/Services/AI/GeminiMultimodalService.php | Tipo del texto generado y límite de 64 KiB |
| app/Jobs/AnalisisEvidenciaJob.php | Reintentos transitorios asíncronos sin reabrir estados terminales de éxito |
| app/Models/ResultadoAnalisisEvidencia.php | Payload crudo privado conservado en BD y omitido de serialización |

Siete archivos de aplicación: seis existentes y uno nuevo. No se modificaron migraciones, catálogo normativo, MotorCorrelacionNormativaService, configuración productiva ni dependencias. Los cambios previos de Fases 2/3A/3B se conservan y no se atribuyen a esta fase. Las líneas están en 15-lineas.txt.

Documentación nueva: 19-tdd-subsanaciones.md, 20-seguridad-evidencias.md, 21-validacion-gemini.md y este informe. Matrices actualizadas: 03-matriz-hallazgos.csv, 08-casos-prueba-tdd.csv y 11-matriz-trazabilidad-actualizada.csv. Los logs de fases anteriores permanecen intactos.

## Aislamiento y preservación

El preflight 01 y el 13, anterior a la suite final, verifican configuración resuelta por Laravel y servidor: testing/mysql/127.0.0.1:3307/sisweb_testing, cuenta limitada a esa base sin permisos globales ni GRANT OPTION, innodb_force_recovery=0. TestCase repite esa verificación antes de migraciones. La selección 12 incluye las 27 pruebas de aislamiento existentes, aprobadas. Storage está en temporal exclusivo; caché/sesión/correo array, cola sync y HTTP externo bloqueado. Las excepciones de cola asíncrona se representan mediante mocks, sin arrancar workers externos.

Se guardaron estado/diff previos, procesos y huellas de archivos preexistentes. La comparación final está en 17-preservacion.json y 19-verificacion-final.json. .env, .env.testing, guardas, almacenamiento habitual y evidencias anteriores permanecen intactos; solo cambian archivos autorizados y matrices. No se tocó el directorio de datos/configuración del MySQL original de XAMPP. No se ejecutaron servicios externos reales, Gemini real, commits, push, reset ni limpieza indiscriminada. docs/ continúa ignorado por Git: los documentos/evidencias son locales.

Los comandos de lectura, preparación, Pint y pruebas están en 18-comandos.json; las ejecuciones de test tienen archivos de salida/JUnit propios. Las ediciones mediante apply_patch se corresponden con los archivos enumerados; no son comandos de shell. Las consultas a procesos o archivos son inspecciones y no se contabilizan como pruebas.

## Límites y preparación de Fase 3D

El entorno y la regresión local están preparados para continuar con Fase 3D tras un nuevo preflight satisfactorio; **no se inició Fase 3D**.

Pendientes: H05 (unicidad concurrente de análisis activos), H15 (discriminador histórico de métricas), revisión documental de la tabla normativa del correlador y recuperación del MySQL original de XAMPP. Se probaron ejemplos concretos de inyección/afirmación oficial y claves de acción ajenas al contrato, pero no inmunidad semántica ni exactitud visual de una IA real. La inspección de imágenes no es antivirus ni validación exhaustiva de todos los codecs; los documentos sin hash histórico no adquieren integridad retrospectiva. SHA-256 no es una firma contra un administrador capaz de sustituir datos y huella.

No se ejecutaron CI remota, concurrencia, workers reales, pruebas frontend, Cypress ni Sonar. No se midió cobertura porcentual ni se declara cobertura total.
