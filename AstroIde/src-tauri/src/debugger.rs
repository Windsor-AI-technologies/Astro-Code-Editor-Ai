use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender, TryRecvError};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tungstenite::{connect, Message, WebSocket};

type WsStream = WebSocket<tungstenite::stream::MaybeTlsStream<std::net::TcpStream>>;

const READ_TIMEOUT: Duration = Duration::from_millis(30);
const START_TIMEOUT: Duration = Duration::from_secs(20);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Breakpoint {
    pub file: String,
    pub line: u32,
    pub id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugEvent {
    pub event_type: String,
    pub data: Value,
}

/// Respuestas pendientes de CDP: el hilo lector resuelve cada `id`.
struct PendingRequests {
    waiters: Mutex<HashMap<i64, Sender<Value>>>,
}

impl PendingRequests {
    fn new() -> Self {
        Self {
            waiters: Mutex::new(HashMap::new()),
        }
    }

    fn register(&self, id: i64, tx: Sender<Value>) {
        self.waiters.lock().unwrap().insert(id, tx);
    }

    fn resolve(&self, id: i64, value: Value) -> bool {
        let waiter = self.waiters.lock().unwrap().remove(&id);
        match waiter {
            Some(tx) => tx.send(value).is_ok(),
            None => false,
        }
    }

    fn cancel(&self, id: i64) {
        self.waiters.lock().unwrap().remove(&id);
    }
}

/// Handle de la sesión activa. Las lecturas del socket viven en un único hilo;
/// los comandos solo envían mensajes por `outgoing` y esperan respuesta por `pending`.
struct SessionHandle {
    id: u64,
    child: Mutex<Option<Child>>,
    outgoing: Sender<Value>,
    stop_tx: Sender<()>,
    pending: Arc<PendingRequests>,
    next_request: AtomicI64,
    breakpoints: Mutex<HashMap<String, Vec<Breakpoint>>>,
}

impl SessionHandle {
    fn next_id(&self) -> i64 {
        self.next_request.fetch_add(1, Ordering::SeqCst)
    }
}

pub struct DebuggerState {
    session: Mutex<Option<Arc<SessionHandle>>>,
    next_session_id: AtomicU64,
}

impl DebuggerState {
    pub fn new() -> Self {
        Self {
            session: Mutex::new(None),
            next_session_id: AtomicU64::new(1),
        }
    }
}

// ── Commands ─────────────────────────────────────────────────────────────────

/// Inicia una sesión de depuración: lanza node --inspect-brk y se conecta a CDP.
/// El proceso queda esperando; los breakpoints se fijan con `debug_set_breakpoint`
/// y la ejecución arranca con `debug_launch`.
#[tauri::command]
pub async fn debug_start(
    state: tauri::State<'_, Arc<DebuggerState>>,
    app: AppHandle,
    file: String,
    cwd: String,
) -> Result<(), String> {
    let state = state.inner().clone();

    // Cerrar cualquier sesión previa
    stop_session(&state);

    if file.trim().is_empty() {
        return Err("No hay archivo activo para depurar".to_string());
    }
    if !Path::new(&file).exists() {
        return Err(format!("El archivo no existe: {}", file));
    }

    let mut child = spawn_node(&file, &cwd)?;
    let stdout = child
        .stdout
        .take()
        .ok_or("No se pudo capturar stdout de Node")?;
    let stderr = child
        .stderr
        .take()
        .ok_or("No se pudo capturar stderr de Node")?;

    // stdout del programa → salida del panel
    let app_out = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let _ = app_out.emit("debug-output", format!("{}\n", line));
        }
    });

    // stderr: extrae la URL del inspector y sigue reenviando el resto
    let (url_tx, url_rx) = mpsc::channel::<String>();
    let recent_stderr: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    let app_err = app.clone();
    let recent_clone = recent_stderr.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            let _ = app_err.emit("debug-output", format!("{}\n", line));
            if let Some(start) = line.find("ws://") {
                let url = line[start..].trim().to_string();
                let _ = url_tx.send(url);
            }
            let mut recent = recent_clone.lock().unwrap();
            recent.push(line);
            if recent.len() > 30 {
                recent.remove(0);
            }
        }
    });

    // Esperar la URL del inspector (o la muerte temprana del proceso)
    let ws_url = match wait_for_inspector_url(&mut child, &url_rx, &recent_stderr) {
        Ok(url) => url,
        Err(e) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err(e);
        }
    };

    let (ws, _response) = match connect(&ws_url) {
        Ok(pair) => pair,
        Err(e) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err(format!("No se pudo conectar al depurador de Node: {}", e));
        }
    };

    let (out_tx, out_rx) = mpsc::channel::<Value>();
    let (stop_tx, stop_rx) = mpsc::channel::<()>();
    let pending = Arc::new(PendingRequests::new());

    let handle = Arc::new(SessionHandle {
        id: state.next_session_id.fetch_add(1, Ordering::SeqCst),
        child: Mutex::new(Some(child)),
        outgoing: out_tx,
        stop_tx,
        pending: pending.clone(),
        next_request: AtomicI64::new(1),
        breakpoints: Mutex::new(HashMap::new()),
    });

    // Un único hilo es dueño del socket: enruta respuestas y reenvía eventos.
    let session_id = handle.id;
    let app_events = app.clone();
    let loop_state = state.clone();
    thread::spawn(move || {
        socket_loop(
            ws, out_rx, stop_rx, pending, app_events, loop_state, session_id,
        );
    });

    *state.session.lock().unwrap() = Some(handle.clone());

    // Habilitar dominios antes de aceptar breakpoints
    if let Err(e) = request(&handle, "Debugger.enable", json!({})) {
        stop_session(&state);
        return Err(e);
    }
    if let Err(e) = request(&handle, "Runtime.enable", json!({})) {
        stop_session(&state);
        return Err(e);
    }

    Ok(())
}

/// Arranca la ejecución del proceso (tras aplicar breakpoints).
#[tauri::command]
pub async fn debug_launch(state: tauri::State<'_, Arc<DebuggerState>>) -> Result<(), String> {
    let handle = get_session(&state)?;
    let id = handle.next_id();
    send_cdp(
        &handle,
        json!({
            "id": id,
            "method": "Runtime.runIfWaitingForDebugger",
            "params": {}
        }),
    )
}

/// Detiene la sesión de depuración y mata el proceso.
#[tauri::command]
pub async fn debug_stop(state: tauri::State<'_, Arc<DebuggerState>>) -> Result<(), String> {
    stop_session(state.inner());
    Ok(())
}

/// Fija un breakpoint por archivo:línea y devuelve su id.
#[tauri::command]
pub async fn debug_set_breakpoint(
    state: tauri::State<'_, Arc<DebuggerState>>,
    file: String,
    line: u32,
) -> Result<String, String> {
    let handle = get_session(&state)?;
    let url = file_to_url(&file);

    let response = request(
        &handle,
        "Debugger.setBreakpointByUrl",
        json!({
            "lineNumber": line.saturating_sub(1),
            "url": url,
            "columnNumber": 0
        }),
    )?;

    let bp_id = response["result"]["breakpointId"]
        .as_str()
        .ok_or("El depurador no devolvió un breakpointId")?
        .to_string();

    let breakpoint = Breakpoint {
        file: file.clone(),
        line,
        id: Some(bp_id.clone()),
    };
    handle
        .breakpoints
        .lock()
        .unwrap()
        .entry(file)
        .or_default()
        .push(breakpoint);

    Ok(bp_id)
}

/// Elimina un breakpoint por id.
#[tauri::command]
pub async fn debug_remove_breakpoint(
    state: tauri::State<'_, Arc<DebuggerState>>,
    breakpoint_id: String,
) -> Result<(), String> {
    let handle = get_session(&state)?;

    request(
        &handle,
        "Debugger.removeBreakpoint",
        json!({ "breakpointId": breakpoint_id }),
    )?;

    for bps in handle.breakpoints.lock().unwrap().values_mut() {
        bps.retain(|bp| bp.id.as_deref() != Some(&breakpoint_id));
    }

    Ok(())
}

/// Continúa la ejecución.
#[tauri::command]
pub async fn debug_resume(state: tauri::State<'_, Arc<DebuggerState>>) -> Result<(), String> {
    send_simple(&state, "Debugger.resume")
}

/// Step over.
#[tauri::command]
pub async fn debug_step_over(state: tauri::State<'_, Arc<DebuggerState>>) -> Result<(), String> {
    send_simple(&state, "Debugger.stepOver")
}

/// Step into.
#[tauri::command]
pub async fn debug_step_into(state: tauri::State<'_, Arc<DebuggerState>>) -> Result<(), String> {
    send_simple(&state, "Debugger.stepInto")
}

/// Step out.
#[tauri::command]
pub async fn debug_step_out(state: tauri::State<'_, Arc<DebuggerState>>) -> Result<(), String> {
    send_simple(&state, "Debugger.stepOut")
}

/// Pausa la ejecución.
#[tauri::command]
pub async fn debug_pause(state: tauri::State<'_, Arc<DebuggerState>>) -> Result<(), String> {
    send_simple(&state, "Debugger.pause")
}

/// Evalúa una expresión (en un frame concreto si se indica).
#[tauri::command]
pub async fn debug_evaluate(
    state: tauri::State<'_, Arc<DebuggerState>>,
    expression: String,
    call_frame_id: Option<String>,
) -> Result<Value, String> {
    let handle = get_session(&state)?;

    if let Some(frame_id) = call_frame_id {
        request(
            &handle,
            "Debugger.evaluateOnCallFrame",
            json!({
                "callFrameId": frame_id,
                "expression": expression,
                "returnByValue": false,
                "generatePreview": true
            }),
        )
    } else {
        request(
            &handle,
            "Runtime.evaluate",
            json!({ "expression": expression, "returnByValue": false }),
        )
    }
}

/// Propiedades de un objeto (inspección de variables).
#[tauri::command]
pub async fn debug_get_properties(
    state: tauri::State<'_, Arc<DebuggerState>>,
    object_id: String,
) -> Result<Value, String> {
    let handle = get_session(&state)?;

    request(
        &handle,
        "Runtime.getProperties",
        json!({
            "objectId": object_id,
            "ownProperties": true,
            "generatePreview": true
        }),
    )
}

// ── Internals ────────────────────────────────────────────────────────────────

fn spawn_node(file: &str, cwd: &str) -> Result<Child, String> {
    let mut command = Command::new("node");
    command
        .arg("--inspect-brk=127.0.0.1:0")
        .arg(file)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if !cwd.trim().is_empty() {
        command.current_dir(cwd);
    }

    command.spawn().map_err(|e| match e.kind() {
        std::io::ErrorKind::NotFound => {
            "Node.js no está instalado o no está en el PATH. Instálalo desde https://nodejs.org para depurar JavaScript/TypeScript.".to_string()
        }
        _ => format!("No se pudo iniciar Node: {}", e),
    })
}

fn wait_for_inspector_url(
    child: &mut Child,
    url_rx: &Receiver<String>,
    recent_stderr: &Arc<Mutex<Vec<String>>>,
) -> Result<String, String> {
    let deadline = Instant::now() + START_TIMEOUT;
    loop {
        match url_rx.recv_timeout(Duration::from_millis(100)) {
            Ok(url) => return Ok(url),
            Err(RecvTimeoutError::Timeout) => {
                if let Ok(Some(status)) = child.try_wait() {
                    return Err(format!(
                        "Node terminó antes de iniciar el depurador (código {}).\n{}",
                        status.code().unwrap_or(-1),
                        stderr_tail(recent_stderr)
                    ));
                }
                if Instant::now() >= deadline {
                    return Err(format!(
                        "Tiempo de espera agotado conectando con el depurador de Node.\n{}",
                        stderr_tail(recent_stderr)
                    ));
                }
            }
            Err(RecvTimeoutError::Disconnected) => {
                return Err(format!(
                    "No se pudo obtener la URL del depurador de Node.\n{}",
                    stderr_tail(recent_stderr)
                ));
            }
        }
    }
}

fn stderr_tail(lines: &Arc<Mutex<Vec<String>>>) -> String {
    let recent = lines.lock().unwrap();
    recent
        .iter()
        .rev()
        .take(8)
        .cloned()
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join("\n")
}

fn get_session(state: &tauri::State<'_, Arc<DebuggerState>>) -> Result<Arc<SessionHandle>, String> {
    state
        .session
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "No hay una sesión de depuración activa".to_string())
}

fn stop_session(state: &DebuggerState) {
    let handle = state.session.lock().unwrap().take();
    if let Some(handle) = handle {
        let _ = handle.stop_tx.send(());
        kill_child(&handle);
    }
}

fn kill_child(handle: &SessionHandle) {
    if let Some(mut child) = handle.child.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

fn send_cdp(handle: &SessionHandle, message: Value) -> Result<(), String> {
    handle
        .outgoing
        .send(message)
        .map_err(|_| "La conexión con el depurador se cerró".to_string())
}

fn send_simple(state: &tauri::State<'_, Arc<DebuggerState>>, method: &str) -> Result<(), String> {
    let handle = get_session(state)?;
    let id = handle.next_id();
    send_cdp(&handle, json!({ "id": id, "method": method, "params": {} }))
}

/// Envía un request CDP y espera su respuesta sin bloquear el hilo lector.
fn request(handle: &SessionHandle, method: &str, params: Value) -> Result<Value, String> {
    let id = handle.next_id();
    let (tx, rx) = mpsc::channel();
    handle.pending.register(id, tx);

    if let Err(e) = send_cdp(
        handle,
        json!({ "id": id, "method": method, "params": params }),
    ) {
        handle.pending.cancel(id);
        return Err(e);
    }

    match rx.recv_timeout(REQUEST_TIMEOUT) {
        Ok(response) => {
            if let Some(error) = response.get("error") {
                let message = error["message"].as_str().unwrap_or("error desconocido");
                return Err(format!("{}: {}", method, message));
            }
            Ok(response)
        }
        Err(_) => {
            handle.pending.cancel(id);
            Err(format!(
                "Tiempo de espera agotado esperando respuesta de {}",
                method
            ))
        }
    }
}

/// Único hilo que lee del socket CDP. Reenvía eventos al frontend y resuelve
/// las respuestas pendientes. Se apoya en un read-timeout corto para atender
/// también los mensajes salientes del mismo socket.
fn socket_loop(
    mut ws: WsStream,
    out_rx: Receiver<Value>,
    stop_rx: Receiver<()>,
    pending: Arc<PendingRequests>,
    app: AppHandle,
    state: Arc<DebuggerState>,
    session_id: u64,
) {
    if let tungstenite::stream::MaybeTlsStream::Plain(stream) = ws.get_mut() {
        let _ = stream.set_read_timeout(Some(READ_TIMEOUT));
    }

    'outer: loop {
        if stop_rx.try_recv().is_ok() {
            break;
        }

        // Vaciar la cola de salida
        loop {
            match out_rx.try_recv() {
                Ok(message) => {
                    if ws.send(Message::Text(message.to_string().into())).is_err() {
                        break 'outer;
                    }
                }
                Err(TryRecvError::Empty) => break,
                Err(TryRecvError::Disconnected) => break 'outer,
            }
        }

        match ws.read() {
            Ok(Message::Text(text)) => dispatch_message(&text, &pending, &app),
            Ok(Message::Close(_)) => break,
            Ok(_) => {}
            Err(tungstenite::Error::Io(ref e))
                if e.kind() == std::io::ErrorKind::WouldBlock
                    || e.kind() == std::io::ErrorKind::TimedOut => {}
            Err(_) => break,
        }
    }

    // La sesión terminó (proceso finalizado, socket cerrado o stop solicitado)
    let should_emit = end_session(&state, session_id);
    if should_emit {
        let _ = app.emit(
            "debug-event",
            DebugEvent {
                event_type: "stopped".to_string(),
                data: json!({}),
            },
        );
    }
}

/// Limpia la sesión si sigue siendo la activa. Devuelve true solo si esta
/// sesión era la vigente (evita emitir "stopped" de sesiones ya reemplazadas).
fn end_session(state: &DebuggerState, session_id: u64) -> bool {
    let handle = {
        let mut lock = state.session.lock().unwrap();
        if lock.as_ref().map(|s| s.id) == Some(session_id) {
            lock.take()
        } else {
            None
        }
    };

    match handle {
        Some(handle) => {
            kill_child(&handle);
            true
        }
        None => false,
    }
}

fn dispatch_message(text: &str, pending: &Arc<PendingRequests>, app: &AppHandle) {
    let Ok(event) = serde_json::from_str::<Value>(text) else {
        return;
    };

    // Respuesta a un request pendiente
    if let Some(id) = event.get("id").and_then(|v| v.as_i64()) {
        pending.resolve(id, event);
        return;
    }

    // Evento CDP
    let Some(method) = event.get("method").and_then(|v| v.as_str()) else {
        return;
    };

    // `consoleAPICalled` se ignora: la salida del programa ya llega por el
    // stdout del proceso (evita duplicar cada console.log en el panel).
    let (kind, data) = match method {
        "Debugger.paused" => ("paused", event["params"].clone()),
        "Debugger.resumed" => ("resumed", json!({})),
        "Runtime.exceptionThrown" => ("exception", event["params"].clone()),
        _ => return,
    };

    let _ = app.emit(
        "debug-event",
        DebugEvent {
            event_type: kind.to_string(),
            data,
        },
    );
}

/// Convierte una ruta local en URL `file:///` codificada (válida en Linux,
/// macOS y Windows) para que los breakpoints casen con los scripts de Node.
fn file_to_url(file_path: &str) -> String {
    let path = Path::new(file_path);
    let absolute = if path.is_absolute() {
        file_path.to_string()
    } else {
        std::fs::canonicalize(path)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| file_path.to_string())
    };

    let normalized = absolute.replace('\\', "/");
    let with_leading_slash = if normalized.starts_with('/') {
        normalized
    } else {
        format!("/{}", normalized)
    };

    format!("file://{}", percent_encode_path(&with_leading_slash))
}

fn percent_encode_path(path: &str) -> String {
    let mut out = String::with_capacity(path.len());
    for byte in path.bytes() {
        let c = byte as char;
        let allowed = c.is_ascii_alphanumeric()
            || matches!(
                c,
                '/' | '-'
                    | '_'
                    | '.'
                    | '~'
                    | ':'
                    | '@'
                    | '+'
                    | ','
                    | '!'
                    | '$'
                    | '\''
                    | '('
                    | ')'
                    | '*'
                    | '&'
                    | '='
                    | ';'
            );
        if allowed {
            out.push(c);
        } else {
            out.push_str(&format!("%{:02X}", byte));
        }
    }
    out
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_url_para_rutas_unix() {
        assert_eq!(
            file_to_url("/home/user/test.js"),
            "file:///home/user/test.js"
        );
    }

    #[test]
    fn file_url_codifica_espacios() {
        assert_eq!(
            file_to_url("/home/user/mi archivo.js"),
            "file:///home/user/mi%20archivo.js"
        );
    }

    #[test]
    fn file_url_para_rutas_windows() {
        assert_eq!(
            file_to_url("C:\\proyectos\\app.js"),
            "file:///C:/proyectos/app.js"
        );
    }

    #[test]
    fn pending_requests_resuelve_por_id() {
        let pending = PendingRequests::new();
        let (tx, rx) = mpsc::channel();
        pending.register(7, tx);
        assert!(pending.resolve(7, json!({"id": 7, "result": {}})));
        assert!(rx.recv().is_ok());
        assert!(!pending.resolve(7, json!({"id": 7})));
    }
}
