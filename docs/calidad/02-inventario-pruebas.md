# Inventario de pruebas y trazabilidad

2026-11-16, b3d6e77. Ningún test ejecutado: aislamiento BD/discos pendiente. No se añadieron pruebas ni se implementó ciclo TDD en esta fase de diagnóstico.

## Clasificación

44 archivos: 7 Unit y 37 Feature. ItseRiskServiceTest usa PHPUnit; predomina Pest. Unit no significa prueba pura: ApplicabilityEngineServiceTest, GeoLocationServiceTest, NormativaArchitectureModelsTest y RecursoEducativoTest utilizan TestCase + RefreshDatabase. GeometriaPuntoSegmentoTest prueba cálculo puro; StoreAutoevaluacionRequestTest usa TestCase sin RefreshDatabase.

Feature combina HTTP, persistencia, seguridad, servicios y contratos de vista. JornadaCompletaComercianteTest/CheckItseIntegrationTest recorren backend, no navegador. No se localizaron dependencia/configuración/specs Cypress o Playwright fuera de vendor/node_modules. Un last-run.json con status failed y sin casos no acredita E2E.

## Matriz requisito–caso

Todos los resultados actuales están PENDIENTES. Los casos adicionales son propuestas, no implementación.

| Requisito | Archivos/casos existentes | Próximo caso o límite |
| --- | --- | --- |
| R01 Propiedad/UUID | AutorizacionRutasUuidTest: titular, intruso, cookies, UUID numérico; HybridIdentityTest | Borrador sin token ni sesión: paridad testing/producción |
| R02 Identidad/vinculación | ConversionInvitadoTest, Paso9HistorialVinculacionAccesoTest, DashboardYPerfilCiudadanoTest | Credenciales inválidas, regeneración, 429 y CSRF efectivo |
| R03 Registro/cierre | Paso1DatosEstablecimientoTest, RegistroInicialChecklistTransitionTest, CierreAutoevaluacionTest, ReevaluacionTest | Cierre concurrente y escritura sobre sellado |
| R04 Checklist | ApplicabilityEngineServiceTest, ChecklistDinamicoEndpointTest, ChecklistInteractivaViewTest, ChecklistUX032Test | Catálogo inconsistente, duplicados, inválidos; preservar NULL/false/NO_APLICA |
| R05 SHA-256 | AutoevaluacionIntegridadCicloVidaTest casos 6-10: canónico, adulteración, fallback, campos sellados | JSON inválido/no representable y política histórica de metricas |
| R06 Evidencias | AutoevaluacionIntegridadCicloVidaTest casos 13-17; SubsanacionEvidenciasTest, SubsanacionDirectaTest, TrazabilidadForenseSubsanacionTest | MIME real inválido, 5 MB/exceso, archivo ajeno/ausente, fallo disco/BD |
| R07 Gemini simulado | AnalisisMultimodalGeminiTest casos 9-13: HTTP fake, hash, 429, ilegibilidad, inmutabilidad; 16-17 saneamiento y campos faltantes | Enums/tipos inválidos, JSON malformado, timeout, 401/403/500, criterio ajeno |
| R08 Idempotencia IA | AnalisisMultimodalGeminiTest caso 6: repetición secuencial | Dos solicitudes simultáneas: un análisis/job |
| R09 Versionado | ModeloEspacialVersionadoTest | Concurrencia, versión ajena, geometría inválida y divergencia JSON/relaciones |
| R10 Sugerencias | SugerenciasEspacialesMultimodalTest | Confirmación repetida, sugerencia ajena, IA inconsistente |
| R11 Geometría | GeometriaPuntoSegmentoTest: cero, tolerancia 0.20, fuera, segmento degenerado y polígono L; AnalisisEspacialPreventivoTest | Ciclos, ambientes aislados, borde exacto, escalera sin destino y referencias ausentes |
| R12 Panel/informes | HistorialAutoevaluacionesTest, InformePreventivoFase16Test, ResumenDescriptivoTest, QARevisionFinalFase18Test | Browser, móvil y accesibilidad |
| R13 Recursos | AfiliacionAliadosTest, RecursosCercanosTest, RecursosEducativosIntegrationTest, RecursoEducativoTest | Sin proveedores, coordenadas inválidas y datos incompletos |
| R14 Aislamiento | phpunit.xml, Pest.php, TestCase.php | Guarda BD/discos/red ANTES de migrar |

## Simulaciones y fragilidad

AnalisisMultimodalGeminiTest usa Http::fake en procesamiento y Queue::fake para controlar jobs, clave ficticia y reintentos 0. Su helper calcula hash canónico real y SHA-256 de bytes de evidencia. AutoevaluacionIntegridadCicloVidaTest también usa hash real y casos de adulteración.

ModeloEspacialVersionadoTest:40 calcula hash de literal mock_payload_canonico_fase3: es SHA-256 válido, pero no demuestra correspondencia con snapshot. Sirve para inmutabilidad del valor frente a croquis; no sustituye integridad canónica. No todo fixture sintético es defecto.

No hay bloqueo global visible de HTTP no simulado en Pest.php/TestCase.php. Fakes parciales no garantizan aislamiento de nuevas pruebas. Exigir prohibición de tráfico y claves productivas inaccesibles antes de correr suite.

La excepción de autorización para testing permite fixtures irreales. E-04 existente usa REGISTRADA y no cubre la rama INICIADA exenta. No se afirma que hoy apruebe.

Revisar posibles redundancias por comportamiento antes de eliminar tests. No se midieron flakiness, mutation score, tiempos ni redundancia. No se infiere aprobación a partir de nombres o README.

## Inventario completo por archivo

Unit: ApplicabilityEngineServiceTest, GeoLocationServiceTest, GeometriaPuntoSegmentoTest, ItseRiskServiceTest, NormativaArchitectureModelsTest, RecursoEducativoTest, StoreAutoevaluacionRequestTest.

Feature: AfiliacionAliadosTest, AnalisisEspacialPreventivoTest, AnalisisMultimodalGeminiTest, AutoevaluacionIntegridadCicloVidaTest, AutorizacionRutasUuidTest, CheckItseIntegrationTest, CheckItseModulosTest, ChecklistDinamicoEndpointTest, ChecklistInteractivaViewTest, ChecklistUX032Test, CierreAutoevaluacionTest, ClasificacionTramiteResumenTest, ContratoYSeguridadFase0Test, ConversionInvitadoTest, DashboardYPerfilCiudadanoTest, DemoWalkthroughSeederTest, DesacoplamientoFlujoLegadoTest, HistorialAutoevaluacionesTest, HybridIdentityTest, InformePreventivoFase16Test, InformePreventivoTest, JornadaCompletaComercianteTest, ModeloEspacialVersionadoTest, Paso1DatosEstablecimientoTest, Paso9HistorialVinculacionAccesoTest, PortadaYCapturaInicialTest, QARevisionFinalFase18Test, RecursosCercanosTest, RecursosEducativosIntegrationTest, ReevaluacionTest, RegistroInicialChecklistTransitionTest, ResultadoActualizadoTest, ResumenDescriptivoTest, SubsanacionDirectaTest, SubsanacionEvidenciasTest, SugerenciasEspacialesMultimodalTest, TrazabilidadForenseSubsanacionTest.

Los archivos se ubican en tests/Unit o tests/Feature con extensión .php. El inventario reproduce archivos, no el número de casos instanciados por datasets o describe.
