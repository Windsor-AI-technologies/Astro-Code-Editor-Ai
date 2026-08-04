use std::fs;
use std::path::Path;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tauri::Manager;

mod terminal;
mod lsp;
use terminal::TerminalState;
use lsp::{LspState, new_lsp_state};

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
