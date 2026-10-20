/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { filePathToUri, uriToFilePath, LspClient } from '../../services/lsp-client';
import {
  hoverToMarkdown,
  mapSemanticTokens,
  markdownOrUndefined,
  monacoCompletionKind,
  signatureHelpToMonaco,
  toMarker,
  toMarkerSeverity,
} from '../../services/lsp-monaco-bridge';

describe('lsp-client URIs', () => {
  it('convierte rutas Unix a file://', () => {
    expect(filePathToUri('/home/user/App.cs')).toBe('file:///home/user/App.cs');
  });

  it('codifica espacios y caracteres no ASCII', () => {
    expect(filePathToUri('/home/user/mi proyecto/ñandú.cs')).toBe(
      'file:///home/user/mi%20proyecto/%C3%B1and%C3%BA.cs',
    );
  });

  it('convierte rutas Windows con letra de unidad', () => {
    expect(filePathToUri('C:\\Users\\dev\\App.cs')).toBe('file:///C:/Users/dev/App.cs');
  });

  it('uriToFilePath revierte la conversión', () => {
    expect(uriToFilePath('file:///home/user/mi%20app.cs')).toBe('/home/user/mi app.cs');
  });
});

describe('lsp-client formatting', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('solicita el formato completo con las opciones del editor', async () => {
    vi.mocked(invoke).mockResolvedValue({
      result: [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 3 },
        },
        newText: 'using System;',
      }],
    });
    const client = new LspClient();

    const edits = await client.formatting('csharp', 'file:///tmp/App.cs', 4, true);

    expect(invoke).toHaveBeenCalledWith('lsp_request', {
      languageId: 'csharp',
      method: 'textDocument/formatting',
      params: {
        textDocument: { uri: 'file:///tmp/App.cs' },
        options: { tabSize: 4, insertSpaces: true },
      },
    });
    expect(edits).toHaveLength(1);
  });

  it('solicita el formato de un rango con índices LSP', async () => {
    vi.mocked(invoke).mockResolvedValue({ result: [] });
    const client = new LspClient();
    const range = {
      start: { line: 2, character: 4 },
      end: { line: 5, character: 0 },
    };

    await client.rangeFormatting('csharp', 'file:///tmp/App.cs', range, 2, false);

    expect(invoke).toHaveBeenCalledWith('lsp_request', {
      languageId: 'csharp',
      method: 'textDocument/rangeFormatting',
      params: {
        textDocument: { uri: 'file:///tmp/App.cs' },
        range,
        options: { tabSize: 2, insertSpaces: false },
      },
    });
  });

  it('devuelve una lista vacía si el servidor falla', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('sin servidor'));
    const client = new LspClient();

    await expect(client.formatting('csharp', 'file:///tmp/App.cs', 2, true)).resolves.toEqual([]);
  });
});

describe('lsp-client semantic tokens', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('solicita los tokens semánticos completos del documento', async () => {
    vi.mocked(invoke).mockResolvedValue({
      result: { data: [0, 0, 4, 0, 0] },
    });
    const client = new LspClient();

    const tokens = await client.semanticTokens('csharp', 'file:///tmp/App.cs');

    expect(invoke).toHaveBeenCalledWith('lsp_request', {
      languageId: 'csharp',
      method: 'textDocument/semanticTokens/full',
      params: { textDocument: { uri: 'file:///tmp/App.cs' } },
    });
    expect(tokens.data).toEqual([0, 0, 4, 0, 0]);
  });

  it('devuelve datos vacíos si el servidor falla', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('sin servidor'));
    const client = new LspClient();

    await expect(
      client.semanticTokens('csharp', 'file:///tmp/App.cs'),
    ).resolves.toEqual({ data: [], resultId: undefined });
  });
});

describe('lsp-monaco-bridge semantic tokens', () => {
  it('remapea la leyenda y conserva los tipos que TextMate ya colorea', () => {
    const serverLegend = {
      tokenTypes: ['class', 'keyword', 'method', 'variable'],
      tokenModifiers: ['static'],
    };
    const targetLegend = {
      tokenTypes: ['method', 'class', 'variable'],
      tokenModifiers: ['static'],
    };
    const data = [
      0, 0, 4, 0, 0,  // class en 0:0
      0, 5, 3, 1, 0,  // keyword en 0:5 → se omite
      0, 4, 2, 2, 1,  // method en 0:9 → delta 9
      1, 0, 5, 3, 0,  // variable en 1:0
    ];

    expect(mapSemanticTokens(data, serverLegend, targetLegend)).toEqual([
      0, 0, 4, 1, 0,
      0, 9, 2, 0, 1,
      1, 0, 5, 2, 0,
    ]);
  });

  it('descarta tipos desconocidos y datos inválidos', () => {
    const legend = {
      tokenTypes: ['class', 'desconocido'],
      tokenModifiers: [],
    };

    expect(mapSemanticTokens([0, 0, 4, 2, 0], legend, legend)).toEqual([]);
    expect(mapSemanticTokens([0, 0, 4, 0], legend, legend)).toEqual([]);
  });
});

describe('lsp-monaco-bridge helpers', () => {
  it('mapea severidades LSP a Monaco', () => {
    expect(toMarkerSeverity(1)).toBe(8);
    expect(toMarkerSeverity(2)).toBe(4);
    expect(toMarkerSeverity(3)).toBe(2);
    expect(toMarkerSeverity(4)).toBe(1);
    expect(toMarkerSeverity(undefined)).toBe(8);
  });

  it('convierte diagnósticos a markers con índices base 1', () => {
    const marker = toMarker({
      range: {
        start: { line: 4, character: 2 },
        end: { line: 4, character: 8 },
      },
      severity: 2,
      message: 'Variable no usada',
      source: 'csharp',
    });

    expect(marker).toEqual({
      severity: 4,
      message: 'Variable no usada',
      source: 'csharp',
      startLineNumber: 5,
      startColumn: 3,
      endLineNumber: 5,
      endColumn: 9,
    });
  });

  it('mapea tipos de CompletionItem de LSP a Monaco', () => {
    expect(monacoCompletionKind(2)).toBe(0); // Method
    expect(monacoCompletionKind(7)).toBe(5); // Class
    expect(monacoCompletionKind(22)).toBe(6); // Struct
    expect(monacoCompletionKind(15)).toBe(27); // Snippet
    expect(monacoCompletionKind(undefined)).toBeUndefined();
  });

  it('convierte hover MarkupContent a markdown', () => {
    expect(hoverToMarkdown({
      contents: { kind: 'markdown', value: '**string** `System.String`' },
    })).toBe('**string** `System.String`');
  });

  it('convierte hover MarkedString[] a markdown con bloques de código', () => {
    const value = hoverToMarkdown({
      contents: [
        { language: 'csharp', value: 'void Main()' },
        'Método de entrada',
      ] as any,
    });

    expect(value).toContain('```csharp');
    expect(value).toContain('void Main()');
    expect(value).toContain('Método de entrada');
  });

  it('convierte documentación simple y MarkupContent', () => {
    expect(markdownOrUndefined('texto')).toEqual({ value: 'texto' });
    expect(markdownOrUndefined({ kind: 'markdown', value: '**x**' })).toEqual({ value: '**x**' });
    expect(markdownOrUndefined(undefined)).toBeUndefined();
  });

  it('convierte signature help al formato de Monaco', () => {
    const result = signatureHelpToMonaco({
      signatures: [{
        label: 'void WriteLine(string value)',
        documentation: { kind: 'markdown', value: 'Escribe una línea' },
        parameters: [{ label: 'string value' }],
      }],
      activeSignature: 0,
      activeParameter: 0,
    })!;

    expect(result.signatures[0].label).toBe('void WriteLine(string value)');
    expect(result.signatures[0].documentation).toEqual({ value: 'Escribe una línea' });
    expect(result.activeParameter).toBe(0);
    expect(signatureHelpToMonaco(null)).toBeNull();
  });
});
