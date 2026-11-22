<#
.SYNOPSIS
    Registra (o quita) en el Programador de tareas de Windows el "cron" de Laravel para el servidor XAMPP.

.DESCRIPTION
    Windows no tiene cron ni systemd. Esta tarea ejecuta "php artisan schedule:run" cada minuto con
    php-win.exe (sin ventana), lo que activa lo programado en backend/routes/console.php:
      - checkitse:vencer-planes, cada día a las 00:10.
      - queue:work --stop-when-empty, cada minuto: procesa la cola (análisis de evidencias con IA).
    La tarea corre solo mientras el usuario tiene la sesión iniciada; si MySQL está apagado, ese
    minuto falla sin efectos y el siguiente vuelve a intentar.

.EXAMPLE
    .\scripts\tareas-xampp.ps1            # registra o actualiza la tarea
    .\scripts\tareas-xampp.ps1 -Quitar    # elimina la tarea
    .\scripts\tareas-xampp.ps1 -Estado    # muestra si existe y su última ejecución
#>
param(
    [switch]$Quitar,
    [switch]$Estado
)

$ErrorActionPreference = 'Stop'
$nombre = 'CheckITSE-Programador'
$backend = (Resolve-Path (Join-Path $PSScriptRoot '..\backend')).Path
$php = 'C:\xampp\php\php-win.exe'

if ($Estado) {
    $tarea = Get-ScheduledTask -TaskName $nombre -ErrorAction SilentlyContinue
    if (-not $tarea) { Write-Host "La tarea $nombre no está registrada."; exit 0 }
    $info = Get-ScheduledTaskInfo -TaskName $nombre
    Write-Host "Tarea $nombre · estado: $($tarea.State) · última ejecución: $($info.LastRunTime) · resultado: $($info.LastTaskResult)"
    exit 0
}

if ($Quitar) {
    Unregister-ScheduledTask -TaskName $nombre -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tarea $nombre eliminada."
    exit 0
}

if (-not (Test-Path $php)) { Write-Error "No se encontró $php (PHP de XAMPP)."; exit 1 }

$accion = New-ScheduledTaskAction -Execute $php -Argument 'artisan schedule:run' -WorkingDirectory $backend
$disparador = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 1)
$ajustes = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $nombre -Action $accion -Trigger $disparador -Settings $ajustes `
    -Description 'CheckITSE Huancayo: php artisan schedule:run cada minuto (planes vencidos y cola de trabajos).' -Force | Out-Null

Write-Host "Tarea $nombre registrada: schedule:run cada minuto en $backend" -ForegroundColor Green
