@echo off
title AgentP - Start All Services
color 0A

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║                    AgentP - Launcher                      ║
echo  ║═══════════════════════════════════════════════════════════║
echo  ║  Backend    (Express/MongoDB)     -  http://localhost:3000 ║
echo  ║  AI Service (LLM/RAG)             -  http://localhost:3001 ║
echo  ║  Frontend   (React/Vite)          -  http://localhost:5173 ║
echo  ║  UI Tests   (Browser-Use Agent)   -  http://localhost:3002 ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

:: Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

:: Get the directory where the script is located
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo [INFO] Cleaning up old processes on ports...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
echo [INFO] Ports cleaned.
echo.

echo [INFO] Starting all services...
echo.

:: Start Backend (port 3000)
echo [1/4] Starting Backend...
start "AgentP - Backend (3000)" cmd /k "cd /d %ROOT_DIR%backend && echo Starting Backend on port 3000... && npm run dev"
timeout /t 2 /nobreak >nul

:: Start AI Service (port 3001)
echo [2/4] Starting AI Service...
start "AgentP - AI Service (3001)" cmd /k "cd /d %ROOT_DIR%ai && echo Starting AI Service on port 3001... && npm run dev"
timeout /t 2 /nobreak >nul

:: Start UI Test Service (port 3002)
echo [3/4] Starting UI Test Service...
start "AgentP - UI Tests (3002)" cmd /k "cd /d %ROOT_DIR%ui_test && echo Starting UI Test Service on port 3002... && npm run dev"
timeout /t 2 /nobreak >nul

:: Start Frontend (port 5173)
echo [4/4] Starting Frontend...
start "AgentP - Frontend (5173)" cmd /k "cd /d %ROOT_DIR%frontend && echo Starting Frontend on port 5173... && npm run dev"

echo.
echo ═══════════════════════════════════════════════════════════════
echo  All services started in separate windows!
echo.
echo  Services:
echo    - Backend:    http://localhost:3000  (API Docs: /api-docs)
echo    - AI Service: http://localhost:3001  (Swagger: /docs)
echo    - Frontend:   http://localhost:5173
echo    - UI Tests:   http://localhost:3002  (Swagger: /docs)
echo.
echo  Press any key to open Frontend in browser...
echo ═══════════════════════════════════════════════════════════════
pause >nul

:: Open frontend in default browser
start "" "http://localhost:5173"

echo.
echo [INFO] To stop all services, close each terminal window.
echo.
pause

