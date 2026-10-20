/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { parseCallFrames, parseVariables, urlToPath } from '../../services/debugger';
import {
  FALLBACK_DOTNET_TEMPLATES,
  registerDotnetActions,
} from '../../services/core/dotnetActions';
import { getAction, unregisterAction } from '../../services/core/actionRegistry';
import { showInputBox, showQuickPick } from '../../services/ui/quickPick';

vi.mocked(invoke);

vi.mock('../../services/ui/quickPick', () => ({
  showQuickPick: vi.fn(),
  showInputBox: vi.fn(),
}));

vi.mock('../../services/tauri', async () => {
  const actual = await vi.importActual<typeof import('../../services/tauri')>('../../services/tauri');
  return { ...actual, openFolderDialog: vi.fn() };
});

const handlers = {
  showNotification: vi.fn(),
  getRootPath: vi.fn(() => '/home/user/proyectos'),
  refreshTree: vi.fn(),
  openFolder: vi.fn(),
  openOutput: vi.fn(),
  openToolchains: vi.fn(),
};

describe('services/debugger helpers', () => {
  it('urlToPath convierte URLs de Linux', () => {
    expect(urlToPath('file:///home/user/app.js')).toBe('/home/user/app.js');
  });

  it('urlToPath decodifica espacios', () => {
    expect(urlToPath('file:///home/user/mi%20app.js')).toBe('/home/user/mi app.js');
  });

  it('urlToPath acepta rutas vacías', () => {
    expect(urlToPath('')).toBe('');
  });

  it('parseCallFrames convierte a índices base 1', () => {
    const frames = parseCallFrames({
      callFrames: [{
        callFrameId: '1',
        functionName: 'main',
        url: 'file:///tmp/app.js',
        location: { lineNumber: 4, columnNumber: 2 },
        scopeChain: [{ type: 'local', object: { objectId: 'obj-1' } }],
      }],
    });

    expect(frames[0].lineNumber).toBe(5);
    expect(frames[0].columnNumber).toBe(3);
    expect(frames[0].scopeChain[0].type).toBe('local');
  });

  it('parseVariables formatea valores y descarta internos', () => {
    const variables = parseVariables({
      result: {
        result: [
          { name: '__proto__', value: { type: 'object' } },
          { name: 'x', value: { type: 'number', value: 42 } },
          { name: 'msg', value: { type: 'string', value: 'hola' } },
        ],
      },
    });

    expect(variables).toEqual([
      { name: 'x', value: '42', type: 'number', objectId: undefined },
      { name: 'msg', value: '"hola"', type: 'string', objectId: undefined },
    ]);
  });
});

describe('acciones .NET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ['dotnet.createProject', 'dotnet.buildProject', 'dotnet.runProject', 'dotnet.testProject', 'dotnet.restoreProject', 'dotnet.installCsharpLs', 'toolchains.open']
      .forEach(unregisterAction);
    registerDotnetActions(handlers);
  });

  it('registra los comandos de .NET en la paleta', () => {
    expect(getAction('dotnet.createProject')?.title).toBe('Crear proyecto...');
    expect(getAction('dotnet.buildProject')?.category).toBe('.NET');
    expect(getAction('dotnet.runProject')).toBeTruthy();
    expect(getAction('toolchains.open')?.category).toBe('Herramientas');
  });

  it('crea un proyecto con la plantilla elegida y refresca el árbol', async () => {
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === 'dotnet_info') return { available: true, version: '10.0.400' };
      if (command === 'dotnet_list_templates') {
        return [{ shortName: 'console', name: 'Console App', language: '[C#]', tags: 'Common/Console' }];
      }
      if (command === 'dotnet_new') return 'ok';
      return undefined;
    });

    vi.mocked(showQuickPick)
      .mockResolvedValueOnce({ label: 'Console App', value: 'console' })
      .mockResolvedValueOnce({ label: 'Mantener la carpeta actual', value: 'stay' });
    vi.mocked(showInputBox).mockResolvedValue('MiApp');

    await getAction('dotnet.createProject')!.run();

    expect(invoke).toHaveBeenCalledWith('dotnet_new', {
      template: 'console',
      name: 'MiApp',
      outputDir: '/home/user/proyectos/MiApp',
    });
    expect(handlers.refreshTree).toHaveBeenCalled();
    expect(handlers.showNotification).toHaveBeenCalledWith(expect.stringContaining('MiApp'));
  });

  it('abre el gestor de herramientas desde la paleta', async () => {
    await getAction('toolchains.open')!.run();

    expect(handlers.openToolchains).toHaveBeenCalledTimes(1);
  });

  it('dirige la instalación de C# al gestor de herramientas', async () => {
    await getAction('dotnet.installCsharpLs')!.run();

    expect(handlers.openToolchains).toHaveBeenCalledTimes(1);
    expect(handlers.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('Herramientas y SDK'),
      expect.any(Number),
    );
  });

  it('usa las plantillas de respaldo cuando el SDK no responde', async () => {
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === 'dotnet_info') return { available: true, version: '9.0.100' };
      if (command === 'dotnet_list_templates') throw new Error('sin plantillas');
      return undefined;
    });

    vi.mocked(showQuickPick).mockResolvedValueOnce(null);

    await getAction('dotnet.createProject')!.run();

    const firstCall = vi.mocked(showQuickPick).mock.calls[0][0];
    const labels = firstCall.items.map(item => item.label);
    expect(labels).toContain('Console App');
    expect(firstCall.items.length).toBe(FALLBACK_DOTNET_TEMPLATES.length);
  });

  it('avisa cuando el SDK de .NET no está instalado', async () => {
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === 'dotnet_info') return { available: false, version: '' };
      return undefined;
    });

    vi.mocked(showQuickPick).mockResolvedValueOnce({ label: 'Cancelar', value: 'cancel' });

    await getAction('dotnet.createProject')!.run();

    expect(vi.mocked(showQuickPick).mock.calls[0][0].title).toContain('Crear proyecto');
    expect(invoke).not.toHaveBeenCalledWith('dotnet_new', expect.anything());
  });
});
