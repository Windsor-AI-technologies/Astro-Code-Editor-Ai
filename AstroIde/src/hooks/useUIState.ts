import { useState, useCallback } from 'react';

/**
 * UI layout state — panel visibility, active view, messages.
 * SRP: Only manages which panels are visible and transient UI state.
 */
export function useUIState() {
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [aiPanelVisible, setAiPanelVisible] = useState(true);
  const [activeView, setActiveView] = useState('files');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [editorCmdPaletteOpen, setEditorCmdPaletteOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showMessage = useCallback((msg: string, ms = 2500) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), ms);
  }, []);

  const toggleTerminal = useCallback(() => setTerminalVisible(v => !v), []);
  const toggleAI = useCallback(() => setAiPanelVisible(v => !v), []);
  const toggleSidebar = useCallback(() => setSidebarVisible(v => !v), []);

  const openView = useCallback((view: string) => {
    setActiveView(view);
    setSidebarVisible(true);
  }, []);

  return {
    // Terminal
    terminalVisible, setTerminalVisible, terminalHeight, setTerminalHeight, toggleTerminal,
    // AI
    aiPanelVisible, toggleAI,
    // Sidebar
    activeView, openView, sidebarVisible, toggleSidebar,
    // Palettes
    cmdPaletteOpen, setCmdPaletteOpen,
    editorCmdPaletteOpen, setEditorCmdPaletteOpen,
    // Cursor
    cursorPos, setCursorPos,
    // Status
    statusMessage, showMessage,
  };
}
