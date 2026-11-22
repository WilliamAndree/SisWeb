# Prompt para generar el informe técnico grupal (copiar y pegar en Claude)

> **Cómo usarlo:** en claude.ai crea una conversación nueva, adjunta **todos los archivos de esta carpeta**
> (este prompt, `01-DATOS-VERIFICADOS.md`, `02-CODIGO-CLAVE.md`, la guía del docente `Guía Práctica GRUPAL de Arquitectura.docx`
> y las imágenes de `figuras/` y `evidencias/`). Luego pega el texto de abajo, desde «Eres…» hasta el final.
> Antes de enviarlo, **reemplaza los datos entre corchetes** (nombres, códigos, docente, sección).

---

Eres redactor técnico de informes universitarios de ingeniería de software. Debes redactar en español (Perú) el **Informe técnico grupal** de la *Guía de práctica grupal: Arquitectura de software, integración tecnológica, automatización de pruebas y reportes de impacto* (asignatura **Pruebas y Calidad de Software**), sobre nuestro proyecto **CheckITSE Huancayo**.

## Datos de la portada

- Universidad: [Universidad Continental]
- Facultad / Escuela: [Ingeniería de Sistemas e Informática]
- Asignatura: Pruebas y Calidad de Software — Sección [NRC/sección]
- Docente: [Nombre del docente]
- Integrantes (3): [Integrante 1 — código], [Integrante 2 — código], [Integrante 3 — código]
- Lugar y fecha: Huancayo, [fecha de entrega]

## Reglas obligatorias

1. **Usa solo la información de los archivos adjuntos.** Cada cifra (pruebas, cobertura, métricas, tiempos, versiones, indicadores) debe salir de `01-DATOS-VERIFICADOS.md`. **No inventes datos, nombres, URLs ni resultados.** Si algo no está en los archivos, escribe «[completar]» en lugar de suponerlo.
2. Respeta **exactamente** la estructura de la sección VI de la guía (ver abajo) y responde **todas** las preguntas que la guía plantea en cada actividad (están listadas en `01-DATOS-VERIFICADOS.md` con su respuesta).
3. Distingue siempre entre **resultados medidos** y **beneficios esperados**. Los reportes de impacto usan **datos de demostración** (código DEMO-, generados con el propio motor del sistema) más los registros reales disponibles; dilo explícitamente, como lo indica el archivo de datos. No presentes los datos de demostración como si fueran de usuarios reales.
4. Inserta las figuras con su número y título, en el lugar indicado en `01-DATOS-VERIFICADOS.md` (sección «Índice de figuras»). Usa el nombre de archivo para identificarlas. Cada figura lleva una línea de fuente: «Fuente: elaboración propia» o «Fuente: captura del sistema CheckITSE».
5. Las tablas que pide la guía (tecnologías, características del servidor, etapas del pipeline, escenarios de Cypress, métricas de SonarQube, APIs, indicadores) deben aparecer **completas** con los datos del archivo.
6. Estilo: formal, claro, impersonal o en primera persona del plural («implementamos»), párrafos cortos, sin relleno ni frases de marketing. Normas APA 7 para citas y referencias (las referencias están en el archivo de datos).
7. Entrega el informe como **documento Word (.docx)** con: portada, índice general, índice de figuras, índice de tablas, títulos numerados (1, 1.1, 1.1.1), numeración de páginas, fuente Arial 11 o Calibri 11, interlineado 1.5, márgenes de 2.5 cm, y los anexos al final.

## Estructura obligatoria (sección VI de la guía)

1. Portada e identificación de los tres integrantes.
2. Descripción general del proyecto existente (problema, usuarios, módulos, estado previo a esta práctica).
3. Arquitectura de software (Actividad 1: 1.1 arquitectura actual, 1.2 adaptación y propuesta, 1.3 diagrama + tabla de APIs + ajustes realizados).
4. Arquitectura tecnológica (Actividad 2: 2.1 tabla de tecnologías, 2.5 diagrama).
5. Análisis y adaptación al servidor disponible (2.2 tabla de características del servidor, 2.3 justificación de la adaptación).
6. Diseño e implementación de pipelines (2.4 tabla de etapas, dónde se ejecuta cada una y por qué; evidencia de despliegue).
7. Integración y automatización de pruebas con Cypress (Actividad 3: 3.1 integración, 3.2 los 8 escenarios con la ficha completa de cada uno, 3.3 resultados, 3.4 integración con el pipeline).
8. Integración y análisis de calidad con SonarQube (Actividad 4: 4.1 configuración, 4.2 integración, 4.3 tabla de métricas, 4.4 respuestas a las 6 preguntas).
9. Implementación del módulo de reportes (Actividad 5: 5.1 indicadores, 5.2 módulo implementado con filtros, gráficos y tablas).
10. Análisis del impacto funcional (5.3: respuestas a las 6 preguntas, comparación antes/después, beneficios medidos vs. esperados).
11. Organización del trabajo grupal (tabla de la sección V con los nombres de los integrantes).
12. Conclusiones (5 a 7, concretas y medibles, una por actividad como mínimo).
13. Recomendaciones (3 a 5).
14. Referencias (APA 7).
15. Anexos y evidencias (capturas de `evidencias/`, fragmentos de código de `02-CODIGO-CLAVE.md`, enlace al repositorio).

## Antes de terminar, verifica

- Que cada número del informe coincida con `01-DATOS-VERIFICADOS.md`.
- Que estén respondidas todas las preguntas de las actividades 4.4 y 5.3.
- Que cada actividad tenga sus evidencias (figura o anexo) según la lista «Evidencias» de la guía.
- Que la rúbrica (sección VII) quede cubierta: el archivo de datos incluye una tabla «Cómo cubre el proyecto cada criterio de la rúbrica»; úsala como lista de control, **no la copies en el informe**.

Si algún dato no está o es ambiguo, **pregunta antes de inventarlo**.
