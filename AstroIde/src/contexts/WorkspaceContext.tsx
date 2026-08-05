import { createContext, useContext } from 'react';

export interface WorkspaceContextValue {
  rootPath: string | null;
  tree: import('../types').FileEntry[];
  refreshTree: () => void;
  openFolder: (path: string) => void;
  openFile: (path: string) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>(null!);
export const useWorkspaceCtx = () => useContext(WorkspaceContext);
