import { useState } from 'react';
import { Search, Puzzle } from 'lucide-react';
import './ExtensionsPanel.css';

export default function ExtensionsPanel() {
  const [query, setQuery] = useState('');

  return (
    <div className="extensions-panel">
      <div className="extensions-header">
        <span className="extensions-title">EXTENSIONES</span>
      </div>

      <div className="extensions-search">
        <div className="extensions-input-wrap">
          <Search size={13} className="extensions-search-icon" />
          <input
            className="extensions-input"
            type="text"
            placeholder="Buscar extensiones..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="extensions-content">
        <div className="extensions-placeholder">
          <Puzzle size={32} className="extensions-placeholder-icon" />
          <p className="extensions-placeholder-text">
            El marketplace de extensiones estará disponible pronto
          </p>
        </div>
      </div>
    </div>
  );
}
