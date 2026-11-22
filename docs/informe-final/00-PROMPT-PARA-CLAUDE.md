# Prompt para generar el informe final con Claude (claude.ai)

## Antes de pegar el prompt (2 minutos)

1. En claude.ai → **Configuración → Funciones** (Capacidades), activa **«Creación y edición de archivos» / ejecución de código**.
   Sin eso Claude no puede abrir el zip ni entregar el .docx.
2. Abre una **conversación nueva** y adjunta **`Materiales-Informe-Final.zip`** (contiene esta carpeta completa + la guía del docente).
3. Copia el prompt de abajo (desde «Eres…» hasta el final) y **llena el bloque «DATOS DEL EQUIPO»**. Si dejas algún
   dato como `[completar]`, Claude te lo preguntará antes de redactar.
4. Envíalo. Si Claude se corta por longitud, escribe: «continúa exactamente donde te quedaste».

---

Eres un redactor técnico experto en informes universitarios de Ingeniería de Sistemas, con dominio de arquitectura de
software, CI/CD, pruebas automatizadas (Cypress), calidad de código (SonarQube) y normas APA 7. Vas a elaborar el
**Informe técnico grupal** de la *Guía de práctica grupal: Arquitectura de software, integración tecnológica,
automatización de pruebas y reportes de impacto* (asignatura **Pruebas y Calidad de Software**) sobre nuestro proyecto
**CheckITSE Huancayo**, más sus matrices en Excel y un guion de sustentación.

## DATOS DEL EQUIPO (llenar)

- Universidad: [completar]
- Facultad / Escuela profesional: [completar]
- Asignatura y sección/NRC: Pruebas y Calidad de Software — [completar]
- Docente: [completar]
- Integrante 1 (nombre completo — código) — rol: Arquitectura y tecnologías: [completar]
- Integrante 2 (nombre completo — código) — rol: Automatización y calidad: [completar]
- Integrante 3 (nombre completo — código) — rol: Reportes e integración: [completar]
- Ciudad y fecha de entrega: Huancayo, [completar]

## Archivos que te entrego (dentro del zip adjunto)

- `01-DATOS-VERIFICADOS.md` → **única fuente de verdad** de todas las cifras, tablas, fichas, respuestas, matrices,
  índice de figuras, referencias y recomendaciones.
- `02-CODIGO-CLAVE.md` → código real del repositorio (para anexos y fragmentos cortos en el cuerpo).
- `Guía Práctica GRUPAL de Arquitectura.docx` → la guía del docente (estructura, preguntas y rúbrica).
- `figuras/` (diagramas D1, D2, D3) y `evidencias/` (capturas de la app, Cypress, GitHub Actions, SonarQube, JSON,
  logs y la matriz de monitoreo en `evidencias/matriz-monitoreo/`).

## Paso 1 — Preparación (antes de escribir)

1. Descomprime el zip y **lista** los archivos encontrados. Lee completos `01-DATOS-VERIFICADOS.md` y la guía.
2. Verifica que existan todas las imágenes del «Índice de figuras» (sección 9 del archivo de datos). Si falta alguna,
   avísame y continúa sin inventarla.
3. Si algún dato del bloque «DATOS DEL EQUIPO» dice `[completar]`, **pregúntamelo y espera mi respuesta** antes de generar.

## Paso 2 — Reglas de contenido (obligatorias)

1. **Cero invención.** Toda cifra, versión, nombre de archivo, URL, resultado o tiempo debe salir de los archivos.
   Si algo no está, escribe «[completar]» y avísame al final. No redondees ni cambies cifras.
2. **Datos reales vs. demostración:** el módulo de reportes tiene 1 evaluación real y 42 de demostración (código
   DEMO-, generadas con el propio motor del sistema). Dilo explícitamente donde presentes cifras de reportes y
   **separa siempre resultados medidos de beneficios esperados**, como en la sección 6 del archivo de datos.
3. **Honestidad técnica:** explica las restricciones reales del servidor (sin IP pública → despliegue por *pull* con
   puerta de CI; SonarQube en Docker local porque el job de CI necesita un servidor accesible; tareas de fondo sin cron
   resueltas con el Programador de tareas). No afirmes que algo corre donde no corre.
4. Responde **todas** las preguntas de 4.4 y 5.3 de la guía, con el texto de la pregunta como subtítulo.
5. Las tablas que pide la guía van **completas**: tecnologías, servidor, etapas del pipeline (con «dónde se ejecuta y
   por qué»), las 8 fichas de Cypress (una tabla Campo/Descripción de 8 filas por escenario), resultados de Cypress,
   métricas de SonarQube con interpretación, tabla de APIs, indicadores y organización grupal.
6. Estilo: español formal (Perú), primera persona del plural («implementamos»), párrafos de 3 a 6 líneas, sin frases
   de marketing ni relleno. Cada sección empieza con 1–2 líneas que digan qué contiene y remite a su evidencia
   («ver Figura N»).
7. Citas y referencias en **APA 7** (usa las de la sección «Referencias» del archivo de datos; cita en el texto al menos
   Cypress, SonarQube, Laravel, GitHub Actions y el D.S. 002-2018-PCM).

## Paso 3 — Estructura del informe (sección VI de la guía, en este orden)

- Portada (universidad, facultad, asignatura, sección, título del informe, proyecto, docente, los 3 integrantes con
  código, ciudad y fecha) · Índice general · Índice de figuras · Índice de tablas
1. Descripción general del proyecto existente (problema, usuarios, módulos, estado antes de la práctica).
2. Arquitectura de software (1.1 actual · 1.2 adaptación y ajustes · 1.3 diagrama D1 + D3 + tabla de APIs).
3. Arquitectura tecnológica (2.1 tabla de tecnologías · 2.5 diagrama D2).
4. Análisis y adaptación al servidor disponible (2.2 tabla del servidor · 2.3 justificación, incluidas las tareas de fondo).
5. Diseño e implementación de pipelines (2.4 tabla de 7 etapas · puerta de calidad · evidencia del despliegue con el
   extracto del registro · duraciones · figuras G-01, G-02, A-01, A-02 y E2E-00 del despliegue).
6. Integración y automatización de pruebas con Cypress (3.1 · 3.2 fichas · 3.3 resultados + errores encontrados y
   corregidos · 3.4 integración con el pipeline · matriz M-2).
7. Integración y análisis de calidad con SonarQube (4.1 · 4.2 · 4.3 tabla de métricas · detalle de code smells ·
   4.4 respuestas · figuras S-00 a S-04).
8. Implementación del módulo de reportes (5.1 indicadores con su fórmula · 5.2 módulo: filtros, gráficos, tablas, CSV,
   pruebas · cifras · figuras R-01 a R-05).
9. Análisis del impacto funcional (5.3: 6 respuestas · comparación antes/después · tabla medido vs. esperado).
10. Organización del trabajo grupal (tabla de la sección V con los nombres reales + matriz RACI M-3).
11. Conclusiones: 6, una por actividad + una general, cada una con un dato medible.
12. Recomendaciones: las 5 de la sección «Recomendaciones sugeridas».
13. Referencias (APA 7, orden alfabético, sangría francesa).
14. Anexos: A) matriz de trazabilidad M-1 · B) matriz de control y monitoreo M-4 · C) fragmentos de código de
    `02-CODIGO-CLAVE.md` (cypress.config.ts, un escenario, tests.yml, desplegar-xampp.ps1, tareas-xampp.ps1,
    ReportesImpactoService; recorta a lo esencial, máximo ~40 líneas cada uno, con el nombre del archivo) · D) enlaces
    al repositorio y al run del pipeline · E) capturas restantes del índice de figuras.

## Paso 4 — Formato del .docx (genéralo con código, p. ej. python-docx)

- A4, márgenes 2.5 cm, Arial 11 (títulos en negrita: nivel 1 14 pt, nivel 2 12 pt, nivel 3 11 pt), interlineado 1.5,
  texto justificado.
- Títulos con estilos «Heading 1/2/3» numerados (1, 1.1, 1.1.1); inserta el **índice automático** (campo TOC) y los
  índices de figuras y tablas (campos TOC \c "Figura" / "Tabla"). Indica en tu respuesta que en Word se actualizan con
  clic derecho → «Actualizar campos».
- Portada sin número; numeración de página en el pie desde la descripción del proyecto.
- **Figuras:** inserta las imágenes reales del zip (ancho 15–16 cm; las capturas muy altas, a 12 cm), centradas, con
  leyenda debajo «Figura N. Título» y «Fuente: elaboración propia» (D1–D3) o «Fuente: captura del sistema CheckITSE /
  GitHub / SonarQube».
- **Tablas:** con bordes, encabezado sombreado y repetido en cada página, leyenda arriba «Tabla N. Título» y fuente
  debajo. Ninguna tabla debe salirse del margen (ajusta anchos; usa 9–10 pt en tablas grandes).
- Fragmentos de código en Consolas 9 pt con fondo gris claro.

## Paso 5 — Entregables (archivos descargables)

1. **`Informe_Final_CheckITSE_Huancayo.docx`** — el informe completo.
2. **`Matrices_CheckITSE_Huancayo.xlsx`** — una hoja por matriz, encabezados en negrita, filtros y anchos ajustados:
   «M1 Trazabilidad», «M2 Cobertura Cypress», «M3 RACI», «M4 Control y monitoreo» (copia exacta de
   `evidencias/matriz-monitoreo/matriz-monitoreo.md`), «Fichas Cypress» (8 filas × 8 campos), «Métricas SonarQube» e
   «Indicadores de impacto» (tabla de 6.3 con columnas Todos / Reales / Demostración).
3. **`Guion_Sustentacion.docx`** (2–3 páginas) — qué explica cada integrante según su rol y en qué orden, qué mostrar
   en vivo (pipeline en GitHub, `/admin/reportes`, panel de SonarQube, una corrida de Cypress) y 8 preguntas probables
   del docente con respuesta corta basada en los datos.

## Paso 6 — Control de calidad (antes de entregar)

Revisa y reporta al final, en una lista breve:
- Cada cifra coincide con `01-DATOS-VERIFICADOS.md` (verifica al menos: Cypress 10/10 en 247.3 s; total de pruebas PHP;
  Quality Gate, cobertura, code smells y duplicación de la sección 5.3; 43 locales y 74.4 % → 88.9 %; 1 real vs. 42 demo).
- Las 6 preguntas de 4.4 y las 6 de 5.3 están respondidas.
- Cada actividad tiene las evidencias que pide la guía (usa la matriz M-1).
- Todas las figuras y tablas están numeradas, citadas en el texto y en los índices.
- No quedó ningún «[completar]» (o lista cuáles quedaron).
- Los 5 criterios de la rúbrica (sección VII de la guía) están cubiertos; la tabla «Cómo cubre el proyecto cada
  criterio» del archivo de datos es solo una lista de control (no la copies en el informe).
