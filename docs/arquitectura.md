# Arquitectura

## Modelo C4

- **Contexto:** propietarios y comerciantes de Huancayo usan la plataforma web para hacer autoevaluaciones preventivas ITSE, subsanar observaciones y obtener informes.
- **Contenedores:** una aplicación monolítica modular (Laravel 12 + React 19 con Inertia.js), una base de datos relacional (MariaDB/MySQL), almacenamiento privado en disco para evidencias y la API externa de Google Gemini.
- **Componentes:** controladores (`app/Http/Controllers`), servicios de dominio (`app/Services`), modelos Eloquent (`app/Models`), jobs en cola (`app/Jobs`) y páginas React (`resources/js/pages`).

Todas las rutas de este documento son relativas a `backend/`.

## Flujo de una petición

1. `routes/web.php` recibe la petición y la dirige a un controlador.
2. El controlador valida la entrada con un Form Request (`app/Http/Requests`) y delega en un servicio.
3. El servicio aplica las reglas de negocio y persiste con Eloquent dentro de transacciones.
4. El controlador responde con `Inertia::render()`, y la página React correspondiente recibe los datos como props tipadas.

El análisis de evidencias con IA es asíncrono: `AnalisisEvidenciaJob` se encola (`QUEUE_CONNECTION=database`) y lo procesa `php artisan queue:work`.

## Backend: módulos de servicio

| Módulo | Servicios | Responsabilidad |
| --- | --- | --- |
| Evaluación | `ApplicabilityEngineService`, `ItseRiskService`, `Evaluacion/EvaluacionSyncService`, `Evaluacion/IntegridadEvaluacionService`, `Evaluacion/EvidenciaPrivadaService` | Reglas de aplicabilidad normativa, nivel de riesgo, sincronización del checklist, sello SHA-256 y evidencias privadas |
| IA | `AI/GeminiMultimodalService`, `AI/AnalisisEvidenciaService`, `AI/ValidacionResultadoIAService`, `AI/MotorCorrelacionNormativaService` | Análisis multimodal de fotos, validación de la respuesta y correlación con criterios normativos |
| Espacio | `Espacio/GestionEspacialService`, `Espacio/AnalisisEspacialService`, `Espacio/SugerenciaEspacialService`, `Espacio/Geometria/*` | Croquis del local, versionado de planos, conectividad de rutas de evacuación y sugerencias |
| Directorio | `DirectorioAliadosService`, `GeoLocationService` | Proveedores aliados y recursos cercanos |

## Frontend

- `resources/js/pages/`: una página por pantalla de Inertia (`Evaluacion/*`, `Directorio`, `Auth`, `Dashboard`, `Perfil`).
- `resources/js/components/`: componentes por dominio (`Evaluacion`, `Espacio`, `Directorio`), compartidos (`shared`) y primitivos de shadcn/ui (`ui`).
- `resources/js/layouts`, `hooks`, `lib`, `types`, `utils`: estructura, lógica reutilizable y tipos.
- El estado es local (React Hooks), con props tipadas que entrega Inertia.

Para ver todas las rutas: `php artisan route:list --except-vendor`.

## Reglas de diseño

1. **Inmutabilidad:** una autoevaluación en estado `REGISTRADA` no se modifica. Las correcciones se hacen por reevaluación o subsanación.
2. **Trazabilidad por UUID:** las rutas públicas usan `uuid_trazabilidad`, nunca el ID autoincremental.
3. **Evidencias privadas:** los archivos se guardan en un disco no público y se sirven solo tras autorizar al usuario.
4. **Integridad:** el payload canónico de cada evaluación se sella con SHA-256 y se verifica al mostrar informes.
5. **Pruebas obligatorias:** todo cambio pasa la suite completa en el entorno aislado (ver [pruebas.md](pruebas.md)).
