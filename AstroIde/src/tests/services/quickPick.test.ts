/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { describe, it, expect, beforeEach } from 'vitest';
import {
  cancelQuickPick,
  getQuickPickState,
  resolveQuickPick,
  showInputBox,
  showQuickPick,
  subscribeQuickPick,
} from '../../services/ui/quickPick';

describe('services/ui/quickPick', () => {
  beforeEach(() => {
    cancelQuickPick();
  });

  it('muestra una lista y resuelve con el item elegido', async () => {
    const promise = showQuickPick({
      title: 'Selecciona',
      items: [{ label: 'Console', value: 'console' }],
    });

    expect(getQuickPickState()?.kind).toBe('pick');
    resolveQuickPick({ label: 'Console', value: 'console' });

    await expect(promise).resolves.toEqual({ label: 'Console', value: 'console' });
    expect(getQuickPickState()).toBeNull();
  });

  it('resuelve null al cancelar', async () => {
    const promise = showQuickPick({ title: 'Selecciona', items: [] });
    cancelQuickPick();
    await expect(promise).resolves.toBeNull();
  });

  it('muestra una caja de texto y devuelve el valor', async () => {
    const promise = showInputBox({ title: 'Nombre' });
    expect(getQuickPickState()?.kind).toBe('input');
    resolveQuickPick('MiProyecto');
    await expect(promise).resolves.toBe('MiProyecto');
  });

  it('cancelar un diálogo no rompe a los suscriptores', () => {
    const seen: (string | null)[] = [];
    const unsubscribe = subscribeQuickPick(() => {
      seen.push(getQuickPickState()?.kind ?? null);
    });

    showQuickPick({ title: 'Uno', items: [] });
    cancelQuickPick();
    unsubscribe();

    expect(seen).toEqual(['pick', null]);
  });

  it('un segundo diálogo cancela al anterior', async () => {
    const first = showQuickPick({ title: 'Primero', items: [] });
    showInputBox({ title: 'Segundo' });

    await expect(first).resolves.toBeNull();
    expect(getQuickPickState()?.kind).toBe('input');
    cancelQuickPick();
  });
});
