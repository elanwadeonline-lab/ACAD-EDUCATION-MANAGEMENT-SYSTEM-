@echo off
setlocal
title ExamPool LAN Server

echo ========================================================
echo           EXAMPOOL LAN ^& LOCAL SERVER
echo ========================================================
echo.
echo Starting ExamPool server on port 8001...
echo Once started, you can access the portal at:
echo   - This PC:    http://localhost:8001
echo   - Zero-Config: http://exampool.local:8001
echo   - Local LAN:  (check the Wi-Fi IP address printed below)
echo.

bun --env-file=.env server.ts
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server exited with code %ERRORLEVEL%.
    pause
)
