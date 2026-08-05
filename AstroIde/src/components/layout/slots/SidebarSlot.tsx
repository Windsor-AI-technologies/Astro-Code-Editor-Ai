import { useWorkspaceCtx } from '../../../contexts/WorkspaceContext';
import { useTabsCtx } from '../../../contexts/TabsContext';
import { useSettingsCtx } from '../../../contexts/SettingsContext';
import { useUICtx } from '../../../contexts/UIContext';
import { useActionsCtx } from '../../../contexts/ActionsContext';
import * as api from '../../../services/tauri';

import FileExplorer from '../../../features/explorer/FileExplorer/FileExplorer';
import SearchPanel from '../../../features/search/SearchPanel/SearchPanel';
import GitPanel from '../../../features/git/GitPanel/GitPanel';
import ExtensionsPanel from '../../../features/extensions/ExtensionsPanel/ExtensionsPanel';
import DebugPanel from '../../../features/debug/DebugPanel/DebugPanel';
import Contenedores from '../../../features/cloud/Cloude/cloude';

interface SidebarSlotProps {
  position: 'left' | 'right';
}

export default function SidebarSlot({ position }: SidebarSlotProps) {
  const { rootPath, tree, refreshTree, openFile } = useWorkspaceCtx();
  const { activeTab } = useTabsCtx();
  const { settings } = useSettingsCtx();
  const ui = useUICtx();
  const actions = useActionsCtx();

  const sidebarLeft = settings['workbench.sidebarPosition'] === 'left';
  const acrylicOn = settings['workbench.acrylic'];

  // Only render if position matches settings
  if ((position === 'left' && !sidebarLeft) || (position === 'right' && sidebarLeft)) return null;
  if (!ui.sidebarVisible) return null;

  return (
    <>
      {position === 'right' && <div className="resize-handle" onMouseDown={actions.onSidebarResize} />}
      <div className={`sidebar${acrylicOn ? ' acrylic' : ''}`} style={{ width: settings['workbench.sidebarWidth'] }}>
        {ui.activeView === 'files' && (
          <FileExplorer rootPath={rootPath} tree={tree} onFileSelect={openFile}
            onTreeChange={refreshTree} activeFilePath={activeTab?.path ?? null}
            iconTheme={settings['workbench.iconTheme']} />
        )}
        {ui.activeView === 'search' && <SearchPanel />}
        {ui.activeView === 'git' && <GitPanel />}
        {ui.activeView === 'extensions' && <ExtensionsPanel />}
        {ui.activeView === 'debug' && (
          <DebugPanel cwd={rootPath} onRunProject={(cmd) => {
            ui.setTerminalVisible(true);
            api.writeTerminal(0, cmd + '\n').catch(() => {});
          }} />
        )}
        {position === 'right' && ui.activeView === 'containers' && <Contenedores />}
      </div>
      {position === 'left' && <div className="resize-handle" onMouseDown={actions.onSidebarResize} />}
    </>
  );
}
