@echo off
title MCP Stream Overlay v3.6.1 Tactics Used Fix
cd /d "%~dp0"

if not exist node_modules\vite (
  echo Installing required packages...
  call npm install
  if errorlevel 1 (
    echo.
    echo Installation failed.
    pause
    exit /b 1
  )
)

echo.
echo Control panel: http://127.0.0.1:5173/
echo OBS overlay:  http://127.0.0.1:5173/overlay
echo.
start "" http://127.0.0.1:5173/
call npm run dev -- --host 127.0.0.1
pause
