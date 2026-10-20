/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
/**
 * QuickPick / InputBox — diálogos de segundo nivel para la paleta de
 * comandos (estilo VS Code): "Lista de opciones" y "Entrada de texto".
 * Permite que una acción pida datos al usuario sin acoplarse a la UI.
 */
export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  /** Valor devuelto si difiere del label (p. ej. el short name de dotnet). */
  value?: string;
}

export interface QuickPickOptions {
  title: string;
  placeholder?: string;
  items: QuickPickItem[];
}

export interface InputBoxOptions {
  title: string;
  prompt?: string;
  placeholder?: string;
  value?: string;
  validate?: (value: string) => string | null;
}

export type QuickPickState =
  | { kind: 'pick'; options: QuickPickOptions }
  | { kind: 'input'; options: InputBoxOptions };

type Listener = () => void;

let current: QuickPickState | null = null;
let resolver: ((value: QuickPickItem | string | null) => void) | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach(listener => listener());
}

function finish(value: QuickPickItem | string | null): void {
  if (!current && !resolver) return;
  const resolve = resolver;
  resolver = null;
  current = null;
  notify();
  resolve?.(value);
}

export function subscribeQuickPick(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getQuickPickState(): QuickPickState | null {
  return current;
}

/** Muestra una lista seleccionable y resuelve con el item elegido (o null). */
export function showQuickPick(options: QuickPickOptions): Promise<QuickPickItem | null> {
  finish(null);
  current = { kind: 'pick', options };
  notify();
  return new Promise(resolve => {
    resolver = resolve as (value: QuickPickItem | string | null) => void;
  });
}

/** Muestra una caja de texto y resuelve con el valor introducido (o null). */
export function showInputBox(options: InputBoxOptions): Promise<string | null> {
  finish(null);
  current = { kind: 'input', options };
  notify();
  return new Promise(resolve => {
    resolver = resolve as (value: QuickPickItem | string | null) => void;
  });
}

/** El componente llama a esto al confirmar una selección. */
export function resolveQuickPick(value: QuickPickItem | string | null): void {
  finish(value);
}

/** Cancela el diálogo activo (Escape, click fuera). */
export function cancelQuickPick(): void {
  finish(null);
}
