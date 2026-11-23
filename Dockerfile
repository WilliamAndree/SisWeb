# CheckITSE Huancayo — imagen para los servidores del laboratorio (staging y producción).
#
# Replica el mismo entorno del servidor XAMPP donde ya funciona el proyecto:
# Apache 2.4 + PHP 8.2 + MariaDB, todo en un solo contenedor, con el frontend ya compilado.
#   - Si el servidor entrega su propia base (variable DB_HOST distinta de 127.0.0.1), se usa esa.
#   - Si no, arranca la MariaDB interna (sus datos quedan en el volumen /var/lib/mysql).
# La aplicación escucha en el puerto 80; el pipeline lo publica en el puerto asignado.
# Salud: GET /up responde 200 cuando la aplicación está lista.

# 1) Frontend (React + Vite): solo se necesita Node para compilarlo.
FROM node:22-bookworm-slim AS frontend
WORKDIR /app
ENV CYPRESS_INSTALL_BINARY=0
COPY backend/package.json backend/package-lock.json ./
# Pocas conexiones y más reintentos: tolera redes inestables (WiFi del campus).
RUN npm ci --no-audit --no-fund --maxsockets=4 --fetch-retries=5 --fetch-retry-mintimeout=20000
COPY backend/ ./
RUN npm run build

# 2) Dependencias PHP de producción (sin las de desarrollo).
FROM composer:2 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --no-autoloader --ignore-platform-reqs
COPY backend/ ./
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative

# 3) Imagen final: Apache + PHP 8.2 (igual que XAMPP) + MariaDB.
FROM php:8.2-apache-bookworm

# Repositorios de Debian por HTTPS: algunas redes (p. ej. la del campus) alteran el tráfico HTTP.
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends mariadb-server libzip-dev libicu-dev unzip \
    && docker-php-ext-install pdo_mysql zip bcmath intl opcache \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

COPY deploy/contenedor/apache.conf /etc/apache2/sites-available/000-default.conf
COPY deploy/contenedor/php.ini /usr/local/etc/php/conf.d/checkitse.ini
COPY deploy/contenedor/entrypoint.sh /usr/local/bin/checkitse-inicio
RUN chmod +x /usr/local/bin/checkitse-inicio

WORKDIR /var/www/html
COPY --from=vendor /app ./
COPY --from=frontend /app/public/build ./public/build
RUN mkdir -p storage/app/private storage/app/public storage/framework/cache/data storage/framework/sessions \
        storage/framework/views storage/logs bootstrap/cache \
    && rm -f bootstrap/cache/*.php public/hot \
    && chown -R www-data:www-data storage bootstrap/cache

# Producción por defecto; el pipeline puede sobrescribir cualquier variable.
ENV APP_NAME="CheckITSE Huancayo" \
    APP_ENV=production \
    APP_DEBUG=false \
    APP_LOCALE=es \
    LOG_CHANNEL=stderr \
    SESSION_DRIVER=database \
    CACHE_STORE=database \
    QUEUE_CONNECTION=database \
    FILESYSTEM_DISK=local \
    DB_CONNECTION=mysql \
    DB_HOST=127.0.0.1 \
    DB_PORT=3306 \
    DB_DATABASE=sisweb \
    DB_USERNAME=sisweb

VOLUME ["/var/lib/mysql", "/var/www/html/storage/app"]
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD php -r 'exit(@file_get_contents("http://127.0.0.1/up") === false ? 1 : 0);'

ENTRYPOINT ["checkitse-inicio"]
CMD ["apache2-foreground"]
