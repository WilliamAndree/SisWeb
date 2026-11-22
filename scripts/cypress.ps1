<#
.SYNOPSIS
    Ejecuta las pruebas end-to-end de Cypress contra una instancia aislada de CheckITSE.

.DESCRIPTION
    1. Verifica que MariaDB de XAMPP esté activa y que exista la base sisweb_e2e.
    2. Construye el frontend (Vite).
    3. Levanta la aplicación en http://127.0.0.1:8010 con APP_ENV=e2e (lee backend/.env.e2e).
       Usa su propia caché de configuración, así nunca lee la base real aunque producción
       tenga la configuración en caché.
    4. Ejecuta Cypress (cada archivo reinicia la base sisweb_e2e con checkitse:e2e-preparar).
    5. Detiene el servidor y muestra el resumen (cypress/reports/resumen.json).

.EXAMPLE
    .\scripts\cypress.ps1
    .\scripts\cypress.ps1 -Spec cypress/e2e/04-correccion-pendientes.cy.ts
#>
param(
    [string]$Spec = '',
    [string]$Navegador = 'electron',
    [switch]$SinBuild
)

$ErrorActionPreference = 'Stop'
# Terminales integradas (VS Code) definen ELECTRON_RUN_AS_NODE=1 y eso impide abrir el navegador de Cypress.
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
# Sin aceleración gráfica: en equipos con poca memoria libre las capturas de Cypress se colgaban.
$env:ELECTRON_EXTRA_LAUNCH_ARGS = '--disable-gpu'
$backend = (Resolve-Path (Join-Path $PSScriptRoot '..\backend')).Path
$mysql = 'C:\xampp\mysql\bin\mysql.exe'

if (-not (Get-Process mysqld -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath 'C:\xampp\mysql\bin\mysqld.exe' -ArgumentList '--defaults-file=C:\xampp\mysql\bin\my.ini', '--standalone' -WindowStyle Hidden
    Start-Sleep -Seconds 6
}
& $mysql -uroot -e 'CREATE DATABASE IF NOT EXISTS sisweb_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
if (-not (Test-Path (Join-Path $backend '.env.e2e'))) { Copy-Item (Join-Path $backend '.env.e2e.example') (Join-Path $backend '.env.e2e') }

# Detiene servidores de pruebas que hayan quedado de corridas anteriores. En Windows,
# "artisan serve" lanza un "php -S" aparte que sobrevive al proceso padre.
function Detener-ServidorPruebas {
    Get-CimInstance Win32_Process -Filter "Name='php.exe'" |
        Where-Object { $_.CommandLine -match 'artisan serve.*8010|-S 127.0.0.1:8010' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

Push-Location $backend
$servidor = $null
Detener-ServidorPruebas
try {
    if (-not $SinBuild) { & npm run build | Out-Null }

    $env:APP_ENV = 'e2e'
    $env:APP_CONFIG_CACHE = Join-Path $backend 'bootstrap\cache\config-e2e.php'
    $env:APP_ROUTES_CACHE = Join-Path $backend 'bootstrap\cache\routes-e2e.php'
    $servidor = Start-Process -FilePath 'php' -ArgumentList 'artisan', 'serve', '--host=127.0.0.1', '--port=8010' -PassThru -WindowStyle Hidden

    $listo = $false
    for ($i = 0; $i -lt 40; $i++) {
        try { if ((Invoke-WebRequest 'http://127.0.0.1:8010/up' -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { $listo = $true; break } } catch {}
        Start-Sleep -Milliseconds 500
    }
    if (-not $listo) { throw 'La instancia de pruebas no respondió en http://127.0.0.1:8010/up' }

    # Electron es el navegador integrado de Cypress (el mismo que usa el pipeline de CI).
    $argumentos = @('cypress', 'run', '--browser', $Navegador)
    if ($Spec) { $argumentos += @('--spec', $Spec) }
    & npx @argumentos
    $resultado = $LASTEXITCODE
}
finally {
    Detener-ServidorPruebas
    Remove-Item Env:APP_ENV, Env:APP_CONFIG_CACHE, Env:APP_ROUTES_CACHE -ErrorAction SilentlyContinue
    Pop-Location
}

$resumen = Join-Path $backend 'cypress\reports\resumen.json'
if (Test-Path $resumen) {
    $r = Get-Content $resumen -Raw | ConvertFrom-Json
    Write-Host ''
    Write-Host ("Cypress: {0} pruebas · {1} aprobadas · {2} fallidas · {3:N1} s" -f $r.total, $r.aprobadas, $r.fallidas, ($r.duracion_ms / 1000))
}
exit $resultado
