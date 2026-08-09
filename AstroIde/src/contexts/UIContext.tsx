import { createContext, useContext } from 'react';

export interface UIContextValue {
  // Terminal
  terminalVisible: boolean;
  terminalHeight: number;
  setTerminalHeight: (h: number) => void;
  toggleTerminal: () => void;
  setTerminalVisible: (v: boolean) => void;
  // AI
  aiPanelVisible: boolean;
  toggleAI: () => void;
  // Sidebar
  activeView: string;
  sidebarVisible: boolean;
  toggleSidebar: () => void;
  openView: (view: string) => void;
  // Palettes
  cmdPaletteOpen: boolean;
  setCmdPaletteOpen: (v: boolean) => void;
  editorCmdPaletteOpen: boolean;
  setEditorCmdPaletteOpen: (v: boolean) => void;
  // Cursor & Status
  cursorPos: { line: number; column: number };
  statusMessage: string | null;
  showMessage: (msg: string) => void;
  // Notifications
  notification: string | null;
  showNotification: (msg: string, ms?: number) => void;
}

export const UIContext = createContext<UIContextValue>(null!);
export const useUICtx = () => useContext(UIContext);
