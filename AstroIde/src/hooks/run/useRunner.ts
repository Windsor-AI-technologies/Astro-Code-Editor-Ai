/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useState, useCallback, useEffect, useRef } from 'react';
import * as runner from '../../services/runner';
import { readFile } from '../../services/tauri';
import type { RunOutput } from '../../services/runner';

const REMOTE_CONFIRM_MESSAGE = (fileName: string) =>
  `No se encontró el .NET SDK en tu equipo.\n\n` +
  `¿Ejecutar "${fileName}" en la nube (Piston · emkc.org)?\n\n` +
  `Tu código se enviará a ese servicio externo para compilarlo y ejecutarlo.`;

/**
 * useRunner — ejecuta archivos sin depurar y expone su salida.
 * SRP: solo ejecución local/remota, salida y estado de ejecución.
 */
export function useRunner() {
  const [running, setRunning] = useState(false);
  const [inputAvailable, setInputAvailable] = useState(false);
  const [output, setOutput] = useState<RunOutput[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<number | null>(null);
  const exitedIdsRef = useRef<Set<number>>(new Set());

  // ── Eventos de ejecución ────────────────────────────────────────────────

  useEffect(() => {
    let disposed = false;
    let unlistenOutput: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;
    let unlistenInputReady: (() => void) | undefined;

    (async () => {
      const uo = await runner.onRunOutput((entry) => {
        setOutput(prev => [...prev, entry]);
        if (entry.id > 0) {
          sessionRef.current = entry.id;
          setRunning(true);
        }
      });
      if (disposed) { uo(); return; }
      unlistenOutput = uo;

      const ui = await runner.onRunInputReady((ready) => {
        if (exitedIdsRef.current.has(ready.id)) return;
        sessionRef.current = ready.id;
        setRunning(true);
        setInputAvailable(true);
      });
      if (disposed) { ui(); return; }
      unlistenInputReady = ui;

      const ue = await runner.onRunExit((exit) => {
        exitedIdsRef.current.add(exit.id);
        if (sessionRef.current === null || sessionRef.current === exit.id) {
          sessionRef.current = null;
          setRunning(false);
          setInputAvailable(false);
        }
        const ok = exit.code === null || exit.code === 0;
        setOutput(prev => [
          ...prev,
          {
            id: exit.id,
            stream: 'system',
            text: ok ? '✔ Proceso terminado (código 0)' : `✖ Proceso terminado (código ${exit.code ?? '?'})`,
          },
        ]);
      });
      if (disposed) { ue(); return; }
      unlistenExit = ue;
    })();

    return () => {
      disposed = true;
      unlistenOutput?.();
      unlistenExit?.();
      unlistenInputReady?.();
    };
  }, []);

  // ── Ejecutar ────────────────────────────────────────────────────────────

  const run = useCallback(async (file: string, cwd: string, content?: string) => {
    if (!file) {
      setError('No hay archivo activo para ejecutar');
      return;
    }

    setError(null);
    setOutput([]);
    setInputAvailable(false);
    sessionRef.current = null;

    try {
      const info = await runner.runnerInfo(file);

      if (info.kind === 'remote') {
        const source = content ?? (await readFile(file));
        const fileName = basename(file) || 'main.cs';

        if (!window.confirm(REMOTE_CONFIRM_MESSAGE(fileName))) {
          setOutput([{ id: 0, stream: 'system', text: 'Ejecución remota cancelada por el usuario' }]);
          return;
        }

        setRunning(true);
        setInputAvailable(false);
        setOutput([{ id: 0, stream: 'system', text: `▶ ${info.label} · ${fileName}` }]);

        const result = await runner.runRemote(info.language, fileName, source);
        const lines: RunOutput[] = [];
        if (result.stdout) lines.push(...toOutputLines(result.stdout, 'stdout'));
        if (result.stderr) lines.push(...toOutputLines(result.stderr, 'stderr'));
        const ok = result.code === null || result.code === 0;
        lines.push({
          id: 0,
          stream: 'system',
          text: ok ? '✔ Proceso terminado (código 0)' : `✖ Proceso terminado (código ${result.code ?? '?'})`,
        });
        setOutput(prev => [...prev, ...lines]);
        setRunning(false);
        setInputAvailable(false);
        return;
      }

      if (info.kind !== 'local') {
        throw new Error(info.command || `No se puede ejecutar ${file}`);
      }

      setRunning(true);
      const id = await runner.runFile(file, cwd);

      if (exitedIdsRef.current.has(id)) {
        exitedIdsRef.current.delete(id);
      } else {
        if (sessionRef.current === null) sessionRef.current = id;
        setInputAvailable(true);
      }
    } catch (e) {
      const message = String(e);
      setError(message);
      setRunning(false);
      setInputAvailable(false);
      sessionRef.current = null;
      setOutput(prev => [...prev, { id: 0, stream: 'stderr', text: message }]);
    }
  }, []);

  // ── Detener ─────────────────────────────────────────────────────────────

  const stop = useCallback(async () => {
    try {
      await runner.runStop(sessionRef.current ?? undefined);
    } catch { /* ya terminó */ }
    sessionRef.current = null;
    setRunning(false);
    setInputAvailable(false);
  }, []);

  const sendInput = useCallback(async (input: string) => {
    const id = sessionRef.current;
    if (id === null) {
      setError('No hay un proceso local esperando entrada');
      return;
    }

    setError(null);
    setOutput(prev => [...prev, { id, stream: 'stdin', text: `${input}\n` }]);

    try {
      await runner.runWriteStdin(id, `${input}\n`);
    } catch (e) {
      const message = String(e);
      setError(message);
      setOutput(prev => [...prev, { id, stream: 'stderr', text: message }]);
    }
  }, []);

  const clearOutput = useCallback(() => setOutput([]), []);

  // Matar procesos al desmontar el hook (cierre de la app)
  useEffect(() => {
    return () => {
      runner.runStop().catch(() => {});
    };
  }, []);

  return { running, inputAvailable, output, error, run, stop, clearOutput, sendInput };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function basename(file: string): string {
  return file.split(/[\\/]/).pop() ?? file;
}

function toOutputLines(text: string, stream: 'stdout' | 'stderr'): RunOutput[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => ({ id: 0, stream, text: `${line}\n` }));
}
