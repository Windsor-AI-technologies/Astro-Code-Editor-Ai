/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { lspClient } from './lsp-client';
import { clearDocumentVersions } from './lsp-monaco-bridge';

export type ToolchainSource = 'portable' | 'system' | 'none';

export interface ToolchainInfo {
  id: string;
  name: string;
  description: string;
  kind: 'sdk' | 'language-server' | string;
  installed: boolean;
  enabled: boolean;
  version: string | null;
  source: ToolchainSource;
  installPath: string | null;
  canInstall: boolean;
  canUninstall: boolean;
  requires: string | null;
}

export type ToolchainPhase =
  | 'metadata'
  | 'download'
  | 'verify'
  | 'extract'
  | 'tools'
  | 'done'
  | 'error';

export interface ToolchainProgress {
  id: string;
  phase: ToolchainPhase;
  message: string;
  downloaded: number;
  total: number;
}

export const DOTNET_SDK_ID = 'dotnet-sdk';
export const CSHARP_LS_ID = 'csharp-ls';

export function listToolchains(): Promise<ToolchainInfo[]> {
  return invoke<ToolchainInfo[]>('toolchain_list');
}

export function installToolchain(id: string): Promise<void> {
  return invoke<void>('toolchain_install', { id });
}

export function uninstallToolchain(id: string): Promise<void> {
  return invoke<void>('toolchain_uninstall', { id });
}

export function setToolchainEnabled(id: string, enabled: boolean): Promise<void> {
  return invoke<void>('toolchain_set_enabled', { id, enabled });
}

export function onToolchainProgress(
  callback: (progress: ToolchainProgress) => void,
): Promise<UnlistenFn> {
  return listen<ToolchainProgress>('toolchain-progress', event =>
    callback(event.payload),
  );
}

export function askToolchainsRefresh() {
  window.dispatchEvent(new Event('astro:toolchains-changed'));
}

/**
 * Reinicia los servidores LSP tras cambiar herramientas instaladas.
 * Los modelos abiertos se vuelven a sincronizar desde CodeEditor.
 */
export async function restartLspAfterToolchainChange(): Promise<void> {
  await lspClient.stopAll();
  clearDocumentVersions();
  window.dispatchEvent(new Event('astro:lsp-restart'));
}
