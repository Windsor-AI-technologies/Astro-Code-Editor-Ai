import { settingsToEditorOptions } from '../../../types';
import { useWorkspaceCtx } from '../../../contexts/WorkspaceContext';
import { useTabsCtx } from '../../../contexts/TabsContext';
import { useSettingsCtx } from '../../../contexts/SettingsContext';

import TabBar from '../../../features/editor/TabBar/TabBar';
import CodeEditor from '../../../features/editor/CodeEditor/CodeEditor';
import SettingsPanel from '../../../features/settings/SettingsPanel/SettingsPanel';

export default function EditorSlot() {
  const { rootPath } = useWorkspaceCtx();
  const { tabs, activeTab, displayActiveId, editorRef, selectTab, closeTab, markDirty, changeLanguage } = useTabsCtx();
  const { settings, setSettings, settingsOpen, toggleSettings, themeId } = useSettingsCtx();

  return (
    <div className="main-column">
      <div className="editor-area">
        <TabBar tabs={tabs} activeTabId={displayActiveId} onSelectTab={selectTab}
          onCloseTab={closeTab} settingsOpen={settingsOpen} onOpenSettings={toggleSettings} />
        <div className="editor-container">
          {settingsOpen ? (
            <SettingsPanel settings={settings} onSettingsChange={setSettings} theme={themeId} />
          ) : (
            <CodeEditor tab={activeTab} settings={settingsToEditorOptions(settings)} themeId={themeId}
              onChange={markDirty} onLanguageChange={changeLanguage} editorRef={editorRef} rootPath={rootPath} />
          )}
        </div>
      </div>
    </div>
  );
}
