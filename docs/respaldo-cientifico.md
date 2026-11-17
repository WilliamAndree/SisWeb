# Respaldo científico y normativo

CheckITSE se sustenta en la normativa peruana de ITSE y en investigaciones revisadas por pares. Este documento es la evidencia académica del proyecto: muestra de qué fuente salió cada decisión de diseño y de negocio. **No se publica dentro de la aplicación**; la web solo muestra al usuario datos prácticos (plazos, costo, vigencia), citando el artículo de la norma.

Los documentos originales están en la carpeta compartida de Drive del proyecto. Los datos de cita se tomaron de la primera página de cada PDF.

## Datos que muestra la web y su fuente

| Dato en la portada | Fuente verificada |
| --- | --- |
| Inspección en máximo 7 días hábiles y trámite en 9 (riesgo bajo o medio) | D.S. N° 002-2018-PCM, art. 21 |
| Inspección en máximo 5 días hábiles y trámite en 7 (riesgo alto o muy alto) | D.S. N° 002-2018-PCM, art. 26 |
| La ITSE va incluida en el derecho de licencia de funcionamiento | D.S. N° 002-2018-PCM, art. 6.1 |
| Vigencia de 2 años | D.S. N° 002-2018-PCM, art. 15.4 |
| Renovación: solicitud, tasa y declaración jurada; con riesgo bajo o medio se entrega el certificado renovado y la inspección es posterior | D.S. N° 002-2018-PCM, arts. 24 y 29 |
| S/ 698.10 por la ITSE de un local de riesgo alto en Huancayo y 41 días para obtener ITSE y licencia | Banco Mundial, *Doing Business en el Perú 2020*, perfil de Huancayo (datos al 1 de mayo de 2019) |

El texto oficial del decreto se consultó en el portal de CENEPRED: http://www.cenepred.gob.pe/web/transparencia/resoluciones/ministeriales/DS-002-2018-PCM.pdf. El perfil de Doing Business está en https://subnational.doingbusiness.org/content/dam/doingBusiness/subnational-profiles/es/peru-huancayo.pdf. Los montos cambian según el TUPA vigente de cada municipalidad.

## Normativa

| Documento | Uso en CheckITSE |
| --- | --- |
| D.S. N° 002-2018-PCM, Nuevo Reglamento de ITSE | Define cuándo la ITSE es previa o posterior a la licencia |
| R.J. N° 016-2018-CENEPRED/J, Manual de Ejecución de ITSE | Matriz de Riesgos. Umbrales del clasificador: comercio de hasta 3 pisos y 750 m²; GLP mayor a 0,45 m³ (118,18 gal) o caldero como agravantes |
| Anexos 1, 2, 3, 4, 11, 12, 16 y 17 del Manual | Formatos oficiales. El Anexo 4 (declaración jurada) se prellena y el Anexo 12 guía la subsanación |
| Ley N° 30619 (modifica la Ley N° 28976) | Vigencia de 2 años del certificado ITSE |
| Reglamento Nacional de Edificaciones (A.130, G.040) | Requisitos de evacuación y seguridad, y definición de "piso" |
| Programa Presupuestal 0068 (D.U. N° 024-2010) | Marco de prevención y reducción de la vulnerabilidad |

El archivo "Reglamento de Inspecciones Técnicas de Seguridad en Edificaciones" de la carpeta describe el régimen anterior (ITSE Básica ex post para locales de hasta 100 m²). Se conserva como antecedente; el clasificador aplica el régimen vigente del Manual CENEPRED 2018.

## Artículos científicos

| Cita | DOI | Módulo que sustenta |
| --- | --- | --- |
| Terzi, A. F., Aksu, K., Koçyiğit, A. y Demirel, H. (2025). A BIM-Based Multi-Criteria Spatial Framework for Assessing Fire Risks in Indoor Environments. *Fire, 8*(9), 361. | [10.3390/fire8090361](https://doi.org/10.3390/fire8090361) | Croquis y análisis espacial multicriterio |
| Bai, J., Lv, X., Nie, L. y Fang, M. (2025). Evacuation Route Determination in Indoor Architectural Environments Based on Dynamic Fire Risk Assessment. *Buildings, 15*(10), 1715. | [10.3390/buildings15101715](https://doi.org/10.3390/buildings15101715) | Conectividad de rutas de evacuación (grafo, A*) |
| Yan, S., Wu, C. y Zhang, Y. (2025). Generative design for architectural spatial layouts: a review of technical approaches. *JAABE, 25*(4), 2775–2795. | [10.1080/13467581.2025.2512235](https://doi.org/10.1080/13467581.2025.2512235) | Sugerencias espaciales del croquis |
| Zhang, D., Zhang, J., Xiong, H., Cui, Z. y Lu, D. (2019). Taking Advantage of Collective Intelligence and BIM-Based Virtual Reality in Fire Safety Inspection for Commercial and Public Buildings. *Applied Sciences, 9*(23), 5068. | [10.3390/app9235068](https://doi.org/10.3390/app9235068) | Autoevaluación ciudadana y checklist genérico |
| Khan, N., Lee, D., Baek, C. y Park, C. (2020). Converging Technologies for Safety Planning and Inspection Information System of Portable Firefighting Equipment. *IEEE Access*. | [10.1109/ACCESS.2020.3039512](https://doi.org/10.1109/ACCESS.2020.3039512) | Evidencias fotográficas con IA |
| Hamida, M. B. y Hassanain, M. A. (2019). Fire Safety in the Built-Environment: A Case Study in a Residential Facility. *Architecture Civil Engineering Environment*, (2). | [10.21307/ACEE-2019-020](https://doi.org/10.21307/ACEE-2019-020) | Checklist estandarizado |

## Tesis y antecedentes

| Cita | Módulo que sustenta |
| --- | --- |
| Cruz Poma, M. (2021). *Inspecciones técnicas de seguridad en las edificaciones: estudio de caso en el distrito de Santa Rosa de Quives 2019-2020* (tesis de maestría en Gestión Pública). Lima. | Contexto del trámite municipal |
| Tello Sánchez, C. (2014). *Desarrollo de un sistema virtual de autoevaluación para la carrera profesional de Enfermería de la UNAP* (informe de suficiencia). Universidad Nacional de la Amazonía Peruana. | Enfoque de autoevaluación guiada |
| Calla Charrez, G. J. (2020). *Implementación del sistema de gestión de seguridad basado en la Ley N° 29783 en la empresa Qoryayllu S.R.L. Cusco - 2019* (tesis). Universidad Nacional del Altiplano. | Ciclo de diagnóstico, plan y seguimiento de la subsanación |

## Coherencia entre norma y código

El clasificador de modalidad tiene una sola regla, implementada en `ItseRiskService::clasificarTramite()` (servidor) y replicada sin cambios en `resources/js/lib/clasificacion-itse.ts` para dar respuesta inmediata en el navegador. `tests/Frontend/clasificacion-itse.test.mjs` fija los mismos casos límite que el servidor. Si cambia la norma, se actualizan primero el servicio PHP y luego el espejo y su prueba.
