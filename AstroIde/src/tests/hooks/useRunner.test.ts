/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRunner } from '../../hooks/run/useRunner';
import type { RunExit, RunInputReady, RunOutput } from '../../services/runner';

const runnerMocks = vi.hoisted(() => ({
  runnerInfo: vi.fn(),
  runFile: vi.fn(),
  runRemote: vi.fn(),
  runStop: vi.fn(),
  runWriteStdin: vi.fn(),
  onRunOutput: vi.fn(),
  onRunExit: vi.fn(),
  onRunInputReady: vi.fn(),
}));

vi.mock('../../services/runner', () => runnerMocks);

vi.mock('../../services/tauri', () => ({
  readFile: vi.fn(() => Promise.resolve('Console.ReadLine();')),
}));

describe('useRunner', () => {
  let outputHandler: ((entry: RunOutput) => void) | undefined;
  let exitHandler: ((exit: RunExit) => void) | undefined;
  let inputReadyHandler: ((ready: RunInputReady) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    outputHandler = undefined;
    exitHandler = undefined;
    inputReadyHandler = undefined;

    runnerMocks.onRunOutput.mockImplementation(async (callback: (entry: RunOutput) => void) => {
      outputHandler = callback;
      return () => {};
    });
    runnerMocks.onRunExit.mockImplementation(async (callback: (exit: RunExit) => void) => {
      exitHandler = callback;
      return () => {};
    });
    runnerMocks.onRunInputReady.mockImplementation(async (callback: (ready: RunInputReady) => void) => {
      inputReadyHandler = callback;
      return () => {};
    });
    runnerMocks.runStop.mockResolvedValue(undefined);
    runnerMocks.runWriteStdin.mockResolvedValue(undefined);
  });

  it('habilita stdin tras iniciar una ejecución local y lo cierra al terminar', async () => {
    runnerMocks.runnerInfo.mockResolvedValue({
      kind: 'local', label: 'C# (.NET 10+)', command: 'dotnet run Main.cs', language: '',
    });
    runnerMocks.runFile.mockResolvedValue(7);

    const { result } = renderHook(() => useRunner());
    await act(async () => {});

    await act(async () => {
      await result.current.run('/tmp/Main.cs', '/tmp');
    });

    expect(result.current.running).toBe(true);
    expect(result.current.inputAvailable).toBe(true);

    await act(async () => {
      await result.current.sendInput('42');
    });

    expect(runnerMocks.runWriteStdin).toHaveBeenCalledWith(7, '42\n');
    expect(result.current.output).toContainEqual({ id: 7, stream: 'stdin', text: '42\n' });

    act(() => exitHandler?.({ id: 7, code: 0 }));

    expect(result.current.running).toBe(false);
    expect(result.current.inputAvailable).toBe(false);
  });

  it('detecta una ejecución externa (dotnet run) por sus eventos de salida', async () => {
    const { result } = renderHook(() => useRunner());
    await act(async () => {});

    act(() => outputHandler?.({ id: 12, stream: 'stdout', text: 'Ingrese la zona: ' }));
    act(() => inputReadyHandler?.({ id: 12 }));

    expect(result.current.running).toBe(true);
    expect(result.current.inputAvailable).toBe(true);

    await act(async () => {
      await result.current.sendInput('L');
    });

    expect(runnerMocks.runWriteStdin).toHaveBeenCalledWith(12, 'L\n');

    act(() => exitHandler?.({ id: 12, code: 0 }));

    expect(result.current.running).toBe(false);
    expect(result.current.inputAvailable).toBe(false);
  });

  it('no habilita entrada interactiva para ejecución remota', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    runnerMocks.runnerInfo.mockResolvedValue({
      kind: 'remote', label: 'C# (Piston)', command: 'Piston', language: 'csharp',
    });
    runnerMocks.runRemote.mockResolvedValue({ stdout: 'ok', stderr: '', code: 0 });

    const { result } = renderHook(() => useRunner());
    await act(async () => {});

    await act(async () => {
      await result.current.run('/tmp/Main.cs', '/tmp');
    });

    expect(runnerMocks.runRemote).toHaveBeenCalled();
    expect(result.current.running).toBe(false);
    expect(result.current.inputAvailable).toBe(false);
  });

  it('reporta un error si se envía entrada sin proceso activo', async () => {
    const { result } = renderHook(() => useRunner());
    await act(async () => {});

    await act(async () => {
      await result.current.sendInput('42');
    });

    expect(result.current.error).toContain('No hay un proceso local');
  });
});
