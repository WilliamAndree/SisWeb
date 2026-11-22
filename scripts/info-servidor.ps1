<#
.SYNOPSIS
    Muestra las características del servidor XAMPP donde se despliega CheckITSE
    (sistema operativo, hardware, versiones de Apache/PHP/MariaDB y límites de PHP).

.EXAMPLE
    .\scripts\info-servidor.ps1
#>
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$disco = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$equipo = Get-CimInstance Win32_ComputerSystem

'Sistema operativo : {0} (build {1}, {2})' -f $os.Caption, $os.BuildNumber, $os.OSArchitecture
'Procesador        : {0}' -f $cpu.Name.Trim()
'Núcleos / hilos   : {0} núcleos / {1} hilos' -f $cpu.NumberOfCores, $cpu.NumberOfLogicalProcessors
'Memoria RAM       : {0:N1} GB' -f ($equipo.TotalPhysicalMemory / 1GB)
'Disco C:          : {0:N0} GB total, {1:N0} GB libres' -f ($disco.Size / 1GB), ($disco.FreeSpace / 1GB)
''
'Servidor web      : ' + ((& C:\xampp\apache\bin\httpd.exe -v | Select-Object -First 1) -replace 'Server version: ', '')
'PHP               : ' + (& C:\xampp\php\php.exe -v | Select-Object -First 1)
'Base de datos     : ' + ((& C:\xampp\mysql\bin\mysqld.exe --version) -replace '^.*Ver ', '')
'Node.js / npm     : ' + (node -v) + ' / ' + (npm -v)
'Composer          : ' + ((composer --version 2>$null) -replace ' \d{4}-.*$', '')
'Git               : ' + (git --version)
'Docker            : ' + (docker --version)
''
'Extensiones PHP requeridas:'
'  ' + ((& C:\xampp\php\php.exe -m | Where-Object { $_ -match '^(pdo_mysql|mbstring|openssl|zip|fileinfo|curl|tokenizer|xml|ctype|json|bcmath)$' }) -join ', ')
''
'Límites de PHP:'
'  ' + ((Select-String -Path C:\xampp\php\php.ini -Pattern '^(memory_limit|upload_max_filesize|post_max_size)=' | ForEach-Object { $_.Line }) -join '   ')
