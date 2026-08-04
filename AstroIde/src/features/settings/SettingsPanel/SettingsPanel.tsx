import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import MonacoEditor, { BeforeMount } from '@monaco-editor/react';
import {
  Settings, Save, RotateCcw, AlertTriangle,
  CheckCircle2, ExternalLink, ChevronRight
} from 'lucide-react';
import type { AppSettings } from '../../../types';
import { DEFAULT_SETTINGS } from '../../../types';
import { THEMES, registerAllMonacoThemes } from '../../../themes';
import './SettingsPanel.css';

interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
  theme: string;
}

type SettingsMode = 'ui' | 'json';

interface SettingRow {
  key: keyof AppSettings;
  label: string;
  description: string;
  type: 'number' | 'boolean' | 'select' | 'text' | 'range';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  group: string;
}

const SETTING_ROWS: SettingRow[] = [
  // Editor
  { key: 'editor.fontSize', label: 'Tamaño de fuente', description: 'Tamaño en píxeles del texto del editor', type: 'number', min: 10, max: 32, group: 'Editor' },
  { key: 'editor.tabSize', label: 'Tamaño de tabulación', description: 'Número de espacios por tabulación', type: 'select', options: ['2', '4', '8'], group: 'Editor' },
  { key: 'editor.wordWrap', label: 'Ajuste de línea', description: 'Controla cómo se ajustan las líneas largas', type: 'select', options: ['off', 'on', 'wordWrapColumn', 'bounded'], group: 'Editor' },
  { key: 'editor.minimap', label: 'Minimap', description: 'Mostrar mapa de código en miniatura', type: 'boolean', group: 'Editor' },
  { key: 'editor.lineNumbers', label: 'Números de línea', description: 'Mostrar números de línea en el editor', type: 'select', options: ['on', 'off', 'relative'], group: 'Editor' },
  { key: 'editor.fontFamily', label: 'Familia de fuente', description: 'Fuente monoespaciada del editor', type: 'text', group: 'Editor' },
  { key: 'editor.fontLigatures', label: 'Ligaduras', description: 'Activa ligaduras tipográficas', type: 'boolean', group: 'Editor' },
  { key: 'editor.formatOnSave', label: 'Formatear al guardar', description: 'Formatea el archivo automáticamente al guardar', type: 'boolean', group: 'Editor' },
  { key: 'editor.cursorStyle', label: 'Estilo del cursor', description: 'Forma del cursor en el editor', type: 'select', options: ['line', 'block', 'underline'], group: 'Editor' },
  { key: 'editor.renderWhitespace', label: 'Mostrar espacios en blanco', description: 'Visualizar caracteres de espacio y tabulación', type: 'select', options: ['none', 'boundary', 'selection', 'all'], group: 'Editor' },
  // Workbench
  { key: 'workbench.sidebarWidth', label: 'Ancho del sidebar', description: 'Ancho en píxeles del panel lateral', type: 'range', min: 140, max: 500, step: 10, group: 'Workbench' },
  { key: 'workbench.sidebarPosition', label: 'Posición del sidebar', description: 'Lado donde aparece el explorador de archivos', type: 'select', options: ['left', 'right', 'top'], group: 'Workbench' },
  { key: 'workbench.acrylic', label: 'Efecto acrílico', description: 'Activa el fondo translúcido con blur en el sidebar', type: 'boolean', group: 'Workbench' },
  { key: 'workbench.acrylicOpacity', label: 'Opacidad acrílica', description: 'Qué tan transparente es el sidebar (0 = invisible, 1 = opaco)', type: 'range', min: 0.1, max: 0.9, step: 0.05, group: 'Workbench' },
  { key: 'workbench.colorTheme', label: 'Tema', description: 'Tema de colores de la interfaz y el editor', type: 'select', options: THEMES.map(t => t.id), group: 'Workbench' },
  { key: 'workbench.nativeFrame', label: 'Frame nativo', description: 'Usa la barra de título del sistema operativo (requiere reiniciar)', type: 'boolean', group: 'Workbench' },
  { key: 'workbench.aiPanelPosition', label: 'Panel IA (Astro)', description: 'Lado donde aparece el panel de Astro Black Hole', type: 'select', options: ['left', 'right'], group: 'Workbench' },
  { key: 'workbench.aiPanelWidth', label: 'Ancho panel IA', description: 'Ancho en píxeles del panel de IA', type: 'range', min: 250, max: 600, step: 10, group: 'Workbench' },
  { key: 'workbench.trafficLightPosition', label: 'Botones de ventana', description: 'Lado donde aparecen los botones de cerrar/minimizar/maximizar', type: 'select', options: ['left', 'right'], group: 'Workbench' },
];

export default function SettingsPanel({ settings, onSettingsChange, theme }: SettingsPanelProps) {
  const [mode, setMode] = useState<SettingsMode>('ui');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [settingsPath, setSettingsPath] = useState('');
  const [activeGroup, setActiveGroup] = useState('Editor');
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groups = [...new Set(SETTING_ROWS.map(r => r.group))];

  const handleBeforeMount: BeforeMount = (monaco: any) => {
    registerAllMonacoThemes(monaco);
  };

  useEffect(() => {
    setJsonText(JSON.stringify(settings, null, 2));
    invoke<string>('get_settings_path').then(setSettingsPath).catch(() => { });
  }, []);

  useEffect(() => {
    if (mode === 'json') {
      setJsonText(JSON.stringify(settings, null, 2));
      setJsonError(null);
    }
  }, [mode]);

  function handleJsonChange(value: string) {
    setJsonText(value);
    try {
      const parsed = JSON.parse(value);
      setJsonError(null);
      // Merge con defaults para no perder claves
      onSettingsChange({ ...DEFAULT_SETTINGS, ...parsed });
    } catch (e: any) {
      setJsonError(e.message);
    }
  }

  async function handleSave() {
    try {
      const toSave = mode === 'json' ? jsonText : JSON.stringify(settings, null, 2);
      await invoke('save_settings', { json: toSave });
      setSaved(true);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setJsonError(String(e));
    }
  }

  function handleReset() {
    if (!confirm('¿Restablecer todas las configuraciones a los valores por defecto?')) return;
    onSettingsChange({ ...DEFAULT_SETTINGS });
    setJsonText(JSON.stringify(DEFAULT_SETTINGS, null, 2));
  }

  function updateSetting(key: keyof AppSettings, value: any) {
    onSettingsChange({ ...settings, [key]: value });
  }

  const rowsByGroup = SETTING_ROWS.filter(r => r.group === activeGroup);

  return (
    <div className="settings-panel">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-title">
          <Settings size={16} />
          <span>Configuración</span>
        </div>
        <div className="settings-header-actions">
          <div className="settings-mode-toggle">
            <button
              className={mode === 'ui' ? 'active' : ''}
              onClick={() => setMode('ui')}
            >UI</button>
            <button
              className={mode === 'json' ? 'active' : ''}
              onClick={() => setMode('json')}
            >JSON</button>
          </div>
          <button
            className="settings-action-btn"
            onClick={handleReset}
            title="Restablecer defaults"
          >
            <RotateCcw size={14} />
          </button>
          <button
            className={`settings-action-btn save ${saved ? 'saved' : ''}`}
            onClick={handleSave}
            title="Guardar (Ctrl+S)"
          >
            {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            <span>{saved ? 'Guardado' : 'Guardar'}</span>
          </button>
        </div>
      </div>

      {/* Path hint */}
      {settingsPath && (
        <div className="settings-path">
          <ExternalLink size={11} />
          <span title={settingsPath}>{settingsPath}</span>
        </div>
      )}

      {mode === 'ui' ? (
        <div className="settings-body">
          {/* Sidebar de grupos */}
          <div className="settings-groups">
            {groups.map(g => (
              <button
                key={g}
                className={`settings-group-btn ${activeGroup === g ? 'active' : ''}`}
                onClick={() => setActiveGroup(g)}
              >
                <ChevronRight size={12} />
                {g}
              </button>
            ))}
          </div>

          {/* Filas de settings */}
          <div className="settings-rows">
            {rowsByGroup.map(row => (
              <div key={row.key} className="settings-row">
                <div className="settings-row-info">
                  <label className="settings-row-label">{row.label}</label>
                  <span className="settings-row-desc">{row.description}</span>
                  <code className="settings-row-key">{row.key}</code>
                </div>
                <div className="settings-row-control">
                  {row.type === 'boolean' && (
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(settings[row.key])}
                        onChange={e => updateSetting(row.key, e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  )}
                  {row.type === 'number' && (
                    <input
                      type="number"
                      className="settings-input"
                      value={Number(settings[row.key])}
                      min={row.min}
                      max={row.max}
                      onChange={e => updateSetting(row.key, Number(e.target.value))}
                    />
                  )}
                  {row.type === 'text' && (
                    <input
                      type="text"
                      className="settings-input wide"
                      value={String(settings[row.key])}
                      onChange={e => updateSetting(row.key, e.target.value)}
                    />
                  )}
                  {row.type === 'select' && (
                    <select
                      className="settings-select"
                      value={String(settings[row.key])}
                      onChange={e => updateSetting(row.key, e.target.value)}
                    >
                      {row.key === 'workbench.colorTheme'
                        ? THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                        : row.options!.map(o => <option key={o} value={o}>{o}</option>)
                      }
                    </select>
                  )}
                  {row.type === 'range' && (
                    <div className="settings-range-wrap">
                      <input
                        type="range"
                        className="settings-range"
                        value={Number(settings[row.key])}
                        min={row.min}
                        max={row.max}
                        step={row.step ?? 1}
                        onChange={e => updateSetting(row.key, Number(e.target.value))}
                      />
                      <span className="settings-range-val">
                        {Number(settings[row.key]).toFixed(row.step && row.step < 1 ? 2 : 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="settings-json-area">
          {jsonError && (
            <div className="settings-json-error">
              <AlertTriangle size={13} />
              <span>{jsonError}</span>
            </div>
          )}
          <MonacoEditor
            height="100%"
            language="json"
            value={jsonText}
            theme={theme}
            beforeMount={handleBeforeMount}
            onChange={v => handleJsonChange(v ?? '')}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              formatOnPaste: true,
              formatOnType: true,
              folding: true,
              padding: { top: 8 },
            }}
          />
        </div>
      )}
    </div>
  );
}
