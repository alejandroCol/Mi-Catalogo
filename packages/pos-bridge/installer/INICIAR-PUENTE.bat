@echo off
chcp 65001 >nul
set "DEST=%LOCALAPPDATA%\Morning\PosBridge"
if not exist "%DEST%\dist\index.js" (
  echo Ejecuta INSTALAR.bat primero.
  pause
  exit /b 1
)
if exist "%DEST%\start-bridge.vbs" (
  wscript "%DEST%\start-bridge.vbs"
) else (
  start "" /MIN cmd /c "cd /d %DEST% && node dist\index.js"
)
timeout /t 2 >nul
echo Puente Morning POS iniciado en http://127.0.0.1:9123
pause
