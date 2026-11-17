# Fase 3 — Comparación y resultados disponibles

Fecha: 2026-11-16, America/Bogota. Estado: INCOMPLETA por cambio inesperado del workspace.

| Métrica | Antes: línea base reejecutada | Después del incidente |
| --- | --- | --- |
| Suite completa | 505 aprobadas; 0 fallidas | No ejecutada |
| Aserciones | 3983 | No hay métrica final comparable |
| Duración | 75.77 s | No medida |
| Aislamiento | Verificado por Laravel y servidor | Perdido: archivos de guardas ausentes |
| Tests nuevos persistentes | 0 | 0; los generados desaparecieron |
| Defectos reproducidos/corregidos | 0/0 en esta fase | 0/0 |

No interpretar los números posteriores como 0 pruebas fallidas de una regresión aprobada: no existe regresión final.

Evidencia inicial: [preflight](evidencias-fase3/01-preflight.txt), [salida de baseline](evidencias-fase3/02-baseline.txt), [JUnit](evidencias-fase3/02-baseline.junit.xml). La configuración efectiva fue testing, mysql, 127.0.0.1:3306, sisweb_testing, cuenta restringida, Storage temporal, array para caché/sesión/correo y HTTP real bloqueado. Es evidencia del momento inicial, no del estado posterior.

Invocaciones de casos efectuadas: 517 = 505 de baseline más 12 errores iniciales de fixture (0 aserciones). Los intentos siguientes de archivo no encontrado ejecutaron cero casos. No hubo fase roja válida ni correcciones productivas.

## Comandos

```text
git status --short
git diff
php tests/preflight.php
php vendor/bin/pest --compact --fail-on-risky --log-junit=docs/calidad/evidencias-fase3/02-baseline.junit.xml
php artisan make:test --pest AutorizacionUniformeTddTest --env=testing --no-interaction
php artisan make:test --pest FlujosCriticosTddTest --env=testing --no-interaction
php artisan make:test --pest --unit IntegridadCanonicaTddTest --env=testing --no-interaction
php artisan make:test --pest --unit ValidacionResultadoIATddTest --env=testing --no-interaction
php vendor/bin/pest tests/Feature/AutorizacionUniformeTddTest.php --compact --fail-on-risky --log-junit=docs/calidad/evidencias-fase3/03-auth-rojo.junit.xml
```

Las repeticiones de ruta relativa/absoluta y sus códigos 2 se guardan en archivos 04/04b. El estado Git posterior está en [05-git-tras-cambio-externo.txt](evidencias-fase3/05-git-tras-cambio-externo.txt); contrastar con 00-git-inicial.txt y 00-diff-inicial.patch.

## Archivos y alcance

Se generaron cuatro archivos TDD y se escribió el caso de autorización, pero ninguno permanece. No se implementaron cambios en app, rutas o migraciones. Se conservaron los cinco documentos 07–11 y evidencias-fase3 como documentación del trabajo incompleto. No se sobrescribieron documentos/evidencias de fases previas.

No se modificaron secretos ni se realizaron commits/push, reset o checkout. No se ejecutaron pruebas después de confirmar la pérdida de aislamiento. No se ejecutaron TypeScript/build al no llegar a cambios frontend ni una regresión final. No se atribuye cobertura frontend a Pest; no se midió cobertura ni se ejecutó Cypress/Sonar.

## Impedimentos y próximos pasos

La causa del reemplazo de archivos no está identificada; se solicitó aclaración. Antes de continuar hay que estabilizar el workspace, recuperar de forma autorizada las guardas de Fase 2 y repetir preflight/baseline. .env.testing aparece actualmente no seguido y no ignorado: no añadirlo ni publicar su contenido.

No se recomienda comenzar Fase 4. Fase 3 no está completada y la autorización/IA siguen pendientes. El usuario pidió detenerse si se perdía aislamiento; este documento registra esa parada sin declarar éxito.
