@echo off
cd /d "%~dp0"
if not exist dist (
  echo Prima esegui build.bat
  pause
  exit /b 1
)
start "" http://localhost:4174
npm run preview
pause
