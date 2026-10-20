use std::collections::BTreeMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha512};
use tauri::{AppHandle, Emitter};

pub const DOTNET_SDK_ID: &str = "dotnet-sdk";
pub const CSHARP_LS_ID: &str = "csharp-ls";

const DOTNET_CHANNEL: &str = "10.0";
const METADATA_URL: &str =
    "https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json";
const PROGRESS_EVENT: &str = "toolchain-progress";

static INSTALLING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolchainInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub kind: String,
    pub installed: bool,
    pub enabled: bool,
    pub version: Option<String>,
    pub source: String,
    pub install_path: Option<String>,
    pub can_install: bool,
    pub can_uninstall: bool,
    pub requires: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolchainProgress {
    pub id: String,
    pub phase: String,
    pub message: String,
    pub downloaded: u64,
    pub total: u64,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct ToolchainState {
    #[serde(default)]
    enabled: BTreeMap<String, bool>,
}

#[derive(Debug, Deserialize)]
struct ReleasesIndex {
    #[serde(rename = "latest-sdk")]
    latest_sdk: Option<String>,
    releases: Vec<ReleaseEntry>,
}

#[derive(Debug, Deserialize)]
struct ReleaseEntry {
    sdk: Option<ReleaseSdk>,
}

#[derive(Debug, Deserialize)]
struct ReleaseSdk {
    version: String,
    files: Vec<SdkFile>,
}

#[derive(Debug, Deserialize)]
struct SdkFile {
    name: String,
    rid: String,
    url: String,
    #[serde(default)]
    hash: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct SdkDownload {
    version: String,
    name: String,
    url: String,
    hash: String,
}

struct InstallGuard;

impl Drop for InstallGuard {
    fn drop(&mut self) {
        INSTALLING.store(false, Ordering::SeqCst);
    }
}

fn acquire_install() -> Result<InstallGuard, String> {
    if INSTALLING
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err("Ya hay una instalación de herramientas en curso".to_string());
    }
    Ok(InstallGuard)
}

// ── Rutas y estado ───────────────────────────────────────────────────────────

fn base_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".astroide")
        .join("toolchains")
}

fn sdk_dir() -> PathBuf {
    base_dir().join("dotnet-sdk")
}

fn tools_dir() -> PathBuf {
    base_dir().join("dotnet-tools")
}

fn downloads_dir() -> PathBuf {
    base_dir().join("downloads")
}

fn state_path() -> PathBuf {
    base_dir().join("state.json")
}

fn read_state() -> ToolchainState {
    fs::read_to_string(state_path())
        .ok()
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default()
}

fn write_state(state: &ToolchainState) -> Result<(), String> {
    fs::create_dir_all(base_dir()).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    fs::write(state_path(), json).map_err(|e| e.to_string())
}

pub fn is_enabled(id: &str) -> bool {
    read_state().enabled.get(id).copied().unwrap_or(true)
}

pub fn set_enabled(id: &str, enabled: bool) -> Result<(), String> {
    if id != DOTNET_SDK_ID && id != CSHARP_LS_ID {
        return Err(format!("Herramienta desconocida: {}", id));
    }
    let mut state = read_state();
    state.enabled.insert(id.to_string(), enabled);
    write_state(&state)
}

fn executable_name(name: &str) -> String {
    if cfg!(windows) {
        format!("{}.exe", name)
    } else {
        name.to_string()
    }
}

fn find_binary_in(dir: &Path, name: &str) -> Option<PathBuf> {
    #[allow(unused_mut)]
    let mut candidates = vec![dir.join(executable_name(name)), dir.join(name)];
    #[cfg(windows)]
    {
        candidates.push(dir.join(format!("{}.cmd", name)));
        candidates.push(dir.join(format!("{}.bat", name)));
    }
    candidates.into_iter().find(|path| path.is_file())
}

fn portable_sdk_bin() -> Option<PathBuf> {
    find_binary_in(&sdk_dir(), "dotnet")
}

fn portable_csharp_ls_bin() -> Option<PathBuf> {
    find_binary_in(&tools_dir(), "csharp-ls")
}

fn find_on_path(name: &str) -> Option<PathBuf> {
    let path_var = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path_var) {
        if let Some(candidate) = find_binary_in(&dir, name) {
            return Some(candidate);
        }
    }
    None
}

fn system_csharp_ls() -> Option<PathBuf> {
    find_on_path("csharp-ls").or_else(|| {
        dirs::home_dir()
            .and_then(|home| find_binary_in(&home.join(".dotnet").join("tools"), "csharp-ls"))
    })
}

/// Directorio raíz de una instalación de .NET a partir de su ejecutable.
fn dotnet_root_for_bin(bin: &Path) -> Option<PathBuf> {
    let canonical = bin.canonicalize().ok()?;
    let root = canonical.parent()?.to_path_buf();
    if root.join("shared").join("Microsoft.NETCore.App").is_dir() {
        Some(root)
    } else {
        None
    }
}

/// Instalación local del usuario (`~/.dotnet`), habitual al usar dotnet-install.
fn user_dotnet_root() -> Option<PathBuf> {
    if let Some(root) = std::env::var_os("DOTNET_ROOT") {
        let root = PathBuf::from(root);
        if root.join("shared").join("Microsoft.NETCore.App").is_dir() {
            return Some(root);
        }
    }

    let home = dirs::home_dir()?;
    dotnet_root_for_bin(&home.join(".dotnet").join("dotnet"))
}

/// .NET del sistema priorizando una instalación local completa sobre el PATH.
fn system_dotnet_bin() -> Option<PathBuf> {
    user_dotnet_root()
        .map(|root| root.join(executable_name("dotnet")))
        .or_else(|| find_on_path("dotnet"))
}

/// Ejecutable de .NET que debe usar el editor (portátil si está activo).
pub fn resolve_dotnet() -> Option<PathBuf> {
    if is_enabled(DOTNET_SDK_ID) {
        if let Some(portable) = portable_sdk_bin() {
            return Some(portable);
        }
    }
    system_dotnet_bin()
}

fn dotnet_for_install() -> Option<PathBuf> {
    portable_sdk_bin().or_else(resolve_dotnet)
}

/// Resuelve un ejecutable aplicando la configuración de herramientas portátiles.
pub fn resolve_executable(name: &str) -> Option<PathBuf> {
    if name == "csharp-ls" {
        if !is_enabled(CSHARP_LS_ID) {
            return None;
        }
        if let Some(portable) = portable_csharp_ls_bin() {
            return resolve_dotnet().is_some().then_some(portable);
        }
        return system_csharp_ls();
    }

    if name == "dotnet" {
        return resolve_dotnet();
    }

    find_on_path(name)
}

/// Prepara el entorno de un proceso para usar el SDK portátil si está activo.
pub fn apply_env(command: &mut Command) {
    command
        .env("DOTNET_CLI_TELEMETRY_OPTOUT", "1")
        .env("DOTNET_NOLOGO", "1")
        .env("DOTNET_SKIP_FIRST_TIME_EXPERIENCE", "1");

    // Sin DOTNET_ROOT, csharp-ls no encuentra el runtime cuando la app se
    // inicia desde el escritorio (PATH mínimo, sin ~/.dotnet).
    let portable_root = if is_enabled(DOTNET_SDK_ID) && portable_sdk_bin().is_some() {
        Some(sdk_dir())
    } else {
        None
    };
    let root = portable_root
        .or_else(user_dotnet_root)
        .or_else(|| system_dotnet_bin().and_then(|bin| dotnet_root_for_bin(&bin)));

    let Some(root) = root else {
        return;
    };

    command.env("DOTNET_ROOT", &root);
    command.env("DOTNET_MULTILEVEL_LOOKUP", "0");

    let mut paths = vec![root.clone()];
    if is_enabled(CSHARP_LS_ID) && portable_csharp_ls_bin().is_some() {
        paths.push(tools_dir());
    }
    if let Some(existing) = std::env::var_os("PATH") {
        paths.extend(std::env::split_paths(&existing));
    }
    if let Ok(joined) = std::env::join_paths(paths) {
        command.env("PATH", joined);
    }
}

/// Crea un `Command` que resuelve el ejecutable y aplica el entorno de .NET.
pub fn command(program: &str) -> Command {
    let mut command = if program.contains('/') || program.contains('\\') {
        Command::new(program)
    } else {
        match resolve_executable(program) {
            Some(path) => Command::new(path),
            None => Command::new(program),
        }
    };
    apply_env(&mut command);
    command
}

fn version_key(version: &str) -> Vec<u32> {
    version
        .split(|c: char| !c.is_ascii_digit())
        .filter(|part| !part.is_empty())
        .map(|part| part.parse().unwrap_or(0))
        .collect()
}

fn max_version(versions: impl IntoIterator<Item = String>) -> Option<String> {
    versions
        .into_iter()
        .max_by_key(|version| version_key(version))
}

fn portable_sdk_version() -> Option<String> {
    let entries = fs::read_dir(sdk_dir().join("sdk")).ok()?;
    max_version(entries.filter_map(|entry| {
        let entry = entry.ok()?;
        if !entry.file_type().ok()?.is_dir() {
            return None;
        }
        entry.file_name().to_str().map(|name| name.to_string())
    }))
}

fn portable_csharp_ls_version() -> Option<String> {
    let entries = fs::read_dir(tools_dir().join(".store").join("csharp-ls")).ok()?;
    max_version(entries.filter_map(|entry| {
        let entry = entry.ok()?;
        if !entry.file_type().ok()?.is_dir() {
            return None;
        }
        entry.file_name().to_str().map(|name| name.to_string())
    }))
}

fn system_dotnet_version() -> Option<String> {
    let output = Command::new(system_dotnet_bin()?)
        .arg("--version")
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
    (!version.is_empty()).then_some(version)
}

fn dotnet_major_version(bin: &Path) -> Option<u32> {
    let output = Command::new(bin).arg("--version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .split('.')
        .next()?
        .parse()
        .ok()
}

// ── Catálogo ─────────────────────────────────────────────────────────────────

pub fn list() -> Vec<ToolchainInfo> {
    let portable_sdk = portable_sdk_bin();
    let portable_ls = portable_csharp_ls_bin();
    let system_sdk_version = system_dotnet_version();
    let system_ls = system_csharp_ls();

    let sdk_source = if portable_sdk.is_some() {
        "portable"
    } else if system_sdk_version.is_some() {
        "system"
    } else {
        "none"
    };

    let ls_source = if portable_ls.is_some() {
        "portable"
    } else if system_ls.is_some() {
        "system"
    } else {
        "none"
    };

    let dotnet_available = sdk_source != "none";

    vec![
        ToolchainInfo {
            id: DOTNET_SDK_ID.to_string(),
            name: ".NET SDK".to_string(),
            description:
                "Compilador, runtime y MSBuild de .NET. Necesario para IntelliSense de C#, proyectos y NuGet."
                    .to_string(),
            kind: "sdk".to_string(),
            installed: sdk_source != "none",
            enabled: is_enabled(DOTNET_SDK_ID),
            version: if sdk_source == "portable" {
                portable_sdk_version()
            } else {
                system_sdk_version.clone()
            },
            source: sdk_source.to_string(),
            install_path: portable_sdk
                .as_ref()
                .map(|_| sdk_dir().to_string_lossy().to_string()),
            can_install: sdk_source != "portable",
            can_uninstall: sdk_source == "portable",
            requires: None,
        },
        ToolchainInfo {
            id: CSHARP_LS_ID.to_string(),
            name: "C# IntelliSense (csharp-ls)".to_string(),
            description:
                "Servidor de lenguaje basado en Roslyn: autocompletado, errores, hover, firma de métodos y navegación."
                    .to_string(),
            kind: "language-server".to_string(),
            installed: ls_source != "none",
            enabled: is_enabled(CSHARP_LS_ID),
            version: if ls_source == "portable" {
                portable_csharp_ls_version()
            } else {
                None
            },
            source: ls_source.to_string(),
            install_path: portable_ls
                .as_ref()
                .map(|_| tools_dir().to_string_lossy().to_string()),
            can_install: dotnet_available && ls_source != "portable",
            can_uninstall: ls_source == "portable",
            requires: Some(DOTNET_SDK_ID.to_string()),
        },
    ]
}

// ── Instalación ──────────────────────────────────────────────────────────────

pub fn install(app: &AppHandle, id: &str) -> Result<(), String> {
    match id {
        DOTNET_SDK_ID => install_dotnet_sdk(app),
        CSHARP_LS_ID => install_csharp_ls(app),
        _ => Err(format!("Herramienta desconocida: {}", id)),
    }
}

fn emit(
    app: &AppHandle,
    id: &str,
    phase: &str,
    message: impl Into<String>,
    downloaded: u64,
    total: u64,
) {
    let _ = app.emit(
        PROGRESS_EVENT,
        ToolchainProgress {
            id: id.to_string(),
            phase: phase.to_string(),
            message: message.into(),
            downloaded,
            total,
        },
    );
}

fn platform_archive() -> Result<(&'static str, &'static str), String> {
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        return Ok(("linux-x64", "tar.gz"));
    }
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    {
        return Ok(("linux-arm64", "tar.gz"));
    }
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    {
        return Ok(("osx-x64", "tar.gz"));
    }
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        return Ok(("osx-arm64", "tar.gz"));
    }
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    {
        return Ok(("win-x64", "zip"));
    }
    #[cfg(all(target_os = "windows", target_arch = "aarch64"))]
    {
        return Ok(("win-arm64", "zip"));
    }
    #[allow(unreachable_code)]
    Err("Plataforma no soportada para instalar .NET de forma portátil".to_string())
}

fn select_sdk_download(index: &ReleasesIndex, rid: &str, extension: &str) -> Option<SdkDownload> {
    let preferred = index.latest_sdk.as_deref();
    let mut fallback: Option<SdkDownload> = None;

    for release in &index.releases {
        let Some(sdk) = &release.sdk else { continue };
        if sdk.version.contains('-') {
            continue;
        }
        let Some(file) = sdk
            .files
            .iter()
            .find(|file| file.rid == rid && file.name.ends_with(extension))
        else {
            continue;
        };

        let download = SdkDownload {
            version: sdk.version.clone(),
            name: file.name.clone(),
            url: file.url.clone(),
            hash: file.hash.clone(),
        };

        if preferred
            .map(|version| version == sdk.version)
            .unwrap_or(false)
        {
            return Some(download);
        }
        if fallback.is_none() {
            fallback = Some(download);
        }
    }

    fallback
}

fn fetch_release_index() -> Result<ReleasesIndex, String> {
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(20))
        .timeout_read(Duration::from_secs(60))
        .build();
    let response = agent
        .get(METADATA_URL)
        .call()
        .map_err(|e| format!("No se pudo consultar la versión de .NET: {}", e))?;
    response
        .into_json::<ReleasesIndex>()
        .map_err(|e| format!("Respuesta de .NET inválida: {}", e))
}

fn download_file(app: &AppHandle, id: &str, url: &str, destination: &Path) -> Result<(), String> {
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(20))
        .timeout_read(Duration::from_secs(120))
        .build();
    let response = agent
        .get(url)
        .call()
        .map_err(|e| format!("No se pudo descargar {}: {}", url, e))?;
    let total = response
        .header("Content-Length")
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(0);

    let mut reader = response.into_reader();
    let mut file = fs::File::create(destination)
        .map_err(|e| format!("No se pudo crear el archivo de descarga: {}", e))?;
    let mut buffer = vec![0u8; 128 * 1024];
    let mut downloaded = 0u64;
    let mut last_emit = Instant::now();

    loop {
        let read = reader
            .read(&mut buffer)
            .map_err(|e| format!("Error durante la descarga: {}", e))?;
        if read == 0 {
            break;
        }
        file.write_all(&buffer[..read])
            .map_err(|e| format!("No se pudo escribir la descarga: {}", e))?;
        downloaded += read as u64;

        if last_emit.elapsed() >= Duration::from_millis(250) {
            emit(
                app,
                id,
                "download",
                format!(
                    "Descargando .NET… {:.1} MB",
                    downloaded as f64 / 1_048_576.0
                ),
                downloaded,
                total,
            );
            last_emit = Instant::now();
        }
    }

    file.flush().map_err(|e| e.to_string())?;
    emit(
        app,
        id,
        "download",
        "Descarga completada",
        downloaded,
        total,
    );
    Ok(())
}

fn verify_sha512(path: &Path, expected: &str) -> Result<(), String> {
    if expected.trim().is_empty() {
        return Ok(());
    }

    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha512::new();
    let mut buffer = vec![0u8; 128 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }

    let actual = format!("{:x}", hasher.finalize());
    if actual.eq_ignore_ascii_case(expected.trim()) {
        Ok(())
    } else {
        Err("La descarga de .NET está corrupta (hash SHA-512 no coincide)".to_string())
    }
}

fn extract_archive(archive: &Path, destination: &Path) -> Result<(), String> {
    let extension = archive
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();

    if extension == "zip" {
        extract_zip(archive, destination)
    } else {
        extract_tar_gz(archive, destination)
    }
}

fn extract_tar_gz(archive: &Path, destination: &Path) -> Result<(), String> {
    let file = fs::File::open(archive).map_err(|e| e.to_string())?;
    let decoder = flate2::read::GzDecoder::new(file);
    let mut tar = tar::Archive::new(decoder);
    tar.set_preserve_permissions(true);
    tar.unpack(destination)
        .map_err(|e| format!("No se pudo extraer .NET: {}", e))
}

#[cfg(windows)]
fn extract_zip(archive: &Path, destination: &Path) -> Result<(), String> {
    let file = fs::File::open(archive).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for index in 0..zip.len() {
        let mut entry = zip.by_index(index).map_err(|e| e.to_string())?;
        let relative = entry
            .enclosed_name()
            .map(|path| path.to_owned())
            .ok_or("El archivo ZIP contiene una ruta no segura")?;
        let target = destination.join(relative);

        if entry.is_dir() {
            fs::create_dir_all(&target).map_err(|e| e.to_string())?;
            continue;
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut output = fs::File::create(&target).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut output).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(not(windows))]
fn extract_zip(archive: &Path, destination: &Path) -> Result<(), String> {
    let file = fs::File::open(archive).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for index in 0..zip.len() {
        let mut entry = zip.by_index(index).map_err(|e| e.to_string())?;
        let relative = entry
            .enclosed_name()
            .map(|path| path.to_owned())
            .ok_or("El archivo ZIP contiene una ruta no segura")?;
        let target = destination.join(relative);

        if entry.is_dir() {
            fs::create_dir_all(&target).map_err(|e| e.to_string())?;
            continue;
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut output = fs::File::create(&target).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut output).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = entry.unix_mode() {
                let _ = fs::set_permissions(&target, fs::Permissions::from_mode(mode));
            }
        }
    }
    Ok(())
}

fn replace_dir(new_dir: &Path, target: &Path) -> Result<(), String> {
    if target.exists() {
        let backup = target.with_extension("old");
        let _ = fs::remove_dir_all(&backup);
        fs::rename(target, &backup).map_err(|e| format!("No se pudo reemplazar .NET: {}", e))?;
        if let Err(error) = fs::rename(new_dir, target) {
            let _ = fs::rename(&backup, target);
            return Err(format!("No se pudo instalar .NET: {}", error));
        }
        let _ = fs::remove_dir_all(&backup);
    } else {
        fs::rename(new_dir, target).map_err(|e| format!("No se pudo instalar .NET: {}", e))?;
    }
    Ok(())
}

fn install_dotnet_sdk(app: &AppHandle) -> Result<(), String> {
    let _guard = acquire_install()?;
    let id = DOTNET_SDK_ID;

    emit(
        app,
        id,
        "metadata",
        "Consultando la última versión de .NET…",
        0,
        0,
    );
    let index = fetch_release_index()?;
    let (rid, extension) = platform_archive()?;
    let download = select_sdk_download(&index, rid, extension).ok_or_else(|| {
        format!(
            "No se encontró un SDK de .NET para {} ({})",
            rid, DOTNET_CHANNEL
        )
    })?;

    let base = base_dir();
    let downloads = downloads_dir();
    fs::create_dir_all(&downloads).map_err(|e| e.to_string())?;
    let archive = downloads.join(&download.name);

    emit(
        app,
        id,
        "download",
        format!("Descargando .NET SDK {}…", download.version),
        0,
        0,
    );
    download_file(app, id, &download.url, &archive)?;

    emit(app, id, "verify", "Verificando la descarga…", 0, 0);
    verify_sha512(&archive, &download.hash)?;

    let temporary = base.join("dotnet-sdk.tmp");
    let _ = fs::remove_dir_all(&temporary);
    fs::create_dir_all(&temporary).map_err(|e| e.to_string())?;

    emit(app, id, "extract", "Extrayendo .NET SDK…", 0, 0);
    if let Err(error) = extract_archive(&archive, &temporary) {
        let _ = fs::remove_dir_all(&temporary);
        return Err(error);
    }

    emit(app, id, "extract", "Activando .NET SDK…", 0, 0);
    replace_dir(&temporary, &sdk_dir())?;
    let _ = fs::remove_file(&archive);

    emit(app, id, "tools", "Instalando csharp-ls…", 0, 0);
    install_csharp_ls_package(app, Some(&sdk_dir()))?;

    let mut state = read_state();
    state.enabled.insert(DOTNET_SDK_ID.to_string(), true);
    state.enabled.insert(CSHARP_LS_ID.to_string(), true);
    write_state(&state)?;

    emit(
        app,
        id,
        "done",
        format!(".NET SDK {} y csharp-ls instalados", download.version),
        0,
        0,
    );
    Ok(())
}

fn install_csharp_ls_package(app: &AppHandle, sdk_root: Option<&Path>) -> Result<(), String> {
    let dotnet = match sdk_root {
        Some(root) => find_binary_in(root, "dotnet")
            .ok_or("No se encontró el ejecutable de .NET recién instalado")?,
        None => {
            dotnet_for_install().ok_or("No se encontró el SDK de .NET para instalar csharp-ls")?
        }
    };
    if dotnet_major_version(&dotnet).is_none_or(|major| major < 10) {
        return Err(
            "csharp-ls 0.28 requiere .NET 10. Instala el SDK portátil de .NET 10 \
             desde la tarjeta .NET SDK e inténtalo de nuevo."
                .to_string(),
        );
    }

    let tools = tools_dir();
    fs::create_dir_all(&tools).map_err(|e| e.to_string())?;

    let installed = portable_csharp_ls_bin().is_some();
    let (action, extra) = if installed {
        (
            "update",
            vec!["--tool-path", tools.to_str().unwrap_or_default()],
        )
    } else {
        (
            "install",
            vec!["--tool-path", tools.to_str().unwrap_or_default()],
        )
    };

    let mut command = Command::new(&dotnet);
    command
        .args(["tool", action, "csharp-ls"])
        .args(extra)
        .env("DOTNET_MULTILEVEL_LOOKUP", "0")
        .env("DOTNET_CLI_TELEMETRY_OPTOUT", "1")
        .env("DOTNET_NOLOGO", "1")
        .env("DOTNET_SKIP_FIRST_TIME_EXPERIENCE", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(root) = sdk_root {
        command.env("DOTNET_ROOT", root);
    }

    if let Some(existing) = std::env::var_os("PATH") {
        let mut paths = vec![tools.clone()];
        if let Some(root) = sdk_root {
            paths.insert(0, root.to_path_buf());
        }
        paths.extend(std::env::split_paths(&existing));
        if let Ok(joined) = std::env::join_paths(paths) {
            command.env("PATH", joined);
        }
    }

    let output = command
        .output()
        .map_err(|e| format!("No se pudo ejecutar dotnet tool {}: {}", action, e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "No se pudo instalar csharp-ls:\n{}{}",
            stdout.trim(),
            stderr.trim()
        ));
    }

    emit(app, CSHARP_LS_ID, "done", "csharp-ls instalado", 0, 0);
    Ok(())
}

fn install_csharp_ls(app: &AppHandle) -> Result<(), String> {
    let _guard = acquire_install()?;
    if dotnet_for_install().is_none() {
        return Err("Primero instala el SDK de .NET (o tenlo disponible en el PATH)".to_string());
    }

    emit(app, CSHARP_LS_ID, "tools", "Instalando csharp-ls…", 0, 0);

    let sdk_root = if portable_sdk_bin().is_some() {
        Some(sdk_dir())
    } else {
        None
    };
    install_csharp_ls_package(app, sdk_root.as_deref())?;

    let mut state = read_state();
    state.enabled.insert(CSHARP_LS_ID.to_string(), true);
    if portable_sdk_bin().is_some() {
        state.enabled.insert(DOTNET_SDK_ID.to_string(), true);
    }
    write_state(&state)?;

    emit(app, CSHARP_LS_ID, "done", "IntelliSense de C# listo", 0, 0);
    Ok(())
}

// ── Desinstalación ───────────────────────────────────────────────────────────

fn remove_dir(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    fs::remove_dir_all(path).map_err(|e| format!("No se pudo eliminar {}: {}", path.display(), e))
}

pub fn uninstall(id: &str) -> Result<(), String> {
    match id {
        DOTNET_SDK_ID => {
            remove_dir(&sdk_dir())?;
            remove_dir(&tools_dir())?;
            let mut state = read_state();
            state.enabled.remove(DOTNET_SDK_ID);
            state.enabled.remove(CSHARP_LS_ID);
            write_state(&state)?;
        }
        CSHARP_LS_ID => {
            remove_dir(&tools_dir())?;
            let mut state = read_state();
            state.enabled.remove(CSHARP_LS_ID);
            write_state(&state)?;
        }
        _ => return Err(format!("Herramienta desconocida: {}", id)),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const INDEX: &str = r#"{
        "latest-sdk": "10.0.402",
        "releases": [
            {
                "sdk": {
                    "version": "10.0.402",
                    "files": [
                        { "name": "dotnet-sdk-linux-x64.tar.gz", "rid": "linux-x64", "url": "https://example/a", "hash": "aa" },
                        { "name": "dotnet-sdk-win-x64.zip", "rid": "win-x64", "url": "https://example/b", "hash": "bb" }
                    ]
                }
            },
            {
                "sdk": {
                    "version": "10.0.400",
                    "files": [
                        { "name": "dotnet-sdk-linux-x64.tar.gz", "rid": "linux-x64", "url": "https://example/c", "hash": "cc" }
                    ]
                }
            }
        ]
    }"#;

    fn sample_index() -> ReleasesIndex {
        serde_json::from_str(INDEX).unwrap()
    }

    #[test]
    fn selecciona_la_version_latest_del_rid() {
        let selection = select_sdk_download(&sample_index(), "linux-x64", "tar.gz").unwrap();
        expect_version(&selection, "10.0.402");
        expect_url(&selection, "https://example/a");
    }

    fn expect_version(download: &SdkDownload, expected: &str) {
        assert_eq!(download.version, expected);
    }

    fn expect_url(download: &SdkDownload, expected: &str) {
        assert_eq!(download.url, expected);
    }

    #[test]
    fn usa_el_zip_en_windows() {
        let selection = select_sdk_download(&sample_index(), "win-x64", "zip").unwrap();
        expect_version(&selection, "10.0.402");
        expect_url(&selection, "https://example/b");
    }

    #[test]
    fn devuelve_none_si_no_hay_rid() {
        assert!(select_sdk_download(&sample_index(), "freebsd-x64", "tar.gz").is_none());
    }

    #[test]
    fn ordena_versiones_numericamente() {
        let version = max_version(vec![
            "10.0.99".to_string(),
            "10.0.402".to_string(),
            "9.0.100".to_string(),
        ]);
        assert_eq!(version.as_deref(), Some("10.0.402"));
    }

    #[test]
    fn el_hash_sha512_valido_pasa() {
        let path = std::env::temp_dir().join(format!(
            "astroide_hash_test_{}_{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::write(&path, b"astro").unwrap();

        let mut hasher = Sha512::new();
        hasher.update(b"astro");
        let expected = format!("{:x}", hasher.finalize());

        assert!(verify_sha512(&path, &expected).is_ok());
        assert!(verify_sha512(&path, "00").is_err());
        let _ = fs::remove_file(path);
    }

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "astroide_{}_{}_{}",
            name,
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn extrae_un_tar_gz_de_dotnet() {
        let dir = temp_dir("extract_tar");
        let archive = dir.join("sdk.tar.gz");

        {
            let file = fs::File::create(&archive).unwrap();
            let encoder = flate2::write::GzEncoder::new(file, flate2::Compression::fast());
            let mut builder = tar::Builder::new(encoder);
            let mut header = tar::Header::new_gnu();
            header.set_size(5);
            header.set_mode(0o755);
            header.set_cksum();
            builder
                .append_data(&mut header, "dotnet", &b"astro"[..])
                .unwrap();
            builder.into_inner().unwrap().finish().unwrap();
        }

        let output = dir.join("out");
        fs::create_dir_all(&output).unwrap();
        extract_archive(&archive, &output).unwrap();

        assert_eq!(fs::read_to_string(output.join("dotnet")).unwrap(), "astro");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn extrae_un_zip_de_dotnet() {
        let dir = temp_dir("extract_zip");
        let archive = dir.join("sdk.zip");

        {
            let file = fs::File::create(&archive).unwrap();
            let mut writer = zip::ZipWriter::new(file);
            let options = zip::write::SimpleFileOptions::default();
            writer.start_file("dotnet.exe", options).unwrap();
            writer.write_all(b"astro").unwrap();
            writer.finish().unwrap();
        }

        let output = dir.join("out");
        fs::create_dir_all(&output).unwrap();
        extract_archive(&archive, &output).unwrap();

        assert_eq!(
            fs::read_to_string(output.join("dotnet.exe")).unwrap(),
            "astro"
        );
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn rechaza_zip_con_rutas_inseguras() {
        let dir = temp_dir("zip_traversal");
        let archive = dir.join("evil.zip");

        {
            let file = fs::File::create(&archive).unwrap();
            let mut writer = zip::ZipWriter::new(file);
            let options = zip::write::SimpleFileOptions::default();
            writer.start_file("../fuera.txt", options).unwrap();
            writer.write_all(b"x").unwrap();
            writer.finish().unwrap();
        }

        let output = dir.join("out");
        fs::create_dir_all(&output).unwrap();
        assert!(extract_archive(&archive, &output).is_err());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn detecta_raiz_valida_de_dotnet() {
        let dir = temp_dir("dotnet_root");
        let root = dir.join("dotnet-root");
        fs::create_dir_all(root.join("shared").join("Microsoft.NETCore.App")).unwrap();
        fs::write(root.join("dotnet"), b"astro").unwrap();

        assert_eq!(
            dotnet_root_for_bin(&root.join("dotnet")),
            Some(root.clone())
        );

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn rechaza_dotnet_sin_runtime() {
        let dir = temp_dir("dotnet_sin_runtime");
        fs::write(dir.join("dotnet"), b"astro").unwrap();

        assert!(dotnet_root_for_bin(&dir.join("dotnet")).is_none());

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn prefiere_dotnet_local_del_usuario() {
        let Some(home) = dirs::home_dir() else {
            return;
        };
        let local = home.join(".dotnet");
        if dotnet_root_for_bin(&local.join(executable_name("dotnet"))).is_none() {
            return;
        }

        assert_eq!(
            system_dotnet_bin(),
            Some(local.join(executable_name("dotnet")))
        );
    }

    #[cfg(unix)]
    #[test]
    fn csharp_ls_arranca_con_entorno_minimo() {
        let Some(csharp_ls) = system_csharp_ls() else {
            return;
        };
        if user_dotnet_root().is_none() {
            return;
        }

        let mut command = Command::new(csharp_ls);
        command.arg("--version").env_clear();
        apply_env(&mut command);

        let output = command.output().unwrap();
        assert!(
            output.status.success(),
            "csharp-ls no arrancó: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    #[test]
    fn lista_incluye_las_dos_herramientas() {
        let items = list();
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].id, DOTNET_SDK_ID);
        assert_eq!(items[1].id, CSHARP_LS_ID);
    }

    #[test]
    fn reconoce_ids_validos() {
        assert!(set_enabled("otro", true).is_err());
    }
}
