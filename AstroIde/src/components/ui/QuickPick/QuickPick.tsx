/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Search, ListFilter, TextCursorInput } from 'lucide-react';
import {
  cancelQuickPick,
  getQuickPickState,
  resolveQuickPick,
  subscribeQuickPick,
} from '../../../services/ui/quickPick';
import type { QuickPickItem } from '../../../services/ui/quickPick';
import './QuickPick.css';

export default function QuickPick() {
  const state = useSyncExternalStore(subscribeQuickPick, getQuickPickState);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isInput = state?.kind === 'input';

  useEffect(() => {
    if (!state) return;
    setSearch(state.kind === 'input' ? (state.options.value ?? '') : '');
    setSelectedIndex(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [state]);

  const items: QuickPickItem[] = useMemo(() => {
    if (!state || state.kind !== 'pick') return [];
    const query = search.trim().toLowerCase();
    if (!query) return state.options.items;
    return state.options.items.filter(item =>
      item.label.toLowerCase().includes(query) ||
      (item.description?.toLowerCase().includes(query) ?? false) ||
      (item.detail?.toLowerCase().includes(query) ?? false),
    );
  }, [state, search]);

  useEffect(() => {
    const item = listRef.current?.querySelector('.qp-item.selected') as HTMLElement | null;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!state) return null;

  const validationError = isInput
    ? (state.options.validate?.(search) ?? null)
    : null;

  function resolveItem(item: QuickPickItem) {
    resolveQuickPick(item);
  }

  function confirmInput() {
    if (!state || state.kind !== 'input') return;
    if (validationError) return;
    resolveQuickPick(search.trim());
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelQuickPick();
      return;
    }

    if (state?.kind === 'input') {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmInput();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(index => Math.min(index + 1, items.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(index => Math.max(index - 1, 0));
    }
    if (event.key === 'Enter' && items[selectedIndex]) {
      event.preventDefault();
      resolveItem(items[selectedIndex]);
    }
  }

  const title = state.options.title;

  return createPortal(
    <div className="qp-overlay" onMouseDown={() => cancelQuickPick()}>
      <div
        className="qp-palette"
        onMouseDown={event => event.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="qp-title">{title}</div>

        <div className="qp-input-wrap">
          <Search size={14} className="qp-input-icon" />
          <input
            ref={inputRef}
            className="qp-input"
            placeholder={
              state.kind === 'pick'
                ? (state.options.placeholder ?? 'Escribe para filtrar...')
                : (state.options.placeholder ?? 'Escribe un valor...')
            }
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            aria-label={title}
          />
          <div className="qp-input-badge">
            {state.kind === 'pick' ? <ListFilter size={12} /> : <TextCursorInput size={12} />}
          </div>
        </div>

        {state.kind === 'input' ? (
          <div className="qp-input-help">
            {validationError
              ? <span className="qp-validation-error">{validationError}</span>
              : (state.options.prompt ?? 'Presiona Enter para confirmar · Esc para cancelar')}
          </div>
        ) : (
          <div className="qp-list" ref={listRef}>
            {items.map((item, index) => (
              <button
                key={`${item.label}-${index}`}
                className={`qp-item ${index === selectedIndex ? 'selected' : ''}`}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => resolveItem(item)}
              >
                <span className="qp-item-label">{item.label}</span>
                {item.description && <span className="qp-item-description">{item.description}</span>}
                {item.detail && <span className="qp-item-detail">{item.detail}</span>}
              </button>
            ))}

            {items.length === 0 && (
              <div className="qp-empty">No hay opciones que coincidan</div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
