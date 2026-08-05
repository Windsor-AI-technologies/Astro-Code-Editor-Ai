import { useSettingsCtx } from './contexts/SettingsContext';

import TitleBarSlot from './components/layout/slots/TitleBarSlot';
import ActivityBarSlot from './components/layout/slots/ActivityBarSlot';
import AIPanelSlot from './components/layout/slots/AIPanelSlot';
import SidebarSlot from './components/layout/slots/SidebarSlot';
import EditorSlot from './components/layout/slots/EditorSlot';
import TerminalSlot from './components/layout/slots/TerminalSlot';
import StatusBarSlot from './components/layout/slots/StatusBarSlot';
import PalettesSlot from './components/layout/slots/PalettesSlot';

/**
 * AppLayout — Pure layout composition.
 * SRP: Only arranges slots in the correct visual order.
 * Each slot self-manages via its own context consumption.
 */
export default function AppLayout() {
  const { settings } = useSettingsCtx();
  const acrylicOn = settings['workbench.acrylic'];

  return (
    <div className={`app${acrylicOn ? ' acrylic-on' : ''}`}>
      <TitleBarSlot />

      <div className="app-body">
        <ActivityBarSlot />
        <AIPanelSlot position="left" />
        <SidebarSlot position="left" />
        <EditorSlot />
        <SidebarSlot position="right" />
        <AIPanelSlot position="right" />
      </div>

      <TerminalSlot />
      <StatusBarSlot />
      <PalettesSlot />
    </div>
  );
}
