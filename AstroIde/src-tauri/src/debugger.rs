use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tungstenite::{connect, Message};
use tauri::{AppHandle, Emitter};

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Breakpoint {
    pub file: String,
    pub line: u32,
    pub id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallFrame {
    pub name: String,
    pub file: String,
    pub line: u32,
    pub column: u32,
    pub scope_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub name: String,
    pub value: String,
    pub var_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugEvent {
    pub event_type: String,  // "paused", "resumed", "stopped", "output"
    pub data: Value,
}

// ── Debug Session ────────────────────────────────────────────────────────────

struct DebugSession {
    child: Child,
    ws_url: String,
    ws: Option<tungstenite::WebSocket<tungstenite::stream::MaybeTlsStream<std::net::TcpStream>>>,
    request_id: i64,
    breakpoints: HashMap<String, Vec<Breakpoint>>, // file -> breakpoints
    script_ids: HashMap<String, String>,           // file -> scriptId
}

impl DebugSession {
    fn next_id(&mut self) -> i64 {
        self.request_id += 1;
        self.request_id
    }
}

pub struct DebuggerState {
    pub session: Mutex<Option<DebugSession>>,
}

impl DebuggerState {
    pub fn new() -> Self {
        Self { session: Mutex::new(None) }
    }
}

// ── Commands ─────────────────────────────────────────────────────────────────

/// Start a debug session: spawns node --inspect-brk and connects via CDP
#[tauri::command]
pub fn debug_start(
    state: tauri::State<'_, Arc<DebuggerState>>,
    app: AppHandle,
    file: String,
    cwd: String,
) -> Result<(), String> {
    // Kill existing session
    debug_stop(state.clone())?;

    // Spawn node with --inspect-brk (pauses on first line)
    let mut child = Command::new("node")
        .arg("--inspect-brk=9229")
        .arg(&file)
        .current_dir(&cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start node: {}", e))?;

    // Read stderr to get the WebSocket URL
    let stderr = child.stderr.take().ok_or("No stderr")?;
    let stdout = child.stdout.take().ok_or("No stdout")?;

    // Forward stdout to frontend
    let app_out = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let _ = app_out.emit("debug-output", &format!("{}\n", line));
        }
    });

    // Parse debugger URL from stderr
    let ws_url = {
        let reader = BufReader::new(stderr);
        let mut url = String::new();
        let app_err = app.clone();
        
        // Node prints "Debugger listening on ws://127.0.0.1:9229/..." to stderr
        for line in reader.lines().map_while(Result::ok) {
            let _ = app_err.emit("debug-output", &format!("[debug] {}\n", line));
            if line.contains("ws://") {
                if let Some(start) = line.find("ws://") {
                    url = line[start..].trim().to_string();
                }
                break;
            }
        }
        
        if url.is_empty() {
            return Err("Could not get debugger WebSocket URL".to_string());
        }
        url
    };

    // Connect to CDP WebSocket
    let (mut ws, _response) = connect(&ws_url)
        .map_err(|e| format!("WebSocket connect failed: {}", e))?;

    // Enable required CDP domains
    let enable_msgs = vec![
        json!({"id": 1, "method": "Debugger.enable", "params": {}}),
        json!({"id": 2, "method": "Runtime.enable", "params": {}}),
        json!({"id": 3, "method": "Runtime.runIfWaitingForDebugger", "params": {}}),
    ];

    for msg in enable_msgs {
        ws.send(Message::Text(serde_json::to_string(&msg).unwrap().into()))
            .map_err(|e: tungstenite::Error| e.to_string())?;
    }

    let mut session = DebugSession {
        child,
        ws_url: ws_url.clone(),
        ws: None,
        request_id: 10,
        breakpoints: HashMap::new(),
        script_ids: HashMap::new(),
    };
    session.ws = Some(ws);

    *state.session.lock().unwrap() = Some(session);

    // Start CDP event listener thread
    let state_clone = state.inner().clone();
    let app_events = app.clone();
    thread::spawn(move || {
        cdp_event_loop(state_clone, app_events);
    });

    Ok(())
}

/// Stop the debug session
#[tauri::command]
pub fn debug_stop(
    state: tauri::State<'_, Arc<DebuggerState>>,
) -> Result<(), String> {
    let mut lock = state.session.lock().unwrap();
    if let Some(mut session) = lock.take() {
        // Close WebSocket
        if let Some(ref mut ws) = session.ws {
            let _ = ws.close(None);
        }
        // Kill child process
        let _ = session.child.kill();
        let _ = session.child.wait();
    }
    Ok(())
}

/// Set a breakpoint
#[tauri::command]
pub fn debug_set_breakpoint(
    state: tauri::State<'_, Arc<DebuggerState>>,
    file: String,
    line: u32,
) -> Result<String, String> {
    let mut lock = state.session.lock().unwrap();
    let session = lock.as_mut().ok_or("No debug session")?;

    let id = session.next_id();
    let url = file_to_url(&file);

    let msg = json!({
        "id": id,
        "method": "Debugger.setBreakpointByUrl",
        "params": {
            "lineNumber": line - 1,  // CDP uses 0-indexed lines
            "url": url,
        }
    });

    send_cdp(session, &msg)?;
    let response = read_cdp_response(session, id)?;

    let bp_id = response["result"]["breakpointId"]
        .as_str()
        .unwrap_or("")
        .to_string();

    // Store breakpoint
    let bp = Breakpoint { file: file.clone(), line, id: Some(bp_id.clone()) };
    session.breakpoints.entry(file).or_default().push(bp);

    Ok(bp_id)
}

/// Remove a breakpoint
#[tauri::command]
pub fn debug_remove_breakpoint(
    state: tauri::State<'_, Arc<DebuggerState>>,
    breakpoint_id: String,
) -> Result<(), String> {
    let mut lock = state.session.lock().unwrap();
    let session = lock.as_mut().ok_or("No debug session")?;

    let id = session.next_id();
    let msg = json!({
        "id": id,
        "method": "Debugger.removeBreakpoint",
        "params": { "breakpointId": breakpoint_id }
    });

    send_cdp(session, &msg)?;

    // Remove from local store
    for bps in session.breakpoints.values_mut() {
        bps.retain(|bp| bp.id.as_deref() != Some(&breakpoint_id));
    }

    Ok(())
}

/// Resume execution
#[tauri::command]
pub fn debug_resume(
    state: tauri::State<'_, Arc<DebuggerState>>,
) -> Result<(), String> {
    let mut lock = state.session.lock().unwrap();
    let session = lock.as_mut().ok_or("No debug session")?;
    let id = session.next_id();
    send_cdp(session, &json!({"id": id, "method": "Debugger.resume", "params": {}}))?;
    Ok(())
}

/// Step over
#[tauri::command]
pub fn debug_step_over(
    state: tauri::State<'_, Arc<DebuggerState>>,
) -> Result<(), String> {
    let mut lock = state.session.lock().unwrap();
    let session = lock.as_mut().ok_or("No debug session")?;
    let id = session.next_id();
    send_cdp(session, &json!({"id": id, "method": "Debugger.stepOver", "params": {}}))?;
    Ok(())
}

/// Step into
#[tauri::command]
pub fn debug_step_into(
    state: tauri::State<'_, Arc<DebuggerState>>,
) -> Result<(), String> {
    let mut lock = state.session.lock().unwrap();
    let session = lock.as_mut().ok_or("No debug session")?;
    let id = session.next_id();
    send_cdp(session, &json!({"id": id, "method": "Debugger.stepInto", "params": {}}))?;
    Ok(())
}

/// Step out
#[tauri::command]
pub fn debug_step_out(
    state: tauri::State<'_, Arc<DebuggerState>>,
) -> Result<(), String> {
    let mut lock = state.session.lock().unwrap();
    let session = lock.as_mut().ok_or("No debug session")?;
    let id = session.next_id();
    send_cdp(session, &json!({"id": id, "method": "Debugger.stepOut", "params": {}}))?;
    Ok(())
}

/// Pause execution
#[tauri::command]
pub fn debug_pause(
    state: tauri::State<'_, Arc<DebuggerState>>,
) -> Result<(), String> {
    let mut lock = state.session.lock().unwrap();
    let session = lock.as_mut().ok_or("No debug session")?;
    let id = session.next_id();
    send_cdp(session, &json!({"id": id, "method": "Debugger.pause", "params": {}}))?;
    Ok(())
}

/// Evaluate expression in current scope
#[tauri::command]
pub fn debug_evaluate(
    state: tauri::State<'_, Arc<DebuggerState>>,
    expression: String,
    call_frame_id: Option<String>,
) -> Result<Value, String> {
    let mut lock = state.session.lock().unwrap();
    let session = lock.as_mut().ok_or("No debug session")?;
    let id = session.next_id();

    let msg = if let Some(frame_id) = call_frame_id {
        json!({
            "id": id,
            "method": "Debugger.evaluateOnCallFrame",
            "params": { "callFrameId": frame_id, "expression": expression }
        })
    } else {
        json!({
            "id": id,
            "method": "Runtime.evaluate",
            "params": { "expression": expression }
        })
    };

    send_cdp(session, &msg)?;
    read_cdp_response(session, id)
}

/// Get variables for a scope
#[tauri::command]
pub fn debug_get_properties(
    state: tauri::State<'_, Arc<DebuggerState>>,
    object_id: String,
) -> Result<Value, String> {
    let mut lock = state.session.lock().unwrap();
    let session = lock.as_mut().ok_or("No debug session")?;
    let id = session.next_id();

    let msg = json!({
        "id": id,
        "method": "Runtime.getProperties",
        "params": {
            "objectId": object_id,
            "ownProperties": true,
            "generatePreview": true,
        }
    });

    send_cdp(session, &msg)?;
    read_cdp_response(session, id)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn send_cdp(session: &mut DebugSession, msg: &Value) -> Result<(), String> {
    let ws = session.ws.as_mut().ok_or("WebSocket not connected")?;
    let text = serde_json::to_string(msg).map_err(|e| e.to_string())?;
    ws.send(Message::Text(text.into())).map_err(|e: tungstenite::Error| e.to_string())
}

fn read_cdp_response(session: &mut DebugSession, expected_id: i64) -> Result<Value, String> {
    let ws = session.ws.as_mut().ok_or("WebSocket not connected")?;

    // Read messages until we find the response with matching id
    for _ in 0..50 {
        match ws.read() {
            Ok(Message::Text(text)) => {
                if let Ok(msg) = serde_json::from_str::<Value>(&text) {
                    if msg.get("id").and_then(|v| v.as_i64()) == Some(expected_id) {
                        return Ok(msg);
                    }
                    // Otherwise it's an event — ignore here (event loop handles it)
                }
            }
            Ok(_) => continue,
            Err(e) => return Err(format!("WS read error: {}", e)),
        }
    }
    Err("Timeout waiting for CDP response".to_string())
}

/// CDP event loop — runs in background thread, emits events to frontend
fn cdp_event_loop(state: Arc<DebuggerState>, app: AppHandle) {
    loop {
        let msg = {
            let mut lock = state.session.lock().unwrap();
            let session = match lock.as_mut() {
                Some(s) => s,
                None => return, // Session ended
            };
            let ws = match session.ws.as_mut() {
                Some(ws) => ws,
                None => return,
            };

            match ws.read() {
                Ok(Message::Text(text)) => Some(text),
                Ok(Message::Close(_)) => { drop(lock); return; }
                Err(_) => { drop(lock); return; }
                _ => None,
            }
        };

        if let Some(text) = msg {
            if let Ok(event) = serde_json::from_str::<Value>(&text) {
                // Only forward CDP events (no "id" field = event/notification)
                if event.get("id").is_none() {
                    if let Some(method) = event.get("method").and_then(|v| v.as_str()) {
                        match method {
                            "Debugger.paused" => {
                                let _ = app.emit("debug-event", DebugEvent {
                                    event_type: "paused".to_string(),
                                    data: event["params"].clone(),
                                });
                            }
                            "Debugger.resumed" => {
                                let _ = app.emit("debug-event", DebugEvent {
                                    event_type: "resumed".to_string(),
                                    data: json!({}),
                                });
                            }
                            "Debugger.scriptParsed" => {
                                // Track script IDs for breakpoint resolution
                                let _ = app.emit("debug-event", DebugEvent {
                                    event_type: "scriptParsed".to_string(),
                                    data: event["params"].clone(),
                                });
                            }
                            "Runtime.consoleAPICalled" => {
                                let _ = app.emit("debug-event", DebugEvent {
                                    event_type: "console".to_string(),
                                    data: event["params"].clone(),
                                });
                            }
                            "Runtime.exceptionThrown" => {
                                let _ = app.emit("debug-event", DebugEvent {
                                    event_type: "exception".to_string(),
                                    data: event["params"].clone(),
                                });
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    }
}

fn file_to_url(file_path: &str) -> String {
    let normalized = file_path.replace('\\', "/");
    format!("file:///{}", normalized)
}
