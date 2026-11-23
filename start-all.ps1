# AgentP - Start All Services (PowerShell)
# Run with: .\start-all.ps1

$Host.UI.RawUI.WindowTitle = "AgentP - Launcher"

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                    AgentP - Launcher                      ║" -ForegroundColor Cyan
Write-Host "  ║═══════════════════════════════════════════════════════════║" -ForegroundColor Cyan
Write-Host "  ║  Backend    (Express/MongoDB)     -  http://localhost:3000 ║" -ForegroundColor White
Write-Host "  ║  AI Service (LLM/RAG)             -  http://localhost:3001 ║" -ForegroundColor White
Write-Host "  ║  Frontend   (React/Vite)          -  http://localhost:5173 ║" -ForegroundColor White
Write-Host "  ║  UI Tests   (Browser-Use Agent)   -  http://localhost:3002 ║" -ForegroundColor White
Write-Host "  ╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found. Please install Node.js first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

Write-Host "[INFO] Starting all services..." -ForegroundColor Green
Write-Host ""

# Function to start service in new window
function Start-Service {
    param (
        [string]$Name,
        [string]$Path,
        [string]$Port
    )
    
    $title = "AgentP - $Name ($Port)"
    $cmd = "cd '$Path'; Write-Host 'Starting $Name on port $Port...' -ForegroundColor Green; npm run dev"
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd -WindowStyle Normal
}

# Start Backend (port 3000)
Write-Host "[1/4] Starting Backend..." -ForegroundColor Yellow
Start-Service -Name "Backend" -Path "$RootDir\backend" -Port "3000"
Start-Sleep -Seconds 2

# Start AI Service (port 3001)
Write-Host "[2/4] Starting AI Service..." -ForegroundColor Yellow
Start-Service -Name "AI Service" -Path "$RootDir\ai" -Port "3001"
Start-Sleep -Seconds 2

# Start UI Test Service (port 3002)
Write-Host "[3/4] Starting UI Test Service..." -ForegroundColor Yellow
Start-Service -Name "UI Tests" -Path "$RootDir\ui_test" -Port "3002"
Start-Sleep -Seconds 2

# Start Frontend (port 5173)
Write-Host "[4/4] Starting Frontend..." -ForegroundColor Yellow
Start-Service -Name "Frontend" -Path "$RootDir\frontend" -Port "5173"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host " All services started in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host " Services:" -ForegroundColor White
Write-Host "   - Backend:    http://localhost:3000  (API Docs: /api-docs)" -ForegroundColor Gray
Write-Host "   - AI Service: http://localhost:3001  (Swagger: /docs)" -ForegroundColor Gray
Write-Host "   - Frontend:   http://localhost:5173" -ForegroundColor Gray
Write-Host "   - UI Tests:   http://localhost:3002  (Swagger: /docs)" -ForegroundColor Gray
Write-Host ""
Write-Host " Press Enter to open Frontend in browser..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green

Read-Host

# Open frontend in default browser
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "[INFO] To stop all services, run: .\stop-all.ps1" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"

