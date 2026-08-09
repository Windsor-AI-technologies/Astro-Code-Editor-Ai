import { useState } from 'react';
import {
  Play, Square, Pause, SkipForward, ArrowDownToLine, ArrowUpFromLine,
  RotateCcw, Circle, ChevronRight, ChevronDown, X, Terminal as TermIcon
} from 'lucide-react';
import type { Breakpoint, CallFrame, Variable, DebugState } from '../../../hooks/debug/useDebugger';
import './DebugPanel.css';

interface DebugPanelProps {
  // State
  debugState: DebugState;
  breakpoints: Breakpoint[];
  callFrames: CallFrame[];
  variables: Variable[];
  output: string[];
  error: string | null;
  pausedFile: string | null;
  pausedLine: number | null;
  // Actions
  onStart: (file: string) => void;
  onStop: () => void;
  onResume: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  onPause: () => void;
  onRemoveBreakpoint: (file: string, line: number) => void;
  onEvaluate: (expr: string) => Promise<string>;
  onNavigateToFrame: (file: string, line: number) => void;
  // Context
  cwd?: string | null;
  activeFilePath?: string | null;
}

export default function DebugPanel(props: DebugPanelProps) {
  const {
    debugState, breakpoints, callFrames, variables, output, error,
    pausedFile, pausedLine,
    onStart, onStop, onResume, onStepOver, onStepInto, onStepOut, onPause,
    onRemoveBreakpoint, onEvaluate, onNavigateToFrame,
    activeFilePath,
  } = props;

  const [evalInput, setEvalInput] = useState('');
  const [evalResult, setEvalResult] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    variables: true, callstack: true, breakpoints: true, output: true,
  });

  function toggleSection(key: keyof typeof expandedSections) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleEval() {
    if (!evalInput.trim()) return;
    const result = await onEvaluate(evalInput);
    setEvalResult(result);
  }

  function handleStart() {
    const file = activeFilePath ?? '';
    if (!file) return;
    onStart(file);
  }

  const isIdle = debugState === 'idle';
  const isPaused = debugState === 'paused';
  const isRunning = debugState === 'running';

  return (
    <div className="debug-panel">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="debug-toolbar">
        <span className="debug-title">DEPURADOR</span>
        <div className="debug-controls">
          {isIdle ? (
            <button className="dbg-btn start" onClick={handleStart} disabled={!activeFilePath} title="Iniciar debug (F5)">
              <Play size={14} />
            </button>
          ) : (
            <>
              {isPaused ? (
                <button className="dbg-btn" onClick={onResume} title="Continuar (F5)"><Play size={13} /></button>
              ) : (
                <button className="dbg-btn" onClick={onPause} title="Pausar (F6)"><Pause size={13} /></button>
              )}
              <button className="dbg-btn" onClick={onStepOver} disabled={!isPaused} title="Step Over (F10)"><SkipForward size={13} /></button>
              <button className="dbg-btn" onClick={onStepInto} disabled={!isPaused} title="Step Into (F11)"><ArrowDownToLine size={13} /></button>
              <button className="dbg-btn" onClick={onStepOut} disabled={!isPaused} title="Step Out (Shift+F11)"><ArrowUpFromLine size={13} /></button>
              <button className="dbg-btn" onClick={onStop} title="Detener (Shift+F5)"><Square size={13} /></button>
              <button className="dbg-btn" onClick={handleStart} title="Reiniciar (Ctrl+Shift+F5)"><RotateCcw size={13} /></button>
            </>
          )}
        </div>
      </div>

      {/* ── Status ───────────────────────────────────────────────── */}
      <div className={`debug-status ${debugState}`}>
        {isIdle && 'Listo para depurar'}
        {isRunning && 'Ejecutando...'}
        {isPaused && pausedFile && `Pausado en ${pausedFile.split(/[\\/]/).pop()}:${pausedLine}`}
        {error && <span className="debug-error">{error}</span>}
      </div>

      <div className="debug-body">
        {/* ── Variables ─────────────────────────────────────────── */}
        <div className="debug-section">
          <div className="debug-section-header" onClick={() => toggleSection('variables')}>
            {expandedSections.variables ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>VARIABLES</span>
            <span className="debug-badge">{variables.length}</span>
          </div>
          {expandedSections.variables && (
            <div className="debug-section-body">
              {variables.length === 0 ? (
                <div className="debug-empty">{isPaused ? 'Sin variables locales' : 'Pausa para inspeccionar'}</div>
              ) : (
                variables.map((v, i) => (
                  <div key={i} className="debug-var-row">
                    <span className="debug-var-name">{v.name}</span>
                    <span className={`debug-var-value type-${v.type}`}>{v.value}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Watch / Evaluate ──────────────────────────────────── */}
        {isPaused && (
          <div className="debug-section">
            <div className="debug-section-header">
              <TermIcon size={12} />
              <span>EVALUAR</span>
            </div>
            <div className="debug-eval">
              <input
                className="debug-eval-input"
                placeholder="Expresion..."
                value={evalInput}
                onChange={e => setEvalInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEval(); }}
              />
              {evalResult !== null && (
                <div className="debug-eval-result">{evalResult}</div>
              )}
            </div>
          </div>
        )}

        {/* ── Call Stack ────────────────────────────────────────── */}
        <div className="debug-section">
          <div className="debug-section-header" onClick={() => toggleSection('callstack')}>
            {expandedSections.callstack ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>PILA DE LLAMADAS</span>
            <span className="debug-badge">{callFrames.length}</span>
          </div>
          {expandedSections.callstack && (
            <div className="debug-section-body">
              {callFrames.length === 0 ? (
                <div className="debug-empty">Sin frames</div>
              ) : (
                callFrames.map((f, i) => (
                  <div
                    key={i}
                    className={`debug-frame-row ${i === 0 ? 'active' : ''}`}
                    onClick={() => onNavigateToFrame(f.url.replace('file:///', '').replace(/\//g, '\\'), f.lineNumber)}
                  >
                    <span className="debug-frame-name">{f.functionName}</span>
                    <span className="debug-frame-loc">{f.url.split(/[\\/]/).pop()}:{f.lineNumber}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Breakpoints ──────────────────────────────────────── */}
        <div className="debug-section">
          <div className="debug-section-header" onClick={() => toggleSection('breakpoints')}>
            {expandedSections.breakpoints ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>BREAKPOINTS</span>
            <span className="debug-badge">{breakpoints.length}</span>
          </div>
          {expandedSections.breakpoints && (
            <div className="debug-section-body">
              {breakpoints.length === 0 ? (
                <div className="debug-empty">Click en el gutter del editor</div>
              ) : (
                breakpoints.map((bp, i) => (
                  <div key={i} className="debug-bp-row">
                    <Circle size={8} className="debug-bp-dot" />
                    <span className="debug-bp-file">{bp.file.split(/[\\/]/).pop()}</span>
                    <span className="debug-bp-line">:{bp.line}</span>
                    <button className="debug-bp-remove" onClick={() => onRemoveBreakpoint(bp.file, bp.line)}>
                      <X size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Output ───────────────────────────────────────────── */}
        <div className="debug-section">
          <div className="debug-section-header" onClick={() => toggleSection('output')}>
            {expandedSections.output ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>SALIDA</span>
          </div>
          {expandedSections.output && (
            <div className="debug-output">
              {output.length === 0 ? (
                <div className="debug-empty">Sin salida</div>
              ) : (
                output.map((line, i) => (
                  <div key={i} className="debug-output-line">{line}</div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
