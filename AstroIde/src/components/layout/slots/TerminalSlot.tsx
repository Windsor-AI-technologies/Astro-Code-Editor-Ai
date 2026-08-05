import { getTerminalColors } from '../../../themes';
import { useWorkspaceCtx } from '../../../contexts/WorkspaceContext';
import { useSettingsCtx } from '../../../contexts/SettingsContext';
import { useUICtx } from '../../../contexts/UIContext';
import { useActionsCtx } from '../../../contexts/ActionsContext';
import TerminalPanel from '../../../features/terminal/Terminal/TerminalPanel';

export default function TerminalSlot() {
  const { rootPath } = useWorkspaceCtx();
  const { settings, themeId } = useSettingsCtx();
  const { terminalVisible, terminalHeight, toggleTerminal } = useUICtx();
  const { onTerminalResize, terminalPanelRef } = useActionsCtx();

  return (
    <TerminalPanel
      ref={terminalPanelRef} visible={terminalVisible} onToggle={toggleTerminal}
      cwd={rootPath} fontSize={settings['editor.fontSize'] - 1}
      fontFamily={settings['editor.fontFamily']} panelHeight={terminalHeight}
      onResizeStart={onTerminalResize} colors={getTerminalColors(themeId)}
    />
  );
}
