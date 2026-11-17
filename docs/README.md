# Documentación de SisWeb

| Documento | Contenido |
| --- | --- |
| [arquitectura.md](arquitectura.md) | Modelo C4, capas del backend y del frontend, módulos y reglas de diseño |
| [desarrollo-local.md](desarrollo-local.md) | Instalación con XAMPP o Docker y solución de problemas de MySQL |
| [pruebas.md](pruebas.md) | Entorno aislado de pruebas, comandos y CI |
| [auditoria/](auditoria/) | Informe de auditoría de la fase 1 |
| [calidad/](calidad/) | Diagnóstico, plan de mejoras, ciclos TDD (rojo, verde, refactor), matrices de trazabilidad y evidencias por fase |
| [producto/](producto/) | Auditoría UX/UI |

## Fases de calidad (`calidad/`)

| Fase | Documentos | Tema |
| --- | --- | --- |
| Diagnóstico | 00–04 | Estado inicial, arquitectura, inventario de pruebas, hallazgos y plan de mejoras |
| Fase 2 | 05–13 | Aislamiento de pruebas, plan TDD, regresión, incidente y recuperación |
| Fase 3A | 14–15 | Autorización uniforme |
| Fase 3B | 16–18 | Reglas de autoevaluación, checklist e integridad criptográfica |
| Fase 3C | 19–22 | Subsanaciones, seguridad de evidencias y validación de Gemini |
| Fase 3D | 23–26 | Geometría, versionado de planos y conectividad espacial |

Las carpetas `evidencias-*` guardan las salidas originales (JUnit, logs, parches) de cada fase.
