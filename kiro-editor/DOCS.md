# Astro Editor — Documentacion del Proyecto

![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange?style=flat-square&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-stable-dea584?style=flat-square&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Monaco](https://img.shields.io/badge/Monaco_Editor-latest-purple?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Windows-0078d4?style=flat-square&logo=windows&logoColor=white)
![RAM](https://img.shields.io/badge/RAM-~10MB-green?style=flat-square)
![EXE](https://img.shields.io/badge/EXE-~3MB-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)

## Descripcion General

Astro Editor es un editor de codigo ligero (~10MB RAM, ~3MB EXE) construido con **Tauri 2** (Rust backend) y **React + Monaco Editor** (frontend). Diseñado para ser rapido, visualmente atractivo con efectos acrilicos/blur, y extensible mediante temas y una futura API de extensiones.

---

## Arquitectura

```
astro-editor/
│
├── 📂 src/
│   ├── 📄 App.tsx
│   ├── 🎨 App.css
│   ├── 📄 main.tsx
│   ├── 📄 types.ts
│   ├── 🎨 themes.ts
│   │
│   ├── 📂 utils/
│   │   ├── 🧩 completions.ts
│   │   ├── 🧩 language.ts
│   │   ├── 🧩 lsp-client.ts
│   │   └── 🧩 lsp-monaco-bridge.ts
│   │
│   └── 📂 components/
│       ├── 📂 ActivityBar/
│       ├── 📂 AIPanel/
│       ├── 📂 CodeEditor/
│       ├── 📂 CommandPalette/
│       ├── 📂 ContextMenu/
│       ├── 📂 DebugPanel/
│       ├── 📂 EditorCommandPalette/
│       ├── 📂 ExtensionsPanel/
│       ├── 📂 FileExplorer/
│       ├── 📂 GitPanel/
│       ├── 📂 SearchPanel/
│       ├── 📂 SettingsPanel/
│       ├── 📂 StatusBar/
│       ├── 📂 TabBar/
│       ├── 📂 Terminal/
│       └── 📂 TitleBar/
│
├── 📂 src-tauri/
│   ├── 📂 src/
│   │   ├── 🦀 main.rs
│   │   ├── 🦀 lib.rs
│   │   ├── 🦀 terminal.rs
│   │   └── 🦀 lsp.rs
│   ├── 📄 Cargo.toml
│   └── 📄 tauri.conf.json
│
├── 📂 scripts/
│   └── ⚡ astro.ps1
│
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 vite.config.ts
└── 📄 DOCS.md
```

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Editor | Monaco Editor (@monaco-editor/react) |
| Backend | Rust, Tauri 2 |
| Terminal | PTY (Windows ConPTY) |
| Temas | Sistema custom con CSS variables |
| Blur/Acrylic | window-vibrancy (nativo) + CSS backdrop-filter |
| Iconos | Lucide React |
| LSP | JSON-RPC over stdio (preparado, no activo aun) |

---

## Sistema de Temas

### Estructura

Cada tema define un objeto `ThemeColors` con tokens organizados por categoria:

```typescript
interface ThemeColors {
  // Base / Global
  'base.background': string;
  'base.foreground': string;
  'base.accent': string;
  // Editor
  'editor.background': string;
  'editor.foreground': string;
  // Sidebar
  'sidebar.background': string;
  'sidebar.acrylicTop': string;
  'sidebar.acrylicMid': string;
  'sidebar.acrylicBottom': string;
  // Titlebar, Tabs, Statusbar, Semantic...
}
```

### Temas incluidos

- Kiro Dark (default)
- VS Code Dark+
- VS Dark Experimental (2026 Dark)
- Dracula
- Gruvbox Dark
- Catppuccin Mocha
- Nord
- Solarized Dark
- VS Code Light+
- One Dark Pro (+ Darker, Flat, Vivid)

### Crear un tema nuevo

1. Definir `ThemeColors` con todos los tokens
2. Usar `colorsToVars(colors)` para generar CSS variables
3. Agregar el objeto al array `THEMES` en `themes.ts`
4. Agregar colores de terminal en `TERMINAL_COLORS`

---

## IntelliSense / Autocompletado

### Funcionamiento actual

- **TypeScript/JavaScript**: IntelliSense nativo de Monaco (compilador TS en web worker) — tipos, imports, hover, go-to-definition
- **Otros lenguajes**: Snippets + keywords + word-based suggestions

### Snippets soportados (14 lenguajes)

JavaScript/TypeScript, HTML, CSS/SCSS/LESS, Python, Rust, Go, Java, C/C++, PHP, Ruby, SQL, Shell/Bash, Kotlin, Swift, Dart

### Cada lenguaje incluye:

1. **Snippets** — templates completos (funciones, clases, loops, etc.)
2. **Keywords** — todas las palabras reservadas del lenguaje
3. **Built-ins** — funciones/tipos/modulos comunes
4. **Document words** — variables y funciones que defines en el archivo actual

### LSP (preparado, no activo)

El backend tiene un `LspManager` en Rust que puede:
- Arrancar language servers (pyright, rust-analyzer, csharp-ls, gopls, clangd, etc.)
- Comunicarse via JSON-RPC over stdio
- Enviar requests (completion, hover, definition) y recibir respuestas

Desactivado temporalmente porque usa I/O bloqueante. Se necesita migrar a async (tokio) para que no congele la UI.

---

## Configuracion (Settings)

### Archivo

Se guarda en: `%APPDATA%/kiro-editor/settings.json`

### Opciones disponibles

| Setting | Tipo | Default |
|---------|------|---------|
| `editor.fontSize` | number | 14 |
| `editor.tabSize` | number | 2 |
| `editor.wordWrap` | 'on'\|'off' | 'off' |
| `editor.minimap` | boolean | true |
| `editor.lineNumbers` | 'on'\|'off'\|'relative' | 'on' |
| `editor.fontFamily` | string | Cascadia Code, Fira Code... |
| `editor.fontLigatures` | boolean | true |
| `editor.formatOnSave` | boolean | false |
| `editor.cursorStyle` | 'line'\|'block'\|'underline' | 'line' |
| `editor.renderWhitespace` | string | 'selection' |
| `workbench.colorTheme` | string | 'kiro-dark' |
| `workbench.sidebarWidth` | number | 220 |
| `workbench.sidebarPosition` | 'left'\|'right' | 'right' |
| `workbench.acrylic` | boolean | true |
| `workbench.acrylicOpacity` | number | 0.35 |
| `workbench.nativeFrame` | boolean | false |
| `workbench.aiPanelPosition` | 'left'\|'right' | 'right' |
| `workbench.aiPanelWidth` | number | 320 |
| `workbench.trafficLightPosition` | 'left'\|'right' | 'left' |

---

## Persistencia

- **Workspace**: Se guarda la ultima carpeta abierta en `%APPDATA%/kiro-editor/workspace.txt`
- **Auto-save**: Los archivos dirty se guardan automaticamente 500ms despues del ultimo cambio (afterDelay)
- **Settings**: Se guardan con Ctrl+S desde el panel de configuracion

---

## Atajos de teclado

| Atajo | Accion |
|-------|--------|
| `Ctrl+S` | Guardar |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+W` | Cerrar tab |
| `Ctrl+,` | Configuracion |
| `` Ctrl+` `` | Toggle terminal |
| `Ctrl+Shift+A` | Toggle panel IA |
| `Ctrl+K → T` | Paleta de temas |
| `F1` | Paleta de comandos del editor |
| `Ctrl+F` | Buscar |
| `Shift+Alt+F` | Formatear documento |
| `F2` | Renombrar simbolo |

---

## Script de Automatizacion

```powershell
.\scripts\astro.ps1 dev        # Modo desarrollo
.\scripts\astro.ps1 build      # Compilar instalador MSI
.\scripts\astro.ps1 check      # Verificar TS + Rust
.\scripts\astro.ps1 clean      # Limpiar artefactos
.\scripts\astro.ps1 clean-all  # Limpiar todo (+ node_modules)
.\scripts\astro.ps1 install    # Instalar dependencias
.\scripts\astro.ps1 lint       # Lint (tsc + clippy)
.\scripts\astro.ps1 size       # Ver tamano del build
.\scripts\astro.ps1 run        # Compilar y ejecutar release
```

---

## Optimizacion de Build

El perfil release en `Cargo.toml`:

```toml
[profile.release]
opt-level = "z"        # Optimizar para tamano minimo
lto = true             # Link-Time Optimization
codegen-units = 1      # Mejor optimizacion global
strip = true           # Quitar simbolos de debug
panic = "abort"        # Menos codigo de panic
```

Resultado: **~3 MB** el ejecutable, **~1.75 MB** el instalador MSI.

---

## Componentes Principales

### TitleBar
- Botones de ventana estilo macOS (traffic lights) configurables izquierda/derecha
- Menu dropdown con blur (File, Edit, Selection, View, Terminal, Help)
- Center clickeable que abre la EditorCommandPalette
- Icono SVG de universo/galaxia

### CodeEditor
- Wrapper de Monaco con opciones agresivas de IntelliSense
- Context menu custom con blur (reemplaza el nativo de Monaco)
- Paleta de comandos custom con blur (F1)
- Auto-completado: snippets + keywords + built-ins + document words
- Soporte JSX/TSX con configuracion de compilador TS

### EditorCommandPalette
- Se renderiza como portal al `<body>` (fuera del DOM del editor)
- Backdrop-filter blur funcional
- Lista todas las acciones de Monaco + acciones custom
- Busqueda fuzzy, navegacion con flechas, Enter para ejecutar
- No bloquea scroll del editor de fondo
- Se cierra con click fuera o Escape

### ContextMenu
- Reemplaza el context menu nativo de Monaco (que no soporta blur)
- Portal al `<body>` para que backdrop-filter funcione
- Opciones: Go to Definition, References, Rename, Format, Cut/Copy/Paste

### AIPanel (Astro Quasar)
- Animacion de entrada tipo "cohete chocando con agujero negro"
- Modos: Engineer, Ask, Plan
- Modelos: GPT-4o, Claude 4 Sonnet/Opus, Gemini, DeepSeek, Ollama local
- Fade-in escalonado de elementos

---

## Futuro / Roadmap

- [ ] API de extensiones (temas, snippets, comandos custom)
- [ ] LSP async con tokio (IntelliSense real para Python, Rust, C#, Go)
- [ ] Git integration funcional (diff, commit, push)
- [ ] Marketplace de temas/extensiones
- [ ] Multi-cursor avanzado
- [ ] Split view / paneles multiples
- [ ] Soporte remoto (SSH/containers)
- [ ] AI code completion (integrar modelo local o API)
