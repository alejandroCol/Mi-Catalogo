@echo off
chcp 65001 >nul
title Morning POS Bridge - Instalador
echo.
echo  ========================================
echo   Morning POS Bridge
echo   Impresora Jaltech 58mm + cajon SAT 119X
echo  ========================================
echo.

set "SRC=%~dp0bridge"
set "DEST=%LOCALAPPDATA%\Morning\PosBridge"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado.
  echo.
  echo  1. Descarga Node.js LTS desde https://nodejs.org
  echo  2. Instala con las opciones por defecto
  echo  3. Vuelve a ejecutar INSTALAR.bat
  echo.
  start https://nodejs.org
  pause
  exit /b 1
)

echo Instalando en: %DEST%
if not exist "%DEST%" mkdir "%DEST%"
xcopy /E /Y /I "%SRC%\*" "%DEST%\" >nul

cd /d "%DEST%"
echo Instalando dependencias del puente...
call npm install --omit=dev --no-audit --no-fund
if errorlevel 1 (
  echo [ERROR] No se pudieron instalar las dependencias.
  pause
  exit /b 1
)

echo Configurando inicio automatico al encender Windows...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-startup.ps1" -InstallDir "%DEST%"
if errorlevel 1 (
  echo [AVISO] No se pudo copiar al Inicio. Usa INICIAR-PUENTE.bat manualmente.
)

echo Registrando acceso rapido micatalogo-pos-bridge:// ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-protocol.ps1" -InstallDir "%DEST%"

echo.
echo  Instalacion completa.
echo  El puente escuchara en http://127.0.0.1:9123
echo.
echo  Iniciando puente ahora...
if exist "%DEST%\start-bridge.vbs" (
  wscript "%DEST%\start-bridge.vbs"
) else (
  start "" /MIN cmd /c "cd /d %DEST% && node dist\index.js"
)
timeout /t 3 >nul

echo  Verificando puente...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:9123/health' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { Write-Host '  OK - Puente activo' -ForegroundColor Green; exit 0 } } catch { Write-Host '  AVISO - Abre INICIAR-PUENTE.bat si Morning dice Impresora offline' -ForegroundColor Yellow; exit 1 }"

echo.
echo  Listo. Ya puedes vender en Morning.
pause
