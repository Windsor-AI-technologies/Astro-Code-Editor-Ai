import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import * as api from '../../services/tauri';

vi.mocked(invoke);

describe('services/tauri', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('readFile invoca con path correcto', async () => {
    vi.mocked(invoke).mockResolvedValue('hello world');

    const result = await api.readFile('/test.ts');
    expect(invoke).toHaveBeenCalledWith('read_file', { path: '/test.ts' });
    expect(result).toBe('hello world');
  });

  it('writeFile invoca con path y content', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await api.writeFile('/test.ts', 'content');
    expect(invoke).toHaveBeenCalledWith('write_file', { path: '/test.ts', content: 'content' });
  });

  it('readDir invoca y retorna entries', async () => {
    const entries = [{ name: 'file.ts', path: '/file.ts', is_dir: false }];
    vi.mocked(invoke).mockResolvedValue(entries);

    const result = await api.readDir('/project');
    expect(invoke).toHaveBeenCalledWith('read_dir', { path: '/project' });
    expect(result).toEqual(entries);
  });

  it('movePath invoca con source y destFolder', async () => {
    vi.mocked(invoke).mockResolvedValue('/dest/file.ts');

    const result = await api.movePath('/src/file.ts', '/dest');
    expect(invoke).toHaveBeenCalledWith('move_path', { source: '/src/file.ts', destFolder: '/dest' });
    expect(result).toBe('/dest/file.ts');
  });

  it('killTerminal invoca con id', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await api.killTerminal(5);
    expect(invoke).toHaveBeenCalledWith('kill_terminal', { id: 5 });
  });

  it('saveSettings invoca con json', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await api.saveSettings('{"key":"val"}');
    expect(invoke).toHaveBeenCalledWith('save_settings', { json: '{"key":"val"}' });
  });
});
