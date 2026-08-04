# Astro Editor — Documentacion del Proyecto

![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange?style=flat-square&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-stable-dea584?style=flat-square&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Monaco](https://img.shields.io/badge/Monaco_Editor-latest-purple?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Windows-0078d4?style=flat-square&logo=windows&logoColor=white)
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

### App.tsx — Componente Raiz

El cerebro de la aplicacion. Controla todo el estado global y el layout.

**States principales:**

| State | Tipo | Funcion |
|-------|------|---------|
| `rootPath` | `string \| null` | Ruta de la carpeta abierta |
| `tree` | `FileEntry[]` | Arbol de archivos del explorador |
| `tabs` | `Tab[]` | Pestañas abiertas |
| `activeTabId` | `string \| null` | Tab activa |
| `settings` | `AppSettings` | Configuracion completa del editor |
| `terminalVisible` | `boolean` | Visibilidad de la terminal |
| `aiPanelVisible` | `boolean` | Visibilidad del panel IA |
| `activeView` | `string` | Vista activa del sidebar (files, git, debug...) |
| `sidebarVisible` | `boolean` | Sidebar visible o colapsado |
| `editorCmdPaletteOpen` | `boolean` | Paleta de comandos abierta |

**Funciones principales:**

| Funcion | Que hace |
|---------|----------|
| `handleOpenFolder()` | Abre carpeta, guarda workspace, carga arbol |
| `handleOpenFile()` | Abre archivo en nueva tab (o activa si ya existe) |
| `handleSave()` | Guarda archivo actual (con formatOnSave) |
| `handleNewFile()` | Crea tab sin-titulo |
| `handleCloseTab()` | Cierra tab (pide confirmacion si dirty) |
| `handleEditorChange()` | Marca tab como dirty al editar |
| `refreshTree()` | Recarga el arbol de archivos |

**Auto-save (afterDelay):**

```typescript
// Se ejecuta 500ms despues del ultimo cambio
useEffect(() => {
  const dirtyTabs = tabs.filter(t => t.isDirty && t.path);
  if (dirtyTabs.length === 0) return;
  // Timeout se resetea en cada cambio
  autoSaveTimerRef.current = setTimeout(async () => {
    // Guarda todos los tabs dirty
  }, 500);
}, [tabs, activeTabId]);
```

**Layout (orden de render):**

```tsx
<div class="app">
  <TitleBar />              ← Full width, arriba de todo
  <div class="app-body">   ← Flex row
    <ActivityBar />         ← Iconos laterales
    <AIPanel left? />       ← Panel IA (si posicion=left)
    <Sidebar />             ← Explorador/Git/Debug/etc
    <div class="main-column">
      <TabBar />            ← Pestañas
      <CodeEditor />        ← Monaco Editor
    </div>
    <Sidebar right? />      ← (si posicion=right)
    <AIPanel right? />      ← Panel IA (si posicion=right)
  </div>
  <TerminalPanel />         ← Terminal abajo
  <StatusBar />             ← Barra inferior
  <CommandPalette />        ← Modal temas
  <EditorCommandPalette />  ← Modal comandos (portal a body)
</div>
```

---

### CodeEditor.tsx — Editor de Codigo

Wrapper de Monaco Editor con IntelliSense mejorado.

**Responsabilidades:**
- Configura Monaco (TypeScript compiler, temas, snippets, keywords)
- Maneja context menu custom (click derecho)
- Paleta de comandos interna (F1)
- Sincroniza lenguaje del tab con el modelo de Monaco
- Muestra pantalla de bienvenida cuando no hay tab abierto

**handleBeforeMount** — Se ejecuta ANTES de montar Monaco:
```typescript
// 1. Registra todos los temas en Monaco
registerAllMonacoThemes(monaco);
// 2. Configura TypeScript compiler (JSX, ESNext, etc.)
tsDefaults.setCompilerOptions({...});
// 3. Registra snippets para 14 lenguajes
registerCompletionProviders(monaco);
// 4. Registra keywords y built-ins
registerLanguageKeywords(monaco);
```

**handleMount** — Se ejecuta al montar el editor:
```typescript
// 1. Guarda referencia al editor
editorRef.current = editor;
// 2. Registra atajos (Ctrl+S, Shift+Alt+F, Ctrl+K, F1)
// 3. Conecta context menu custom
editor.onContextMenu((e) => {
  setCtxMenu({ x: e.event.posx, y: e.event.posy });
});
```

**Opciones de Monaco (highlights):**
- `quickSuggestionsDelay: 10` — IntelliSense casi instantaneo
- `suggestSelection: 'recentlyUsedByPrefix'` — Prioriza lo que mas usas
- `linkedEditing: true` — Editar tag HTML cambia ambos
- `bracketPairColorization` — Colores en brackets
- `stickyScroll: false` — Desactivado para ahorrar RAM
- `fixedOverflowWidgets: true` — Widgets fuera del overflow

---

### themes.ts — Sistema de Temas

**Interfaces:**
```typescript
// Estructura tipada por categoria (para API futura)
interface ThemeColors {
  'base.background': string;
  'editor.background': string;
  'sidebar.background': string;
  'tab.activeBackground': string;
  // ...40+ tokens
}

// Definicion completa de un tema
interface ThemeDefinition {
  id: string;
  name: string;
  base: 'vs-dark' | 'vs' | 'hc-black';
  colors?: ThemeColors;        // Tipado (nuevo)
  vars: Record<string, string>; // CSS vars (retrocompatible)
  monaco: IStandaloneThemeData; // Colores Monaco
}
```

**Funciones:**
- `colorsToVars(colors)` — Convierte ThemeColors → CSS variables
- `applyTheme(id)` — Aplica CSS vars al `:root`
- `registerAllMonacoThemes(monaco)` — Registra todos los temas en Monaco
- `getTerminalColors(id)` — Colores para xterm.js
- `mkTheme(base, colors, rules)` — Helper que agrega widget/menu colors automaticamente

---

### completions.ts — IntelliSense (Snippets + Keywords)

**registerCompletionProviders(monaco):**
- Registra snippets para: JS/TS, HTML, CSS, Python, Rust, Go, Java, C/C++, PHP, Ruby, SQL, Shell, Kotlin, Swift, Dart
- Cada snippet tiene: prefix (trigger), label (descripcion), body (template con $1, $2, $0)

**registerLanguageKeywords(monaco):**
- Registra keywords del lenguaje (aparecen como tipo Keyword)
- Registra built-ins/funciones comunes (aparecen como tipo Function)
- Escanea el documento actual y propone variables/funciones definidas por el usuario (tipo Variable)

```typescript
// El provider escanea palabras del documento actual
const text = model.getValue();
const wordPattern = /\b[a-zA-Z_]\w{2,}\b/g;
// Las ofrece como sugerencias con prioridad alta
```

---

### lsp.rs — Language Server Protocol (Backend Rust)

**LspManager:**
- Mantiene un `HashMap<String, LspProcess>` de servers activos
- Cada `LspProcess` tiene stdin/stdout separados para comunicacion JSON-RPC

**Flujo de inicializacion:**
```
1. spawn proceso (pyright-langserver --stdio)
2. send "initialize" request con capabilities
3. read response (skipea notificaciones)
4. send "initialized" notification
5. Listo para requests
```

**Servers configurados (13):**
- typescript-language-server, pyright-langserver, rust-analyzer
- gopls, clangd, jdtls, intelephense, solargraph
- kotlin-language-server, dart language-server
- css-languageserver, html-languageserver, vscode-json-languageserver

**Estado actual:** Desactivado en frontend. La comunicacion es bloqueante (synchronous I/O). Necesita migrarse a async con tokio para no congelar la UI.

---

### TitleBar.tsx — Barra de Titulo

**Elementos:**
- Traffic lights macOS (cerrar/minimizar/maximizar) — posicion configurable
- Menu dropdown (File, Edit, Selection, View, Terminal, Help) con blur
- Center clickeable → abre EditorCommandPalette
- SVG universo/galaxia como icono de la app

**Traffic lights:**
```tsx
// Se posicionan segun prop trafficLightPosition
{trafficLightPosition === 'left' && trafficLights}
// ... menus ...
{trafficLightPosition === 'right' && trafficLights}
```

---

### EditorCommandPalette.tsx — Paleta de Comandos

**Caracteristicas:**
- Se renderiza como `createPortal(... , document.body)` — fuera del DOM del editor
- `backdrop-filter: blur(24px)` funcional (porque esta fuera del overflow:hidden)
- Lista todas las acciones de Monaco + acciones custom (formatear, buscar, undo, etc.)
- Busqueda fuzzy por label o id
- Navegacion: flechas arriba/abajo + Enter
- Se cierra: Escape o click fuera (mousedown listener global)
- No bloquea scroll del editor (overlay con pointer-events: none)

---

### ContextMenu.tsx — Menu Contextual Custom

**Por que existe:**
Monaco renderiza su context menu dentro del DOM del editor (overflow:hidden), lo que impide usar backdrop-filter blur. Este componente:
1. Desactiva el context menu nativo de Monaco (`contextmenu: false`)
2. Escucha `editor.onContextMenu` para capturar posicion
3. Renderiza un portal al `<body>` con blur funcional

**Opciones del menu:**
- Ir a definicion (Ctrl+F12)
- Ir a referencias (Shift+F12)
- Ir a simbolo (Ctrl+Shift+O)
- Renombrar (F2)
- Cambiar ocurrencias (Ctrl+F2)
- Formatear documento
- Cortar / Copiar / Pegar
- Paleta de comandos (F1)

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
