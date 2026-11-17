# Fase 3A — TDD de autorización

Estado final: completada localmente, con regresión serial de 525 pruebas aprobadas, 4014 aserciones y cero fallos. No se inició otro módulo. Evidencias en evidencias-fase3a/.

## Diagnóstico y alcance

Se revisaron los documentos 00 a 13, cambios locales, controladores, trait, rutas, middleware y aislamiento antes de ejecutar pruebas. Se preservaron cambios previos de Fase 2 y documentos históricos; no se aplicaron stashes, restores, commits ni push. La causa histórica de pérdida de protecciones continúa documentada en 12 y 13; esta fase no añade atribuciones sin evidencia.

Los cinco fallos iniciales representan un defecto de aplicación y un defecto de preparación de pruebas, no cinco vulnerabilidades distintas:

- D-AUTH-01: EvaluacionHelperTrait::verificarPropiedadEvaluacion admitía borradores anónimos sin credenciales únicamente en testing. Cuatro datasets reproducían la diferencia de autorización.
- D-TEST-01: la petición JSON de AUTH-03 no enviaba la cookie de invitado sin withCredentials. La expectativa de acceso legítimo era válida; el fixture no enviaba las credenciales declaradas.

## ROJO, VERDE y refactorización

1. ROJO D-AUTH-01: 02-cinco-rojo.txt y JUnit registran cuatro casos fallidos, cuatro aserciones, salida 1. El filtro no incluyó el quinto caso. Los intentos 03 y 03b no encontraron pruebas y no cuentan como aprobación.
2. ROJO D-TEST-01: 03c-cookies-rojo registra un fallo y un control aprobado, dos aserciones. VERDE: withCredentials conserva cookie y expectativas; 04-cookies-verde registra dos aprobados.
3. Corrección mínima de aplicación: eliminar las nueve líneas de excepción por environment('testing') en app/Http/Controllers/Traits/EvaluacionHelperTrait.php, método verificarPropiedadEvaluacion (desde línea 200; denegación final alrededor de 245). Se conservan propietario, token con comparación segura y sesión legítima de borrador. No se alteró la política específica de descarga.
4. VERDE conjunto original: 05-originales-verde registra seis aprobados y diez aserciones: los cinco fallos originales y un control negativo.
5. AUTH-07 añade dos casos de paridad testing/production mediante el mismo método de autorización, sin arrancar una conexión de producción. La selección final de autorización registra 35 aprobados y 67 aserciones (19-autorizacion-nativa).
6. La primera regresión nativa detectó 38 fallos de fixtures heredados que dependían del bypass: 20-regresion-nativa conserva 487 aprobados, 38 fallidos y 3555 aserciones. Se corrigieron exclusivamente los helpers de siete archivos: ChecklistDinamicoEndpointTest, ChecklistInteractivaViewTest, ChecklistUX032Test, ClasificacionTramiteResumenTest, DesacoplamientoFlujoLegadoTest, RecursosEducativosIntegrationTest y ResumenDescriptivoTest. Crean token y sesión coincidentes para visitantes legítimos. Cuando hay overrides, se respetan tokens explícitos y propietarios. No se debilitaron aserciones de seguridad ni negocio. VERDE focalizado: 55 aprobados, 634 aserciones (21-fixtures-verde).
7. Refactorización controlada: uso del método central existente sin nuevo bypass ni duplicación de política. Pint aprobado; regresión final posterior al formato: 525 aprobados, 4014 aserciones (24-regresion-final).

## Aislamiento y recuperación de ejecución

El servidor original de XAMPP dejó de responder durante una migración previamente autorizada sobre sisweb_testing. Se conservan los errores reales en 07, 11, 14 y 16. Posteriormente la cuenta devolvió 1045 y la configuración observada indicaba innodb_force_recovery=2. Esto no demuestra la causa original de corrupción. No se reparó ni modificó el directorio de datos ni la configuración de XAMPP.

Se utilizó el binario MariaDB de XAMPP con una instancia nueva y nativa, sin Docker: scratch/qa-mariadb-native/data, escucha exclusivamente 127.0.0.1:3307, base sisweb_testing y cuenta restringida a esa base. El directorio se inicializó nuevo, sin borrar bases existentes. Se verificó el datadir antes de provisionar. La contraseña administrativa nueva permanece en el runtime ignorado; las credenciales existentes de pruebas no se cambiaron. .env.testing cambió únicamente DB_PORT a 3307; .env permanece intacto.

TestEnvironment permite únicamente 3306 (CI) o 3307 (instancia local), manteniendo comprobaciones de entorno testing, host, base, usuario, permisos y conexiones alternativas. Ahora rechaza cualquier innodb_force_recovery distinto de cero; se añadieron tres casos para modos 1, 2 y 6. Total aislamiento: 27 aprobados, 44 aserciones. El preflight final confirma configuración resuelta y servidor: testing/mysql/sisweb_testing/3307, cuenta restringida, recovery=0, Storage temporal, caché y sesiones array, cola sync, correo array y HTTP real bloqueado. Gemini no se contactó.

El helper tests/start-native-mariadb.ps1 solo arranca el runtime existente y verifica ruta, configuración y propietario del puerto; no inicializa ni borra datos. Para futuras sesiones: ejecutar powershell -NoProfile -File tests/start-native-mariadb.ps1 y después php tests/preflight.php. Si el preflight falla, no ejecutar Pest.

## Matriz de requisitos de seguridad

| Requisito | Caso/evidencia | Resultado |
| --- | --- | --- |
| Propietario accede y otro usuario no | AUTH-02 y AutorizacionRutasUuidTest | Aprobado |
| Invitado con token legítimo accede | AUTH-03 y AUTH-04 | Aprobado |
| Sin token o token incorrecto se deniega | AUTH-01 y controles de AutorizacionRutasUuidTest | Aprobado |
| Croquis ajenos no se modifican | AUTH-05 | Aprobado |
| Evidencias ajenas y UUID cruzados se deniegan | AUTH-06 y AutorizacionRutasUuidTest | Aprobado |
| Análisis ajenos no se consultan | AUTH-06 | Aprobado |
| Misma política entre testing y production | AUTH-07, dos entornos simulados | Aprobado |
| Conocer un UUID no otorga acceso | AUTH-01 y rutas UUID | Aprobado |
| Rutas públicas legítimas se conservan | Pruebas existentes de portada y captura; suite final | Aprobado dentro del alcance existente |

La matriz general 11 enlaza requisito, caso y evidencia. No se declara cobertura total de rutas ni cobertura porcentual: no se midió.

## Riesgos pendientes

La instancia original de XAMPP requiere diagnóstico y recuperación independientes; esta fase no repara su InnoDB. El runtime nativo local está ignorado y no es un servicio permanente. La validación fue local y serial: no demuestra ejecución CI remota, concurrencia, frontend ni cobertura total. No se avanzó a TDD funcional de otros módulos. Los resultados y excepciones históricas permanecen visibles en los archivos de evidencia.