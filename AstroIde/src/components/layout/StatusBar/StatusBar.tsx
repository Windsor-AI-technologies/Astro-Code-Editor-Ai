import { GitBranch, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Tab } from '../../../types';
import { getLanguageLabel } from '../../../utils/language';
import './StatusBar.css';

interface StatusBarProps {
  activeTab: Tab | null;
  cursorPos: { line: number; column: number };
  isDirty: boolean;
  message: string | null;
}

export default function StatusBar({ activeTab, cursorPos, isDirty, message }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item">
          <GitBranch size={12} />
          <span>main</span>
        </span>
        {isDirty && (
          <span className="status-item status-dirty">
            <AlertCircle size={12} />
            <span>Sin guardar</span>
          </span>
        )}
        {!isDirty && activeTab && (
          <span className="status-item status-saved">
            <CheckCircle2 size={12} />
            <span>Guardado</span>
          </span>
        )}
        {message && (
          <span className="status-item status-message">{message}</span>
        )}
      </div>

      <div className="status-right">
        {activeTab && (
          <>
            <span className="status-item" title="Posición del cursor">
              Ln {cursorPos.line}, Col {cursorPos.column}
            </span>
            <span className="status-sep">|</span>
            <span className="status-item" title="Lenguaje">
              {getLanguageLabel(activeTab.language)}
            </span>
            <span className="status-sep">|</span>
            <span className="status-item" title="Codificación">UTF-8</span>
            <span className="status-sep">|</span>
            <span className="status-item" title="Saltos de línea">LF</span>
          </>
        )}
      </div>
    </div>
  );
}
