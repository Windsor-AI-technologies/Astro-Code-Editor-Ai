import { useEffect, useRef } from 'react';

interface UseKeyboardOptions {
  onSave: () => void;
  onToggleSidebar: () => void;
  onCloseTab: () => void;
  onToggleSettings: () => void;
  onToggleTerminal: () => void;
  onToggleAI: () => void;
  onCommandPalette: () => void;
}

/**
 * Global keyboard shortcut handler for the IDE.
 * Supports Ctrl+S, Ctrl+B, Ctrl+W, Ctrl+,, Ctrl+`, Ctrl+Shift+A, Ctrl+K T
 */
export function useKeyboard({
  onSave, onToggleSidebar, onCloseTab, onToggleSettings,
  onToggleTerminal, onToggleAI, onCommandPalette
}: UseKeyboardOptions) {
  const ctrlKRef = useRef(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;

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
  }, [onSave, onToggleSidebar, onCloseTab, onToggleSettings, onToggleTerminal, onToggleAI, onCommandPalette]);
}
