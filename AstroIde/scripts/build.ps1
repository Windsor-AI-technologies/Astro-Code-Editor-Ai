param(
    [string]$Command = "help"
)

function Start-Build {
    cls
    Write-Host " Compilando Astro Editor (release optimizado)..." -ForegroundColor Yellow
    Write-Host ""
    # Asegurar que estamos en el directorio del proyecto
    $projectDir = Split-Path -Parent $PSScriptRoot
    Push-Location $projectDir
    try {
        $start = Get-Date
        npx tauri build
        $elapsed = (Get-Date) - $start
        Write-Host ""
        Write-Host " Build completado en $([math]::Round($elapsed.TotalSeconds, 1))s" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Show-Help {
    Write-Host "Uso del script:" -ForegroundColor Cyan
    Write-Host "  .\scripts\dev.ps1 -Command dev  -> Inicia desarrollo" -ForegroundColor Gray
}

if([string]::IsNullOrEmpty($Command)) {$Command = "build"}
if([string]::IsNullOrEmpty($Command)) {$Command = "build"}

switch ($Command.ToLower()){
    "build" {Start-Build}
    "help" {Show-Help}
    default {
         Write-Host "Comando desconocido: $Command" -ForegroundColor Red
        Show-Help 
    }
}