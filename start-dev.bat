@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato. Installa Node.js LTS da https://nodejs.org/
  pause
  exit /b 1
)
start "" http://localhost:4173
npm run dev
pause
