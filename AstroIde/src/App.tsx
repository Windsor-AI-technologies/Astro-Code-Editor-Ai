import { useRef, useEffect, useMemo } from 'react';
import type * as Monaco from 'monaco-editor';
import type { TerminalPanelHandle } from './features/terminal/Terminal/TerminalPanel';

import { useWorkspace } from './hooks/useWorkspace';
import { useTabs } from './hooks/useTabs';
import { useSettings } from './hooks/useSettings';
import { useUIState } from './hooks/useUIState';
import { useSave } from './hooks/useSave';
import { useEditorActions } from './hooks/useEditorActions';
import { useAutoSave } from './hooks/useAutoSave';
import { useKeyboard } from './hooks/useKeyboard';
import { useResize } from './hooks/useResize';
import { useDebugger } from './hooks/useDebugger';

import { WorkspaceContext } from './contexts/WorkspaceContext';
import { TabsContext } from './contexts/TabsContext';
import { SettingsContext } from './contexts/SettingsContext';
import { UIContext } from './contexts/UIContext';
import { ActionsContext } from './contexts/ActionsContext';
import { DebugContext } from './contexts/DebugContext';

import AppLayout from './AppLayout';

const SETTINGS_TAB_ID = '__settings__';

export default function App() {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const terminalPanelRef = useRef<TerminalPanelHandle>(null);

  // ── Stores ──────────────────────────────────────────────────────────────
  const settingsStore = useSettings();
  const workspace = useWorkspace();
  const tabs = useTabs(editorRef);
  const ui = useUIState();
  const debugger_ = useDebugger();

  const { save } = useSave({
    activeTab: tabs.activeTab, rootPath: workspace.rootPath,
    settings: settingsStore.settings, settingsOpen: settingsStore.settingsOpen,
    editorRef, saveSettings: settingsStore.saveSettings,
    markSaved: tabs.markSaved, refreshTree: workspace.refreshTree, showMessage: ui.showMessage,
  });

  const editorActions = useEditorActions({ editorRef, activeTabId: tabs.activeTabId, onCursorChange: ui.setCursorPos });
  const { cancelAutoSave } = useAutoSave({ tabs: tabs.tabs, activeTabId: tabs.activeTabId, editorRef, dirtySetRef: tabs.dirtySetRef, setTabs: tabs.setTabs });

  // ── Glue (coordination between stores) ──────────────────────────────────
  async function handleOpenFolder(path: string) {
    await workspace.openFolder(path, () => {
      tabs.clearAll(); ui.setTerminalVisible(false);
      settingsStore.setSettingsOpen(false);
      terminalPanelRef.current?.killAll(); editorRef.current = null;
    });
  }

  async function handleOpenFile(path: string) {
    const ok = await tabs.openFile(path);
    if (ok) settingsStore.setSettingsOpen(false);
    else ui.showMessage('Error al abrir archivo');
  }

  function handleToggleSettings() { tabs.persistCurrentContent(); settingsStore.setSettingsOpen(v => !v); }

  function handleSelectTab(id: string) {
    tabs.persistCurrentContent();
    if (id === SETTINGS_TAB_ID) settingsStore.setSettingsOpen(true);
    else { tabs.switchTab(id); settingsStore.setSettingsOpen(false); }
  }

  function handleCloseTab(id: string) {
    if (id === SETTINGS_TAB_ID) { settingsStore.setSettingsOpen(false); return; }
    const closed = tabs.closeTab(id);
    if (closed && !tabs.tabs.some(t => t.isDirty && t.path)) cancelAutoSave();
  }

  // ── Keyboard & Resize ───────────────────────────────────────────────────
  useKeyboard({ onSave: save, onToggleSidebar: ui.toggleSidebar, onCloseTab: () => { if (tabs.activeTabId) handleCloseTab(tabs.activeTabId); }, onToggleSettings: handleToggleSettings, onToggleTerminal: ui.toggleTerminal, onToggleAI: ui.toggleAI, onCommandPalette: () => ui.setCmdPaletteOpen(true) });

  const sidebarLeft = settingsStore.settings['workbench.sidebarPosition'] === 'left';
  const onSidebarResize = useResize('x', () => settingsStore.settings['workbench.sidebarWidth'], (w) => settingsStore.updateSetting('workbench.sidebarWidth', w), 140, 500, !sidebarLeft);
  const onTerminalResize = useResize('y', () => ui.terminalHeight, ui.setTerminalHeight, 100, 600, true);
  const onAiResize = useResize('x', () => settingsStore.settings['workbench.aiPanelWidth'], (w) => settingsStore.updateSetting('workbench.aiPanelWidth', w), 250, 600, settingsStore.settings['workbench.aiPanelPosition'] === 'right');

  // ── Init & Effects ──────────────────────────────────────────────────────
  useEffect(() => { workspace.restoreWorkspace(handleOpenFolder); }, []);
  useEffect(() => { setTimeout(() => editorRef.current?.layout(), 100); }, [ui.aiPanelVisible, settingsStore.settings['workbench.aiPanelWidth']]);

  // ── Context Values (memoized to prevent unnecessary re-renders) ─────────
  const workspaceCtx = useMemo(() => ({
    rootPath: workspace.rootPath, tree: workspace.tree,
    refreshTree: workspace.refreshTree, openFolder: handleOpenFolder, openFile: handleOpenFile,
  }), [workspace.rootPath, workspace.tree]);

  const tabsCtx = useMemo(() => ({
    tabs: tabs.tabs, activeTabId: tabs.activeTabId, activeTab: tabs.activeTab,
    displayActiveId: settingsStore.settingsOpen ? SETTINGS_TAB_ID : tabs.activeTabId,
    editorRef, selectTab: handleSelectTab, closeTab: handleCloseTab,
    newFile: tabs.newFile, markDirty: tabs.markDirty, changeLanguage: tabs.changeLanguage,
  }), [tabs.tabs, tabs.activeTabId, settingsStore.settingsOpen]);

  const settingsCtx = useMemo(() => ({
    settings: settingsStore.settings, setSettings: settingsStore.setSettings,
    settingsOpen: settingsStore.settingsOpen, toggleSettings: handleToggleSettings,
    themeId: settingsStore.themeId, updateSetting: settingsStore.updateSetting,
  }), [settingsStore.settings, settingsStore.settingsOpen]);

  const uiCtx = useMemo(() => ({
    terminalVisible: ui.terminalVisible, terminalHeight: ui.terminalHeight,
    setTerminalHeight: ui.setTerminalHeight, toggleTerminal: ui.toggleTerminal,
    setTerminalVisible: ui.setTerminalVisible,
    aiPanelVisible: ui.aiPanelVisible, toggleAI: ui.toggleAI,
    activeView: ui.activeView, sidebarVisible: ui.sidebarVisible,
    toggleSidebar: ui.toggleSidebar, openView: ui.openView,
    cmdPaletteOpen: ui.cmdPaletteOpen, setCmdPaletteOpen: ui.setCmdPaletteOpen,
    editorCmdPaletteOpen: ui.editorCmdPaletteOpen, setEditorCmdPaletteOpen: ui.setEditorCmdPaletteOpen,
    cursorPos: ui.cursorPos, statusMessage: ui.statusMessage, showMessage: ui.showMessage,
  }), [ui.terminalVisible, ui.terminalHeight, ui.aiPanelVisible, ui.activeView, ui.sidebarVisible, ui.cmdPaletteOpen, ui.editorCmdPaletteOpen, ui.cursorPos, ui.statusMessage]);

  const actionsCtx = useMemo(() => ({
    save, canSave: !!tabs.activeTab || settingsStore.settingsOpen,
    undo: editorActions.undo, redo: editorActions.redo, find: editorActions.find,
    onSidebarResize, onTerminalResize, onAiResize, terminalPanelRef,
  }), [save, tabs.activeTab, settingsStore.settingsOpen]);

  const debugCtx = useMemo(() => ({
    state: debugger_.state, breakpoints: debugger_.breakpoints,
    callFrames: debugger_.callFrames, variables: debugger_.variables,
    pausedFile: debugger_.pausedFile, pausedLine: debugger_.pausedLine,
    output: debugger_.output, error: debugger_.error,
    start: debugger_.start, stop: debugger_.stop,
    resume: debugger_.resume, stepOver: debugger_.stepOver,
    stepInto: debugger_.stepInto, stepOut: debugger_.stepOut,
    pause: debugger_.pause, toggleBreakpoint: debugger_.toggleBreakpoint,
    evaluate: debugger_.evaluate,
  }), [debugger_.state, debugger_.breakpoints, debugger_.callFrames, debugger_.variables, debugger_.pausedFile, debugger_.pausedLine, debugger_.output, debugger_.error]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <WorkspaceContext.Provider value={workspaceCtx}>
      <TabsContext.Provider value={tabsCtx}>
        <SettingsContext.Provider value={settingsCtx}>
          <UIContext.Provider value={uiCtx}>
            <ActionsContext.Provider value={actionsCtx}>
              <DebugContext.Provider value={debugCtx}>
                <AppLayout />
              </DebugContext.Provider>
            </ActionsContext.Provider>
          </UIContext.Provider>
        </SettingsContext.Provider>
      </TabsContext.Provider>
    </WorkspaceContext.Provider>
  );
}
