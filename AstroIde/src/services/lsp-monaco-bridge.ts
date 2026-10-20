/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import {
  filePathToUri,
  lspClient,
  onLspExit,
  onLspNotification,
  uriToFilePath,
} from './lsp-client';
import { astro } from './core/astro';
import type {
  LspCompletionItem,
  LspDiagnostic,
  LspHoverResult,
  LspLocation,
  LspLocationLink,
  LspRange,
  LspSemanticTokensLegend,
} from './lsp-client';

// ── LSP ↔ Monaco Bridge ─────────────────────────────────────────────────────
// Los providers de Monaco son globales por lenguaje; cada petición se resuelve
// contra el servidor LSP correspondiente (si está instalado y en ejecución).

interface BridgeOptions {
  onOpenFile?: (path: string, line: number) => void;
}

const MONACO_LANGUAGES: Array<{ monaco: string; lsp: string; triggers: string[] }> = [
  { monaco: 'csharp', lsp: 'csharp', triggers: ['.', ':', '<', '"', '@', '$', '(', '[', ','] },
  { monaco: 'python', lsp: 'python', triggers: ['.', '"', "'", '(', '[', '@'] },
  { monaco: 'rust', lsp: 'rust', triggers: ['.', ':', '(', '!', '<'] },
  { monaco: 'go', lsp: 'go', triggers: ['.', '"', '`', '('] },
  { monaco: 'cpp', lsp: 'cpp', triggers: ['.', '>', ':', '"', '/', '*', '&', '(', '<'] },
  { monaco: 'c', lsp: 'cpp', triggers: ['.', '>', ':', '"', '/', '*', '&', '(', '<'] },
  { monaco: 'java', lsp: 'java', triggers: ['.', '@', '(', '<'] },
  { monaco: 'php', lsp: 'php', triggers: ['$', '>', ':', '\\', '(', '@'] },
  { monaco: 'ruby', lsp: 'ruby', triggers: ['.', ':', '"', "'", '@', '$'] },
  { monaco: 'kotlin', lsp: 'kotlin', triggers: ['.', ':', '(', '<', '@'] },
  { monaco: 'dart', lsp: 'dart', triggers: ['.', ':', '"', "'", '('] },
];

// Leyenda de csharp-ls 0.28. Se usa como fallback cuando el servidor aún no
// expone sus capabilities y como leyenda estable del provider de Monaco.
export const CSHARP_SEMANTIC_TOKEN_TYPES = [
  'class', 'comment', 'constant', 'enumMember', 'enum', 'event', 'method',
  'field', 'variable', 'interface', 'jsonArray', 'jsonComment',
  'jsonConstructorName', 'jsonKeyword', 'jsonNumber', 'jsonObject',
  'jsonOperator', 'jsonPropertyName', 'jsonPunctuation', 'jsonString',
  'jsonText', 'keyword', 'namespace', 'number', 'operator', 'parameter',
  'property', 'struct', 'regexAlternation', 'regexAnchor',
  'regexCharacterClass', 'regexComment', 'regexGrouping', 'regexOtherEscape',
  'regexQuantifier', 'regexSelfEscapedCharacter', 'regexText', 'string',
  'stringEscapeCharacter', 'typeParameter',
];
const CSHARP_SEMANTIC_TOKEN_MODIFIERS = ['static'];

// TextMate ya colorea correctamente estas categorías y sus tokens semánticos
// no distinguen matices como keyword.control; se omiten para no pisar el tema.
const TEXTMATE_OWNED_SEMANTIC_TYPES = new Set([
  'comment', 'string', 'stringEscapeCharacter', 'number', 'operator', 'keyword',
  'regexAlternation', 'regexAnchor', 'regexCharacterClass', 'regexComment',
  'regexGrouping', 'regexOtherEscape', 'regexQuantifier',
  'regexSelfEscapedCharacter', 'regexText', 'jsonArray', 'jsonComment',
  'jsonConstructorName', 'jsonKeyword', 'jsonNumber', 'jsonObject',
  'jsonOperator', 'jsonPropertyName', 'jsonPunctuation', 'jsonString',
  'jsonText',
]);

let disposables: any[] = [];
let monacoRef: any = null;
let activeRootPath: string | null = null;
let openFileCallback: ((path: string, line: number) => void) | null = null;

let notificationsRegistered = false;
let notificationUnlisten: (() => void) | null = null;
let exitUnlisten: (() => void) | null = null;

const openedDocs = new Set<string>();
const documentVersions = new Map<string, number>();
const unavailableServers = new Map<string, number>();
const semanticLegends = new Map<string, LspSemanticTokensLegend>();
const projectWarnings = new Set<string>();
const rawCompletionItems = new WeakMap<object, LspCompletionItem>();
const languageIdCache = new Map<string, string | null>();

const SERVER_RETRY_COOLDOWN_MS = 15_000;

/**
 * Registra (o re-registra) los providers LSP para los lenguajes soportados.
 * Se llama antes de montar Monaco; `rootPath` puede cambiar al abrir carpeta.
 */
export function registerLspProviders(
  monaco: any,
  rootPath: string | null,
  options: BridgeOptions = {},
) {
  monacoRef = monaco;
  activeRootPath = rootPath ?? activeRootPath;
  openFileCallback = options.onOpenFile ?? openFileCallback;

  disposables.forEach(disposable => disposable.dispose());
  disposables = [];

  registerNotifications(monaco);

  for (const language of MONACO_LANGUAGES) {
    disposables.push(
      monaco.languages.registerCompletionItemProvider(language.monaco, {
        triggerCharacters: language.triggers,
        provideCompletionItems: (model: any, position: any) =>
          provideCompletions(model, position, language.lsp),
        resolveCompletionItem: (item: any) =>
          resolveCompletion(item, language.lsp),
      }),
      monaco.languages.registerHoverProvider(language.monaco, {
        provideHover: (model: any, position: any) =>
          provideHover(model, position, language.lsp),
      }),
      monaco.languages.registerDefinitionProvider(language.monaco, {
        provideDefinition: (model: any, position: any) =>
          provideDefinition(model, position, language.lsp),
      }),
      monaco.languages.registerSignatureHelpProvider(language.monaco, {
        signatureHelpTriggerCharacters: ['(', ','],
        signatureHelpRetriggerCharacters: [','],
        provideSignatureHelp: (model: any, position: any) =>
          provideSignatureHelp(model, position, language.lsp),
      }),
      monaco.languages.registerDocumentFormattingEditProvider(language.monaco, {
        displayName: `${language.lsp}-ls`,
        provideDocumentFormattingEdits: (model: any, options: any) =>
          provideFormattingEdits(model, language.lsp, options),
      }),
      monaco.languages.registerDocumentRangeFormattingEditProvider(language.monaco, {
        displayName: `${language.lsp}-ls`,
        provideDocumentRangeFormattingEdits: (model: any, range: any, options: any) =>
          provideRangeFormattingEdits(model, range, language.lsp, options),
      }),
    );

    if (language.monaco === 'csharp') {
      disposables.push(
        monaco.languages.registerDocumentSemanticTokensProvider('csharp', {
          getLegend: () => ({
            tokenTypes: CSHARP_SEMANTIC_TOKEN_TYPES,
            tokenModifiers: CSHARP_SEMANTIC_TOKEN_MODIFIERS,
          }),
          provideDocumentSemanticTokens: (model: any, _lastResultId: string | null, token: any) =>
            provideSemanticTokens(model, language.lsp, token),
          releaseDocumentSemanticTokens: () => {},
        }),
      );
    }
  }
}

// ── Document sync ────────────────────────────────────────────────────────────

interface PendingChange {
  content: string;
  timer: number;
}

const pendingChanges = new Map<string, PendingChange>();
const openingDocs = new Map<string, Promise<void>>();
const syncChains = new Map<string, Promise<void>>();
const documentContents = new Map<string, string>();

export function notifyDocumentOpened(
  filePath: string,
  content: string,
  rootPath?: string | null,
): Promise<void> {
  if (rootPath) activeRootPath = rootPath;

  const uri = filePathToUri(filePath);
  if (openedDocs.has(uri)) return Promise.resolve();

  const existing = openingDocs.get(uri);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const languageId = await lspClient.getLanguageForFile(filePath);
      if (!languageId) return;

      const started = await ensureServer(languageId, filePath);
      if (!started) return;

      openedDocs.add(uri);
      documentVersions.set(uri, 1);
      documentContents.set(uri, content);
      await lspClient.didOpen(languageId, uri, content, 1);
    } catch {
      openedDocs.delete(uri);
      documentVersions.delete(uri);
      documentContents.delete(uri);
    }
  })().finally(() => {
    openingDocs.delete(uri);
  });

  openingDocs.set(uri, promise);
  return promise;
}

export function notifyDocumentChanged(filePath: string, content: string) {
  const uri = filePathToUri(filePath);
  if (!openedDocs.has(uri)) {
    notifyDocumentOpened(filePath, content).catch(() => {});
    return;
  }

  const pending = pendingChanges.get(uri);
  if (documentContents.get(uri) === content) {
    if (pending) {
      window.clearTimeout(pending.timer);
      pendingChanges.delete(uri);
    }
    return;
  }
  if (pending) window.clearTimeout(pending.timer);

  const timer = window.setTimeout(() => {
    const current = pendingChanges.get(uri);
    if (!current || current.content !== content) return;
    pendingChanges.delete(uri);
    void enqueueSync(uri, () => sendDocumentChange(uri, filePath, content));
  }, 150);

  pendingChanges.set(uri, { content, timer });
}

export async function notifyDocumentClosed(filePath: string) {
  const uri = filePathToUri(filePath);
  const pending = pendingChanges.get(uri);
  if (pending) {
    window.clearTimeout(pending.timer);
    pendingChanges.delete(uri);
  }

  const chain = syncChains.get(uri);
  if (chain) await chain;
  const opening = openingDocs.get(uri);
  if (opening) await opening;

  if (!openedDocs.has(uri)) return;
  openedDocs.delete(uri);
  documentVersions.delete(uri);
  documentContents.delete(uri);

  try {
    const languageId = await lspClient.getLanguageForFile(filePath);
    if (!languageId) return;
    await lspClient.didClose(languageId, uri);
  } catch {
    // El servidor pudo detenerse mientras se cerraba el documento.
  }
}

function enqueueSync(uri: string, operation: () => Promise<void>): Promise<void> {
  const previous = syncChains.get(uri) ?? Promise.resolve();
  const next = previous.then(operation).catch(() => {});
  syncChains.set(uri, next);
  void next.finally(() => {
    if (syncChains.get(uri) === next) syncChains.delete(uri);
  });
  return next;
}

async function sendDocumentChange(
  uri: string,
  filePath: string,
  content: string,
  languageId?: string | null,
) {
  const opening = openingDocs.get(uri);
  if (opening) await opening;
  if (!openedDocs.has(uri)) return;

  const resolvedLanguage = languageId ?? await lspClient.getLanguageForFile(filePath);
  if (!resolvedLanguage) return;

  const version = (documentVersions.get(uri) ?? 0) + 1;
  documentVersions.set(uri, version);
  await lspClient.didChange(resolvedLanguage, uri, content, version);
  documentContents.set(uri, content);
}

/** Garantiza que el servidor tenga abierto y sincronizado el documento actual. */
async function ensureDocumentSynced(
  model: any,
  filePath: string,
  languageId: string,
): Promise<string | null> {
  const uri = filePathToUri(filePath);
  const content = model.getValue();

  if (!openedDocs.has(uri)) {
    await notifyDocumentOpened(filePath, content);
    if (!openedDocs.has(uri)) return null;
  } else {
    const opening = openingDocs.get(uri);
    if (opening) await opening;
    if (!openedDocs.has(uri)) return null;
  }

  const pending = pendingChanges.get(uri);
  if (pending) {
    window.clearTimeout(pending.timer);
    pendingChanges.delete(uri);
  }

  if (documentContents.get(uri) !== content) {
    await enqueueSync(uri, () => sendDocumentChange(uri, filePath, content, languageId));
  } else {
    const chain = syncChains.get(uri);
    if (chain) await chain;
  }

  return documentContents.get(uri) === content ? uri : null;
}

/** Limpia el estado de documentos — llamar al cambiar de proyecto o reiniciar LSP. */
export function clearDocumentVersions() {
  pendingChanges.forEach(pending => window.clearTimeout(pending.timer));
  pendingChanges.clear();
  openingDocs.clear();
  syncChains.clear();
  documentContents.clear();
  documentVersions.clear();
  openedDocs.clear();
  unavailableServers.clear();
  semanticLegends.clear();
  projectWarnings.clear();
  languageIdCache.clear();

  if (monacoRef?.editor) {
    for (const model of monacoRef.editor.getModels()) {
      monacoRef.editor.setModelMarkers(model, 'lsp', []);
    }
  }
}

export function resetLspBridge() {
  disposables.forEach(disposable => disposable.dispose());
  disposables = [];
  clearDocumentVersions();
}

// ── Server lifecycle ────────────────────────────────────────────────────────

async function ensureServer(languageId: string, filePath: string): Promise<boolean> {
  const failedAt = unavailableServers.get(languageId);
  if (failedAt !== undefined && Date.now() - failedAt < SERVER_RETRY_COOLDOWN_MS) {
    return false;
  }

  const root = activeRootPath || dirname(filePath);
  const started = await lspClient.startServer(languageId, root, filePath);

  if (started) {
    unavailableServers.delete(languageId);
  } else {
    unavailableServers.set(languageId, Date.now());
    const startError = lspClient.getStartError(languageId) ?? '';
    if (
      languageId === 'csharp'
      && startError.startsWith('NO_CSHARP_PROJECT')
      && !projectWarnings.has(root)
    ) {
      projectWarnings.add(root);
      astro.notification.warn(
        'Para IntelliSense de C# abre una carpeta con un archivo .csproj o .sln. '
        + 'Puedes crear uno con el comando ".NET: Crear proyecto...".',
      );
    }
  }

  return started;
}

function registerNotifications(monaco: any) {
  if (notificationsRegistered) return;
  notificationsRegistered = true;

  onLspNotification(notification => {
    if (notification.method === 'textDocument/publishDiagnostics') {
      applyDiagnostics(monaco, notification.params);
    }
  }).then(unlisten => {
    if (notificationUnlisten) unlisten();
    notificationUnlisten = unlisten;
  }).catch(() => {});

  onLspExit(languageId => {
    lspClient.markServerStopped(languageId);
    unavailableServers.delete(languageId);
  }).then(unlisten => {
    if (exitUnlisten) unlisten();
    exitUnlisten = unlisten;
  }).catch(() => {});
}

// ── Providers ────────────────────────────────────────────────────────────────

async function provideCompletions(model: any, position: any, lspLanguage: string) {
  const languageId = await resolveLanguageId(model);
  if (!languageId || languageId !== lspLanguage) return { suggestions: [] };

  const filePath = modelFilePath(model);
  const ok = await ensureServer(languageId, filePath);
  if (!ok) return { suggestions: [] };

  const uri = await ensureDocumentSynced(model, filePath, languageId);
  if (!uri) return { suggestions: [] };

  const items = await lspClient.completion(languageId, uri, toLspPosition(position));
  if (!items.length) return { suggestions: [] };

  const word = model.getWordUntilPosition(position);
  const defaultRange = new monacoRef.Range(
    position.lineNumber,
    word?.startColumn ?? position.column,
    position.lineNumber,
    position.column,
  );

  return {
    suggestions: items.map(item => toMonacoCompletionItem(item, defaultRange)),
  };
}

async function resolveCompletion(item: any, lspLanguage: string) {
  const raw = rawCompletionItems.get(item);
  if (!raw) return item;

  const resolved = await lspClient.completionResolve(lspLanguage, raw);
  return {
    ...item,
    detail: resolved.detail ?? item.detail,
    documentation: markdownOrUndefined(resolved.documentation) ?? item.documentation,
  };
}

async function provideHover(model: any, position: any, lspLanguage: string) {
  const languageId = await resolveLanguageId(model);
  if (!languageId || languageId !== lspLanguage) return null;

  const filePath = modelFilePath(model);
  const ok = await ensureServer(languageId, filePath);
  if (!ok) return null;

  const uri = await ensureDocumentSynced(model, filePath, languageId);
  if (!uri) return null;

  const hover = await lspClient.hover(languageId, uri, toLspPosition(position));
  if (!hover) return null;

  const value = hoverToMarkdown(hover);
  if (!value) return null;

  return {
    contents: [{ value }],
    range: hover.range ? toMonacoRange(hover.range) : undefined,
  };
}

async function provideDefinition(model: any, position: any, lspLanguage: string) {
  const languageId = await resolveLanguageId(model);
  if (!languageId || languageId !== lspLanguage) return null;

  const filePath = modelFilePath(model);
  const ok = await ensureServer(languageId, filePath);
  if (!ok) return null;

  const uri = await ensureDocumentSynced(model, filePath, languageId);
  if (!uri) return null;

  const results = await lspClient.definition(languageId, uri, toLspPosition(position));
  if (!results.length) return null;

  const locations: any[] = [];
  let firstTarget: { path: string; line: number } | null = null;

  for (const result of results) {
    const { uri, range } = normalizeDefinitionResult(result);
    if (!uri || !range) continue;

    const targetModel = findModelByUri(uri);
    if (targetModel && targetModel === model) {
      locations.push({ uri: targetModel.uri, range: toMonacoRange(range) });
    } else if (!firstTarget) {
      firstTarget = { path: uriToFilePath(uri), line: range.start.line + 1 };
    }
  }

  if (locations.length) return locations;

  if (firstTarget && openFileCallback) {
    openFileCallback(firstTarget.path, firstTarget.line);
  }

  return null;
}

async function provideFormattingEdits(model: any, lspLanguage: string, options: any) {
  const languageId = await resolveLanguageId(model);
  if (!languageId || languageId !== lspLanguage) return [];

  const filePath = modelFilePath(model);
  if (!filePath) return [];

  const ok = await ensureServer(languageId, filePath);
  if (!ok) return [];

  const uri = await ensureDocumentSynced(model, filePath, languageId);
  if (!uri) return [];

  const edits = await lspClient.formatting(
    languageId,
    uri,
    options.tabSize,
    options.insertSpaces,
  );
  return toMonacoTextEdits(edits);
}

async function provideRangeFormattingEdits(
  model: any,
  range: any,
  lspLanguage: string,
  options: any,
) {
  const languageId = await resolveLanguageId(model);
  if (!languageId || languageId !== lspLanguage) return [];

  const filePath = modelFilePath(model);
  if (!filePath) return [];

  const ok = await ensureServer(languageId, filePath);
  if (!ok) return [];

  const uri = await ensureDocumentSynced(model, filePath, languageId);
  if (!uri) return [];

  const edits = await lspClient.rangeFormatting(
    languageId,
    uri,
    toLspRange(range),
    options.tabSize,
    options.insertSpaces,
  );
  return toMonacoTextEdits(edits);
}

async function provideSemanticTokens(model: any, lspLanguage: string, cancellationToken: any) {
  const languageId = await resolveLanguageId(model);
  if (!languageId || languageId !== lspLanguage) return null;

  const filePath = modelFilePath(model);
  if (!filePath) return null;

  const ok = await ensureServer(languageId, filePath);
  if (!ok) return null;

  const uri = await ensureDocumentSynced(model, filePath, languageId);
  if (!uri) return null;

  const [tokens, legend] = await Promise.all([
    lspClient.semanticTokens(languageId, uri),
    getSemanticLegend(languageId),
  ]);
  if (cancellationToken?.isCancellationRequested) return null;

  const data = mapSemanticTokens(tokens.data, legend);
  if (!data.length) return null;

  return {
    resultId: tokens.resultId ?? `${uri}:${Date.now()}`,
    data: new Uint32Array(data),
  };
}

async function getSemanticLegend(languageId: string): Promise<LspSemanticTokensLegend> {
  const cached = semanticLegends.get(languageId);
  if (cached) return cached;

  const fallback: LspSemanticTokensLegend = {
    tokenTypes: CSHARP_SEMANTIC_TOKEN_TYPES,
    tokenModifiers: CSHARP_SEMANTIC_TOKEN_MODIFIERS,
  };
  const capabilities = await lspClient.capabilities(languageId);
  const legend = capabilities?.semanticTokensProvider?.legend;
  const resolved: LspSemanticTokensLegend =
    Array.isArray(legend?.tokenTypes) && Array.isArray(legend?.tokenModifiers)
      ? { tokenTypes: legend.tokenTypes, tokenModifiers: legend.tokenModifiers }
      : fallback;

  semanticLegends.set(languageId, resolved);
  return resolved;
}

/**
 * Convierte los tokens semánticos del servidor a la leyenda estable de Monaco.
 * Los tipos que ya cubre TextMate se descartan para conservar sus colores.
 */
export function mapSemanticTokens(
  data: number[],
  serverLegend: LspSemanticTokensLegend,
  targetLegend: LspSemanticTokensLegend = {
    tokenTypes: CSHARP_SEMANTIC_TOKEN_TYPES,
    tokenModifiers: CSHARP_SEMANTIC_TOKEN_MODIFIERS,
  },
): number[] {
  if (!Array.isArray(data) || data.length % 5 !== 0) return [];

  const targetTypes = new Map(
    targetLegend.tokenTypes.map((type, index) => [type, index]),
  );
  const targetModifiers = new Map(
    targetLegend.tokenModifiers.map((modifier, index) => [modifier, index]),
  );
  const result: number[] = [];

  let line = 0;
  let character = 0;
  let outputLine = 0;
  let outputCharacter = 0;

  for (let index = 0; index < data.length; index += 5) {
    const deltaLine = data[index];
    const deltaCharacter = data[index + 1];
    const length = data[index + 2];
    const typeIndex = data[index + 3];
    const modifierBits = data[index + 4];

    if (deltaLine < 0 || deltaCharacter < 0 || length <= 0) return [];
    line += deltaLine;
    character = deltaLine === 0 ? character + deltaCharacter : deltaCharacter;

    const typeName = serverLegend.tokenTypes[typeIndex];
    if (!typeName || TEXTMATE_OWNED_SEMANTIC_TYPES.has(typeName)) continue;

    const targetType = targetTypes.get(typeName);
    if (targetType === undefined) continue;

    let outputModifiers = 0;
    for (let bit = 0; bit < serverLegend.tokenModifiers.length; bit += 1) {
      if ((modifierBits & (1 << bit)) === 0) continue;
      const modifier = serverLegend.tokenModifiers[bit];
      const targetBit = targetModifiers.get(modifier);
      if (targetBit !== undefined) outputModifiers |= 1 << targetBit;
    }

    const outputDeltaLine = line - outputLine;
    const outputDeltaCharacter = outputDeltaLine === 0
      ? character - outputCharacter
      : character;
    result.push(outputDeltaLine, outputDeltaCharacter, length, targetType, outputModifiers);
    outputLine = line;
    outputCharacter = character;
  }

  return result;
}

async function provideSignatureHelp(model: any, position: any, lspLanguage: string) {
  const languageId = await resolveLanguageId(model);
  if (!languageId || languageId !== lspLanguage) return null;

  const filePath = modelFilePath(model);
  const ok = await ensureServer(languageId, filePath);
  if (!ok) return null;

  const uri = await ensureDocumentSynced(model, filePath, languageId);
  if (!uri) return null;

  const result = await lspClient.signatureHelp(languageId, uri, toLspPosition(position));
  return signatureHelpToMonaco(result);
}

// ── Mapping helpers ─────────────────────────────────────────────────────────

function toLspPosition(position: any) {
  return { line: position.lineNumber - 1, character: position.column - 1 };
}

function toLspRange(range: any) {
  return {
    start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
    end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
  };
}

function toMonacoRange(range: LspRange) {
  return new monacoRef.Range(
    range.start.line + 1,
    range.start.character + 1,
    range.end.line + 1,
    range.end.character + 1,
  );
}

function toMonacoTextEdits(edits: any[]): any[] {
  if (!Array.isArray(edits)) return [];
  return edits
    .filter(edit => edit?.range?.start && edit?.range?.end && typeof edit.newText === 'string')
    .map(edit => ({
      range: toMonacoRange(edit.range),
      text: edit.newText,
    }));
}

function toMonacoCompletionItem(
  item: LspCompletionItem,
  defaultRange: any,
) {
  const label = typeof item.label === 'string' ? item.label : item.label.label;
  const textEdit = item.textEdit;
  const insertText = textEdit?.newText ?? item.insertText ?? label;
  const range = textEdit?.range ?? textEdit?.replace ?? textEdit?.insert;
  const isSnippet = item.insertTextFormat === 2;

  const suggestion: any = {
    label,
    kind: monacoCompletionKind(item.kind),
    detail: item.detail,
    documentation: markdownOrUndefined(item.documentation),
    insertText,
    insertTextRules: isSnippet
      ? monacoRef.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : undefined,
    sortText: item.sortText,
    filterText: item.filterText,
    commitCharacters: item.commitCharacters,
    range: range ? toMonacoRange(range) : defaultRange,
  };

  rawCompletionItems.set(suggestion, item);
  return suggestion;
}

/** Convierte los diagnósticos de un `publishDiagnostics` en markers de Monaco. */
export function applyDiagnostics(monaco: any, params: any) {
  if (!params?.uri) return;

  const model = findModelByUri(params.uri, monaco);
  if (!model) return;

  const markers = (params.diagnostics ?? []).map(toMarker);
  monaco.editor.setModelMarkers(model, 'lsp', markers);
}

export function toMarker(diagnostic: LspDiagnostic) {
  return {
    severity: toMarkerSeverity(diagnostic.severity),
    message: diagnostic.message ?? '',
    source: diagnostic.source ?? 'lsp',
    startLineNumber: diagnostic.range.start.line + 1,
    startColumn: diagnostic.range.start.character + 1,
    endLineNumber: diagnostic.range.end.line + 1,
    endColumn: diagnostic.range.end.character + 1,
  };
}

/** LSP severity (1-4) → Monaco MarkerSeverity (8, 4, 2, 1). */
export function toMarkerSeverity(severity?: number): number {
  switch (severity) {
    case 1: return 8; // Error
    case 2: return 4; // Warning
    case 3: return 2; // Info
    case 4: return 1; // Hint
    default: return 8;
  }
}

const MONACO_KIND_BY_LSP: Record<number, number> = {
  1: 18, // Text
  2: 0,  // Method
  3: 1,  // Function
  4: 2,  // Constructor
  5: 3,  // Field
  6: 4,  // Variable
  7: 5,  // Class
  8: 7,  // Interface
  9: 8,  // Module
  10: 9, // Property
  11: 12, // Unit
  12: 13, // Value
  13: 15, // Enum
  14: 17, // Keyword
  15: 27, // Snippet
  16: 19, // Color
  17: 20, // File
  18: 21, // Reference
  19: 23, // Folder
  20: 16, // EnumMember
  21: 14, // Constant
  22: 6,  // Struct
  23: 10, // Event
  24: 11, // Operator
  25: 24, // TypeParameter
};

export function monacoCompletionKind(lspKind?: number): number | undefined {
  return lspKind ? MONACO_KIND_BY_LSP[lspKind] : undefined;
}

/** Convierte documentación LSP (string o MarkupContent) en markdown. */
export function markdownOrUndefined(
  documentation?: string | { kind: string; value: string },
): { value: string } | undefined {
  if (!documentation) return undefined;
  const value = typeof documentation === 'string' ? documentation : documentation.value;
  return value ? { value } : undefined;
}

/** Convierte el resultado de `textDocument/hover` en markdown. */
export function hoverToMarkdown(hover: LspHoverResult): string {
  const contents = hover.contents;
  if (!contents) return '';

  if (typeof contents === 'string') return contents;
  if (Array.isArray(contents)) {
    return contents.map(entry => {
      if (typeof entry === 'string') return entry;
      if ('language' in entry) {
        return `\`\`\`${(entry as any).language}\n${(entry as any).value}\n\`\`\``;
      }
      return entry.value;
    }).join('\n\n');
  }
  return contents.value ?? '';
}

/** Convierte `textDocument/signatureHelp` al formato de Monaco. */
export function signatureHelpToMonaco(result: any) {
  if (!result?.signatures?.length) return null;

  return {
    signatures: result.signatures.map((signature: any) => ({
      label: signature.label,
      documentation: markdownOrUndefined(signature.documentation),
      parameters: (signature.parameters ?? []).map((parameter: any) => ({
        label: parameter.label,
        documentation: markdownOrUndefined(parameter.documentation),
      })),
    })),
    activeSignature: result.activeSignature ?? 0,
    activeParameter: result.activeParameter ?? 0,
  };
}

function normalizeDefinitionResult(result: LspLocation | LspLocationLink) {
  if ('targetUri' in result) {
    return {
      uri: result.targetUri,
      range: result.targetSelectionRange ?? result.targetRange,
    };
  }
  return { uri: result.uri, range: result.range };
}

function findModelByUri(uri: string, monaco: any = monacoRef) {
  if (!monaco) return null;

  const normalized = normalizeUri(uri);
  const models = monaco.editor.getModels();
  const direct = models.find((model: any) => model.uri.toString() === uri);
  if (direct) return direct;

  return models.find((model: any) => normalizeUri(model.uri.toString()) === normalized) ?? null;
}

function normalizeUri(uri: string): string {
  try {
    return decodeURIComponent(uri).replace(/\\/g, '/').replace(/\/+/g, '/');
  } catch {
    return uri.replace(/\\/g, '/').replace(/\/+/g, '/');
  }
}

function modelFilePath(model: any): string {
  const uri = model.uri.toString();
  if (uri.startsWith('file:')) return uriToFilePath(uri);
  return model.uri.path ?? '';
}

async function resolveLanguageId(model: any): Promise<string | null> {
  const filePath = modelFilePath(model);
  if (!filePath) return null;

  const extension = filePath.split('.').pop()?.toLowerCase() ?? '';
  if (languageIdCache.has(extension)) return languageIdCache.get(extension) ?? null;

  const languageId = await lspClient.getLanguageForFile(filePath);
  languageIdCache.set(extension, languageId);
  return languageId;
}

function dirname(file: string): string {
  const normalized = file.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  if (index <= 0) return file;
  return normalized.slice(0, index);
}
