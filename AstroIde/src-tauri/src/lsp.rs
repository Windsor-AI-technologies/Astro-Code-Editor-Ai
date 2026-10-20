use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::mpsc::{self, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::Emitter;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);
const INITIALIZE_TIMEOUT: Duration = Duration::from_secs(30);

// ── Language Server Configuration ────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspServerConfig {
    pub language_id: String,
    pub command: String,
    pub args: Vec<String>,
    pub extensions: Vec<String>,
}

/// Returns default LSP server configurations for supported languages.
/// Users must have these servers installed on their system.
pub fn default_lsp_configs() -> Vec<LspServerConfig> {
    // Detect npm global bin path (Windows: %APPDATA%\npm)
    let npm_bin = std::env::var("APPDATA")
        .map(|r| std::path::PathBuf::from(r).join("npm"))
        .unwrap_or_else(|_| dirs::data_dir().map(|d| d.join("npm")).unwrap_or_default());
    let npm_bin_str = npm_bin.to_string_lossy().to_string();

    // Helper to resolve command - try npm global path first
    fn resolve_cmd(npm_bin: &str, cmd: &str) -> String {
        let full_path = format!("{}/{}.cmd", npm_bin, cmd);
        if std::path::Path::new(&full_path).exists() {
            return full_path;
        }
        // Fallback: assume it's in PATH
        cmd.to_string()
    }

    vec![
        // TypeScript / JavaScript — tsserver via typescript-language-server
        LspServerConfig {
            language_id: "typescript".into(),
            command: resolve_cmd(&npm_bin_str, "typescript-language-server"),
            args: vec!["--stdio".into()],
            extensions: vec![
                "ts".into(),
                "tsx".into(),
                "js".into(),
                "jsx".into(),
                "mjs".into(),
                "cjs".into(),
            ],
        },
        // Python — pyright
        LspServerConfig {
            language_id: "python".into(),
            command: resolve_cmd(&npm_bin_str, "pyright-langserver"),
            args: vec!["--stdio".into()],
            extensions: vec!["py".into(), "pyi".into()],
        },
        // Rust — rust-analyzer
        LspServerConfig {
            language_id: "rust".into(),
            command: "rust-analyzer".into(),
            args: vec![],
            extensions: vec!["rs".into()],
        },
        // Go — gopls
        LspServerConfig {
            language_id: "go".into(),
            command: "gopls".into(),
            args: vec!["serve".into()],
            extensions: vec!["go".into()],
        },
        // C/C++ — clangd
        LspServerConfig {
            language_id: "cpp".into(),
            command: "clangd".into(),
            args: vec![],
            extensions: vec![
                "c".into(),
                "cpp".into(),
                "cc".into(),
                "h".into(),
                "hpp".into(),
            ],
        },
        // Java — jdtls
        LspServerConfig {
            language_id: "java".into(),
            command: "jdtls".into(),
            args: vec![],
            extensions: vec!["java".into()],
        },
        // C# — csharp-ls (dotnet tool install -g csharp-ls)
        LspServerConfig {
            language_id: "csharp".into(),
            command: "csharp-ls".into(),
            args: vec![],
            extensions: vec!["cs".into(), "csx".into()],
        },
        // PHP — intelephense
        LspServerConfig {
            language_id: "php".into(),
            command: resolve_cmd(&npm_bin_str, "intelephense"),
            args: vec!["--stdio".into()],
            extensions: vec!["php".into()],
        },
        // Ruby — solargraph
        LspServerConfig {
            language_id: "ruby".into(),
            command: "solargraph".into(),
            args: vec!["stdio".into()],
            extensions: vec!["rb".into()],
        },
        // Kotlin — kotlin-language-server
        LspServerConfig {
            language_id: "kotlin".into(),
            command: "kotlin-language-server".into(),
            args: vec![],
            extensions: vec!["kt".into(), "kts".into()],
        },
        // Dart — dart language-server
        LspServerConfig {
            language_id: "dart".into(),
            command: "dart".into(),
            args: vec!["language-server".into(), "--protocol=lsp".into()],
            extensions: vec!["dart".into()],
        },
        // CSS/SCSS/LESS — vscode-css-languageserver
        LspServerConfig {
            language_id: "css".into(),
            command: resolve_cmd(&npm_bin_str, "css-languageserver"),
            args: vec!["--stdio".into()],
            extensions: vec!["css".into(), "scss".into(), "less".into()],
        },
        // HTML — vscode-html-languageserver
        LspServerConfig {
            language_id: "html".into(),
            command: resolve_cmd(&npm_bin_str, "html-languageserver"),
            args: vec!["--stdio".into()],
            extensions: vec!["html".into(), "htm".into()],
        },
        // JSON — vscode-json-languageserver
        LspServerConfig {
            language_id: "json".into(),
            command: resolve_cmd(&npm_bin_str, "vscode-json-languageserver"),
            args: vec!["--stdio".into()],
            extensions: vec!["json".into(), "jsonc".into()],
        },
    ]
}

// ── Server process handle ────────────────────────────────────────────────────

pub struct ServerHandle {
    stdin: Mutex<ChildStdin>,
    child: Mutex<Child>,
    pending: Mutex<HashMap<i64, Sender<Value>>>,
    next_id: AtomicI64,
    language_id: String,
    root_uri: String,
    root_name: String,
    capabilities: Mutex<Value>,
}

impl ServerHandle {
    fn write_message(&self, message: &Value) -> Result<(), String> {
        let body = serde_json::to_string(message).map_err(|e| e.to_string())?;
        let header = format!("Content-Length: {}\r\n\r\n", body.len());
        let mut stdin = self.stdin.lock().unwrap();
        stdin
            .write_all(header.as_bytes())
            .map_err(|e| e.to_string())?;
        stdin
            .write_all(body.as_bytes())
            .map_err(|e| e.to_string())?;
        stdin.flush().map_err(|e| e.to_string())
    }

    pub fn notify(&self, method: &str, params: Value) -> Result<(), String> {
        self.write_message(&json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        }))
    }

    pub fn request(&self, method: &str, params: Value, timeout: Duration) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = mpsc::channel();

        self.pending.lock().unwrap().insert(id, tx);
        let message = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params
        });

        if let Err(e) = self.write_message(&message) {
            self.pending.lock().unwrap().remove(&id);
            return Err(e);
        }

        match rx.recv_timeout(timeout) {
            Ok(response) => {
                if let Some(error) = response.get("error") {
                    let message = error["message"]
                        .as_str()
                        .unwrap_or("error del servidor LSP");
                    return Err(message.to_string());
                }
                Ok(response)
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                self.pending.lock().unwrap().remove(&id);
                Err(format!("El servidor LSP no respondió a '{}'", method))
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                Err("El servidor LSP terminó inesperadamente".to_string())
            }
        }
    }

    pub fn is_alive(&self) -> bool {
        matches!(self.child.lock().unwrap().try_wait(), Ok(None))
    }

    pub fn capabilities(&self) -> Value {
        self.capabilities.lock().unwrap().clone()
    }

    pub fn kill(&self) {
        let mut child = self.child.lock().unwrap();
        let _ = child.kill();
        let _ = child.wait();
    }

    /// Realiza el handshake LSP (initialize + initialized).
    pub fn initialize(&self, root_path: &str) -> Result<(), String> {
        let root_uri = path_to_uri(if root_path.trim().is_empty() {
            "."
        } else {
            root_path
        });
        let response = self.request(
            "initialize",
            json!({
                "processId": std::process::id(),
                "clientInfo": { "name": "Astro Code Editor", "version": "0.1.0" },
                "rootUri": root_uri,
                "rootPath": if root_path.trim().is_empty() { Value::Null } else { json!(root_path) },
                "workspaceFolders": [{
                    "uri": root_uri,
                    "name": self.root_name
                }],
                "capabilities": {
                    "textDocument": {
                        "synchronization": {
                            "dynamicRegistration": false,
                            "didSave": false
                        },
                        "completion": {
                            "dynamicRegistration": false,
                            "completionItem": {
                                "snippetSupport": true,
                                "commitCharactersSupport": true,
                                "documentationFormat": ["markdown", "plaintext"],
                                "insertReplaceSupport": true,
                                "resolveSupport": {
                                    "properties": ["documentation", "detail", "additionalTextEdits"]
                                }
                            },
                            "completionItemKind": { "valueSet": (1..=25).collect::<Vec<i32>>() },
                            "contextSupport": true
                        },
                        "hover": {
                            "dynamicRegistration": false,
                            "contentFormat": ["markdown", "plaintext"]
                        },
                        "signatureHelp": {
                            "dynamicRegistration": false,
                            "signatureInformation": {
                                "documentationFormat": ["markdown", "plaintext"],
                                "parameterInformation": { "labelOffsetSupport": true },
                                "activeParameterSupport": true
                            }
                        },
                        "definition": { "dynamicRegistration": false, "linkSupport": true },
                        "references": { "dynamicRegistration": false },
                        "documentHighlight": { "dynamicRegistration": false },
                        "documentSymbol": { "dynamicRegistration": false },
                        "formatting": { "dynamicRegistration": false },
                        "rangeFormatting": { "dynamicRegistration": false },
                        "semanticTokens": {
                            "dynamicRegistration": false,
                            "requests": { "range": true, "full": true },
                            "tokenTypes": [],
                            "tokenModifiers": [],
                            "formats": ["relative"],
                            "overlappingTokenSupport": false,
                            "multilineTokenSupport": false
                        },
                        "rename": { "dynamicRegistration": false, "prepareSupport": true },
                        "publishDiagnostics": {
                            "versionSupport": true,
                            "relatedInformation": true
                        }
                    },
                    "workspace": {
                        "workspaceFolders": true,
                        "configuration": true,
                        "workspaceEdit": { "documentChanges": false }
                    },
                    "window": { "workDoneProgress": true }
                }
            }),
            INITIALIZE_TIMEOUT,
        )?;

        let result = response
            .get("result")
            .ok_or_else(|| "Respuesta de inicialización LSP inválida".to_string())?;
        let capabilities = result
            .get("capabilities")
            .cloned()
            .unwrap_or_else(|| json!({}));
        *self.capabilities.lock().unwrap() = capabilities;

        self.notify("initialized", json!({}))
    }
}

// ── Reader thread ────────────────────────────────────────────────────────────

fn read_message(reader: &mut impl BufRead) -> Result<Option<Value>, String> {
    let mut content_length: usize = 0;

    loop {
        let mut line = String::new();
        let read = reader.read_line(&mut line).map_err(|e| e.to_string())?;
        if read == 0 {
            return Ok(None);
        }

        let trimmed = line.trim();
        if trimmed.is_empty() {
            break;
        }
        if let Some(value) = trimmed.strip_prefix("Content-Length:") {
            content_length = value
                .trim()
                .parse()
                .map_err(|e: std::num::ParseIntError| e.to_string())?;
        }
    }

    if content_length == 0 {
        return Ok(None);
    }

    let mut body = vec![0u8; content_length];
    reader.read_exact(&mut body).map_err(|e| e.to_string())?;
    let message = serde_json::from_slice(&body).map_err(|e| e.to_string())?;
    Ok(Some(message))
}

/// Responde a peticiones que el servidor LSP envía al cliente.
/// Sin esto, servidores como csharp-ls pueden quedarse esperando indefinidamente.
fn answer_server_request(handle: &ServerHandle, id: &Value, method: &str, params: &Value) {
    let result = match method {
        "workspace/configuration" => {
            let count = params["items"]
                .as_array()
                .map(|items| items.len())
                .unwrap_or(0);
            Value::Array(vec![Value::Null; count])
        }
        "workspace/workspaceFolders" => json!([{
            "uri": handle.root_uri,
            "name": handle.root_name
        }]),
        "workspace/applyEdit" => json!({
            "applied": false,
            "failureReason": "Ediciones del servidor no soportadas"
        }),
        _ => Value::Null,
    };

    let _ = handle.write_message(&json!({
        "jsonrpc": "2.0",
        "id": id,
        "result": result
    }));
}

fn reader_loop(
    stdout: std::process::ChildStdout,
    handle: Arc<ServerHandle>,
    app: tauri::AppHandle,
) {
    let mut reader = BufReader::new(stdout);

    loop {
        match read_message(&mut reader) {
            Ok(Some(message)) => {
                let has_method = message.get("method").and_then(Value::as_str);

                if let Some(method) = has_method {
                    if let Some(id) = message.get("id") {
                        // Petición del servidor al cliente
                        let params = message.get("params").cloned().unwrap_or(Value::Null);
                        answer_server_request(&handle, id, method, &params);
                        continue;
                    }

                    // Notificación del servidor (diagnósticos, logs, progreso...)
                    let _ = app.emit(
                        "lsp-notification",
                        json!({
                            "languageId": handle.language_id,
                            "method": method,
                            "params": message.get("params").cloned().unwrap_or(Value::Null)
                        }),
                    );
                    continue;
                }

                // Respuesta a una petición nuestra
                if let Some(id) = message.get("id").and_then(Value::as_i64) {
                    let waiter = handle.pending.lock().unwrap().remove(&id);
                    if let Some(tx) = waiter {
                        let _ = tx.send(message);
                    }
                }
            }
            Ok(None) => break,
            Err(_) => break,
        }
    }

    // Despertar a cualquier petición pendiente con el canal cerrado
    handle.pending.lock().unwrap().clear();

    let _ = app.emit("lsp-exit", json!({ "languageId": handle.language_id }));
}

// ── LSP Manager ──────────────────────────────────────────────────────────────

pub struct LspManager {
    processes: HashMap<String, Arc<ServerHandle>>,
    configs: Vec<LspServerConfig>,
}

impl LspManager {
    pub fn new() -> Self {
        Self {
            processes: HashMap::new(),
            configs: default_lsp_configs(),
        }
    }

    /// Get the language_id for a file extension
    pub fn language_for_extension(&self, ext: &str) -> Option<String> {
        self.configs
            .iter()
            .find(|c| c.extensions.iter().any(|e| e == ext))
            .map(|c| c.language_id.clone())
    }

    fn config(&self, language_id: &str) -> Result<LspServerConfig, String> {
        self.configs
            .iter()
            .find(|c| c.language_id == language_id)
            .cloned()
            .ok_or_else(|| format!("No hay configuración LSP para: {}", language_id))
    }

    pub fn server_available(&self, language_id: &str) -> bool {
        match self.config(language_id) {
            Ok(config) => command_available(&config.command),
            Err(_) => false,
        }
    }

    /// Lanza el proceso y su hilo lector. La inicialización se hace fuera del lock.
    pub fn spawn_server(
        &mut self,
        app: tauri::AppHandle,
        language_id: &str,
        root_path: &str,
    ) -> Result<Arc<ServerHandle>, String> {
        if let Some(existing) = self.processes.get(language_id) {
            if existing.is_alive() {
                return Ok(existing.clone());
            }
        }
        self.stop_server(language_id);

        let config = self.config(language_id)?;
        let effective_root = if root_path.trim().is_empty() {
            "."
        } else {
            root_path
        };
        let program = resolve_command(&config.command)
            .unwrap_or_else(|| std::path::PathBuf::from(&config.command));

        let mut command = Command::new(&program);
        command
            .args(&config.args)
            .current_dir(effective_root)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        crate::toolchains::apply_env(&mut command);

        let mut child = command.spawn().map_err(|e| {
            format!(
                "No se pudo iniciar '{}': {}. ¿Está instalado?",
                config.command, e
            )
        })?;

        let stdin = child
            .stdin
            .take()
            .ok_or("No se pudo abrir stdin del servidor LSP")?;
        let stdout = child
            .stdout
            .take()
            .ok_or("No se pudo abrir stdout del servidor LSP")?;

        let root_uri = path_to_uri(effective_root);
        let root_name = Path::new(effective_root)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| effective_root.to_string());

        let handle = Arc::new(ServerHandle {
            stdin: Mutex::new(stdin),
            child: Mutex::new(child),
            pending: Mutex::new(HashMap::new()),
            next_id: AtomicI64::new(0),
            language_id: language_id.to_string(),
            root_uri,
            root_name,
            capabilities: Mutex::new(json!({})),
        });

        let reader_handle = handle.clone();
        thread::spawn(move || reader_loop(stdout, reader_handle, app));

        self.processes
            .insert(language_id.to_string(), handle.clone());
        Ok(handle)
    }

    pub fn handle(&self, language_id: &str) -> Result<Arc<ServerHandle>, String> {
        self.processes
            .get(language_id)
            .filter(|handle| handle.is_alive())
            .cloned()
            .ok_or_else(|| format!("No hay servidor LSP en ejecución para: {}", language_id))
    }

    /// Stop a language server
    pub fn stop_server(&mut self, language_id: &str) {
        if let Some(handle) = self.processes.remove(language_id) {
            handle.kill();
        }
    }

    /// Stop all servers
    pub fn stop_all(&mut self) {
        let keys: Vec<String> = self.processes.keys().cloned().collect();
        for key in keys {
            self.stop_server(&key);
        }
    }

    pub fn is_running(&self, language_id: &str) -> bool {
        self.processes
            .get(language_id)
            .map(|handle| handle.is_alive())
            .unwrap_or(false)
    }

    pub fn capabilities(&self, language_id: &str) -> Result<Value, String> {
        Ok(self.handle(language_id)?.capabilities())
    }

    pub fn send_request(
        &self,
        language_id: &str,
        method: &str,
        params: Value,
    ) -> Result<Value, String> {
        self.handle(language_id)?
            .request(method, params, REQUEST_TIMEOUT)
    }

    pub fn send_notification(
        &self,
        language_id: &str,
        method: &str,
        params: Value,
    ) -> Result<(), String> {
        self.handle(language_id)?.notify(method, params)
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn command_available(command: &str) -> bool {
    resolve_command(command).is_some()
}

/// Busca un ejecutable en PATH aplicando las herramientas portátiles activas.
fn resolve_command(command: &str) -> Option<std::path::PathBuf> {
    if command.contains('/') || command.contains('\\') {
        let path = std::path::PathBuf::from(command);
        return path.is_file().then_some(path);
    }

    crate::toolchains::resolve_executable(command)
}

/// Convierte una ruta local en URI `file://` con percent-encoding por segmento.
fn path_to_uri(path: &str) -> String {
    let normalized = path.replace('\\', "/");

    let (prefix, rest) = match normalized.strip_prefix('/') {
        Some(rest) => {
            // Windows: /C:/Users/... conserva la letra de unidad sin codificar.
            if rest.len() >= 2 && rest.as_bytes()[1] == b':' {
                ("file:///".to_string(), rest.to_string())
            } else {
                (
                    "file:///".to_string(),
                    rest.trim_start_matches('/').to_string(),
                )
            }
        }
        None => {
            if normalized.len() >= 2 && normalized.as_bytes()[1] == b':' {
                ("file:///".to_string(), normalized)
            } else {
                ("file:///".to_string(), normalized)
            }
        }
    };

    let encoded: Vec<String> = rest
        .split('/')
        .map(|segment| {
            if segment.len() >= 2 && segment.as_bytes()[1] == b':' {
                segment.to_string()
            } else {
                percent_encode_segment(segment)
            }
        })
        .collect();

    format!("{}{}", prefix, encoded.join("/"))
}

fn percent_encode_segment(segment: &str) -> String {
    let mut encoded = String::with_capacity(segment.len());
    for byte in segment.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char)
            }
            _ => encoded.push_str(&format!("%{:02X}", byte)),
        }
    }
    encoded
}

// ── Resolución de raíz para C# ───────────────────────────────────────────────

fn contains_dotnet_project(dir: &Path) -> bool {
    std::fs::read_dir(dir)
        .map(|entries| {
            entries.filter_map(Result::ok).any(|entry| {
                let path = entry.path();
                path.is_file()
                    && matches!(
                        path.extension()
                            .and_then(|extension| extension.to_str())
                            .map(|extension| extension.to_ascii_lowercase())
                            .as_deref(),
                        Some("csproj" | "sln" | "slnx")
                    )
            })
        })
        .unwrap_or(false)
}

/// Busca el proyecto .NET más cercano desde un archivo o carpeta.
pub fn find_dotnet_project(start: &Path) -> Option<PathBuf> {
    let mut current = if start.is_file() {
        start.parent()?.to_path_buf()
    } else {
        start.to_path_buf()
    };

    loop {
        if current.is_dir() && contains_dotnet_project(&current) {
            return Some(current);
        }
        current = current.parent()?.to_path_buf();
    }
}

/// Devuelve la raíz que debe usar el servidor LSP.
/// C# requiere un .csproj/.sln para que Roslyn entregue IntelliSense.
pub fn resolve_root(
    language_id: &str,
    file_path: Option<&str>,
    root_path: &str,
) -> Result<String, String> {
    let fallback = if root_path.trim().is_empty() {
        "."
    } else {
        root_path
    };

    if language_id != "csharp" {
        return Ok(fallback.to_string());
    }

    if let Some(file_path) = file_path.filter(|path| !path.trim().is_empty()) {
        if let Some(project_root) = find_dotnet_project(Path::new(file_path)) {
            return Ok(project_root.to_string_lossy().to_string());
        }
    }

    if let Some(project_root) = find_dotnet_project(Path::new(fallback)) {
        return Ok(project_root.to_string_lossy().to_string());
    }

    Err("NO_CSHARP_PROJECT: abre una carpeta con un archivo .csproj o .sln para activar IntelliSense de C#."
        .to_string())
}

// ── Thread-safe state ────────────────────────────────────────────────────────

pub type LspState = Arc<Mutex<LspManager>>;

pub fn new_lsp_state() -> LspState {
    Arc::new(Mutex::new(LspManager::new()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uri_para_ruta_unix() {
        assert_eq!(path_to_uri("/home/user/app.cs"), "file:///home/user/app.cs");
    }

    #[test]
    fn uri_codifica_espacios_y_caracteres() {
        assert_eq!(
            path_to_uri("/home/user/mi proyecto/ñandú.cs"),
            "file:///home/user/mi%20proyecto/%C3%B1and%C3%BA.cs"
        );
    }

    #[test]
    fn uri_para_ruta_windows() {
        assert_eq!(
            path_to_uri("C:\\Users\\dev\\App.cs"),
            "file:///C:/Users/dev/App.cs"
        );
    }

    #[test]
    fn extension_csharp_resuelve_a_csharp() {
        let manager = LspManager::new();
        assert_eq!(
            manager.language_for_extension("cs"),
            Some("csharp".to_string())
        );
        assert_eq!(
            manager.language_for_extension("csx"),
            Some("csharp".to_string())
        );
        assert_eq!(manager.language_for_extension("xyz"), None);
    }

    fn temporary_project(name: &str) -> PathBuf {
        let root =
            std::env::temp_dir().join(format!("astroide-lsp-{}-{}", name, std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("src").join("App")).unwrap();
        std::fs::write(
            root.join("src").join("App").join("App.csproj"),
            "<Project />",
        )
        .unwrap();
        root
    }

    #[test]
    fn encuentra_el_proyecto_desde_un_archivo_anidado() {
        let root = temporary_project("anidado");
        let program = root.join("src").join("App").join("Program.cs");
        std::fs::write(&program, "class Program {}").unwrap();

        assert_eq!(
            find_dotnet_project(&program),
            Some(root.join("src").join("App"))
        );
        assert_eq!(
            resolve_root("csharp", program.to_str(), root.to_str().unwrap()),
            Ok(root.join("src").join("App").to_string_lossy().to_string())
        );

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn csharp_sin_proyecto_devuelve_error_explicito() {
        let root = std::env::temp_dir().join(format!("astroide-lsp-suelto-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let program = root.join("Program.cs");
        std::fs::write(&program, "class Program {}").unwrap();

        let error = resolve_root("csharp", program.to_str(), root.to_str().unwrap()).unwrap_err();
        assert!(error.starts_with("NO_CSHARP_PROJECT"));

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn otros_lenguajes_mantienen_la_raiz_del_workspace() {
        assert_eq!(
            resolve_root("python", Some("/tmp/suelto.py"), "/tmp/proyecto"),
            Ok("/tmp/proyecto".to_string())
        );
    }

    #[test]
    fn lee_mensaje_con_framing_content_length() {
        let payload = r#"{"jsonrpc":"2.0","id":1,"result":{}}"#;
        let input = format!("Content-Length: {}\r\n\r\n{}", payload.len(), payload);
        let mut cursor = std::io::Cursor::new(input.into_bytes());

        let message = read_message(&mut cursor).unwrap().unwrap();
        assert_eq!(message["id"], 1);
        assert!(message["result"].is_object());
    }

    #[test]
    fn lee_varios_mensajes_del_mismo_stream() {
        let first = r#"{"jsonrpc":"2.0","method":"window/logMessage","params":{}}"#;
        let second = r#"{"jsonrpc":"2.0","id":7,"result":null}"#;
        let input = format!(
            "Content-Length: {}\r\n\r\n{}Content-Length: {}\r\n\r\n{}",
            first.len(),
            first,
            second.len(),
            second
        );
        let mut cursor = std::io::Cursor::new(input.into_bytes());

        let message_one = read_message(&mut cursor).unwrap().unwrap();
        let message_two = read_message(&mut cursor).unwrap().unwrap();

        assert_eq!(message_one["method"], "window/logMessage");
        assert_eq!(message_two["id"], 7);
        assert!(read_message(&mut cursor).unwrap().is_none());
    }
}
