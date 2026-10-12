@echo off
setlocal
cd /d "%~dp0"
title The Masses' Travels - Local Interactive Edition
where node >nul 2>nul
if errorlevel 1 goto missing_node
if not exist "dist\index.html" goto build
goto run
:build
echo Building the project...
call npm ci
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
:run
node scripts\serve.mjs --open
if errorlevel 1 goto failed
exit /b 0
:missing_node
echo Please install Node.js 24 LTS from https://nodejs.org/
goto failed
:failed
echo.
echo Could not start. Please copy the error above.
pause
exit /b 1
