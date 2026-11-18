# Material para el informe de investigación

Insumos verificados para redactar el informe (formato final, estado del arte, libro de prompts y matriz de monitoreo) de **CheckITSE Huancayo**. Todo lo que aparece aquí existe en el código y fue comprobado con pruebas.

- Repositorio: <https://github.com/WilliamAndree/SisWeb> (rama `main`).
- Figuras: carpeta [figuras/](figuras/). Los diagramas están en PNG (para Word) y en SVG (editables, se ven nítidos a cualquier tamaño).

## 1. Alcance: mapa de macroprocesos

El sistema se limita a un problema: **que el emprendedor de Huancayo llegue preparado a su Inspección Técnica de Seguridad en Edificaciones (ITSE)**. Todo lo construido se ordena en 13 procesos agrupados en tres niveles (ver Figura 2).

### 1.1 Procesos estratégicos

| Código | Macroproceso | Objetivo | Evidencia en el sistema |
| --- | --- | --- | --- |
| E1 | Modelo de negocio y planes | Sostener la plataforma con planes para proveedores (Básico gratis, Destacado S/ 49, Premium S/ 99; descuentos de 10 % y 20 % por 3 y 12 meses) | `backend/config/aliados.php` · `DirectorioPlanesTest` · [modelo-de-negocio.md](../modelo-de-negocio.md) |
| E2 | Calidad y mejora continua | Asegurar que cada cambio funcione y sea mantenible | 755 pruebas Pest + 30 de navegador · SonarQube · [pruebas.md](../pruebas.md) |

### 1.2 Procesos misionales (cadena de valor del emprendedor)

| Código | Macroproceso | Procesos que lo componen | Actor | Pantalla (ruta) | Pruebas que lo respaldan |
| --- | --- | --- | --- | --- | --- |
| M1 | Registro del local | Datos del establecimiento, giro, aforo y características declaradas | Emprendedor | Datos del local (`autoevaluacion.nueva`) | `Paso1DatosEstablecimientoTest`, `PortadaYCapturaInicialTest` |
| M2 | Autoevaluación ITSE | Determinar condiciones aplicables, declarar cada una y clasificar el riesgo | Emprendedor | Condiciones (`autoevaluacion.checklist`) | `ChecklistDinamicoEndpointTest`, `AutoevaluacionReglasTddTest`, `ApplicabilityEngineServiceTest`, `ItseRiskServiceTest` |
| M3 | Resultado y plan de mejora | Calcular % listo, separar lo que falta y lo que hay que revisar, y orientar qué hacer | Emprendedor | Resumen (`autoevaluacion.resumen`) | `ResumenDescriptivoTest`, `ClasificacionTramiteResumenTest` |
| M4 | Subsanación | Mostrar proveedores con precio de la zona, contactarlos por WhatsApp y declarar lo resuelto con evidencia | Emprendedor y proveedor | Lo que te falta (`autoevaluacion.subsanar_items`) | `SubsanacionDirectaTest`, `SubsanacionEvidenciasTest`, `EstadisticasYVentasProveedorTest` |
| M5 | Expediente digital | Reunir los documentos del trámite e imprimir el informe preventivo | Emprendedor | Expediente (`autoevaluacion.expediente_digital`) | `ExpedienteDigitalTest`, `InformePreventivoTest` |
| M6 | Seguimiento | Panel de locales, reevaluación, historial y eliminación de registros antiguos | Emprendedor | Mi panel (`dashboard`) | `DashboardYPerfilCiudadanoTest`, `ReevaluacionTest`, `HistorialAutoevaluacionesTest`, `EliminarRegistroTest` |

### 1.3 Procesos de soporte

| Código | Macroproceso | Procesos que lo componen | Actor | Pantalla (ruta) | Pruebas que lo respaldan |
| --- | --- | --- | --- | --- | --- |
| S1 | Cuentas y accesos | Registro con tipo de cuenta (emprendedor o proveedor), inicio de sesión, administradores solo por comando | Todos | Login y registro (`login`, `register`) | `HybridIdentityTest`, `AutorizacionRutasUuidTest`, `CuentasProveedorTest` |
| S2 | Gestión de proveedores | Perfil del negocio con mapa, catálogo con filtros, ventas y estadísticas de visitas y contactos | Proveedor | Cuenta de proveedor (`proveedor.*`) | `CuentasProveedorTest`, `EstadisticasYVentasProveedorTest` |
| S3 | Cobros de planes | Elegir plan y duración, pagar por Yape/Plin, subir comprobante | Proveedor | Mi plan (`proveedor.plan`) | `PlanesYAdministracionTest` |
| S4 | Administración y monitoreo | Aprobar negocios y pagos, ingresos por mes, vencimientos y recordatorio por WhatsApp | Administrador | Administración (`admin.panel`) | `PlanesYAdministracionTest` |
| S5 | Plataforma y datos | Seguridad de rutas por UUID, evidencias privadas, sello de integridad SHA-256, despliegue | Sistema | Transversal | `AutoevaluacionIntegridadCicloVidaTest`, `IntegridadEvaluacionServiceTest`, `EvidenciasSeguridadTddTest` |

**Fuera de alcance:** el sistema no emite certificados ni reemplaza la inspección municipal; es una simulación preventiva basada en lo que declara el emprendedor.

## 2. Lista de figuras

Fuente de todas: elaboración propia. Las capturas 4 a 19 son del sistema con **datos de demostración**.

| N.° | Título sugerido | Archivo | Dónde usarla |
| --- | --- | --- | --- |
| 1 | Arquitectura de CheckITSE Huancayo | `fig-01-arquitectura.png` | Diseño del sistema / arquitectura |
| 2 | Mapa de macroprocesos | `fig-02-mapa-de-procesos.png` | Alcance y metodología |
| 3 | Flujo entre actores (diagrama de carriles) | `fig-03-flujo-entre-actores.png` | Funcionamiento del sistema |
| 4 | Portada del sistema | `fig-04-portada.png` | Presentación del producto |
| 5 | Registro con tipo de cuenta | `fig-05-registro-de-cuenta.png` | S1 Cuentas y accesos |
| 6 | Registro de datos del local | `fig-06-m1-registro-del-local.png` | M1 |
| 7 | Autoevaluación de condiciones | `fig-07-m2-autoevaluacion.png` | M2 |
| 8 | Resultado: % listo y contadores | `fig-08-m3-resultado.png` | M3 |
| 9 | "Lo que te falta" con proveedores y WhatsApp | `fig-09-m4-lo-que-te-falta.png` | M4 |
| 10 | Expediente digital | `fig-10-m5-expediente-digital.png` | M5 |
| 11 | Mi panel del emprendedor | `fig-11-m6-mi-panel.png` | M6 |
| 12 | Directorio de aliados técnicos | `fig-12-directorio-de-aliados.png` | M4 / E1 |
| 13 | Resumen del proveedor con estadísticas | `fig-13-s2-proveedor-resumen.png` | S2 |
| 14 | Catálogo del proveedor con filtros | `fig-14-s2-proveedor-productos.png` | S2 |
| 15 | Registro de ventas del proveedor | `fig-15-s2-proveedor-ventas.png` | S2 |
| 16 | Planes y precios | `fig-16-s3-planes.png` | S3 / E1 |
| 17 | Panel de administración | `fig-17-s4-administracion.png` | S4 |
| 18 | Vista móvil del resultado | `fig-18-movil-resultado.png` | Diseño adaptable |
| 19 | Vista móvil de "Lo que te falta" | `fig-19-movil-lo-que-te-falta.png` | Diseño adaptable |

**Falta tomar (a mano):** la captura del panel de SonarQube con el Quality Gate "Passed" (<http://localhost:9000/dashboard?id=ITSE>, tras ejecutar `scripts/sonar.ps1`). Guárdala como `fig-20-sonarqube.png`.

## 3. Datos verificados para citar

| Indicador | Valor | Cómo se obtuvo |
| --- | --- | --- |
| Pruebas automatizadas del backend | 755 aprobadas (4 997 aserciones) | `php vendor/bin/pest` |
| Pruebas de interfaz en navegador | 30 aprobadas, en 320, 390, 768 y 1440 px | `npm run test:frontend` |
| Quality Gate de SonarQube | Passed | SonarQube 9.9 LTS |
| Bugs / vulnerabilidades | 0 / 0 (calificación A) | SonarQube |
| Hotspots de seguridad revisados | 100 % | SonarQube |
| Cobertura de pruebas (lógica PHP) | 89,3 % (91,7 % en código nuevo) | `scripts/cobertura-docker.ps1` + SonarQube |
| Código duplicado | 3,2 % | SonarQube |
| Tamaño | ~42 000 líneas (PHP y TypeScript) | SonarQube |

## 4. Pendientes para el informe

- [ ] Enlace del **hosting** (el sistema aún no está publicado en internet).
- [ ] Captura de SonarQube (`fig-20-sonarqube.png`).
- [ ] Ejemplos y formatos entregados por el profesor para cada documento.
