
export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

export interface Tab {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export interface AppSettings {
  // Editor
  'editor.lineHeight': number;
  'editor.fontSize': number;
  'editor.tabSize': number;
  'editor.wordWrap': 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  'editor.minimap': boolean;
  'editor.lineNumbers': 'on' | 'off' | 'relative';
  'editor.fontFamily': string;
  'editor.fontLigatures': boolean;
  'editor.formatOnSave': boolean;
  'editor.cursorStyle': 'line' | 'block' | 'underline';
  'editor.renderWhitespace': 'none' | 'boundary' | 'selection' | 'all';
  // Workbench
  'workbench.colorTheme': string;        // id del tema (kiro-dark, dracula, etc.)
  'workbench.sidebarWidth': number;
  'workbench.sidebarPosition': 'left' | 'right' | 'top' ;
  'workbench.acrylic': boolean;
  'workbench.acrylicOpacity': number;
  'workbench.spacetimeGrid': boolean;
  'workbench.nativeFrame': boolean;
  'workbench.aiPanelPosition': 'left' | 'right';
  'workbench.aiPanelWidth': number;
  'workbench.trafficLightPosition': 'left' | 'right';
  'workbench.iconTheme': 'material' | 'none';
}

export const DEFAULT_SETTINGS: AppSettings = {
  'editor.lineHeight': 20,
  'editor.fontSize': 14,
  'editor.tabSize': 2,
  'editor.wordWrap': 'off',
  'editor.minimap': true,
  'editor.lineNumbers': 'on',
  'editor.fontFamily': "'Cascadia Code', 'Fira Code', Consolas, monospace",
  'editor.fontLigatures': true,
  'editor.formatOnSave': false,
  'editor.cursorStyle': 'line',
  'editor.renderWhitespace': 'selection',
  'workbench.colorTheme': 'kiro-dark',
  'workbench.sidebarWidth': 220,
  'workbench.sidebarPosition': 'right',
  'workbench.acrylic': true,
  'workbench.acrylicOpacity': 0.35,
  'workbench.spacetimeGrid': false,
  'workbench.nativeFrame': false,
  'workbench.aiPanelPosition': 'right',
  'workbench.aiPanelWidth': 320,
  'workbench.trafficLightPosition': 'left',
  'workbench.iconTheme': 'material',
};

export function settingsToEditorOptions(s: AppSettings) {
  return {
    lineHeight: s['editor.lineHeight'],
    fontSize: s['editor.fontSize'],
    tabSize: s['editor.tabSize'],
    wordWrap: s['editor.wordWrap'],
    minimap: { enabled: s['editor.minimap'] },
    lineNumbers: s['editor.lineNumbers'],
    fontFamily: s['editor.fontFamily'],
    fontLigatures: s['editor.fontLigatures'],
    cursorStyle: s['editor.cursorStyle'],
    renderWhitespace: s['editor.renderWhitespace'],
  };
}

// ── Extensions / Marketplace Types ─────────────────────────────────────────

export interface VSXExtension {
  namespace: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  averageRating?: number;
  reviewCount?: number;
  downloadCount?: number;
  timestamp?: string;
  icon?: string;
  publisher: {
    loginName: string;
    displayName?: string;
  };
  tags?: string[];
  categories?: string[];
}

export interface VSXSearchResult {
  offset: number;
  totalSize: number;
  extensions: VSXExtension[];
}

export interface InstalledExtension {
  id: string;       // namespace.name
  name: string;
  displayName: string;
  version: string;
  description: string;
  icon?: string;
  publisher: string;
  enabled: boolean;
  installPath: string;
}

export type ExtensionInstallStatus = 'idle' | 'downloading' | 'installing' | 'installed' | 'error';
