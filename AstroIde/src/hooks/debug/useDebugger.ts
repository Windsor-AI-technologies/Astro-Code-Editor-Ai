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

  // ── Event handling ──────────────────────────────────────────────────────

  const handleDebugEvent = useCallback(async (event: DebugEvent) => {
    switch (event.eventType) {
      case 'paused': {
        setState('paused');
        const frames = dbg.parseCallFrames(event.data);
        setCallFrames(frames);

        if (frames.length > 0) {
          const top = frames[0];
          // Convert file:/// URL back to local path
          const file = urlToPath(top.url);
          setPausedFile(file);
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
        setPausedFile(null);
        setPausedLine(null);
        setCallFrames([]);
        setVariables([]);
        break;

      case 'console': {
        const args = event.data?.args ?? [];
        const text = args.map((a: any) => a.value ?? a.description ?? '').join(' ');
        setOutput(prev => [...prev, text]);
        break;
      }
      case 'exception': {
        const desc = event.data?.exceptionDetails?.text ?? 'Exception';
        setOutput(prev => [...prev, `[ERROR] ${desc}`]);
        setError(desc);
        break;
      }
    }
  }, []);

  const handleDebugOutput = useCallback((text: string) => {
    setOutput(prev => [...prev, text]);
  }, []);

  // ── Start session ───────────────────────────────────────────────────────

  const start = useCallback(async (file: string, cwd: string) => {
    try {
      setError(null);
      setOutput([]);
      setCallFrames([]);
      setVariables([]);
      setPausedFile(null);
      setPausedLine(null);
      setState('running');

      // Subscribe to events before starting
      unlistenEventRef.current = await dbg.onDebugEvent(handleDebugEvent);
      unlistenOutputRef.current = await dbg.onDebugOutput(handleDebugOutput);

      await dbg.start(file, cwd);

      // Apply existing breakpoints
      for (const bp of breakpoints) {
        try {
          const id = await dbg.setBreakpoint(bp.file, bp.line);
          setBreakpoints(prev => prev.map(b =>
            b.file === bp.file && b.line === bp.line ? { ...b, id } : b
          ));
        } catch { /* breakpoint may fail if file not loaded yet */ }
      }
    } catch (e) {
      setState('idle');
      setError(String(e));
    }
  }, [breakpoints, handleDebugEvent, handleDebugOutput]);

  // ── Stop session ────────────────────────────────────────────────────────

  const stop = useCallback(async () => {
    try {
      await dbg.stop();
    } catch { /* already stopped */ }
    setState('idle');
    setPausedFile(null);
    setPausedLine(null);
    setCallFrames([]);
    setVariables([]);
    unlistenEventRef.current?.();
    unlistenOutputRef.current?.();
    unlistenEventRef.current = null;
    unlistenOutputRef.current = null;
  }, []);

  // ── Stepping ────────────────────────────────────────────────────────────

  const resume = useCallback(async () => {
    if (state !== 'paused') return;
    try { await dbg.resume(); } catch (e) { setError(String(e)); }
  }, [state]);

  const stepOver = useCallback(async () => {
    if (state !== 'paused') return;
    try { await dbg.stepOver(); } catch (e) { setError(String(e)); }
  }, [state]);

  const stepInto = useCallback(async () => {
    if (state !== 'paused') return;
    try { await dbg.stepInto(); } catch (e) { setError(String(e)); }
  }, [state]);

  const stepOut = useCallback(async () => {
    if (state !== 'paused') return;
    try { await dbg.stepOut(); } catch (e) { setError(String(e)); }
  }, [state]);

  const pause = useCallback(async () => {
    if (state !== 'running') return;
    try { await dbg.pause(); } catch (e) { setError(String(e)); }
  }, [state]);

  // ── Breakpoints ─────────────────────────────────────────────────────────

  const toggleBreakpoint = useCallback(async (file: string, line: number) => {
    const existing = breakpoints.find(b => b.file === file && b.line === line);

    if (existing) {
      // Remove
      if (existing.id && state !== 'idle') {
        try { await dbg.removeBreakpoint(existing.id); } catch { /* ok */ }
      }
      setBreakpoints(prev => prev.filter(b => !(b.file === file && b.line === line)));
    } else {
      // Add
      let id: string | undefined;
      if (state !== 'idle') {
        try { id = await dbg.setBreakpoint(file, line); } catch { /* ok */ }
      }
      setBreakpoints(prev => [...prev, { file, line, id }]);
    }
  }, [breakpoints, state]);

  const clearBreakpoints = useCallback(() => {
    setBreakpoints([]);
  }, []);

  // ── Evaluate ────────────────────────────────────────────────────────────

  const evaluate = useCallback(async (expression: string): Promise<string> => {
    if (state !== 'paused') return '';
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
  }, [state, callFrames]);

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
      unlistenEventRef.current?.();
      unlistenOutputRef.current?.();
    };
  }, []);

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
    evaluate,
    loadScopeVariables,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function urlToPath(url: string): string {
  if (!url) return '';
  // file:///C:/Users/... → C:\Users\...
  return url
    .replace('file:///', '')
    .replace(/\//g, '\\');
}
