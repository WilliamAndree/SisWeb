# Comandos y evidencias de Fase 3D

Directorio de trabajo: C:\Users\USUARIO\Downloads\SisWeb\SisWeb. Ejecución local serial. Esta lista identifica las invocaciones principales y sus selecciones; no es una transcripción de todas las inspecciones de archivos. Los resultados auténticos son TXT/JUnit, no los ejemplos reproducibles de este documento.

Antes de Pest se ejecutó `php tests/preflight.php`: evidencias 01, 02b y 16. Durante la reanudación se inició solo la instancia QA provisionada mediante `powershell -NoProfile -File tests/start-native-mariadb.ps1`. No ejecutar pruebas si el preflight no confirma el aislamiento.

Patrón de ejecución utilizado, con selección opcional y prefijo de evidencia:

```powershell
php vendor/bin/pest <seleccion> --compact --colors=never --log-junit=docs/calidad/evidencias-fase3d/<prefijo>.junit.xml
```

Las salidas se redirigieron a los TXT correspondientes y se registró EXIT_CODE. La ejecución final también utilizó `--fail-on-risky`. Omitir `<seleccion>` ejecuta toda la suite; no se utilizó `--parallel`.

Selección nueva A: tests/Unit/GeometriaRobustezTddTest.php, tests/Feature/CroquisIntegridadTddTest.php y tests/Feature/ConectividadGrafosTddTest.php.

| Prefijo | Selección |
| --- | --- |
| 02-baseline | Suite completa previa |
| 03-rojo, 04-verde, 05-verde | Selección A en esos estados del código |
| 06-rojo-integracion, 07-verde-integracion | Feature croquis/grafos, filtro PLAN-3D-06, PLAN-3D-07, PLAN-3D-08 y GRAFO-3D-03 |
| 08-rojo-fronteras | Geometría y croquis, filtro GEO-3D-05, PLAN-3D-09 y PLAN-3D-10 |
| 09-regresion-espacial | Selección A y tres Feature espaciales existentes |
| 10-rojo-consistencia | Croquis, filtro PLAN-3D-13 y PLAN-3D-14 |
| 10b-rojo-null | Croquis, filtro PLAN-3D-15 |
| 11-ampliacion-verde | Selección A ampliada |
| 12-rojo-precision-area | Geometría/croquis, filtro GEO-3D-08 y GEO-3D-09 |
| 13-refactor-verde | Selección A final |
| 15-modulos-aislamiento | Selección A, geometría existente, TestEnvironmentTest, ModeloEspacialVersionadoTest, AnalisisEspacialPreventivoTest, SugerenciasEspacialesMultimodalTest, AutorizacionUniformeTddTest y AutorizacionRutasUuidTest |
| 17-regresion-final | Suite completa final |

Los filtros corresponden a IDs contenidos en nombres de pruebas, combinados mediante alternativa de expresión regular. Los rojos describen revisiones intermedias: no deben reproducirse revirtiendo indiscriminadamente el workspace actual. El detalle de cada XML se conserva en 18-resumen-junit.json.

Se ejecutó Pint sobre cambios PHP y explícitamente sobre archivos nuevos (14/14b). La verificación final `git diff --check` terminó con código 0. `git status --short` se conserva en 22-status-final.txt, incluyendo cambios previos ajenos a esta fase. La comparación SHA-256 inicial/final de 890 archivos produjo ocho cambios autorizados y cero cambios inesperados (21-preservacion.json): seis archivos de aplicación y dos matrices. No se cambiaron frontend, .env ni .env.testing.

Durante el cierre hubo dos errores en scripts auxiliares de informe: un nombre de comando residual y el tratamiento inicial de arrays JSON por PowerShell. Se corrigieron y regeneraron los informes; no afectaron datos, código ni ejecuciones Pest. La verificación final válida está en 23-verificacion-final.json.
