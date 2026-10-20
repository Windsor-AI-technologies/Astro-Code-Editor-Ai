/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { createContext, useContext } from 'react';
import type { Breakpoint, CallFrame, Variable, DebugState } from '../hooks/debug/useDebugger';
import type { RunOutput } from '../services/runner';

export interface DebugContextValue {
  // Estado de depuración
  state: DebugState;
  breakpoints: Breakpoint[];
  callFrames: CallFrame[];
  variables: Variable[];
  pausedFile: string | null;
  pausedLine: number | null;
  output: string[];
  error: string | null;
  // Acciones de depuración
  start: (file: string, cwd: string) => Promise<void>;
  stop: () => Promise<void>;
  resume: () => Promise<void>;
  stepOver: () => Promise<void>;
  stepInto: () => Promise<void>;
  stepOut: () => Promise<void>;
  pause: () => Promise<void>;
  toggleBreakpoint: (file: string, line: number) => Promise<void>;
  evaluate: (expression: string) => Promise<string>;
  clearOutput: () => void;
  // Ejecución sin depurar (Run)
  runState: 'idle' | 'running';
  runOutput: RunOutput[];
  runError: string | null;
  runInputAvailable: boolean;
  run: (file: string, cwd: string, content?: string) => Promise<void>;
  stopRun: () => Promise<void>;
  clearRunOutput: () => void;
  sendRunInput: (input: string) => Promise<void>;
}

export const DebugContext = createContext<DebugContextValue>(null!);
export const useDebugCtx = () => useContext(DebugContext);
