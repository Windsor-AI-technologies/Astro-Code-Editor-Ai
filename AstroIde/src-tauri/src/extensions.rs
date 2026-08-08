use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use serde_json::Value;

const OPEN_VSX_API: &str = "https://open-vsx.org/api";

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledExtension {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub version: String,
    pub description: String,
    pub icon: Option<String>,
    pub publisher: String,
    pub enabled: bool,
    pub install_path: String,
}

// ── Extensions directory ──────────────────────────────────────────────────────

fn extensions_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("astro-editor")
        .join("extensions")
}

fn installed_manifest_path() -> PathBuf {
    extensions_dir().join("installed.json")
}

// ── Commands ──────────────────────────────────────────────────────────────────

/// Search extensions on Open VSX
#[tauri::command]
pub fn ext_search(query: String, offset: u32, size: u32) -> Result<Value, String> {
    let url = format!(
        "{}/-/search?query={}&offset={}&size={}&sortBy=downloadCount&sortOrder=desc",
        OPEN_VSX_API,
        urlencoding::encode(&query),
        offset,
        size,
    );

    let response = ureq::get(&url)
        .set("Accept", "application/json")
        .call()
        .map_err(|e| format!("Error al buscar: {}", e))?;

    let json: Value = response.into_json()
        .map_err(|e: std::io::Error| format!("Error al parsear respuesta: {}", e))?;

    Ok(json)
}

/// Get extension details from Open VSX
#[tauri::command]
pub fn ext_get_details(namespace: String, name: String) -> Result<Value, String> {
    let url = format!("{}/{}/{}", OPEN_VSX_API, namespace, name);

    let response = ureq::get(&url)
        .set("Accept", "application/json")
        .call()
        .map_err(|e| format!("Error al obtener detalles: {}", e))?;

    let json: Value = response.into_json()
        .map_err(|e: std::io::Error| format!("Error al parsear respuesta: {}", e))?;

    Ok(json)
}

/// Download and install a .vsix extension
#[tauri::command]
pub fn ext_install(namespace: String, name: String, version: String) -> Result<String, String> {
    let ext_dir = extensions_dir();
    fs::create_dir_all(&ext_dir).map_err(|e| e.to_string())?;

    // Get download URL from Open VSX API
    let details_url = format!("{}/{}/{}/{}", OPEN_VSX_API, namespace, name, version);
    let details: Value = ureq::get(&details_url)
        .set("Accept", "application/json")
        .call()
        .map_err(|e| format!("Error al obtener detalles: {}", e))?
        .into_json()
        .map_err(|e: std::io::Error| e.to_string())?;

    let download_url = details["files"]["download"]
        .as_str()
        .ok_or_else(|| "No se encontró URL de descarga".to_string())?
        .to_string();

    // Download .vsix
    let mut response = ureq::get(&download_url)
        .call()
        .map_err(|e| format!("Error al descargar: {}", e))?;

    let vsix_path = ext_dir.join(format!("{}.{}-{}.vsix", namespace, name, version));
    let mut vsix_bytes: Vec<u8> = Vec::new();
    std::io::Read::read_to_end(&mut response.into_reader(), &mut vsix_bytes)
        .map_err(|e| format!("Error al leer descarga: {}", e))?;

    fs::write(&vsix_path, &vsix_bytes).map_err(|e| e.to_string())?;

    // Extract .vsix (it's a zip file)
    let install_path = ext_dir.join(format!("{}.{}", namespace, name));
    fs::create_dir_all(&install_path).map_err(|e| e.to_string())?;

    extract_vsix(&vsix_path, &install_path)?;

    // Remove .vsix file after extraction
    let _ = fs::remove_file(&vsix_path);

    // Save to installed manifest
    let ext = InstalledExtension {
        id: format!("{}.{}", namespace, name),
        name: name.clone(),
        display_name: details["displayName"].as_str().unwrap_or(&name).to_string(),
        version: version.clone(),
        description: details["description"].as_str().unwrap_or("").to_string(),
        icon: details["files"]["icon"].as_str().map(|s: &str| s.to_string()),
        publisher: namespace.clone(),
        enabled: true,
        install_path: install_path.to_string_lossy().to_string(),
    };

    save_installed_extension(ext)?;

    Ok(format!("{}.{}", namespace, name))
}

/// Uninstall an extension
#[tauri::command]
pub fn ext_uninstall(id: String) -> Result<(), String> {
    let ext_dir = extensions_dir().join(&id);
    if ext_dir.exists() {
        fs::remove_dir_all(&ext_dir).map_err(|e| e.to_string())?;
    }
    remove_installed_extension(&id)?;
    Ok(())
}

/// Get list of installed extensions
#[tauri::command]
pub fn ext_list_installed() -> Result<Vec<InstalledExtension>, String> {
    load_installed_extensions()
}

/// Enable or disable an extension
#[tauri::command]
pub fn ext_set_enabled(id: String, enabled: bool) -> Result<(), String> {
    let mut extensions = load_installed_extensions()?;
    for ext in &mut extensions {
        if ext.id == id {
            ext.enabled = enabled;
            break;
        }
    }
    save_all_installed(&extensions)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn extract_vsix(vsix_path: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    // .vsix is a zip file — extract extension/package.json and extension/ folder
    let file = fs::File::open(vsix_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Error al abrir vsix: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)
            .map_err(|e| e.to_string())?;
        let entry_name = entry.name().to_string();

        // Only extract extension/ content and package.json
        if !entry_name.starts_with("extension/") && entry_name != "extension.vsixmanifest" {
            continue;
        }

        let out_path = dest.join(&entry_name);

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out_file = fs::File::create(&out_path)
                .map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut out_file)
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn load_installed_extensions() -> Result<Vec<InstalledExtension>, String> {
    let path = installed_manifest_path();
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn save_installed_extension(ext: InstalledExtension) -> Result<(), String> {
    let mut extensions = load_installed_extensions()?;
    // Remove if already exists (update)
    extensions.retain(|e| e.id != ext.id);
    extensions.push(ext);
    save_all_installed(&extensions)
}

fn remove_installed_extension(id: &str) -> Result<(), String> {
    let mut extensions = load_installed_extensions()?;
    extensions.retain(|e| e.id != id);
    save_all_installed(&extensions)
}

fn save_all_installed(extensions: &[InstalledExtension]) -> Result<(), String> {
    let path = installed_manifest_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(extensions).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}
