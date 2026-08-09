import { useEffect, useRef } from 'react';
import type * as Monaco from 'monaco-editor';
import type { Tab } from '../../types';
import * as api from '../../services/tauri';

interface UseAutoSaveOptions {
  tabs: Tab[];
  activeTabId: string | null;
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  dirtySetRef: React.MutableRefObject<Set<string>>;
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
}

/**
 * Auto-saves dirty files 500ms after the last change.
 * Reads content from Monaco editor for the active tab.
 */
export function useAutoSave({ tabs, activeTabId, editorRef, dirtySetRef, setTabs }: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  useEffect(() => {
    const hasDirty = tabs.some(t => t.isDirty && t.path);
    if (!hasDirty) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const editor = editorRef.current;
      const currentTabs = tabsRef.current;
      const dirtyTabs = currentTabs.filter(t => t.isDirty && t.path);

      for (const tab of dirtyTabs) {
        const content = (activeTabId === tab.id && editor)
          ? editor.getValue()
          : tab.content;
        if (!content && content !== '') continue;
        try {
          await api.writeFile(tab.path, content);
          dirtySetRef.current.delete(tab.id);
          setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, content, isDirty: false } : t));
        } catch { /* silencioso */ }
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.filter(t => t.isDirty).length]);

  function cancelAutoSave() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return { cancelAutoSave };
}
