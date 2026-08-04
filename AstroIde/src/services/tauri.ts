import { invoke } from '@tauri-apps/api/core';
import type { FileEntry } from '../types';

// ── Tauri Command Wrapper ────────────────────────────────────────────────────
// Centraliza todas las llamadas al backend Rust con tipado fuerte.

// ── File System ──────────────────────────────────────────────────────────────

export async function readFile(path: string): Promise<string> {
  return invoke<string>('read_file', { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke('write_file', { path, content });
}

export async function createFile(path: string): Promise<void> {
  return invoke('create_file', { path });
}

export async function createDir(path: string): Promise<void> {
  return invoke('create_dir', { path });
}

export async function deletePath(path: string): Promise<void> {
  return invoke('delete_path', { path });
}

export async function renamePath(oldPath: string, newPath: string): Promise<void> {
  return invoke('rename_path', { oldPath, newPath });
}

export async function movePath(source: string, destFolder: string): Promise<string> {
  return invoke<string>('move_path', { source, destFolder });
}

export async function readDir(path: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>('read_dir', { path });
}

// ── Dialogs ──────────────────────────────────────────────────────────────────

export async function openFolderDialog(): Promise<string | null> {
  return invoke<string | null>('open_folder_dialog');
}

export async function openFileDialog(): Promise<string | null> {
  return invoke<string | null>('open_file_dialog');
}

// ── Settings & Workspace ─────────────────────────────────────────────────────

export async function loadSettings(): Promise<string> {
  return invoke<string>('load_settings');
}

export async function saveSettings(json: string): Promise<void> {
  return invoke('save_settings', { json });
}

export async function loadWorkspace(): Promise<string> {
  return invoke<string>('load_workspace');
}

export async function saveWorkspace(path: string): Promise<void> {
  return invoke('save_workspace', { path });
}

// ── Terminal ─────────────────────────────────────────────────────────────────

export async function spawnTerminal(id: number, cwd?: string, rows?: number, cols?: number): Promise<void> {
  return invoke('spawn_terminal', { id, cwd, rows, cols });
}

export async function writeTerminal(id: number, data: string): Promise<void> {
  return invoke('write_terminal', { id, data });
}

export async function killTerminal(id: number): Promise<void> {
  return invoke('kill_terminal', { id });
}

export async function killAllTerminals(): Promise<void> {
  return invoke('kill_all_terminals');
}

// ── Project Detection ────────────────────────────────────────────────────────

export async function detectProjectType(path: string): Promise<string> {
  return invoke<string>('detect_project_type', { path });
}
