<#
.SYNOPSIS
    Genera backend/coverage.xml (cobertura de pruebas PHP) en un entorno Docker desechable.

.DESCRIPTION
    No toca XAMPP ni la base QA. Levanta:
      1. Una MariaDB temporal en el puerto 3307 con una cuenta limitada a sisweb_testing
         (lo mismo que exige el preflight de tests/Support/TestEnvironment.php).
      2. Un PHP 8.2 con PCOV que comparte la red de esa MariaDB, por eso 127.0.0.1:3307
         apunta a la base temporal.
    Ejecuta Pest con --coverage-clover y borra todo al terminar.
    Luego corre .\scripts\sonar.ps1 para enviar la cobertura a SonarQube.
#>
$ErrorActionPreference = 'Stop'

$backend = (Resolve-Path (Join-Path $PSScriptRoot '..\backend')).Path
$entorno = Get-Content (Join-Path $backend '.env.testing') | Where-Object { $_ -match '^DB_PASSWORD=' }
$clave = ($entorno -replace '^DB_PASSWORD=', '').Trim('"')
if (-not $clave) { Write-Error 'No se encontró DB_PASSWORD en backend/.env.testing.'; exit 1 }

# Docker escribe su progreso en stderr: se revisan los códigos de salida a mano.
$ErrorActionPreference = 'Continue'

$db = 'sisweb-cobertura-db'
docker rm -f $db 2>&1 | Out-Null
foreach ($imagen in @('mariadb:10.11', 'php:8.2-cli')) {
    docker pull -q $imagen 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Error "No se pudo descargar $imagen."; exit 1 }
}

# 1. MariaDB temporal (puerto 3307, cuenta solo para sisweb_testing).
docker run -d --name $db `
    -e MARIADB_RANDOM_ROOT_PASSWORD=1 `
    -e MARIADB_DATABASE=sisweb_testing `
    -e MARIADB_USER=sisweb_testing `
    -e "MARIADB_PASSWORD=$clave" `
    mariadb:10.11 --port=3307 --bind-address=127.0.0.1 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error 'No se pudo iniciar la base temporal.'; exit 1 }

Write-Host 'Esperando a la base temporal...'
$lista = $false
for ($i = 0; $i -lt 180; $i++) {
    docker exec $db mariadb-admin '--protocol=tcp' '--host=127.0.0.1' '--port=3307' '--user=sisweb_testing' "--password=$clave" ping 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $lista = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $lista) { docker rm -f $db | Out-Null; Write-Error 'La base temporal no respondió.'; exit 1 }

# 2. PHP 8.2 + PCOV en la misma red que la base temporal.

#    Los comandos van en una sola línea: con saltos de línea de Windows, sh los rechaza.
$pasos = @(
    'apt-get update > /dev/null 2>&1',
    'apt-get install -y --no-install-recommends libzip-dev > /dev/null 2>&1',
    'docker-php-ext-install pdo_mysql zip > /dev/null 2>&1',
    'pecl install pcov > /dev/null 2>&1',
    'docker-php-ext-enable pcov > /dev/null',
    'php -d memory_limit=-1 -d pcov.directory=/proyecto/app vendor/bin/pest --compact --coverage-clover coverage.xml --log-junit junit.xml',
    # El escáner de SonarQube ve el proyecto en /usr/src: se ajustan las rutas del reporte.
    "sed -i 's#/proyecto/#/usr/src/#g' coverage.xml"
) -join ' && '
# No se monta en /usr/src: ahí la imagen guarda el código de PHP para compilar extensiones.
docker run --rm --network "container:$db" -v "${backend}:/proyecto" -w /proyecto php:8.2-cli sh -c $pasos 2>&1 | ForEach-Object { "$_" }
$resultado = $LASTEXITCODE

docker rm -f $db | Out-Null

if ($resultado -eq 0 -and (Test-Path (Join-Path $backend 'coverage.xml'))) {
    Write-Host 'Cobertura lista: backend/coverage.xml. Ahora ejecuta .\scripts\sonar.ps1 -Token TU_TOKEN'
}
exit $resultado
