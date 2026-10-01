#!/bin/zsh

# Detener el script si ocurre un error inesperado
set -e

# Cargar módulo de colores nativo de Zsh
autoload -U colors && colors

# Leer el parámetro
COMMAND=$1

# --- BÚSQUEDA AUTOMÁTICA DE LA RAÍZ DEL PROYECTO ---
# Busca hacia arriba hasta encontrar el directorio que contiene la carpeta 'src-tauri'
CURRENT_DIR=${0:A:h}
PROJECT_DIR=""

while [[ "$CURRENT_DIR" != "/" ]]; do
    if [[ -d "$CURRENT_DIR/src-tauri" ]]; then
        PROJECT_DIR="$CURRENT_DIR"
        break
    fi
    CURRENT_DIR=$(dirname "$CURRENT_DIR")
done

# Si no encuentra 'src-tauri', abortamos con un mensaje claro
if [[ -z "$PROJECT_DIR" ]]; then
    print -P "%F{red}Error: No se encontró la carpeta raíz del proyecto Astro con 'src-tauri'.%f"
    exit 1
fi
# --------------------------------------------------

start_build() {
    clear
    print -P "%F{yellow} Compilando Astro Editor (release optimizado)...%f"
    print ""
    
    # Navegación aislada usando subshell de Zsh en la raíz detectada
    (
        cd "$PROJECT_DIR"
        START_TIME=$SECONDS 
        
        if npx tauri build; then
            ELAPSED=$(( SECONDS - START_TIME ))
            print ""
            print -P "%F{green} Build completado en ${ELAPSED}s%f"
        else
            print ""
            print -P "%F{red} Error durante la compilación.%f"
            exit 1
        fi
    )
}

show_help() {
    print -P "%F{cyan}Uso del script:%f"
    print "  ./build.sh dev  -> Inicia desarrollo"
}

# Validación por defecto si la variable está vacía
if [[ -z "$COMMAND" ]]; then
    COMMAND="build"
fi

# Convertir comando a minúsculas
CMD_LOWER=${COMMAND:l}

case "$CMD_LOWER" in
    "build")
        start_build
        ;;
    "help")
        show_help
        ;;
    *)
        print -P "%F{red}Comando desconocido: $COMMAND%f"
        show_help
        ;;
esac
