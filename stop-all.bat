@echo off
title AgentP - Stop All Services
color 0C

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║              AgentP - Stop All Services                   ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

echo [INFO] Stopping all Node.js processes on AgentP ports...
echo.

:: Kill processes on specific ports
echo [1/4] Stopping Backend (port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo [2/4] Stopping AI Service (port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo [3/4] Stopping UI Tests (port 3002)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo [4/4] Stopping Frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo  All AgentP services stopped!
echo ═══════════════════════════════════════════════════════════════
echo.
pause

