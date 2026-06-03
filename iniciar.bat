@echo off
echo ============================================
echo  Asistente de Liquidaciones de Prestadores
echo ============================================
echo.

echo Liberando puertos...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Iniciando backend (FastAPI)...
start "Backend - Liquidaciones" cmd /k "cd /d "%~dp0backend" && uvicorn app.main:app --reload --host 0.0.0.0 --port 8001"
timeout /t 3 /nobreak >nul

echo Iniciando frontend (Next.js)...
start "Frontend - Liquidaciones" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 6 /nobreak >nul

echo Abriendo en el navegador...
start http://localhost:3000
echo.
echo Backend:  http://localhost:8001
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8001/docs
echo.
