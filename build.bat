@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato. Installa Node.js LTS da https://nodejs.org/
  pause
  exit /b 1
)
npm run build
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo Build pronta nella cartella dist.
pause
