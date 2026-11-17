# UX-01 — Resultados de validación técnica

## Resultado verificable

| Comprobación | Resultado |
| --- | --- |
| Preflight final Laravel | testing/mysql/127.0.0.1:3307/sisweb_testing; cuenta restringida; recovery 0 |
| Storage/Cache/Session/Queue/HTTP | Storage temporal; array/array/sync; HTTP no simulado bloqueado |
| Pest completo serial | 706 aprobadas, 0 fallos, 0 errores, 0 omitidas; 4593 aserciones; 90.07 s consola |
| Comparación con Fase 3D | +3 casos Pest y +69 aserciones sobre 703/4524 |
| Tests frontend Node/Edge | 12 aprobados, 0 fallos: once de adaptador/sondeo y un recorrido compuesto Edge |
| TypeScript noEmit | Aprobado; se corrigió el error previo de evento SVG |
| ESLint archivos intervenidos | Aprobado, sin deshabilitar reglas |
| ESLint global resources/js | Pendiente: 27 errores previos, 0 warnings; baseline 45 errores/2 warnings |
| Vite build | Aprobado; assets regenerados |
| Pint dirty y test nuevo | Aprobados |

No sumar selecciones Pest parciales a la suite completa. No se midió cobertura. Las doce pruebas Node no son doce pruebas Pest ni incluyen doce recorridos backend. El resultado no procede de usuarios reales.

Preservación final: 619 archivos comparados con el respaldo, 604 intactos y 15 modificaciones previstas; cero cambios inesperados. Se conservaron .env, .env.testing, las guardas, todos los tests anteriores, docs/calidad y los seis documentos originales de producto. git diff --check terminó con código 0. La evidencia de regresión Pest corresponde al backend final; las últimas correcciones posteriores fueron de presentación/copy y se validaron nuevamente con TypeScript, lint, build y los doce tests frontend.

## Evidencias y reproducción

Evidencias en evidencias-ux01/. Comandos ejecutados desde la raíz del proyecto:

```powershell
php tests/preflight.php
php vendor/bin/pest tests/Feature/ContratosFrontendUxTest.php --compact --colors=never
php vendor/bin/pint --dirty --format agent
php vendor/bin/pint tests/Feature/ContratosFrontendUxTest.php --format agent
php vendor/bin/pest --compact --colors=never --fail-on-risky --log-junit=docs/producto/evidencias-ux01/37-regresion-final.junit.xml
./node_modules/.bin/tsc.cmd --noEmit
./node_modules/.bin/eslint.cmd <archivos-intervenidos> --no-fix
./node_modules/.bin/eslint.cmd resources/js --no-fix
npm run build
node --test tests/Frontend/analisis-ia.test.mjs tests/Frontend/ux-browser.test.mjs
```

No ejecutar Pest sin preflight seguro. No se utilizó npm run lint porque su script aplica --fix a todo el repositorio; se invocó ESLint en modo de lectura. El test de navegador requiere Edge instalado o UX_BROWSER con la ruta a un Chromium compatible; utiliza un perfil temporal aislado, servidor loopback y las dependencias existentes. No descarga navegadores ni instala paquetes.

Evidencias finales: 32-typescript-final.txt, 33-eslint-intervenidos.txt, 34-build-final.txt, 35/35b-pint*.txt, 36-preflight-final.txt, 37-regresion-final.txt/.junit.xml, 39-eslint-global.txt, 40-frontend-final.txt y 41-preservacion.json. Los TXT vacíos de TypeScript/ESLint intervenido corresponden a herramientas sin diagnósticos; los códigos de salida se consolidan en 42-resumen-final.json. Los demás logs conservan comprobaciones por pantalla y etapas intermedias; no todos representan el estado final.

## Revisión visual y de interacción

Edge headless con viewport CSS 320, 390, 768 y 1440 px; altura 960 y escala de dispositivo 1. Se comprobaron cuatro pantallas con datos sintéticos: un H1, ausencia de scroll horizontal del documento y controles del fixture con nombre asociado. Capturas actuales de Inicio, Datos, Condiciones y Resumen a 390/1440 px, junto con 29-navegador.json. Las capturas se revisaron como evidencia visual de las páginas renderizadas, no como pruebas de comprensión.

Se detectó y corrigió overflow de Resumen a 320 px: stepper heredado duplicado y cabecera auxiliar sin wrap. overflow.json conserva el diagnóstico intermedio; el recorrido final valida que no se reproduce. Se ejercitó teclado Espacio sobre radio, grupos del formulario, POST, recuperación de error de validación, guardado fallido/reintento y estados cerrados. No se simularon usuarios reales ni se midió tiempo de tarea. No hay capturas auténticas del navegador anteriores a la edición: el antes se preserva en el respaldo de fuentes, sin presentarlo como comparación visual medida.

## Matriz de aceptación: estado real

Implementado técnico significa que existe evidencia del caso indicado, no aprobación completa del criterio con usuarios/tecnología de apoyo.

| AC | Estado en UX-01 |
| --- | --- |
| 01 | Inventario y contratos documentados en 08; pendientes superficies fuera de estas páginas |
| 02–03 | Entrada sin cuenta, CTA y copy implementados; comprensión con personas pendiente |
| 04–07 | Login/registro, vinculación y panel fuera del rediseño inicial; regresión backend conservada |
| 08–09 | Grupos conservan memoria y payload false/null comprobado; no se añadió persistencia remota previa al POST |
| 10 | Stepper compartido nombrado y aria-current; lector de pantalla pendiente |
| 11 | Error/success de guardado y reintento comprobados con fetch simulado; validación inicial por Inertia comprobada |
| 12–14 | Tres opciones y datos del motor conservados; norma desplegable, teclado y progreso comprobados en fixture; combinaciones reales ampliadas pendientes |
| 15 | Resumen con origen y próxima acción implementados; estudio de comprensión pendiente |
| 16 | Solo lectura/cierre según estado conservados y regresión backend verde; no se afirma verificación de hash por mostrarlo |
| 17–19 | No se rediseñó la carga/historial; custodia/MIME respaldados por regresión previa, no por nueva evaluación visual |
| 20–21 | DTO, enums, listas ausentes y terminales simulados comprobados; no se mide precisión Gemini ni se muestra payload crudo |
| 22–23 | Croquis sin rediseño, salvo corrección de tipado; alternativa completa al arrastre pendiente |
| 24–28 | Historial, informes, anexos, directorio y perfil fuera de estas cuatro pantallas; no se atribuye aceptación UX por Pest |
| 29 | Foco, reflow y labels mejorados/comprobados en fixtures; auditoría completa de contraste, zoom, lector y modales pendiente |
| 30 | Panel empresarial fuera de alcance, sin implementación ni oferta pública nueva |

## Riesgos y continuidad

Antes de publicar, resolver el lint global pendiente: Navbar tiene dos errores de símbolos no usados, Dashboard cuatro y CroquisEditor veintiuno (no usados y any). Se conservó su código para no ampliar UX-01 a un refactor del editor o panel. Los archivos intervenidos no introducen nuevos errores de lint/tipos.

Faltan pruebas con participantes, lectores NVDA/VoiceOver, zoom 200/400%, impresión/documentos largos, dispositivos físicos, todos los modales y sesión real end-to-end. Los pares de colores de 03 orientaron los tokens; no se afirma auditoría completa WCAG. No hay analytics, mediciones de conversión o promesas de tiempo/certificación. Las referencias e importes normativos heredados no se actualizaron por motivos de diseño ni se certifica su vigencia aquí.

Continúan las limitaciones técnicas de Fase 3D: H05 concurrencia IA, H15 fallback contractual, H08 fixture histórico; importaciones espaciales sin metadata/hijos y ausencia de benchmark/concurrencia real. No se reparó el XAMPP original. La experiencia de invitado depende de su sesión autorizada; no se sustituyó por acceso basado en conocer un UUID.

La implementación de las cuatro pantallas y los contratos corregidos está preparada para revisión funcional y de accesibilidad posterior. No constituye liberación comercial ni aprobación de los treinta AC, y no inicia automáticamente el panel empresarial.
