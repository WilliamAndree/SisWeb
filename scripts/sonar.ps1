<#
.SYNOPSIS
    Analiza CheckITSE con SonarQube local (Docker), sin instalar Java ni sonar-scanner.

.DESCRIPTION
    1. Levanta el contenedor "sonarqube-server" (SonarQube LTS) en http://localhost:9000.
    2. Espera a que esté listo.
    3. Ejecuta el escáner oficial (sonarsource/sonar-scanner-cli) sobre backend/.

    El token se crea en SonarQube: Mi cuenta > Seguridad > Generar token.
    Nunca lo guardes en el repositorio: pásalo como parámetro o variable de entorno.

.EXAMPLE
    .\scripts\sonar.ps1 -Token squ_xxxxxxxx
    $env:SONAR_TOKEN = "squ_xxxxxxxx"; .\scripts\sonar.ps1
#>
param(
    [string]$Token = $env:SONAR_TOKEN
)

$ErrorActionPreference = 'Stop'

if (-not $Token) {
    Write-Error 'Falta el token. Créalo en http://localhost:9000 (Mi cuenta > Seguridad) y ejecuta: .\scripts\sonar.ps1 -Token TU_TOKEN'
    exit 1
}

$backend = (Resolve-Path (Join-Path $PSScriptRoot '..\backend')).Path

# 1. SonarQube en Docker (reutiliza el contenedor si ya existe).
$existe = docker ps -a --filter 'name=^sonarqube-server$' --format '{{.Names}}'
if ($existe) {
    docker start sonarqube-server | Out-Null
} else {
    docker run -d --name sonarqube-server -p 9000:9000 sonarqube:lts-community | Out-Null
}

# 2. Esperar a que responda "UP".
Write-Host 'Esperando a SonarQube en http://localhost:9000 ...'
$listo = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $estado = Invoke-RestMethod -Uri 'http://localhost:9000/api/system/status' -TimeoutSec 5
        if ($estado.status -eq 'UP') { $listo = $true; break }
    } catch { }
    Start-Sleep -Seconds 5
}
if (-not $listo) {
    Write-Error 'SonarQube no respondió a tiempo. Revisa que Docker Desktop esté abierto.'
    exit 1
}

# 3. Escáner oficial en Docker. Desde el contenedor, el host se llama host.docker.internal.
# El escáner escribe su progreso en stderr: no debe detener el script.
$ErrorActionPreference = 'Continue'
docker run --rm `
    -e SONAR_HOST_URL='http://host.docker.internal:9000' `
    -e SONAR_TOKEN=$Token `
    -v "${backend}:/usr/src" `
    sonarsource/sonar-scanner-cli 2>&1 | ForEach-Object { "$_" }

if ($LASTEXITCODE -eq 0) {
    Write-Host 'Listo. Abre http://localhost:9000/dashboard?id=ITSE para ver el resultado.'
}
exit $LASTEXITCODE
