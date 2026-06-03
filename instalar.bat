@echo off
echo ============================================
echo  Instalacion - Primera vez
echo ============================================
echo.

echo [1/3] Instalando dependencias Python en entorno virtual...
cd /d "%~dp0backend"
if not exist "..\.venv" (
    echo Creando entorno virtual .venv...
    python -m venv "..\.venv"
)
"..\.venv\Scripts\python.exe" -m pip install -r requirements.txt
echo.

echo [2/3] Cargando datos iniciales (PSTs, SPSTs, reglas)...
"..\.venv\Scripts\python.exe" seed.py
echo.

echo [3/3] Instalando dependencias Node.js...
cd /d "%~dp0frontend"
npm install
echo.

echo ============================================
echo  Instalacion completa.
echo  Ejecuta INICIAR.bat para abrir la app.
echo ============================================
pause
