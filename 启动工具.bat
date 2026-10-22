@echo off
chcp 65001 >nul
cd /d "%~dp0"
netstat -ano | findstr ":3210" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "douyin-tool" /min cmd /c "node server.js"
  timeout /t 3 >nul
)
start "" "http://127.0.0.1:3210"
exit
