@echo off
chcp 65001 >nul
echo Impresoras instaladas en Windows:
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Format-Table Name, DriverName, PortName, PrinterStatus -AutoSize"
echo.
echo Copia el nombre EXACTO de la columna Name en Admin - Sedes - Hardware POS.
pause
