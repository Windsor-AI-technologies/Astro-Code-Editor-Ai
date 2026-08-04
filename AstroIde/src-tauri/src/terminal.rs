use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio, Child, ChildStdin};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

pub struct TerminalState {
    pub terminals: Mutex<HashMap<u32, TerminalInstance>>,
}

pub struct TerminalInstance {
    pub stdin: ChildStdin,
    pub child: Child,
}

impl TerminalState {
    pub fn new() -> Self {
        Self {
            terminals: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub fn spawn_terminal(
    state: tauri::State<'_, Arc<TerminalState>>,
    app: AppHandle,
    id: u32,
    cwd: Option<String>,
    _rows: Option<u16>,
    _cols: Option<u16>,
) -> Result<(), String> {
    let shell = get_shell();

    let mut cmd = Command::new(&shell);
    cmd.stdin(Stdio::piped())
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    if let Some(ref dir) = cwd {
        cmd.current_dir(dir);
    }

    // En Windows, cmd.exe necesita /Q para quitar echo y /K para mantenerlo vivo
    #[cfg(target_os = "windows")]
    {
        if shell.contains("cmd") {
            cmd.arg("/K");
            cmd.arg("prompt $P$G");
        }
    }

    let mut child = cmd.spawn().map_err(|e| format!("spawn error: {}", e))?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;
    let stdin = child.stdin.take().ok_or("no stdin")?;

    // Guardar
    {
        let mut terminals = state.terminals.lock().unwrap();
        terminals.insert(id, TerminalInstance { stdin, child });
    }

    // Thread para stdout
    let event_name = format!("terminal-output-{}", id);
    let app_clone = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(text) => {
                    let output = format!("{}\r\n", text);
                    let _ = app_clone.emit(&event_name, &output);
                }
                Err(_) => break,
            }
        }
    });

    // Thread para stderr
    let err_event = format!("terminal-output-{}", id);
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            match line {
                Ok(text) => {
                    let output = format!("{}\r\n", text);
                    let _ = app.emit(&err_event, &output);
                }
                Err(_) => break,
            }
        }
        let _ = app.emit(&format!("terminal-exit-{}", id), "closed");
    });

    Ok(())
}

#[tauri::command]
pub fn write_terminal(
    state: tauri::State<'_, Arc<TerminalState>>,
    id: u32,
    data: String,
) -> Result<(), String> {
    let mut terminals = state.terminals.lock().unwrap();
    let term = terminals.get_mut(&id).ok_or_else(|| format!("Terminal {} not found", id))?;
    
    // Convertir \r a \r\n para Windows
    let data = data.replace('\r', "\r\n");
    term.stdin.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    term.stdin.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn resize_terminal(
    _state: tauri::State<'_, Arc<TerminalState>>,
    _id: u32,
    _rows: u16,
    _cols: u16,
) -> Result<(), String> {
    // No aplica para pipes simples
    Ok(())
}

#[tauri::command]
pub fn kill_terminal(
    state: tauri::State<'_, Arc<TerminalState>>,
    id: u32,
) -> Result<(), String> {
    let mut terminals = state.terminals.lock().unwrap();
    if let Some(mut term) = terminals.remove(&id) {
        let _ = term.child.kill();
    }
    Ok(())
}

fn get_shell() -> String {
    #[cfg(target_os = "windows")]
    {
        "cmd.exe".to_string()
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    }
}
