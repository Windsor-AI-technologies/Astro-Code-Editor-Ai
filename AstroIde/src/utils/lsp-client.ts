import { invoke } from '@tauri-apps/api/core';

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
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  insertText?: string;
  insertTextFormat?: number; // 1 = PlainText, 2 = Snippet
  textEdit?: { range: LspRange; newText: string };
  sortText?: string;
  filterText?: string;
}

export interface LspHoverResult {
  contents: string | { kind: string; value: string } | Array<string | { kind: string; value: string }>;
  range?: LspRange;
}

export interface LspLocation {
  uri: string;
  range: LspRange;
}

export interface LspDiagnostic {
  range: LspRange;
  severity?: number; // 1=Error, 2=Warning, 3=Info, 4=Hint
  message: string;
  source?: string;
}

// ── LSP Client class ─────────────────────────────────────────────────────────

export class LspClient {
  private startedLanguages: Set<string> = new Set();
  private startingLanguages: Set<string> = new Set();

  /** Get the LSP language ID for a file path */
  async getLanguageForFile(filePath: string): Promise<string | null> {
    try {
      return await invoke<string | null>('lsp_language_for_file', { filePath });
    } catch {
      return null;
    }
  }

  /** Start the LSP server for a language (if not already running) */
  async startServer(languageId: string, rootPath: string): Promise<boolean> {
    if (this.startedLanguages.has(languageId)) return true;
    if (this.startingLanguages.has(languageId)) return false; // Still starting

    this.startingLanguages.add(languageId);
    try {
      await invoke('lsp_start', { languageId, rootPath });
      this.startedLanguages.add(languageId);
      this.startingLanguages.delete(languageId);
      return true;
    } catch (e) {
      console.warn(`LSP start failed for ${languageId}:`, e);
      this.startingLanguages.delete(languageId);
      return false;
    }
  }

  /** Check if a server is running */
  async isRunning(languageId: string): Promise<boolean> {
    try {
      return await invoke<boolean>('lsp_is_running', { languageId });
    } catch {
      return false;
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
          position
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
  async definition(languageId: string, uri: string, position: LspPosition): Promise<LspLocation[]> {
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

  /** Stop all servers */
  async stopAll(): Promise<void> {
    try {
      await invoke('lsp_stop_all');
      this.startedLanguages.clear();
    } catch { /* silencioso */ }
  }
}

// Singleton instance
export const lspClient = new LspClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

export function filePathToUri(filePath: string): string {
  // Convert Windows path to file:// URI
  const normalized = filePath.replace(/\\/g, '/');
  return `file:///${normalized}`;
}

export function uriToFilePath(uri: string): string {
  return uri.replace('file:///', '').replace(/\//g, '\\');
}
