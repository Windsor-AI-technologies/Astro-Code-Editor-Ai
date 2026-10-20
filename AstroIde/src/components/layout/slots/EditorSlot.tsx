/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useCallback } from 'react';
import { settingsToEditorOptions } from '../../../types';
import { useWorkspaceCtx } from '../../../contexts/WorkspaceContext';
import { useTabsCtx } from '../../../contexts/TabsContext';
import { useSettingsCtx } from '../../../contexts/SettingsContext';
import { useDebugCtx } from '../../../contexts/DebugContext';

import TabBar from '../../../features/editor/TabBar/TabBar';
import CodeEditor from '../../../features/editor/CodeEditor/CodeEditor';
import SettingsPanel from '../../../features/settings/SettingsPanel/SettingsPanel';

export default function EditorSlot() {
  const { rootPath, openFile } = useWorkspaceCtx();
  const { tabs, activeTab, displayActiveId, editorRef, selectTab, closeTab, markDirty, changeLanguage, diffPreview, setDiffPreview } = useTabsCtx();
  const { settings, setSettings, settingsOpen, toggleSettings, themeId } = useSettingsCtx();
  const debug = useDebugCtx();

  const handleOpenFileAt = useCallback((path: string, line: number) => {
    openFile(path);

    let attempts = 0;
    const reveal = () => {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (editor && model && sameFilePath(model.uri.toString(), path)) {
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.revealLineInCenterIfOutsideViewport(line);
        editor.focus();
        return;
      }
      if (attempts++ < 40) window.setTimeout(reveal, 50);
    };

    window.setTimeout(reveal, 30);
  }, [openFile, editorRef]);

  return (
    <div className="main-column">
      <div className="editor-area">
        <TabBar tabs={tabs} activeTabId={displayActiveId} onSelectTab={selectTab}
          onCloseTab={closeTab} settingsOpen={settingsOpen} onOpenSettings={toggleSettings} />
        <div className="editor-container">
          {settingsOpen && (
            <SettingsPanel settings={settings} onSettingsChange={setSettings} theme={themeId} />
          )}
          <div style={{ display: settingsOpen ? 'none' : 'contents' }}>
            <CodeEditor
              tab={activeTab}
              settings={settingsToEditorOptions(settings)}
              themeId={themeId}
              onChange={markDirty}
              onLanguageChange={changeLanguage}
              editorRef={editorRef}
              rootPath={rootPath}
              breakpoints={debug.breakpoints}
              pausedLine={debug.pausedLine}
              pausedFile={debug.pausedFile}
              onToggleBreakpoint={debug.toggleBreakpoint}
              diffPreview={diffPreview}
              onAcceptDiff={() => setDiffPreview(null)}
              onDiscardDiff={() => setDiffPreview(null)}
              onOpenFile={handleOpenFileAt}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function sameFilePath(uri: string, path: string): boolean {
  const normalize = (value: string) => {
    let normalized = value;
    try {
      normalized = decodeURIComponent(normalized);
    } catch { /* ruta no codificada */ }
    return normalized
      .replace(/^file:\/\//, '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .toLowerCase();
  };

  return normalize(uri) === normalize(path);
}
