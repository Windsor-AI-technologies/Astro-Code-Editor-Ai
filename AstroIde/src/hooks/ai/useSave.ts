import { useCallback } from 'react';
import type * as Monaco from 'monaco-editor';
import type { Tab, AppSettings } from '../../types';
import * as api from '../../services/tauri';

interface UseSaveOptions {
  activeTab: Tab | null;
  rootPath: string | null;
  settings: AppSettings;
  settingsOpen: boolean;
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  saveSettings: () => Promise<boolean>;
  markSaved: (id: string, content: string, newPath?: string) => void;
  refreshTree: () => void;
  showMessage: (msg: string) => void;
}

/**
 * Save logic — handles file save, format on save, untitled files, settings save.
 * SRP: Only responsible for persisting content to disk.
 * OCP: Adding new save behaviors (e.g. save-as) extends this hook, doesn't modify others.
 */
export function useSave({
  activeTab, rootPath, settings, settingsOpen,
  editorRef, saveSettings, markSaved, refreshTree, showMessage
}: UseSaveOptions) {
  const save = useCallback(async () => {
    // Save settings
    if (settingsOpen) {
      const ok = await saveSettings();
      showMessage(ok ? 'Configuración guardada' : 'Error al guardar config');
      return;
    }

    if (!activeTab) return;

    const currentContent = editorRef.current?.getValue() ?? activeTab.content;

    // Untitled file — prompt for name
    if (!activeTab.path) {
      const name = prompt('Nombre del archivo:', activeTab.name);
      if (!name) return;
      const basePath = rootPath ? `${rootPath}/${name}` : name;
      try {
        await api.writeFile(basePath, currentContent);
        markSaved(activeTab.id, currentContent, basePath);
        showMessage(`Guardado: ${name}`);
        refreshTree();
      } catch (e) { showMessage(`Error: ${e}`); }
      return;
    }

    // Format on save
    if (settings['editor.formatOnSave'] && editorRef.current) {
      await editorRef.current.getAction('editor.action.formatDocument')?.run();
    }

    const finalContent = editorRef.current?.getValue() ?? currentContent;

    try {
      await api.writeFile(activeTab.path, finalContent);
      markSaved(activeTab.id, finalContent);
      showMessage('Guardado');
    } catch (e) { showMessage(`Error al guardar: ${e}`); }
  }, [activeTab, rootPath, settings, settingsOpen, editorRef, saveSettings, markSaved, refreshTree, showMessage]);

  return { save };
}
