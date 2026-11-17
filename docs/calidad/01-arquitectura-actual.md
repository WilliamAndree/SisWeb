# Arquitectura actual

Referencia b3d6e77, 2026-11-16. Inspección estática; no es certificación ISO/IEC 25010.

Monolito Laravel 12 con React 19, Inertia 2, TypeScript, Vite y Tailwind 4. Eloquent y persistencia relacional; sesiones web e identidad híbrida; Sanctum protege GET /api/user. Las rutas con prefijo /api/autoevaluaciones definidas en web.php usan middleware web: el nombre de URL no implica autenticación por token.

## Módulos implementados

| Módulo | Implementación | Flujo |
| --- | --- | --- |
| Identidad | AuthController, HandleGuestSession, User, EvaluacionHelperTrait | Cookie invitado; registro/login/logout; vinculación y área personal |
| Autoevaluación | EvaluacionController, Autoevaluacion, StoreAutoevaluacionRequest | Captura, borrador, resumen, cierre y reevaluación |
| Normativa | ApplicabilityEngineService y trait, CriterioNormativo, ReglaAplicabilidad, RespuestaAutoevaluacion | Aplicabilidad condicional y estados ciudadanos; NO_APLICA no seleccionable |
| Integridad | IntegridadEvaluacionService, eventos Autoevaluacion | JSON determinista, SHA-256, snapshot y atributos sellados |
| Subsanaciones | Subsanacion, HistorialSubsanacion y controlador | Declaración directa, legado, archivos privados e historial |
| IA | AnalisisEvidenciaService/Job, GeminiMultimodalService, ValidacionResultadoIAService, MotorCorrelacionNormativaService | Solicitud, hash, job, HTTP, saneamiento y resultado orientativo |
| Planos | PlanoEstablecimientoController, GestionEspacialService, PlanoEstablecimiento, VersionPlano | Normalización, hash, versión activa e historial |
| Modelo espacial | NivelPiso, AmbienteZona, ConectorCirculacion, ElementoEspacial | JSON geométrico y proyección relacional |
| Sugerencias | SugerenciaEspacialService, SugerenciaEspacial | Propuestas IA y confirmación/rechazo ciudadano |
| Conectividad | AnalisisEspacialService, GeometriaPuntoSegmento, AnalisisEspacial | Integridad, proximidad a perímetro y alcanzabilidad BFS |
| Directorio/educación | DirectorioController, DirectorioAliadosService, GeoLocationService y modelos de recursos/proveedores/afiliaciones | Recursos por criterio, proximidad y afiliación |
| Informes/panel | páginas Dashboard/Perfil/Evaluacion, EvaluacionSyncService | Resumen, informe preventivo, anexo y expediente |

## Límites y persistencia

bootstrap/app.php registra rutas y middleware; controladores coordinan servicios y renders Inertia. FormRequests normalizan/validan. Frontend reside en resources/js/pages, components, hooks, types y utils.

Migraciones: renombrado histórico de tablas, identidad híbrida, catálogo normativo, snapshot/cierre, hashes de evidencia y tablas IA/espacio. Hay UPDATE JOIN específico de MySQL; SQLite no es sustituto transparente sin verificar compatibilidad.

Autoevaluacion distingue INICIADA/REGISTRADA y protege atributos sellados mediante eventos. HistorialSubsanacion impide update/delete mediante eventos Eloquent: no es protección contra SQL directo ni DBA. IntegridadEvaluacionService:121-134 excluye metricas en su fallback por presencia de clave, sin discriminador histórico explícito. Revisar contrato antes de cambiarlo.

GestionEspacialService usa transacción, lockForUpdate y hash para evitar versiones idénticas; cierra la anterior y persiste relaciones. VersionPlano limita cambios de versiones cerradas mediante eventos. La consulta histórica filtra por plano e ID, reduciendo IDOR.

AnalisisEvidenciaService verifica hash al solicitar y al procesar. Su idempotencia secuencial no prueba exclusión concurrente. IA no debe sustituir el diagnóstico sellado ni certificar cumplimiento oficial.

## Acoplamiento y mejoras

EvaluacionController tiene 1932 líneas y su trait 766: autorización, captura, checklist, cierre, panel, informes, archivos e IA. Existen servicios separados; extraer operaciones gradualmente con caracterización, evitando una reescritura general.

La descarga duplica autorización y acepta credenciales distintas al trait. Definir contrato común sin debilitar propiedad o sesión inmediata. Coexisten alias /evaluacion y familias de endpoints de checklist; no eliminarlos sin demostrar desuso.

Resultado.tsx todavía se renderiza en la rama legada de resultado(); el redirect V2 a resumen no demuestra código muerto universal. Frontend mantiene pantallas grandes, contratos normativos y URLs escritas a mano. Revisar duplicación frontend/backend con pruebas de contrato antes de unificar. No se midió duplicación ni complejidad algorítmica.

## Entrega y análisis estático

CI declara PHP 8.4, Node 22 y MariaDB 10.11; local tiene PHP 8.2.12/Node 24.19.0. No se demostró equivalencia de ejecución. lint.yml ejecuta Pint, Prettier y ESLint en modo reparación, sin comprobación explícita posterior de diff: el formato puede corregirse en CI sin bloquear el PR.

Sonar incluye app,routes,resources/js,database,config; pruebas en tests; excluye vendor/node_modules/public/storage/cache/CSS. Espera Clover coverage.xml PHP. No configura LCOV ni ejecución scanner/Quality Gate en los workflows inspeccionados. No hay paso explícito tsc o Cypress. No demuestra ausencia de un scanner externo.
