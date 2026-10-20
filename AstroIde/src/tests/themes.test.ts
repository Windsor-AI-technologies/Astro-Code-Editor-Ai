/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { describe, it, expect } from 'vitest';
import { THEMES, type ThemeDefinition } from '../themes';

function getTheme(id: string): ThemeDefinition {
  const theme = THEMES.find(item => item.id === id);
  if (!theme) throw new Error(`Tema no encontrado: ${id}`);
  return theme;
}

function rule(theme: ThemeDefinition, token: string) {
  return theme.monaco.rules.find(item => item.token === token);
}

describe('colores de sintaxis de los temas VS Code', () => {
  const dark = getTheme('vscode-dark');
  const light = getTheme('vscode-light');

  it('Dark+ usa la paleta oficial de VS Code', () => {
    expect(rule(dark, 'comment')).toEqual({ token: 'comment', foreground: '6a9955' });
    expect(rule(dark, 'keyword')?.foreground).toBe('569cd6');
    expect(rule(dark, 'keyword.if')?.foreground).toBe('c586c0');
    expect(rule(dark, 'keyword.return')?.foreground).toBe('c586c0');
    expect(rule(dark, 'keyword.operator')?.foreground).toBe('d4d4d4');
    expect(rule(dark, 'keyword.operator.expression')?.foreground).toBe('569cd6');
    expect(rule(dark, 'string')?.foreground).toBe('ce9178');
    expect(rule(dark, 'string.escape')?.foreground).toBe('d7ba7d');
    expect(rule(dark, 'number')?.foreground).toBe('b5cea8');
    expect(rule(dark, 'type')?.foreground).toBe('4ec9b0');
    expect(rule(dark, 'function')?.foreground).toBe('dcdcaa');
    expect(rule(dark, 'variable')?.foreground).toBe('9cdcfe');
    expect(rule(dark, 'constant')?.foreground).toBe('4fc1ff');
    expect(rule(dark, 'tag')?.foreground).toBe('569cd6');
    expect(rule(dark, 'attribute.name')?.foreground).toBe('9cdcfe');
    expect(rule(dark, 'delimiter')?.foreground).toBe('d4d4d4');
    expect(dark.monaco.colors['editor.foreground']).toBe('#d4d4d4');
  });

  it('Light+ usa la paleta oficial de VS Code', () => {
    expect(rule(light, 'comment')).toEqual({ token: 'comment', foreground: '008000' });
    expect(rule(light, 'keyword')?.foreground).toBe('0000ff');
    expect(rule(light, 'keyword.if')?.foreground).toBe('af00db');
    expect(rule(light, 'keyword.return')?.foreground).toBe('af00db');
    expect(rule(light, 'keyword.operator')?.foreground).toBe('000000');
    expect(rule(light, 'keyword.operator.expression')?.foreground).toBe('0000ff');
    expect(rule(light, 'string')?.foreground).toBe('a31515');
    expect(rule(light, 'string.escape')?.foreground).toBe('ee0000');
    expect(rule(light, 'number')?.foreground).toBe('098658');
    expect(rule(light, 'type')?.foreground).toBe('267f99');
    expect(rule(light, 'function')?.foreground).toBe('795e26');
    expect(rule(light, 'variable')?.foreground).toBe('001080');
    expect(rule(light, 'constant')?.foreground).toBe('0070c1');
    expect(rule(light, 'tag')?.foreground).toBe('800000');
    expect(rule(light, 'attribute.name')?.foreground).toBe('e50000');
    expect(rule(light, 'attribute.value')?.foreground).toBe('0000ff');
    expect(rule(light, 'delimiter')?.foreground).toBe('000000');
    expect(light.monaco.colors['editor.foreground']).toBe('#000000');
  });

  it('los comentarios no se fuerzan en cursiva como en VS Code', () => {
    expect(rule(dark, 'comment')?.fontStyle).toBeUndefined();
    expect(rule(light, 'comment')?.fontStyle).toBeUndefined();
  });

  it('cada tema conserva reglas específicas para C#', () => {
    for (const theme of [dark, light]) {
      for (const token of ['keyword.if', 'keyword.foreach', 'keyword.try', 'keyword.using']) {
        expect(rule(theme, token)).toBeDefined();
      }
    }
  });

  it('incluye colores semánticos para clases, métodos y variables de C#', () => {
    expect(rule(dark, 'class')?.foreground).toBe('4ec9b0');
    expect(rule(dark, 'method')?.foreground).toBe('dcdcaa');
    expect(rule(dark, 'field')?.foreground).toBe('9cdcfe');
    expect(rule(dark, 'parameter')?.foreground).toBe('9cdcfe');
    expect(rule(light, 'class')?.foreground).toBe('267f99');
    expect(rule(light, 'method')?.foreground).toBe('795e26');
    expect(rule(light, 'field')?.foreground).toBe('001080');
  });
});

describe('tema VS Dark Experimental (Dark 2026)', () => {
  const experimental = getTheme('vscode-dark-experimental');

  it('mantiene las keywords de declaración en salmón', () => {
    expect(rule(experimental, 'keyword')?.foreground).toBe('ff7b72');
    expect(experimental.monaco.rules.some(item => item.token === 'keyword.using' && item.foreground === 'c586c0')).toBe(false);
  });

  it('usa el violeta de Dark+ para keywords de control', () => {
    expect(rule(experimental, 'keyword.return')?.foreground).toBe('c586c0');
    expect(rule(experimental, 'keyword.if')?.foreground).toBe('c586c0');
    expect(rule(experimental, 'keyword.foreach')?.foreground).toBe('c586c0');
  });

  it('resuelve los símbolos semánticos como VS Code Dark 2026', () => {
    expect(rule(experimental, 'class')?.foreground).toBe('4ec9b0');
    expect(rule(experimental, 'interface')?.foreground).toBe('4ec9b0');
    expect(rule(experimental, 'namespace')?.foreground).toBe('4ec9b0');
    expect(rule(experimental, 'method')?.foreground).toBe('d2a8ff');
    expect(rule(experimental, 'property')?.foreground).toBe('c9d1d9');
    expect(rule(experimental, 'variable')?.foreground).toBe('c9d1d9');
    expect(rule(experimental, 'field')?.foreground).toBe('9cdcfe');
    expect(rule(experimental, 'parameter')?.foreground).toBe('9cdcfe');
    expect(experimental.monaco.rules.find(item => item.token === 'namespace' && item.foreground === '4ec9b0')).toBeDefined();
  });
});
