# Contribución

1. Crea una rama desde `develop` con el prefijo correspondiente: `feature/…`, `fix/…`, `chore/…` o `docs/…`.
2. No versiones `.env`, `.env.testing`, credenciales, `vendor/`, `node_modules/`, `backend/scratch/` ni reportes generados (`coverage.xml`, `.scannerwork/`, `test-results/`).
3. Todo el código de la aplicación vive en `backend/`. Ejecuta los comandos de Composer, npm y Artisan desde esa carpeta.
4. Backend: valida con Form Requests, pon la lógica de negocio en `app/Services` y usa transacciones en operaciones que sellan o registran evaluaciones.
5. Las rutas públicas del ciudadano usan `uuid_trazabilidad`; nunca expongas IDs autoincrementales.
6. No modifiques autoevaluaciones en estado `REGISTRADA`. Cualquier corrección pasa por reevaluación o subsanación.
7. Cada cambio de comportamiento lleva pruebas: casos positivos, negativos y de autorización.
8. Antes de abrir un Pull Request, ejecuta desde `backend/`:

   ```powershell
   vendor/bin/pint --test
   npm run format:check
   npx eslint .
   npm run build
   php vendor/bin/pest --compact
   ```

9. Usa mensajes de commit con el formato `tipo(alcance): descripción`, por ejemplo `fix(subsanacion): validar tamaño de evidencia`.
10. Mantén `composer.lock` y `package-lock.json` y actualiza dependencias de forma consciente.
11. Documenta en `docs/` los resultados de las pruebas y las verificaciones pendientes. No declares pruebas que no se ejecutaron.

Ver [docs/pruebas.md](docs/pruebas.md) y [docs/desarrollo-local.md](docs/desarrollo-local.md).
