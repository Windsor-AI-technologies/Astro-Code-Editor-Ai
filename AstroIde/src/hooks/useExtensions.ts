import { useState, useCallback, useEffect } from 'react';
import type { VSXExtension, InstalledExtension, ExtensionInstallStatus } from '../types';
import * as api from '../services/tauri';

/**
 * useExtensions — manages the extensions marketplace and installed extensions.
 * SRP: Only extension lifecycle (search, install, uninstall, enable/disable).
 */
export function useExtensions() {
  const [searchResults, setSearchResults] = useState<VSXExtension[]>([]);
  const [installed, setInstalled] = useState<InstalledExtension[]>([]);
  const [selected, setSelected] = useState<VSXExtension | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installStatus, setInstallStatus] = useState<Record<string, ExtensionInstallStatus>>({});
  const [query, setQuery] = useState('');
  const [totalSize, setTotalSize] = useState(0);

  // Load installed extensions on mount
  useEffect(() => {
    loadInstalled();
  }, []);

  const loadInstalled = useCallback(async () => {
    try {
      const list = await api.extListInstalled();
      setInstalled(list);
    } catch {
      setInstalled([]);
    }
  }, []);

  const search = useCallback(async (q: string, offset = 0) => {
    if (!q.trim()) {
      // Show popular extensions when query is empty
      q = 'prettier';
    }
    setLoading(true);
    setError(null);
    setQuery(q);
    try {
      const result = await api.extSearch(q, offset);
      const exts = parseSearchResults(result);
      setSearchResults(exts.extensions);
      setTotalSize(exts.total);
    } catch (e) {
      setError(`Error al buscar: ${e}`);
      setSearchResults([]);
    }
    setLoading(false);
  }, []);

  const install = useCallback(async (ext: VSXExtension) => {
    const id = `${ext.namespace}.${ext.name}`;
    setInstallStatus(prev => ({ ...prev, [id]: 'downloading' }));
    try {
      setInstallStatus(prev => ({ ...prev, [id]: 'installing' }));
      await api.extInstall(ext.namespace, ext.name, ext.version);
      setInstallStatus(prev => ({ ...prev, [id]: 'installed' }));
      await loadInstalled();
    } catch (e) {
      setInstallStatus(prev => ({ ...prev, [id]: 'error' }));
      setError(`Error al instalar: ${e}`);
    }
  }, [loadInstalled]);

  const uninstall = useCallback(async (id: string) => {
    try {
      await api.extUninstall(id);
      setInstallStatus(prev => ({ ...prev, [id]: 'idle' }));
      await loadInstalled();
    } catch (e) {
      setError(`Error al desinstalar: ${e}`);
    }
  }, [loadInstalled]);

  const toggleEnabled = useCallback(async (id: string, enabled: boolean) => {
    try {
      await api.extSetEnabled(id, enabled);
      await loadInstalled();
    } catch (e) {
      setError(`Error: ${e}`);
    }
  }, [loadInstalled]);

  const isInstalled = useCallback((namespace: string, name: string) => {
    return installed.some(ext => ext.id === `${namespace}.${name}`);
  }, [installed]);

  const getStatus = useCallback((namespace: string, name: string): ExtensionInstallStatus => {
    const id = `${namespace}.${name}`;
    if (installStatus[id]) return installStatus[id];
    if (isInstalled(namespace, name)) return 'installed';
    return 'idle';
  }, [installStatus, isInstalled]);

  return {
    searchResults, installed, selected, setSelected,
    loading, error, query, totalSize,
    search, install, uninstall, toggleEnabled,
    isInstalled, getStatus, loadInstalled,
  };
}

// ── Parse Open VSX response ───────────────────────────────────────────────────

function parseSearchResults(raw: any): { extensions: VSXExtension[]; total: number } {
  if (!raw?.extensions) return { extensions: [], total: 0 };

  const extensions: VSXExtension[] = raw.extensions.map((e: any) => ({
    namespace: e.namespace,
    name: e.name,
    displayName: e.displayName ?? e.name,
    version: e.version ?? 'latest',
    description: e.description ?? '',
    averageRating: e.averageRating,
    reviewCount: e.reviewCount,
    downloadCount: e.downloadCount,
    timestamp: e.timestamp,
    icon: e.files?.icon,
    publisher: {
      loginName: e.namespace,
      displayName: e.namespaceDisplayName,
    },
    tags: e.tags ?? [],
    categories: e.categories ?? [],
  }));

  return { extensions, total: raw.totalSize ?? extensions.length };
}
