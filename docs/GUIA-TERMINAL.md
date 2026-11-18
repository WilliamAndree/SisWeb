# Guía de terminal: correr, probar y analizar CheckITSE

Comandos para la terminal de Visual Studio Code (PowerShell) en Windows con XAMPP. Abre una terminal con `` Ctrl + ` ``. Para abrir más terminales, usa el botón **+** del panel.

## 0. Requisitos (solo la primera vez)

| Programa | Para qué | Comprobar |
| --- | --- | --- |
| XAMPP (PHP 8.2 y MySQL) | Servidor y base de datos | `php -v` |
| Composer | Librerías de PHP | `composer -V` |
| Node.js 20 o superior | Pantallas (React) | `node -v` |
| Git | Subir a GitHub | `git --version` |
| Docker Desktop | Solo para SonarQube y cobertura | `docker --version` |

## 1. Encender la base de datos

Abre el **Panel de XAMPP** → **MySQL → Start**. Espera a que quede en verde.

## 2. Primera instalación (solo una vez)

```powershell
cd C:\Users\USUARIO\Downloads\SisWeb\SisWeb\backend
composer install
npm install
copy .env.example .env          # solo si no existe .env
php artisan key:generate        # solo si .env es nuevo
php artisan migrate --seed      # crea las tablas y los datos base
php artisan db:seed --class=DemoCuentasSeeder   # cuentas de demostración
npm run build
```

> Si la base `sisweb` no existe, créala en <http://localhost/phpmyadmin> (cotejamiento `utf8mb4_unicode_ci`).

## 3. Correr el sistema (uso diario)

Usa **dos terminales**, las dos dentro de `backend`:

**Terminal 1: servidor**
```powershell
cd C:\Users\USUARIO\Downloads\SisWeb\SisWeb\backend
php artisan serve
```

**Terminal 2: pantallas en modo desarrollo** (se actualizan solas al editar)
```powershell
cd C:\Users\USUARIO\Downloads\SisWeb\SisWeb\backend
npm run dev
```

Abre <http://localhost:8000>.

- Si no vas a editar las pantallas, en lugar de `npm run dev` basta con `npm run build` (una sola vez).
- **Terminal 3 (opcional):** `php artisan queue:listen --tries=1`. Solo hace falta para el análisis de fotos con IA.
- `composer run dev` no funciona en Windows, porque usa `pail`, que necesita una extensión que solo existe en Linux o Mac.

### Cuentas de demostración (contraseña `CheckItse2026!`)

| Cuenta | Qué ves |
| --- | --- |
| `admin@checkitse.local` | Administración: pagos, negocios, ingresos y vencimientos |
| `proveedor@checkitse.local` | Cuenta de proveedor con productos, ventas y estadísticas |
| `proveedor2@checkitse.local` | Proveedor con un plan por vencer |

Para reiniciar la demo: `php artisan db:seed --class=DemoCuentasSeeder`.

## 4. Pruebas

```powershell
cd C:\Users\USUARIO\Downloads\SisWeb\SisWeb
powershell -ExecutionPolicy Bypass -File scripts\start-qa-mariadb.ps1   # base de pruebas aislada (puerto 3307)

cd backend
php vendor/bin/pest --compact                            # las 755 pruebas del backend
php vendor/bin/pest tests/Feature/PlanesYAdministracionTest.php   # un solo archivo
npm run test:frontend                                    # 30 pruebas de interfaz en el navegador
```

Al terminar, Pest muestra algo como `Tests: 755 passed`. Las pruebas **nunca** usan tu base `sisweb`: tienen su propia base en el puerto 3307.

## 5. Revisión de código y formato

```powershell
cd C:\Users\USUARIO\Downloads\SisWeb\SisWeb\backend
npx tsc --noEmit                         # tipos de TypeScript (sin mensajes = todo bien)
npx eslint resources/js --quiet          # reglas de código React
npm run format:check                     # formato de las pantallas
vendor/bin/pint --test                   # formato del código PHP
php artisan route:list --except-vendor   # todas las rutas del sistema
```

## 6. SonarQube (calidad del código)

Abre Docker Desktop primero y espera a que diga "Engine running".

```powershell
cd C:\Users\USUARIO\Downloads\SisWeb\SisWeb
.\scripts\cobertura-docker.ps1            # mide la cobertura de pruebas (unos 5 minutos)
.\scripts\sonar.ps1 -Token TU_TOKEN       # analiza y sube el resultado
```

- El token se crea en <http://localhost:9000> → *My Account → Security → Generate token*.
- El resultado se ve en <http://localhost:9000/dashboard?id=ITSE>.

## 7. Guardar y subir a GitHub

```powershell
cd C:\Users\USUARIO\Downloads\SisWeb\SisWeb
git status                                # qué cambió
git add -A
git commit -m "Describe aquí tu cambio"
git push william feature/rediseno-emprendedor
git push william feature/rediseno-emprendedor:main feature/rediseno-emprendedor:develop
```

## 8. Apagar todo

1. En cada terminal que esté corriendo algo: `Ctrl + C`.
2. Panel de XAMPP → **MySQL → Stop**.
3. Si usaste SonarQube: `docker stop sonarqube-server` y cierra Docker Desktop.

## Problemas frecuentes

| Mensaje | Solución |
| --- | --- |
| `SQLSTATE[HY000] [2002]` o `Connection refused` | MySQL de XAMPP está apagado: enciéndelo (paso 1) |
| `Unable to locate file in Vite manifest` | Corre `npm run build` o deja `npm run dev` abierto |
| La página no muestra tus cambios | Recarga con `Ctrl + F5`, o vuelve a correr `npm run build` |
| `Address already in use` (puerto 8000) | Ya hay un servidor abierto: ciérralo con `Ctrl + C` o usa `php artisan serve --port=8001` |
| `[SisWeb preflight BLOQUEADO]` en las pruebas | Falta la base de pruebas: corre `scripts\start-qa-mariadb.ps1` (paso 4) |
| `No se puede cargar el archivo ... .ps1` | Ejecuta: `powershell -ExecutionPolicy Bypass -File scripts\nombre.ps1` |
