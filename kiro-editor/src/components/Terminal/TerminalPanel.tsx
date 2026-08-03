import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, X, Terminal as TermIcon, ChevronDown } from 'lucide-react';
import TerminalView from './Terminal';
import type { TerminalColors } from '../../themes';
import './Terminal.css';

interface TerminalTab {
  id: number;
  name: string;
}

interface TerminalPanelProps {
  visible: boolean;
  onToggle: () => void;
  cwd: string | null;
  fontSize: number;
  fontFamily: string;
  panelHeight: number;
  onResizeStart: (e: React.MouseEvent) => void;
  colors: TerminalColors;
}

let nextTermId = 1;

export default function TerminalPanel({
  visible, onToggle, cwd, fontSize, fontFamily, panelHeight, onResizeStart, colors
}: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  const handleNewTerminal = useCallback(() => {
    const id = nextTermId++;
    const tab: TerminalTab = { id, name: `powershell` };
    setTabs(prev => [...prev, tab]);
    setActiveId(id);
  }, []);

  function handleCloseTerminal(id: number) {
    invoke('kill_terminal', { id }).catch(() => {});
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== id);
      if (activeId === id) {
        setActiveId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      }
      return newTabs;
    });
  }

  // Auto-crear primera terminal cuando se hace visible
  useEffect(() => {
    if (visible && tabs.length === 0) {
      handleNewTerminal();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="terminal-panel" style={{ height: panelHeight }}>
      <div className="terminal-resize-handle" onMouseDown={onResizeStart} />

      <div className="terminal-header">
        <div className="terminal-header-left">
          <span className="terminal-header-label">TERMINAL</span>
        </div>

        <div className="terminal-tabs">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`terminal-tab ${tab.id === activeId ? 'active' : ''}`}
              onClick={() => setActiveId(tab.id)}
            >
              <TermIcon size={12} />
              <span>{tab.name}</span>
              <button
                className="terminal-tab-close"
                onClick={e => { e.stopPropagation(); handleCloseTerminal(tab.id); }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>

        <div className="terminal-header-actions">
          <button className="terminal-action-btn" onClick={handleNewTerminal} title="Nueva terminal">
            <Plus size={14} />
          </button>
          <button className="terminal-action-btn" onClick={onToggle} title="Cerrar panel (Ctrl+`)">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div className="terminal-body">
        {tabs.map(tab => (
          <TerminalView
            key={tab.id}
            id={tab.id}
            active={tab.id === activeId}
            cwd={cwd}
            fontSize={fontSize}
            fontFamily={fontFamily}
            colors={colors}
          />
        ))}
      </div>
    </div>
  );
}
