# Visión de producto y hoja de ruta

Plan, no ejecución. Empezar después de concluir la estabilización técnica y revisar su línea base real; la referencia actual documentada es 631 pruebas/4381 aserciones de Fase 3C. Los identificadores UX-R no son las fases TDD 3D u otras: este documento no inicia ninguna.

## Propuesta de valor y alcance comercial

Para el ciudadano: comprender qué declaró, qué falta revisar y qué puede corregir. Para empresas futuras: coordinar preparación preventiva en varias sedes con responsabilidades, evidencia e historia. No vender «aprobación ITSE», inmunidad a sanciones, certificación por IA ni una probabilidad de inspección favorable.

La portada afirma que el servicio es cívico y gratuito. La propuesta conserva el núcleo ciudadano actual como restricción de diseño; cualquier cambio de promesa/precio requiere decisión explícita, investigación y comunicación propias. Los servicios empresariales serían una ampliación opcional, no una barrera para recuperar evidencias o consultar un registro ya generado.

| Capacidad | Existe hoy, según fuentes | MVP UX propuesto | Posible SaaS futuro, no implementado |
| --- | --- | --- | --- |
| Múltiples procesos | Cuenta, panel y colección de autoevaluaciones | Explicar qué representa cada registro y su relación raíz | Entidad/identificador de sede, organización y comparación entre sedes |
| Roles | Propietario e invitado autorizado; no se acredita IAM empresarial | Conservar acceso actual y mensajes claros | Administrador, responsable de sede, colaborador y lector con permisos específicos |
| Tareas | Pendientes y subsanaciones por evaluación | Próxima acción, filtros e historial legibles | Asignación, fecha, prioridad acordada, responsables y escalamiento |
| Reportes | Resumen, informe, anexos y expediente | Lectura/impresión clara con origen no oficial | Comparativos con mismo período/versión, denominadores y datos faltantes |
| Notificaciones | No se acredita un centro empresarial de avisos | Confirmaciones de acciones dentro de UI | Preferencias, resumen de pendientes, frecuencia y cancelación; canal por decidir |
| Auditoría | Historial de subsanaciones, versiones y hashes | Exponer historia de manera comprensible | Auditoría organizacional de accesos/cambios; no prometer inviolabilidad por SHA-256 |
| IA | Solicitud por evidencia, historial y estados conservadores | Envío voluntario, mensajes/DTO correctos y no reanálisis automático | Presupuesto por organización/sede, cuotas, límites y coste visible por consumo |
| Consultor | No se acredita delegación empresarial revocable | Ayuda contextual y exportación preventiva existente | Invitación explícita, alcance por cliente y revocación; nunca enlaces públicos con acceso implícito |
| Directorio | Listado, filtros/contacto y afiliación | Neutralidad y claridad de alcance | Canal comercial solo con reglas transparentes; sin ranking oculto ni aval institucional |

Un panel de muchas autoevaluaciones no demuestra multitenancy ni muchas sedes únicas. Reevaluar no crea automáticamente una sede nueva. Los roles y funciones de colaboración requieren modelos, autorización, pruebas de aislamiento por organización y API propios; no pueden simularse solo ocultando botones en React.

### Hipótesis de oferta, por validar

- Ciudadano: núcleo preventivo y cuenta opcional, con límites de uso comunicados si se acuerdan después.
- Equipo: varias sedes/responsables, tareas e informes comparativos; precio y unidad de cobro por investigar (sede activa, organización o combinación), sin cifras inventadas.
- Consultoría: espacios separados por cliente y acceso delegado; no acceso transversal predeterminado a expedientes.

Validar quién compra, frecuencia de uso, coste de soporte y disposición a pagar mediante investigación. No hay estimación verificable de mercado, ingresos, conversión, CAC o ROI. No fijar precios ni prometer ahorro de multas con este diagnóstico.

Control responsable de IA futuro: mostrar cuota disponible y consecuencia antes de solicitar; no enviar una foto al abrir una pantalla; reutilizar consulta de análisis activo sin volver a procesar; limitar reintentos/carga y evitar bucles de polling; avisar al alcanzar presupuesto y ofrecer continuar sin IA. No inventar contabilidad de tokens/precios del proveedor ni afirmar control concurrente de consumo sin backend. Fotografías y documentos requieren alcance, retención, acceso y eliminación definidos antes de una oferta B2B.

## Roadmap incremental

Esfuerzo orientativo en días de trabajo, no calendario ni compromiso: una persona frontend con participación de QA/diseño, reutilizando componentes y sin nuevos endpoints. Incertidumbre inicial al menos ±50%; discovery, nuevos contratos/backend, contratación y reclutamiento no están incluidos en las estimaciones de UI. Reestimar tras validar prototipo y estabilización. No sumar los rangos como presupuesto comercial cerrado.

Todas las fases requieren: contrato congelado, criterios de 06, fixtures sintéticos, preservación de autorización/reglas, verificación móvil/teclado y regresión pertinente. Archivos se indican desde resources/js salvo app.css. Son archivos candidatos a una implementación posterior, no archivos modificados ahora.

| Fase / esfuerzo | Entrega y archivos afectados | Dependencias y aceptación | Pruebas necesarias y regresión | Riesgos / límite |
| --- | --- | --- | --- | --- |
| UX-R0 · 2–4 días | Inventario de DTO/estados, wireframes, tokens y prototipo; types/contrato.ts, app.css, layouts/AppLayout y componentes/ui como candidatos | Cierre técnico previo, revisión de UX-01/02 y decisiones de copy; aprobar AC-01 y AC-29 sin implementar | Revisar JSON guardados de QA, matriz de rutas y muestra de contenido; crear baseline visual/manual futura | No llamar «resuelto» al sondeo IA por tener tests backend verdes; no añadir APIs ni librerías |
| UX-R1 · 2–4 | Inicio y navegación: pages/Evaluacion/Home, Navbar, Footer, RegistrarLocalButton; tokens/componentes compartidos mínimos | R0; una entrada principal y alcance no oficial; AC-02/03 | Flujo invitado desde inicio, menú por teclado/móvil, contrastes; regresión PortadaYCapturaInicialTest y rutas públicas | Alcance compartido afecta todas las pantallas; evitar cambio global simultáneo de estilos no revisados |
| UX-R2 · 4–7 | Nueva autoevaluación: pages/Evaluacion/Nueva; ayudas y stepper; Auth/Login/Register y ModalGuardarProgreso solo para preservar continuidad | R1; grupos cliente, mismas claves/POST, null explícito; AC-04/05/08/09/10 | Validación local/422 y límites; ida/vuelta entre grupos, invitado/usuario, reevaluación; tests StoreAutoevaluacionRequest, AutoevaluacionReglasTdd y RegistroInicialChecklistTransition | No existe guardado remoto antes de crear; no simular persistencia ni exigir cuenta |
| UX-R3 · 4–7 | Checklist: pages/Evaluacion/Checklist, RecursoEducativoModal, GuiaPedagogicaModal y primitivas | R2; mismo motor/catálogo y guardado confirmado; AC-11/12/13/14 | Tres respuestas, NO_APLICA readonly, suspendidos, error/red, navegación y foco; ApplicabilityEngineServiceTest, ChecklistDinamicoEndpointTest, ChecklistUX032Test | Mucha lógica en una página; extraer por contrato con pruebas, no reescribir el motor en cliente |
| UX-R4 · 3–6 | Resultados: pages/Evaluacion/Resumen, Resultado legado, components/ResumenHeader y shared/CryptoSealBadge | R3; próxima acción, cierre irreversible e información no oficial; AC-15/16 | Casos vacío/parcial/cerrado, discrepancia/no verificable, impresión básica; CierreAutoevaluacionTest, IntegridadEvaluacionServiceTest y autorización | No homogeneizar V1/V2 ni convertir porcentaje de avance en seguridad |
| UX-R5 · 4–7 | Subsanaciones y continuidad: SubsanacionDirecta, Subsanacion, CajaNotasSubsanacion; Dashboard, MisAutoevaluaciones y ExpedienteLocal para entrada/historial | Core R1–R4 aceptado; AC-06/07/17/18/24 | Estados, evento idéntico, notas/historial, permisos y reevaluaciones; SubsanacionDirectaTest, TrazabilidadForenseSubsanacionTest, HistorialAutoevaluacionesTest | No crear una falsa entidad sede ni sobrescribir evidencia/diagnóstico |
| UX-R6 · 4–8 | Evidencias/IA: EvidenciaUploadModal, PanelResultadoAnalisisIA, sondeo en SubsanacionDirecta; adaptador frontend propuesto bajo types/lib existentes | R5 y P0 UX-01/02 resueltos por contrato; AC-19/20/21 | JSON raíz real, enums, 403/409/422, PDF, cancelación/polling, terminales; GeminiResilienciaTddTest, EvidenciasSeguridadTddTest y simulaciones de navegador futuras | API real prohibida en QA; no enviar automático ni borrar incertidumbre; no exponer raw payload |
| UX-R7 · 6–12 | Croquis: CroquisEditor y Espacio/PlanoEditor2D | Estabilización espacial/versionado concluida por separado; R5 y AC-22/23 | Lista/ratón/teclado/táctil, unidades, cambios sin guardar, versiones; ModeloEspacialVersionadoTest y AnalisisEspacialPreventivoTest existentes | Mayor incertidumbre; primero verificar geometría. No extender a CAD/3D ni medición por fotografía |
| UX-R8 · 4–7 | Informes: InformePreventivo, AnexoOficial, fragments Informe*, HojaModeloAnexo y anexos/FormatoAnexo01–04 | R4/R5; AC-25/26 y revisión del contenido normativo preservado | Vista móvil, A4/PDF del navegador, tablas/páginas y datos sellados; tests de informes existentes y matriz de impresión manual | No afirmar PDF firmado/accesible sin generador y verificación correspondientes |
| UX-R8b · 2–4 | Perfil y directorio: PerfilUsuario, Directorio/Index, ModalAfiliacion/Contacto y ProveedoresCercanosModal | Tras core y antes de oferta empresarial; AC-27/28 | Campos/errores, filtros sin resultados, contactos y modales; pruebas existentes de identidad/directorio | No vender aval técnico ni alterar neutralidad; teléfono permanece opcional |
| UX-R9 · discovery 5–10 | Investigación B2B, prototipo y RFC de organización/sede/roles/cuotas; todavía sin archivos de aplicación asignados | R0–R8 estables, entrevistas propuestas y AC-30; decisión de alcance comercial | Matriz de permisos/tenants y escenarios de costes/retención en diseño; futuro TDD de backend antes de UI productiva | El panel empresarial requiere backend nuevo, fuera del rediseño compatible. Estimar construcción solo después de RFC |

Los nombres de tests existentes se usan como selección orientativa, no como resultados ejecutados para este plan. Antes de ejecutar una fase verificar nombres/rutas vigentes y añadir cobertura específica del comportamiento modificado sin eliminar pruebas previas.

## Gates y estrategia de regresión

1. Cerrar estabilización técnica y verificar cambios ajenos antes de comenzar. Registrar una nueva baseline; 631 no debe tratarse como una cifra eterna si el proyecto sigue evolucionando.
2. Revisión de diseño: contrato de datos, texto preventivo, estados de error/vacío/loading y criterios de accesibilidad. No limitar aprobación al screenshot exitoso.
3. Implementación posterior por pantalla/superficie pequeña, conservando rutas y DTO; TDD para defectos funcionales, pruebas de componentes/navegador para interacciones. El proyecto no acredita actualmente un harness browser instalado: escogerlo y autorizar cualquier dependencia en otra tarea. No simular que Pest backend cubre React.
4. Checks locales propuestos, no ejecutados aquí: TypeScript con noEmit, build existente, format:check y ESLint sin fix. package.json define lint con --fix y format con --write: no usarlos como checks de solo lectura ni en esta planificación.
5. Preflight obligatorio antes de Pest: testing/mysql/sisweb_testing:3307, permisos restringidos, discos temporales y HTTP bloqueado. Selección afectada primero; suite completa serial al cerrar cada entrega aprobada. Nunca validar frontend llamando Gemini real.
6. Matriz visual/manual: 320–1440 px, zoom, teclado, lector de pantalla, errores y print. Si no existe automatización visual, conservar capturas/observaciones futuras y su contexto, sin llamarlas tests automáticos.
7. Entrega gradual con checklist de rollback de la pantalla/componente de esa entrega. No ejecutar reset/restore indiscriminados, no revertir correcciones de seguridad y no migrar datos para un cambio visual. No publicar ni hacer commits automáticamente.

## Indicadores futuros y decisión de avance

Medir inicio→datos enviados→primer criterio guardado→resumen→cierre confirmado, recuperación de error, retorno y comprensión del alcance no oficial. El porcentaje usa denominador de sesiones elegibles y se separa por invitado/cuenta y dispositivo. Para empresas: cobertura de sedes con datos actuales, pendientes con responsable y consumo IA autorizado; no «porcentaje de seguridad» agregado inventado.

Sin analítica implementada ni baseline UX medida. Antes de instrumentar, definir consentimiento/minimización y excluir fotos, direcciones, notas, tokens y hashes privados de eventos. Las rondas cualitativas y los criterios de 06 deciden si avanzar o iterar; un aumento de conversión no compensa confusión de aprobación oficial, pérdida de datos o regresión de autorización.
