import { createContext, useContext } from 'react';
import type * as Monaco from 'monaco-editor';
import type { Tab } from '../types';

export interface TabsContextValue {
  tabs: Tab[];
  activeTabId: string | null;
  activeTab: Tab | null;
  displayActiveId: string | null;
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  selectTab: (id: string) => void;
  closeTab: (id: string) => void;
  newFile: () => void;
  markDirty: () => void;
  changeLanguage: (lang: string) => void;
}

export const TabsContext = createContext<TabsContextValue>(null!);
export const useTabsCtx = () => useContext(TabsContext);
