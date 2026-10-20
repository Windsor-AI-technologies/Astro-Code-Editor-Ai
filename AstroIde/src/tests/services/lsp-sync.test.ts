/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getLanguageForFile: vi.fn(),
  startServer: vi.fn(),
  didOpen: vi.fn(),
  didChange: vi.fn(),
  didClose: vi.fn(),
  completion: vi.fn(),
  getStartError: vi.fn(),
}));

vi.mock('../../services/lsp-client', () => ({
  filePathToUri: (filePath: string) => `file://${filePath.replace(/\\/g, '/')}`,
  uriToFilePath: (uri: string) => uri.replace('file://', ''),
  lspClient: {
    getLanguageForFile: mocks.getLanguageForFile,
    startServer: mocks.startServer,
    didOpen: mocks.didOpen,
    didChange: mocks.didChange,
    didClose: mocks.didClose,
    completion: mocks.completion,
    getStartError: mocks.getStartError,
    markServerStopped: vi.fn(),
  },
  onLspNotification: vi.fn(async () => () => {}),
  onLspExit: vi.fn(async () => () => {}),
}));

vi.mock('../../services/core/astro', () => ({
  astro: { notification: { warn: vi.fn() } },
}));

import {
  clearDocumentVersions,
  notifyDocumentChanged,
  notifyDocumentOpened,
  registerLspProviders,
} from '../../services/lsp-monaco-bridge';

function createFakeMonaco() {
  const providers: Record<string, any[]> = {};
  const register = (language: string, provider: any) => {
    (providers[language] ??= []).push(provider);
    return { dispose: () => {} };
  };

  return {
    providers,
    languages: {
      registerCompletionItemProvider: register,
      registerHoverProvider: register,
      registerDefinitionProvider: register,
      registerSignatureHelpProvider: register,
      registerDocumentFormattingEditProvider: register,
      registerDocumentRangeFormattingEditProvider: register,
      registerDocumentSemanticTokensProvider: register,
    },
    editor: {
      getModels: () => [],
      setModelMarkers: vi.fn(),
    },
  };
}

async function flushMicrotasks(times = 12) {
  for (let index = 0; index < times; index += 1) await Promise.resolve();
}

describe('sincronización LSP de documentos', () => {
  const filePath = '/tmp/proyecto/Program.cs';
  const uri = 'file:///tmp/proyecto/Program.cs';
  let monaco: ReturnType<typeof createFakeMonaco>;

  beforeEach(() => {
    vi.useFakeTimers();
    mocks.getLanguageForFile.mockReset().mockResolvedValue('csharp');
    mocks.startServer.mockReset().mockResolvedValue(true);
    mocks.didOpen.mockReset().mockResolvedValue(undefined);
    mocks.didChange.mockReset().mockResolvedValue(undefined);
    mocks.didClose.mockReset().mockResolvedValue(undefined);
    mocks.completion.mockReset().mockResolvedValue([]);
    mocks.getStartError.mockReset().mockReturnValue(null);

    monaco = createFakeMonaco();
    registerLspProviders(monaco, '/tmp/proyecto');
  });

  afterEach(() => {
    clearDocumentVersions();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('espera a que termine didOpen antes de enviar didChange', async () => {
    let resolveOpen: () => void = () => {};
    mocks.didOpen.mockImplementation(
      () => new Promise<void>(resolve => {
        resolveOpen = resolve;
      }),
    );

    const opening = notifyDocumentOpened(filePath, 'class C {}', '/tmp/proyecto');
    await flushMicrotasks();
    expect(mocks.didOpen).toHaveBeenCalledTimes(1);

    notifyDocumentChanged(filePath, 'class C { int x; }');
    await vi.advanceTimersByTimeAsync(300);
    expect(mocks.didChange).not.toHaveBeenCalled();

    resolveOpen();
    await opening;
    await vi.advanceTimersByTimeAsync(0);
    await flushMicrotasks();

    expect(mocks.didChange).toHaveBeenCalledWith(
      'csharp',
      uri,
      'class C { int x; }',
      2,
    );
  });

  it('cancela un cambio pendiente si el contenido vuelve al último enviado', async () => {
    await notifyDocumentOpened(filePath, 'class C {}', '/tmp/proyecto');

    notifyDocumentChanged(filePath, 'class C { int x; }');
    notifyDocumentChanged(filePath, 'class C {}');
    await vi.advanceTimersByTimeAsync(300);
    await flushMicrotasks();

    expect(mocks.didChange).not.toHaveBeenCalled();
  });

  it('sincroniza el cambio pendiente antes de pedir completions', async () => {
    const temperature = 'class C { void M() { Console. } }';
    await notifyDocumentOpened(filePath, 'class C {}', '/tmp/proyecto');

    const completionProvider = monaco.providers.csharp.find(
      provider => typeof provider.provideCompletionItems === 'function',
    );
    expect(completionProvider).toBeDefined();

    const model = {
      uri: { toString: () => uri, path: filePath },
      getValue: () => temperature,
      getWordUntilPosition: () => ({ startColumn: 35 }),
    };

    await completionProvider.provideCompletionItems(
      model,
      { lineNumber: 1, column: 35 },
    );

    expect(mocks.didChange).toHaveBeenCalledWith('csharp', uri, temperature, 2);
    expect(mocks.didChange.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.completion.mock.invocationCallOrder[0],
    );
  });
});
