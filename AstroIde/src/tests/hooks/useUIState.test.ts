import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIState } from '../../hooks/ui/useUIState';

describe('useUIState', () => {
  it('inicia con valores por defecto', () => {
    const { result } = renderHook(() => useUIState());

    expect(result.current.terminalVisible).toBe(false);
    expect(result.current.terminalHeight).toBe(250);
    expect(result.current.aiPanelVisible).toBe(true);
    expect(result.current.activeView).toBe('files');
    expect(result.current.sidebarVisible).toBe(true);
    expect(result.current.cmdPaletteOpen).toBe(false);
    expect(result.current.statusMessage).toBeNull();
  });

  it('toggleTerminal alterna visibilidad', () => {
    const { result } = renderHook(() => useUIState());

    act(() => result.current.toggleTerminal());
    expect(result.current.terminalVisible).toBe(true);

    act(() => result.current.toggleTerminal());
    expect(result.current.terminalVisible).toBe(false);
  });

  it('toggleAI alterna panel IA', () => {
    const { result } = renderHook(() => useUIState());

    act(() => result.current.toggleAI());
    expect(result.current.aiPanelVisible).toBe(false);
  });

  it('openView cambia vista y muestra sidebar', () => {
    const { result } = renderHook(() => useUIState());

    act(() => result.current.toggleSidebar()); // hide
    expect(result.current.sidebarVisible).toBe(false);

    act(() => result.current.openView('git'));
    expect(result.current.activeView).toBe('git');
    expect(result.current.sidebarVisible).toBe(true);
  });

  it('showMessage muestra y oculta mensaje', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useUIState());

    act(() => result.current.showMessage('Guardado', 1000));
    expect(result.current.statusMessage).toBe('Guardado');

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.statusMessage).toBeNull();

    vi.useRealTimers();
  });
});
