/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useState, useCallback, useEffect, useRef } from 'react';
import * as dbg from '../../services/debugger';
import type { Breakpoint, CallFrame, Variable, DebugState, DebugEvent } from '../../services/debugger';

export type { Breakpoint, CallFrame, Variable, DebugState };

/**
 * useDebugger — manages the full debug session lifecycle.
 * SRP: Only debug state (session, breakpoints, call stack, variables, output).
 */
export function useDebugger() {
  const [state, setState] = useState<DebugState>('idle');
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [callFrames, setCallFrames] = useState<CallFrame[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [pausedFile, setPausedFile] = useState<string | null>(null);
  const [pausedLine, setPausedLine] = useState<number | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const unlistenEventRef = useRef<(() => void) | null>(null);
  const unlistenOutputRef = useRef<(() => void) | null>(null);
  const startingRef = useRef(false);
  const stateRef = useRef<DebugState>('idle');
  const breakpointsRef = useRef<Breakpoint[]>([]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    breakpointsRef.current = breakpoints;
  }, [breakpoints]);

  const releaseListeners = useCallback(() => {
    unlistenEventRef.current?.();
    unlistenOutputRef.current?.();
    unlistenEventRef.current = null;
    unlistenOutputRef.current = null;
  }, []);

  const clearTransientState = useCallback(() => {
    setCallFrames([]);
    setVariables([]);
    setPausedFile(null);
    setPausedLine(null);
  }, []);

  // ── Event handling ──────────────────────────────────────────────────────

  const handleDebugEvent = useCallback(async (event: DebugEvent) => {
    switch (event.eventType) {
      case 'paused': {
        setState('paused');
        const frames = dbg.parseCallFrames(event.data);
        setCallFrames(frames);

        if (frames.length > 0) {
          const top = frames[0];
          setPausedFile(dbg.urlToPath(top.url));
          setPausedLine(top.lineNumber);

          // Load variables from first local scope
          const localScope = top.scopeChain.find(s => s.type === 'local');
          if (localScope?.object.objectId) {
            try {
              const res = await dbg.getProperties(localScope.object.objectId);
              setVariables(dbg.parseVariables(res));
            } catch { setVariables([]); }
          } else {
            setVariables([]);
          }
        }
        break;
      }
      case 'resumed':
        setState('running');
        clearTransientState();
        break;

      case 'stopped':
        setState('idle');
        clearTransientState();
        setOutput(prev => [...prev, '[depurador] Proceso finalizado']);
        releaseListeners();
        break;

      case 'console': {
        const args = event.data?.args ?? [];
        const text = args
          .map((a: any) => a.value ?? a.description ?? a.preview?.description ?? '')
          .join(' ');
        setOutput(prev => [...prev, text]);
        break;
      }
      case 'exception': {
        const desc = event.data?.exceptionDetails?.exception?.description
          ?? event.data?.exceptionDetails?.text
          ?? 'Exception';
        setOutput(prev => [...prev, `[ERROR] ${desc}`]);
        setError(desc);
        break;
      }
    }
  }, [clearTransientState, releaseListeners]);

  const handleDebugOutput = useCallback((text: string) => {
    setOutput(prev => [...prev, text.replace(/\n$/, '')]);
  }, []);

  // ── Start session ───────────────────────────────────────────────────────

  const start = useCallback(async (file: string, cwd: string) => {
    if (startingRef.current) return;
    startingRef.current = true;

    setError(null);
    setOutput([]);
    clearTransientState();
    setState('running');

    // Suscripciones limpias en cada arranque (evita listeners duplicados)
    releaseListeners();

    try {
      unlistenEventRef.current = await dbg.onDebugEvent(handleDebugEvent);
      unlistenOutputRef.current = await dbg.onDebugOutput(handleDebugOutput);

      const effectiveCwd = cwd.trim() || dirname(file);
      await dbg.start(file, effectiveCwd);

      // Aplicar breakpoints ANTES de arrancar el proceso
      const applied: Breakpoint[] = [];
      for (const bp of breakpointsRef.current) {
        try {
          const id = await dbg.setBreakpoint(bp.file, bp.line);
          applied.push({ ...bp, id });
        } catch {
          applied.push(bp);
        }
      }
      setBreakpoints(applied);

      await dbg.launch();
    } catch (e) {
      setState('idle');
      setError(String(e));
      setOutput(prev => [...prev, `[ERROR] ${e}`]);
      releaseListeners();
      try { await dbg.stop(); } catch { /* sesión ya cerrada */ }
    } finally {
      startingRef.current = false;
    }
  }, [clearTransientState, handleDebugEvent, handleDebugOutput, releaseListeners]);

  // ── Stop session ────────────────────────────────────────────────────────

  const stop = useCallback(async () => {
    try {
      await dbg.stop();
    } catch { /* already stopped */ }
    setState('idle');
    clearTransientState();
    releaseListeners();
  }, [clearTransientState, releaseListeners]);

  // ── Stepping ────────────────────────────────────────────────────────────

  const resume = useCallback(async () => {
    if (stateRef.current !== 'paused') return;
    try { await dbg.resume(); } catch (e) { setError(String(e)); }
  }, []);

  const stepOver = useCallback(async () => {
    if (stateRef.current !== 'paused') return;
    try { await dbg.stepOver(); } catch (e) { setError(String(e)); }
  }, []);

  const stepInto = useCallback(async () => {
    if (stateRef.current !== 'paused') return;
    try { await dbg.stepInto(); } catch (e) { setError(String(e)); }
  }, []);

  const stepOut = useCallback(async () => {
    if (stateRef.current !== 'paused') return;
    try { await dbg.stepOut(); } catch (e) { setError(String(e)); }
  }, []);

  const pause = useCallback(async () => {
    if (stateRef.current !== 'running') return;
    try { await dbg.pause(); } catch (e) { setError(String(e)); }
  }, []);

  // ── Breakpoints ─────────────────────────────────────────────────────────

  const toggleBreakpoint = useCallback(async (file: string, line: number) => {
    const existing = breakpointsRef.current.find(b => b.file === file && b.line === line);

    if (existing) {
      if (existing.id && stateRef.current !== 'idle') {
        try { await dbg.removeBreakpoint(existing.id); } catch { /* sesión cerrada */ }
      }
      setBreakpoints(prev => prev.filter(b => !(b.file === file && b.line === line)));
    } else {
      let id: string | undefined;
      if (stateRef.current !== 'idle') {
        try { id = await dbg.setBreakpoint(file, line); } catch { /* ok */ }
      }
      setBreakpoints(prev => [...prev, { file, line, id }]);
    }
  }, []);

  const clearBreakpoints = useCallback(() => {
    setBreakpoints([]);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  // ── Evaluate ────────────────────────────────────────────────────────────

  const evaluate = useCallback(async (expression: string): Promise<string> => {
    if (stateRef.current !== 'paused') return '';
    try {
      const frameId = callFrames[0]?.callFrameId;
      const res = await dbg.evaluate(expression, frameId);
      const val = res?.result?.result;
      if (!val) return '';
      if (val.type === 'string') return `"${val.value}"`;
      return val.description ?? String(val.value ?? val.type);
    } catch (e) {
      return `Error: ${e}`;
    }
  }, [callFrames]);

  // ── Load variables for a specific scope ─────────────────────────────────

  const loadScopeVariables = useCallback(async (objectId: string): Promise<Variable[]> => {
    try {
      const res = await dbg.getProperties(objectId);
      return dbg.parseVariables(res);
    } catch {
      return [];
    }
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      releaseListeners();
    };
  }, [releaseListeners]);

  return {
    // State
    state,
    breakpoints,
    callFrames,
    variables,
    pausedFile,
    pausedLine,
    output,
    error,
    // Actions
    start,
    stop,
    resume,
    stepOver,
    stepInto,
    stepOut,
    pause,
    toggleBreakpoint,
    clearBreakpoints,
    clearOutput,
    evaluate,
    loadScopeVariables,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Directorio del archivo, usado como cwd por defecto al depurar. */
function dirname(file: string): string {
  const normalized = file.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  if (index <= 0) return file;
  return normalized.slice(0, index);
}
