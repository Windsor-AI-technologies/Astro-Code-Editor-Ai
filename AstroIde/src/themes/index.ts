import type * as Monaco from 'monaco-editor';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THEME COLORS — Estructura extensible para API de temas/extensiones
// Cada categoría agrupa los tokens de color relevantes para esa zona del editor.
// Los creadores de temas solo necesitan definir estos valores.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ThemeColors {
  // ─── Base / Global ──────────────────────────────────────────────────
  'base.background': string;           // Fondo raíz de la app
  'base.foreground': string;           // Texto principal
  'base.foregroundSecondary': string;   // Texto secundario
  'base.foregroundDim': string;         // Texto deshabilitado/dim
  'base.border': string;               // Bordes generales
  'base.hover': string;                // Fondo hover general
  'base.accent': string;               // Color de acento principal
  'base.accentHover': string;          // Acento hover
  'base.accentForeground': string;     // Texto sobre acento

  // ─── Editor ─────────────────────────────────────────────────────────
  'editor.background': string;
  'editor.foreground': string;
  'editor.lineHighlight': string;
  'editor.selection': string;
  'editor.cursor': string;

  // ─── Sidebar ────────────────────────────────────────────────────────
  'sidebar.background': string;
  'sidebar.acrylicTop': string;
  'sidebar.acrylicMid': string;
  'sidebar.acrylicBottom': string;

  // ─── Titlebar / Toolbar ─────────────────────────────────────────────
  'titlebar.background': string;

  // ─── Tabs ───────────────────────────────────────────────────────────
  'tab.activeBackground': string;
  'tab.inactiveBackground': string;
  'tab.activeBorder': string;

  // ─── Status Bar ─────────────────────────────────────────────────────
  'statusbar.background': string;
  'statusbar.foreground': string;

  // ─── Semantic ───────────────────────────────────────────────────────
  'semantic.danger': string;
  'semantic.success': string;
  'semantic.warning': string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  base: 'vs-dark' | 'vs' | 'hc-black';
  /** Colores tipados por categoría (preferido para nuevos temas) */
  colors?: ThemeColors;
  /** CSS vars planos — retrocompatible, se genera automáticamente desde colors */
  vars: Record<string, string>;
  monaco: Monaco.editor.IStandaloneThemeData;
}

// ── Convierte ThemeColors tipado → CSS vars planos ──────────────────────────
export function colorsToVars(c: ThemeColors): Record<string, string> {
  return {
    '--bg-root': c['base.background'],
    '--bg-0': c['editor.background'],
    '--bg-1': c['sidebar.background'],
    '--bg-2': c['sidebar.background'],
    '--bg-3': c['base.hover'],
    '--bg-hover': c['base.hover'],
    '--border': c['base.border'],
    '--text-primary': c['base.foreground'],
    '--text-secondary': c['base.foregroundSecondary'],
    '--text-dim': c['base.foregroundDim'],
    '--accent': c['base.accent'],
    '--accent-hover': c['base.accentHover'],
    '--accent-fg': c['base.accentForeground'],
    '--tab-active': c['tab.activeBackground'],
    '--tab-inactive': c['tab.inactiveBackground'],
    '--tab-border': c['tab.activeBorder'],
    '--status-bg': c['statusbar.background'],
    '--status-text': c['statusbar.foreground'],
    '--danger': c['semantic.danger'],
    '--success': c['semantic.success'],
    '--warning': c['semantic.warning'],
    '--toolbar-bg': c['titlebar.background'],
    '--sidebar-acrylic-top': c['sidebar.acrylicTop'],
    '--sidebar-acrylic-mid': c['sidebar.acrylicMid'],
    '--sidebar-acrylic-bottom': c['sidebar.acrylicBottom'],
  };
}

// Helper para crear theme data
function mkTheme(
  base: 'vs-dark' | 'vs' | 'hc-black',
  colors: Record<string, string>,
  rules: Monaco.editor.ITokenThemeRule[]
): Monaco.editor.IStandaloneThemeData {
  const bg = colors['editor.background'] ?? '#1e1e1e';
  // Menu semi-transparente: hex + 'b3' = 70% opacity (RRGGBBAA format)
  const menuBg = bg.length === 7 ? bg + 'b3' : bg;
  const widgetDefaults: Record<string, string> = {
    'editorWidget.background': menuBg,
    'editorWidget.border': '#ffffff15',
    'menu.background': menuBg,
    'menu.foreground': colors['editor.foreground'] ?? '#d4d4d4',
    'menu.selectionBackground': colors['editor.selectionBackground'] ?? '#264f78',
  };
  return { base, inherit: true, colors: { ...widgetDefaults, ...colors }, rules };
}

export const THEMES: ThemeDefinition[] = [
  // ━━━━━━━━━━━━━━ KIRO DARK ━━━━━━━━━━━━━━
  {
    id: 'kiro-dark',
    name: 'Kiro Dark',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#16161e', '--bg-0': '#1a1b26', '--bg-1': '#1f23353b',
      '--bg-2': '#24283b', '--bg-3': '#2a2f44',
      '--bg-hover': 'rgba(122,162,247,0.08)',
      '--border': 'rgba(122,162,247,0.12)',
      '--text-primary': '#c0caf5', '--text-secondary': '#787c99',
      '--text-dim': '#414868', '--accent': '#7aa2f7',
      '--accent-hover': '#89b4fa', '--accent-fg': '#1a1b26',
      '--tab-active': '#1a1b26', '--tab-inactive': 'rgba(26,27,38,0.5)',
      '--tab-border': '#7aa2f7', '--status-bg': '#171c27',
      '--status-text': '#ffffff', '--danger': '#f7768e',
      '--success': '#9ece6a', '--warning': '#e0af68',
      '--toolbar-bg': 'rgba(22,22,30,0.92)',
      '--sidebar-acrylic-top': 'rgba(22,22,30,0.05)',
      '--sidebar-acrylic-mid': 'rgba(22,22,30,0.40)',
      '--sidebar-acrylic-bottom': 'rgba(22,22,30,0.94)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#1a1b26',
      'editor.foreground': '#c0caf5',
      'editor.lineHighlightBackground': '#1f2335',
      'editor.selectionBackground': '#33467c',
      'editorCursor.foreground': '#c0caf5',
      'editorWhitespace.foreground': '#3b4261',
      'editorIndentGuide.background': '#24283b',
      'editorLineNumber.foreground': '#3b4261',
      'editorLineNumber.activeForeground': '#737aa2',
      "statusbar": '#1a1b26'
    }, [
      { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
      { token: 'keyword', foreground: '9d7cd8' },
      { token: 'string', foreground: '9ece6a' },
      { token: 'number', foreground: 'ff9e64' },
      { token: 'type', foreground: '2ac3de' },
      { token: 'function', foreground: '7aa2f7' },
      { token: 'variable', foreground: 'c0caf5' },
      { token: 'constant', foreground: 'ff9e64' },
      { token: 'operator', foreground: '89ddff' },
      { token: 'tag', foreground: 'f7768e' },
      { token: 'attribute.name', foreground: '7aa2f7' },
      { token: 'attribute.value', foreground: '9ece6a' },
      { token: 'delimiter', foreground: '9abdf5' },
    ]),
  },

  // ━━━━━━━━━━━━━━ VS CODE DARK+ ━━━━━━━━━━━━━━
  {
    id: 'vscode-dark',
    name: 'VS Code Dark+',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#1e1e1e', '--bg-0': '#1e1e1e', '--bg-1': '#2525263b',
      '--bg-2': '#2d2d2d', '--bg-3': '#3c3c3c',
      '--bg-hover': 'rgba(255,255,255,0.06)',
      '--border': 'rgba(255,255,255,0.08)',
      '--text-primary': '#d4d4d4', '--text-secondary': '#858585',
      '--text-dim': '#555', '--accent': '#0078d4',
      '--accent-hover': '#1184db', '--accent-fg': '#ffffff',
      '--tab-active': '#1e1e1e', '--tab-inactive': '#2d2d2d',
      '--tab-border': '#0078d4', '--status-bg': '#007acc',
      '--status-text': '#ffffff', '--danger': '#f14c4c',
      '--success': '#4ec9b0', '--warning': '#dcdcaa',
      '--toolbar-bg': 'rgba(30,30,30,0.95)',
      '--sidebar-acrylic-top': 'rgba(20,20,20,0.05)',
      '--sidebar-acrylic-mid': 'rgba(20,20,20,0.45)',
      '--sidebar-acrylic-bottom': 'rgba(20,20,20,0.95)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editor.selectionBackground': '#264f78',
      'editorCursor.foreground': '#aeafad',
      'editorLineNumber.foreground': '#5a5a5a',
      'editorLineNumber.activeForeground': '#c6c6c6',
    }, [
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569cd6' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'type', foreground: '4ec9b0' },
      { token: 'function', foreground: 'dcdcaa' },
      { token: 'variable', foreground: '9cdcfe' },
      { token: 'constant', foreground: '4fc1ff' },
      { token: 'operator', foreground: 'd4d4d4' },
      { token: 'tag', foreground: '569cd6' },
      { token: 'attribute.name', foreground: '9cdcfe' },
      { token: 'attribute.value', foreground: 'ce9178' },
      { token: 'delimiter', foreground: 'd4d4d4' },
    ]),
  },

  // ━━━━━━━━━━━━━━ DRACULA ━━━━━━━━━━━━━━
  {
    id: 'dracula',
    name: 'Dracula',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#191a21', '--bg-0': '#282a36', '--bg-1': '#21222c3b',
      '--bg-2': '#2f3240', '--bg-3': '#373a4e',
      '--bg-hover': 'rgba(189,147,249,0.08)',
      '--border': 'rgba(98,114,164,0.25)',
      '--text-primary': '#f8f8f2', '--text-secondary': '#6272a4',
      '--text-dim': '#44475a', '--accent': '#bd93f9',
      '--accent-hover': '#caa4fa', '--accent-fg': '#21222c',
      '--tab-active': '#282a36', '--tab-inactive': 'rgba(33,34,44,0.6)',
      '--tab-border': '#bd93f9', '--status-bg': '#6272a4',
      '--status-text': '#f8f8f2', '--danger': '#ff5555',
      '--success': '#50fa7b', '--warning': '#f1fa8c',
      '--toolbar-bg': 'rgba(25,26,33,0.93)',
      '--sidebar-acrylic-top': 'rgba(25,26,33,0.05)',
      '--sidebar-acrylic-mid': 'rgba(25,26,33,0.45)',
      '--sidebar-acrylic-bottom': 'rgba(25,26,33,0.95)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#44475a75',
      'editor.selectionBackground': '#44475a',
      'editorCursor.foreground': '#f8f8f0',
      'editorLineNumber.foreground': '#6272a4',
      'editorLineNumber.activeForeground': '#f8f8f2',
    }, [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'type', foreground: '8be9fd', fontStyle: 'italic' },
      { token: 'function', foreground: '50fa7b' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'constant', foreground: 'bd93f9' },
      { token: 'operator', foreground: 'ff79c6' },
      { token: 'tag', foreground: 'ff79c6' },
      { token: 'attribute.name', foreground: '50fa7b' },
      { token: 'attribute.value', foreground: 'f1fa8c' },
      { token: 'delimiter', foreground: 'f8f8f2' },
    ]),
  },

  // ━━━━━━━━━━━━━━ GRUVBOX DARK ━━━━━━━━━━━━━━
  {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#1d2021', '--bg-0': '#282828', '--bg-1': '#32302f3b',
      '--bg-2': '#3c3836', '--bg-3': '#504945',
      '--bg-hover': 'rgba(215,153,33,0.08)',
      '--border': 'rgba(168,153,132,0.18)',
      '--text-primary': '#ebdbb2', '--text-secondary': '#928374',
      '--text-dim': '#665c54', '--accent': '#d79921',
      '--accent-hover': '#fabd2f', '--accent-fg': '#282828',
      '--tab-active': '#282828', '--tab-inactive': 'rgba(40,40,40,0.6)',
      '--tab-border': '#d79921', '--status-bg': '#d79921',
      '--status-text': '#282828', '--danger': '#fb4934',
      '--success': '#b8bb26', '--warning': '#fe8019',
      '--toolbar-bg': 'rgba(29,32,33,0.93)',
      '--sidebar-acrylic-top': 'rgba(29,32,33,0.05)',
      '--sidebar-acrylic-mid': 'rgba(29,32,33,0.45)',
      '--sidebar-acrylic-bottom': 'rgba(29,32,33,0.95)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#282828',
      'editor.foreground': '#ebdbb2',
      'editor.lineHighlightBackground': '#32302f',
      'editor.selectionBackground': '#504945',
      'editorCursor.foreground': '#ebdbb2',
      'editorLineNumber.foreground': '#665c54',
      'editorLineNumber.activeForeground': '#a89984',
    }, [
      { token: 'comment', foreground: '928374', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'fb4934' },
      { token: 'string', foreground: 'b8bb26' },
      { token: 'number', foreground: 'd3869b' },
      { token: 'type', foreground: 'fabd2f' },
      { token: 'function', foreground: '8ec07c' },
      { token: 'variable', foreground: '83a598' },
      { token: 'constant', foreground: 'd3869b' },
      { token: 'operator', foreground: 'fe8019' },
      { token: 'tag', foreground: 'fb4934' },
      { token: 'attribute.name', foreground: 'fabd2f' },
      { token: 'attribute.value', foreground: 'b8bb26' },
      { token: 'delimiter', foreground: 'ebdbb2' },
    ]),
  },

  // ━━━━━━━━━━━━━━ CATPPUCCIN MOCHA ━━━━━━━━━━━━━━
  {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#11111b', '--bg-0': '#1e1e2e', '--bg-1': '#1818253b',
      '--bg-2': '#1e1e2e', '--bg-3': '#313244',
      '--bg-hover': 'rgba(203,166,247,0.08)',
      '--border': 'rgba(88,91,112,0.35)',
      '--text-primary': '#cdd6f4', '--text-secondary': '#585b70',
      '--text-dim': '#45475a', '--accent': '#cba6f7',
      '--accent-hover': '#d4b1f9', '--accent-fg': '#1e1e2e',
      '--tab-active': '#1e1e2e', '--tab-inactive': 'rgba(24,24,37,0.6)',
      '--tab-border': '#cba6f7', '--status-bg': '#cba6f7',
      '--status-text': '#1e1e2e', '--danger': '#f38ba8',
      '--success': '#a6e3a1', '--warning': '#f9e2af',
      '--toolbar-bg': 'rgba(17,17,27,0.93)',
      '--sidebar-acrylic-top': 'rgba(17,17,27,0.05)',
      '--sidebar-acrylic-mid': 'rgba(17,17,27,0.45)',
      '--sidebar-acrylic-bottom': 'rgba(17,17,27,0.95)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#1e1e2e',
      'editor.foreground': '#cdd6f4',
      'editor.lineHighlightBackground': '#1e1e2e',
      'editor.selectionBackground': '#45475a',
      'editorCursor.foreground': '#f5e0dc',
      'editorLineNumber.foreground': '#45475a',
      'editorLineNumber.activeForeground': '#7f849c',
    }, [
      { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cba6f7' },
      { token: 'string', foreground: 'a6e3a1' },
      { token: 'number', foreground: 'fab387' },
      { token: 'type', foreground: 'f9e2af' },
      { token: 'function', foreground: '89b4fa' },
      { token: 'variable', foreground: 'cdd6f4' },
      { token: 'constant', foreground: 'fab387' },
      { token: 'operator', foreground: '89dceb' },
      { token: 'tag', foreground: 'cba6f7' },
      { token: 'attribute.name', foreground: '89b4fa' },
      { token: 'attribute.value', foreground: 'a6e3a1' },
      { token: 'delimiter', foreground: '9399b2' },
    ]),
  },

  // ━━━━━━━━━━━━━━ NORD ━━━━━━━━━━━━━━
  {
    id: 'nord',
    name: 'Nord',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#242933', '--bg-0': '#2e3440', '--bg-1': '#3b42523b',
      '--bg-2': '#434c5e', '--bg-3': '#4c566a',
      '--bg-hover': 'rgba(136,192,208,0.08)',
      '--border': 'rgba(76,86,106,0.5)',
      '--text-primary': '#eceff4', '--text-secondary': '#7b88a1',
      '--text-dim': '#4c566a', '--accent': '#88c0d0',
      '--accent-hover': '#97cedd', '--accent-fg': '#2e3440',
      '--tab-active': '#2e3440', '--tab-inactive': 'rgba(46,52,64,0.6)',
      '--tab-border': '#88c0d0', '--status-bg': '#5e81ac',
      '--status-text': '#eceff4', '--danger': '#bf616a',
      '--success': '#a3be8c', '--warning': '#ebcb8b',
      '--toolbar-bg': 'rgba(36,41,51,0.93)',
      '--sidebar-acrylic-top': 'rgba(36,41,51,0.05)',
      '--sidebar-acrylic-mid': 'rgba(36,41,51,0.45)',
      '--sidebar-acrylic-bottom': 'rgba(36,41,51,0.95)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#2e3440',
      'editor.foreground': '#d8dee9',
      'editor.lineHighlightBackground': '#3b425280',
      'editor.selectionBackground': '#434c5e',
      'editorCursor.foreground': '#d8dee9',
      'editorLineNumber.foreground': '#4c566a',
      'editorLineNumber.activeForeground': '#d8dee9',
    }, [
      { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1' },
      { token: 'string', foreground: 'a3be8c' },
      { token: 'number', foreground: 'b48ead' },
      { token: 'type', foreground: '8fbcbb' },
      { token: 'function', foreground: '88c0d0' },
      { token: 'variable', foreground: 'd8dee9' },
      { token: 'constant', foreground: 'b48ead' },
      { token: 'operator', foreground: '81a1c1' },
      { token: 'tag', foreground: '81a1c1' },
      { token: 'attribute.name', foreground: '8fbcbb' },
      { token: 'attribute.value', foreground: 'a3be8c' },
      { token: 'delimiter', foreground: 'eceff4' },
    ]),
  },

  // ━━━━━━━━━━━━━━ SOLARIZED DARK ━━━━━━━━━━━━━━
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#002731', '--bg-0': '#002b36', '--bg-1': '#07364248',
      '--bg-2': '#0d3d4e', '--bg-3': '#164450',
      '--bg-hover': 'rgba(38,139,210,0.1)',
      '--border': 'rgba(7,54,66,0.6)',
      '--text-primary': '#839496', '--text-secondary': '#586e75',
      '--text-dim': '#3c5055', '--accent': '#268bd2',
      '--accent-hover': '#2f9de0', '--accent-fg': '#fdf6e3',
      '--tab-active': '#002b36', '--tab-inactive': 'rgba(0,43,54,0.6)',
      '--tab-border': '#268bd2', '--status-bg': '#268bd2',
      '--status-text': '#fdf6e3', '--danger': '#dc322f',
      '--success': '#859900', '--warning': '#b58900',
      '--toolbar-bg': 'rgba(0,39,49,0.93)',
      '--sidebar-acrylic-top': 'rgba(0,39,49,0.05)',
      '--sidebar-acrylic-mid': 'rgba(0,39,49,0.45)',
      '--sidebar-acrylic-bottom': 'rgba(0,39,49,0.95)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#002b36',
      'editor.foreground': '#839496',
      'editor.lineHighlightBackground': '#073642',
      'editor.selectionBackground': '#073642',
      'editorCursor.foreground': '#839496',
      'editorLineNumber.foreground': '#586e75',
      'editorLineNumber.activeForeground': '#93a1a1',
    }, [
      { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'string', foreground: '2aa198' },
      { token: 'number', foreground: 'd33682' },
      { token: 'type', foreground: 'b58900' },
      { token: 'function', foreground: '268bd2' },
      { token: 'variable', foreground: '839496' },
      { token: 'constant', foreground: 'cb4b16' },
      { token: 'operator', foreground: '859900' },
      { token: 'tag', foreground: '268bd2' },
      { token: 'attribute.name', foreground: '93a1a1' },
      { token: 'attribute.value', foreground: '2aa198' },
      { token: 'delimiter', foreground: '839496' },
    ]),
  },

  // ━━━━━━━━━━━━━━ VS CODE LIGHT+ ━━━━━━━━━━━━━━
  {
    id: 'vscode-light',
    name: 'VS Code Light+',
    base: 'vs',
    vars: {
      '--bg-root': '#f0f0f0', '--bg-0': '#ffffff', '--bg-1': '#f3f3f30e',
      '--bg-2': '#e8e8e8', '--bg-3': '#dddddd',
      '--bg-hover': 'rgba(0,0,0,0.05)',
      '--border': 'rgba(0,0,0,0.1)',
      '--text-primary': '#1a1a1a', '--text-secondary': '#4a4a4a',
      '--text-dim': '#777777', '--accent': '#0066b8',
      '--accent-hover': '#061a2a', '--accent-fg': '#ffffff',
      '--tab-active': '#ffffff', '--tab-inactive': '#ececec',
      '--tab-border': '#0078d4', '--status-bg': '#007acc',
      '--status-text': '#ffffff', '--danger': '#d32f2f',
      '--success': '#388e3c', '--warning': '#f57c00',
      '--toolbar-bg': 'rgba(243,243,243,0.95)',
      '--sidebar-acrylic-top': 'rgba(243,243,243,0.05)',
      '--sidebar-acrylic-mid': 'rgba(243,243,243,0.55)',
      '--sidebar-acrylic-bottom': 'rgba(243,243,243,0.96)',
    },
    monaco: mkTheme('vs', {
      'editor.background': '#ffffff',
      'editor.foreground': '#333333',
      'editor.lineHighlightBackground': '#f5f5f5',
      'editor.selectionBackground': '#add6ff',
      'editorCursor.foreground': '#333333',
      'editorLineNumber.foreground': '#999999',
      'editorLineNumber.activeForeground': '#333333',
    }, [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0000ff' },
      { token: 'string', foreground: 'a31515' },
      { token: 'number', foreground: '098658' },
      { token: 'type', foreground: '267f99' },
      { token: 'function', foreground: '795e26' },
      { token: 'variable', foreground: '001080' },
      { token: 'constant', foreground: '0070c1' },
      { token: 'operator', foreground: '333333' },
      { token: 'tag', foreground: '800000' },
      { token: 'attribute.name', foreground: 'ff0000' },
      { token: 'attribute.value', foreground: '0451a5' },
      { token: 'delimiter', foreground: '333333' },
    ]),
  },

  // ━━━━━━━━━━━━━━ ONE DARK PRO ━━━━━━━━━━━━━━
  {
    id: 'one-dark-pro',
    name: 'One Dark Pro',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#21252b', '--bg-0': '#282c34', '--bg-1': '#21252b3b',
      '--bg-2': '#2c313a', '--bg-3': '#3a3f4b',
      '--bg-hover': 'rgba(97,175,239,0.08)',
      '--border': 'rgba(181,181,181,0.1)',
      '--text-primary': '#abb2bf', '--text-secondary': '#5c6370',
      '--text-dim': '#4b5263', '--accent': '#61afef',
      '--accent-hover': '#74b9f0', '--accent-fg': '#282c34',
      '--tab-active': '#282c34', '--tab-inactive': 'rgba(33,37,43,0.6)',
      '--tab-border': '#61afef', '--status-bg': '#21252b',
      '--status-text': '#abb2bf', '--danger': '#e06c75',
      '--success': '#98c379', '--warning': '#e5c07b',
      '--toolbar-bg': 'rgba(33,37,43,0.95)',
      '--sidebar-acrylic-top': 'rgba(33,37,43,0.05)',
      '--sidebar-acrylic-mid': 'rgba(33,37,43,0.45)',
      '--sidebar-acrylic-bottom': 'rgba(33,37,43,0.95)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editor.lineHighlightBackground': '#2c313c',
      'editor.selectionBackground': '#3e4451',
      'editorCursor.foreground': '#528bff',
      'editorLineNumber.foreground': '#4b5263',
      'editorLineNumber.activeForeground': '#abb2bf',
    }, [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'function', foreground: '61afef' },
      { token: 'variable', foreground: 'e06c75' },
      { token: 'constant', foreground: 'd19a66' },
      { token: 'operator', foreground: '56b6c2' },
      { token: 'tag', foreground: 'e06c75' },
      { token: 'attribute.name', foreground: 'd19a66' },
      { token: 'attribute.value', foreground: '98c379' },
      { token: 'delimiter', foreground: 'abb2bf' },
    ]),
  },

  // ━━━━━━━━━━━━━━ ONE DARK PRO DARKER ━━━━━━━━━━━━━━
  {
    id: 'one-dark-pro-darker',
    name: 'One Dark Pro Darker',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#1a1c23', '--bg-0': '#1e2127', '--bg-1': '#1a1c233b',
      '--bg-2': '#23272e', '--bg-3': '#2c313a',
      '--bg-hover': 'rgba(97,175,239,0.08)',
      '--border': 'rgba(181,181,181,0.08)',
      '--text-primary': '#abb2bf', '--text-secondary': '#5c6370',
      '--text-dim': '#4b5263', '--accent': '#61afef',
      '--accent-hover': '#74b9f0', '--accent-fg': '#1e2127',
      '--tab-active': '#1e2127', '--tab-inactive': 'rgba(26,28,35,0.6)',
      '--tab-border': '#61afef', '--status-bg': '#1a1c23',
      '--status-text': '#abb2bf', '--danger': '#e06c75',
      '--success': '#98c379', '--warning': '#e5c07b',
      '--toolbar-bg': 'rgba(26,28,35,0.95)',
      '--sidebar-acrylic-top': 'rgba(26,28,35,0.05)',
      '--sidebar-acrylic-mid': 'rgba(26,28,35,0.45)',
      '--sidebar-acrylic-bottom': 'rgba(26,28,35,0.95)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#1e2127',
      'editor.foreground': '#abb2bf',
      'editor.lineHighlightBackground': '#23272e',
      'editor.selectionBackground': '#3e4451',
      'editorCursor.foreground': '#528bff',
      'editorLineNumber.foreground': '#4b5263',
      'editorLineNumber.activeForeground': '#abb2bf',
    }, [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'function', foreground: '61afef' },
      { token: 'variable', foreground: 'e06c75' },
      { token: 'constant', foreground: 'd19a66' },
      { token: 'operator', foreground: '56b6c2' },
      { token: 'tag', foreground: 'e06c75' },
      { token: 'attribute.name', foreground: 'd19a66' },
      { token: 'attribute.value', foreground: '98c379' },
      { token: 'delimiter', foreground: 'abb2bf' },
    ]),
  },

  // ━━━━━━━━━━━━━━ ONE DARK PRO FLAT ━━━━━━━━━━━━━━
  {
    id: 'one-dark-pro-flat',
    name: 'One Dark Pro Flat',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#282c34', '--bg-0': '#282c34', '--bg-1': '#282c343b',
      '--bg-2': '#2c313a', '--bg-3': '#3a3f4b',
      '--bg-hover': 'rgba(97,175,239,0.08)',
      '--border': 'rgba(181,181,181,0.06)',
      '--text-primary': '#abb2bf', '--text-secondary': '#5c6370',
      '--text-dim': '#4b5263', '--accent': '#61afef',
      '--accent-hover': '#74b9f0', '--accent-fg': '#282c34',
      '--tab-active': '#282c34', '--tab-inactive': 'rgba(40,44,52,0.6)',
      '--tab-border': '#61afef', '--status-bg': '#282c34',
      '--status-text': '#abb2bf', '--danger': '#e06c75',
      '--success': '#98c379', '--warning': '#e5c07b',
      '--toolbar-bg': 'rgba(40,44,52,0.95)',
      '--sidebar-acrylic-top': 'rgba(40,44,52,0.05)',
      '--sidebar-acrylic-mid': 'rgba(40,44,52,0.45)',
      '--sidebar-acrylic-bottom': 'rgba(40,44,52,0.95)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editor.lineHighlightBackground': '#2c313c',
      'editor.selectionBackground': '#3e4451',
      'editorCursor.foreground': '#528bff',
      'editorLineNumber.foreground': '#4b5263',
      'editorLineNumber.activeForeground': '#abb2bf',
    }, [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'function', foreground: '61afef' },
      { token: 'variable', foreground: 'e06c75' },
      { token: 'constant', foreground: 'd19a66' },
      { token: 'operator', foreground: '56b6c2' },
      { token: 'tag', foreground: 'e06c75' },
      { token: 'attribute.name', foreground: 'd19a66' },
      { token: 'attribute.value', foreground: '98c379' },
      { token: 'delimiter', foreground: 'abb2bf' },
    ]),
  },

  // ━━━━━━━━━━━━━━ ONE DARK PRO VIVID ━━━━━━━━━━━━━━
  {
    id: 'one-dark-pro-vivid',
    name: 'One Dark Pro Vivid',
    base: 'vs-dark',
    vars: {
      '--bg-root': '#21252b', '--bg-0': '#282c34', '--bg-1': '#21253b',
      '--bg-2': '#2c313a', '--bg-3': '#3a3f4b',
      '--bg-hover': 'rgba(79,193,255,0.08)',
      '--border': 'rgba(181,181,181,0.1)',
      '--text-primary': '#d7dae0', '--text-secondary': '#5c6370',
      '--text-dim': '#4b5263', '--accent': '#4fc1ff',
      '--accent-hover': '#6dd0ff', '--accent-fg': '#282c34',
      '--tab-active': '#282c34', '--tab-inactive': 'rgba(33,37,43,0.6)',
      '--tab-border': '#4fc1ff', '--status-bg': '#21252b',
      '--status-text': '#d7dae0', '--danger': '#ef596f',
      '--success': '#89ca78', '--warning': '#e5c07b',
      '--toolbar-bg': 'rgba(33,37,43,0.95)',
      '--sidebar-acrylic-top': 'rgba(33,37,43,0.05)',
      '--sidebar-acrylic-mid': 'rgba(33,37,43,0.45)',
      '--sidebar-acrylic-bottom': 'rgba(33,37,43,0.95)',
    },
    monaco: mkTheme('vs-dark', {
      'editor.background': '#282c34',
      'editor.foreground': '#d7dae0',
      'editor.lineHighlightBackground': '#2c313c',
      'editor.selectionBackground': '#3e4451',
      'editorCursor.foreground': '#4fc1ff',
      'editorLineNumber.foreground': '#4b5263',
      'editorLineNumber.activeForeground': '#d7dae0',
    }, [
      { token: 'comment', foreground: '7f848e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'd55fde' },
      { token: 'string', foreground: '89ca78' },
      { token: 'number', foreground: 'ef596f' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'function', foreground: '4fc1ff' },
      { token: 'variable', foreground: 'ef596f' },
      { token: 'constant', foreground: 'f8c55d' },
      { token: 'operator', foreground: '2bbac5' },
      { token: 'tag', foreground: 'ef596f' },
      { token: 'attribute.name', foreground: 'f8c55d' },
      { token: 'attribute.value', foreground: '89ca78' },
      { token: 'delimiter', foreground: 'd7dae0' },
    ]),
  },

  // ━━━━━━━━━━━━━━ VS CODE DARK EXPERIMENTAL (2026 Dark) ━━━━━━━━━━━━━━
  (() => {
    const colors: ThemeColors = {
      'base.background': '#191a1b',
      'base.foreground': '#bfbfbf',
      'base.foregroundSecondary': '#8C8C8C',
      'base.foregroundDim': '#555555',
      'base.border': '#2A2B2CFF',
      'base.hover': 'rgba(255,255,255,0.08)',
      'base.accent': '#3994BC',
      'base.accentHover': '#48A0C7',
      'base.accentForeground': '#FFFFFF',
      'editor.background': '#121314',
      'editor.foreground': '#BBBEBF',
      'editor.lineHighlight': '#242526',
      'editor.selection': '#276782dd',
      'editor.cursor': '#BBBEBF',
      'sidebar.background': '#191a1b4b',
      'sidebar.acrylicTop': 'rgba(25,26,27,0.05)',
      'sidebar.acrylicMid': 'rgba(25,26,27,0.40)',
      'sidebar.acrylicBottom': 'rgba(25,26,27,0.94)',
      'titlebar.background': 'rgba(25,26,27,0.92)',
      'tab.activeBackground': '#121314',
      'tab.inactiveBackground': 'rgba(25,26,27,0.5)',
      'tab.activeBorder': '#3994BC',
      'statusbar.background': '#191A1B',
      'statusbar.foreground': '#8C8C8C',
      'semantic.danger': '#f48771',
      'semantic.success': '#73c991',
      'semantic.warning': '#e5ba7d',
    };
    return {
      id: 'vscode-dark-experimental',
      name: 'VS Dark Experimental',
      base: 'vs-dark' as const,
      colors,
      vars: colorsToVars(colors),
      monaco: mkTheme('vs-dark', {
        'editor.background': '#121314',
        'editor.foreground': '#BBBEBF',
        'editor.lineHighlightBackground': '#242526',
        'editor.selectionBackground': '#276782dd',
        'editorCursor.foreground': '#BBBEBF',
        'editorWhitespace.foreground': '#8C8C8C4D',
        'editorIndentGuide.background': '#8384854D',
        'editorIndentGuide.activeBackground': '#838485',
        'editorLineNumber.foreground': '#858889',
        'editorLineNumber.activeForeground': '#BBBEBF',
        'editorBracketMatch.background': '#3994BC55',
        'editorBracketMatch.border': '#2A2B2CFF',
      }, [
        { token: 'comment', foreground: '8b949e' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'storage', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'constant', foreground: '79c0ff' },
        { token: 'type', foreground: 'ffa657' },
        { token: 'function', foreground: 'd2a8ff' },
        { token: 'variable', foreground: 'c9d1d9' },
        { token: 'variable.other', foreground: 'c9d1d9' },
        { token: 'entity.name', foreground: 'ffa657' },
        { token: 'entity.name.function', foreground: 'd2a8ff' },
        { token: 'entity.name.tag', foreground: '7ee787' },
        { token: 'tag', foreground: '7ee787' },
        { token: 'attribute.name', foreground: '79c0ff' },
        { token: 'attribute.value', foreground: 'a5d6ff' },
        { token: 'support', foreground: '79c0ff' },
        { token: 'operator', foreground: 'ff7b72' },
        { token: 'delimiter', foreground: 'BBBEBF' },
        { token: 'invalid', foreground: 'ffa198', fontStyle: 'italic' },
      ]),
    };
  })(),
];

// ── Utilidades ───────────────────────────────────────────────────────────────

export const THEME_MAP: Record<string, ThemeDefinition> =
  Object.fromEntries(THEMES.map(t => [t.id, t]));

export function getTheme(id: string): ThemeDefinition {
  return THEME_MAP[id] ?? THEME_MAP['kiro-dark'];
}

// Aplica CSS vars del tema seleccionado
export function applyTheme(themeId: string) {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
}

// Registra todos los temas en Monaco (llamar 1 vez al montar el editor)
export function registerAllMonacoThemes(monaco: any) {
  for (const theme of THEMES) {
    monaco.editor.defineTheme(theme.id, theme.monaco);
  }
}

// Colores para xterm.js según el tema
export interface TerminalColors {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

const TERMINAL_COLORS: Record<string, TerminalColors> = {
  'kiro-dark': {
    background: '#1a1b26',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
    selectionBackground: '#33467c',
    black: '#414868', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68',
    blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#c0caf5',
    brightBlack: '#565f89', brightRed: '#f7768e', brightGreen: '#9ece6a', brightYellow: '#e0af68',
    brightBlue: '#7aa2f7', brightMagenta: '#bb9af7', brightCyan: '#7dcfff', brightWhite: '#c0caf5',
  },
  'vscode-dark': {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#aeafad',
    selectionBackground: '#264f78',
    black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510',
    blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5',
    brightBlack: '#666666', brightRed: '#f14c4c', brightGreen: '#23d18b', brightYellow: '#f5f543',
    brightBlue: '#3b8eea', brightMagenta: '#d670d6', brightCyan: '#29b8db', brightWhite: '#ffffff',
  },
  'dracula': {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    selectionBackground: '#44475a',
    black: '#21222c', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c',
    blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2',
    brightBlack: '#6272a4', brightRed: '#ff6e6e', brightGreen: '#69ff94', brightYellow: '#ffffa5',
    brightBlue: '#d6acff', brightMagenta: '#ff92df', brightCyan: '#a4ffff', brightWhite: '#ffffff',
  },
  'gruvbox-dark': {
    background: '#282828',
    foreground: '#ebdbb2',
    cursor: '#ebdbb2',
    selectionBackground: '#504945',
    black: '#282828', red: '#cc241d', green: '#98971a', yellow: '#d79921',
    blue: '#458588', magenta: '#b16286', cyan: '#689d6a', white: '#a89984',
    brightBlack: '#928374', brightRed: '#fb4934', brightGreen: '#b8bb26', brightYellow: '#fabd2f',
    brightBlue: '#83a598', brightMagenta: '#d3869b', brightCyan: '#8ec07c', brightWhite: '#ebdbb2',
  },
  'catppuccin': {
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    cursor: '#f5e0dc',
    selectionBackground: '#45475a',
    black: '#45475a', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af',
    blue: '#89b4fa', magenta: '#cba6f7', cyan: '#89dceb', white: '#bac2de',
    brightBlack: '#585b70', brightRed: '#f38ba8', brightGreen: '#a6e3a1', brightYellow: '#f9e2af',
    brightBlue: '#89b4fa', brightMagenta: '#cba6f7', brightCyan: '#89dceb', brightWhite: '#a6adc8',
  },
  'nord': {
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    selectionBackground: '#434c5e',
    black: '#3b4252', red: '#bf616a', green: '#a3be8c', yellow: '#ebcb8b',
    blue: '#81a1c1', magenta: '#b48ead', cyan: '#88c0d0', white: '#e5e9f0',
    brightBlack: '#4c566a', brightRed: '#bf616a', brightGreen: '#a3be8c', brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1', brightMagenta: '#b48ead', brightCyan: '#8fbcbb', brightWhite: '#eceff4',
  },
  'solarized-dark': {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#839496',
    selectionBackground: '#073642',
    black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900',
    blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5',
    brightBlack: '#002b36', brightRed: '#cb4b16', brightGreen: '#586e75', brightYellow: '#657b83',
    brightBlue: '#839496', brightMagenta: '#6c71c4', brightCyan: '#93a1a1', brightWhite: '#fdf6e3',
  },
  'vscode-light': {
    background: '#ffffff',
    foreground: '#333333',
    cursor: '#333333',
    selectionBackground: '#add6ff',
    black: '#000000', red: '#cd3131', green: '#00bc7c', yellow: '#949800',
    blue: '#0451a5', magenta: '#bc05bc', cyan: '#0598bc', white: '#555555',
    brightBlack: '#666666', brightRed: '#cd3131', brightGreen: '#14ce14', brightYellow: '#b5ba00',
    brightBlue: '#0451a5', brightMagenta: '#bc05bc', brightCyan: '#0598bc', brightWhite: '#a5a5a5',
  },
  'vscode-dark-experimental': {
    background: '#191A1B',
    foreground: '#bfbfbf',
    cursor: '#bfbfbf',
    selectionBackground: '#3994BC33',
    black: '#484f58', red: '#f48771', green: '#73c991', yellow: '#e5ba7d',
    blue: '#79c0ff', magenta: '#d2a8ff', cyan: '#48A0C7', white: '#bfbfbf',
    brightBlack: '#8b949e', brightRed: '#ffa198', brightGreen: '#7ee787', brightYellow: '#e5ba7d',
    brightBlue: '#a5d6ff', brightMagenta: '#d2a8ff', brightCyan: '#53A5CA', brightWhite: '#ffffff',
  },
};

export function getTerminalColors(themeId: string): TerminalColors {
  return TERMINAL_COLORS[themeId] ?? TERMINAL_COLORS['kiro-dark'];
}
