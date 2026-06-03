@echo off
echo ============================================
echo  Asistente de Liquidaciones de Prestadores
echo ============================================
echo.

echo Cerrando procesos anteriores...
powershell -NoProfile -Command "Get-WmiObject Win32_Process | Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -like '*uvicorn*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
powershell -NoProfile -Command "Get-WmiObject Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*next*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
timeout /t 2 /nobreak >nul

echo Iniciando backend (FastAPI)...
start "Backend - Liquidaciones" cmd /k "cd /d "%~dp0backend" && set PYTHONUNBUFFERED=1 && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8002"
timeout /t 3 /nobreak >nul

echo Iniciando frontend (Next.js)...
start "Frontend - Liquidaciones" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 6 /nobreak >nul

echo Abriendo en el navegador...
start http://localhost:3000
echo.
echo Backend:  http://localhost:8002
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8002/docs
echo.
