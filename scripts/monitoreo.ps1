<#
.SYNOPSIS
    Actualiza la matriz de control y monitoreo (procesos × indicadores) con un solo comando.

.DESCRIPTION
    1. Ejecuta todas las pruebas con cobertura en Docker (scripts/cobertura-docker.ps1):
       genera backend/junit.xml y backend/coverage.xml.
    2. Si das un token, analiza el código en SonarQube (scripts/sonar.ps1).
    3. Genera la matriz en docs/monitoreo/: Excel, Markdown e historial.

    Sin token, la matriz se genera igual, solo sin las columnas de SonarQube.

.EXAMPLE
    .\scripts\monitoreo.ps1
    .\scripts\monitoreo.ps1 -Token squ_xxxxxxxx
    .\scripts\monitoreo.ps1 -SinPruebas      # reutiliza los últimos reportes (rápido)
#>
param(
    [string]$Token = $env:SONAR_TOKEN,
    [switch]$SinPruebas
)

$ErrorActionPreference = 'Continue'
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backend = Join-Path $raiz 'backend'

if (-not $SinPruebas) {
    Write-Host '1/3 Ejecutando pruebas con cobertura (unos 5 minutos)...'
    & (Join-Path $PSScriptRoot 'cobertura-docker.ps1')
    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'Algunas pruebas fallaron: la matriz lo mostrará en rojo.'
    }
}

$argumentos = @('artisan', 'checkitse:matriz-monitoreo')
if ($Token) {
    Write-Host '2/3 Analizando en SonarQube...'
    & (Join-Path $PSScriptRoot 'sonar.ps1') -Token $Token
    # SonarQube procesa el análisis unos segundos después de recibirlo.
    Start-Sleep -Seconds 30
    $argumentos += @('--sonar-url=http://localhost:9000', "--sonar-token=$Token")
} else {
    Write-Host '2/3 Sin token de SonarQube: se omite (las columnas de SonarQube quedarán como s/d).'
}

Write-Host '3/3 Generando la matriz...'
Push-Location $backend
php @argumentos
$resultado = $LASTEXITCODE
Pop-Location

if ($resultado -eq 0) {
    Write-Host ''
    Write-Host 'Listo. Abre docs\monitoreo\matriz-monitoreo.xlsx (Excel) o docs\monitoreo\matriz-monitoreo.md.'
}
exit $resultado
