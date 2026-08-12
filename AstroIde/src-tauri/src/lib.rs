use std::fs;
use std::path::Path;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tauri::Manager;

mod terminal;
mod lsp;
mod debugger;
mod extensions;
use terminal::TerminalState;
use lsp::{LspState, new_lsp_state};
use debugger::DebuggerState;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

// ── Archivos ────────────────────────────────────────────────────────────────

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_file(path: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, "").map_err(|e| e.to_string())
}

#[tauri::command]
fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn move_path(source: String, dest_folder: String) -> Result<String, String> {
    let source_path = std::path::Path::new(&source);
    let file_name = source_path.file_name()
        .ok_or_else(|| "No se pudo obtener el nombre del archivo".to_string())?;
    
    let dest_path = std::path::Path::new(&dest_folder).join(file_name);
    
    // No mover a la misma ubicación
    if source_path == dest_path {
        return Err("Origen y destino son iguales".to_string());
    }
    
    // No mover una carpeta dentro de sí misma
    if dest_path.starts_with(source_path) {
        return Err("No se puede mover una carpeta dentro de sí misma".to_string());
    }
    
    // No sobreescribir si ya existe
    if dest_path.exists() {
        return Err(format!("Ya existe: {}", dest_path.display()));
    }
    
    fs::rename(&source, &dest_path).map_err(|e| {
        // Si rename falla (cross-device), intentar copy + delete
        if e.kind() == std::io::ErrorKind::Other || e.kind() == std::io::ErrorKind::PermissionDenied {
            // Fallback: copiar y borrar
            if source_path.is_dir() {
                return format!("No se puede mover entre volúmenes: {}", e);
            }
            match fs::copy(&source, &dest_path) {
                Ok(_) => { let _ = fs::remove_file(&source); return "ok_fallback".to_string(); }
                Err(e2) => return format!("Error al copiar: {}", e2),
            }
        }
        e.to_string()
    }).and_then(|_| Ok(dest_path.to_string_lossy().to_string()))
    .or_else(|e| if e == "ok_fallback" { Ok(dest_path.to_string_lossy().to_string()) } else { Err(e) })
}

// ── Explorador ──────────────────────────────────────────────────────────────

#[tauri::command]
fn read_dir(path: String) -> Result<Vec<FileEntry>, String> {
    read_dir_shallow(&path)
}

/// Lista solo el nivel inmediato de un directorio (sin recursión).
/// Las carpetas tienen children: None, indicando que se cargan bajo demanda.
fn read_dir_shallow(path: &str) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut result: Vec<FileEntry> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let entry_path = entry.path().to_string_lossy().to_string();

        // Filtrar ocultos y directorios pesados
        if name.starts_with('.') { continue; }
        if name == "node_modules" || name == "target" || name == ".git" { continue; }

        let is_dir = metadata.is_dir();
        // Para directorios: children = None indica "cargable bajo demanda"
        // El frontend llamará read_dir cuando el usuario expanda la carpeta
        let children = if is_dir { Some(vec![]) } else { None };

        result.push(FileEntry { name, path: entry_path, is_dir, children });
    }

    result.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(result)
}

// ── Diálogos ────────────────────────────────────────────────────────────────

#[tauri::command]
async fn open_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app.dialog().file().blocking_pick_folder();
    Ok(folder.map(|f| {
        f.as_path()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| f.to_string())
    }))
}

#[tauri::command]
async fn open_file_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file = app.dialog().file().blocking_pick_file();
    Ok(file.map(|f| {
        f.as_path()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| f.to_string())
    }))
}

#[tauri::command]
fn get_path_sep() -> String {
    std::path::MAIN_SEPARATOR.to_string()
}

// ── Settings persistentes ───────────────────────────────────────────────────

fn settings_path() -> std::path::PathBuf {
    let mut path = dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("kiro-editor");
    path.push("settings.json");
    path
}

fn workspace_path() -> std::path::PathBuf {
    let mut path = dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("kiro-editor");
    path.push("workspace.txt");
    path
}

#[tauri::command]
fn load_workspace() -> Result<String, String> {
    let path = workspace_path();
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
fn save_workspace(path: String) -> Result<(), String> {
    let wp = workspace_path();
    if let Some(parent) = wp.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&wp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_settings() -> Result<String, String> {
    let path = settings_path();
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        // Devuelve settings por defecto como JSON
        Ok(serde_json::json!({
            "editor.fontSize": 14,
            "editor.tabSize": 2,
            "editor.wordWrap": "off",
            "editor.minimap": true,
            "editor.theme": "vs-dark",
            "editor.lineNumbers": "on",
            "editor.fontFamily": "'Cascadia Code', 'Fira Code', Consolas, monospace",
            "editor.fontLigatures": true,
            "editor.formatOnSave": false,
            "editor.cursorStyle": "line",
            "editor.renderWhitespace": "selection",
            "workbench.sidebarWidth": 220,
            "workbench.sidebarPosition": "left",
            "workbench.acrylic": true,
            "workbench.acrylicOpacity": 0.35,
            "workbench.colorTheme": "dark"
        }).to_string())
    }
}

#[tauri::command]
fn save_settings(json: String) -> Result<(), String> {
    // Validar que sea JSON válido antes de guardar
    serde_json::from_str::<serde_json::Value>(&json)
        .map_err(|e| format!("JSON inválido: {}", e))?;

    let path = settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, &json).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings_path() -> String {
    settings_path().to_string_lossy().to_string()
}

// ── Detección de proyecto ────────────────────────────────────────────────────

#[tauri::command]
fn detect_project_type(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if p.join("package.json").exists() {
        if let Ok(content) = fs::read_to_string(p.join("package.json")) {
            if content.contains("\"dev\"") {
                return Ok("npm run dev".to_string());
            }
            if content.contains("\"start\"") {
                return Ok("npm start".to_string());
            }
        }
        return Ok("npm start".to_string());
    }
    if p.join("Cargo.toml").exists() {
        return Ok("cargo run".to_string());
    }
    if p.join("main.py").exists() || p.join("app.py").exists() {
        return Ok("python main.py".to_string());
    }
    if p.join("go.mod").exists() {
        return Ok("go run .".to_string());
    }
    Ok("echo No project detected".to_string())
}

// ── LSP Commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn lsp_start(language_id: String, root_path: String, state: tauri::State<'_, LspState>) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    manager.start_server(&language_id, &root_path)
}

#[tauri::command]
fn lsp_stop(language_id: String, state: tauri::State<'_, LspState>) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    manager.stop_server(&language_id);
    Ok(())
}

#[tauri::command]
fn lsp_stop_all(state: tauri::State<'_, LspState>) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    manager.stop_all();
    Ok(())
}

#[tauri::command]
fn lsp_request(language_id: String, method: String, params: serde_json::Value, state: tauri::State<'_, LspState>) -> Result<serde_json::Value, String> {
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    manager.send_request(&language_id, &method, params)
}

#[tauri::command]
fn lsp_notify(language_id: String, method: String, params: serde_json::Value, state: tauri::State<'_, LspState>) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    manager.send_notification(&language_id, &method, params)
}

#[tauri::command]
fn lsp_is_running(language_id: String, state: tauri::State<'_, LspState>) -> bool {
    let manager = state.lock().unwrap_or_else(|e| e.into_inner());
    manager.is_running(&language_id)
}

#[tauri::command]
fn lsp_language_for_file(file_path: String, state: tauri::State<'_, LspState>) -> Option<String> {
    let manager = state.lock().unwrap_or_else(|e| e.into_inner());
    let ext = file_path.rsplit('.').next().unwrap_or("");
    manager.language_for_extension(ext)
}

// ── Setup con vibrancy ──────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Arc::new(TerminalState::new()))
        .manage(new_lsp_state())
        .manage(Arc::new(DebuggerState::new()))
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();

            // Efecto acrílico nativo en Windows 11
            #[cfg(target_os = "windows")]
            {
                use window_vibrancy::apply_acrylic;
                let _ = apply_acrylic(&win, Some((0, 0, 0, 80)));
            }

            // Blur en macOS
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                let _ = apply_vibrancy(&win, NSVisualEffectMaterial::HudWindow, None, None);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            create_file,
            create_dir,
            delete_path,
            rename_path,
            move_path,
            read_dir,
            open_folder_dialog,
            open_file_dialog,
            get_path_sep,
            load_settings,
            save_settings,
            get_settings_path,
            load_workspace,
            save_workspace,
            detect_project_type,
            lsp_start,
            lsp_stop,
            lsp_stop_all,
            lsp_request,
            lsp_notify,
            lsp_is_running,
            lsp_language_for_file,
            terminal::spawn_terminal,
            terminal::write_terminal,
            terminal::resize_terminal,
            terminal::kill_terminal,
            terminal::kill_all_terminals,
            debugger::debug_start,
            debugger::debug_stop,
            debugger::debug_set_breakpoint,
            debugger::debug_remove_breakpoint,
            debugger::debug_resume,
            debugger::debug_step_over,
            debugger::debug_step_into,
            debugger::debug_step_out,
            debugger::debug_pause,
            debugger::debug_evaluate,
            debugger::debug_get_properties,
            extensions::ext_search,
            extensions::ext_get_details,
            extensions::ext_install,
            extensions::ext_uninstall,
            extensions::ext_list_installed,
            extensions::ext_set_enabled,
            ai_chat,
            whisper_transcribe,
            perl_open_url,
            perl_open_app,
            perl_web_search,
            perl_tts,
            open_supabase_webview,
            close_supabase_webview,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ── AI Proxy (hace requests HTTP desde Rust para evitar restricciones del webview) ──

#[tauri::command]
fn ai_chat(url: String, body: String, auth_header: String) -> Result<String, String> {
    let response = ureq::post(&url)
        .set("Content-Type", "application/json")
        .set("Authorization", &auth_header)
        .send_string(&body)
        .map_err(|e| format!("Error: {}", e))?;

    response.into_string().map_err(|e| e.to_string())
}

/// Open a URL in the default browser
#[tauri::command]
fn perl_open_url(url: String) -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &url])
        .spawn()
        .map_err(|e| format!("Failed to open URL: {}", e))?;
    Ok(())
}

/// Open an application by name — searches Start Menu shortcuts, registry, and PATH
#[tauri::command]
fn perl_open_app(app_name: String) -> Result<String, String> {
    let lower = app_name.to_lowercase();

    // 1. Search Start Menu shortcuts (.lnk files) — this finds ANY installed app
    let search_dirs = vec![
        std::env::var("ProgramData").unwrap_or_default() + r"\Microsoft\Windows\Start Menu\Programs",
        std::env::var("APPDATA").unwrap_or_default() + r"\Microsoft\Windows\Start Menu\Programs",
        std::env::var("LOCALAPPDATA").unwrap_or_default() + r"\Microsoft\Windows\Start Menu\Programs",
    ];

    for dir in &search_dirs {
        if let Ok(found) = search_shortcut_recursive(dir, &lower) {
            // Found a .lnk file matching the name — open it
            let result = std::process::Command::new("cmd")
                .args(["/C", "start", "", &found])
                .spawn();
            if result.is_ok() {
                return Ok(format!("Abriendo {}", app_name));
            }
        }
    }

    // 2. Try PowerShell Get-StartApps to find the app
    let ps_script = format!(
        r#"$app = Get-StartApps | Where-Object {{ $_.Name -like '*{}*' }} | Select-Object -First 1; if ($app) {{ Start-Process "shell:AppsFolder\$($app.AppID)"; echo "OK" }} else {{ echo "NOT_FOUND" }}"#,
        lower.replace("'", "''")
    );

    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .output()
        .map_err(|e| format!("PowerShell error: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if stdout.contains("OK") {
        return Ok(format!("Abriendo {}", app_name));
    }

    // 3. Fallback: try direct `start` command (for apps in PATH)
    let result = std::process::Command::new("cmd")
        .args(["/C", "start", "", &app_name])
        .spawn();

    match result {
        Ok(_) => Ok(format!("Abriendo {}", app_name)),
        Err(e) => Err(format!("No encontré '{}' en tu computadora: {}", app_name, e)),
    }
}

/// Recursively search for a .lnk shortcut matching the app name
fn search_shortcut_recursive(dir: &str, name: &str) -> Result<String, ()> {
    let path = std::path::Path::new(dir);
    if !path.exists() { return Err(()); }

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                if let Ok(found) = search_shortcut_recursive(entry_path.to_str().unwrap_or(""), name) {
                    return Ok(found);
                }
            } else if let Some(file_name) = entry_path.file_stem() {
                let fname = file_name.to_string_lossy().to_lowercase();
                if fname.contains(name) || name.contains(&fname) {
                    return Ok(entry_path.to_string_lossy().to_string());
                }
            }
        }
    }
    Err(())
}

/// Text-to-Speech using edge-tts (Microsoft Edge voices, free, high quality)
#[tauri::command]
fn perl_tts(text: String) -> Result<String, String> {
    use std::process::Command;
    use std::io::Read;

    let temp_dir = std::env::temp_dir();
    let output_file = temp_dir.join("perl_tts_output.mp3");
    let output_path = output_file.to_string_lossy().to_string();

    // Run edge-tts to generate mp3
    let status = Command::new("edge-tts")
        .args([
            "--voice", "es-MX-DaliaNeural",
            "--text", &text,
            "--write-media", &output_path,
        ])
        .output()
        .map_err(|e| format!("edge-tts not found: {}", e))?;

    if !status.status.success() {
        return Err(format!("edge-tts failed: {}", String::from_utf8_lossy(&status.stderr)));
    }

    // Read the file and encode as base64
    let mut file = std::fs::File::open(&output_file)
        .map_err(|e| format!("Cannot read audio: {}", e))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("Read error: {}", e))?;

    // Clean up
    let _ = std::fs::remove_file(&output_file);

    // Encode to base64
    let base64 = base64_encode(&buffer);
    Ok(base64)
}

fn base64_encode(input: &[u8]) -> String {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        result.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 { result.push(TABLE[((triple >> 6) & 0x3F) as usize] as char); } else { result.push('='); }
        if chunk.len() > 2 { result.push(TABLE[(triple & 0x3F) as usize] as char); } else { result.push('='); }
    }
    result
}

/// Run a web search — opens default browser with Google search
#[tauri::command]
fn perl_web_search(query: String) -> Result<(), String> {
    let encoded = urlencoding::encode(&query);
    let url = format!("https://www.google.com/search?q={}", encoded);
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &url])
        .spawn()
        .map_err(|e| format!("Failed to search: {}", e))?;
    Ok(())
}

/// Whisper transcription — receives audio as base64, sends multipart to Groq
#[tauri::command]
fn whisper_transcribe(audio_base64: String, api_key: String) -> Result<String, String> {
    use std::io::Read;

    let audio_bytes = base64_decode(&audio_base64)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    // Build multipart form data manually for ureq
    let boundary = "----PerlAudioBoundary9876543210";
    let mut body: Vec<u8> = Vec::new();

    // File field
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(b"Content-Disposition: form-data; name=\"file\"; filename=\"audio.webm\"\r\n");
    body.extend_from_slice(b"Content-Type: audio/webm\r\n\r\n");
    body.extend_from_slice(&audio_bytes);
    body.extend_from_slice(b"\r\n");

    // Model field
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(b"Content-Disposition: form-data; name=\"model\"\r\n\r\n");
    body.extend_from_slice(b"whisper-large-v3-turbo\r\n");

    // Language field
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(b"Content-Disposition: form-data; name=\"language\"\r\n\r\n");
    body.extend_from_slice(b"es\r\n");

    // End boundary
    body.extend_from_slice(format!("--{}--\r\n", boundary).as_bytes());

    let content_type = format!("multipart/form-data; boundary={}", boundary);

    let response = ureq::post("https://api.groq.com/openai/v1/audio/transcriptions")
        .set("Authorization", &format!("Bearer {}", api_key))
        .set("Content-Type", &content_type)
        .send_bytes(&body)
        .map_err(|e| format!("Whisper API error: {}", e))?;

    let mut result = String::new();
    response.into_reader().read_to_string(&mut result).map_err(|e| e.to_string())?;

    // Parse JSON to extract text
    if let Some(start) = result.find("\"text\"") {
        if let Some(colon) = result[start..].find(':') {
            let after_colon = &result[start + colon + 1..];
            let trimmed = after_colon.trim();
            if trimmed.starts_with('"') {
                if let Some(end) = trimmed[1..].find('"') {
                    return Ok(trimmed[1..end + 1].to_string());
                }
            }
        }
    }

    Ok(result)
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    // Simple base64 decoder
    let table: Vec<u8> = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
        .to_vec();
    let input = input.replace('\n', "").replace('\r', "");
    let mut output = Vec::new();
    let mut buf: u32 = 0;
    let mut bits: u32 = 0;

    for c in input.bytes() {
        if c == b'=' { break; }
        let val = match table.iter().position(|&x| x == c) {
            Some(v) => v as u32,
            None => continue,
        };
        buf = (buf << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }
    Ok(output)
}

// ── Supabase Webview (embedded, keeps session) ──────────────────────────────

#[tauri::command]
async fn open_supabase_webview(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::WebviewWindowBuilder;
    use tauri::WebviewUrl;

    // Check if already exists
    if app.get_webview_window("supabase").is_some() {
        return Ok(());
    }

    // Create a borderless webview window positioned over the main window
    WebviewWindowBuilder::new(
        &app,
        "supabase",
        WebviewUrl::External("https://supabase.com/dashboard".parse().unwrap()),
    )
    .title("Supabase")
    .decorations(false)
    .transparent(false)
    .resizable(false)
    .inner_size(1100.0, 650.0)
    .position(150.0, 80.0)
    .always_on_top(true)
    .build()
    .map_err(|e: tauri::Error| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn close_supabase_webview(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(webview) = app.get_webview_window("supabase") {
        webview.close().map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}
