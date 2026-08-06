import { createContext, useContext } from 'react';
import type { Breakpoint, CallFrame, Variable, DebugState } from '../hooks/useDebugger';

export interface DebugContextValue {
  // State
  state: DebugState;
  breakpoints: Breakpoint[];
  callFrames: CallFrame[];
  variables: Variable[];
  pausedFile: string | null;
  pausedLine: number | null;
  output: string[];
  error: string | null;
  // Actions
  start: (file: string, cwd: string) => Promise<void>;
  stop: () => Promise<void>;
  resume: () => Promise<void>;
  stepOver: () => Promise<void>;
  stepInto: () => Promise<void>;
  stepOut: () => Promise<void>;
  pause: () => Promise<void>;
  toggleBreakpoint: (file: string, line: number) => Promise<void>;
  evaluate: (expression: string) => Promise<string>;
}

export const DebugContext = createContext<DebugContextValue>(null!);
export const useDebugCtx = () => useContext(DebugContext);
