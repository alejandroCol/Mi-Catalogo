param(
  [Parameter(Mandatory=$true)]
  [string]$InstallDir
)

$ErrorActionPreference = 'Continue'
$nodePath = (Get-Command node -ErrorAction Stop).Source
$scriptPath = Join-Path $InstallDir 'dist\index.js'
$startupFolder = [Environment]::GetFolderPath('Startup')
$vbsPath = Join-Path $startupFolder 'MorningPosBridge.vbs'
$localVbs = Join-Path $InstallDir 'start-bridge.vbs'

# Escapar comillas para VBScript
$nodeEsc = $nodePath -replace '\\', '\\'
$scriptEsc = $scriptPath -replace '\\', '\\'

$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "$($InstallDir -replace '\\', '\\')"
WshShell.Run """$nodePath"" ""$scriptPath""", 0, False
"@

Set-Content -Path $localVbs -Value $vbsContent -Encoding Default
Copy-Item -Path $localVbs -Destination $vbsPath -Force

Write-Host "Inicio automatico configurado (sin permisos de admin):"
Write-Host "  $vbsPath"
