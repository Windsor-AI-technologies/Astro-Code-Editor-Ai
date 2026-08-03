import { GitBranch } from 'lucide-react';
import './GitPanel.css';

export default function GitPanel() {
  return (
    <div className="git-panel">
      <div className="git-header">
        <span className="git-title">CONTROL DE CÓDIGO FUENTE</span>
      </div>

      <div className="git-content">
        <div className="git-placeholder">
          <GitBranch size={32} className="git-placeholder-icon" />
          <p className="git-placeholder-text">
            Inicializa un repositorio o abre una carpeta con git
          </p>
          <button className="git-init-btn">
            Inicializar repositorio
          </button>
        </div>
      </div>
    </div>
  );
}
