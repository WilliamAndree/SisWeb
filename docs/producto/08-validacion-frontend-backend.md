# UX-01 — Validación de contratos frontend–backend

## Inventario y compatibilidad

| Superficie | Fuente backend | Consumo / conclusión |
| --- | --- | --- |
| Nueva | StoreAutoevaluacionRequest y rutas store/reevaluar | Mismas claves useForm y endpoints; booleanos nullable preservados. Se retira bloqueo cliente incompatible con null |
| Checklist | ChecklistProps, ApplicabilityEngineService y endpoints GET/POST checklist | Se conservan criterios, no_aplican, informacion_pendiente, tres respuestas permitidas, notas y contadores. Sin modificación del catálogo/motor |
| Resumen | ResumenProps y clasificación/desglose del controlador | Conteos recibidos y orden existente; cambia presentación, no cálculos persistidos ni cierre |
| Solicitar IA | POST evidencias/{id}/analizar | analisis_uuid y estado; se valida UUID antes del sondeo; no se solicita al abrir tarjeta |
| Consultar IA | GET analisis/{uuid}/estado | uuid_analisis/estado/resultado en raíz; el cliente deja de esperar data.analisis |
| Prop inicial IA | subsanarItems → items[].ultimo_analisis | uuid y resultado con alias de listas; mapeo propio, diferente del GET |
| Evidencias/subsanación | Endpoints privados y pruebas Fase 3C | Se conserva custodia/autorización, MIME y subida; el error de IA es contextual y no cambia declaración |
| Croquis | Controlador espacial y types existentes | Sin modificación del contrato ni versionado. Se corrige exclusivamente tipo de evento SVG; la suite espacial permanece en regresión |

Se inspeccionaron las proyecciones y tipos; esto no equivale a verificar exhaustivamente todas las pantallas del producto. El alcance visual inicial son cuatro pantallas, y los ajustes de IA resuelven incompatibilidades demostradas.

## Defectos demostrados y correcciones

1. El sondeo ignoraba un JSON válido por esperar data.analisis. adaptarAnalisis recibe fuente estado y lee uuid_analisis/estado/resultado de la raíz. No se cambió la API para satisfacer la expectativa errónea.
2. El panel esperaba elemento/estado_visual/detalle frente a element_name/visual_status/description; observaciones_visuales/no_observable/recomendaciones_captura se adaptan explícitamente. No observable/no determinable conserva su significado y no se transforma en cumplimiento o ausencia física. Calidad admite OPTIMA/ACEPTABLE/DEFICIENTE_*/ILEGIBLE y la incertidumbre BAJO/MEDIO/ALTO/MUY_ALTO. Los valores no informados no se convierten en favorables.
3. La prop inicial ya usa alias visual_observations/not_observable/photo_improvement_recommendations, pero el controlador los llenaba desde atributos inexistentes del modelo, y leía estado en lugar de estado_analisis. Las cuatro expresiones se corrigieron conservando esos alias para compatibilidad. No se tocaron columnas, enums ni autorización. raw_payload_salida continúa oculto y el adaptador no lo copia.
4. Los errores públicos usan mensaje/message y código HTTP, sin mostrar error técnico como explicación. 401/419 y 403 detienen el sondeo; incluso una página HTML de sesión vencida es tratada correctamente. Una petición en curso se aborta al desmontar. Los terminales COMPLETADO/REQUIERE_REVISION/FALLIDO detienen nuevas peticiones; límite de 30 consultas, reintento temporal sin solapamiento y UUID distinto rechazado.
5. Nueva impedía enviar null para características que Laravel declara nullable|boolean. La tercera opción conserva null en useForm y POST; false no se equipara con desconocido. La corrección es cliente, sin alterar aplicabilidad.
6. TypeScript detectó un manejador de clic limitado a SVGSVGElement, llamado también desde SVGGElement. Se generalizó a SVGElement, sin alterar el cálculo de coordenadas.

## Evidencia TDD y pruebas

ContratosFrontendUxTest usa BD real exclusivamente de testing y registros sintéticos, sin proveedor IA. Dataset COMPLETADO/REQUIERE_REVISION/EN_PROCESO compara props iniciales y GET real, listas persistidas y ocultamiento del payload privado.

- ROJO válido: 07-contrato-rojo-valido.txt/.junit.xml, tres fallos/33 aserciones: estado inicial null frente al valor persistido.
- VERDE: 08-contrato-verde-valido.txt/.junit.xml, tres aprobadas/69 aserciones tras las cuatro lecturas corregidas.
- Refactor/formato: Pint 35/35b satisfactorio; sin deshabilitar ni debilitar pruebas existentes.
- Regresión: 37-regresion-final.txt/.junit.xml, 706 aprobadas/4593 aserciones, cero fallos/errores.

04/06 contienen intentos preliminares con ruta de fixture equivocada (flujo legado en lugar de subsanar-items); no demuestran el defecto ni se cuentan como ROJO válido. Un error inicial de sintaxis del archivo de test fue corregido antes de la ejecución válida. Se corrigió el fixture contra la ruta real, no las expectativas para conseguir verde.

Los once tests Node de analisis-ia.test.mjs prueban adaptación raíz/prop inicial, listas faltantes, incertidumbre, mensajes públicos, tres terminales, 403, HTML 419, cancelación, secuencia pendiente→completado y UUID cruzado. No instalan harness ni dependen de Node con red externa; requieren soporte TS directo de Node 24, versión usada 24.19.0. El test Edge usa esbuild ya instalado como dependencia transitiva, sin cambiar package.json/lock.

## Navegador y payload

ux-browser.test.mjs compila las páginas reales con fixtures sintéticos y las sirve únicamente en loopback temporal. Edge headless ejecuta el React real; no inicia Laravel ni usa BD. El stub Inertia imita redirect de validación con errores compartidos, y el fetch de checklist simula fallo y éxito. No confundir esta integración frontend con un recorrido HTTP completo contra Laravel.

29-navegador.json conserva 16 observaciones de viewport y payloads: POST /autoevaluacion mantiene nombre/función y true/false/null según selección; el caso observado usa usa_glp=false y tiene_equipos_fritura=null. POST /autoevaluacion/demo/checklist envía respuestas[].codigo/estado/notas. Se verifica que el fallo de guardado no muestre éxito ni borre selección, y que el reintento confirmado sí anuncie guardado. REGISTRADA deshabilita radios y el resumen no ofrece cerrar otra vez.

La regresión backend comprueba las rutas reales por separado. No hay datos personales, fotos comerciales, tokens reales ni Gemini en los fixtures. HTTPS externo se bloquea en el navegador y las pruebas Laravel impiden HTTP no simulado. No se extrapola esta evidencia a disponibilidad/calidad del proveedor real.
