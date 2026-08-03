use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

// ── Language Server Configuration ────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
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
            extensions: vec!["ts".into(), "tsx".into(), "js".into(), "jsx".into(), "mjs".into(), "cjs".into()],
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
            extensions: vec!["c".into(), "cpp".into(), "cc".into(), "h".into(), "hpp".into()],
        },
        // Java — jdtls
        LspServerConfig {
            language_id: "java".into(),
            command: "jdtls".into(),
            args: vec![],
            extensions: vec!["java".into()],
        },
        // C# — csharp-ls
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

// ── LSP Process Instance ─────────────────────────────────────────────────────

struct LspProcess {
    stdin: std::process::ChildStdin,
    stdout: BufReader<std::process::ChildStdout>,
    child: Child,
    request_id: i64,
}

impl LspProcess {
    fn next_id(&mut self) -> i64 {
        self.request_id += 1;
        self.request_id
    }
}

// ── LSP Manager ──────────────────────────────────────────────────────────────

pub struct LspManager {
    processes: HashMap<String, LspProcess>,
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
        self.configs.iter()
            .find(|c| c.extensions.iter().any(|e| e == ext))
            .map(|c| c.language_id.clone())
    }

    /// Start a language server for the given language_id
    pub fn start_server(&mut self, language_id: &str, root_path: &str) -> Result<(), String> {
        if self.processes.contains_key(language_id) {
            return Ok(()); // Already running
        }

        let config = self.configs.iter()
            .find(|c| c.language_id == language_id)
            .cloned()
            .ok_or_else(|| format!("No LSP config for language: {}", language_id))?;

        // Try to spawn the process
        let mut child = Command::new(&config.command)
            .args(&config.args)
            .current_dir(root_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to start {}: {}. Is it installed?", config.command, e))?;

        let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to get stdout")?;

        let mut process = LspProcess {
            stdin,
            stdout: BufReader::new(stdout),
            child,
            request_id: 0,
        };

        // Send initialize request
        let init_id = process.next_id();
        let init_request = json!({
            "jsonrpc": "2.0",
            "id": init_id,
            "method": "initialize",
            "params": {
                "processId": std::process::id(),
                "rootUri": format!("file:///{}", root_path.replace('\\', "/")),
                "capabilities": {
                    "textDocument": {
                        "completion": {
                            "completionItem": {
                                "snippetSupport": true,
                                "resolveSupport": { "properties": ["documentation", "detail"] }
                            },
                            "contextSupport": true
                        },
                        "hover": { "contentFormat": ["markdown", "plaintext"] },
                        "signatureHelp": { "signatureInformation": { "parameterInformation": { "labelOffsetSupport": true } } },
                        "definition": {},
                        "references": {},
                        "documentHighlight": {},
                        "documentSymbol": {},
                        "formatting": {},
                        "rangeFormatting": {},
                        "rename": { "prepareSupport": true },
                        "publishDiagnostics": { "relatedInformation": true }
                    },
                    "workspace": {
                        "workspaceFolders": true
                    }
                },
                "workspaceFolders": [{
                    "uri": format!("file:///{}", root_path.replace('\\', "/")),
                    "name": root_path.split(['\\', '/']).last().unwrap_or("workspace")
                }]
            }
        });

        send_raw(&mut process, &init_request)?;

        // Read initialize response (blocking, with timeout)
        let _response = read_response(&mut process)?;

        // Send initialized notification
        let initialized = json!({
            "jsonrpc": "2.0",
            "method": "initialized",
            "params": {}
        });
        send_raw(&mut process, &initialized)?;

        self.processes.insert(language_id.to_string(), process);
        Ok(())
    }

    /// Stop a language server
    pub fn stop_server(&mut self, language_id: &str) {
        if let Some(mut process) = self.processes.remove(language_id) {
            let _ = process.child.kill();
        }
    }

    /// Stop all servers
    pub fn stop_all(&mut self) {
        let keys: Vec<String> = self.processes.keys().cloned().collect();
        for key in keys {
            self.stop_server(&key);
        }
    }

    /// Send a request to a language server and get a response
    pub fn send_request(&mut self, language_id: &str, method: &str, params: Value) -> Result<Value, String> {
        let process = self.processes.get_mut(language_id)
            .ok_or_else(|| format!("No running LSP for: {}", language_id))?;

        let id = process.next_id();
        let request = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params
        });

        send_raw(process, &request)?;
        read_response(process)
    }

    /// Send a notification (no response expected)
    pub fn send_notification(&mut self, language_id: &str, method: &str, params: Value) -> Result<(), String> {
        let process = self.processes.get_mut(language_id)
            .ok_or_else(|| format!("No running LSP for: {}", language_id))?;

        let notification = json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        });

        send_raw(process, &notification)
    }

    /// Check if a server is running for a language
    pub fn is_running(&self, language_id: &str) -> bool {
        self.processes.contains_key(language_id)
    }

    // ── Internal helpers ──────────────────────────────────────────────────
}

// Free functions to avoid borrow checker issues
fn send_raw(process: &mut LspProcess, msg: &Value) -> Result<(), String> {
    let body = serde_json::to_string(msg).map_err(|e| e.to_string())?;
    let header = format!("Content-Length: {}\r\n\r\n", body.len());

    process.stdin.write_all(header.as_bytes()).map_err(|e| e.to_string())?;
    process.stdin.write_all(body.as_bytes()).map_err(|e| e.to_string())?;
    process.stdin.flush().map_err(|e| e.to_string())?;

    Ok(())
}

fn read_response(process: &mut LspProcess) -> Result<Value, String> {
    // Loop: skip notifications, return only responses (have "id" field)
    loop {
        // Read headers
        let mut content_length: usize = 0;
        loop {
            let mut line = String::new();
            process.stdout.read_line(&mut line).map_err(|e| e.to_string())?;
            let trimmed = line.trim();
            if trimmed.is_empty() {
                break;
            }
            if let Some(len_str) = trimmed.strip_prefix("Content-Length: ") {
                content_length = len_str.parse().map_err(|e: std::num::ParseIntError| e.to_string())?;
            }
        }

        if content_length == 0 {
            return Err("Empty response from LSP".into());
        }

        // Read body
        let mut body = vec![0u8; content_length];
        std::io::Read::read_exact(&mut process.stdout, &mut body).map_err(|e| e.to_string())?;

        let response: Value = serde_json::from_slice(&body).map_err(|e| e.to_string())?;

        // If it has an "id" field, it's a response — return it
        if response.get("id").is_some() {
            return Ok(response);
        }
        // Otherwise it's a notification — continue reading
    }
}

// ── Thread-safe state ────────────────────────────────────────────────────────

pub type LspState = Arc<Mutex<LspManager>>;

pub fn new_lsp_state() -> LspState {
    Arc::new(Mutex::new(LspManager::new()))
}
