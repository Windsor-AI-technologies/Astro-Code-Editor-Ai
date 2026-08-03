import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Play } from 'lucide-react';
import './DebugPanel.css';

interface DebugPanelProps {
  cwd: string | null;
  onRunProject: (command: string) => void;
}

const CONFIGURATIONS = [
  { label: 'Auto-detectar', value: '__auto__' },
  { label: 'npm start', value: 'npm start' },
  { label: 'npm run dev', value: 'npm run dev' },
  { label: 'cargo run', value: 'cargo run' },
  { label: 'python main.py', value: 'python main.py' },
  { label: 'Comando personalizado...', value: '__custom__' },
];

export default function DebugPanel({ cwd, onRunProject }: DebugPanelProps) {
  const [selectedConfig, setSelectedConfig] = useState('__auto__');
  const [customCommand, setCustomCommand] = useState('');
  const [detectedCommand, setDetectedCommand] = useState<string | null>(null);

  useEffect(() => {
    if (cwd) {
      invoke<string>('detect_project_type', { path: cwd })
        .then(cmd => setDetectedCommand(cmd))
        .catch(() => setDetectedCommand(null));
    }
  }, [cwd]);

  function handleRun() {
    let command: string;
    if (selectedConfig === '__auto__') {
      command = detectedCommand ?? 'echo No project detected';
    } else if (selectedConfig === '__custom__') {
      command = customCommand || 'echo No command specified';
    } else {
      command = selectedConfig;
    }
    onRunProject(command);
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <span className="debug-title">EJECUTAR Y DEPURAR</span>
      </div>

      <div className="debug-content">
        <button className="debug-run-btn" onClick={handleRun}>
          <Play size={14} />
          <span>Ejecutar proyecto</span>
        </button>

        <div className="debug-config">
          <label className="debug-label">Configuración</label>
          <select
            className="debug-select"
            value={selectedConfig}
            onChange={e => setSelectedConfig(e.target.value)}
          >
            {CONFIGURATIONS.map(c => (
              <option key={c.value} value={c.value}>
                {c.label}
                {c.value === '__auto__' && detectedCommand ? ` (${detectedCommand})` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedConfig === '__custom__' && (
          <div className="debug-custom">
            <input
              className="debug-custom-input"
              type="text"
              placeholder="Escribe un comando..."
              value={customCommand}
              onChange={e => setCustomCommand(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRun(); }}
            />
          </div>
        )}

        {selectedConfig === '__auto__' && (
          <div className="debug-detected">
            {cwd ? (
              detectedCommand ? (
                <span className="debug-detected-text">
                  Detectado: <code>{detectedCommand}</code>
                </span>
              ) : (
                <span className="debug-detected-text dim">
                  No se detectó tipo de proyecto
                </span>
              )
            ) : (
              <span className="debug-detected-text dim">
                Abre una carpeta para auto-detectar
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
