# Astro IDE

![Version](https://img.shields.io/badge/version-0.2.0-blue?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange?style=flat-square&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-stable-dea584?style=flat-square&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript&logoColor=white)

Editor de codigo nativo construido con Tauri 2 + React. Ligero (~10MB RAM), rapido, con efecto acrilico nativo y arquitectura SOLID.

---

## Arquitectura

El proyecto sigue principios SOLID con separacion clara entre logica, estado, conexion y UI:

```
src/
├── App.tsx                    ← Composition root (hooks + providers)
├── AppLayout.tsx              ← Layout puro (compone slots)
│
├── contexts/                  ← React Contexts (estado compartido)
│   ├── WorkspaceContext.tsx   ← rootPath, tree, openFolder
│   ├── TabsContext.tsx        ← tabs, activeTab, selectTab, closeTab
│   ├── SettingsContext.tsx    ← settings, themeId, updateSetting
│   ├── UIContext.tsx          ← paneles, sidebar, cursor, mensajes
│   └── ActionsContext.tsx     ← save, undo, redo, resize handlers
│
├── hooks/                     ← Logica de negocio (1 responsabilidad cada uno)
│   ├── useWorkspace.ts        ← Proyecto: abrir, cerrar, refresh tree
│   ├── useTabs.ts             ← Tabs: open, close, switch, dirty state
│   ├── useSettings.ts         ← Settings: load, save, apply theme
│   ├── useUIState.ts          ← UI: paneles, cursor, mensajes
│   ├── useSave.ts             ← Guardar: format on save, untitled files
│   ├── useEditorActions.ts    ← Editor: undo, redo, find, cursor tracking
│   ├── useAutoSave.ts         ← Auto-save con debounce 500ms
│   ├── useKeyboard.ts         ← Atajos globales (Ctrl+S, Ctrl+B, etc.)
│   └── useResize.ts           ← Drag-to-resize generico
│
├── services/                  ← Comunicacion con backend (tipada)
│   ├── tauri.ts               ← Wrapper tipado de invoke()
│   ├── lsp-client.ts          ← LSP JSON-RPC client
│   └── lsp-monaco-bridge.ts   ← Bridge LSP <-> Monaco
│
├── components/
│   ├── layout/
│   │   ├── slots/             ← Conectores context -> componentes
│   │   │   ├── TitleBarSlot.tsx
│   │   │   ├── ActivityBarSlot.tsx
│   │   │   ├── SidebarSlot.tsx
│   │   │   ├── EditorSlot.tsx
│   │   │   ├── AIPanelSlot.tsx
│   │   │   ├── TerminalSlot.tsx
│   │   │   ├── StatusBarSlot.tsx
│   │   │   └── PalettesSlot.tsx
│   │   ├── TitleBar/
│   │   ├── ActivityBar/
│   │   └── StatusBar/
│   └── ui/                    ← Componentes UI reutilizables
│       ├── CommandPalette/
│       └── ContextMenu/
│
├── features/                  ← Modulos autonomos (UI + logica propia)
│   ├── editor/                ← CodeEditor, TabBar, EditorCommandPalette
│   ├── explorer/              ← FileExplorer (lazy load, drag & drop)
│   ├── terminal/              ← Terminal, TerminalPanel (xterm.js)
│   ├── ai/                    ← AIPanel (Astro Quasar)
│   ├── git/                   ← GitPanel
│   ├── search/                ← SearchPanel
│   ├── settings/              ← SettingsPanel
│   ├── extensions/            ← ExtensionsPanel
│   ├── debug/                 ← DebugPanel
│   └── cloud/                 ← Contenedores
│
├── themes/                    ← Temas de color (10+ incluidos)
├── types/                     ← Interfaces y tipos globales
└── utils/                     ← Helpers puros
    ├── completions.ts         ← Snippets + keywords (14 lenguajes)
    ├── language.ts            ← Extension -> lenguaje mapping
    └── file-icons.tsx         ← Material Icon Theme (SVGs reales)
```

---

## Principios de Diseno

| Principio | Como se aplica |
|-----------|---------------|
| **S** — Single Responsibility | Cada hook/slot/feature tiene exactamente 1 responsabilidad |
| **O** — Open/Closed | Agregar feature = nuevo hook/slot, sin modificar App.tsx |
| **L** — Liskov Substitution | Cada hook cumple su interfaz independientemente |
| **I** — Interface Segregation | Slots consumen solo los contexts que necesitan |
| **D** — Dependency Inversion | Componentes dependen de contexts (abstracciones), no de App.tsx |

---

## Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 7 |
| Editor | Monaco Editor |
| Backend | Rust, Tauri 2 |
| Terminal | xterm.js + cmd.exe (pipes) |
| Temas | CSS variables + Monaco themes |
| Iconos | Material Icon Theme (SVGs reales) |
| Blur/Acrylic | window-vibrancy (nativo) |
| LSP | JSON-RPC over stdio (preparado) |

---

## Desarrollo

```powershell
# Dev (frontend + backend hot reload)
.\scripts\dev.ps1 dev

# Build release
.\scripts\build.ps1 build
```

---

## Atajos

| Atajo | Accion |
|-------|--------|
| `Ctrl+S` | Guardar |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+W` | Cerrar tab |
| `Ctrl+,` | Configuracion |
| `` Ctrl+` `` | Toggle terminal |
| `Ctrl+Shift+A` | Toggle panel IA |
| `Ctrl+K T` | Paleta de temas |
| `F1` | Paleta de comandos |
| `Shift+Alt+F` | Formatear documento |

---

## Optimizacion de Memoria

- Contenido de archivos NO se almacena en React state durante edicion (Monaco lo maneja)
- File tree se carga lazy (solo al expandir carpeta)
- Providers de autocompletado se disponen al cambiar de proyecto
- Terminales se matan con `wait()` para liberar threads del backend
- AI messages se limpian al cambiar de proyecto (`key={rootPath}`)
- Auto-save solo hace 1 setState por sesion de edicion (no por tecla)

---

## Roadmap
- [ ] LSP async con tokio
- [x] Ecosistema de extensiones (temas, iconos, plugins)
- [ ] Git integration funcional
- [ ] Split view / paneles multiples
- [x] AI code completion
- [ ] Soporte remoto (SSH/containers)
