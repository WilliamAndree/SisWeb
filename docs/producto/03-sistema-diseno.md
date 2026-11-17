# Sistema de diseño propuesto

Especificación pendiente de implementación y validación. Mantener CheckITSE como herramienta preventiva: una marca confiable no debe parecer un sello municipal. Evolucionar el verde existente, las superficies claras y las primitivas actuales; no introducir una segunda biblioteca ni dependencias en esta fase.

## Paleta semántica

| Token propuesto | HEX | Uso |
| --- | --- | --- |
| brand / brand-hover | #047857 / #065F46 | Acción principal, marca; texto blanco |
| text / text-secondary | #0F172A / #475569 | Texto operativo y secundario sobre blanco |
| surface / canvas | #FFFFFF / #F8FAFC | Tarjetas y fondo de página |
| border-control / border-decorative | #64748B / #E2E8F0 | Límite funcional de campos / separadores sin significado |
| link / focus | #1D4ED8 | Enlaces subrayados y foco, no estado de seguridad |
| success-text / success-bg | #065F46 / #ECFDF5 | Operación guardada o declaración identificada como tal |
| warning-text / warning-bg | #92400E / #FFFBEB | Información pendiente o acción que requiere atención |
| danger-text / danger-bg | #B91C1C / #FEF2F2 | Error de operación o acción destructiva |
| info-text / info-bg | #075985 / #F0F9FF | Ayuda y orientación |

Verde de marca no significa «local aprobado». El color de un riesgo recibido del backend debe ir con etiqueta y explicación; no recalcular riesgo con un color ni inferir aplicabilidad. Priorizar neutrales y una sola acción principal por región; no asignar un color de marca a cada módulo.

Contrastes calculados localmente con luminancia relativa sRGB, razón (Lmayor+0,05)/(Lmenor+0,05), sin red ni renderizado:

| Primer plano / fondo | Razón |
| --- | ---: |
| Blanco / brand #047857 | 5,48:1 |
| Blanco / brand-hover #065F46 | 7,68:1 |
| text #0F172A / blanco | 17,85:1 |
| text-secondary #475569 / blanco | 7,58:1 |
| border-control #64748B / blanco | 4,76:1 |
| warning-text / warning-bg | 6,84:1 |
| danger-text / danger-bg | 5,91:1 |
| success-text / success-bg | 7,29:1 |
| info-text / info-bg | 7,09:1 |
| link/focus #1D4ED8 / blanco | 6,70:1 |

Como referencias actuales de fuente, blanco/#059669 da 3,77:1, blanco/#D97706 3,19:1 y #34C759/blanco 2,22:1. No asumir equivalencia entre clases emerald de Tailwind 4 y los HEX semánticos del proyecto. Los resultados son pares sólidos; transparencias, fondos reales, hover, foco, selección y disabled requieren comprobación posterior de estilo computado. No se certifica conformidad WCAG de la aplicación.

## Tipografía y espaciado

Usar la pila sans existente con fallback system-ui, -apple-system, Segoe UI, sans-serif. No añadir llamadas a Google Fonts ni otra dependencia externa. Si se decide una fuente comercial o propia después, revisar licencia, autoalojamiento, tamaño y fallback antes de adoptarla.

| Nivel | Tamaño / interlínea propuestos | Uso |
| --- | --- | --- |
| Título principal | 28/36 px móvil, 36/44 escritorio | Un H1 por pantalla |
| Sección | 24/32 px | H2 |
| Subtítulo | 20/28 px | H3 |
| Cuerpo y campos | 16/24 px | Preguntas, instrucciones y formularios |
| Apoyo | 14/20 px | Ayuda y metadatos no críticos |
| Anotación excepcional | 12/18 px | Nunca respuesta, error ni acción principal |

Escala de espacio: 4, 8, 12, 16, 24, 32, 48 y 64 px. Padding de tarjeta 16 móvil/24 escritorio; separación entre campos 16–24; entre secciones 32–48. Longitud de lectura 60–75 caracteres por línea. Evitar mayúsculas prolongadas y pesos black en texto corriente. No fijar alturas que corten texto ampliado. La impresión tiene su propia escala legible y paginación; no trasladar texto A4 de 9 px a la vista móvil.

Radios: conservar convención existente de controles 12 px, tarjetas/diálogos 16 px; badges redondos. Una sombra discreta como máximo por superficie, bordes visibles, sin gradientes ornamentales en formularios. Foco propuesto: anillo azul 2 px, separación blanca 2 px y visibilidad sin depender de sombra.

## Componentes y estados

Reutilizar ui/button, card, dialog, progress, accordion y tabs. Consolidar antes de crear variantes. Los nombres siguientes describen contratos propuestos, no archivos ya implementados.

| Componente | Contrato visual/interactivo |
| --- | --- |
| Button | Primary, secondary, ghost y destructive; altura objetivo 44 px, texto explícito; loading conserva etiqueta/ancho, bloquea duplicación y anuncia actividad |
| Field | Label persistente, opcional/obligatorio, ayuda con unidad, input, error enlazado mediante id; nunca placeholder como único nombre |
| TriStateQuestion | «Sí», «No» y «Aún no lo sé»; true/false/null reales; leyenda de grupo y selección visible/textual |
| CriterionCard | Pregunta ciudadana, respuestas permitidas, estado de guardado y acción; norma/ejemplo/ayuda bajo expansión |
| StatusBadge | Icono + texto + color; distingue diagnóstico, guardado, subsanación e IA; no muestra «aprobado» |
| SaveStatus | Sin guardar, guardando, guardado confirmado por servidor, error con reintento; no confirmar por un temporizador |
| ProgressStepper | Paso actual nombrado, número/total y navegación válida; no convertir porcentaje de respuestas en porcentaje de seguridad |
| Alert / ErrorSummary | Error específico, causa conocida y próxima acción; resumen enlaza a campos, status para éxito y alert para error urgente |
| Modal | Nombre accesible, descripción si procede, foco inicial seguro, contención, Escape según operación, devolución de foco e impedimento de interacción del fondo |
| Empty / Loading / ErrorState | Contexto y siguiente paso; skeleton solo si útil, spinner con texto, error no reemplaza silenciosamente datos previos |
| EvidenceCard | Nombre/tipo/tamaño, fecha, estado de carga y referencia a criterio; historial anterior separado de evidencia vigente |
| RecordCard | Fecha, estado del proceso, próxima acción y local declarado; UUID/hash en «Detalles de integridad» |
| IAResult | Calidad, incertidumbre y límites explícitos; «no observable» no se transforma en ausencia física ni en cumplimiento |

Las primitivas Radix no garantizan por sí solas la accesibilidad de su composición. EvidenciaUploadModal y otros diálogos personalizados requieren migración/validación de comportamiento, conservando contrato de props y flujo. Los textos de cierre diferencian «Guardar avance» de «Cerrar autoevaluación»: cerrar es irreversible; reevaluar crea otro registro.

## Etiquetas sin cambiar valores

| Valor backend | Presentación propuesta |
| --- | --- |
| CUMPLE_DECLARADO | «Declaro que cumple» con aclaración de origen ciudadano |
| PENDIENTE_ATENDER | «Necesito atenderlo» |
| POR_REVISAR | «Necesito revisarlo» |
| NO_APLICA | «No corresponde a este local», asignado por el sistema; no es opción editable |
| INICIADA / REGISTRADA | «En preparación» / «Registro cerrado» |
| Subsanación PENDIENTE / EN_PROCESO / SUBSANADO_DECLARADO | «Pendiente» / «En curso» / «Corrección declarada» |
| IA REQUIERE_REVISION | «La foto no permite concluir; necesita revisión» |
| IA COMPLETADO | «Análisis orientativo disponible», nunca «Cumple ITSE» |

Los contadores y reglas siguen viniendo del backend. Información no declarada permanece null: no inferir «No» ni NO_APLICA. La integridad puede presentar VALIDO/NO_COINCIDE/NO_VERIFICABLE con explicación; tener un hash no significa una certificación ni sustituye la verificación real.

## Responsive y accesibilidad objetivo

Diseñar desde 320 CSS px; validar 320, 375/390, 768, 1024 y 1440 px, orientación y zoom. Los puntos de cambio responden al contenido: una columna por defecto, dos desde 768 si la pregunta sigue legible; página hasta 1200 px y lectura hasta 720 px. Menú compacto bajo el ancho en que los enlaces caben; conservar el comportamiento móvil ya implementado. Barra de acción inferior opcional con espacio reservado y sin tapar teclado, foco ni mensajes. No hacer depender una función esencial de hover.

Objetivo de aceptación: WCAG 2.2 AA, a comprobar después; contraste de texto normal ≥4,5:1, texto grande ≥3:1 y elementos gráficos/controles significativos ≥3:1 en los pares relevantes. Objetivo propio cómodo de 44×44 px para acciones táctiles; no confundirlo con todos los requisitos/excepciones del mínimo AA de 24 px. Reflow a 320 CSS px y zoom 200%; verificar también 400% donde corresponda. Un lienzo puede requerir navegación espacial, pero la tarea equivalente debe estar disponible en lista/formulario sin arrastre. Conservar orden de lectura, foco visible/no oculto, nombres de iconos, errores enlazados y preferencias de movimiento reducido. Texto transcrito para vídeo y alternativas para imágenes informativas.

Mantener modo claro: app.css desactiva dark intencionalmente. Reactivar dark sería otro alcance con matriz completa de contraste, no un quick win. No usar animaciones de celebración para estados de seguridad ni transiciones que retrasen la tarea.
