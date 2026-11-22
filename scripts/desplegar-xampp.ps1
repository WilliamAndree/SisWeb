<#
.SYNOPSIS
    Despliegue continuo (CD) de CheckITSE en el servidor XAMPP: Apache 2.4 + PHP 8.2 + MariaDB 10.4.

.DESCRIPTION
    El servidor asignado es un equipo Windows con XAMPP, sin IP pública: GitHub Actions no
    puede conectarse a él. Por eso el despliegue es de tipo "pull": el servidor trae la última
    versión que ya pasó el pipeline de integración continua (rama main) y la publica.

      1. Obtiene la versión validada (rama main) y comprueba en la API de GitHub que su
         pipeline de CI terminó en verde; si no, se detiene sin desplegar.
      2. Instala dependencias (Composer y npm) y construye el frontend (Vite).
      3. Aplica las migraciones de base de datos.
      4. Optimiza Laravel para producción (config, rutas y vistas en caché).
      5. Registra el sitio en Apache (puerto 8081) si aún no lo está y reinicia Apache.
         Las tareas de fondo (cola y planes vencidos) se activan aparte, una sola vez, con
         scripts/tareas-xampp.ps1.
      6. Verifica: /up responde 200 y, con -Verificar, ejecuta las pruebas de humo de Cypress
         contra la aplicación desplegada.

.EXAMPLE
    .\scripts\desplegar-xampp.ps1
    .\scripts\desplegar-xampp.ps1 -SinPull -Verificar     # despliega lo que hay en disco y verifica con Cypress
#>
param(
    [string]$Remoto = 'william',
    [string]$Rama = 'main',
    [switch]$SinPull,
    [switch]$Verificar,
    [switch]$Forzar
)

$ErrorActionPreference = 'Stop'
# Terminales integradas (VS Code) definen ELECTRON_RUN_AS_NODE=1 y eso impide abrir el navegador de Cypress.
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backend = Join-Path $raiz 'backend'
$url = 'http://localhost:8081'
$vhosts = 'C:\xampp\apache\conf\extra\httpd-vhosts.conf'
$include = 'Include "C:/xampp/htdocs/SisWeb/deploy/xampp/checkitse.conf"'

function Paso([string]$texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
# Composer, npm y git escriben su progreso en stderr: solo cuenta el código de salida.
function Ejecutar([string]$comando) {
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & cmd /c "$comando 2>&1" | ForEach-Object { "$_" }
    $codigo = $LASTEXITCODE
    $ErrorActionPreference = $anterior
    if ($codigo -ne 0) { throw "Falló: $comando" }
}

Push-Location $backend
try {
    if (-not $SinPull) {
        Paso "1/6 Obteniendo la versión validada ($Remoto/$Rama)"
        Ejecutar "git fetch $Remoto $Rama"

        # Puerta de calidad: solo se despliega un commit cuyo pipeline de GitHub terminó en verde.
        $sha = (& git rev-parse "$Remoto/$Rama").Trim()
        $repo = ((& git remote get-url $Remoto) -replace '^https://([^@]+@)?github\.com/', '' -replace '\.git$', '').Trim()
        $checks = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/commits/$sha/check-runs" -Headers @{ 'User-Agent' = 'checkitse-despliegue' }
        $noVerdes = @($checks.check_runs | Where-Object { $_.status -ne 'completed' -or $_.conclusion -notin @('success', 'skipped', 'neutral') })
        if ($checks.total_count -eq 0 -or $noVerdes.Count -gt 0) {
            $detalle = ($noVerdes | ForEach-Object { "$($_.name): $($_.status)/$($_.conclusion)" }) -join ', '
            if (-not $Forzar) { throw "El commit $($sha.Substring(0,7)) no pasó el pipeline de CI ($detalle). No se despliega. Usa -Forzar solo en una emergencia." }
            Write-Warning "Se despliega sin CI en verde por -Forzar ($detalle)."
        }
        else {
            Write-Host "CI en verde para $($sha.Substring(0,7)): $($checks.total_count) verificaciones aprobadas." -ForegroundColor Green
        }

        Ejecutar "git merge --ff-only $Remoto/$Rama"
    }

    Paso '2/6 Instalando dependencias y construyendo el frontend'
    Ejecutar 'composer install --no-interaction --prefer-dist --optimize-autoloader'
    Ejecutar 'npm ci --no-audit --no-fund'
    Ejecutar 'npm run build'

    Paso '3/6 Aplicando migraciones'
    Ejecutar 'php artisan migrate --force'

    Paso '4/6 Optimizando para producción'
    Ejecutar 'php artisan optimize:clear'
    Ejecutar 'php artisan optimize'

    Paso '5/6 Publicando en Apache (puerto 8081)'
    if (-not (Select-String -Path $vhosts -SimpleMatch 'SisWeb/deploy/xampp/checkitse.conf' -Quiet)) {
        Add-Content -Path $vhosts -Value "`n$include"
    }
    Ejecutar 'C:\xampp\apache\bin\httpd.exe -t'
    # Reinicio "suave": si Apache corre como proceso de XAMPP, se reinicia; si no, se inicia.
    Get-Process httpd -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Process -FilePath 'C:\xampp\apache\bin\httpd.exe' -WindowStyle Hidden
    Start-Sleep -Seconds 3

    Paso '6/6 Verificando que la aplicación responda'
    $salud = Invoke-WebRequest -Uri "$url/up" -UseBasicParsing -TimeoutSec 30
    if ($salud.StatusCode -ne 200) { throw "La aplicación no respondió en $url/up" }
    Write-Host "OK: $url/up respondió $($salud.StatusCode)." -ForegroundColor Green

    if ($Verificar) {
        # Resultados aparte: no borran la evidencia de la suite completa.
        $env:CYPRESS_BASE_URL = $url
        $env:CYPRESS_REPORTE = 'resumen-despliegue'
        Ejecutar 'npx cypress run --spec cypress/e2e/00-humo-despliegue.cy.ts --config screenshotsFolder=cypress/screenshots-despliegue,trashAssetsBeforeRuns=false'
    }

    Write-Host "`nDespliegue listo: $url" -ForegroundColor Green
}
finally {
    Pop-Location
}
