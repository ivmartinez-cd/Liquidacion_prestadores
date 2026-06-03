@echo off
cd /d "%~dp0"

echo Liberando puerto 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Iniciando backend...
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
