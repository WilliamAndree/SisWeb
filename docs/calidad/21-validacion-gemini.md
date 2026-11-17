# Fase 3C — Validación conservadora de Gemini

Todos los accesos al proveedor en las pruebas utilizan Http::fake, secuencias simuladas o failedConnection. preventStrayRequests permanece activo desde el bootstrap. No se enviaron fotografías ni datos reales a Gemini. La salida simulada permite verificar contratos del software, no la precisión visual de un modelo real.

## Contrato seguro

Se rechazan mediante InvalidArgumentException campos requeridos ausentes, tipos incorrectos, listas no válidas, elementos detectados incompletos y enumeraciones desconocidas. No se convierten incertidumbre/calidad/relevancia desconocidas a valores favorables. Se admiten hasta 100 elementos por lista y 10000 bytes por texto; el JSON generado recibido del proveedor tiene un límite de 65536 bytes. Estos límites defensivos locales no son una afirmación sobre límites oficiales de Gemini.

Una salida válida con ILEGIBLE, NO_RELACIONADA, INDETERMINADA o incertidumbre ALTO/MUY_ALTO termina en REQUIERE_REVISION. COMPLETADO significa que terminó el procesamiento, no cumplimiento normativo, certificación ni aprobación municipal. La IA no cambia el snapshot, hash ni declaraciones del diagnóstico.

| ID | Defecto | Corrección y caso |
| --- | --- | --- |
| D-3C-06 / H04 | Defaults optimistas y coerciones ocultaban enums/tipos inválidos | Validación estricta previa al saneamiento; IA-3C-01 y IA-3C-08 |
| D-3C-07 | Resultado de otro criterio se asociaba a la solicitud actual | Comparar criterion_code con el criterio solicitado; IA-3C-02 |
| D-3C-08 | Incertidumbre alta o relevancia indeterminada terminaban en COMPLETADO | Estado conservador REQUIERE_REVISION; IA-3C-03 |
| D-3C-10 | Un fallo transitorio marcado FALLIDO hacía que el siguiente intento del Job se omitiera | Restaurar PENDIENTE solo cuando hay Job asíncrono reintentable y quedan intentos; IA-3C-05 |
| D-3C-11 | Afirmaciones explícitas de certificación oficial escapaban del saneamiento previo | Rechazar patrones categóricos de certificación; IA-3C-06 |
| D-3C-12 | Se procesaba JSON generado de tamaño ilimitado | Rechazar texto generado superior a 64 KiB; IA-3C-07 |
| D-3C-14 | El resultado público exponía raw_payload_salida, eludiendo el saneamiento | Ocultar solo ese atributo al serializar; conservarlo en BD para trazabilidad privada; IA-3C-15 |

## TDD y refactorización

04-rojo-confirmado y 04b-rojo-limites contienen las fases rojas de validación, correspondencia de criterio, revisión, estructura visual, reintentos, certificación y tamaño. 05-verde contiene los 31 casos iniciales aprobados. La validación y saneamiento se separaron y se eliminaron los defaults optimistas ya inalcanzables. 09/10 contienen el rojo-verde adicional de exposición del payload crudo.

Se preserva el comportamiento de llamadas directas/síncronas: ante error terminan FALLIDO, puesto que no hay worker que vaya a reintentar. Con Job asíncrono, HTTP 429/5xx o fallo de conexión pueden volver a PENDIENTE antes de relanzar la excepción; los intentos quedan contados y la cola conserva sus tres intentos/backoff previos. No se reabren COMPLETADO/REQUIERE_REVISION. Fallos permanentes de validación no se convierten en éxito.

El fixture de reintento se ajustó para representar una cola real mediante JobContract simulado; no basta llamar handle sin un Job adjunto. Las expectativas de dos llamadas, dos intentos y resultado final COMPLETADO permanecen. La prueba antigua de 429 llamada sin worker mantiene su expectativa FALLIDO y no fue debilitada.

## Casos adicionales

| Caso | Alcance |
| --- | --- |
| IA-3C-08 | Diez campos obligatorios, cada uno ausente por separado |
| IA-3C-09 | Elemento no observable permanece no determinable; tool_call ajeno al contrato se descarta |
| IA-3C-10 | HTTP 401, 403, 429, 500 y 503: sin resultado favorable persistido |
| IA-3C-11 | Sin candidatos, contenido vacío y JSON roto: FALLIDO sin resultado |
| IA-3C-12 | Timeout/conexión simulados: fallo trazable, sin llamada real |
| IA-3C-13 | 429/503 seguidos de éxito: dos peticiones simuladas, esperas falsas y timeout explícito de 2 s |
| IA-3C-14 | Tres estados terminales no repiten análisis |
| IA-3C-15 | Resumen saneado público; payload original disponible solo como atributo privado persistido |

Las pruebas de timeout simulan ConnectionException y configuración; no miden una espera real de red ni la ejecución de un worker externo. La idempotencia de solicitudes activas y el hash antes de transmisión se verifican además con las pruebas existentes de AnalisisMultimodalGeminiTest. MotorCorrelacionNormativaService se inspeccionó y se ejecutó a través del flujo; no se modificaron sus referencias normativas.

## Riesgos residuales

- H05 permanece: la secuencia buscar/crear un análisis activo no tiene una garantía de unicidad concurrente acreditada aquí. Las ejecuciones fueron seriales; no se declara exactly-once.
- Los patrones de texto y las instrucciones de sistema no prueban inmunidad a prompt injection ni detección de toda alucinación. Se rechazan ejemplos concretos de certificación y se descartan claves de acción no previstas; no se acredita la veracidad visual de frases semánticamente plausibles.
- La tabla de correlación normativa requiere revisión documental independiente si se desea cambiar sus referencias; no se corrigieron números o límites sin respaldo verificable.
- La retención del payload crudo exige acceso administrativo controlado; ocultarlo en JSON no es cifrarlo en BD.
- H15 y la recuperación del XAMPP original siguen fuera del cierre de esta fase. No se midió cobertura ni se ejecutaron Gemini real, CI remota, frontend o Fase 3D.
