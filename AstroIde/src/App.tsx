/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import type * as Monaco from "monaco-editor";
import type { TerminalPanelHandle } from "./features/terminal/Terminal/TerminalPanel";

import { useWorkspace } from "./hooks/workspace/useWorkspace";
import { useTabs } from "./hooks/editor/useTabs";
import { useSettings } from "./hooks/settings/useSettings";
import { useUIState } from "./hooks/ui/useUIState";
import { useSave } from "./hooks/ai/useSave";
import { useEditorActions } from "./hooks/editor/useEditorActions";
import { useAutoSave } from "./hooks/editor/useAutoSave";
import { useKeyboard } from "./hooks/ui/useKeyboard";
import { useResize } from "./hooks/ui/useResize";
import { useDebugger } from "./hooks/debug/useDebugger";
import { useRunner } from "./hooks/run/useRunner";
import { useExtensions } from "./hooks/extensions/useExtensions";
import { registerCoreActions } from "./services/core/coreActions";
import { registerDotnetActions } from "./services/core/dotnetActions";
import { openFolderDialog } from "./services/tauri";
import { connectNotificationHandler, connectIslandHandler } from "./services/core/astro";
import { WorkspaceContext } from "./contexts/WorkspaceContext";
import { TabsContext } from "./contexts/TabsContext";
import { SettingsContext } from "./contexts/SettingsContext";
import { UIContext } from "./contexts/UIContext";
import { ActionsContext } from "./contexts/ActionsContext";
import { DebugContext } from "./contexts/DebugContext";
import { ExtensionsContext } from "./contexts/ExtensionsContext";

import AppLayout from "./AppLayout";
import WelcomeAuth from "./features/auth/WelcomeAuth";

const SETTINGS_TAB_ID = "__settings__";

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem("astro-auth-skip") === "true";
  });
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const terminalPanelRef = useRef<TerminalPanelHandle>(null);

  // ── Stores ──────────────────────────────────────────────────────────────
  const settingsStore = useSettings();
  const workspace = useWorkspace();
  const tabs = useTabs(editorRef);
  const ui = useUIState();
  const debugger_ = useDebugger();
  const runnerState = useRunner();
  const extensions = useExtensions();

  const { save } = useSave({
    activeTab: tabs.activeTab,
    rootPath: workspace.rootPath,
    settings: settingsStore.settings,
    settingsOpen: settingsStore.settingsOpen,
    editorRef,
    saveSettings: settingsStore.saveSettings,
    markSaved: tabs.markSaved,
    refreshTree: workspace.refreshTree,
    showMessage: ui.showMessage,
  });

  const editorActions = useEditorActions({
    editorRef,
    activeTabId: tabs.activeTabId,
    onCursorChange: ui.setCursorPos,
  });
  const { cancelAutoSave } = useAutoSave({
    tabs: tabs.tabs,
    activeTabId: tabs.activeTabId,
    editorRef,
    dirtySetRef: tabs.dirtySetRef,
    setTabs: tabs.setTabs,
  });

  // ── Glue (coordination between stores) ──────────────────────────────────
  async function handleOpenFolder(path: string) {
    await workspace.openFolder(path, () => {
      tabs.clearAll();
      ui.setTerminalVisible(false);
      settingsStore.setSettingsOpen(false);
      terminalPanelRef.current?.killAll();
      editorRef.current = null;
    });
  }

  // ── Ejecutar / Depurar (F5, Ctrl+F5, Shift+F5) ──────────────────────────
  const activeFilePath = tabs.activeTab?.path ?? null;
  const activeFileContent = tabs.activeTab?.content ?? undefined;

  const handleStartDebug = useCallback(async () => {
    if (!activeFilePath) {
      ui.showNotification("Abre un archivo JavaScript para depurar");
      return;
    }
    const ext = activeFilePath.split(".").pop()?.toLowerCase();
    if (ext !== "js" && ext !== "mjs" && ext !== "cjs" && ext !== "ts") {
      ui.showNotification("La depuración paso a paso está disponible para JS/TS");
      return;
    }
    ui.openView("debug");
    await debugger_.start(activeFilePath, workspace.rootPath ?? "");
  }, [activeFilePath, workspace.rootPath]);

  const handleRunActiveFile = useCallback(async () => {
    if (!activeFilePath) {
      ui.showNotification("Abre un archivo para ejecutar");
      return;
    }
    ui.openView("debug");
    await runnerState.run(activeFilePath, workspace.rootPath ?? "", activeFileContent);
  }, [activeFilePath, workspace.rootPath, activeFileContent]);

  const handleStopExecution = useCallback(async () => {
    if (debugger_.state !== "idle") {
      await debugger_.stop();
    } else if (runnerState.running) {
      await runnerState.stop();
    }
  }, [debugger_.state, runnerState.running]);

  async function handleOpenFile(path: string) {
    const ok = await tabs.openFile(path);
    if (ok) settingsStore.setSettingsOpen(false);
    else ui.showMessage("Error al abrir archivo");
  }

  function handleToggleSettings() {
    tabs.persistCurrentContent();
    settingsStore.setSettingsOpen((v) => !v);
  }

  function handleSelectTab(id: string) {
    tabs.persistCurrentContent();
    if (id === SETTINGS_TAB_ID) settingsStore.setSettingsOpen(true);
    else {
      tabs.switchTab(id);
      settingsStore.setSettingsOpen(false);
    }
  }

  function handleCloseTab(id: string) {
    if (id === SETTINGS_TAB_ID) {
      settingsStore.setSettingsOpen(false);
      return;
    }
    const closed = tabs.closeTab(id);
    if (closed && !tabs.tabs.some((t) => t.isDirty && t.path)) cancelAutoSave();
  }

  // ── Keyboard & Resize ───────────────────────────────────────────────────
  useKeyboard({
    onSave: save,
    onToggleSidebar: ui.toggleSidebar,
    onCloseTab: () => {
      if (tabs.activeTabId) handleCloseTab(tabs.activeTabId);
    },
    onToggleSettings: handleToggleSettings,
    onToggleTerminal: ui.toggleTerminal,
    onToggleAI: ui.toggleAI,
    onCommandPalette: () => ui.setEditorCmdPaletteOpen(true),
    onDebug: () => {
      if (debugger_.state === "paused") debugger_.resume();
      else if (debugger_.state === "idle") handleStartDebug();
    },
    onRun: handleRunActiveFile,
    onStopExecution: handleStopExecution,
  });

  const sidebarLeft =
    settingsStore.settings["workbench.sidebarPosition"] === "left";
  const onSidebarResize = useResize(
    "x",
    () => settingsStore.settings["workbench.sidebarWidth"],
    (w) => settingsStore.updateSetting("workbench.sidebarWidth", w),
    140,
    500,
    !sidebarLeft,
  );
  const onTerminalResize = useResize(
    "y",
    () => ui.terminalHeight,
    ui.setTerminalHeight,
    100,
    600,
    true,
  );
  const onAiResize = useResize(
    "x",
    () => settingsStore.settings["workbench.aiPanelWidth"],
    (w) => settingsStore.updateSetting("workbench.aiPanelWidth", w),
    250,
    950,
    settingsStore.settings["workbench.aiPanelPosition"] === "right",
  );

  // ── Init & Effects ──────────────────────────────────────────────────────
  useEffect(() => {
    workspace.restoreWorkspace(handleOpenFolder);
  }, []);
  useEffect(() => {
    setTimeout(() => editorRef.current?.layout(), 100);
  }, [ui.aiPanelVisible, settingsStore.settings["workbench.aiPanelWidth"]]);

  // ── Register core actions ───────────────────────────────────────────────
  useEffect(() => {
    connectNotificationHandler(ui.showNotification);
    connectIslandHandler(ui.showIsland);
    const unregister = registerCoreActions({
      save,
      newFile: tabs.newFile,
      closeTab: () => {
        if (tabs.activeTabId) handleCloseTab(tabs.activeTabId);
      },
      toggleSidebar: ui.toggleSidebar,
      toggleTerminal: ui.toggleTerminal,
      toggleAI: ui.toggleAI,
      toggleSettings: handleToggleSettings,
      openCommandPalette: () => ui.setEditorCmdPaletteOpen(true),
      openFolder: async () => {
        const path = await openFolderDialog();
        if (path) await handleOpenFolder(path);
      },
      undo: editorActions.undo,
      redo: editorActions.redo,
      find: editorActions.find,
      formatDocument: () =>
        editorRef.current?.getAction("editor.action.formatDocument")?.run(),
      showNotification: ui.showNotification,
      runFile: handleRunActiveFile,
      debugFile: handleStartDebug,
      stopExecution: handleStopExecution,
    });
    const unregisterDotnet = registerDotnetActions({
      showNotification: ui.showNotification,
      getRootPath: () => workspace.rootPath,
      refreshTree: workspace.refreshTree,
      openFolder: handleOpenFolder,
      openOutput: () => ui.openView("debug"),
      openToolchains: () => ui.openView("toolchains"),
    });
    return () => {
      unregister();
      unregisterDotnet();
    };
  }, [save, tabs.activeTabId, handleRunActiveFile, handleStartDebug, handleStopExecution]);

  // ── Context Values (memoized to prevent unnecessary re-renders) ─────────
  const workspaceCtx = useMemo(
    () => ({
      rootPath: workspace.rootPath,
      tree: workspace.tree,
      refreshTree: workspace.refreshTree,
      openFolder: handleOpenFolder,
      openFile: handleOpenFile,
    }),
    [workspace.rootPath, workspace.tree],
  );

  const tabsCtx = useMemo(
    () => ({
      tabs: tabs.tabs,
      activeTabId: tabs.activeTabId,
      activeTab: tabs.activeTab,
      displayActiveId: settingsStore.settingsOpen
        ? SETTINGS_TAB_ID
        : tabs.activeTabId,
      editorRef,
      selectTab: handleSelectTab,
      closeTab: handleCloseTab,
      newFile: tabs.newFile,
      markDirty: tabs.markDirty,
      changeLanguage: tabs.changeLanguage,
      diffPreview: tabs.diffPreview,
      setDiffPreview: tabs.setDiffPreview,
    }),
    [tabs.tabs, tabs.activeTabId, settingsStore.settingsOpen],
  );

  const settingsCtx = useMemo(
    () => ({
      settings: settingsStore.settings,
      setSettings: settingsStore.setSettings,
      settingsOpen: settingsStore.settingsOpen,
      toggleSettings: handleToggleSettings,
      themeId: settingsStore.themeId,
      updateSetting: settingsStore.updateSetting,
    }),
    [settingsStore.settings, settingsStore.settingsOpen],
  );

  const uiCtx = useMemo(
    () => ({
      terminalVisible: ui.terminalVisible,
      terminalHeight: ui.terminalHeight,
      setTerminalHeight: ui.setTerminalHeight,
      toggleTerminal: ui.toggleTerminal,
      setTerminalVisible: ui.setTerminalVisible,
      aiPanelVisible: ui.aiPanelVisible,
      toggleAI: ui.toggleAI,
      activeView: ui.activeView,
      sidebarVisible: ui.sidebarVisible,
      toggleSidebar: ui.toggleSidebar,
      openView: ui.openView,
      cmdPaletteOpen: ui.cmdPaletteOpen,
      setCmdPaletteOpen: ui.setCmdPaletteOpen,
      editorCmdPaletteOpen: ui.editorCmdPaletteOpen,
      setEditorCmdPaletteOpen: ui.setEditorCmdPaletteOpen,
      cursorPos: ui.cursorPos,
      statusMessage: ui.statusMessage,
      showMessage: ui.showMessage,
      notification: ui.notification,
      showNotification: ui.showNotification,
      island: ui.island,
      showIsland: ui.showIsland,
    }),
    [
      ui.terminalVisible,
      ui.terminalHeight,
      ui.aiPanelVisible,
      ui.activeView,
      ui.sidebarVisible,
      ui.cmdPaletteOpen,
      ui.editorCmdPaletteOpen,
      ui.cursorPos,
      ui.statusMessage,
      ui.notification,
      ui.showNotification,
      ui.island,
      ui.showIsland,
    ],
  );

  const actionsCtx = useMemo(
    () => ({
      save,
      canSave: !!tabs.activeTab || settingsStore.settingsOpen,
      undo: editorActions.undo,
      redo: editorActions.redo,
      find: editorActions.find,
      onSidebarResize,
      onTerminalResize,
      onAiResize,
      terminalPanelRef,
    }),
    [save, tabs.activeTab, settingsStore.settingsOpen],
  );

  const debugCtx = useMemo(
    () => ({
      state: debugger_.state,
      breakpoints: debugger_.breakpoints,
      callFrames: debugger_.callFrames,
      variables: debugger_.variables,
      pausedFile: debugger_.pausedFile,
      pausedLine: debugger_.pausedLine,
      output: debugger_.output,
      error: debugger_.error,
      start: debugger_.start,
      stop: debugger_.stop,
      resume: debugger_.resume,
      stepOver: debugger_.stepOver,
      stepInto: debugger_.stepInto,
      stepOut: debugger_.stepOut,
      pause: debugger_.pause,
      toggleBreakpoint: debugger_.toggleBreakpoint,
      evaluate: debugger_.evaluate,
      clearOutput: debugger_.clearOutput,
      runState: runnerState.running ? ("running" as const) : ("idle" as const),
      runOutput: runnerState.output,
      runError: runnerState.error,
      runInputAvailable: runnerState.inputAvailable,
      run: runnerState.run,
      stopRun: runnerState.stop,
      clearRunOutput: runnerState.clearOutput,
      sendRunInput: runnerState.sendInput,
    }),
    [
      debugger_.state,
      debugger_.breakpoints,
      debugger_.callFrames,
      debugger_.variables,
      debugger_.pausedFile,
      debugger_.pausedLine,
      debugger_.output,
      debugger_.error,
      runnerState.running,
      runnerState.output,
      runnerState.error,
      runnerState.inputAvailable,
    ],
  );


  // ── Render ──────────────────────────────────────────────────────────────
  if (!authenticated) {
    return <WelcomeAuth onComplete={() => { setAuthenticated(true); localStorage.setItem("astro-auth-skip", "true"); }} />;
  }

  return (
    <WorkspaceContext.Provider value={workspaceCtx}>
      <TabsContext.Provider value={tabsCtx}>
        <SettingsContext.Provider value={settingsCtx}>
          <UIContext.Provider value={uiCtx}>
            <ActionsContext.Provider value={actionsCtx}>
              <DebugContext.Provider value={debugCtx}>
                <ExtensionsContext.Provider value={extensions}>
                  <AppLayout />
                </ExtensionsContext.Provider>
              </DebugContext.Provider>
            </ActionsContext.Provider>
          </UIContext.Provider>
        </SettingsContext.Provider>
      </TabsContext.Provider>
    </WorkspaceContext.Provider>
  );
}
