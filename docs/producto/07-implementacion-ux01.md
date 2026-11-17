# UX-01 — Implementación incremental del MVP

## Alcance y preservación

Implementación local sobre feature/apoyo-calidad. Se leyeron la planificación de producto 01–06 y el cierre de calidad 26. Se preservaron las correcciones de Fases 2–3D y sus evidencias. No se iniciaron panel empresarial, Cypress, SonarQube, despliegue, commits ni push.

Antes de editar se revisaron estado, rama, diff e historial y se comprobaron los procesos activos. Se creó el respaldo C:\Users\USUARIO\Downloads\SisWeb\respaldo-ux01-20261116-220833, fuera del repositorio y del directorio público. Contiene 619 archivos relevantes rastreados/no rastreados, incluidos docs/calidad, docs/producto y configuración local, además de manifest.json SHA-256 verificado archivo por archivo, git-status.txt, git-log.txt y git-diff.patch. Contiene configuración privada: debe conservarse como respaldo local, no publicarse. La comparación final de preservación está en evidencias-ux01/41-preservacion.json.

No se aplicaron stashes ni restauraciones Git. Durante la implementación se reconstruyeron exclusivamente ediciones propias de Nueva/Checklist desde las copias verificadas para corregir errores intermedios de transformación/encoding; se conservaron los cambios anteriores a UX-01. No se sobrescribió .env ni .env.testing, ni se modificaron normas, migraciones o datos del XAMPP original. Los seis documentos de planificación y toda la documentación previa de calidad permanecen como antecedentes, sin reescribir sus resultados.

Versiones instaladas comprobadas: React 19.0.0, Inertia React 2.0.3, TypeScript 5.7.3 y Tailwind 4.0.8. Se aplicaron las guías locales inertia-react-development, tailwindcss-development, testing-best-practices y laravel-best-practices. No había .ai/rules ni herramienta search-docs disponible; se mantuvieron APIs ya presentes y se inspeccionaron contratos/código instalados. No se añadieron dependencias.

## Pantallas intervenidas

| Pantalla | Implementación | Validación |
| --- | --- | --- |
| Inicio | Hero sobrio, CTA Revisar mi local, retomar con cuenta, tres pasos y aviso preventivo junto a la propuesta. Retiro de promedio 3 min y garantías no medidas. Conserva estimador, ayudas, normativa y directorio | TypeScript/lint/build, petición raíz Pest y recorrido visual en Edge |
| Nueva autoevaluación | Tres grupos Tu local / Características / Revisar datos; mantiene useForm y un POST final. Volver conserva datos. Sí/No/Aún no lo sé emiten true/false/null. Resumen previo, errores y foco; estimación opcional desplegable | 10 pruebas de reglas existentes; navegador comprueba memoria, payload y retorno con error de validación |
| Checklist | Pregunta y respuestas ciudadanas prioritarias, referencia normativa desplegable, foco visible en opciones nativas y progreso denominado avance de respuestas. NO_APLICA sigue sin opción editable; contadores, reglas y guardado explícito conservados | 40 pruebas relacionadas; teclado, fallo/reintento de guardado y solo lectura en navegador |
| Resumen | Cabecera Según lo que declaraste, estado del proceso real, próxima acción y consulta de respuestas. Clasificación/hash en detalle secundario; no se presenta APTO PARA ITSE como conclusión. Contadores descriptivos y copy sin garantía de clausura/aprobación | 19 pruebas relacionadas; responsive, registro cerrado y ausencia del botón de cierre en fixture cerrado |

Se implementaron y comprobaron progresivamente. Errores transitorios de sintaxis/lint de las ediciones se corrigieron antes del cierre; la compilación Vite por sí sola no sustituye TypeScript. Los logs finales identificados en 09 son la evidencia válida del estado entregado.

## Sistema visual

El token primary ahora usa #047857 y hover #065F46, con escala verde coherente. Texto principal #0F172A, secundario #475569, controles #64748B y foco #1D4ED8. Se mantienen modo claro, tipografía sans/fallback existente, radios de controles 12 px y superficies 16 px. Los botones compartidos admiten texto multilínea y altura mínima cómoda. Success/warning/info sólidos con texto blanco se oscurecieron para mejorar contraste; los colores no recalculan riesgos ni aplicabilidad.

Nuevo componente Evaluacion/FlujoCiudadano reutiliza los tres pasos nombrados, aria-current y estado actual; AvisoPreventivo comunica origen y límites. Se conservaron las primitivas existentes. AppLayout ajusta padding móvil, conserva el salto al contenido y no duplica el footer. Se respetan preferencias de movimiento reducido. El layout del diagnóstico auxiliar se flexibilizó al detectar un desbordamiento real a 320 px; no se ocultó mediante overflow global.

No se acredita conformidad WCAG por estos cambios. Los componentes heredados conservan partes densas y algunos textos pequeños; revisar especialmente ayudas, cuadros técnicos, impresión y modales en una siguiente revisión de accesibilidad. No se reactivó modo oscuro ni se descargaron fuentes.

## Compatibilidad corregida

UX-01/02/11 de la auditoría: adaptador tipado para la raíz JSON de estado y otro mapeo explícito para la prop inicial; enums reales, elementos y listas preservados; sondeo secuencial, cancelación al desmontar, terminales y mensajes inline públicos. La carga inicial Laravel leía cuatro atributos inexistentes: se corrigieron esas lecturas sin cambiar las claves públicas, reglas o estructura persistida. Se documenta el TDD en 08.

La incompatibilidad adicional de Nueva era exigir cuatro booleanos no nulos en cliente cuando Laravel acepta null. Se retiró esa obligación exclusivamente del cliente; no se cambió validación backend ni motor de aplicabilidad. El payload observado incluye usa_glp=false y tiene_equipos_fritura=null. El checklist sigue obteniendo aplicabilidad del servidor.

Se corrigió el tipo del evento del clic SVG de SVGSVGElement a SVGElement porque el mismo manejador también recibe clics de SVGGElement; conserva la fórmula y comportamiento de coordenadas. Se retiraron imports/setter no usados en los archivos intervenidos. No se rediseñó el editor de croquis.

## Archivos de código

Existentes modificados por UX-01:

- app/Http/Controllers/EvaluacionController.php: cuatro lecturas del DTO inicial de IA.
- resources/css/app.css: tokens y foco/movimiento reducido.
- resources/js/pages/Evaluacion/Home.tsx, Nueva.tsx, Checklist.tsx y Resumen.tsx.
- resources/js/pages/Evaluacion/components/ResumenHeader.tsx.
- resources/js/pages/Evaluacion/SubsanacionDirecta.tsx: consumo de DTO, sondeo y errores IA.
- resources/js/components/Evaluacion/PanelResultadoAnalisisIA.tsx y DiagnosticoMultidimensional.tsx.
- resources/js/components/Espacio/PlanoEditor2D.tsx: tipo de evento y limpieza sin cambio de comportamiento.
- resources/js/components/RegistrarLocalButton.tsx, shared/CryptoSealBadge.tsx y ui/button.tsx.
- resources/js/layouts/AppLayout.tsx.

Nuevos: resources/js/lib/analisis-ia.ts; resources/js/components/Evaluacion/FlujoCiudadano.tsx; tests/Feature/ContratosFrontendUxTest.php; tests/Frontend/analisis-ia.test.mjs; tests/Frontend/ux-browser-fixture.tsx; tests/Frontend/ux-browser.test.mjs. Documentación nueva: 07–09 y evidencias-ux01. Los assets public/build se regeneraron mediante Vite. El listado Git global contiene también trabajo de fases anteriores; no atribuirlo íntegramente a UX-01.

## Límites de entrega

Las cuatro pantallas quedan implementadas y validadas con los casos técnicos registrados. El lint global sigue fallando por 27 errores preexistentes en Navbar, Dashboard y CroquisEditor, fuera de esta intervención; no se presenta como gate global aprobado. No hubo usuarios reales, auditoría WCAG completa, lectores de pantalla, pruebas exhaustivas de modales/impresión ni despliegue. El avance técnico no autoriza declarar listo el producto comercial completo ni los 30 AC aprobados. No se inició panel empresarial.
