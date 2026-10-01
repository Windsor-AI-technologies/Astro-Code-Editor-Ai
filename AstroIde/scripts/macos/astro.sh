#!/bin/zsh


#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Astro Editor — Script de automatización (Versión macOS/Linux)
# Uso: ./scripts/astro.sh <comando>
# ═══════════════════════════════════════════════════════════════════════════════

# Salir inmediatamente si un comando falla
set -e

# Obtener la ruta raíz del proyecto (equivalente a Split-Path en PS)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# Definición de Colores ANSI
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DARKGRAY='\033[1;30m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

COMMAND=${1:-"help"}

show_help() {
    echo -e ""
    echo -e "${CYAN}  Astro Editor - Comandos disponibles${NC}"
    echo -e "${DARKGRAY}  ═══════════════════════════════════════${NC}"
    echo -e ""
    echo -e "${GREEN}  dev        ${NC}Inicia el modo desarrollo (frontend + Tauri)"
    echo -e "${GREEN}  build      ${NC}Compila el instalador optimizado para macOS"
    echo -e "${GREEN}  check      ${NC}Verifica TypeScript + Rust sin compilar"
    echo -e "${GREEN}  clean      ${NC}Limpia artefactos de build (target, dist, cache)"
    echo -e "${GREEN}  clean-all  ${NC}Limpia todo incluyendo node_modules"
    echo -e "${GREEN}  install    ${NC}Instala dependencias (npm + cargo)"
    echo -e "${GREEN}  lint       ${NC}Ejecuta TypeScript check + Cargo clippy"
    echo -e "${GREEN}  size       ${NC}Muestra el tamaño del ejecutable y paquete"
    echo -e "${GREEN}  run        ${NC}Compila y ejecuta en modo release"
    echo -e "${GREEN}  help       ${NC}Muestra esta ayuda"
    echo -e ""
}

start_build() {
    echo -e "${YELLOW} Compilando Astro Editor (release optimizado)...${NC}"
    echo -e ""
    
    # Calcular tiempo transcurrido en macOS
    START_TIME=$(date +%s)
    
    npx tauri build
    
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    
    echo -e ""
    echo -e "${GREEN} Build completado en ${ELAPSED}s${NC}"
    show_size
}

start_check() {
    echo -e "${YELLOW} Verificando TypeScript...${NC}"
    npx tsc --noEmit || { echo -e "${RED} TypeScript: errores encontrados${NC}"; exit 1; }
    echo -e "${GREEN} TypeScript: OK${NC}"
    
    echo -e "${YELLOW} Verificando Rust...${NC}"
    cd "$ROOT/src-tauri"
    cargo check || { cd "$ROOT"; echo -e "${RED} Rust: errores encontrados${NC}"; exit 1; }
    cd "$ROOT"
    echo -e "${GREEN} Rust: OK${NC}"
}

start_clean() {
    echo -e "${YELLOW} Limpiando artefactos...${NC}"
    
    if [ -d "$ROOT/dist" ]; then rm -rf "$ROOT/dist"; echo -e "${DARKGRAY}  dist/${NC}"; fi
    if [ -d "$ROOT/src-tauri/target/release/bundle" ]; then rm -rf "$ROOT/src-tauri/target/release/bundle"; echo -e "${DARKGRAY}  target/release/bundle/${NC}"; fi
    if [ -d "$ROOT/src-tauri/target/release/build" ]; then rm -rf "$ROOT/src-tauri/target/release/build"; echo -e "${DARKGRAY}  target/release/build/${NC}"; fi
    
    # Limpiar archivos de debug sobrantes (equivalente a .d de Cargo)
    find "$ROOT/src-tauri/target/release" -maxdepth 1 -name "*.d" -delete 2>/dev/null || true
    
    echo -e "${GREEN} Limpieza completada${NC}"
}

start_clean_all() {
    start_clean
    echo -e "${YELLOW} Limpiando node_modules y target completo...${NC}"
    
    if [ -d "$ROOT/node_modules" ]; then rm -rf "$ROOT/node_modules"; echo -e "${DARKGRAY}  node_modules/${NC}"; fi
    if [ -d "$ROOT/src-tauri/target" ]; then rm -rf "$ROOT/src-tauri/target"; echo -e "${DARKGRAY}  src-tauri/target/${NC}"; fi
    
    echo -e "${GREEN} Todo limpio. Ejecuta 'astro install' para reinstalar.${NC}"
}

start_install() {
    echo -e "${YELLOW} Instalando dependencias...${NC}"
    
    echo -e "${DARKGRAY}  npm install...${NC}"
    npm install
    
    echo -e "${DARKGRAY}  cargo fetch...${NC}"
    cd "$ROOT/src-tauri"
    cargo fetch
    cd "$ROOT"
    
    echo -e "${GREEN} Dependencias instaladas${NC}"
}

start_lint() {
    echo -e "${YELLOW} Linting...${NC}"
    
    npx tsc --noEmit || { echo -e "${RED} TypeScript lint falló${NC}"; exit 1; }
    echo -e "${GREEN} TypeScript: sin errores${NC}"
    
    cd "$ROOT/src-tauri"
    # Ejecutar clippy de forma silenciosa primero para emular tu comportamiento original
    if ! cargo clippy -- -D warnings > /dev/null 2>&1; then
        cargo clippy -- -D warnings
        cd "$ROOT"
        echo -e "${YELLOW} Clippy: warnings/errores encontrados${NC}"
    else
        cd "$ROOT"
        echo -e "${GREEN} Clippy: sin warnings${NC}"
    fi
}

show_size() {
    echo -e ""
    echo -e "${CYAN} Tamaño del build:${NC}"
    
    # En macOS Tauri genera un binario plano y una app bundle (.app o .dmg)
    BINARY="$ROOT/src-tauri/target/release/astro-editor"
    APP_BUNDLE=$(find "$ROOT/src-tauri/target/release/bundle" -type d -name "*.app" 2>/dev/null | head -n 1)
    DMG_PKG=$(find "$ROOT/src-tauri/target/release/bundle" -type f \( -name "*.dmg" -o -name "*.deb" \) 2>/dev/null | head -n 1)
    
    if [ -f "$BINARY" ]; then
        # Obtener tamaño en MB usando 'du' compatible con macOS y Linux
        SIZE=$(du -m "$BINARY" | cut -f1)
        echo -e "${WHITE}  Binario: ${SIZE} MB${NC}"
    fi
    
    if [ -n "$APP_BUNDLE" ] && [ -d "$APP_BUNDLE" ]; then
        SIZE=$(du -sm "$APP_BUNDLE" | cut -f1)
        echo -e "${WHITE}  APP Bundle: ${SIZE} MB ($(basename "$APP_BUNDLE"))${NC}"
    fi

    if [ -n "$DMG_PKG" ] && [ -f "$DMG_PKG" ]; then
        SIZE=$(du -m "$DMG_PKG" | cut -f1)
        echo -e "${WHITE}  Paquete: ${SIZE} MB ($(basename "$DMG_PKG"))${NC}"
    fi
    echo -e ""
}

start_run() {
    echo -e "${YELLOW} Compilando y ejecutando...${NC}"
    cd "$ROOT/src-tauri"
    cargo run --release
    cd "$ROOT"
}

start_dev() {
    echo -e "${YELLOW} Iniciando entorno de desarrollo...${NC}"
    npx tauri dev
}

# ── Ejecutar comando ──────────────────────────────────────────────────────────
# Convertir a minúsculas
CMD_LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')

case "$CMD_LOWER" in
    "dev")
        start_dev
        ;;
    "build")
        start_build
        ;;
    "check")
        # Desactivamos temporalmente 'set -e' para que check controle sus propios errores
        set +e
        start_check
        set -e
        ;;
    "clean")
        start_clean
        ;;
    "clean-all")
        start_clean_all
        ;;
    "install")
        start_install
        ;;
    "lint")
        set +e
        start_lint
        set -e
        ;;
    "size")
        show_size
        ;;
    "run")
        start_run
        ;;
    "help")
        show_help
        ;;
    *)
        echo -e "${RED} Comando desconocido: $COMMAND${NC}"
        show_help
        ;;
esac
