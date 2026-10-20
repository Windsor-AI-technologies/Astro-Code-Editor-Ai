/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';

// ── LSP Client — Bridge between Monaco and Rust LSP backend ──────────────────

export interface LspPosition {
  line: number;
  character: number;
}

export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

export interface LspCompletionItem {
  label: string | { label: string; detail?: string; description?: string };
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  insertText?: string;
  insertTextFormat?: number; // 1 = PlainText, 2 = Snippet
  textEdit?: { range?: LspRange; insert?: LspRange; replace?: LspRange; newText: string };
  sortText?: string;
  filterText?: string;
  commitCharacters?: string[];
  data?: unknown;
}

export interface LspHoverResult {
  contents: string | { kind: string; value: string } | Array<string | { kind: string; value: string }>;
  range?: LspRange;
}

export interface LspLocation {
  uri: string;
  range: LspRange;
}

export interface LspLocationLink {
  targetUri: string;
  targetRange: LspRange;
  targetSelectionRange?: LspRange;
}

export interface LspDiagnostic {
  range: LspRange;
  severity?: number; // 1=Error, 2=Warning, 3=Info, 4=Hint
  message: string;
  source?: string;
}

export interface LspNotification {
  languageId: string;
  method: string;
  params: any;
}

export interface LspSemanticTokensLegend {
  tokenTypes: string[];
  tokenModifiers: string[];
}

export interface LspSemanticTokens {
  data: number[];
  resultId?: string;
}

// ── LSP Client class ─────────────────────────────────────────────────────────

export class LspClient {
  private startedLanguages: Set<string> = new Set();
  private startingLanguages: Map<string, Promise<boolean>> = new Map();
  private lastStartErrors: Map<string, string> = new Map();

  /** Get the LSP language ID for a file path */
  async getLanguageForFile(filePath: string): Promise<string | null> {
    try {
      return await invoke<string | null>('lsp_language_for_file', { filePath });
    } catch {
      return null;
    }
  }

  /** Check whether the language server executable is installed */
  async serverAvailable(languageId: string): Promise<boolean> {
    try {
      return await invoke<boolean>('lsp_server_available', { languageId });
    } catch {
      return false;
    }
  }

  /** Start the LSP server for a language (if not already running) */
  async startServer(languageId: string, rootPath: string, filePath?: string): Promise<boolean> {
    if (this.startedLanguages.has(languageId)) return true;

    const inFlight = this.startingLanguages.get(languageId);
    if (inFlight) return inFlight;

    const start = (async () => {
      try {
        await invoke('lsp_start', { languageId, rootPath, filePath: filePath ?? null });
        this.startedLanguages.add(languageId);
        this.lastStartErrors.delete(languageId);
        return true;
      } catch (e) {
        this.lastStartErrors.set(languageId, String(e));
        console.warn(`LSP start failed for ${languageId}:`, e);
        return false;
      } finally {
        this.startingLanguages.delete(languageId);
      }
    })();

    this.startingLanguages.set(languageId, start);
    return start;
  }

  /** Último error de arranque del servidor (por lenguaje). */
  getStartError(languageId: string): string | null {
    return this.lastStartErrors.get(languageId) ?? null;
  }

  /** Check if a server is running */
  async isRunning(languageId: string): Promise<boolean> {
    try {
      return await invoke<boolean>('lsp_is_running', { languageId });
    } catch {
      return false;
    }
  }

  /** Capabilities returned by the server during the LSP handshake. */
  async capabilities(languageId: string): Promise<any | null> {
    try {
      return await invoke<any>('lsp_capabilities', { languageId });
    } catch {
      return null;
    }
  }

  /** Notify the server that a file was opened */
  async didOpen(languageId: string, uri: string, content: string, version: number): Promise<void> {
    try {
      await invoke('lsp_notify', {
        languageId,
        method: 'textDocument/didOpen',
        params: {
          textDocument: { uri, languageId, version, text: content }
        }
      });
    } catch { /* silencioso */ }
  }

  /** Notify the server that a file changed */
  async didChange(languageId: string, uri: string, content: string, version: number): Promise<void> {
    try {
      await invoke('lsp_notify', {
        languageId,
        method: 'textDocument/didChange',
        params: {
          textDocument: { uri, version },
          contentChanges: [{ text: content }]
        }
      });
    } catch { /* silencioso */ }
  }

  /** Notify the server that a file was closed */
  async didClose(languageId: string, uri: string): Promise<void> {
    try {
      await invoke('lsp_notify', {
        languageId,
        method: 'textDocument/didClose',
        params: { textDocument: { uri } }
      });
    } catch { /* silencioso */ }
  }

  /** Request completions */
  async completion(languageId: string, uri: string, position: LspPosition): Promise<LspCompletionItem[]> {
    try {
      const result = await invoke<any>('lsp_request', {
        languageId,
        method: 'textDocument/completion',
        params: {
          textDocument: { uri },
          position,
          context: { triggerKind: 1 }
        }
      });

      // LSP can return CompletionList or CompletionItem[]
      const response = result?.result;
      if (!response) return [];
      const items = Array.isArray(response) ? response : (response.items ?? []);
      return items as LspCompletionItem[];
    } catch {
      return [];
    }
  }

  /** Resolve additional completion details (documentation, detail) */
  async completionResolve(languageId: string, item: LspCompletionItem): Promise<LspCompletionItem> {
    try {
      const result = await invoke<any>('lsp_request', {
        languageId,
        method: 'completionItem/resolve',
        params: item
      });
      return (result?.result ?? item) as LspCompletionItem;
    } catch {
      return item;
    }
  }

  /** Request hover info */
  async hover(languageId: string, uri: string, position: LspPosition): Promise<LspHoverResult | null> {
    try {
      const result = await invoke<any>('lsp_request', {
        languageId,
        method: 'textDocument/hover',
        params: {
          textDocument: { uri },
          position
        }
      });
      return result?.result ?? null;
    } catch {
      return null;
    }
  }

  /** Request go to definition */
  async definition(languageId: string, uri: string, position: LspPosition): Promise<Array<LspLocation | LspLocationLink>> {
    try {
      const result = await invoke<any>('lsp_request', {
        languageId,
        method: 'textDocument/definition',
        params: {
          textDocument: { uri },
          position
        }
      });
      const resp = result?.result;
      if (!resp) return [];
      return Array.isArray(resp) ? resp : [resp];
    } catch {
      return [];
    }
  }

  /** Request references */
  async references(languageId: string, uri: string, position: LspPosition): Promise<LspLocation[]> {
    try {
      const result = await invoke<any>('lsp_request', {
        languageId,
        method: 'textDocument/references',
        params: {
          textDocument: { uri },
          position,
          context: { includeDeclaration: true }
        }
      });
      return result?.result ?? [];
    } catch {
      return [];
    }
  }

  /** Request signature help */
  async signatureHelp(languageId: string, uri: string, position: LspPosition): Promise<any | null> {
    try {
      const result = await invoke<any>('lsp_request', {
        languageId,
        method: 'textDocument/signatureHelp',
        params: {
          textDocument: { uri },
          position
        }
      });
      return result?.result ?? null;
    } catch {
      return null;
    }
  }

  /** Request document symbols */
  async documentSymbols(languageId: string, uri: string): Promise<any[]> {
    try {
      const result = await invoke<any>('lsp_request', {
        languageId,
        method: 'textDocument/documentSymbol',
        params: { textDocument: { uri } }
      });
      return result?.result ?? [];
    } catch {
      return [];
    }
  }

  /** Request formatting */
  async formatting(languageId: string, uri: string, tabSize: number, insertSpaces: boolean): Promise<any[]> {
    try {
      const result = await invoke<any>('lsp_request', {
        languageId,
        method: 'textDocument/formatting',
        params: {
          textDocument: { uri },
          options: { tabSize, insertSpaces }
        }
      });
      return result?.result ?? [];
    } catch {
      return [];
    }
  }

  /** Request range formatting */
  async rangeFormatting(
    languageId: string,
    uri: string,
    range: LspRange,
    tabSize: number,
    insertSpaces: boolean,
  ): Promise<any[]> {
    try {
      const result = await invoke<any>('lsp_request', {
        languageId,
        method: 'textDocument/rangeFormatting',
        params: {
          textDocument: { uri },
          range,
          options: { tabSize, insertSpaces },
        },
      });
      return result?.result ?? [];
    } catch {
      return [];
    }
  }

  /** Request semantic tokens for the whole document. */
  async semanticTokens(languageId: string, uri: string): Promise<LspSemanticTokens> {
    try {
      const result = await invoke<any>('lsp_request', {
        languageId,
        method: 'textDocument/semanticTokens/full',
        params: { textDocument: { uri } },
      });
      const data = result?.result?.data;
      return {
        data: Array.isArray(data) ? data : [],
        resultId: result?.result?.resultId,
      };
    } catch {
      return { data: [] };
    }
  }

  /** Mark a language server as stopped (e.g. the process exited). */
  markServerStopped(languageId: string): void {
    this.startedLanguages.delete(languageId);
    this.startingLanguages.delete(languageId);
  }

  /** Stop all servers */
  async stopAll(): Promise<void> {
    try {
      await invoke('lsp_stop_all');
    } catch { /* silencioso */ }
    this.startedLanguages.clear();
    this.startingLanguages.clear();
    this.lastStartErrors.clear();
  }
}

// Singleton instance
export const lspClient = new LspClient();

// ── Events ───────────────────────────────────────────────────────────────────

/** Notificaciones del servidor LSP (diagnósticos, logs, progreso...). */
export function onLspNotification(callback: (notification: LspNotification) => void): Promise<UnlistenFn> {
  return listen<LspNotification>('lsp-notification', (event) => callback(event.payload));
}

/** El servidor LSP de un lenguaje terminó inesperadamente. */
export function onLspExit(callback: (languageId: string) => void): Promise<UnlistenFn> {
  return listen<{ languageId: string }>('lsp-exit', (event) => callback(event.payload.languageId));
}

// ── URI helpers ──────────────────────────────────────────────────────────────

/** Convierte una ruta local en URI `file://` compatible con LSP y Monaco. */
export function filePathToUri(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const hasDrive = /^[A-Za-z]:/.test(normalized);
  const withoutLeading = normalized.replace(/^\/+/, '');

  const segments = withoutLeading.split('/').map((segment, index) => {
    if (index === 0 && hasDrive) return segment;
    return encodeURIComponent(segment);
  });

  return `file:///${segments.join('/')}`;
}

/** Convierte un URI `file://` en ruta local según la plataforma. */
export function uriToFilePath(uri: string): string {
  let path = uri;
  if (path.startsWith('file://')) path = path.slice('file://'.length);
  else if (path.startsWith('file:')) path = path.slice('file:'.length);

  try {
    path = decodeURIComponent(path);
  } catch { /* URI mal codificada: se usa tal cual */ }

  // Windows: /C:/Users/... → C:/Users/...
  if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);

  const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');
  if (isWindows) path = path.replace(/\//g, '\\');

  return path;
}
