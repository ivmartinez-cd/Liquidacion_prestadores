@echo off
echo Deteniendo Asistente de Liquidaciones...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr LISTENING 2^>nul') do (
    echo   Liberando puerto 8001 (PID %%a)...
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING 2^>nul') do (
    echo   Liberando puerto 3000 (PID %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

taskkill /FI "WINDOWTITLE eq Backend - Liquidaciones" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend - Liquidaciones" /F >nul 2>&1

echo Listo. Puertos liberados.
timeout /t 2 /nobreak >nul
