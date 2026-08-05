import { useState, useCallback, useEffect } from 'react';
import type { FileEntry } from '../types';
import * as api from '../services/tauri';
import { disposeAllCompletionProviders } from '../utils/completions';
import { clearDocumentVersions } from '../services/lsp-monaco-bridge';
import { loader } from '@monaco-editor/react';

/**
 * Workspace store — manages project root, file tree, and project lifecycle.
 * SRP: Only workspace-level concerns (project open/close/refresh).
 * OCP: New cleanup steps can be added via the onBeforeOpen callback.
 */
export function useWorkspace() {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<FileEntry[]>([]);

  const refreshTree = useCallback(async (path?: string) => {
    const target = path ?? rootPath;
    if (!target) return;
    const entries = await api.readDir(target);
    setTree(entries);
  }, [rootPath]);

  // Refresh tree when rootPath changes
  useEffect(() => { refreshTree(); }, [rootPath]);

  /**
   * Open a new project folder.
   * @param path - folder path to open
   * @param onBeforeOpen - callback to clean up external state (tabs, terminal, etc.)
   */
  const openFolder = useCallback(async (path: string, onBeforeOpen?: () => void) => {
    // Let consumer clean its own state (tabs, terminal refs, etc.)
    onBeforeOpen?.();

    // Dispose Monaco models (frees file content RAM)
    try {
      const monaco = await loader.init();
      monaco.editor.getModels().forEach(model => model.dispose());
    } catch { /* not initialized yet */ }

    // Clean providers & LSP state
    disposeAllCompletionProviders();
    clearDocumentVersions();

    // Small tick for React to unmount old components
    await new Promise(r => setTimeout(r, 10));

    // Load new project
    setRootPath(path);
    const entries = await api.readDir(path);
    setTree(entries);

    // Persist
    api.saveWorkspace(path).catch(() => {});
  }, []);

  /**
   * Restore last opened workspace on startup.
   */
  const restoreWorkspace = useCallback(async (onRestore: (path: string) => void) => {
    try {
      const path = await api.loadWorkspace();
      if (path) onRestore(path);
    } catch { /* no saved workspace */ }
  }, []);

  return { rootPath, tree, refreshTree, openFolder, restoreWorkspace };
}
