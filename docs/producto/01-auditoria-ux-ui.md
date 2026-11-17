# Auditoría UX/UI de CheckITSE Huancayo

Estado: propuesta documental; no implementada. Inspección estática del workspace local. No se abrieron servicios, navegador, base de datos ni Gemini; no se ejecutaron pruebas, build o migraciones. No hubo entrevistas ni evaluación de usabilidad con personas. Los problemas de comprensión/uso se presentan como riesgos razonados, no como resultados observados de usuarios reales.

La solicitud menciona 569 pruebas/4201 aserciones. La referencia posterior disponible es Fase 3C: 631 aprobadas/4381 aserciones, según docs/calidad/22 y su JUnit. Es evidencia backend previa: no acredita accesibilidad, usabilidad ni contratos React completos. No se modificó docs/calidad.

## Inventario y alcance

Se inventariaron 73 archivos en resources/js: 18 pantallas, cuatro fragmentos de páginas, 34 archivos de componentes compartidos, dos layouts y 15 archivos de entrada/SSR, hooks, datos, tipos y utilidades. Se realizó un barrido estructural de todas las páginas/componentes y lectura focalizada de flujos, textos, estilos, controles, formularios, accesibilidad y estados. No se afirma una revisión visual pixel a pixel de cada línea ni una auditoría WCAG certificada. Las longitudes siguientes describen tamaño del código, no complejidad cognitiva medida.

| Pantalla real, bajo resources/js/pages/ | Líneas inspeccionadas/inventariadas | Lectura UX y destino propuesto |
| --- | ---: | --- |
| Evaluacion/Home.tsx | 1007 | Landing educativa, estimador local, ejemplos y múltiples secciones; simplificar entrada, conservar información ampliable |
| Auth/Login.tsx | 177 | Errores asociados y autocomplete ya presentes; conservarlos y explicar retorno al proceso |
| Auth/Register.tsx | 251 | Teléfono opcional y errores accesibles; explicar por qué crear cuenta sin imponerla al invitado |
| Dashboard/Dashboard.tsx | 881 | Tarjetas, KPIs y metadatos; ordenar por próxima acción y separar evaluación de establecimiento |
| Evaluacion/MisAutoevaluaciones.tsx | 31 | Reutiliza Dashboard, no es una segunda interfaz independiente; respetar alias y contrato de props |
| Evaluacion/Nueva.tsx | 1483 | Formulario único, estimación y explicaciones; agrupar progresivamente sin inventar guardado antes del POST |
| Evaluacion/Checklist.tsx | 2451 | Hay estados, educación y guardado explícito; reducir información visible por criterio |
| Evaluacion/Resumen.tsx | 2510 | Resumen, acciones, pronósticos, notas y cierre; priorizar próximos pasos y lenguaje preventivo |
| Evaluacion/Resultado.tsx | 1158 | Flujo legado con indicadores; mantener compatibilidad y distinguirlo del resumen V2 |
| Evaluacion/SubsanacionDirecta.tsx | 938 | Corrección por criterio, evidencias y sondeo IA; revisar correspondencia con API antes de rediseñar |
| Evaluacion/Subsanacion.tsx | 438 | Plan legado y estados operacionales; no confundirlos con respuestas del checklist |
| Evaluacion/SimulacionRevision.tsx | 366 | Comparación/simulación y GAP; mantener como función secundaria del legado |
| Evaluacion/CroquisEditor.tsx | 1792 | Editor, formularios, versiones y sugerencias; dividir tareas e incorporar interacción alternativa al ratón |
| Evaluacion/ExpedienteLocal.tsx | 1161 | Agrega información y documentos; convertirlo en ficha del proceso con pestañas orientadas a tareas |
| Evaluacion/InformePreventivo.tsx | 379 | Composición imprimible; separar lectura en pantalla de densidad de impresión |
| Evaluacion/AnexoOficial.tsx | 958 | Formatos/tablas especializados; mantener textos oficiales y evitar apariencia de certificado emitido |
| Directorio/Index.tsx | 499 | Filtros y neutralidad ya implementados; información institucional ampliable, contacto contextual |
| Perfil/PerfilUsuario.tsx | 305 | Perfil y credenciales; alinear asociación de errores con Login/Register |

Los cuatro fragmentos son Evaluacion/components/InformeDatosGenerales.tsx, InformeMatrizCondiciones.tsx, InformeTrazabilidadLegal.tsx y ResumenHeader.tsx. Se revisaron sus encabezados, tamaños, metadatos y etiquetas para evitar que un rediseño de la página deje incoherencias en fragmentos.

Componentes compartidos revisados por familias:

- Navegación/conversión: Navbar, Footer, RegistrarLocalButton, ModalGuardarProgreso, ModalConfirmarReevaluacion; layouts AppLayout y AuthLayout.
- Educación/evidencias: GuiaModal, RecursoEducativoModal, VideoEducativoModal, ProveedoresCercanosModal, EvidenciaUploadModal; Directorio/ModalAfiliacion y ModalContactoProveedor.
- Evaluación: CajaNotasSubsanacion, DesgloseEspecialidades, DiagnosticoMultidimensional, GuiaPedagogicaModal, HojaModeloAnexo, NubeAsistenciaModal, PanelResultadoAnalisisIA.
- Documentos: Evaluacion/anexos/FormatoAnexo01–04, index y types.
- Espacio/trazabilidad: Espacio/PlanoEditor2D, shared/AuditoriaLogs y CryptoSealBadge.
- Primitivas existentes: ui/accordion, button, card, dialog, progress y tabs. Reutilizar estas piezas antes de crear otra biblioteca.

También se inspeccionaron app.tsx, app.css, contratos/types/datos relevantes y rutas/controlador solo como lectura para identificar interfaces. Las versiones instaladas conocidas son React 19 e Inertia React 2.0.x; no planificar migrar a APIs de versiones posteriores sin revisión.

## Fortalezas que deben conservarse

AppLayout.tsx:15 incluye salto al contenido. Navbar.tsx:193–206 tiene menú móvil con nombre accesible, expanded y control asociado; maneja Escape. Login/Register enlazan errores con campos y usan autocomplete. Nueva.tsx:1271 enfoca el primer error local. Checklist.tsx:2142 distingue guardado en curso, confirmado y fallido: no existe motivo para sustituirlo por un supuesto autosave invisible. Directorio tiene filtros con fieldset/legend y objetivos táctiles de 44 px. Resumen posee manejo explícito de foco en confirmación. app.css:211 respeta reducción de movimiento para scroll suave. Ya existen ayudas contextuales, criterios no aplicables, avisos no oficiales, componentes Radix y custodia de evidencias.

## Hallazgos priorizados

P0: condición de compatibilidad/confianza antes de publicar la pantalla afectada. P1: impacto alto en la tarea principal. P2: mejora incremental. Impacto es estimación de diseño por la evidencia estática, no frecuencia medida.

| ID | Evidencia concreta | Riesgo para el usuario | Impacto / prioridad | Acción propuesta |
| --- | --- | --- | --- | --- |
| UX-01 | SubsanacionDirecta.tsx:132 espera data.analisis; EvaluacionController.php:893 devuelve uuid_analisis/estado/resultado en raíz | El sondeo podría ignorar un resultado válido y parecer detenido | Alto / P0 para IA | Adaptador frontend tipado, fixture del JSON real y prueba de terminales; conservar API |
| UX-02 | PanelResultadoAnalisisIA.tsx:21–43 usa elemento/estado_visual/detalle y visual_observations; modelo devuelve element_name/visual_status/description y observaciones_visuales; no_observable frente a not_observable | Datos vacíos, fallbacks incorrectos o error al recorrer listas | Alto / P0 para IA | Mapear ambos endpoints/props de forma explícita; no suponer mismo DTO |
| UX-03 | Home.tsx:114 «3 min · Tiempo promedio»; textos «Evita multas y cierres», «Veredicto»/«Pronóstico favorable» en flujo | Promesas no respaldadas y confusión con aprobación oficial | Alto / P1 | Retirar promedio no medido y promesas absolutas; lenguaje de orientación y fuente declarada |
| UX-04 | Home.tsx:158 «Pre-screening»; Nueva.tsx:139 «Arriostramiento antisísmico»; ResumenHeader.tsx:164 «Estado Veredicto»; Informe «GAP» | Terminología exige conocimientos previos | Alto / P1 | Lenguaje ciudadano principal, término técnico y norma dentro de ayuda |
| UX-05 | Nueva.tsx:1367 mantiene formulario único con datos, características y panel orientativo | Carga inicial y estimación compiten con completar datos | Alto / P1 | Tres grupos progresivos; mostrar campos condicionales y resumen de errores |
| UX-06 | Resumen y Checklist contienen numerosas secciones, ayudas y metadatos; formatos de 9–11 px en Dashboard:256/314, Resumen:845 y fragmentos de informe | Escaneo y lectura móvil difíciles | Alto / P1 | Primera capa de próxima acción; texto operativo 16 px y detalle ampliable |
| UX-07 | CSS primary azul; Navbar/CTA emerald; Home y Checklist usan #34C759/#FF9500/#FF3B30 | El mismo color representa acción, estado o riesgo según pantalla | Alto / P1 | Tokens por función, etiquetas e iconos; separar progreso de seguridad |
| UX-08 | app.css declara success-600 #059669 con foreground blanco; Resumen:841 usa texto #34C759 | Pares calculados 3,77:1 y 2,22:1 sobre blanco; insuficientes para texto normal | Alto / P1 | Pares medidos de 03; verificar estilo computado y estados al implementar; no asumir que emerald-600 equivale al HEX semántico |
| UX-09 | PlanoEditor2D.tsx:292–295 usa mouse para el lienzo; no se localizaron manejadores de teclado/touch equivalentes en ese componente | Operaciones gráficas pueden excluir teclado/tacto | Alto / P1 | Lista/formulario equivalente y controles accesibles; no depender de arrastrar |
| UX-10 | EvidenciaUploadModal.tsx:167 usa dialog open; gestiona Escape/overflow pero no se localiza showModal/foco atrapado allí | Fondo potencialmente interactuable y foco perdido | Alto / P1, verificar en navegador | Unificar contrato modal usando primitiva existente y devolver foco |
| UX-11 | SubsanacionDirecta.tsx:236 usa alert y consume data.error/data.message; API devuelve mensaje | Mensaje técnico/genérico y recuperación poco contextual | Alto / P1 | Error inline por criterio, mapear mensaje y estados 400/403/409/422 |
| UX-12 | PerfilUsuario.tsx:61–80 muestra error sin aria-invalid/describedby como Login | Lectura de errores inconsistente para asistencia técnica | Medio / P1 | Campo compartido con label/ayuda/error enlazados |
| UX-13 | CryptoSealBadge.tsx:36–48 prioriza «Sellado criptográficamente/Registro inmutable» y hash | Detalle técnico compite con la acción; hash puede interpretarse como certificación | Medio / P2 | «Registro cerrado» y acceso secundario a integridad, sin prometer inviolabilidad |
| UX-14 | RegistrarLocalButton dice «Registrar Nuevo Local»; Nueva crea autoevaluación; MisAutoevaluaciones reusa Dashboard | Registro comercial, local y evaluación pueden confundirse | Alto / P1 | CTA «Revisar mi local»; contexto «Nueva autoevaluación»; no inventar entidad local persistida |
| UX-15 | Directorio/Index.tsx:187 bloque extenso institucional antes de filtros | Tarea de encontrar ayuda puede quedar desplazada | Medio / P2 | Resumen de neutralidad visible, principios completos ampliables |
| UX-16 | AuthLayout oscuro frente a superficies ciudadanas claras; ui/button rounded-md frente a convención radius-control xl | Cambio de contexto y controles inconsistentes | Medio / P2 | Conservar marca y superficies claras de formulario; consolidar variantes |
| UX-17 | Pantallas imprimibles/tablas especializadas y leyendas del lienzo | Posible scroll/solapamiento a 320 px y zoom | Alto / P1, hipótesis de layout | Validación real en viewport/zoom; vista de lectura móvil distinta de A4 |

Los contrastes son cálculos locales con luminancia relativa sRGB y colores sólidos de fuente. No equivalen a medir cada fondo compuesto, transparencia, estado hover o pantalla renderizada. Los riesgos de layout y foco necesitan navegador y tecnología de apoyo en una fase posterior.

## Decisión de producto

Ordenar la experiencia alrededor de «Comprender → Declarar → Ver qué atender → Corregir → Conservar historial». El primer valor no debe exigir registro. El cierre debe conservar la inmutabilidad y permitir reevaluación, nunca reabrir un registro. La ayuda normativa permanece disponible sin ocupar el mismo nivel visual que la tarea principal. Los criterios P0 de IA se planifican como compatibilidad frontend; no justifican alterar silenciosamente el backend ni ejecutar Fase 3D aquí.

## Preservación y comprobación documental

Se compararon antes/después huellas SHA-256 de nombres y contenidos de 442 archivos en app, config, routes, resources, tests, docs/calidad, bootstrap y database: ninguna raíz cambió. La única escritura de esta tarea fue crear los seis archivos solicitados en docs/producto. Se verificaron existencia/contenido de los seis documentos y ausencia de errores de whitespace en el diff existente; esto no es una prueba de usabilidad ni una nueva ejecución de la suite. Los cambios Git pendientes de las fases anteriores permanecen. docs/ sigue ignorado por Git; no se cambió esa regla ni se añadieron archivos al índice. No hubo commits ni push.
