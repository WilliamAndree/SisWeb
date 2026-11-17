# Fase 3 — Plan TDD y condición de parada

Fecha: 2026-11-16, America/Bogota. Estado: DETENIDA por pérdida del aislamiento durante la sesión. HEAD observado: b3d6e77.

Se leyeron los documentos 00–06, AGENTS.md y las guías locales de Laravel/pruebas. El estado inicial contenía los cambios sin commit de Fase 2. Se conservaron estado y diff en evidencias-fase3/00-git-inicial.txt y 00-diff-inicial.patch. No se sobrescribieron evidencias anteriores.

## Línea base verificada

Antes de generar tests, preflight confirmó entorno testing, mysql en 127.0.0.1:3306, base efectiva sisweb_testing, cuenta restringida, discos temporales y bloqueo de HTTP real. La suite terminó con 505 aprobadas, 0 fallidas, 3983 aserciones y código 0 (75.77 s). Evidencia: 01-preflight.txt y 02-baseline.txt/.junit.xml.

## Cambio inesperado del workspace

Después del primer intento de autorización, desaparecieron archivos nuevos de tests y las guardas de Fase 2. Una inspección posterior confirmó:

- tests/bootstrap.php, tests/preflight.php, tests/Support/TestEnvironment.php y TestEnvironmentTest.php ya no existen.
- phpunit.xml volvió a vendor/autoload.php y sisweb_test.
- tests/TestCase.php volvió a no tener verificación de aislamiento.
- .gitignore ya no ignora .env.testing, que aparece como archivo no seguido.
- El HEAD continúa b3d6e77, pero desaparecieron las modificaciones locales de Fase 2 del estado Git.

No se ejecutó ningún reset, checkout, borrado, commit o push por parte del asistente. El origen del reemplazo no está identificado. Se preguntó al usuario si hay restauración/sincronización en curso. No se atribuye la causa a una persona o proceso específico.

Se detuvieron pruebas y migraciones al confirmar este estado. No se restauraron automáticamente archivos ni se modificaron secretos. No hay una conexión efectiva ACTUAL verificada: la válida de la línea base no demuestra seguridad del workspace posterior.

## Secuencia pendiente tras aclarar el cambio

1. Confirmar qué proceso reemplaza archivos y cuál es el estado deseado; preservar cambios ajenos.
2. Recuperar de forma controlada las guardas de Fase 2, incluyendo la exclusión de .env.testing, sin publicar su contenido.
3. Ejecutar preflight y una línea base nueva, conservando evidencia distinta.
4. A: autorización uniforme. Reproducir borrador sin token; conservar propietario, invitado legítimo y sesión inmediata; probar UUID cruzados, archivos, croquis y análisis ajenos. Ajustar fixtures explícitos, sin bypass global.
5. B: autoevaluación/checklist. Caracterizar entradas inválidas, NO_APLICA no elegible y transacciones.
6. C: SHA-256. Probar orden/Unicode/listas y rechazo de JSON no representable; no cambiar hashes válidos.
7. D: subsanación/evidencia. Propiedad, MIME/tamaño, custodia y fallos de persistencia con discos temporales.
8. E: IA. Tipos/enums inválidos, JSON roto, ilegibilidad, incertidumbre, contenido malicioso y proveedor simulado. Evitar resultados optimistas ante ambigüedad.
9. F/G: planos/versionado y geometría/conectividad. Idempotencia, integridad, referencias y límites. Si el comportamiento ya es correcto, registrar caracterización verde, no inventar rojo.
10. Por defecto real: requisito → prueba → rojo por causa específica → corrección mínima → verde → refactor útil → regresión y trazabilidad. Sin omitir o eliminar tests para obtener verde.

No se avanzó a Cypress ni SonarQube. No está habilitada todavía una recomendación de iniciar Fase 4.
