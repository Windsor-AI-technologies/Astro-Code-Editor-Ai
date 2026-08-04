import { useState, useEffect, useRef } from 'react';
import { Search, Palette } from 'lucide-react';
import { THEMES, applyTheme } from '../../../themes';
import './CommandPalette.css';

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

export default function CommandPalette({ visible, onClose, currentTheme, onThemeChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const originalThemeRef = useRef(currentTheme);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = THEMES.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  // Al abrir: guardar tema original, focus input
  useEffect(() => {
    if (visible) {
      originalThemeRef.current = currentTheme;
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  // Preview: aplicar tema al navegar con flechas
  useEffect(() => {
    if (visible && filtered[selectedIndex]) {
      applyTheme(filtered[selectedIndex].id);
    }
  }, [selectedIndex, visible, filtered.length]);

  // Scroll al item seleccionado
  useEffect(() => {
    const item = listRef.current?.querySelector('.cmd-item.selected') as HTMLElement;
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  function handleClose() {
    // Restaurar tema original al cancelar
    applyTheme(originalThemeRef.current);
    onClose();
  }

  function handleConfirm(themeId: string) {
    onThemeChange(themeId);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { handleClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleConfirm(filtered[selectedIndex].id);
    }
  }

  if (!visible) return null;

  return (
    <div className="cmd-overlay" onClick={handleClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <Search size={14} className="cmd-input-icon" />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Select Color Theme (type to filter)"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <div className="cmd-input-badge"><Palette size={12} /></div>
        </div>

        <div className="cmd-list" ref={listRef}>
          {filtered.map((theme, idx) => (
            <button
              key={theme.id}
              className={`cmd-item ${idx === selectedIndex ? 'selected' : ''} ${theme.id === currentTheme ? 'current' : ''}`}
              onClick={() => handleConfirm(theme.id)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <span className="cmd-item-dot" style={{ background: theme.vars['--accent'] }} />
              <span className="cmd-item-name">{theme.name}</span>
              <span className="cmd-item-type">{theme.base === 'vs' ? 'light' : 'dark'}</span>
              {theme.id === currentTheme && <span className="cmd-item-badge">activo</span>}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="cmd-empty">No se encontraron temas</div>
          )}
        </div>
      </div>
    </div>
  );
}
