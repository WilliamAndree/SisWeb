# Fase 3A — Resultados finales de autorización

Resultado verificado: **525 pruebas aprobadas, cero fallos, cero errores, cero omitidas y 4014 aserciones**. Pest completo en modo serial, salida 0, duración de consola 51,94 s. Fuente: evidencias-fase3a/24-regresion-final.txt y .junit.xml. El XML registra 50,894447 s de tiempo de pruebas; la duración de consola incluye otra sobrecarga.

## Comparación

| Ejecución | Aprobadas | Fallidas/errores | Aserciones |
| --- | ---: | ---: | ---: |
| Línea base Fase 2 comunicada | 505 | 0 | 3983 |
| Suite ampliada previa comunicada | 515 | 5 | 4002 |
| Primera regresión nativa de esta fase | 487 | 38 | 3555 |
| Regresión final ejecutada | 525 | 0 | 4014 |

Las líneas base anteriores proceden del contexto y documentos previos; el resultado final tiene salida y JUnit propios. Frente a los 520 casos previos hay cinco casos nuevos: dos de paridad de autorización y tres de rechazo de recovery mode. Las aserciones varían también por las ramas que antes abortaban. No sumar ejecuciones parciales como casos únicos.

## Evidencia de ejecución

| Archivo en evidencias-fase3a/ | Alcance | Resultado real |
| --- | --- | --- |
| 02-cinco-rojo.txt / JUnit | AUTH-01 | 4 fallidos; 4 aserciones |
| 03c-cookies-rojo.txt / JUnit | AUTH-03 | 1 aprobado, 1 fallido; 2 aserciones |
| 04-cookies-verde.txt / JUnit | Cookie legítima y control | 2 aprobados; 2 aserciones |
| 05-originales-verde.txt / JUnit | Fallos originales y control | 6 aprobados; 10 aserciones |
| 06-autorizacion-verde.txt / JUnit | Autorización inicial | 33 aprobados; 63 aserciones |
| 07 y 11 | Interrupción del servidor original | Preflight fallido y 35 errores de preparación; no son éxitos |
| 17-preflight-nativo.txt | Configuración efectiva aislada | testing / mysql / 127.0.0.1:3307 / sisweb_testing; recovery=0 |
| 18-aislamiento-nativo.txt / JUnit | Guardas | 27 aprobados; 44 aserciones |
| 19-autorizacion-nativa.txt / JUnit | Autorización, invitados y paridad | 35 aprobados; 67 aserciones |
| 20-regresion-nativa.txt / JUnit | Primera suite tras retirar bypass | 487 aprobados, 38 fallidos; 3555 aserciones |
| 21-fixtures-verde.txt / JUnit | Siete archivos con fixtures corregidos | 55 aprobados; 634 aserciones |
| 22-pint.txt | Formato | Aprobado |
| 23-preflight-final.txt | Verificación previa a suite final | Aprobada; HTTP externo bloqueado y almacenamiento temporal |
| 24-regresion-final.txt / JUnit | Suite completa posterior al formato | 525 aprobados; 4014 aserciones; salida 0 |

No se ocultaron los intentos fallidos ni los filtros sin coincidencias. Las pruebas de Gemini usaron simulación y bloqueo de peticiones externas. No se midió cobertura porcentual.

## Cambios de esta fase

- Aplicación: EvaluacionHelperTrait.php elimina el bypass exclusivo de testing; ninguna otra funcionalidad de aplicación fue modificada.
- AutorizacionUniformeTddTest.php corrige el envío de cookies y añade paridad. Siete archivos de fixtures están detallados en 14-tdd-autorizacion.md; mantienen sus aserciones.
- tests/Support/TestEnvironment.php y tests/Unit/TestEnvironmentTest.php incorporan puerto local autorizado y rechazo de motor en recuperación.
- tests/start-native-mariadb.ps1 permite arrancar de forma controlada la instancia nativa ya provisionada.
- .gitignore excluye el runtime; .env.testing solo cambia el puerto local a 3307. No se cambian credenciales ni .env. La configuración ejemplo conserva 3306 para CI.
- Documentación: 14, 15, matriz 11 y evidencias. Los cambios anteriores de Fase 2 en workflow, phpunit y TestCase se preservan y no se presentan como nuevos de autorización.

## Conclusión y límites

Los cinco fallos iniciales quedaron resueltos: un defecto de autorización de aplicación, manifestado en cuatro casos, y un defecto de envío de cookie en el quinto. Los fixtures heredados se adecuaron al acceso legítimo requerido, sin recuperar excepciones inseguras.

SisWeb está preparado para continuar TDD en el entorno aislado nativo, después de un preflight satisfactorio en cada sesión. No se inicia otro módulo automáticamente. El servidor original de XAMPP sigue fuera de esta validación: sus errores InnoDB y configuración de recuperación requieren atención separada. No se utilizó ni desinstaló Docker; no se hicieron commits ni push. CI remota, pruebas paralelas y frontend no fueron ejecutados.
## Comprobación final de preservación

La comparación SHA-256 con 00-protegidos.json confirma .env y los documentos originales 00–13 intactos, salvo la matriz 11 actualizada por alcance. Los únicos otros cambios detectados son .env.testing (puerto local autorizado) y storage/logs/browser.log, ya observado como modificado externamente antes de la recuperación nativa; no se sobrescribió ni se atribuye su origen. El manifiesto final está en evidencias-fase3a/26-preservacion-final.json. Git confirma que .env, .env.testing y el secreto administrativo del runtime están ignorados; git diff --check no presenta errores.