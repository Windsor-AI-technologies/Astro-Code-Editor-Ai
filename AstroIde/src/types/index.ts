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
  'workbench.nativeFrame': boolean;
  'workbench.aiPanelPosition': 'left' | 'right';
  'workbench.aiPanelWidth': number;
  'workbench.trafficLightPosition': 'left' | 'right';
  'workbench.iconTheme': 'material' | 'none';
}

export const DEFAULT_SETTINGS: AppSettings = {
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
  'workbench.nativeFrame': false,
  'workbench.aiPanelPosition': 'right',
  'workbench.aiPanelWidth': 320,
  'workbench.trafficLightPosition': 'left',
  'workbench.iconTheme': 'material',
};

export function settingsToEditorOptions(s: AppSettings) {
  return {
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

// ── AI Panel Types ──────────────────────────────────────────────────────────

export type AIMode = 'engineer' | 'ask' | 'plan';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode: AIMode;
  model: string;
}

export const AI_MODES: { id: AIMode; name: string; icon: string; description: string }[] = [
  { id: 'engineer', name: 'Engineer', icon: '⚙️', description: 'Escribe y modifica código directamente' },
  { id: 'ask', name: 'Ask', icon: '💬', description: 'Pregunta sobre código, conceptos o errores' },
  { id: 'plan', name: 'Plan', icon: '📋', description: 'Planifica tareas y arquitectura paso a paso' },
];

export const AI_MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Más capaz, multimodal' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Rápido y económico' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic', description: 'Equilibrio velocidad/calidad' },
  { id: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'Anthropic', description: 'Máxima calidad' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', description: 'Context largo, razonamiento' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', description: 'Open source, código' },
  { id: 'local-ollama', name: 'Ollama (Local)', provider: 'Local', description: 'Modelo local sin API key' },
];
