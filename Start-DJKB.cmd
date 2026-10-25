@echo off
cd /d "%~dp0"
if not exist data\accounts.json node scripts\setup.mjs
if errorlevel 1 exit /b 1
node server\main.mjs --lan
pause
