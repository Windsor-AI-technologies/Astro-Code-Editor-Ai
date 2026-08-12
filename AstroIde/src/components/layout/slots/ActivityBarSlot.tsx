import { useUICtx } from '../../../contexts/UIContext';
import { useSettingsCtx } from '../../../contexts/SettingsContext';
import ActivityBar from '../ActivityBar/ActivityBar';

interface ActivityBarSlotProps {
  onModeChange?: (mode: string) => void;
}

export default function ActivityBarSlot({ onModeChange }: ActivityBarSlotProps) {
  const { activeView, openView } = useUICtx();
  const { toggleSettings } = useSettingsCtx();

  return <ActivityBar activeView={activeView} onViewChange={openView} onOpenSettings={toggleSettings} onModeChange={onModeChange} />;
}
