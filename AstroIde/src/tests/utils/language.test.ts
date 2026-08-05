import { describe, it, expect } from 'vitest';
import { getLanguageFromPath } from '../../utils/language';

describe('utils/language', () => {
  it('detecta TypeScript', () => {
    expect(getLanguageFromPath('file.ts')).toBe('typescript');
    expect(getLanguageFromPath('component.tsx')).toBe('typescript');
  });

  it('detecta JavaScript', () => {
    expect(getLanguageFromPath('app.js')).toBe('javascript');
    expect(getLanguageFromPath('App.jsx')).toBe('javascript');
  });

  it('detecta Rust', () => {
    expect(getLanguageFromPath('main.rs')).toBe('rust');
  });

  it('detecta Python', () => {
    expect(getLanguageFromPath('script.py')).toBe('python');
  });

  it('detecta CSS/SCSS', () => {
    expect(getLanguageFromPath('styles.css')).toBe('css');
    expect(getLanguageFromPath('theme.scss')).toBe('scss');
  });

  it('detecta HTML', () => {
    expect(getLanguageFromPath('index.html')).toBe('html');
  });

  it('detecta JSON', () => {
    expect(getLanguageFromPath('package.json')).toBe('json');
  });

  it('detecta Markdown', () => {
    expect(getLanguageFromPath('README.md')).toBe('markdown');
  });

  it('retorna plaintext para extensiones desconocidas', () => {
    expect(getLanguageFromPath('file.xyz')).toBe('plaintext');
    expect(getLanguageFromPath('noextension')).toBe('plaintext');
  });

  it('maneja paths con directorios', () => {
    expect(getLanguageFromPath('/users/dev/src/App.tsx')).toBe('typescript');
    expect(getLanguageFromPath('C:\\Users\\dev\\main.rs')).toBe('rust');
  });
});
