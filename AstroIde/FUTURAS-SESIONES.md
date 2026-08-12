# Futuras Sesiones de Implementacion

## 1. Sistema de Extensiones


### Marketplace
- **Fase 1**: Open VSX (`open-vsx.org/api`) — marketplace open source, sin restricciones
  - Búsqueda de extensiones
  - Info/metadata de cada extensión
  - Descarga de `.vsix`
  - Instalación local
- **Fase 2**: Marketplace propio — registry propio de Astro IDE
- Desactivado por defecto al clonar el repo
- Se activa manualmente en configuracion o en el fork del usuario
- La carpeta `extensions/` SI se sube al repo (contiene las extensiones bundled)
- Lo que NO se expone es el fetch al marketplace (la conexion al registry remoto)
- Sin activar el marketplace, el usuario solo ve las extensiones locales que vienen con el proyecto

### Tipos de extensiones soportadas
- **Temas de color** — JSON compatible con VS Code (`tokenColors`, `colors`)
- **Temas de iconos** — mappings extension→icono
- **Snippets** — JSON con `prefix`, `body`, `scope`
- **Language grammars** — TextMate `.tmLanguage` via `monaco-textmate`
- **AI Panels** — panel de IA como extension (no parte del core)
- **LSP providers** — extensiones que levantan language servers
- **Formatters** — CLI-based (prettier, black, rustfmt)
- **Custom panels** — paneles personalizados en el sidebar

### Panel de IA como extension
- Mover `features/ai/` a `extensions/astro-ai/` (privado, no se pushea)
- El core solo expone un slot donde la extension monta su UI
- Sin la extension, el panel simplemente no aparece
- La extension de AI es la unica que va en `.gitignore` (codigo privado)
- La carpeta `extensions/` en si SI se sube

### Compatibilidad con VS Code
- Temas, snippets e icon themes de VS Code se pueden importar directamente
- Extensions con logica propia necesitan nuestra API (no la de VS Code)
- Opcionalmente: compatibility layer para extensiones populares

---

## 2. DAP (Debug Adapter Protocol) Generico

### Objetivo
- Soportar Python, Rust, Go, C++ ademas de Node.js
- Usar el protocolo DAP estandar (mismo que VS Code)
- Cada lenguaje tiene su debug adapter (debugpy, codelldb, delve, etc.)

### Implementacion
- Backend Rust: spawns DAP adapter, comunica via stdin/stdout JSON
- Frontend: reusar el DebugPanel y useDebugger existentes
- Configuraciones en `launch.json` (compatible con VS Code)

---

## 3. Git Integration Real

### Features
- Status de archivos (modified, staged, untracked)
- Diff viewer inline en el editor
- Commit, push, pull desde la UI
- Branch management (crear, cambiar, merge)
- Blame annotations en el gutter

---

## 4. Editor Propio (reemplazar Monaco)

### Motivacion
- Monaco pesa ~4MB
- No controlamos su roadmap
- Limitaciones en tokenizacion JSX sin LSP

### Approach
- Canvas/WebGL para render de texto
- Virtual scrolling (solo lineas visibles)
- Tree-sitter para syntax highlighting
- Piece table o rope para manejo de texto
- Implementacion incremental (empezar con render basico)

---

## 5. LSP Async

### Problema actual
- El backend usa I/O bloqueante para LSP
- Causa que la UI se congele

### Solucion
- Migrar a tokio (async runtime)
- Comunicacion non-blocking con language servers
- Activar IntelliSense real para todos los lenguajes

---

## 6. Split View / Multi-panel

- Dividir editor en 2+ paneles (horizontal/vertical)
- Cada panel con su propio tab group
- Drag & drop tabs entre paneles

---

## 7. Soporte Remoto

- SSH connections a servidores
- Editar archivos remotos
- Terminal remota
- Containers (Docker dev environments)

---

## Notas
- El AI panel NO se sube al repo publico (va en `.gitignore` solo esa extension)
- La carpeta `extensions/` SI se sube (contiene extensiones bundled)
- El marketplace (fetch remoto) viene OFF por defecto — solo se ve lo local
- Para activar el marketplace el usuario lo habilita en su fork
- Cada feature se implementa en su propia sesion

---

## 8. Backend + Autenticación + AI como servicio

### Objetivo
- Cada usuario inicia sesión en AstroIde
- Las llamadas a AI van al backend propio (no directo a Groq/DeepSeek)
- El backend usa UNA sola API key (la tuya) para todos los usuarios
- Los usuarios no necesitan su propia key

### Flujo
```
App (Tauri) → Tu backend → Groq/DeepSeek → Tu backend → App
```

### Features
- Login / registro de usuarios
- El backend actúa como proxy de AI (protege la key)
- Límites de uso por usuario (rate limiting)
- Modelos propios de Astro IDE (branding)
- Posibilidad de monetizar uso premium

### Stack sugerido
- Backend: Rust (Axum) o Node.js (Fastify)
- Auth: JWT + refresh tokens
- DB: PostgreSQL o SQLite para empezar
- Deploy: VPS propio o Railway/Fly.io

---

## 9. Git Integration Real (con GitLens-lite)

### Enfoque: Lazy + bajo demanda (0 RAM cuando no se usa)

### Fase 1 — Git básico
- Status de archivos (modified, staged, untracked)
- Commit, push, pull desde la UI
- Branch management (crear, cambiar, merge)
- Todo via `Command::new("git")` desde Rust — sin librerías extra

### Fase 2 — GitLens-lite (blame + grafo)
- Blame inline: solo cuando el usuario hace hover en una línea (no precarga)
- Grafo de ramas: solo últimas 50 commits, SVG simple
- Historial de archivo: bajo demanda al abrir el panel
- Contribuidores: `git shortlog` al abrir

### Reglas de memoria
- Panel cerrado = 0 MB extra
- Panel abierto = solo los datos visibles en pantalla (~1-2MB max)
- Al cerrar panel = liberar toda la memoria (mismo patrón que extensiones)
- NUNCA precargar todo el historial como GitLens
- NUNCA cachear blame de archivos que no están abiertos

---

## 10. Electronics Mode

### Básico (gratis, 0 RAM extra)
- Editor de código C/C++ para Arduino/ESP32 (ya existe con Monaco)
- Monitor serial — comunicación USB con el board via puerto COM
- Upload de código via `arduino-cli` (compile + upload)
- Detección de boards conectados

### Premium (diagrama de circuitos)
- Desactivado por defecto en config
- Al activar: modal de advertencia "Consume más RAM"
- Dos opciones:
  - **Local**: canvas SVG con editor de esquemáticos (~5-10MB RAM extra)
  - **Nube**: renderizado en servidor remoto (costo de infra, 0 RAM cliente)
- El usuario elige cuál prefiere

---

## 11. Migración a Tauri 3 (multi-webview)

### Objetivo
- Browser embebido real dentro de la app (sin X-Frame-Options)
- YouTube, Spotify, Supabase dashboard, GitHub — todo embebido
- Cada webview consume RAM solo cuando está activa, se libera al cerrar

### Beneficios
- Webviews aisladas con sesión propia (cookies/localStorage)
- Sin restricciones de iframe
- RAM base sigue baja (~4MB), webviews extra solo on-demand
- API estable de `add_child` para embeber dentro de la ventana principal

### Prerequisito
- Esperar a que Tauri 3 lance la feature multi-webview como estable
- Migrar de Tauri 2 → Tauri 3 (actualizar deps + config)
