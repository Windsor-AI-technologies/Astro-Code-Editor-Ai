import { useWorkspaceCtx } from '../../../contexts/WorkspaceContext';
import { useTabsCtx } from '../../../contexts/TabsContext';
import { useSettingsCtx } from '../../../contexts/SettingsContext';
import { useUICtx } from '../../../contexts/UIContext';
import { useActionsCtx } from '../../../contexts/ActionsContext';
import AIPanel from '../../../features/ai/AIPanel/AIPanel';

interface AIPanelSlotProps {
  position: 'left' | 'right';
}

export default function AIPanelSlot({ position }: AIPanelSlotProps) {
  const { rootPath } = useWorkspaceCtx();
  const { activeTab } = useTabsCtx();
  const { settings } = useSettingsCtx();
  const { aiPanelVisible, toggleAI } = useUICtx();
  const { onAiResize } = useActionsCtx();

  if (settings['workbench.aiPanelPosition'] !== position) return null;

  return (
    <>
      {position === 'right' && aiPanelVisible && (
        <div className="ai-resize-handle" onMouseDown={onAiResize} />
      )}
      <AIPanel
        key={`ai-${position}-${rootPath ?? ''}`}
        visible={aiPanelVisible} onToggle={toggleAI}
        width={settings['workbench.aiPanelWidth']} onResizeStart={onAiResize}
        activeFilePath={activeTab?.path ?? null} acrylic={settings['workbench.acrylic']}
      />
      {position === 'left' && aiPanelVisible && (
        <div className="ai-resize-handle" onMouseDown={onAiResize} />
      )}
    </>
  );
}
