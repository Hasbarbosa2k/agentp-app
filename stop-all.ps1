# AgentP - Stop All Services (PowerShell)
# Run with: .\stop-all.ps1

$Host.UI.RawUI.WindowTitle = "AgentP - Stop Services"

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "  ║              AgentP - Stop All Services                   ║" -ForegroundColor Red
Write-Host "  ╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

$ports = @(3000, 3001, 3002, 5173)
$portNames = @{
    3000 = "Backend"
    3001 = "AI Service"
    3002 = "UI Tests"
    5173 = "Frontend"
}

$count = 1
foreach ($port in $ports) {
    $name = $portNames[$port]
    Write-Host "[$count/4] Stopping $name (port $port)..." -ForegroundColor Yellow
    
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            try {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "      Killed process $($conn.OwningProcess)" -ForegroundColor Gray
            } catch {
                # Process already stopped
            }
        }
    } else {
        Write-Host "      No process found on port $port" -ForegroundColor Gray
    }
    
    $count++
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host " All AgentP services stopped!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"

