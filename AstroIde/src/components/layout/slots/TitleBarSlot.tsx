import { useWorkspaceCtx } from '../../../contexts/WorkspaceContext';
import { useTabsCtx } from '../../../contexts/TabsContext';
import { useSettingsCtx } from '../../../contexts/SettingsContext';
import { useUICtx } from '../../../contexts/UIContext';
import { useActionsCtx } from '../../../contexts/ActionsContext';
import TitleBar from '../TitleBar/TitleBar';

export default function TitleBarSlot({ modeSwitcher }: { modeSwitcher?: React.ReactNode }) {
  const { openFolder, openFile } = useWorkspaceCtx();
  const { newFile } = useTabsCtx();
  const { settings, toggleSettings } = useSettingsCtx();
  const ui = useUICtx();
  const actions = useActionsCtx();

  if (settings['workbench.nativeFrame']) return null;

  return (
    <TitleBar
      onOpenFolder={openFolder} onOpenFile={openFile} onSave={actions.save}
      onNewFile={newFile} canSave={actions.canSave} onUndo={actions.undo} onRedo={actions.redo}
      onFind={actions.find} onOpenSettings={toggleSettings} onToggleTerminal={ui.toggleTerminal}
      onToggleAI={ui.toggleAI} trafficLightPosition={settings['workbench.trafficLightPosition']}
      onOpenCommandPalette={() => ui.setEditorCmdPaletteOpen(true)}
      modeSwitcher={modeSwitcher}
    />
  );
}
