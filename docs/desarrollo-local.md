# Desarrollo local

Todos los comandos de Composer, npm y Artisan se ejecutan desde `backend/`.

## Opción A: XAMPP (Windows)

| Servicio | Puerto | Base de datos |
| --- | --- | --- |
| Laravel (`php artisan serve`) | 8000 | — |
| Vite (`npm run dev`) | 5173 | — |
| MariaDB de XAMPP (desarrollo) | 3306 | `sisweb` (usuario `root`, sin contraseña) |
| MariaDB QA (pruebas) | 3307 | `sisweb_testing` |

### Primera instalación

```powershell
cd backend
composer install
npm ci
copy .env.example .env
php artisan key:generate
C:\xampp\mysql\bin\mysql.exe -uroot -e "CREATE DATABASE IF NOT EXISTS sisweb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
php artisan migrate --seed
```

### Uso diario

1. Panel de XAMPP → **MySQL → Start**. Haz un solo clic y espera a que el estado se ponga en verde.
2. Desde `backend/`, ejecuta `composer run dev`. Levanta el servidor, el worker de colas, los logs y Vite.
3. Abre <http://localhost:8000>.

### Cuentas de demostración

Para probar el circuito proveedor → pago → administrador, ejecuta desde `backend/`:

```bash
php artisan db:seed --class=DemoCuentasSeeder
```

Crea (o reinicia) dos cuentas con la contraseña `CheckItse2026!`. Solo funciona fuera de producción.

| Cuenta | Para qué |
| --- | --- |
| `admin@checkitse.local` | Administración (`/admin`): aprobar el negocio y el pago pendientes |
| `proveedor@checkitse.local` | Cuenta de proveedor con 3 productos, 6 meses de visitas y ventas, el negocio en revisión y un pago de S/ 132 por revisar |
| `proveedor2@checkitse.local` | Negocio publicado con plan Premium que vence en 4 días: sirve para probar el recordatorio por WhatsApp |

Cada vez que lo ejecutas, el escenario vuelve a quedar pendiente para revisarlo de nuevo.

## Opción B: Docker

```powershell
copy .env.example .env                  # completa DB_ROOT_PASSWORD y DB_PASSWORD
docker compose --profile assets run --rm assets
docker compose up -d --build
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed
```

Servicios: `mariadb`, `backend` (PHP-FPM), `queue` (worker de colas), `nginx` (puerto 8000) y `assets` (compila el frontend).

## Problemas frecuentes con MySQL de XAMPP

### El log no muestra "ready for connections" y aparece `mysqld.dmp`

Suele pasar si se hace clic en *Start* dos veces seguidas: arrancan dos procesos sobre la misma carpeta `data` y el segundo falla. Solución:

1. Haz clic en *Stop* en el panel o cierra cualquier `mysqld.exe` desde el Administrador de tareas.
2. Haz clic en *Start* una sola vez.
3. Para ver el error real, arranca el servidor en una consola:

   ```powershell
   C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --console
   ```

### `Unknown database 'sisweb'` o la aplicación no conecta

La base no existe. Créala y migra, como en la primera instalación.

### `Port 3306 in use`

Otro servicio MySQL ocupa el puerto. Revisa quién lo usa:

```powershell
Get-NetTCPConnection -LocalPort 3306 | Select-Object OwningProcess
Get-Process -Id <PID>
```

### `Access denied for user 'root'`

En XAMPP, `root` no tiene contraseña por defecto. Si le pusiste una, actualiza `DB_PASSWORD` en `backend/.env` y en `C:\xampp\phpMyAdmin\config.inc.php`.
