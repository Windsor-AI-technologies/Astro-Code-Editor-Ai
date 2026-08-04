# ═══════════════════════════════════════════════════════════════════════════════
# Astro Editor — Script de automatización
# Uso: .\scripts\astro.ps1 <comando>
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Show-Help {
    Write-Host ""
    Write-Host "  Astro Editor - Comandos disponibles" -ForegroundColor Cyan
    Write-Host "  ═══════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  dev        " -NoNewline -ForegroundColor Green; Write-Host "Inicia el modo desarrollo (frontend + Tauri)"
    Write-Host "  build      " -NoNewline -ForegroundColor Green; Write-Host "Compila el instalador (MSI) optimizado"
    Write-Host "  check      " -NoNewline -ForegroundColor Green; Write-Host "Verifica TypeScript + Rust sin compilar"
    Write-Host "  clean      " -NoNewline -ForegroundColor Green; Write-Host "Limpia artefactos de build (target, dist, cache)"
    Write-Host "  clean-all  " -NoNewline -ForegroundColor Green; Write-Host "Limpia todo incluyendo node_modules"
    Write-Host "  install    " -NoNewline -ForegroundColor Green; Write-Host "Instala dependencias (npm + cargo)"
    Write-Host "  lint       " -NoNewline -ForegroundColor Green; Write-Host "Ejecuta TypeScript check + Cargo clippy"
    Write-Host "  size       " -NoNewline -ForegroundColor Green; Write-Host "Muestra el tamaño del ejecutable y MSI"
    Write-Host "  run        " -NoNewline -ForegroundColor Green; Write-Host "Compila y ejecuta en modo release"
    Write-Host "  help       " -NoNewline -ForegroundColor Green; Write-Host "Muestra esta ayuda"
    Write-Host ""
}


function Start-Build {
    Write-Host " Compilando Astro Editor (release optimizado)..." -ForegroundColor Yellow
    Write-Host ""
    $start = Get-Date
    npx tauri build
    $elapsed = (Get-Date) - $start
    Write-Host ""
    Write-Host " Build completado en $([math]::Round($elapsed.TotalSeconds, 1))s" -ForegroundColor Green
    Show-Size
}

function Start-Check {
    Write-Host " Verificando TypeScript..." -ForegroundColor Yellow
    npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) { Write-Host " TypeScript: errores encontrados" -ForegroundColor Red; exit 1 }
    Write-Host " TypeScript: OK" -ForegroundColor Green
    
    Write-Host " Verificando Rust..." -ForegroundColor Yellow
    Push-Location "$Root\src-tauri"
    cargo check
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host " Rust: errores encontrados" -ForegroundColor Red; exit 1 }
    Pop-Location
    Write-Host " Rust: OK" -ForegroundColor Green
}

function Start-Clean {
    Write-Host " Limpiando artefactos..." -ForegroundColor Yellow
    
    if (Test-Path "$Root\dist") { Remove-Item -Recurse -Force "$Root\dist"; Write-Host "  dist/" -ForegroundColor DarkGray }
    if (Test-Path "$Root\src-tauri\target\release\bundle") { Remove-Item -Recurse -Force "$Root\src-tauri\target\release\bundle"; Write-Host "  target/release/bundle/" -ForegroundColor DarkGray }
    if (Test-Path "$Root\src-tauri\target\release\build") { Remove-Item -Recurse -Force "$Root\src-tauri\target\release\build"; Write-Host "  target/release/build/" -ForegroundColor DarkGray }
    
    # Limpiar archivos de debug
    Get-ChildItem "$Root\src-tauri\target\release\*.pdb" -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem "$Root\src-tauri\target\release\*.d" -ErrorAction SilentlyContinue | Remove-Item -Force
    
    Write-Host " Limpieza completada" -ForegroundColor Green
}

function Start-CleanAll {
    Start-Clean
    Write-Host " Limpiando node_modules y target completo..." -ForegroundColor Yellow
    
    if (Test-Path "$Root\node_modules") { Remove-Item -Recurse -Force "$Root\node_modules"; Write-Host "  node_modules/" -ForegroundColor DarkGray }
    if (Test-Path "$Root\src-tauri\target") { Remove-Item -Recurse -Force "$Root\src-tauri\target"; Write-Host "  src-tauri/target/" -ForegroundColor DarkGray }
    
    Write-Host " Todo limpio. Ejecuta 'astro install' para reinstalar." -ForegroundColor Green
}

function Start-Install {
    Write-Host " Instalando dependencias..." -ForegroundColor Yellow
    
    Write-Host "  npm install..." -ForegroundColor DarkGray
    npm install
    
    Write-Host "  cargo fetch..." -ForegroundColor DarkGray
    Push-Location "$Root\src-tauri"
    cargo fetch
    Pop-Location
    
    Write-Host " Dependencias instaladas" -ForegroundColor Green
}

function Start-Lint {
    Write-Host " Linting..." -ForegroundColor Yellow
    
    npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) { Write-Host " TypeScript lint falló" -ForegroundColor Red; exit 1 }
    Write-Host " TypeScript: sin errores" -ForegroundColor Green
    
    Push-Location "$Root\src-tauri"
    cargo clippy -- -D warnings 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        cargo clippy -- -D warnings
        Pop-Location
        Write-Host " Clippy: warnings encontrados" -ForegroundColor Yellow
    } else {
        Pop-Location
        Write-Host " Clippy: sin warnings" -ForegroundColor Green
    }
}

function Show-Size {
    Write-Host ""
    Write-Host " Tamaño del build:" -ForegroundColor Cyan
    
    $exe = "$Root\src-tauri\target\release\astro-editor.exe"
    $msi = Get-ChildItem "$Root\src-tauri\target\release\bundle\msi\*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if (Test-Path $exe) {
        $exeSize = [math]::Round((Get-Item $exe).Length / 1MB, 2)
        Write-Host "  EXE: ${exeSize} MB" -ForegroundColor White
    }
    if ($msi) {
        $msiSize = [math]::Round($msi.Length / 1MB, 2)
        Write-Host "  MSI: ${msiSize} MB ($($msi.Name))" -ForegroundColor White
    }
    Write-Host ""
}

function Start-Run {
    Write-Host " Compilando y ejecutando..." -ForegroundColor Yellow
    Push-Location "$Root\src-tauri"
    cargo run --release
    Pop-Location
}

# ── Ejecutar comando ──────────────────────────────────────────────────────────
switch ($Command.ToLower()) {
    "build"     { Start-Build }
    "check"     { Start-Check }
    "clean"     { Start-Clean }
    "clean-all" { Start-CleanAll }
    "install"   { Start-Install }
    "lint"      { Start-Lint }
    "size"      { Show-Size }
    "run"       { Start-Run }
    "help"      { Show-Help }
    default     { Write-Host " Comando desconocido: $Command" -ForegroundColor Red; Show-Help }
}
