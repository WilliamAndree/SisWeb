# Fase 3 — Registro de intentos y evidencia TDD

Fecha: 2026-11-16. Estado: detenido por pérdida del aislamiento.

## Requisito de autorización priorizado

El acceso a un borrador anónimo sin token ni sesión legítima debe denegarse igual en testing y producción. Deben conservarse propietario, cookie válida y sesión inmediata legítima. La búsqueda en app/routes identificó una excepción explícita de testing en EvaluacionHelperTrait:245-251. Esto es hallazgo estático; no se presenta como reproducción ejecutable completada.

## Intentos reales

1. Se generaron con Artisan AutorizacionUniformeTddTest, FlujosCriticosTddTest, IntegridadCanonicaTddTest y ValidacionResultadoIATddTest. Solo el primero recibió casos específicos antes del incidente. Los archivos desaparecieron posteriormente del workspace.
2. El primer intento ejecutó 12 casos de autorización, todos terminaron en error de preparación: faltaba uuid_trazabilidad en el fixture. Cero aserciones, código 2. No es rojo auténtico del defecto de autorización. Se conservó sin sobrescribir: [salida](evidencias-fase3/03-auth-rojo.txt), [JUnit](evidencias-fase3/03-auth-rojo.junit.xml).
3. Se intentó completar el fixture antes de tocar código productivo. Las siguientes invocaciones no descubrieron el archivo de prueba y ejecutaron cero casos. Evidencias: [ruta relativa](evidencias-fase3/04-auth-rojo-valido.txt), [ruta absoluta](evidencias-fase3/04b-auth-rojo-valido.txt).
4. La inspección confirmó además la desaparición de todas las guardas de Fase 2. Se suspendieron ejecuciones y modificaciones funcionales, según la condición explícita del usuario.

## Estado del ciclo

| Etapa | Estado |
| --- | --- |
| Requisito | Identificado por contrato de propiedad/token y documentación previa |
| Rojo por defecto real | NO obtenido; el intento falló por fixture, no por autorización |
| Corrección productiva | Ninguna aplicada |
| Verde de la corrección | No ejecutado |
| Refactor | No aplicado |
| Regresión posterior | No ejecutada; entorno posterior sin aislamiento confirmado |

No se retiró la excepción de testing ni se debilitaron guardas para conseguir verde. No se eliminaron pruebas por parte del asistente. No se fabricaron fallos y no se contabiliza el error de fixture como defecto corregido.
