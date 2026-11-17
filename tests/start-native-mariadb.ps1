$ErrorActionPreference = 'Stop'

$qaRepository = Split-Path -Parent $PSScriptRoot
$qaInstance = Join-Path $qaRepository 'scratch/qa-mariadb-native'
$qaConfig = Join-Path $qaInstance 'my.ini'
$qaData = Join-Path $qaInstance 'data'
$qaBinary = 'C:\xampp\mysql\bin\mysqld.exe'

foreach ($qaRequiredPath in @($qaConfig, $qaData, $qaBinary)) {
    if (-not (Test-Path -LiteralPath $qaRequiredPath)) {
        throw "Falta un componente de la instancia QA: $qaRequiredPath. No se inicializaran datos automaticamente."
    }
}

foreach ($qaDirectory in @($qaInstance, $qaData)) {
    if ((Get-Item -LiteralPath $qaDirectory).Attributes -band [IO.FileAttributes]::ReparsePoint) {
        throw 'Se rechazan enlaces o junctions en el almacenamiento de QA.'
    }
}

$qaSettings = Get-Content -LiteralPath $qaConfig -Raw
$qaExpectedData = $qaData.Replace('\', '/')
foreach ($qaSetting in @("datadir=$qaExpectedData", 'port=3307', 'bind-address=127.0.0.1', 'innodb_force_recovery=0')) {
    if ($qaSettings -notmatch ('(?m)^' + [regex]::Escape($qaSetting) + '\r?$')) {
        throw "Configuracion QA inesperada: se exige $qaSetting"
    }
}

$qaListener = Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue
if ($qaListener) {
    $qaProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($qaListener.OwningProcess)"
    if ($qaListener.LocalAddress -ne '127.0.0.1' -or $qaProcess.CommandLine -notlike "*--defaults-file=$qaConfig*") {
        throw 'El puerto 3307 pertenece a otro proceso; no se modificara.'
    }
    Write-Output 'La instancia nativa QA ya esta iniciada en 127.0.0.1:3307.'
    exit 0
}

$qaArguments = @(
    ('"--defaults-file=' + $qaConfig + '"')
    '--console'
)
$qaStarted = Start-Process -FilePath $qaBinary -ArgumentList $qaArguments -WorkingDirectory $qaInstance -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $qaInstance 'stdout.log') -RedirectStandardError (Join-Path $qaInstance 'stderr.log')
Write-Output "Proceso QA iniciado: $($qaStarted.Id). Ejecuta php tests/preflight.php antes de cualquier prueba."
