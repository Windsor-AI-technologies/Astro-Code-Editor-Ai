import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabs } from '../../hooks/useTabs';

vi.mock('../../services/tauri', () => ({
  readFile: vi.fn(() => Promise.resolve('file content')),
}));

vi.mock('../../utils/language', () => ({
  getLanguageFromPath: vi.fn(() => 'typescript'),
}));

describe('useTabs', () => {
  const editorRef = { current: null };

  beforeEach(() => { vi.clearAllMocks(); });

  it('inicia sin tabs', () => {
    const { result } = renderHook(() => useTabs(editorRef as any));
    expect(result.current.tabs).toEqual([]);
    expect(result.current.activeTabId).toBeNull();
    expect(result.current.activeTab).toBeNull();
  });

  it('newFile crea tab sin-titulo', () => {
    const { result } = renderHook(() => useTabs(editorRef as any));

    act(() => result.current.newFile());

    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].name).toBe('sin-titulo');
    expect(result.current.tabs[0].isDirty).toBe(true);
    expect(result.current.activeTabId).toBe(result.current.tabs[0].id);
  });

  it('openFile abre archivo y lo activa', async () => {
    const { result } = renderHook(() => useTabs(editorRef as any));

    let ok = false;
    await act(async () => { ok = await result.current.openFile('/test/file.ts'); });

    expect(ok).toBe(true);
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].path).toBe('/test/file.ts');
    expect(result.current.tabs[0].content).toBe('file content');
    expect(result.current.tabs[0].language).toBe('typescript');
    expect(result.current.activeTab?.path).toBe('/test/file.ts');
  });

  it('openFile no duplica tabs con mismo path', async () => {
    const { result } = renderHook(() => useTabs(editorRef as any));

    await act(async () => { await result.current.openFile('/test/file.ts'); });
    await act(async () => { await result.current.openFile('/test/file.ts'); });

    expect(result.current.tabs).toHaveLength(1);
  });

  it('closeTab elimina tab y activa la anterior', () => {
    const { result } = renderHook(() => useTabs(editorRef as any));

    // Crear 2 tabs (newFile las crea dirty)
    act(() => result.current.newFile());
    act(() => result.current.newFile());

    const id1 = result.current.tabs[0].id;
    const id2 = result.current.tabs[1].id;

    // Marcar como guardados (para que closeTab no pida confirm)
    act(() => result.current.markSaved(id1, ''));
    act(() => result.current.markSaved(id2, ''));

    expect(result.current.activeTabId).toBe(id2);

    // Cerrar tab activa
    act(() => result.current.closeTab(id2));
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.activeTabId).toBe(id1);
  });

  it('markDirty marca tab como dirty una sola vez', () => {
    const { result } = renderHook(() => useTabs(editorRef as any));

    act(() => result.current.newFile());
    // newFile ya crea dirty, reseteamos
    act(() => result.current.markSaved(result.current.tabs[0].id, ''));

    expect(result.current.tabs[0].isDirty).toBe(false);

    act(() => result.current.markDirty());
    expect(result.current.tabs[0].isDirty).toBe(true);

    // Segunda llamada no causa re-render (no cambia state)
    const tabsBefore = result.current.tabs;
    act(() => result.current.markDirty());
    expect(result.current.tabs).toBe(tabsBefore);
  });

  it('clearAll limpia todo', () => {
    const { result } = renderHook(() => useTabs(editorRef as any));

    act(() => result.current.newFile());
    act(() => result.current.newFile());
    act(() => result.current.clearAll());

    expect(result.current.tabs).toEqual([]);
    expect(result.current.activeTabId).toBeNull();
  });

  it('changeLanguage cambia lenguaje del tab activo', () => {
    const { result } = renderHook(() => useTabs(editorRef as any));

    act(() => result.current.newFile());
    act(() => result.current.changeLanguage('python'));

    expect(result.current.tabs[0].language).toBe('python');
  });
});
