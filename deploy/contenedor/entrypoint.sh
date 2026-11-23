#!/bin/sh
# Arranque del contenedor de CheckITSE: base de datos, clave de la app, migraciones y Apache.
set -e
cd /var/www/html

# 0) Puerto: algunas plataformas (p. ej. Render) indican en PORT dónde debe escuchar la app.
if [ -n "$PORT" ] && [ "$PORT" != "80" ]; then
    sed -i "s/^Listen 80$/Listen ${PORT}/" /etc/apache2/ports.conf
    sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf
fi

# 1) Base de datos: la externa si se indica (DB_URL o DB_HOST); si no, la MariaDB interna (como en XAMPP).
if [ -n "$DB_URL" ] || { [ "$DB_HOST" != "127.0.0.1" ] && [ "$DB_HOST" != "localhost" ]; }; then
    # Base externa persistente (p. ej. MySQL gratuito de Aiven): conexión cifrada con TLS.
    if [ -n "$DB_CA_PEM" ]; then
        printf '%s\n' "$DB_CA_PEM" > /etc/ssl/certs/checkitse-db-ca.pem
        export MYSQL_ATTR_SSL_CA=/etc/ssl/certs/checkitse-db-ca.pem
    elif [ -z "$MYSQL_ATTR_SSL_CA" ]; then
        export MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt
        export MYSQL_SSL_VERIFY=false
        echo "Aviso: base externa con TLS sin verificar el certificado (agrega DB_CA_PEM para verificarlo)."
    fi
elif [ "$DB_HOST" = "127.0.0.1" ] || [ "$DB_HOST" = "localhost" ]; then
    export DB_HOST=127.0.0.1
    CLAVE_BD=/var/lib/mysql/.clave-checkitse
    if [ ! -d /var/lib/mysql/mysql ]; then
        mariadb-install-db --user=mysql --datadir=/var/lib/mysql --skip-test-db > /dev/null
    fi
    if [ -z "$DB_PASSWORD" ]; then
        [ -f "$CLAVE_BD" ] || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$CLAVE_BD"
        DB_PASSWORD=$(cat "$CLAVE_BD")
        export DB_PASSWORD
    fi
    mysqld_safe --user=mysql --bind-address=127.0.0.1 --skip-name-resolve > /dev/null 2>&1 &
    for _ in $(seq 1 60); do mariadb-admin ping --silent 2> /dev/null && break; sleep 1; done
    mariadb -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USERNAME}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_DATABASE}\`.* TO '${DB_USERNAME}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
fi

# 2) Clave de cifrado: la del servidor o una propia que se conserva en el volumen.
#    Si la plataforma entrega un texto aleatorio sin el formato de Laravel, se deriva de él
#    una clave válida y estable (las sesiones sobreviven a los reinicios).
if [ -n "$APP_KEY" ] && [ "${APP_KEY#base64:}" = "$APP_KEY" ]; then
    APP_KEY=$(php -r 'echo "base64:".base64_encode(hash("sha256", getenv("APP_KEY"), true));')
    export APP_KEY
fi
if [ -z "$APP_KEY" ]; then
    CLAVE_APP=storage/app/.app-key
    [ -f "$CLAVE_APP" ] || php -r 'echo "base64:".base64_encode(random_bytes(32));' > "$CLAVE_APP"
    APP_KEY=$(cat "$CLAVE_APP")
    export APP_KEY
fi

# 3) Migraciones y datos iniciales (solo la primera vez), luego cachés de producción.
mkdir -p storage/app/private storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs
chown -R www-data:www-data storage bootstrap/cache
if [ -n "$CLAVE_DEMO" ]; then
    php artisan checkitse:servidor-preparar --clave="$CLAVE_DEMO"
else
    php artisan checkitse:servidor-preparar
fi
php artisan storage:link > /dev/null 2>&1 || true
php artisan optimize
chown -R www-data:www-data storage bootstrap/cache

# 4) Tareas programadas (planes vencidos y cola de trabajos), como el Programador de tareas en XAMPP.
su -s /bin/sh www-data -c 'php artisan schedule:work' > /dev/null 2>&1 &

exec "$@"
