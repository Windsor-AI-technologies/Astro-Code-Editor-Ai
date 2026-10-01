param (
    [string]$Command = "dev"
)

function Start-Dev {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║       ASTRO IDE — DEV MODE        ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    $projectDir = Split-Path -Parent $PSScriptRoot
    $backendDir = "F:\Astro\AstroBackend"

    # 1. Start Backend (in background)
    Write-Host "  [1/2] Starting Backend (localhost:3001)..." -ForegroundColor Yellow
    # $backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; npm run dev" -PassThru -WindowStyle Normal

    Start-Sleep -Seconds 2

    # 2. Start Tauri Dev (foreground)
    Write-Host "  [2/2] Starting Tauri Dev..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Backend PID: $($backendJob.Id)" -ForegroundColor DarkGray
    Write-Host "  Press Ctrl+C to stop both." -ForegroundColor DarkGray
    Write-Host ""

    Push-Location $projectDir
    try {
        npx tauri dev && npm run backend
    } finally {
        # Kill backend when Tauri exits
        Write-Host ""
        Write-Host "  Stopping backend..." -ForegroundColor Yellow
        Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue
        Pop-Location
        Write-Host "  Done." -ForegroundColor Green
    }
}

function Show-Help {
    Write-Host ""
    Write-Host "  Astro IDE Scripts" -ForegroundColor Cyan
    Write-Host "  ─────────────────" -ForegroundColor DarkGray
    Write-Host "  .\scripts\dev.ps1 -Command dev   -> Start dev (backend + tauri)" -ForegroundColor Gray
    Write-Host "  .\scripts\dev.ps1 -Command help  -> Show this help" -ForegroundColor Gray
    Write-Host ""
}

if ([string]::IsNullOrEmpty($Command)) { $Command = "dev" }

switch ($Command.ToLower()) {
    "dev"     { Start-Dev }
    "help"    { Show-Help }
    default   { 
        Write-Host "  Unknown command: $Command" -ForegroundColor Red
        Show-Help 
    }
}
