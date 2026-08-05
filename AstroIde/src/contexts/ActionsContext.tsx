import { createContext, useContext } from 'react';

export interface ActionsContextValue {
  save: () => void;
  canSave: boolean;
  undo: () => void;
  redo: () => void;
  find: () => void;
  // Resize handlers
  onSidebarResize: (e: React.MouseEvent) => void;
  onTerminalResize: (e: React.MouseEvent) => void;
  onAiResize: (e: React.MouseEvent) => void;
  // Terminal ref
  terminalPanelRef: React.RefObject<import('../features/terminal/Terminal/TerminalPanel').TerminalPanelHandle | null>;
}

export const ActionsContext = createContext<ActionsContextValue>(null!);
export const useActionsCtx = () => useContext(ActionsContext);
