import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import type { TerminalColors } from '../../themes';

interface TerminalProps {
  id: number;
  active: boolean;
  cwd: string | null;
  fontSize: number;
  fontFamily: string;
  colors: TerminalColors;
}

export default function TerminalView({ id, active, cwd, fontSize, fontFamily, colors }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const initializedRef = useRef(false);
  const lineBufferRef = useRef('');

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const xterm = new XTerm({
      fontSize,
      fontFamily,
      cursorBlink: true,
      cursorStyle: 'bar',
      theme: colors,
      scrollback: 5000,
    });

    const fit = new FitAddon();
    xterm.loadAddon(fit);
    xterm.open(containerRef.current);

    xtermRef.current = xterm;
    fitRef.current = fit;

    let cleanup: (() => void) | null = null;

    const initTimeout = setTimeout(async () => {
      try { fit.fit(); } catch {}

      // Listeners para output del proceso
      const unlistenOutput = await listen<string>(`terminal-output-${id}`, (event) => {
        xterm.write(event.payload);
      });

      const unlistenExit = await listen<string>(`terminal-exit-${id}`, () => {
        xterm.writeln('\r\n\x1b[90m[Proceso terminado]\x1b[0m');
      });

      // Spawn
      try {
        await invoke('spawn_terminal', { id, cwd: cwd ?? undefined, rows: xterm.rows, cols: xterm.cols });
      } catch (err) {
        xterm.writeln(`\x1b[31mError: ${err}\x1b[0m`);
      }

      xterm.focus();

      cleanup = () => { unlistenOutput(); unlistenExit(); };
    }, 200);

    // Input: eco local + enviar línea completa al presionar Enter
    const onData = xterm.onData((data) => {
      if (data === '\r') {
        // Enter: enviar línea al proceso
        xterm.write('\r\n');
        invoke('write_terminal', { id, data: lineBufferRef.current + '\r' }).catch(() => {});
        lineBufferRef.current = '';
      } else if (data === '\x7f' || data === '\b') {
        // Backspace
        if (lineBufferRef.current.length > 0) {
          lineBufferRef.current = lineBufferRef.current.slice(0, -1);
          xterm.write('\b \b');
        }
      } else if (data === '\x03') {
        // Ctrl+C
        invoke('write_terminal', { id, data: '\x03' }).catch(() => {});
        lineBufferRef.current = '';
        xterm.write('^C\r\n');
      } else if (data >= ' ' || data === '\t') {
        // Caracteres imprimibles
        lineBufferRef.current += data;
        xterm.write(data);
      }
    });

    const observer = new ResizeObserver(() => {
      try { fit.fit(); } catch {}
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(initTimeout);
      onData.dispose();
      observer.disconnect();
      if (cleanup) cleanup();
      xterm.dispose();
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current) xtermRef.current.options.theme = colors;
  }, [colors]);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      fitRef.current?.fit();
    }
  }, [fontSize]);

  useEffect(() => {
    if (active && xtermRef.current) {
      setTimeout(() => {
        fitRef.current?.fit();
        xtermRef.current?.focus();
      }, 50);
    }
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="terminal-instance"
      style={{ display: active ? 'block' : 'none' }}
      onClick={() => xtermRef.current?.focus()}
    />
  );
}
