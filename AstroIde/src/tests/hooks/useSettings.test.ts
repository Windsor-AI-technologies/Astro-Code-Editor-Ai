import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettings } from '../../hooks/useSettings';
import { DEFAULT_SETTINGS } from '../../types';

// Mock api module
vi.mock('../../services/tauri', () => ({
  loadSettings: vi.fn(() => Promise.resolve('{}')),
  saveSettings: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../themes', () => ({
  applyTheme: vi.fn(),
}));

describe('useSettings', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inicia con DEFAULT_SETTINGS', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('settingsOpen inicia en false', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settingsOpen).toBe(false);
  });

  it('updateSetting actualiza una clave', () => {
    const { result } = renderHook(() => useSettings());

    act(() => result.current.updateSetting('editor.fontSize', 20));
    expect(result.current.settings['editor.fontSize']).toBe(20);
  });

  it('themeId refleja colorTheme', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.themeId).toBe(DEFAULT_SETTINGS['workbench.colorTheme']);

    act(() => result.current.updateSetting('workbench.colorTheme', 'dracula'));
    expect(result.current.themeId).toBe('dracula');
  });

  it('saveSettings retorna true en exito', async () => {
    const { result } = renderHook(() => useSettings());

    let ok: boolean = false;
    await act(async () => { ok = await result.current.saveSettings(); });
    expect(ok).toBe(true);
  });
});
