@echo off
setlocal
cd /d "%~dp0"
if exist "node_modules" goto run
call npm ci
if errorlevel 1 goto failed
:run
call npm run dev -- --open
if errorlevel 1 goto failed
exit /b 0
:failed
pause
exit /b 1
