import { useRef, useEffect, useState, useCallback } from 'react';
import MonacoEditor, { OnMount, OnChange, BeforeMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import type { Tab } from '../../types';
import { getLanguageLabel, ALL_LANGUAGES } from '../../utils/language';
import { registerAllMonacoThemes } from '../../themes';
import { registerCompletionProviders, registerLanguageKeywords } from '../../utils/completions';
import { registerLspProviders } from '../../utils/lsp-monaco-bridge';
import ContextMenu, { ContextMenuItem } from '../ContextMenu/ContextMenu';
import EditorCommandPalette from '../EditorCommandPalette/EditorCommandPalette';
import './CodeEditor.css';

interface EditorOptions {
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: { enabled: boolean };
  lineNumbers: 'on' | 'off' | 'relative';
  fontFamily: string;
  fontLigatures: boolean;
  cursorStyle: 'line' | 'block' | 'underline';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all';
}

interface CodeEditorProps {
  tab: Tab | null;
  settings: EditorOptions;
  themeId: string;
  onChange: (value: string) => void;
  onLanguageChange: (lang: string) => void;
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  rootPath?: string | null;
}

export default function CodeEditor({
  tab, settings, themeId, onChange, onLanguageChange, editorRef, rootPath,
}: CodeEditorProps) {
  const monacoRef = useRef<typeof Monaco | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [cmdPaletteVisible, setCmdPaletteVisible] = useState(false);

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const ctxItems: ContextMenuItem[] = [
    { label: 'Ir a definición', shortcut: 'Ctrl+F12', action: () => editorRef.current?.getAction('editor.action.revealDefinition')?.run() },
    { label: 'Ir a referencias', shortcut: 'Shift+F12', action: () => editorRef.current?.getAction('editor.action.goToReferences')?.run() },
    { label: 'Ir a símbolo...', shortcut: 'Ctrl+Shift+O', action: () => editorRef.current?.getAction('editor.action.quickOutline')?.run() },
    { divider: true, label: '' },
    { label: 'Renombrar símbolo', shortcut: 'F2', action: () => editorRef.current?.getAction('editor.action.rename')?.run() },
    { label: 'Cambiar todas las ocurrencias', shortcut: 'Ctrl+F2', action: () => editorRef.current?.getAction('editor.action.changeAll')?.run() },
    { label: 'Formatear documento', action: () => editorRef.current?.getAction('editor.action.formatDocument')?.run() },
    { divider: true, label: '' },
    { label: 'Cortar', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
    { label: 'Copiar', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
    { label: 'Pegar', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
    { divider: true, label: '' },
    { label: 'Paleta de comandos', shortcut: 'F1', action: () => setCmdPaletteVisible(true) },
  ];

  // Registrar todos los temas ANTES de montar el editor
  const handleBeforeMount: BeforeMount = (monaco) => {
    registerAllMonacoThemes(monaco);

    // Configurar TypeScript/JavaScript para soportar JSX/TSX
    const tsDefaults = monaco.languages.typescript.typescriptDefaults;
    const jsDefaults = monaco.languages.typescript.javascriptDefaults;

    const compilerOptions = {
      target: monaco.languages.typescript.ScriptTarget.Latest,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      reactNamespace: 'React',
      allowNonTsExtensions: true,
      allowJs: true,
      esModuleInterop: true,
      noEmit: true,
      strict: false,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      forceConsistentCasingInFileNames: false,
      resolveJsonModule: true,
      isolatedModules: true,
    };

    tsDefaults.setCompilerOptions(compilerOptions);
    jsDefaults.setCompilerOptions(compilerOptions);

    // Agregar libs para autocompletado de DOM, ES2022, etc.
    tsDefaults.setEagerModelSync(true);
    jsDefaults.setEagerModelSync(true);

    // Desactivar validación semántica (no tenemos node_modules)
    tsDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });
    jsDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });

    // Registrar snippets y autocompletado custom
    registerCompletionProviders(monaco);

    // Registrar keywords y built-ins de cada lenguaje
    registerLanguageKeywords(monaco);

    // Registrar LSP providers
    registerLspProviders(monaco, rootPath ?? null);
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      document.dispatchEvent(new CustomEvent('editor-save'));
    });
    editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      () => editor.getAction('editor.action.formatDocument')?.run()
    );

    // Liberar Ctrl+K para que el app lo capture (command palette)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      // Dispatch al window para que App.tsx lo maneje
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });

    // Context menu custom con blur
    editor.onContextMenu((e) => {
      e.event.preventDefault();
      e.event.stopPropagation();
      setCtxMenu({ x: e.event.posx, y: e.event.posy });
    });

    // F1 abre paleta de comandos custom
    editor.addCommand(monaco.KeyCode.F1, () => {
      setCmdPaletteVisible(true);
    });

    editor.focus();
  };

  const handleChange: OnChange = (value) => onChange(value ?? '');

  // Cambiar lenguaje del modelo cuando cambia el tab
  useEffect(() => {
    if (editorRef.current && tab && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) monacoRef.current.editor.setModelLanguage(model, tab.language);
    }
  }, [tab?.language]);

  // ── LSP: desactivado — evitar uso de memoria innecesario

  if (!tab) {
    return (
      <div className="editor-welcome">
        <div className="welcome-content">
          <div className="welcome-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="url(#welcome-universe-grad)" />
              <ellipse cx="12" cy="12" rx="10" ry="4" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" fill="none" />
              <ellipse cx="12" cy="12" rx="7" ry="9" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" fill="none" transform="rotate(30 12 12)" />
              <circle cx="8" cy="9" r="0.8" fill="#fff" opacity="0.9" />
              <circle cx="15" cy="7" r="0.5" fill="#fff" opacity="0.7" />
              <circle cx="16" cy="14" r="0.6" fill="#fff" opacity="0.8" />
              <circle cx="6" cy="15" r="0.4" fill="#fff" opacity="0.6" />
              <circle cx="12" cy="5" r="0.5" fill="#fff" opacity="0.7" />
              <circle cx="10" cy="17" r="0.4" fill="#fff" opacity="0.5" />
              <circle cx="18" cy="10" r="0.3" fill="#fff" opacity="0.6" />
              <circle cx="12" cy="12" r="1.5" fill="#fff" opacity="0.9" />
              <defs>
                <radialGradient id="welcome-universe-grad" cx="0.4" cy="0.4" r="0.7">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="50%" stopColor="#3b0764" />
                  <stop offset="100%" stopColor="#0f0326" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          <h2>Astro</h2>
          <p>Abre un archivo o carpeta para comenzar</p>
          <div className="welcome-shortcuts">
            <div><kbd>Ctrl+S</kbd> Guardar</div>
            <div><kbd>Ctrl+F</kbd> Buscar</div>
            <div><kbd>Ctrl+,</kbd> Configuración</div>
            <div><kbd>Ctrl+B</kbd> Toggle sidebar</div>
            <div><kbd>Shift+Alt+F</kbd> Formatear</div>
            <div><kbd>Ctrl+W</kbd> Cerrar tab</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="code-editor-wrapper">
      <MonacoEditor
        height="100%"
        language={tab.language}
        value={tab.content}
        theme={themeId}
        beforeMount={handleBeforeMount}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          ...settings,
          automaticLayout: true,
          fixedOverflowWidgets: true,
          contextmenu: false,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          hover: { above: false, delay: 200 },
          formatOnPaste: true,
          formatOnType: true,
          // ── IntelliSense agresivo y rápido ──────────────────────────
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          quickSuggestionsDelay: 10,
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          wordBasedSuggestions: 'allDocuments',
          wordBasedSuggestionsOnlySameLanguage: false,
          suggestSelection: 'recentlyUsedByPrefix',
          suggest: {
            showSnippets: true,
            showKeywords: true,
            showClasses: true,
            showFunctions: true,
            showVariables: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showMethods: true,
            showConstants: true,
            showEnums: true,
            showColors: true,
            showStructs: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showTypeParameters: true,
            snippetsPreventQuickSuggestions: false,
            localityBonus: true,
            shareSuggestSelections: true,
            filterGraceful: true,
            preview: true,
            previewMode: 'subwordSmart',
            showIcons: true,
            insertMode: 'replace',
            showStatusBar: true,
            showInlineDetails: true,
            showDeprecated: false,
          },
          parameterHints: { enabled: true, cycle: true },
          inlineSuggest: { enabled: true, mode: 'subwordSmart' },
          // ── Navegación y productividad ──────────────────────────────
          linkedEditing: true,
          autoClosingBrackets: 'languageDefined',
          autoClosingQuotes: 'languageDefined',
          autoClosingDelete: 'always',
          autoSurround: 'languageDefined',
          autoIndent: 'full',
          matchBrackets: 'always',
          occurrencesHighlight: 'singleFile',
          definitionLinkOpensInPeek: false,
          gotoLocation: { multipleDefinitions: 'goto' },
          // ── Visual ─────────────────────────────────────────────────
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'mouseover',
          unfoldOnClickAfterEndOfLine: true,
          bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
          guides: { bracketPairs: 'active', bracketPairsHorizontal: true, indentation: true, highlightActiveIndentation: true },
          padding: { top: 8, bottom: 8 },
          renderLineHighlight: 'all',
          renderLineHighlightOnlyWhenFocus: false,
          colorDecorators: true,
          'semanticHighlighting.enabled': true,
          stickyScroll: { enabled: false },
          unicodeHighlight: { ambiguousCharacters: true, invisibleCharacters: true },
          // ── Performance ────────────────────────────────────────────
          fastScrollSensitivity: 5,
          mouseWheelScrollSensitivity: 1.5,
          largeFileOptimizations: true,
        }}
        path={tab.path || `untitled-${tab.id}`}
      />
      <div className="editor-lang-selector">
        <select value={tab.language} onChange={e => onLanguageChange(e.target.value)} title="Lenguaje">
          {ALL_LANGUAGES.map(lang => (
            <option key={lang} value={lang}>{getLanguageLabel(lang)}</option>
          ))}
        </select>
      </div>
      <ContextMenu
        visible={ctxMenu !== null}
        x={ctxMenu?.x ?? 0}
        y={ctxMenu?.y ?? 0}
        items={ctxItems}
        onClose={closeCtxMenu}
      />
      <EditorCommandPalette
        visible={cmdPaletteVisible}
        onClose={() => setCmdPaletteVisible(false)}
        editorRef={editorRef}
      />
    </div>
  );
}
