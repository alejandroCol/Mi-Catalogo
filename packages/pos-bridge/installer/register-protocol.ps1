param(
  [Parameter(Mandatory = $true)]
  [string]$InstallDir
)

$ErrorActionPreference = 'Continue'
$protocol = 'micatalogo-pos-bridge'
$vbsPath = Join-Path $InstallDir 'start-bridge.vbs'

if (-not (Test-Path $vbsPath)) {
  Write-Host "AVISO: start-bridge.vbs no encontrado; protocolo $protocol no registrado."
  exit 0
}

$regRoot = "HKCU:\Software\Classes\$protocol"
New-Item -Path $regRoot -Force | Out-Null
Set-ItemProperty -Path $regRoot -Name '(Default)' -Value 'URL:Mi Catalogo POS Bridge'
New-ItemProperty -Path $regRoot -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null

$commandPath = Join-Path $regRoot 'shell\open\command'
New-Item -Path $commandPath -Force | Out-Null
$command = "wscript.exe `"$vbsPath`""
Set-ItemProperty -Path $commandPath -Name '(Default)' -Value $command

Write-Host "Protocolo $protocol:// registrado (Iniciar puente desde el navegador)."
