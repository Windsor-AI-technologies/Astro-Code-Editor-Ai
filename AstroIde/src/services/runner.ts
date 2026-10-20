/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RunnerInfo {
  kind: 'local' | 'remote' | 'unsupported';
  label: string;
  command: string;
  language: string;
}

export interface RunOutput {
  id: number;
  stream: 'stdout' | 'stderr' | 'system' | 'stdin' | string;
  text: string;
}

export interface RunExit {
  id: number;
  code: number | null;
}

export interface RunInputReady {
  id: number;
}

export interface RemoteResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface DotnetInfo {
  available: boolean;
  version: string;
}

export interface DotnetTemplate {
  shortName: string;
  name: string;
  language: string;
  tags: string;
}

// ── Commands ─────────────────────────────────────────────────────────────────

/** Resuelve cómo se ejecutará un archivo (local, remoto o no soportado). */
export function runnerInfo(file: string): Promise<RunnerInfo> {
  return invoke<RunnerInfo>('runner_info', { file });
}

/** Ejecuta un archivo localmente. Devuelve el id de sesión de ejecución. */
export function runFile(file: string, cwd: string): Promise<number> {
  return invoke<number>('run_file', { file, cwd });
}

/** Detiene la ejecución actual (o la de un id concreto). */
export function runStop(id?: number): Promise<void> {
  return invoke('run_stop', { id: id ?? null });
}

/** Envía texto a la entrada estándar del proceso local en ejecución. */
export function runWriteStdin(id: number, input: string): Promise<void> {
  return invoke('run_stdin', { id, input });
}

/** Ejecuta código en la API remota Piston (lenguajes sin runtime local). */
export function runRemote(
  language: string,
  fileName: string,
  code: string,
  version = '*',
): Promise<RemoteResult> {
  return invoke<RemoteResult>('run_remote', { language, version, fileName, code });
}

/** Información del .NET SDK instalado. */
export function dotnetInfo(): Promise<DotnetInfo> {
  return invoke<DotnetInfo>('dotnet_info');
}

/** Plantillas de proyecto disponibles en `dotnet new`. */
export function dotnetListTemplates(): Promise<DotnetTemplate[]> {
  return invoke<DotnetTemplate[]>('dotnet_list_templates');
}

/** Crea un proyecto con `dotnet new`. */
export function dotnetNew(template: string, name: string, outputDir: string): Promise<string> {
  return invoke<string>('dotnet_new', { template, name, outputDir });
}

/** Ejecuta build/test/restore/... de .NET en una carpeta. */
export function dotnetRunAction(action: string, cwd: string): Promise<number> {
  return invoke<number>('dotnet_run_action', { action, cwd });
}

/** Instala csharp-ls (herramienta global de .NET) para IntelliSense de C#. */
export function installCsharpLs(): Promise<number> {
  return invoke<number>('install_csharp_ls');
}

// ── Events ───────────────────────────────────────────────────────────────────

/** Salida de un proceso en ejecución (stdout/stderr). */
export function onRunOutput(callback: (output: RunOutput) => void): Promise<UnlistenFn> {
  return listen<RunOutput>('run-output', (e) => callback(e.payload));
}

/** Fin de un proceso en ejecución. */
export function onRunExit(callback: (exit: RunExit) => void): Promise<UnlistenFn> {
  return listen<RunExit>('run-exit', (e) => callback(e.payload));
}

/** El proceso local ya está listo para recibir entrada estándar. */
export function onRunInputReady(callback: (ready: RunInputReady) => void): Promise<UnlistenFn> {
  return listen<RunInputReady>('run-input-ready', (e) => callback(e.payload));
}
