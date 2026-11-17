# Criterios de aceptación UX

Especificación verificable para implementación posterior. Ninguno de estos criterios se declara aprobado por esta auditoría documental. No se ejecutaron pruebas UI, entrevistas, build ni Pest en esta fase. Fuentes estáticas y baseline backend no sustituyen evaluación en navegador.

Severidad de aceptación: bloquear entrega si se pierde información, autorización, significado normativo, lectura esencial o acceso a una tarea. Mejoras ornamentales no compensan un bloqueo. Cada evidencia futura identificará versión, ruta, fixture, estado, viewport, navegador, modalidad de entrada y resultado real.

## Matriz de aceptación

| ID | Pantalla/alcance | Criterio observable | Verificación futura |
| --- | --- | --- | --- |
| AC-01 | Sistema y contratos | Antes de implementar existe inventario de props/payloads/estados y ruta actual por pantalla; cada dato visible identifica fuente o carácter ficticio | Revisión de fixtures y contrato contra controlador/types, sin modificar servidor |
| AC-02 | Inicio | Una CTA dominante inicia revisión sin cuenta; retomar/login son secundarios y públicos | Tarea desde sesión invitada y regresión de enlaces |
| AC-03 | Inicio/confianza | No hay promedio «3 min» sin medición ni garantía de aprobación/multas; aviso preventivo legible junto a propuesta | Revisión de copy y prueba de comprensión no inducida |
| AC-04 | Login/registro | Campos requeridos actuales, teléfono opcional, autocomplete, errores enlazados y botón con estado de envío; un error no borra valores no sensibles | Navegador con 422/credenciales erróneas y teclado; backend autenticación |
| AC-05 | Vinculación | Cuenta válida recupera solo su revisión autorizada; visitante puede continuar sin cuenta; UUID ajeno no concede acceso | Fixtures propietario/invitado/intruso y prueba de retorno contextual |
| AC-06 | Panel | Cada tarjeta dice qué registro es, su fecha/estado y próxima acción; se distingue cerrado de pendiente sin depender de color | Sesión con borrador/cerrado/reevaluación y prueba de lectura |
| AC-07 | Panel vacío/KPI | Vacío ofrece iniciar; KPIs explican unidad y no convierten reevaluaciones en sedes ni declaraciones en aprobaciones | Comparar conteos con props de muestra, incluyendo datos faltantes |
| AC-08 | Datos | Cambiar de grupo conserva entradas mientras permanece en la pantalla; se informa que no hay persistencia remota antes del POST exitoso | Recorrido ida/vuelta, salida sin guardar y fallo 422 |
| AC-09 | Datos booleanos | Sí/No/Aún no lo sé producen true/false/null respectivamente; unidades/obligatoriedad no cambian | Inspección del payload y fixtures límite; ninguna conversión implícita a false |
| AC-10 | Paso a paso | Paso actual tiene nombre/número y relación con los demás; avanzar no se confunde con cerrar | Teclado/lector y recorrido completo con estados parciales |
| AC-11 | Guardado | Solo respuesta exitosa del servidor muestra «Guardado»; fallo deja edición visible y permite reintento sin duplicación accidental | Simular latencia, desconexión, error y doble clic; no usar red real |
| AC-12 | Checklist | Tres opciones ciudadanas exactas; NO_APLICA es readonly y los suspendidos no aparecen como pendientes | Comparar UI con fixture backend y tests de aplicabilidad |
| AC-13 | Checklist y ayuda | Pregunta/respuestas/guardado se distinguen a primera vista; norma/ejemplo se amplían sin perder selección | Prueba de tarea y teclado con ayudas abiertas/cerradas |
| AC-14 | Progreso | Numerador/denominador corresponden al flujo recibido; no se presenta progreso como nivel de seguridad; barra inferior no oculta foco/última respuesta | Fixtures completos/incompletos y móvil/zoom |
| AC-15 | Resumen | Origen de la declaración y próxima acción visibles; no hay «aprobado ITSE» ni pronóstico presentado como garantía | Comprensión con participante y revisión de copy |
| AC-16 | Cierre/integridad | Cerrar exige confirmación y validación del servidor; REGISTRADA no permite editar; reevaluar conserva original; falta/discrepancia de hash no muestra «integridad validada» | Pruebas de cierre, verificación real del hash y ruta de reevaluación |
| AC-17 | Subsanaciones | Estado operativo y respuesta del checklist no se confunden; error queda junto al criterio; volver conserva contexto | Casos PENDIENTE/EN_PROCESO/SUBSANADO_DECLARADO y 403/422 |
| AC-18 | Custodia | Cambiar observación/evidencia conserva historia y archivo previo; petición idéntica sin cambio no duplica un evento | Backend Fase 3C + UI de historial con dos versiones |
| AC-19 | Carga/IA | Se informa JPEG/PNG/WebP/PDF y 5 MB; PDF permite respaldo, no análisis visual; una foto no se envía al abrir su tarjeta | Archivo falso, vacío, grande, PDF e imagen sintéticos; ninguna API real |
| AC-20 | DTO y polling IA | Un JSON raíz real actualiza estado; resultado se adapta a nombres/enums reales, arrays ausentes no causan crash; sondeo cesa en terminales/al salir | Fixtures COMPLETADO/REQUIERE_REVISION/FALLIDO, sesión expirada y desmontaje |
| AC-21 | Significado IA | «No observable» no se convierte en inexistente/cumple; incertidumbre/revisión visibles; payload crudo no se muestra; reanálisis requiere acción explícita | Capturas por estado y caso sintético con elementos no determinables |
| AC-22 | Croquis accesible | Las tareas esenciales se completan sin arrastrar ni usar ratón mediante lista/formulario equivalente; origen manual/plantilla/IA permanece explícito | Teclado, tacto y comparación de geometría serializada |
| AC-23 | Croquis/versiones | Cambios sin guardar se identifican; guardar crea versión según contrato; consultar una versión no la sobrescribe ni cambia unidades | Tests espaciales, fixtures de versiones y navegación atrás |
| AC-24 | Historial | Original y reevaluaciones raíz se distinguen, con fechas/origen; conocer enlace no habilita consulta ajena | Autorización + revisión cronológica con varias evaluaciones |
| AC-25 | Informe | Se lee en móvil sin depender de A4; impresión no corta datos clave, repite encabezados pertinentes y conserva aviso no oficial | Chrome/Firefox y vista A4/PDF del navegador, pantallas pequeñas y documentos largos |
| AC-26 | Anexos/normas | Diseño no altera texto normativo oficial, referencias ni valores del registro; no añade firma/sello de autoridad ni afirma PDF accesible sin evaluación | Comparación de datos/contenido antes-después y revisión de impresión |
| AC-27 | Directorio | Filtros y vacío accesibles; contacto de proveedor se distingue de recomendación/aval oficial; neutralidad disponible | Teclado, filtros combinados y modal de contacto |
| AC-28 | Perfil | Label/ayuda/error enlazados; confirmación visible; campos personales y credenciales separados, sin capacidades no respaldadas | Formulario con errores y éxito; navegación y backend de identidad |
| AC-29 | Accesibilidad común | Texto/controles pasan pares relevantes de contraste, foco visible, reflow, semántica, modal y alternativas; objetivos en sección siguiente | Auditoría automática futura más teclado/lector/manual; ninguna herramienta sola acredita conformidad |
| AC-30 | SaaS futuro | Se distingue claramente prototipo de capacidad disponible; organización/roles/permisos/cuotas requieren RFC y TDD backend antes de oferta pública | Revisión de arquitectura, privacidad, investigación B2B y matriz de aislamiento; fuera del MVP UX |

## Matriz transversal de prueba

1. **Datos:** vacíos, parciales, límite, unicode/nombres largos; características false y null; criterios aplicables/no aplicables/suspendidos; invitado, propietario e intruso; cerrado y legado V1/V2.
2. **Estados:** carga, éxito, error recuperable, sesión expirada, permiso denegado, registro inexistente, discrepancia de integridad y sin snapshot verificable. Los mensajes no revelan secretos ni prometen una recuperación que la aplicación no soporta.
3. **Entrada:** solo teclado (Tab/Shift+Tab/Enter/Espacio/Escape), ratón y táctil. Modal contiene y devuelve foco; el fondo no es interactuable. No se cancela silenciosamente una carga en curso ni se declara guardada al cerrar una ventana.
4. **Lectura:** encabezados coherentes, landmarks, labels, descripción de errores y anuncios adecuados. Usar NVDA con un navegador soportado y VoiceOver móvil cuando sea posible; registrar combinaciones realmente utilizadas, no marcar todas como probadas por extrapolación.
5. **Presentación:** 320, 375/390, 768, 1024 y 1440 CSS px; zoom 200%, reflow equivalente a 320 px y revisión 400% donde corresponda; orientación y teclado virtual. Sin scroll horizontal en tareas ordinarias. Lienzo/tablas que lo requieran disponen de alternativa útil accesible.
6. **Contraste:** ≥4,5:1 para texto normal, ≥3:1 para texto grande y controles/gráficos significativos en contexto; combinaciones/estados reales. Objetivo de producto 44×44 px en acciones táctiles. No declarar fallo WCAG solo por usar 14 px ni conformidad por tener un aria-label.
7. **Movimiento y multimedia:** respetar prefers-reduced-motion; no autoplay molesto; recursos con texto alternativo/transcripción y ninguna tarea exclusiva de vídeo o imagen.
8. **Impresión:** páginas cortas/largas, filas que cruzan página, notas, avisos, texto seleccionable y contraste en blanco/negro. No cambiar datos para hacer caber un documento.

## Contratos críticos para fixtures futuros

La solicitud de análisis devuelve analisis_uuid/estado; el GET de estado devuelve uuid_analisis/estado/resultado en raíz. La UI actual espera data.analisis en el sondeo: el adaptador se diseñará contra la raíz real, no se cambiará la API para ocultar el desacuerdo. La prop inicial de SubsanacionDirecta tiene una proyección parcialmente distinta: debe tener su propio mapeo.

Resultado backend: calidad_imagen con enums como OPTIMA/ACEPTABLE/ILEGIBLE, nivel_incertidumbre BAJO/MEDIO/ALTO/MUY_ALTO, elementos con element_name/visual_status/description y listas como observaciones_visuales/no_observable/recomendaciones_captura. El panel actual usa otros nombres/enum en parte de su interfaz. Un tipo `| string` no resuelve esa discrepancia. Preservar incertidumbre, contenido no observable, versión y autorización; no agregar datos del payload crudo oculto.

Para errors, priorizar mensaje público del contrato y distinguirlo del código error; los estados del HTTP no se traducen todos a «falló la IA». Un 409 de evidencia adulterada bloquea descarga, no se evita quitando la comprobación. Falta de sesión no se soluciona enviando el UUID como credencial.

## Condición de cierre de una entrega posterior

Contrato y copy revisados; todos los AC aplicables con evidencia; pruebas de comportamiento nuevas cuando corresponda; compilación/tipos y checks sin escritura aprobados; selección backend aislada y regresión serial acordada; ausencia de peticiones reales a Gemini; revisión de móvil/teclado/impresión según alcance. Si una verificación no se ejecutó, declararla pendiente con motivo y responsable, no marcarla aprobada.

No hay capturas de navegador, métricas de usuarios, cobertura frontend o resultados WCAG producidos en esta planificación. Los seis documentos dejan el trabajo preparado para una tarea de implementación posterior y no autorizan despliegue ni cambios en el código actual.
