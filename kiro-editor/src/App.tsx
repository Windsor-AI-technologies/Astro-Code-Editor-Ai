import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type * as Monaco from 'monaco-editor';
import type { FileEntry, Tab, AppSettings } from './types';
import { DEFAULT_SETTINGS, settingsToEditorOptions } from './types';
import { getLanguageFromPath } from './utils/language';
import { applyTheme, getTerminalColors } from './themes';
import TitleBar from './components/TitleBar/TitleBar';
import ActivityBar from './components/ActivityBar/ActivityBar';
import FileExplorer from './components/FileExplorer/FileExplorer';
import SearchPanel from './components/SearchPanel/SearchPanel';
import GitPanel from './components/GitPanel/GitPanel';
import DebugPanel from './components/DebugPanel/DebugPanel';
import ExtensionsPanel from './components/ExtensionsPanel/ExtensionsPanel';
import TabBar from './components/TabBar/TabBar';
import CodeEditor from './components/CodeEditor/CodeEditor';
import StatusBar from './components/StatusBar/StatusBar';
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import TerminalPanel from './components/Terminal/TerminalPanel';
import AIPanel from './components/AIPanel/AIPanel';
import CommandPalette from './components/CommandPalette/CommandPalette';
import EditorCommandPalette from './components/EditorCommandPalette/EditorCommandPalette';

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
  const ctrlKRef = useRef(false);

  // Re-layout Monaco cuando el panel de IA cambia
  useEffect(() => {
    setTimeout(() => editorRef.current?.layout(), 100);
  }, [aiPanelVisible, settings['workbench.aiPanelWidth']]);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const resizingRef = useRef(false);
  const termResizingRef = useRef(false);
  const aiResizingRef = useRef(false);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;
  const sidebarWidth = settings['workbench.sidebarWidth'];
  const sidebarLeft = settings['workbench.sidebarPosition'] === 'left';
  const acrylicOn = settings['workbench.acrylic'];

  // ── Cargar settings desde disco al inicio ─────────────────────────────
  useEffect(() => {
    invoke<string>('load_settings')
      .then(json => {
        try {
          const parsed = JSON.parse(json);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch { /* usa defaults */ }
      })
      .catch(() => {/* usa defaults */ });

    // Restaurar último workspace abierto
    invoke<string>('load_workspace')
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
    const entries = await invoke<FileEntry[]>('read_dir', { path: target });
    setTree(entries);
  }, [rootPath]);

  useEffect(() => { refreshTree(); }, [rootPath]);

  // ── Abrir carpeta ─────────────────────────────────────────────────────
  async function handleOpenFolder(path: string) {
    setRootPath(path);
    setTree([]);
    const entries = await invoke<FileEntry[]>('read_dir', { path });
    setTree(entries);
    // Persistir workspace
    invoke('save_workspace', { path }).catch(() => {});
  }

  // ── Abrir archivo ─────────────────────────────────────────────────────
  async function handleOpenFile(path: string) {
    const existing = tabs.find(t => t.path === path);
    if (existing) { setActiveTabId(existing.id); setSettingsOpen(false); return; }
    try {
      const content = await invoke<string>('read_file', { path });
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
        await invoke('save_settings', { json: JSON.stringify(settings, null, 2) });
        showMessage('Configuración guardada');
      } catch (e) { showMessage(`Error: ${e}`); }
      return;
    }
    if (!activeTab) return;

    // Obtener contenido actual directamente del editor (más confiable que el state)
    const currentContent = editorRef.current?.getValue() ?? activeTab.content;

    if (!activeTab.path) {
      const name = prompt('Nombre del archivo:', activeTab.name);
      if (!name) return;
      const basePath = rootPath ? `${rootPath}/${name}` : name;
      await invoke('write_file', { path: basePath, content: currentContent });
      setTabs(prev => prev.map(t =>
        t.id === activeTab.id
          ? { ...t, path: basePath, name, content: currentContent, language: getLanguageFromPath(basePath), isDirty: false }
          : t
      ));
      showMessage(`Guardado: ${name}`);
      refreshTree();
      return;
    }

    // Format on save
    if (settings['editor.formatOnSave'] && editorRef.current) {
      await editorRef.current.getAction('editor.action.formatDocument')?.run();
    }

    // Leer contenido final (puede haber cambiado con format on save)
    const finalContent = editorRef.current?.getValue() ?? currentContent;

    try {
      await invoke('write_file', { path: activeTab.path, content: finalContent });
      setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, content: finalContent, isDirty: false } : t));
      showMessage('Guardado');
    } catch (e) { showMessage(`Error al guardar: ${e}`); }
  }, [activeTab, rootPath, refreshTree, settings, settingsOpen]);

  // ── Auto-save: guarda archivos dirty 500ms después del último cambio ──
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const dirtyTabs = tabs.filter(t => t.isDirty && t.path);
    if (dirtyTabs.length === 0) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const editor = editorRef.current;
      for (const tab of dirtyTabs) {
        const content = (activeTabId === tab.id && editor)
          ? editor.getValue()
          : tab.content;
        try {
          await invoke('write_file', { path: tab.path, content });
          setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, content, isDirty: false } : t));
        } catch { /* silencioso */ }
      }
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [tabs, activeTabId]);

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
  }

  // ── Cambios del editor ────────────────────────────────────────────────
  function handleEditorChange(value: string) {
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, content: value, isDirty: true } : t
    ));
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
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      // Bloquear DevTools (desactivar para debug si es necesario)
      // if (e.key === 'F12') { e.preventDefault(); return; }
      // if (mod && e.shiftKey && e.key === 'I') { e.preventDefault(); return; }
      // if (mod && e.shiftKey && e.key === 'J') { e.preventDefault(); return; }
      // if (mod && e.key === 'u') { e.preventDefault(); return; }

      if (mod && e.key === 's') { e.preventDefault(); handleSave(); }
      if (mod && e.key === 'b') { e.preventDefault(); setSidebarVisibleToggle(); }
      if (mod && e.key === 'w') { e.preventDefault(); if (activeTabId) handleCloseTab(activeTabId); }
      if (mod && e.key === ',') { e.preventDefault(); setSettingsOpen(v => !v); }
      if (e.key === '`' && mod) { e.preventDefault(); setTerminalVisible(v => !v); }
      if (mod && e.shiftKey && e.key === 'A') { e.preventDefault(); setAiPanelVisible(v => !v); }
      // Ctrl+K → espera segunda tecla
      if (mod && e.key === 'k') { e.preventDefault(); ctrlKRef.current = true; setTimeout(() => { ctrlKRef.current = false; }, 1500); return; }
      // Segunda tecla T después de Ctrl+K
      if (ctrlKRef.current && (e.key === 't' || e.key === 'T')) { e.preventDefault(); ctrlKRef.current = false; setCmdPaletteOpen(true); return; }
      if (ctrlKRef.current && e.key !== 'Control') { ctrlKRef.current = false; }
    }
    function onEditorSave() { handleSave(); }
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('editor-save', onEditorSave);
    return () => { window.removeEventListener('keydown', onKeyDown); document.removeEventListener('editor-save', onEditorSave); };
  }, [handleSave, activeTabId]);

  const [sidebarVisible, setSidebarVisible] = useState(true);
  function setSidebarVisibleToggle() { setSidebarVisible(v => !v); }

  // ── Resize sidebar ────────────────────────────────────────────────────
  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    resizingRef.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;
    const isLeft = sidebarLeft;
    function onMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const delta = isLeft ? ev.clientX - startX : startX - ev.clientX;
      setSettings(s => ({ ...s, 'workbench.sidebarWidth': Math.max(140, Math.min(500, startW + delta)) }));
    }
    function onUp() { resizingRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── Actions ───────────────────────────────────────────────────────────
  function handleUndo() { editorRef.current?.trigger('keyboard', 'undo', null); }
  function handleRedo() { editorRef.current?.trigger('keyboard', 'redo', null); }
  function handleFind() { editorRef.current?.getAction('actions.find')?.run(); }

  // ── Terminal resize ───────────────────────────────────────────────────
  function onTerminalResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    termResizingRef.current = true;
    const startY = e.clientY;
    const startH = terminalHeight;
    function onMove(ev: MouseEvent) {
      if (!termResizingRef.current) return;
      const delta = startY - ev.clientY;
      setTerminalHeight(Math.max(100, Math.min(600, startH + delta)));
    }
    function onUp() { termResizingRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── AI Panel resize ───────────────────────────────────────────────────
  function onAiResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    aiResizingRef.current = true;
    const startX = e.clientX;
    const startW = settings['workbench.aiPanelWidth'];
    const isRight = settings['workbench.aiPanelPosition'] === 'right';
    function onMove(ev: MouseEvent) {
      if (!aiResizingRef.current) return;
      const delta = isRight ? startX - ev.clientX : ev.clientX - startX;
      setSettings(s => ({ ...s, 'workbench.aiPanelWidth': Math.max(250, Math.min(600, startW + delta)) }));
    }
    function onUp() { aiResizingRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── Barra de tabs virtual (incluye settings) ──────────────────────────
  const allTabs = tabs;
  const displayActiveId = settingsOpen ? SETTINGS_TAB_ID : activeTabId;

  function handleSelectDisplayTab(id: string) {
    if (id === SETTINGS_TAB_ID) { setSettingsOpen(true); }
    else { setActiveTabId(id); setSettingsOpen(false); }
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
                    invoke('write_terminal', { data: command + '\n' }).catch(() => { });
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
                />
              )}
              {activeView === 'search' && <SearchPanel />}
              {activeView === 'git' && <GitPanel />}
              {activeView === 'debug' && (
                <DebugPanel
                  cwd={rootPath}
                  onRunProject={(command) => {
                    setTerminalVisible(true);
                    invoke('write_terminal', { data: command + '\n' }).catch(() => { });
                  }}
                />
              )}
              {activeView === 'extensions' && <ExtensionsPanel />}
            </div>
          </>
        )}

        {/* AI Panel derecha */}
        {settings['workbench.aiPanelPosition'] === 'right' && aiPanelVisible && (
          <div className="ai-resize-handle" onMouseDown={onAiResizeStart} />
        )}
        {settings['workbench.aiPanelPosition'] === 'right' && (
          <AIPanel
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
