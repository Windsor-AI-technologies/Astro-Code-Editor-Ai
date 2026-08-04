import { lspClient, filePathToUri } from './lsp-client';

// ── LSP ↔ Monaco Bridge ─────────────────────────────────────────────────────
// LSP providers are temporarily disabled because the Rust backend uses
// synchronous/blocking I/O for the language server communication.
// This causes Tauri commands to hang when the server takes time to respond.
// TODO: Move LSP communication to a background thread with async channels.

let registeredDisposables: any[] = [];

export function registerLspProviders(_monaco: any, _rootPath: string | null) {
  // LSP providers disabled — requires async threading in Rust backend
  registeredDisposables.forEach((d: any) => d.dispose());
  registeredDisposables = [];
}

// ── Document sync helpers ────────────────────────────────────────────────────

let documentVersions: Map<string, number> = new Map();

/** Limpia el mapa de versiones de documentos — llamar al cambiar de proyecto */
export function clearDocumentVersions() {
  documentVersions.clear();
}

export async function notifyDocumentOpened(filePath: string, content: string, rootPath: string) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext) return;

  const langId = await lspClient.getLanguageForFile(filePath);
  if (!langId) return;

  // Start server if needed (non-blocking)
  lspClient.startServer(langId, rootPath);

  const uri = filePathToUri(filePath);
  documentVersions.set(uri, 1);
  // Don't await — fire and forget
  lspClient.didOpen(langId, uri, content, 1).catch(() => {});
}

export async function notifyDocumentChanged(filePath: string, content: string) {
  const langId = await lspClient.getLanguageForFile(filePath);
  if (!langId) return;

  const uri = filePathToUri(filePath);
  const version = (documentVersions.get(uri) ?? 0) + 1;
  documentVersions.set(uri, version);
  lspClient.didChange(langId, uri, content, version).catch(() => {});
}

export async function notifyDocumentClosed(filePath: string) {
  const langId = await lspClient.getLanguageForFile(filePath);
  if (!langId) return;

  const uri = filePathToUri(filePath);
  documentVersions.delete(uri);
  lspClient.didClose(langId, uri).catch(() => {});
}
