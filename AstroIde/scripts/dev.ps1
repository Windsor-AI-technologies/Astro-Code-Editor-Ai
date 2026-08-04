param (
    [string]$Command = "help"
)

function Start-dev {
    Write-Host "Iniciando modo desarrollo..." -ForegroundColor Yellow
    # Asegurar que estamos en el directorio del proyecto (donde está package.json)
    $scriptDir = Split-Path -Parent $PSScriptRoot
    Push-Location $scriptDir
    try {
        npx tauri dev
    } finally {
        Pop-Location
    }
}

function Show-Help {
    Write-Host "Uso del script:" -ForegroundColor Cyan
    Write-Host "  .\scripts\dev.ps1 -Command dev  -> Inicia desarrollo" -ForegroundColor Gray
}

# Forzar valor seguro si llega vacío
if ([string]::IsNullOrEmpty($Command)) { $Command = "dev" }
if([string]::IsNullOrEmpty($Command)) {$Command = "help"}

switch ($Command.ToLower()) {
    "dev"   { Start-dev }
    "help" {Show-Help}
    default { 
        Write-Host "Comando desconocido: $Command" -ForegroundColor Red
        Show-Help 
    }
}
