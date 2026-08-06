import { useWorkspaceCtx } from '../../../contexts/WorkspaceContext';
import { useTabsCtx } from '../../../contexts/TabsContext';
import { useSettingsCtx } from '../../../contexts/SettingsContext';
import { useUICtx } from '../../../contexts/UIContext';
import { useActionsCtx } from '../../../contexts/ActionsContext';
import { useDebugCtx } from '../../../contexts/DebugContext';

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
  const debug = useDebugCtx();

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
          <DebugPanel
            debugState={debug.state}
            breakpoints={debug.breakpoints}
            callFrames={debug.callFrames}
            variables={debug.variables}
            output={debug.output}
            error={debug.error}
            pausedFile={debug.pausedFile}
            pausedLine={debug.pausedLine}
            onStart={(file) => debug.start(file, rootPath ?? '')}
            onStop={debug.stop}
            onResume={debug.resume}
            onStepOver={debug.stepOver}
            onStepInto={debug.stepInto}
            onStepOut={debug.stepOut}
            onPause={debug.pause}
            onRemoveBreakpoint={(file, line) => debug.toggleBreakpoint(file, line)}
            onEvaluate={debug.evaluate}
            onNavigateToFrame={(file, _line) => { openFile(file); }}
            activeFilePath={activeTab?.path ?? null}
          />
        )}
        {position === 'right' && ui.activeView === 'containers' && <Contenedores />}
      </div>
      {position === 'left' && <div className="resize-handle" onMouseDown={actions.onSidebarResize} />}
    </>
  );
}
