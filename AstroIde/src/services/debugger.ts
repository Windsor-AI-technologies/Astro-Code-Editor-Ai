import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Breakpoint {
  file: string;
  line: number;
  id?: string;
}

export interface CallFrame {
  callFrameId: string;
  functionName: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
  scopeChain: Scope[];
}

export interface Scope {
  type: string;
  object: { objectId: string };
  name?: string;
}

export interface Variable {
  name: string;
  value: string;
  type: string;
  objectId?: string; // for expandable objects
}

export interface DebugEvent {
  eventType: string;
  data: any;
}

export type DebugState = 'idle' | 'running' | 'paused' | 'stopped';

// ── Commands (typed wrappers for Rust backend) ───────────────────────────────

/** Start debug session: spawns node --inspect-brk and connects CDP */
export async function start(file: string, cwd: string): Promise<void> {
  return invoke('debug_start', { file, cwd });
}

/** Stop debug session */
export async function stop(): Promise<void> {
  return invoke('debug_stop');
}

/** Set a breakpoint at file:line, returns breakpoint ID */
export async function setBreakpoint(file: string, line: number): Promise<string> {
  return invoke<string>('debug_set_breakpoint', { file, line });
}

/** Remove a breakpoint by ID */
export async function removeBreakpoint(breakpointId: string): Promise<void> {
  return invoke('debug_remove_breakpoint', { breakpointId });
}

/** Resume execution (continue) */
export async function resume(): Promise<void> {
  return invoke('debug_resume');
}

/** Step over current line */
export async function stepOver(): Promise<void> {
  return invoke('debug_step_over');
}

/** Step into function call */
export async function stepInto(): Promise<void> {
  return invoke('debug_step_into');
}

/** Step out of current function */
export async function stepOut(): Promise<void> {
  return invoke('debug_step_out');
}

/** Pause execution */
export async function pause(): Promise<void> {
  return invoke('debug_pause');
}

/** Evaluate expression (optionally in a specific call frame) */
export async function evaluate(expression: string, callFrameId?: string): Promise<any> {
  return invoke('debug_evaluate', { expression, callFrameId: callFrameId ?? null });
}

/** Get object properties (for variable inspection) */
export async function getProperties(objectId: string): Promise<any> {
  return invoke('debug_get_properties', { objectId });
}

// ── Event Listeners ──────────────────────────────────────────────────────────

/** Listen for debug events (paused, resumed, console, exception) */
export function onDebugEvent(callback: (event: DebugEvent) => void): Promise<UnlistenFn> {
  return listen<DebugEvent>('debug-event', (e) => callback(e.payload));
}

/** Listen for debug output (stdout/stderr from debugged process) */
export function onDebugOutput(callback: (text: string) => void): Promise<UnlistenFn> {
  return listen<string>('debug-output', (e) => callback(e.payload));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse call frames from CDP paused event data */
export function parseCallFrames(pausedData: any): CallFrame[] {
  const frames = pausedData?.callFrames ?? [];
  return frames.map((f: any) => ({
    callFrameId: f.callFrameId,
    functionName: f.functionName || '(anonymous)',
    url: f.url ?? '',
    lineNumber: (f.location?.lineNumber ?? 0) + 1, // CDP is 0-indexed
    columnNumber: (f.location?.columnNumber ?? 0) + 1,
    scopeChain: (f.scopeChain ?? []).map((s: any) => ({
      type: s.type,
      object: { objectId: s.object?.objectId ?? '' },
      name: s.name,
    })),
  }));
}

/** Parse variables from Runtime.getProperties response */
export function parseVariables(propsResponse: any): Variable[] {
  const props = propsResponse?.result?.result ?? [];
  return props
    .filter((p: any) => !p.name.startsWith('__'))
    .map((p: any) => ({
      name: p.name,
      value: formatValue(p.value),
      type: p.value?.type ?? 'undefined',
      objectId: p.value?.objectId,
    }));
}

const VALUE_FORMATTERS: Record<string, (val: any) => string> = {
  string: (val) => `"${val.value}"`,
  number: (val) => String(val.value),
  boolean: (val) => String(val.value),
  undefined: () => 'undefined',
  function: (val) => `fn ${val.description?.slice(0, 30) ?? '()'}`,
  object: (val) => val.subtype === 'null' ? 'null' : (val.description ?? '{...}'),
};

function formatValue(val: any): string {
  if (!val) return 'undefined';
  const formatter = VALUE_FORMATTERS[val.type];
  return formatter ? formatter(val) : (val.description ?? String(val.value ?? val.type));
}
