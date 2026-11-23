@echo off
title AgentP - Port Diagnostics
color 0B

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║              AgentP - Port Diagnostics                    ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

echo Checking ports...
echo.

echo ══════════════════════════════════════════════════════════════
echo  Port 3000 (Backend)
echo ══════════════════════════════════════════════════════════════
netstat -aon | findstr :3000 | findstr LISTENING
if %ERRORLEVEL% neq 0 echo   [NOT RUNNING]
echo.

echo ══════════════════════════════════════════════════════════════
echo  Port 3001 (AI Service)
echo ══════════════════════════════════════════════════════════════
netstat -aon | findstr :3001 | findstr LISTENING
if %ERRORLEVEL% neq 0 echo   [NOT RUNNING]
echo.

echo ══════════════════════════════════════════════════════════════
echo  Port 3002 (UI Tests)
echo ══════════════════════════════════════════════════════════════
netstat -aon | findstr :3002 | findstr LISTENING
if %ERRORLEVEL% neq 0 echo   [NOT RUNNING]
echo.

echo ══════════════════════════════════════════════════════════════
echo  Port 5173 (Frontend)
echo ══════════════════════════════════════════════════════════════
netstat -aon | findstr :5173 | findstr LISTENING
if %ERRORLEVEL% neq 0 echo   [NOT RUNNING]
echo.

echo ══════════════════════════════════════════════════════════════
echo  Port 3003 (SHOULD NOT BE USED)
echo ══════════════════════════════════════════════════════════════
netstat -aon | findstr :3003 | findstr LISTENING
if %ERRORLEVEL% neq 0 (
    echo   [OK - Not in use]
) else (
    echo   [WARNING] Something is running on 3003!
)
echo.

echo ══════════════════════════════════════════════════════════════
echo  Testing connectivity...
echo ══════════════════════════════════════════════════════════════
echo.

curl -s -o nul -w "Backend (3000):    %%{http_code}\n" http://localhost:3000/health 2>nul || echo Backend (3000):    OFFLINE
curl -s -o nul -w "AI Service (3001): %%{http_code}\n" http://localhost:3001/health 2>nul || echo AI Service (3001): OFFLINE
curl -s -o nul -w "UI Tests (3002):   %%{http_code}\n" http://localhost:3002/docs 2>nul || echo UI Tests (3002):   OFFLINE
curl -s -o nul -w "Frontend (5173):   %%{http_code}\n" http://localhost:5173 2>nul || echo Frontend (5173):   OFFLINE

echo.
echo ══════════════════════════════════════════════════════════════
echo  Done! Press any key to exit.
echo ══════════════════════════════════════════════════════════════
pause >nul

