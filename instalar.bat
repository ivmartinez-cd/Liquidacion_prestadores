@echo off
echo ============================================
echo  Instalacion - Primera vez
echo ============================================
echo.

echo [1/3] Instalando dependencias Python...
cd /d "%~dp0backend"
pip install -r requirements.txt
echo.

echo [2/3] Cargando datos iniciales (PSTs, SPSTs, reglas)...
python seed.py
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
