import { createContext, useContext } from 'react';
import type { VSXExtension, InstalledExtension, ExtensionInstallStatus } from '../types';

export interface ExtensionsContextValue {
  searchResults: VSXExtension[];
  installed: InstalledExtension[];
  selected: VSXExtension | null;
  setSelected: (ext: VSXExtension | null) => void;
  loading: boolean;
  error: string | null;
  query: string;
  totalSize: number;
  search: (query: string, offset?: number) => Promise<void>;
  install: (ext: VSXExtension) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
  toggleEnabled: (id: string, enabled: boolean) => Promise<void>;
  isInstalled: (namespace: string, name: string) => boolean;
  getStatus: (namespace: string, name: string) => ExtensionInstallStatus;
}

export const ExtensionsContext = createContext<ExtensionsContextValue>(null!);
export const useExtensionsCtx = () => useContext(ExtensionsContext);
