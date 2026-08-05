import { useTabsCtx } from '../../../contexts/TabsContext';
import { useUICtx } from '../../../contexts/UIContext';
import StatusBar from '../StatusBar/StatusBar';

export default function StatusBarSlot() {
  const { activeTab } = useTabsCtx();
  const { cursorPos, statusMessage } = useUICtx();

  return (
    <StatusBar
      activeTab={activeTab}
      cursorPos={cursorPos}
      isDirty={activeTab?.isDirty ?? false}
      message={statusMessage}
    />
  );
}
