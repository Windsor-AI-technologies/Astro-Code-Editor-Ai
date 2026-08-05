import { useState, useRef, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';
import type { Tab } from '../types';
import { getLanguageFromPath } from '../utils/language';
import * as api from '../services/tauri';

let tabIdCounter = 0;
function newTabId() { return `tab-${++tabIdCounter}`; }

/**
 * Tab store — manages editor tabs with minimal memory footprint.
 * 
 * SOLID: Single Responsibility — only tab lifecycle (open, close, switch, dirty state).
 * RAM optimization: content is NOT stored in React state during editing.
 * Monaco manages file content via its internal models. We only store content
 * on tab.content for initial load and when persisting (save/switch).
 */
export function useTabs(editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const dirtySetRef = useRef(new Set<string>());

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;

  // ── Open file ───────────────────────────────────────────────────────

  const openFile = useCallback(async (path: string): Promise<boolean> => {
    // Already open? Just activate it
    const existing = tabs.find(t => t.path === path);
    if (existing) {
      setActiveTabId(existing.id);
      return true;
    }

    try {
      const content = await api.readFile(path);
      const name = path.split(/[\\/]/).pop() ?? path;
      const language = getLanguageFromPath(path);
      const tab: Tab = { id: newTabId(), path, name, content, language, isDirty: false };
      setTabs(prev => [...prev, tab]);
      setActiveTabId(tab.id);
      return true;
    } catch {
      return false;
    }
  }, [tabs]);

  // ── New untitled file ───────────────────────────────────────────────

  const newFile = useCallback(() => {
    const tab: Tab = {
      id: newTabId(), path: '', name: 'sin-titulo',
      content: '', language: 'plaintext', isDirty: true,
    };
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  // ── Close tab ─────────────────────────────────────────────────────────

  const closeTab = useCallback((id: string): boolean => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.isDirty && !confirm('Cambios sin guardar. ¿Cerrar?')) return false;

    const idx = tabs.findIndex(t => t.id === id);
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    dirtySetRef.current.delete(id);

    if (activeTabId === id) {
      const next = newTabs[idx] ?? newTabs[idx - 1] ?? null;
      setActiveTabId(next?.id ?? null);
    }
    return true;
  }, [tabs, activeTabId]);

  // ── Switch tab (persists editor content to outgoing tab) ──────────────

  const switchTab = useCallback((id: string) => {
    // Save current editor content to the tab being deactivated
    if (activeTabId && editorRef.current) {
      const currentContent = editorRef.current.getValue();
      setTabs(prev => prev.map(t =>
        t.id === activeTabId ? { ...t, content: currentContent } : t
      ));
    }
    setActiveTabId(id);
  }, [activeTabId, editorRef]);

  // ── Persist current editor content (call before unmounting editor) ────

  const persistCurrentContent = useCallback(() => {
    if (activeTabId && editorRef.current) {
      const content = editorRef.current.getValue();
      setTabs(prev => prev.map(t =>
        t.id === activeTabId ? { ...t, content } : t
      ));
    }
  }, [activeTabId, editorRef]);

  // ── Mark dirty (called once per edit session, not per keystroke) ──────

  const markDirty = useCallback(() => {
    if (activeTabId && !dirtySetRef.current.has(activeTabId)) {
      dirtySetRef.current.add(activeTabId);
      setTabs(prev => prev.map(t =>
        t.id === activeTabId ? (t.isDirty ? t : { ...t, isDirty: true }) : t
      ));
    }
  }, [activeTabId]);

  // ── Mark saved ────────────────────────────────────────────────────────

  const markSaved = useCallback((id: string, content: string, newPath?: string) => {
    dirtySetRef.current.delete(id);
    setTabs(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated: Tab = { ...t, content, isDirty: false };
      if (newPath) {
        updated.path = newPath;
        updated.name = newPath.split(/[\\/]/).pop() ?? newPath;
        updated.language = getLanguageFromPath(newPath);
      }
      return updated;
    }));
  }, []);

  // ── Change language ───────────────────────────────────────────────────

  const changeLanguage = useCallback((lang: string) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, language: lang } : t
    ));
  }, [activeTabId]);

  // ── Clear all (project switch) ────────────────────────────────────────

  const clearAll = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
    dirtySetRef.current.clear();
  }, []);

  return {
    tabs,
    activeTabId,
    activeTab,
    dirtySetRef,
    setTabs,
    openFile,
    newFile,
    closeTab,
    switchTab,
    persistCurrentContent,
    markDirty,
    markSaved,
    changeLanguage,
    clearAll,
  };
}
