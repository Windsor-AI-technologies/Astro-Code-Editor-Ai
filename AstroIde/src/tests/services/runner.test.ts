/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import * as runner from '../../services/runner';

vi.mocked(invoke);

describe('services/runner', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('runnerInfo invoca runner_info con el archivo', async () => {
    vi.mocked(invoke).mockResolvedValue({
      kind: 'local', label: 'Node.js', command: 'node app.js', language: '',
    });

    const info = await runner.runnerInfo('/tmp/app.js');

    expect(invoke).toHaveBeenCalledWith('runner_info', { file: '/tmp/app.js' });
    expect(info.kind).toBe('local');
  });

  it('runFile invoca run_file con archivo y cwd y devuelve el id', async () => {
    vi.mocked(invoke).mockResolvedValue(3);

    const id = await runner.runFile('/tmp/app.js', '/tmp');

    expect(invoke).toHaveBeenCalledWith('run_file', { file: '/tmp/app.js', cwd: '/tmp' });
    expect(id).toBe(3);
  });

  it('runStop sin id envía null', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await runner.runStop();

    expect(invoke).toHaveBeenCalledWith('run_stop', { id: null });
  });

  it('runStop con id concreto lo envía', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await runner.runStop(7);

    expect(invoke).toHaveBeenCalledWith('run_stop', { id: 7 });
  });

  it('runWriteStdin envía el id y el texto al proceso', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await runner.runWriteStdin(4, '42\n');

    expect(invoke).toHaveBeenCalledWith('run_stdin', { id: 4, input: '42\n' });
  });

  it('runRemote envía lenguaje, nombre de archivo y código', async () => {
    vi.mocked(invoke).mockResolvedValue({ stdout: 'hola', stderr: '', code: 0 });

    const result = await runner.runRemote('csharp', 'Main.cs', 'Console.WriteLine();');

    expect(invoke).toHaveBeenCalledWith('run_remote', {
      language: 'csharp',
      version: '*',
      fileName: 'Main.cs',
      code: 'Console.WriteLine();',
    });
    expect(result.stdout).toBe('hola');
  });

  it('dotnetNew valida la llamada a dotnet_new', async () => {
    vi.mocked(invoke).mockResolvedValue('ok');

    await runner.dotnetNew('console', 'MiApp', '/tmp/MiApp');

    expect(invoke).toHaveBeenCalledWith('dotnet_new', {
      template: 'console',
      name: 'MiApp',
      outputDir: '/tmp/MiApp',
    });
  });

  it('dotnetRunAction invoca dotnet_run_action', async () => {
    vi.mocked(invoke).mockResolvedValue(1);

    await runner.dotnetRunAction('build', '/tmp/proyecto');

    expect(invoke).toHaveBeenCalledWith('dotnet_run_action', {
      action: 'build',
      cwd: '/tmp/proyecto',
    });
  });
});
