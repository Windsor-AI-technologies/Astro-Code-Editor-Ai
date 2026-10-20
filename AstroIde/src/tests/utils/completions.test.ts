/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { describe, it, expect, vi } from 'vitest';
import {
  disposeAllCompletionProviders,
  registerCompletionProviders,
  registerLanguageKeywords,
} from '../../utils/completions';

function createMonacoStub() {
  const languages: string[] = [];
  return {
    languages,
    monaco: {
      languages: {
        registerCompletionItemProvider(language: string) {
          languages.push(language);
          return { dispose: vi.fn() };
        },
      },
    },
  };
}

describe('completions fallback', () => {
  it('no registra snippets ni builtins genéricos para C# (los cubre el LSP)', () => {
    const { languages, monaco } = createMonacoStub();

    registerCompletionProviders(monaco as any);
    registerLanguageKeywords(monaco as any);

    expect(languages).not.toContain('csharp');

    disposeAllCompletionProviders();
  });
});
