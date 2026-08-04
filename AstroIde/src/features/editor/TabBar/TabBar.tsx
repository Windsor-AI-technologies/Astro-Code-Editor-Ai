import { X, Circle, Settings } from 'lucide-react';
import type { Tab } from '../../../types';
import './TabBar.css';

const SETTINGS_TAB_ID = '__settings__';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  settingsOpen: boolean;
  onOpenSettings: () => void;
}

export default function TabBar({
  tabs, activeTabId, onSelectTab, onCloseTab,
  settingsOpen, onOpenSettings: _onOpenSettings,
}: TabBarProps) {
  function handleMiddleClick(e: React.MouseEvent, id: string) {
    if (e.button === 1) { e.preventDefault(); onCloseTab(id); }
  }

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`tab ${tab.id === activeTabId && !settingsOpen ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''}`}
          onClick={() => onSelectTab(tab.id)}
          onMouseDown={e => handleMiddleClick(e, tab.id)}
          title={tab.path}
        >
          <span className="tab-name">{tab.name}</span>
          <button className="tab-close" onClick={e => { e.stopPropagation(); onCloseTab(tab.id); }}>
            {tab.isDirty ? <Circle size={9} fill="currentColor" /> : <X size={11} />}
          </button>
        </div>
      ))}

      {/* Tab especial de configuración */}
      <div
        className={`tab tab-settings ${settingsOpen ? 'active' : ''}`}
        onClick={() => onSelectTab(SETTINGS_TAB_ID)}
        title="Configuración (Ctrl+,)"
      >
        <Settings size={13} />
        <span className="tab-name">Configuración</span>
        {settingsOpen && (
          <button className="tab-close" onClick={e => { e.stopPropagation(); onCloseTab(SETTINGS_TAB_ID); }}>
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
