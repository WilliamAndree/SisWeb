# Plan de mejoras controladas

2026-11-16. Propuesta posterior: no implementa correcciones ni autoriza operaciones destructivas. Métricas antes/después aún no disponibles. Categorías ISO/IEC 25010 son clasificación orientativa, no certificación ni notas Sonar.

## Fase 0 — Aislamiento y línea base

Primera corrección: H01/H02/H06/H17. Unificar contrato de base local/CI; entorno testing explícito sin sobrescribir .env. Conservar motor MySQL/MariaDB por UPDATE JOIN. Usuario limitado a base desechable; guarda anterior a RefreshDatabase que rechace entorno, host/base o discos no permitidos. No copiar datos reales.

Redirigir public/local a directorios temporales ANTES de migrar; aislar cola, correo, caché y sesión. Bloquear HTTP no simulado, con claves ficticias. Ni un sufijo _test ni Storage::fake tardío son garantía suficiente.

Aceptación: destino no permitido falla antes de migrar; destino permitido usa cuenta restringida/discos temporales; centinelas externos permanecen intactos; HTTP no simulado falla sin salir a red. Guardar configuración saneada, comando y código de salida. Solo entonces medir línea base.

## Fase 1 — Paridad de autorización

H03/H18: escribir caso para borrador anónimo sin token ni sesión legítima. Registrar rojo; corregir fixtures, retirar excepción exclusiva de testing con cambio mínimo y preservar sesión inmediata legítima INICIADA.

Aceptación: titular 200; intruso 403; recurso ajeno/UUID inválido 404 según contrato; token nulo/vacío denegado salvo excepción de sesión legítima documentada. Regresión UUID, identidad, vinculación, checklist, IA y planos. CSRF probado con middleware efectivo.

## Fase 2 — Contratos IA y fallos externos

H04/H05/H17: primero enums desconocidos, tipos incorrectos, criterio ajeno, JSON inválido, ausencia de candidates, timeout, 401/403/429/500. Todo con simulaciones; nunca Gemini real. Acordar rechazo o normalización conservadora sin elevar certeza por datos inválidos.

Aceptación: respuesta inválida no se presenta como confiable; snapshot/hash sellado intactos; mensajes sin claves; cero tráfico no simulado. Dos solicitudes simultáneas al mismo archivo/hash producen un análisis activo y un despacho sobre motor compatible.

## Fase 3 — Integridad y custodia

H08/H15: hash real cuando se afirme integridad, distinguiendo inmutabilidad. Casos de orden de claves, Unicode, listas, ausencia de snapshot, JSON no representable, adulteración y alcance histórico de metricas. Definir campos operacionales frente a sellados.

Aceptación: hash coincide con bytes canónicos esperados; alteraciones resultan NO_COINCIDE/NO_VERIFICABLE; excepción histórica explícita. Upload realista, MIME incorrecto, 5 MB/exceso, archivo ajeno/ausente, fallo BD/disco y custodia histórica con discos temporales. No describir eventos Eloquent como protección contra SQL directo.

## Fase 4 — Planos y conectividad

Caracterizar versiones concurrentes/idempotentes, integridad JSON/relaciones, coordenadas inválidas/no finitas, polígonos degenerados/autointersectados y referencias cruzadas. Probar 0.20 m exactos y a ambos lados, ciclos BFS, salida inexistente, conector flotante, piso destino ausente y ambientes aislados.

Aceptación: versión ajena no expuesta, versión cerrada preservada, normalización estable, análisis señalado/bloqueado ante integridad inconsistente y propuestas IA sujetas a confirmación. Mantener alcance preventivo, sin certificación oficial.

## Fase 5 — Refactor y frontend

H07/H16: extraer una operación por vez desde controlador con caracterización verde; revisar autorización duplicada y contratos normativos frontend/backend. No eliminar alias o Resultado.tsx sin demostrar desuso: existe rama legada.

Aceptación: mismos contratos HTTP/Inertia, estados y acceso; pruebas afectadas/regresión con evidencia; revisión del diff. Checks de formato y TypeScript en fase autorizada. Comparar métricas bajo herramientas y condiciones equivalentes.

## Fase 6 — E2E, Sonar y documentación académica

H09-H14: preparar Cypress con app/datos aislados: invitado → evaluación → checklist → cierre → subsanación; propietario/intruso; login/logout; plano/versiones y fallo IA simulado. Guardar runner, commit, salida/código y capturas relevantes.

Generar Clover nuevo por ejecución/commit, LCOV solo si se miden pruebas frontend, ejecutar scanner y consultar Quality Gate real. Separar cobertura PHP/JS. Registrar métricas Sonar solo si existen resultados verificables. Actualizar README y acordar seguimiento de docs/calidad. No añadir, commit ni push automático.

Aceptación: requisitos enlazados a casos/artefactos/commit; pipeline detecta fallo deliberado; Gate verificado; cobertura reproducible. Sin declaración de cobertura total sin medición.

## Registro TDD obligatorio posterior

| Etapa | Evidencia |
| --- | --- |
| Defecto | ID, esperado/observado y datos mínimos sintéticos |
| Rojo | Test nuevo, comando, fecha/zona, commit, salida, código no cero y fallo específico |
| Verde | Cambio mínimo, mismo caso/comando, salida y código cero |
| Refactor | Diff sin alterar contrato y repetición verde |
| Regresión | Casos afectados y suite completa aislada; aprobadas/fallidas/omitidas |
| Métricas | Alcance/herramientas/versiones equivalentes antes/después y límites |

Estado de esta auditoría: rojo no ejecutado; verde no ejecutado; refactor no aplicado; regresión no ejecutada. No se presentan resultados ficticios.
