# CheckITSE Huancayo (SisWeb)

Sistema web preventivo para la gestión de Inspecciones Técnicas de Seguridad en Edificaciones (ITSE) en Huancayo: autoevaluaciones normativas, checklist dinámico, flujos de subsanación, croquis y análisis espacial del local, análisis de evidencias con IA (Gemini) e informes con sello de integridad SHA-256.

## Arquitectura y stack

React + TypeScript + Tailwind → Inertia.js → Laravel/PHP → MariaDB/MySQL. Es un **monolito modular**: el frontend React vive dentro de Laravel (`backend/resources/js`) y recibe sus datos como props de Inertia, sin una API REST separada.

| Capa | Tecnología |
| --- | --- |
| Backend | PHP 8.2+, Laravel 12, Sanctum 4, Inertia Laravel 2 |
| Frontend | React 19, TypeScript 5, Tailwind CSS 4, Radix UI / shadcn/ui, Vite 6 |
| Base de datos | MariaDB 10.4+ (XAMPP) o MySQL 8 |
| Pruebas | Pest 3 / PHPUnit 11, pruebas de frontend con `node --test` |
| Calidad | Laravel Pint, ESLint, Prettier, SonarQube |
| IA | Google Gemini (análisis multimodal de evidencias) |

Detalle en [docs/arquitectura.md](docs/arquitectura.md).

## Estructura

```text
SisWeb/
├── backend/            Laravel + Inertia (incluye el frontend React)
│   ├── app/            Controllers, Models, Services (AI, Espacio, Evaluacion), Jobs
│   ├── database/       Migraciones y seeders
│   ├── resources/js/   pages/, components/, layouts/, hooks/, lib/, types/
│   ├── routes/         web.php, api.php
│   └── tests/          Feature, Unit, Frontend, Support
├── docker/             Dockerfile del backend y configuración de Nginx
├── docs/               Arquitectura, desarrollo local, pruebas, calidad y auditorías
├── scripts/            Utilidades de desarrollo (instancia QA de MariaDB)
├── .github/workflows/  CI: lint y pruebas
├── docker-compose.yml
├── README.md
└── CONTRIBUTING.md
```

## Inicio rápido (XAMPP en Windows)

Requisitos: XAMPP con PHP 8.2+ y MariaDB, Composer y Node 22+.

```powershell
cd backend
composer install
npm ci
copy .env.example .env          # solo si no existe
php artisan key:generate        # solo si APP_KEY está vacío
```

1. Inicia **MySQL** desde el panel de XAMPP (un solo clic en *Start*).
2. Crea la base de datos y cárgala:

   ```powershell
   C:\xampp\mysql\bin\mysql.exe -uroot -e "CREATE DATABASE IF NOT EXISTS sisweb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
   php artisan migrate --seed
   ```

3. Arranca la aplicación (servidor, cola, logs y Vite a la vez):

   ```powershell
   composer run dev
   ```

4. Abre <http://localhost:8000>.

Guía completa y solución de problemas en [docs/desarrollo-local.md](docs/desarrollo-local.md).

## Inicio con Docker

```powershell
copy .env.example .env                 # completa DB_ROOT_PASSWORD y DB_PASSWORD
copy backend\.env.example backend\.env # si no existe
docker compose --profile assets run --rm assets
docker compose up -d --build
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed
```

La aplicación queda en <http://localhost:8000>.

## Pruebas

Las pruebas usan una base aislada (`sisweb_testing`) y se bloquean si el entorno no es seguro. Resumen:

```powershell
.\scripts\start-qa-mariadb.ps1   # instancia QA en 127.0.0.1:3307
cd backend
php tests/preflight.php
php vendor/bin/pest --compact
```

Más información en [docs/pruebas.md](docs/pruebas.md).

## Documentación

Índice completo en [docs/README.md](docs/README.md). Para colaborar, lee [CONTRIBUTING.md](CONTRIBUTING.md).
