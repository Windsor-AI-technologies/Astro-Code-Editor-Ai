import { useUICtx } from '../../../contexts/UIContext';
import { useSettingsCtx } from '../../../contexts/SettingsContext';
import ActivityBar from '../ActivityBar/ActivityBar';

export default function ActivityBarSlot() {
  const { activeView, openView } = useUICtx();
  const { toggleSettings } = useSettingsCtx();

  return <ActivityBar activeView={activeView} onViewChange={openView} onOpenSettings={toggleSettings} />;
}
