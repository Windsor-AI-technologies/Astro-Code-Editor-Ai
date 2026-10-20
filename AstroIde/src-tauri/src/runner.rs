use serde::{Deserialize, Serialize};
use serde_json::json;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

// ── Types ────────────────────────────────────────────────────────────────────

pub struct RunnerState {
    current: Mutex<Option<RunSession>>,
    next_id: AtomicU64,
}

struct RunSession {
    id: u64,
    child: Arc<Mutex<Child>>,
    stdin: Arc<Mutex<Option<ChildStdin>>>,
}

impl RunnerState {
    pub fn new() -> Self {
        Self {
            current: Mutex::new(None),
            next_id: AtomicU64::new(1),
        }
    }
}

/// Cómo se ejecutará un archivo (se resuelve en el backend para evitar
/// inyección de comandos desde el frontend).
enum Launch {
    Simple {
        program: String,
        args: Vec<String>,
    },
    CompileThenRun {
        compiler: String,
        compile_args: Vec<String>,
        output: PathBuf,
    },
    Remote,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerInfo {
    /// "local" | "remote" | "unsupported"
    pub kind: String,
    pub label: String,
    pub command: String,
    pub language: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RunOutput {
    id: u64,
    stream: String,
    text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RunExit {
    id: u64,
    code: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RunInputReady {
    id: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteResult {
    pub stdout: String,
    pub stderr: String,
    pub code: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DotnetInfo {
    pub available: bool,
    pub version: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DotnetTemplate {
    pub short_name: String,
    pub name: String,
    pub language: String,
    pub tags: String,
}

// ── Commands ─────────────────────────────────────────────────────────────────

/// Indica cómo se puede ejecutar un archivo según su extensión.
#[tauri::command]
pub async fn runner_info(file: String) -> Result<RunnerInfo, String> {
    resolve_runner(&file).map(|(info, _)| info)
}

/// Ejecuta un archivo y transmite su salida al frontend (eventos run-output/run-exit).
#[tauri::command]
pub async fn run_file(
    app: AppHandle,
    state: tauri::State<'_, Arc<RunnerState>>,
    file: String,
    cwd: String,
) -> Result<u64, String> {
    let state = state.inner().clone();
    stop_current(&state);

    if !Path::new(&file).exists() {
        return Err(format!("El archivo no existe: {}", file));
    }

    let (info, launch) = resolve_runner(&file)?;
    let id = state.next_id.fetch_add(1, Ordering::SeqCst);

    let _ = app.emit(
        "run-output",
        RunOutput {
            id,
            stream: "system".to_string(),
            text: format!("▶ {}\n", info.command),
        },
    );

    match launch {
        Launch::Remote => {
            Err("Este archivo se ejecuta en la nube (run_remote), no localmente".to_string())
        }
        Launch::Simple { program, args } => {
            let mut command = crate::toolchains::command(&program);
            command.args(&args);
            apply_cwd(&mut command, &cwd);
            let child = command
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(|e| format!("No se pudo ejecutar {}: {}", program, e))?;
            wire_child(app, state, id, child, None);
            Ok(id)
        }
        Launch::CompileThenRun {
            compiler,
            compile_args,
            output,
        } => {
            let mut compile = crate::toolchains::command(&compiler);
            compile.args(&compile_args);
            apply_cwd(&mut compile, &cwd);

            let result = compile
                .output()
                .map_err(|e| format!("No se pudo ejecutar {}: {}", compiler, e))?;

            let compile_stdout = String::from_utf8_lossy(&result.stdout);
            let compile_stderr = String::from_utf8_lossy(&result.stderr);
            if !compile_stdout.is_empty() {
                let _ = app.emit(
                    "run-output",
                    RunOutput {
                        id,
                        stream: "stdout".to_string(),
                        text: compile_stdout.to_string(),
                    },
                );
            }
            if !compile_stderr.is_empty() {
                let _ = app.emit(
                    "run-output",
                    RunOutput {
                        id,
                        stream: "stderr".to_string(),
                        text: compile_stderr.to_string(),
                    },
                );
            }

            if !result.status.success() {
                let _ = app.emit(
                    "run-exit",
                    RunExit {
                        id,
                        code: result.status.code(),
                    },
                );
                return Ok(id);
            }

            let mut command = Command::new(&output);
            apply_cwd(&mut command, &cwd);
            let child = command
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(|e| format!("No se pudo ejecutar el binario compilado: {}", e))?;
            wire_child(app, state, id, child, Some(output));
            Ok(id)
        }
    }
}

/// Detiene el proceso en ejecución (si coincide con el id).
#[tauri::command]
pub async fn run_stop(
    state: tauri::State<'_, Arc<RunnerState>>,
    id: Option<u64>,
) -> Result<(), String> {
    let session = {
        let mut current = state.current.lock().unwrap();
        let matches = match (&*current, id) {
            (Some(session), Some(id)) => session.id == id,
            (Some(_), None) => true,
            _ => false,
        };
        if matches {
            current.take()
        } else {
            None
        }
    };

    if let Some(session) = session {
        let _ = session.child.lock().unwrap().kill();
    }
    Ok(())
}

/// Envía texto a la entrada estándar del proceso local en ejecución.
#[tauri::command]
pub async fn run_stdin(
    state: tauri::State<'_, Arc<RunnerState>>,
    id: Option<u64>,
    input: String,
) -> Result<(), String> {
    write_stdin(&state, id, &input)
}

fn write_stdin(state: &RunnerState, id: Option<u64>, input: &str) -> Result<(), String> {
    let stdin = active_stdin(state, id)?;
    let mut writer = stdin.lock().unwrap();
    let writer = writer
        .as_mut()
        .ok_or("El proceso no acepta entrada estándar")?;
    writer
        .write_all(input.as_bytes())
        .and_then(|_| writer.flush())
        .map_err(|e| format!("No se pudo enviar la entrada al proceso: {}", e))
}

fn active_stdin(
    state: &RunnerState,
    id: Option<u64>,
) -> Result<Arc<Mutex<Option<ChildStdin>>>, String> {
    let current = state.current.lock().unwrap();
    match current.as_ref() {
        Some(session) if id.is_none() || id == Some(session.id) => Ok(session.stdin.clone()),
        Some(_) => Err("La ejecución activa no coincide con el id".to_string()),
        None => Err("No hay ningún proceso en ejecución".to_string()),
    }
}

/// Ejecuta código en la API remota Piston (para lenguajes sin runtime local,
/// como C# sin .NET SDK). El frontend debe pedir confirmación al usuario antes.
#[tauri::command]
pub async fn run_remote(
    language: String,
    version: Option<String>,
    file_name: String,
    code: String,
) -> Result<RemoteResult, String> {
    piston_execute(
        &language,
        version.as_deref().unwrap_or("*"),
        &file_name,
        &code,
    )
}

/// Información del .NET SDK instalado (si existe).
#[tauri::command]
pub async fn dotnet_info() -> DotnetInfo {
    match crate::toolchains::command("dotnet")
        .arg("--version")
        .output()
    {
        Ok(output) if output.status.success() => DotnetInfo {
            available: true,
            version: String::from_utf8_lossy(&output.stdout).trim().to_string(),
        },
        _ => DotnetInfo {
            available: false,
            version: String::new(),
        },
    }
}

/// Instala `csharp-ls` como herramienta global de .NET (IntelliSense de C#).
#[tauri::command]
pub async fn install_csharp_ls(
    app: AppHandle,
    state: tauri::State<'_, Arc<RunnerState>>,
) -> Result<u64, String> {
    let state = state.inner().clone();
    stop_current(&state);
    let id = state.next_id.fetch_add(1, Ordering::SeqCst);

    let _ = app.emit(
        "run-output",
        RunOutput {
            id,
            stream: "system".to_string(),
            text: "▶ dotnet tool install --global csharp-ls\n".to_string(),
        },
    );

    let child = crate::toolchains::command("dotnet")
        .args(["tool", "install", "--global", "csharp-ls"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("No se pudo ejecutar dotnet: {}", e))?;

    wire_child(app, state, id, child, None);
    Ok(id)
}

/// Lista las plantillas de proyecto disponibles (`dotnet new list --type project`).
#[tauri::command]
pub async fn dotnet_list_templates() -> Result<Vec<DotnetTemplate>, String> {
    let output = crate::toolchains::command("dotnet")
        .args(["new", "list", "--type", "project"])
        .output()
        .map_err(|e| format!("No se pudo ejecutar dotnet: {}", e))?;

    let text = String::from_utf8_lossy(&output.stdout);
    let templates = parse_dotnet_templates(&text);
    if templates.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "No se pudieron leer las plantillas de .NET. {}",
            stderr.trim()
        ));
    }
    Ok(templates)
}

/// Crea un proyecto con `dotnet new`. Devuelve la salida de la CLI.
#[tauri::command]
pub async fn dotnet_new(
    template: String,
    name: String,
    output_dir: String,
) -> Result<String, String> {
    if template.trim().is_empty() || name.trim().is_empty() || output_dir.trim().is_empty() {
        return Err("Plantilla, nombre y carpeta son obligatorios".to_string());
    }
    if !is_valid_project_name(&name) {
        return Err(
            "El nombre del proyecto solo puede contener letras, números, '.', '-' y '_'"
                .to_string(),
        );
    }
    if !template
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
    {
        return Err("La plantilla contiene caracteres inválidos".to_string());
    }

    let output = crate::toolchains::command("dotnet")
        .args([
            "new",
            template.as_str(),
            "--name",
            name.as_str(),
            "--output",
            output_dir.as_str(),
        ])
        .output()
        .map_err(|e| format!("No se pudo ejecutar dotnet: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(format!("dotnet new falló:\n{}{}", stdout, stderr));
    }
    Ok(format!("{}{}", stdout, stderr))
}

/// Ejecuta un comando permitido de la CLI de .NET (build, test, restore, ...)
/// y transmite su salida por los mismos eventos que una ejecución.
#[tauri::command]
pub async fn dotnet_run_action(
    app: AppHandle,
    state: tauri::State<'_, Arc<RunnerState>>,
    action: String,
    cwd: String,
) -> Result<u64, String> {
    const ALLOWED: [&str; 7] = [
        "build", "test", "restore", "clean", "publish", "format", "run",
    ];
    if !ALLOWED.contains(&action.as_str()) {
        return Err(format!("Acción de .NET no permitida: {}", action));
    }

    let state = state.inner().clone();
    stop_current(&state);
    let id = state.next_id.fetch_add(1, Ordering::SeqCst);

    let _ = app.emit(
        "run-output",
        RunOutput {
            id,
            stream: "system".to_string(),
            text: format!("▶ dotnet {}\n", action),
        },
    );

    let mut command = crate::toolchains::command("dotnet");
    command.arg(&action);
    apply_cwd(&mut command, &cwd);
    let child = command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("No se pudo ejecutar dotnet {}: {}", action, e))?;

    wire_child(app, state, id, child, None);
    Ok(id)
}

// ── Internals ────────────────────────────────────────────────────────────────

fn apply_cwd(command: &mut Command, cwd: &str) {
    if !cwd.trim().is_empty() {
        command.current_dir(cwd);
    }
}

fn extension_of(file: &str) -> String {
    Path::new(file)
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default()
}

fn resolve_runner(file: &str) -> Result<(RunnerInfo, Launch), String> {
    let ext = extension_of(file);

    let local = |program: &str, args: Vec<String>, label: &str, command: &str| {
        Ok((
            RunnerInfo {
                kind: "local".to_string(),
                label: label.to_string(),
                command: command.to_string(),
                language: String::new(),
            },
            Launch::Simple {
                program: program.to_string(),
                args,
            },
        ))
    };

    match ext.as_str() {
        "js" | "mjs" | "cjs" => {
            if find_in_path("node").is_none() {
                return Err("Node.js no está instalado o no está en el PATH".to_string());
            }
            local("node", vec![file.to_string()], "Node.js", &format!("node {}", file))
        }
        "ts" | "mts" | "cts" => {
            if find_in_path("node").is_none() {
                return Err("Node.js no está instalado o no está en el PATH".to_string());
            }
            local("node", vec![file.to_string()], "TypeScript (Node)", &format!("node {}", file))
        }
        "py" => {
            let program = find_in_path("python3")
                .or_else(|| find_in_path("python"))
                .ok_or("Python no está instalado o no está en el PATH")?;
            local(&program, vec![file.to_string()], "Python", &format!("{} {}", program, file))
        }
        "rb" => {
            require_binary("ruby")?;
            local("ruby", vec![file.to_string()], "Ruby", &format!("ruby {}", file))
        }
        "php" => {
            require_binary("php")?;
            local("php", vec![file.to_string()], "PHP", &format!("php {}", file))
        }
        "lua" => {
            require_binary("lua")?;
            local("lua", vec![file.to_string()], "Lua", &format!("lua {}", file))
        }
        "sh" => {
            require_binary("sh")?;
            local("sh", vec![file.to_string()], "Shell", &format!("sh {}", file))
        }
        "bash" => {
            require_binary("bash")?;
            local("bash", vec![file.to_string()], "Bash", &format!("bash {}", file))
        }
        "go" => {
            require_binary("go")?;
            local("go", vec!["run".to_string(), file.to_string()], "Go", &format!("go run {}", file))
        }
        "dart" => {
            require_binary("dart")?;
            local("dart", vec!["run".to_string(), file.to_string()], "Dart", &format!("dart run {}", file))
        }
        "java" => {
            require_binary("java")?;
            local("java", vec![file.to_string()], "Java", &format!("java {}", file))
        }
        "cs" | "csx" => {
            if dotnet_supports_file_run() {
                local("dotnet", vec!["run".to_string(), file.to_string()], "C# (.NET 10+)", &format!("dotnet run {}", file))
            } else {
                Ok((
                    RunnerInfo {
                        kind: "remote".to_string(),
                        label: "C# (ejecución remota Piston)".to_string(),
                        command: "Piston · emkc.org".to_string(),
                        language: "csharp".to_string(),
                    },
                    Launch::Remote,
                ))
            }
        }
        "c" => {
            require_binary("gcc")?;
            let output = temp_binary_path("astro_run_c");
            Ok((
                RunnerInfo {
                    kind: "local".to_string(),
                    label: "C (gcc)".to_string(),
                    command: format!("gcc {} -o <temp>", file),
                    language: String::new(),
                },
                Launch::CompileThenRun {
                    compiler: "gcc".to_string(),
                    compile_args: vec![file.to_string(), "-o".to_string(), output.to_string_lossy().to_string()],
                    output,
                },
            ))
        }
        "cpp" | "cc" | "cxx" => {
            require_binary("g++")?;
            let output = temp_binary_path("astro_run_cpp");
            Ok((
                RunnerInfo {
                    kind: "local".to_string(),
                    label: "C++ (g++)".to_string(),
                    command: format!("g++ {} -o <temp>", file),
                    language: String::new(),
                },
                Launch::CompileThenRun {
                    compiler: "g++".to_string(),
                    compile_args: vec![file.to_string(), "-o".to_string(), output.to_string_lossy().to_string()],
                    output,
                },
            ))
        }
        "rs" => {
            require_binary("rustc")?;
            let output = temp_binary_path("astro_run_rs");
            Ok((
                RunnerInfo {
                    kind: "local".to_string(),
                    label: "Rust (rustc)".to_string(),
                    command: format!("rustc {} -o <temp>", file),
                    language: String::new(),
                },
                Launch::CompileThenRun {
                    compiler: "rustc".to_string(),
                    compile_args: vec![file.to_string(), "-o".to_string(), output.to_string_lossy().to_string()],
                    output,
                },
            ))
        }
        _ => Err(format!(
            "No hay un ejecutor configurado para la extensión '.{}'. Usa la paleta de comandos para ejecutar el proyecto.",
            ext
        )),
    }
}

fn require_binary(name: &str) -> Result<(), String> {
    find_in_path(name)
        .map(|_| ())
        .ok_or_else(|| format!("'{}' no está instalado o no está en el PATH", name))
}

fn temp_binary_path(name: &str) -> PathBuf {
    let mut path = std::env::temp_dir();
    let unique = format!(
        "{}_{}_{}",
        name,
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    );
    path.push(unique);
    path
}

/// Busca un ejecutable en el PATH (sin invocarlo).
fn find_in_path(name: &str) -> Option<String> {
    let path_var = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path_var) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate.to_string_lossy().to_string());
        }
        #[cfg(target_os = "windows")]
        {
            for suffix in [".exe", ".cmd", ".bat"] {
                let with_suffix = dir.join(format!("{}{}", name, suffix));
                if with_suffix.is_file() {
                    return Some(with_suffix.to_string_lossy().to_string());
                }
            }
        }
    }
    None
}

/// Comprueba si `dotnet run archivo.cs` (apps basadas en archivos) está soportado (.NET 10+).
fn dotnet_supports_file_run() -> bool {
    let Ok(output) = crate::toolchains::command("dotnet")
        .arg("--version")
        .output()
    else {
        return false;
    };
    if !output.status.success() {
        return false;
    }
    let version = String::from_utf8_lossy(&output.stdout);
    let major: Option<u32> = version
        .trim()
        .split('.')
        .next()
        .and_then(|m| m.parse().ok());
    major.map(|m| m >= 10).unwrap_or(false)
}

/// Decodifica UTF-8 de un buffer acumulado, conservando una secuencia
/// multibyte incompleta para la siguiente lectura.
fn decode_utf8(pending: &mut Vec<u8>) -> String {
    let mut text = String::new();
    loop {
        match std::str::from_utf8(pending) {
            Ok(valid) => {
                text.push_str(valid);
                pending.clear();
                break;
            }
            Err(error) => {
                let valid_up_to = error.valid_up_to();
                let error_len = error.error_len();
                if valid_up_to > 0 {
                    if let Ok(valid) = std::str::from_utf8(&pending[..valid_up_to]) {
                        text.push_str(valid);
                    }
                    pending.drain(..valid_up_to);
                    continue;
                }
                match error_len {
                    Some(len) => {
                        text.push('\u{FFFD}');
                        pending.drain(..len);
                    }
                    None => break,
                }
            }
        }
    }
    text
}

/// Transmite la salida en cuanto está disponible (sin esperar saltos de línea),
/// para que los prompts interactivos aparezcan antes de pedir datos.
fn stream_pipe<R: Read + Send + 'static>(
    app: AppHandle,
    id: u64,
    mut reader: R,
    stream: &'static str,
) {
    thread::spawn(move || {
        let mut buffer = [0u8; 4096];
        let mut pending = Vec::new();

        loop {
            match reader.read(&mut buffer) {
                Ok(0) => {
                    let tail = decode_utf8(&mut pending);
                    if !tail.is_empty() {
                        let _ = app.emit(
                            "run-output",
                            RunOutput {
                                id,
                                stream: stream.to_string(),
                                text: tail,
                            },
                        );
                    }
                    break;
                }
                Ok(read) => {
                    pending.extend_from_slice(&buffer[..read]);
                    let text = decode_utf8(&mut pending);
                    if !text.is_empty() {
                        let _ = app.emit(
                            "run-output",
                            RunOutput {
                                id,
                                stream: stream.to_string(),
                                text,
                            },
                        );
                    }
                }
                Err(_) => break,
            }
        }
    });
}

fn wire_child(
    app: AppHandle,
    state: Arc<RunnerState>,
    id: u64,
    mut child: Child,
    _binary: Option<PathBuf>,
) {
    if let Some(stdout) = child.stdout.take() {
        stream_pipe(app.clone(), id, stdout, "stdout");
    }

    if let Some(stderr) = child.stderr.take() {
        stream_pipe(app.clone(), id, stderr, "stderr");
    }

    let stdin = Arc::new(Mutex::new(child.stdin.take()));
    let child = Arc::new(Mutex::new(child));
    *state.current.lock().unwrap() = Some(RunSession {
        id,
        child: child.clone(),
        stdin,
    });

    let _ = app.emit("run-input-ready", RunInputReady { id });

    thread::spawn(move || {
        let code = loop {
            {
                let mut guard = child.lock().unwrap();
                match guard.try_wait() {
                    Ok(Some(status)) => break status.code(),
                    Ok(None) => {}
                    Err(_) => break None,
                }
            }
            thread::sleep(Duration::from_millis(80));
        };

        {
            let mut current = state.current.lock().unwrap();
            if current.as_ref().map(|s| s.id) == Some(id) {
                *current = None;
            }
        }

        let _ = app.emit("run-exit", RunExit { id, code });
    });
}

fn stop_current(state: &RunnerState) {
    let session = state.current.lock().unwrap().take();
    if let Some(session) = session {
        let _ = session.child.lock().unwrap().kill();
    }
}

// ── Piston (ejecución remota) ────────────────────────────────────────────────

#[derive(Deserialize)]
struct PistonRun {
    #[serde(default)]
    stdout: String,
    #[serde(default)]
    stderr: String,
    #[serde(default)]
    code: Option<i32>,
}

#[derive(Deserialize)]
struct PistonResponse {
    #[serde(default)]
    run: Option<PistonRun>,
    #[serde(default)]
    compile: Option<PistonRun>,
    #[serde(default)]
    message: Option<String>,
}

fn piston_execute(
    language: &str,
    version: &str,
    file_name: &str,
    code: &str,
) -> Result<RemoteResult, String> {
    let body = json!({
        "language": language,
        "version": version,
        "files": [{ "name": file_name, "content": code }],
        "stdin": ""
    });

    let response = ureq::post("https://emkc.org/api/v2/piston/execute")
        .timeout(Duration::from_secs(30))
        .set("Content-Type", "application/json")
        .set("User-Agent", "AstroCodeEditor/0.1")
        .send_string(&body.to_string())
        .map_err(|e| format!("No se pudo contactar la API remota de ejecución: {}", e))?;

    let text = response
        .into_string()
        .map_err(|e| format!("Respuesta inválida de la API remota: {}", e))?;

    let parsed: PistonResponse = serde_json::from_str(&text).map_err(|_| {
        format!(
            "La API remota devolvió una respuesta inesperada: {}",
            text.chars().take(200).collect::<String>()
        )
    })?;

    if parsed.run.is_none() {
        if let Some(message) = parsed.message {
            return Err(format!("Ejecución remota: {}", message));
        }
    }

    let run = parsed
        .run
        .ok_or("La ejecución remota no devolvió resultados")?;
    let mut stderr = String::new();

    if let Some(compile) = parsed.compile {
        if compile.code.unwrap_or(0) != 0 {
            stderr.push_str(&compile.stderr);
            stderr.push_str(&compile.stdout);
            return Ok(RemoteResult {
                stdout: run.stdout,
                stderr,
                code: compile.code,
            });
        }
        if !compile.stderr.is_empty() {
            stderr.push_str(&compile.stderr);
        }
    }

    stderr.push_str(&run.stderr);
    Ok(RemoteResult {
        stdout: run.stdout,
        stderr,
        code: run.code,
    })
}

// ── dotnet new list parsing ──────────────────────────────────────────────────

fn is_valid_project_name(name: &str) -> bool {
    !name.is_empty()
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
}

/// Posiciones (bytes) donde empieza cada columna en la línea separadora.
fn column_starts(separator: &str) -> Vec<usize> {
    let bytes = separator.as_bytes();
    let mut starts = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'-' {
            let begin = i;
            while i < bytes.len() && bytes[i] == b'-' {
                i += 1;
            }
            if i - begin >= 2 {
                starts.push(begin);
            }
        } else {
            i += 1;
        }
    }
    starts
}

fn floor_char_boundary(text: &str, mut index: usize) -> usize {
    if index >= text.len() {
        return text.len();
    }
    while index > 0 && !text.is_char_boundary(index) {
        index -= 1;
    }
    index
}

fn slice_column(line: &str, start: usize, end: usize) -> String {
    let start = floor_char_boundary(line, start);
    let end = floor_char_boundary(line, end.min(line.len()));
    if start >= end {
        return String::new();
    }
    line[start..end].trim().to_string()
}

fn parse_dotnet_templates(output: &str) -> Vec<DotnetTemplate> {
    let lines: Vec<&str> = output.lines().collect();

    let header_index = match lines
        .iter()
        .position(|l| l.contains("Template Name") && l.contains("Short Name"))
    {
        Some(index) => index,
        None => return Vec::new(),
    };
    let header = lines[header_index];

    let name_col = match header.find("Template Name") {
        Some(index) => index,
        None => return Vec::new(),
    };
    let short_col = header.find("Short Name").unwrap_or(0);
    let language_col = header.find("Language").unwrap_or(header.len());
    let tags_col = header.find("Tags").unwrap_or(header.len());

    // La línea siguiente al encabezado es el separador de columnas
    let starts = lines
        .get(header_index + 1)
        .map(|line| column_starts(line))
        .unwrap_or_default();
    if starts.len() < 2 {
        return Vec::new();
    }

    let mut templates = Vec::new();
    for line in lines.iter().skip(header_index + 2) {
        if line.trim().is_empty() || line.trim_start().starts_with('-') {
            continue;
        }

        let name = slice_column(line, name_col, short_col);
        let short_raw = slice_column(line, short_col, language_col);
        let language = slice_column(line, language_col, tags_col);
        let tags = slice_column(line, tags_col, line.len());

        // Algunas plantillas listan varios alias: "webapp,razor" → "webapp"
        let short_name = short_raw.split(',').next().unwrap_or("").trim().to_string();
        if short_name.is_empty() || name.is_empty() {
            continue;
        }

        templates.push(DotnetTemplate {
            short_name,
            name,
            language,
            tags,
        });
    }

    templates
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodifica_utf8_conservando_secuencias_incompletas() {
        let mut pending = "Número: ñ".as_bytes().to_vec();
        assert_eq!(decode_utf8(&mut pending), "Número: ñ");
        assert!(pending.is_empty());

        pending.push(0xC3);
        assert_eq!(decode_utf8(&mut pending), "");
        assert_eq!(pending, vec![0xC3]);

        pending.push(0xB1);
        assert_eq!(decode_utf8(&mut pending), "ñ");
        assert!(pending.is_empty());
    }

    #[test]
    fn decodifica_bytes_invalidos_como_reemplazo() {
        let mut pending = vec![0xFF, b'a'];
        assert_eq!(decode_utf8(&mut pending), "\u{FFFD}a");
        assert!(pending.is_empty());
    }

    #[test]
    fn stdin_sin_sesion_devuelve_error_explicito() {
        let state = RunnerState::new();
        assert!(matches!(
            active_stdin(&state, None),
            Err(message) if message.contains("No hay ningún proceso")
        ));
    }

    #[cfg(unix)]
    #[test]
    fn escribir_stdin_alimenta_un_proceso_real() {
        let mut child = Command::new("sh")
            .arg("-c")
            .arg("read line; echo \"got:$line\"")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .expect("shell debe iniciar");

        let mut stdout = child.stdout.take().expect("stdout disponible");
        let stdin = Arc::new(Mutex::new(child.stdin.take()));
        let state = RunnerState::new();
        *state.current.lock().unwrap() = Some(RunSession {
            id: 1,
            child: Arc::new(Mutex::new(child)),
            stdin,
        });

        write_stdin(&state, Some(1), "42\n").expect("debe escribir en stdin");
        assert!(write_stdin(&state, Some(2), "x\n").is_err());

        let session = state.current.lock().unwrap().take().expect("sesión activa");
        drop(session.stdin);

        let mut output = String::new();
        stdout
            .read_to_string(&mut output)
            .expect("debe leer stdout");
        let mut child = Arc::try_unwrap(session.child)
            .expect("sin referencias extra")
            .into_inner()
            .expect("mutex válido");
        let status = child.wait().expect("debe terminar");
        assert!(status.success());
        assert_eq!(output, "got:42\n");
    }

    #[test]
    fn resuelve_javascript_local() {
        let (info, _) = resolve_runner("/tmp/app.js").expect("js debe resolverse");
        assert_eq!(info.kind, "local");
        assert!(info.command.contains("node"));
    }

    #[test]
    fn extension_desconocida_es_error() {
        assert!(resolve_runner("/tmp/archivo.xyz").is_err());
    }

    #[test]
    fn nombre_de_proyecto_valido() {
        assert!(is_valid_project_name("MiApp.Web"));
        assert!(is_valid_project_name("app-2_1"));
        assert!(!is_valid_project_name("app con espacios"));
        assert!(!is_valid_project_name(""));
        assert!(!is_valid_project_name("app;rm -rf"));
    }

    #[test]
    fn parsea_plantillas_de_dotnet() {
        let output = "\
These templates matched your input: --type='project'

Template Name                                 Short Name           Language    Tags
--------------------------------------------  -------------------  ----------  --------------
Class Library                                 classlib             [C#],F#,VB  Common/Library
Console App                                   console              [C#],F#,VB  Common/Console
ASP.NET Core Web App (Razor Pages)            webapp,razor         [C#]        Web/MVC/Razor
";
        let templates = parse_dotnet_templates(output);
        assert_eq!(templates.len(), 3);
        assert_eq!(templates[0].short_name, "classlib");
        assert_eq!(templates[0].name, "Class Library");
        assert_eq!(templates[1].short_name, "console");
        assert_eq!(templates[2].short_name, "webapp");
        assert!(templates[2].tags.contains("Razor"));
    }

    #[test]
    fn plantillas_vacias_si_no_hay_tabla() {
        assert!(parse_dotnet_templates("comando no encontrado").is_empty());
    }

    #[test]
    fn column_starts_detecta_columnas() {
        let starts = column_starts("-----  -----  -------  -----");
        assert_eq!(starts, vec![0, 7, 14, 23]);
    }
}
