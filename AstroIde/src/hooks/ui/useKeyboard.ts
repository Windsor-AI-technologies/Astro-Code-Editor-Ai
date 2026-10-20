/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useEffect, useRef } from 'react';

interface UseKeyboardOptions {
  onSave: () => void;
  onToggleSidebar: () => void;
  onCloseTab: () => void;
  onToggleSettings: () => void;
  onToggleTerminal: () => void;
  onToggleAI: () => void;
  onCommandPalette: () => void;
  /** F5 — continuar o iniciar depuración */
  onDebug?: () => void;
  /** Ctrl+F5 — ejecutar sin depurar */
  onRun?: () => void;
  /** Shift+F5 — detener ejecución/depuración */
  onStopExecution?: () => void;
}

/**
 * Global keyboard shortcut handler for the IDE.
 * Supports Ctrl+S, Ctrl+B, Ctrl+W, Ctrl+,, Ctrl+`, Ctrl+Shift+A, Ctrl+K T,
 * F5, Ctrl+F5 and Shift+F5.
 */
export function useKeyboard({
  onSave, onToggleSidebar, onCloseTab, onToggleSettings,
  onToggleTerminal, onToggleAI, onCommandPalette,
  onDebug, onRun, onStopExecution,
}: UseKeyboardOptions) {
  const ctrlKRef = useRef(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;

      // F5 / Ctrl+F5 / Shift+F5 (ejecutar y depurar)
      if (e.key === 'F5') {
        e.preventDefault();
        if (e.shiftKey) onStopExecution?.();
        else if (mod) onRun?.();
        else onDebug?.();
        return;
      }

      if (mod && e.key === 's') { e.preventDefault(); onSave(); }
      if (mod && e.key === 'b') { e.preventDefault(); onToggleSidebar(); }
      if (mod && e.key === 'w') { e.preventDefault(); onCloseTab(); }
      if (mod && e.key === ',') { e.preventDefault(); onToggleSettings(); }
      if (e.key === '`' && mod) { e.preventDefault(); onToggleTerminal(); }
      if (mod && e.shiftKey && e.key === 'A') { e.preventDefault(); onToggleAI(); }

      // Ctrl+K → espera segunda tecla
      if (mod && e.key === 'k') {
        e.preventDefault();
        ctrlKRef.current = true;
        setTimeout(() => { ctrlKRef.current = false; }, 1500);
        return;
      }
      // Segunda tecla T después de Ctrl+K
      if (ctrlKRef.current && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        ctrlKRef.current = false;
        onCommandPalette();
        return;
      }
      if (ctrlKRef.current && e.key !== 'Control') {
        ctrlKRef.current = false;
      }
    }

    function onEditorSave() { onSave(); }

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('editor-save', onEditorSave);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('editor-save', onEditorSave);
    };
  }, [onSave, onToggleSidebar, onCloseTab, onToggleSettings, onToggleTerminal, onToggleAI, onCommandPalette, onDebug, onRun, onStopExecution]);
}
