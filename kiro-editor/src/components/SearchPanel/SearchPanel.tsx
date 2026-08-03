import { useState } from 'react';
import { Search, Replace, ChevronDown, ChevronRight, File } from 'lucide-react';
import './SearchPanel.css';

interface SearchResult {
  file: string;
  line: number;
  preview: string;
}

export default function SearchPanel() {
  const [query, setQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [results] = useState<SearchResult[]>([]);

  return (
    <div className="search-panel">
      <div className="search-header">
        <span className="search-title">BUSCAR</span>
      </div>

      <div className="search-inputs">
        <div className="search-row">
          <button
            className="search-toggle-replace"
            onClick={() => setShowReplace(v => !v)}
            title="Alternar reemplazo"
          >
            {showReplace ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          <div className="search-input-wrap">
            <Search size={13} className="search-icon" />
            <input
              className="search-input"
              type="text"
              placeholder="Buscar"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        {showReplace && (
          <div className="search-row replace-row">
            <div className="search-toggle-replace" />
            <div className="search-input-wrap">
              <Replace size={13} className="search-icon" />
              <input
                className="search-input"
                type="text"
                placeholder="Reemplazar"
                value={replaceValue}
                onChange={e => setReplaceValue(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="search-results">
        {query.length === 0 && (
          <div className="search-empty">
            Escribe para buscar en los archivos del proyecto
          </div>
        )}
        {query.length > 0 && results.length === 0 && (
          <div className="search-empty">
            No se encontraron resultados para "{query}"
          </div>
        )}
        {results.map((r, i) => (
          <div key={i} className="search-result-item">
            <File size={13} className="result-file-icon" />
            <span className="result-file">{r.file}</span>
            <span className="result-line">:{r.line}</span>
            <span className="result-preview">{r.preview}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
