import { useState, useEffect, useRef, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';
import type { FileEntry, Tab, AppSettings } from './types';
import { DEFAULT_SETTINGS, settingsToEditorOptions } from './types';
import { getLanguageFromPath } from './utils/language';
import { applyTheme, getTerminalColors } from './themes';
import { disposeAllCompletionProviders } from './utils/completions';
import { clearDocumentVersions } from './services/lsp-monaco-bridge';
import { loader } from '@monaco-editor/react';
import * as api from './services/tauri';
import { useAutoSave } from './hooks/useAutoSave';
import { useKeyboard } from './hooks/useKeyboard';
import { useResize } from './hooks/useResize';
import TitleBar from './components/layout/TitleBar/TitleBar';
import ActivityBar from './components/layout/ActivityBar/ActivityBar';
import FileExplorer from './features/explorer/FileExplorer/FileExplorer';
import SearchPanel from './features/search/SearchPanel/SearchPanel';
import Contenedores from './features/cloud/Cloude/cloude';
import GitPanel from './features/git/GitPanel/GitPanel';
import DebugPanel from './features/debug/DebugPanel/DebugPanel';
import ExtensionsPanel from './features/extensions/ExtensionsPanel/ExtensionsPanel';
import TabBar from './features/editor/TabBar/TabBar';
import CodeEditor from './features/editor/CodeEditor/CodeEditor';
import StatusBar from './components/layout/StatusBar/StatusBar';
import SettingsPanel from './features/settings/SettingsPanel/SettingsPanel';
import TerminalPanel from './features/terminal/Terminal/TerminalPanel';
import type { TerminalPanelHandle } from './features/terminal/Terminal/TerminalPanel';
import AIPanel from './features/ai/AIPanel/AIPanel';
import CommandPalette from './components/ui/CommandPalette/CommandPalette';
import EditorCommandPalette from './features/editor/EditorCommandPalette/EditorCommandPalette';

let tabIdCounter = 0;
function newTabId() { return `tab-${++tabIdCounter}`; }

const SETTINGS_TAB_ID = '__settings__';

export default function App() {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [aiPanelVisible, setAiPanelVisible] = useState(true);
  const [activeView, setActiveView] = useState('files');
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [editorCmdPaletteOpen, setEditorCmdPaletteOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Re-layout Monaco cuando el panel de IA cambia
  useEffect(() => {
    setTimeout(() => editorRef.current?.layout(), 100);
  }, [aiPanelVisible, settings['workbench.aiPanelWidth']]);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const terminalPanelRef = useRef<TerminalPanelHandle>(null);
  const dirtySetRef = useRef(new Set<string>());

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;
  const sidebarWidth = settings['workbench.sidebarWidth'];
  const sidebarLeft = settings['workbench.sidebarPosition'] === 'left';
  const acrylicOn = settings['workbench.acrylic'];

  // ── Cargar settings desde disco al inicio ─────────────────────────────
  useEffect(() => {
    api.loadSettings()
      .then(json => {
        try {
          const parsed = JSON.parse(json);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch { /* usa defaults */ }
      })
      .catch(() => {/* usa defaults */ });

    // Restaurar último workspace abierto
    api.loadWorkspace()
      .then(path => { if (path) handleOpenFolder(path); })
      .catch(() => {});
  }, []);

  const themeId = settings['workbench.colorTheme'];

  // Aplicar CSS vars cuando cambia el tema
  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  // ── Mensaje temporal ──────────────────────────────────────────────────
  function showMessage(msg: string, ms = 2500) {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), ms);
  }

  // ── Árbol ─────────────────────────────────────────────────────────────
  const refreshTree = useCallback(async (path?: string) => {
    const target = path ?? rootPath;
    if (!target) return;
    const entries = await api.readDir(target);
    setTree(entries);
  }, [rootPath]);

  useEffect(() => { refreshTree(); }, [rootPath]);

  // ── Abrir carpeta ─────────────────────────────────────────────────────
  async function handleOpenFolder(path: string) {
    // Limpiar estado anterior (liberar memoria)
    setTabs([]);
    setActiveTabId(null);
    setTree([]);
    setSettingsOpen(false);
    setTerminalVisible(false);

    // Matar todas las terminales anteriores
    terminalPanelRef.current?.killAll();

    // Disponer modelos de Monaco del proyecto anterior (libera contenido de archivos en memoria)
    try {
      const monaco = await loader.init();
      monaco.editor.getModels().forEach(model => model.dispose());
    } catch { /* Monaco aún no inicializado, nada que limpiar */ }
    editorRef.current = null;

    // Limpiar providers de completado y LSP state
    disposeAllCompletionProviders();
    clearDocumentVersions();

    // Dar un tick para que React libere los componentes anteriores
    await new Promise(r => setTimeout(r, 10));

    // Cargar nueva carpeta
    setRootPath(path);
    const entries = await api.readDir(path);
    setTree(entries);
    // Persistir workspace
    api.saveWorkspace(path).catch(() => {});
  }

  // ── Abrir archivo ─────────────────────────────────────────────────────
  async function handleOpenFile(path: string) {
    const existing = tabs.find(t => t.path === path);
    if (existing) { setActiveTabId(existing.id); setSettingsOpen(false); return; }
    try {
      const content = await api.readFile(path);
      const name = path.split(/[\\/]/).pop() ?? path;
      const language = getLanguageFromPath(path);
      const tab: Tab = { id: newTabId(), path, name, content, language, isDirty: false };
      setTabs(prev => [...prev, tab]);
      setActiveTabId(tab.id);
      setSettingsOpen(false);
    } catch (e) { showMessage(`Error al abrir: ${e}`); }
  }

  // ── Nuevo archivo ─────────────────────────────────────────────────────
  function handleNewFile() {
    const tab: Tab = {
      id: newTabId(), path: '', name: 'sin-titulo',
      content: '', language: 'plaintext', isDirty: true,
    };
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
    setSettingsOpen(false);
  }

  // ── Guardar ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (settingsOpen) {
      try {
        await api.saveSettings(JSON.stringify(settings, null, 2));
        showMessage('Configuración guardada');
      } catch (e) { showMessage(`Error: ${e}`); }
      return;
    }
    if (!activeTab) return;

    const currentContent = editorRef.current?.getValue() ?? activeTab.content;

    if (!activeTab.path) {
      const name = prompt('Nombre del archivo:', activeTab.name);
      if (!name) return;
      const basePath = rootPath ? `${rootPath}/${name}` : name;
      await api.writeFile(basePath, currentContent);
      setTabs(prev => prev.map(t =>
        t.id === activeTab.id
          ? { ...t, path: basePath, name, content: currentContent, language: getLanguageFromPath(basePath), isDirty: false }
          : t
      ));
      showMessage(`Guardado: ${name}`);
      refreshTree();
      return;
    }

    if (settings['editor.formatOnSave'] && editorRef.current) {
      await editorRef.current.getAction('editor.action.formatDocument')?.run();
    }

    const finalContent = editorRef.current?.getValue() ?? currentContent;

    try {
      await api.writeFile(activeTab.path, finalContent);
      dirtySetRef.current.delete(activeTab.id);
      setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, content: finalContent, isDirty: false } : t));
      showMessage('Guardado');
    } catch (e) { showMessage(`Error al guardar: ${e}`); }
  }, [activeTab, rootPath, refreshTree, settings, settingsOpen]);

  // ── Auto-save ──────────────────────────────────────────────────────────
  const { cancelAutoSave } = useAutoSave({
    tabs, activeTabId, editorRef, dirtySetRef, setTabs
  });

  // ── Cerrar tab ────────────────────────────────────────────────────────
  function handleCloseTab(id: string) {
    const tab = tabs.find(t => t.id === id);
    if (tab?.isDirty && !confirm('Cambios sin guardar. ¿Cerrar?')) return;
    const idx = tabs.findIndex(t => t.id === id);
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      const next = newTabs[idx] ?? newTabs[idx - 1] ?? null;
      setActiveTabId(next?.id ?? null);
    }
    if (!newTabs.some(t => t.isDirty && t.path)) {
      cancelAutoSave();
    }
  }

  // ── Cambios del editor ────────────────────────────────────────────────
  function handleEditorChange(_value: string) {
    // No hacer setState aquí — evita re-render que causa que Monaco salte al fondo.
    // Marcamos dirty vía ref y sincronizamos con un debounce mínimo.
    if (activeTabId && !dirtySetRef.current.has(activeTabId)) {
      dirtySetRef.current.add(activeTabId);
      // Actualizar state una sola vez (la primera tecla del cambio)
      setTabs(prev => prev.map(t =>
        t.id === activeTabId ? (t.isDirty ? t : { ...t, isDirty: true }) : t
      ));
    }
  }

  function handleLanguageChange(lang: string) {
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, language: lang } : t
    ));
  }

  // ── Cursor ────────────────────────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const d = editor.onDidChangeCursorPosition(e => {
      setCursorPos({ line: e.position.lineNumber, column: e.position.column });
    });
    return () => d.dispose();
  }, [activeTabId, editorRef.current]);

  // ── Atajos globales ───────────────────────────────────────────────────
  useKeyboard({
    onSave: handleSave,
    onToggleSidebar: () => setSidebarVisible(v => !v),
    onCloseTab: () => { if (activeTabId) handleCloseTab(activeTabId); },
    onToggleSettings: () => setSettingsOpen(v => !v),
    onToggleTerminal: () => setTerminalVisible(v => !v),
    onToggleAI: () => setAiPanelVisible(v => !v),
    onCommandPalette: () => setCmdPaletteOpen(true),
  });

  // ── Resize handlers ────────────────────────────────────────────────────
  const onResizeStart = useResize(
    'x',
    () => sidebarWidth,
    (w) => setSettings(s => ({ ...s, 'workbench.sidebarWidth': w })),
    140, 500,
    !sidebarLeft
  );

  // ── Actions ───────────────────────────────────────────────────────────
  function handleUndo() { editorRef.current?.trigger('keyboard', 'undo', null); }
  function handleRedo() { editorRef.current?.trigger('keyboard', 'redo', null); }
  function handleFind() { editorRef.current?.getAction('actions.find')?.run(); }

  const onTerminalResizeStart = useResize(
    'y',
    () => terminalHeight,
    (h) => setTerminalHeight(h),
    100, 600,
    true
  );

  const onAiResizeStart = useResize(
    'x',
    () => settings['workbench.aiPanelWidth'],
    (w) => setSettings(s => ({ ...s, 'workbench.aiPanelWidth': w })),
    250, 600,
    settings['workbench.aiPanelPosition'] === 'right'
  );

  // ── Barra de tabs virtual (incluye settings) ──────────────────────────
  const allTabs = tabs;
  const displayActiveId = settingsOpen ? SETTINGS_TAB_ID : activeTabId;

  function handleSelectDisplayTab(id: string) {
    if (id === SETTINGS_TAB_ID) { setSettingsOpen(true); }
    else {
      // Guardar contenido actual del editor en el tab que se desactiva
      if (activeTabId && editorRef.current) {
        const currentContent = editorRef.current.getValue();
        setTabs(prev => prev.map(t =>
          t.id === activeTabId ? { ...t, content: currentContent } : t
        ));
      }
      setActiveTabId(id);
      setSettingsOpen(false);
    }
  }

  function handleCloseDisplayTab(id: string) {
    if (id === SETTINGS_TAB_ID) { setSettingsOpen(false); }
    else { handleCloseTab(id); }
  }

  return (
    <div className={`app${acrylicOn ? ' acrylic-on' : ''}`}>
      {/* TitleBar arriba de todo, full width */}
      {!settings['workbench.nativeFrame'] && (
        <TitleBar
          onOpenFolder={handleOpenFolder}
          onOpenFile={handleOpenFile}
          onSave={handleSave}
          onNewFile={handleNewFile}
          canSave={!!activeTab || settingsOpen}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onFind={handleFind}
          onOpenSettings={() => setSettingsOpen(v => !v)}
          onToggleTerminal={() => setTerminalVisible(v => !v)}
          onToggleAI={() => setAiPanelVisible(v => !v)}
          trafficLightPosition={settings['workbench.trafficLightPosition']}
          onOpenCommandPalette={() => setEditorCmdPaletteOpen(true)}
        />
      )}

      <div className="app-body">
        {/* Activity Bar vertical */}
        <ActivityBar
          activeView={activeView}
          onViewChange={(v) => { setActiveView(v); setSidebarVisible(true); }}
          onOpenSettings={() => setSettingsOpen(v => !v)}
        />

        {/* AI Panel izquierda */}
        {settings['workbench.aiPanelPosition'] === 'left' && (
          <AIPanel
            key={`ai-left-${rootPath ?? ''}`}
            visible={aiPanelVisible}
            onToggle={() => setAiPanelVisible(v => !v)}
            width={settings['workbench.aiPanelWidth']}
            onResizeStart={onAiResizeStart}
            activeFilePath={activeTab?.path ?? null}
            acrylic={acrylicOn}
          />
        )}
        {settings['workbench.aiPanelPosition'] === 'left' && aiPanelVisible && (
          <div className="ai-resize-handle" onMouseDown={onAiResizeStart} />
        )}

        {/* Sidebar ocupa toda la altura */}
        {sidebarLeft && sidebarVisible && (
          <>
            <div
              className={`sidebar${acrylicOn ? ' acrylic' : ''}`}
              style={{ width: sidebarWidth }}
            >
              {activeView === 'files' && (
                <FileExplorer
                  rootPath={rootPath}
                  tree={tree}
                  onFileSelect={handleOpenFile}
                  onTreeChange={() => refreshTree()}
                  activeFilePath={activeTab?.path ?? null}
                  iconTheme={settings['workbench.iconTheme']}
                />
              )}
              {activeView === 'extensions' && <ExtensionsPanel />}
              {activeView === 'search' && <SearchPanel />}
              {activeView === 'git' && <GitPanel />}
              {activeView === 'debug' && (
                <DebugPanel
                  cwd={rootPath}
                  onRunProject={(command) => {
                    setTerminalVisible(true);
                    api.writeTerminal(0, command + '\n').catch(() => { });
                  }}
                />
              )}
             
              {/* {activeView === 'containers' && (
                // <div className="sidebar-placeholder">
                //   <span className="sidebar-placeholder-text">Contenedores</span>
                // </div>
              )} */}
            </div>
            <div className="resize-handle" onMouseDown={onResizeStart} />
          </>
        )}

        {/* Columna principal: tabs + editor */}
        <div className="main-column">
          <div className="editor-area">
            <TabBar
              tabs={allTabs}
              activeTabId={displayActiveId}
              onSelectTab={handleSelectDisplayTab}
              onCloseTab={handleCloseDisplayTab}
              settingsOpen={settingsOpen}
              onOpenSettings={() => setSettingsOpen(v => !v)}
            />
            <div className="editor-container">
              {settingsOpen ? (
                <SettingsPanel
                  settings={settings}
                  onSettingsChange={setSettings}
                  theme={themeId}
                />
              ) : (
                <CodeEditor
                  tab={activeTab}
                  settings={settingsToEditorOptions(settings)}
                  themeId={themeId}
                  onChange={handleEditorChange}
                  onLanguageChange={handleLanguageChange}
                  editorRef={editorRef}
                  rootPath={rootPath}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar a la derecha */}
        {!sidebarLeft && sidebarVisible && (
          <>
            <div className="resize-handle" onMouseDown={onResizeStart} />
            <div
              className={`sidebar${acrylicOn ? ' acrylic' : ''}`}
              style={{ width: sidebarWidth }}
            >
              {activeView === 'files' && (
                <FileExplorer
                  rootPath={rootPath}
                  tree={tree}
                  onFileSelect={handleOpenFile}
                  onTreeChange={() => refreshTree()}
                  activeFilePath={activeTab?.path ?? null}
                  iconTheme={settings['workbench.iconTheme']}
                />
              )}
              {activeView === 'search' && <SearchPanel />}
              {activeView === 'git' && <GitPanel />}
              {activeView === 'debug' && (
                <DebugPanel
                  cwd={rootPath}
                  onRunProject={(command) => {
                    setTerminalVisible(true);
                    api.writeTerminal(0, command + '\n').catch(() => { });
                  }}
                />
              )}
              {activeView === 'extensions' && <ExtensionsPanel />}
              {activeView === 'containers' && <Contenedores />}
            </div>
          </>
        )}

        {/* AI Panel derecha */}
        {settings['workbench.aiPanelPosition'] === 'right' && aiPanelVisible && (
          <div className="ai-resize-handle" onMouseDown={onAiResizeStart} />
        )}
        {settings['workbench.aiPanelPosition'] === 'right' && (
          <AIPanel
            key={`ai-right-${rootPath ?? ''}`}
            visible={aiPanelVisible}
            onToggle={() => setAiPanelVisible(v => !v)}
            width={settings['workbench.aiPanelWidth']}
            onResizeStart={onAiResizeStart}
            activeFilePath={activeTab?.path ?? null}
            acrylic={acrylicOn}
          />
        )}
      </div>

      <TerminalPanel
        ref={terminalPanelRef}
        visible={terminalVisible}
        onToggle={() => setTerminalVisible(v => !v)}
        cwd={rootPath}
        fontSize={settings['editor.fontSize'] - 1}
        fontFamily={settings['editor.fontFamily']}
        panelHeight={terminalHeight}
        onResizeStart={onTerminalResizeStart}
        colors={getTerminalColors(themeId)}
      />

      <StatusBar
        activeTab={activeTab}
        cursorPos={cursorPos}
        isDirty={activeTab?.isDirty ?? false}
        message={statusMessage}
      />

      <CommandPalette
        visible={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        currentTheme={themeId}
        onThemeChange={(id) => setSettings(s => ({ ...s, 'workbench.colorTheme': id }))}
      />

      <EditorCommandPalette
        visible={editorCmdPaletteOpen}
        onClose={() => setEditorCmdPaletteOpen(false)}
        editorRef={editorRef}
      />
    </div>
  );
}
