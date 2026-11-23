# Publicar CheckITSE Huancayo con un enlace público gratuito (Render)

Resultado: una dirección como **https://checkitse-huancayo.onrender.com** que cualquiera puede abrir,
con HTTPS, sin comprar dominio y sin tarjeta.

## Qué se publica

- La aplicación completa (portada, autoevaluación, correcciones, expediente, directorio, panel de
  proveedor, administración y reportes), construida con el `Dockerfile` de la raíz:
  Apache + PHP 8.2 + MariaDB en un solo contenedor, igual que el servidor XAMPP.
- Datos de demostración: catálogo normativo, proveedores y los 42 locales DEMO- de los reportes.
  **No** se publica ningún dato real de usuarios (esos quedan solo en el XAMPP).
- Cuentas de demostración con una clave que **genera Render** (nunca la clave pública del repositorio):
  `admin@checkitse.local`, `proveedor@checkitse.local`, `proveedor2@checkitse.local`.

## Pasos (una sola vez, ~10 minutos)

1. Entra a <https://render.com> → **Get Started** → **GitHub** (inicia sesión con la cuenta dueña
   del repositorio `WilliamAndree/SisWeb`). No pide tarjeta para el plan gratuito.
2. Autoriza a Render a ver el repositorio `SisWeb` (puede ser solo ese repositorio).
3. En el panel de Render: **New +** → **Blueprint** → elige `WilliamAndree/SisWeb` → rama `main`.
4. Render lee `render.yaml` y muestra el servicio `checkitse-huancayo` (plan **Free**).
   Pulsa **Apply** / **Deploy Blueprint**.
5. Espera la primera construcción (8–15 minutos). Cuando diga **Live**, abre la URL que aparece arriba.
6. La clave de las cuentas de demostración está en el servicio → **Environment** → `CLAVE_DEMO`.

Si el nombre `checkitse-huancayo` ya está ocupado, Render agrega un sufijo a la URL; en ese caso,
actualiza `APP_URL` en **Environment** con la URL real.

## Cómo se comporta el plan gratuito

| Aspecto | Comportamiento |
|---|---|
| Disponibilidad | Se duerme tras 15 minutos sin visitas; la siguiente visita lo despierta en ~1 minuto. |
| Datos | No hay disco persistente: al reiniciarse vuelve a los datos de demostración. |
| Actualizaciones | Cada `push` a `main` vuelve a desplegar automáticamente (`autoDeploy`). |
| Recursos | 512 MB de RAM; la aplicación usa ~140 MB (medido con el mismo contenedor). |
| Salud | Render consulta `/up`; si no responde, no publica la versión nueva. |

Consejo para una presentación: abre la URL 2–3 minutos antes para que ya esté despierta.

## Verificado localmente (mismo contenedor, mismas condiciones)

- Límite de 512 MB y `PORT=10000`: `/up` responde 200 a los ~40 s del arranque, uso ~140 MB.
- Detrás de un proxy HTTPS (`TRUSTED_PROXIES=*`), los CSS y JS se sirven con `https://`.
- Inicio de sesión del administrador con la clave de `CLAVE_DEMO` y módulo de reportes con 42 locales.

## Archivos involucrados

| Archivo | Para qué sirve |
|---|---|
| `render.yaml` | Define el servicio gratuito de Render (Docker, salud `/up`, variables). |
| `Dockerfile` | Imagen: compila el frontend, instala dependencias y prepara Apache + PHP + MariaDB. |
| `deploy/contenedor/entrypoint.sh` | Arranque: puerto, base de datos, clave de la app, migraciones, datos iniciales, tareas. |
| `deploy/contenedor/*.conf`, `*.cnf`, `php.ini` | Apache, MariaDB y PHP ajustados a poca memoria, con los límites del XAMPP. |
| `backend/app/Console/Commands/PrepararServidor.php` | `checkitse:servidor-preparar`: datos iniciales y claves propias (5 pruebas). |
