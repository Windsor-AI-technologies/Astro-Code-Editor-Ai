# Astro Code Editor AI 

-lightweight, high-performance AI-powered code editor and IDE built from scratch using **Tauri 2**, **Rust**, **React**, and **Monaco Editor**. 

Designed as the ultimate minimal alternative to heavy development environments, **Astro Code Editor AI** delivers a modern, blazing-fast workspace running.

---

##  Important Note on Naming

**Astro Code Editor AI** is an independent, lightweight text editor built in Rust. It is **NOT** affiliated with, related to, or a part of the *Astro.build (Astro Framework)* web development platform. If you are looking for a microscopic memory footprint with native AI capabilities, you are in the right place!

---

## Performance Comparison

By bypassing the heavy Chromium/Electron runtimes and leveraging optimized native system webviews, Astro Code Editor AI achieves unmatched efficiency, outperforming even native C++ and GPUI editors in memory consumption:

| Editor | Technology Stack | Idle RAM Usage | AI Native |
| :--- | :--- | :--- | :--- |
| **VS Code / Cursor** | Electron / Chromium | ~500 MB - 1.2 GB | Yes / Via Plugins |
| **Zed Editor** | Rust (GPUI) | ~150 MB - 300 MB | Yes |
| **Sublime Text** | C++ (Custom UI) | ~50 MB - 100 MB | No |
|  **Astro Code Editor AI** | **Rust + Tauri 2** | ** ~85 - ~120 MB**  | **Yes (Built-in)** |

---

## Key Features

* **Microscopic ~85MB RAM Footprint:** Eliminates memory bloating entirely.
* **Tiny Distribution:** Super-small installation footprint (Installer: ~2.75 MB / Executable: ~4.5 MB).
* **Full LSP Integration:** Native Language Server Protocol support for smart autocompletion, syntax checking, and code diagnostics.
* **VS Code themes:** The built-in **VS Code Dark+** and **VS Code Light+** themes use the official VS Code syntax palette for comments, keywords, control flow, types, functions, variables, constants, strings, escapes, operators, tags and attributes.
* **Omnipresent AI Workspace:** Context-aware AI assistant integrated deeply throughout the entire editor interface.
* **Native Windows 11 Acrylic Design:** Implements clean, native transparency and blur effects without GPU overhead.
* **Run & Debug:** Execute scripts in one click (Ctrl+F5) and debug JavaScript/TypeScript step by step (F5) with breakpoints, call stack, variables and an integrated output panel.
* **C# IntelliSense (LSP):** Real C# language server integration (`csharp-ls`) with autocompletion, parameter hints, hover docs, go-to-definition, live compiler diagnostics and **semantic syntax highlighting** for user-defined classes, methods, properties, fields, parameters and variables.
* **Toolchains & SDK manager:** Install .NET SDK + C# IntelliSense, enable/disable tools and uninstall them from a dedicated sidebar panel — no administrator permissions required. Downloads are SHA-512 verified and stored under `~/.astroide/toolchains`.
* **.NET Tooling Palette:** Create, build, run, test and restore .NET projects from the command palette (`.NET: Crear proyecto...`), and run single C# files even without the .NET SDK installed (cloud execution via Piston, always with explicit user confirmation).
* **Second-level dialogs:** VS Code-style QuickPick/InputBox components so commands can ask for project templates, names and destinations without leaving the keyboard.

---

## Ecosistema & Roadmap (Próximas Funciones)

- [x] Full LSP Support & Code Auto-completion.
- [x] Omnipresent AI Assistant in Workspace.
- [x] **Cloud Music Player:** Built-in streaming music player running directly on the cloud to save local machine resources while coding.
- [ ] **Mobile Companion App:** Cross-platform mobile ecosystem extension to monitor and interact with your developer environment.
- [x] Highly Extensible Plugin Architecture.

---

## Tech Stack & Architecture

* **Backend:** Rust & Tauri 2 (Handles high-performance file system operations, window management, and native OS APIs).
* **Frontend:** React, TypeScript, and Monaco Editor (Utilizes the powerful, feature-rich editing core engine that drives VS Code, minus the telemetry and bloat).

### Estructura del proyecto

```text
AstroIde/
├── src/                        # Frontend React + TypeScript
│   ├── components/             # UI (layout, editor, paneles, QuickPick)
│   ├── contexts/               # Estado global (workspace, tabs, UI, debug)
│   ├── features/               # Features por dominio (editor, debug, toolchains, AI, ...)
│   ├── hooks/                  # Hooks (debug/, run/, ui/, ...)
│   ├── services/               # Puentes con Rust y servicios de infraestructura
│   │   ├── core/               # Action Registry y comandos de la paleta
│   │   └── ui/                 # QuickPick / InputBox (diálogos de segundo nivel)
│   └── tests/                  # Pruebas Vitest
└── src-tauri/                  # Backend Rust
    └── src/
        ├── debugger.rs         # Depurador CDP (Node inspector)
        ├── runner.rs           # Ejecución local, remota (Piston) y .NET
        ├── toolchains.rs       # Instalación portátil de SDKs y servidores LSP
        ├── lsp.rs              # Cliente LSP (IntelliSense)
        └── lib.rs              # Registro de comandos Tauri
```

### Backend de ejecución y depuración

* **`debugger.rs`** — Depurador paso a paso para JS/TS basado en el Chrome DevTools Protocol:
  * Lanza `node --inspect-brk=127.0.0.1:0` (puerto aleatorio ofrecido por el propio Node) y se conecta al WebSocket del inspector.
  * Un único hilo es dueño del socket: enruta respuestas por `id` (`PendingRequests`) y reenvía eventos (`paused`, `resumed`, `exceptionThrown`) al frontend.
  * El proceso arranca con `Runtime.runIfWaitingForDebugger` **después** de aplicar los breakpoints, garantizando que ninguna ejecución se escape.
  * Comandos: `debug_start`, `debug_launch`, `debug_set_breakpoint`, `debug_remove_breakpoint`, `debug_resume`, `debug_step_over|into|out`, `debug_pause`, `debug_evaluate` (por frame), `debug_get_properties`, `debug_stop`.
* **`lsp.rs`** — Cliente LSP asíncrono para IntelliSense:
  * Un hilo lector por servidor enruta respuestas por `id` (`pending`), responde peticiones del servidor (`workspace/configuration`, `workspace/workspaceFolders`, `client/registerCapability`, `window/workDoneProgress/create`) y reenvía notificaciones (`textDocument/publishDiagnostics`, logs) al frontend mediante eventos `lsp-notification`.
  * Peticiones con timeout (15 s; 30 s para `initialize`), detección de procesos caídos y URI `file://` con percent-encoding por segmento.
  * Guarda las capacidades devueltas por `initialize` y las expone con el comando `lsp_capabilities`; también anuncia soporte de `textDocument/semanticTokens` para que el servidor envíe los símbolos resaltados.
  * Lenguajes configurados: TypeScript/JS, Python, Rust, Go, C/C++, Java, **C# (`csharp-ls`)**, PHP, Ruby, Kotlin, Dart, CSS/HTML/JSON.
  * `src/services/lsp-monaco-bridge.ts` registra providers de autocompletado (con snippets y `completionItem/resolve`), hover, firma de métodos, definición y formateo, y pinta los diagnósticos como markers de Monaco. Antes de cada petición espera a que `didOpen`/`didChange` estén aplicados en el servidor, para que las sugerencias correspondan siempre al contenido actual del editor.
  * Para C# registra además un provider de **semantic tokens**: adapta la leyenda del servidor a la de Monaco, descarta los tipos que ya controla TextMate (keywords, strings, números, operadores y comentarios) y remapea los deltas LSP para colorear clases, métodos, propiedades, campos, parámetros y variables definidos por el usuario.
* **`runner.rs`** — Ejecución sin depurar:
  * Ejecución local por extensión (Node, Python, Ruby, PHP, Lua, shells, Go, Dart, Java, C/C++, Rust con compilación previa a temporal, y `dotnet run` para C# con SDK ≥ 10).
  * Salida en tiempo real por fragmentos, de modo que los prompts sin salto de línea aparecen antes de pedir datos.
  * Entrada estándar interactiva desde el panel **SALIDA**: cada línea enviada con `Enter` se escribe en el `stdin` del proceso local mediante `run_stdin` (por ejemplo, `Console.ReadLine()` o `input()`). La ejecución remota de Piston no admite entrada interactiva.
  * Salida en streaming mediante eventos `run-output` / `run-exit`.
  * Ejecución remota opcional vía **Piston (emkc.org)** para lenguajes sin runtime local; el frontend siempre pide confirmación explícita antes de enviar código.
  * Herramientas .NET: `dotnet_info`, `dotnet_list_templates` (parseo de `dotnet new list`), `dotnet_new` (nombre validado con `^[A-Za-z0-9._-]+$`), `dotnet_run_action` con lista blanca (`build`, `test`, `restore`, `clean`, `publish`, `format`, `run`) e `install_csharp_ls` (compatibilidad con la instalación global).
  * Todas las invocaciones de `dotnet` pasan por `toolchains::command`, que resuelve el SDK portátil activo (o `~/.dotnet`), e inyecta `DOTNET_ROOT`/`PATH` aunque la app se inicie desde el escritorio con un PATH mínimo.
* **`toolchains.rs`** — Gestor de herramientas portátiles:
  * Catálogo de SDKs y servidores de lenguaje con estado (instalado, versión, origen `portable`/`system`, activado).
  * Instalación del SDK de .NET desde el metadato oficial de Microsoft, **verificando SHA-512** antes de extraer; soporte Linux/macOS (`.tar.gz`) y Windows (`.zip`) por arquitectura.
  * `csharp-ls` se instala con `dotnet tool install --tool-path` dentro de la carpeta del usuario, sin tocar instalaciones globales.
  * Rutas: `~/.astroide/toolchains/dotnet-sdk`, `~/.astroide/toolchains/dotnet-tools`; el estado (activado/desactivado) se guarda en `~/.astroide/toolchains/state.json`.
  * Al activar/desactivar o desinstalar, se detiene el servidor LSP y el frontend lo reinicia y resincroniza el documento abierto.

### IntelliSense de C#

El soporte completo de C# usa [`csharp-ls`](https://github.com/razzmatazz/csharp-language-server) sobre Roslyn y requiere el SDK de .NET (framework, runtime y MSBuild).

**Instalación recomendada (sin permisos de administrador):**

1. Abre **Herramientas y SDK** en la barra de actividad (icono de llave inglesa) o usa la paleta: **Herramientas: Instalar compiladores y SDK...**
2. Pulsa **Instalar** en `.NET SDK`. La app descarga la última versión estable para tu plataforma (~250 MB), verifica el hash SHA-512, la extrae en `~/.astroide/toolchains/dotnet-sdk` e instala `csharp-ls` automáticamente.
3. Al terminar, el IntelliSense se reinicia solo. La tarjeta permite **desactivar/activar** y **desinstalar** la herramienta en cualquier momento.

Si ya tienes .NET y `csharp-ls` instalados globalmente, la app los detecta como **Sistema** y los usa sin descargar nada: `dotnet tool install --global csharp-ls`. La búsqueda del ejecutable prioriza `~/.astroide/toolchains`, luego `PATH` y finalmente `~/.dotnet/tools`; para el SDK se prefiere una instalación local completa en `~/.dotnet` sobre el `dotnet` del PATH. `csharp-ls 0.28` requiere .NET 10, por lo que la app configura `DOTNET_ROOT` al lanzarlo.

Para máxima precisión, las sugerencias por palabras del documento están desactivadas y el filtrado de Monaco es estricto: solo aparecen elementos del lenguaje/servidor relacionados con lo que escribes.

Abre una carpeta con un `.csproj` o `.sln` y el servidor ofrecerá:

* Autocompletado con documentación y snippets.
* Ayuda de parámetros al escribir una llamada.
* Hover con tipos y documentación XML.
* Ir a definición (`F12` / Ctrl+Click).
* Diagnósticos del compilador (errores y advertencias) en vivo, en el margen y al pasar el ratón.
* Formato de documento con Roslyn: `Shift+Alt+F`, clic derecho > **Formatear documento** o formato al guardar si la opción está activada.
* `Tab`/`Shift+Tab` siempre indenta o desindenta, aunque el menú de sugerencias esté abierto; dentro de un snippet, `Tab` sigue navegando entre sus marcadores.
* Formateo de selección con `Ctrl+K Ctrl+F`.
* Resaltado semántico de símbolos definidos por el usuario (clases, métodos, propiedades, campos, parámetros y variables) usando los tipos semánticos de `csharp-ls`.

> **Requisito importante:** `csharp-ls` solo analiza archivos que pertenecen a un proyecto de C#. Los archivos `.cs` sueltos (sin `.csproj`/`.sln`) pueden abrirse y ejecutarse, pero no reciben autocompletado ni diagnósticos. Si abres una subcarpeta de un proyecto, el editor busca automáticamente el `.csproj`/`.sln` más cercano y lo usa como raíz del LSP; si no encuentra ninguno, muestra un aviso y no inicia un servidor inútil. Crea un proyecto con **.NET: Crear proyecto...** o abre la carpeta que contiene el proyecto. La ejecución en la nube con Piston no sustituye al SDK: Piston solo ejecuta el código, no proporciona Roslyn ni IntelliSense.

### Atajos principales

| Atajo | Acción |
| :--- | :--- |
| `F5` | Iniciar/continuar depuración (JS/TS) |
| `Ctrl+F5` | Ejecutar archivo activo sin depurar |
| `Shift+F5` | Detener ejecución o depuración |
| `F10` / `F11` / `Shift+F11` | Step Over / Step Into / Step Out |
| `F12` | Ir a definición |
| `Ctrl+Shift+P` o `F1` | Paleta de comandos |
| `Ctrl+P` | Búsqueda rápida de archivos |
| `Ctrl+B` | Mostrar/ocultar barra lateral |

### Pruebas y calidad

```bash
npm test              # Vitest (frontend, 13 archivos / 92 pruebas)
npx tsc --noEmit      # Typecheck
npx eslint src        # Lint
cd src-tauri && cargo test --lib   # Pruebas unitarias Rust
```

La carpeta `src/tests/` cubre servicios (`runner`, `quickPick`, `debugger`, acciones .NET) y hooks (`useRunner` con stdin interactivo) usando mocks de `@tauri-apps/api`.

---

## Getting Started & Installation

Follow these quick steps to clone and run the editor locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Jeshua3545926/Astro-Code-Editor-Ai.git
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server via Tauri:**
   ```bash
   npm run tauri dev
   ```

---

## License & Credits

Developed with ⚡ by **Jeshua3545926** 🇲🇽.  
Licensed under the **GPLv3 License** — completely open source, transparent, and telemetry-free.


<img width="1712" height="1047" alt="image" src="https://github.com/Jeshua3545926/Astro-Code-Editor-Ai/blob/main/Screenshot%202026-08-09%20130121.png?raw=true" />
<img width="1658" height="982" alt="Screenshot 2026-08-11 130818" src="https://github.com/user-attachments/assets/e0c44fc7-14ec-4175-bce8-0f300975bcd7" />

