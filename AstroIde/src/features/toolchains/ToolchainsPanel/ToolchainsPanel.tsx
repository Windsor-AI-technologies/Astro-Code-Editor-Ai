/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Download,
  HardDrive,
  Loader,
  Package,
  RefreshCw,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { useUICtx } from '../../../contexts/UIContext';
import {
  DOTNET_SDK_ID,
  installToolchain,
  listToolchains,
  onToolchainProgress,
  restartLspAfterToolchainChange,
  setToolchainEnabled,
  uninstallToolchain,
} from '../../../services/toolchains';
import type { ToolchainInfo, ToolchainProgress } from '../../../services/toolchains';
import './ToolchainsPanel.css';

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  const mb = bytes / 1_048_576;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

function sourceLabel(toolchain: ToolchainInfo): string {
  if (toolchain.source === 'portable') return 'Instalado';
  if (toolchain.source === 'system') return 'Sistema';
  return 'No instalado';
}

export default function ToolchainsPanel() {
  const ui = useUICtx();
  const [toolchains, setToolchains] = useState<ToolchainInfo[]>([]);
  const [progress, setProgress] = useState<Record<string, ToolchainProgress>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const items = await listToolchains();
      setToolchains(items);
      setError(null);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const unlisten = onToolchainProgress(payload => {
      setProgress(current => ({ ...current, [payload.id]: payload }));
      if (payload.phase === 'done') {
        refresh();
      }
    });

    window.addEventListener('astro:toolchains-changed', refresh);

    return () => {
      unlisten.then(fn => fn()).catch(() => {});
      window.removeEventListener('astro:toolchains-changed', refresh);
    };
  }, [refresh]);

  const dotnetAvailable = useMemo(() => {
    const dotnet = toolchains.find(item => item.id === DOTNET_SDK_ID);
    return Boolean(dotnet && dotnet.installed);
  }, [toolchains]);

  async function handleInstall(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await installToolchain(id);
      await restartLspAfterToolchainChange();
      await refresh();
      ui.showNotification(
        id === DOTNET_SDK_ID
          ? '.NET SDK instalado. IntelliSense de C# activado.'
          : 'IntelliSense de C# activado.',
        5000,
      );
    } catch (cause) {
      setError(String(cause));
      ui.showNotification('No se pudo completar la instalación', 5000);
    } finally {
      setBusyId(null);
      setProgress(current => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  async function handleUninstall(id: string) {
    setConfirmId(null);
    setBusyId(id);
    setError(null);
    try {
      await uninstallToolchain(id);
      await restartLspAfterToolchainChange();
      await refresh();
      ui.showNotification('Herramienta desinstalada', 3500);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(toolchain: ToolchainInfo) {
    setBusyId(toolchain.id);
    try {
      await setToolchainEnabled(toolchain.id, !toolchain.enabled);
      await restartLspAfterToolchainChange();
      await refresh();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="toolchains-panel">
      <div className="toolchains-header">
        <span className="toolchains-title">HERRAMIENTAS Y SDK</span>
        <button
          className="toolchains-refresh"
          title="Actualizar estado"
          onClick={refresh}
          disabled={busyId !== null}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <p className="toolchains-intro">
        Instala compiladores, SDK y servidores de lenguaje sin permisos de
        administrador. Todo se guarda en <code>~/.astroide/toolchains</code> y
        puedes activarlo o desactivarlo cuando quieras.
      </p>

      {error && (
        <div className="toolchains-error">
          <AlertTriangle size={13} />
          <span>{error}</span>
        </div>
      )}

      <div className="toolchains-list">
        {loading && (
          <div className="toolchains-loading">
            <Loader size={14} className="spin" /> Detectando herramientas…
          </div>
        )}

        {!loading &&
          toolchains.map(toolchain => {
            const activeProgress = progress[toolchain.id];
            const busy = busyId === toolchain.id;
            const installing = busy && activeProgress && activeProgress.phase !== 'done';
            const percent =
              activeProgress && activeProgress.total > 0
                ? Math.min(100, Math.round((activeProgress.downloaded / activeProgress.total) * 100))
                : null;
            const blocked =
              toolchain.requires === DOTNET_SDK_ID && !dotnetAvailable;
            const canToggle =
              toolchain.installed &&
              (toolchain.source === 'portable' || toolchain.id !== DOTNET_SDK_ID);

            return (
              <article key={toolchain.id} className="toolchain-card">
                <div className="toolchain-card-head">
                  <span className="toolchain-icon">
                    {toolchain.kind === 'sdk' ? <Package size={16} /> : <Code2 size={16} />}
                  </span>
                  <div className="toolchain-heading">
                    <span className="toolchain-name">{toolchain.name}</span>
                    <span className={`toolchain-badge ${toolchain.source}`}>
                      {toolchain.installed && <CheckCircle2 size={10} />}
                      {sourceLabel(toolchain)}
                    </span>
                  </div>
                  {canToggle && (
                    <button
                      className={`toolchain-toggle ${toolchain.enabled ? 'on' : 'off'}`}
                      title={toolchain.enabled ? 'Desactivar' : 'Activar'}
                      onClick={() => handleToggle(toolchain)}
                      disabled={busyId !== null}
                    >
                      {toolchain.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                  )}
                </div>

                <p className="toolchain-description">{toolchain.description}</p>

                <div className="toolchain-meta">
                  {toolchain.version && (
                    <span className="toolchain-version">v{toolchain.version}</span>
                  )}
                  {toolchain.kind === 'sdk' && (
                    <span className="toolchain-size">
                      <HardDrive size={10} /> descarga ≈ 250 MB
                    </span>
                  )}
                  {toolchain.kind === 'language-server' && (
                    <span className="toolchain-size">
                      <HardDrive size={10} /> descarga ≈ 10 MB
                    </span>
                  )}
                  {toolchain.source === 'system' && (
                    <span className="toolchain-system">
                      <ShieldCheck size={10} /> Ya disponible en tu sistema
                    </span>
                  )}
                </div>

                {blocked && (
                  <div className="toolchain-hint">
                    <AlertTriangle size={11} /> Instala primero .NET SDK para
                    activar el IntelliSense.
                  </div>
                )}

                {installing && activeProgress && (
                  <div className="toolchain-progress">
                    <div className="toolchain-progress-text">
                      <span>{activeProgress.message}</span>
                      {percent !== null && <span>{percent}%</span>}
                    </div>
                    <div className="toolchain-progress-track">
                      <div
                        className={`toolchain-progress-bar ${percent === null ? 'indeterminate' : ''}`}
                        style={percent !== null ? { width: `${percent}%` } : undefined}
                      />
                    </div>
                    {activeProgress.total > 0 && (
                      <span className="toolchain-progress-bytes">
                        {formatBytes(activeProgress.downloaded)} / {formatBytes(activeProgress.total)}
                      </span>
                    )}
                  </div>
                )}

                <div className="toolchain-actions">
                  {toolchain.canInstall && (
                    <button
                      className="toolchain-btn primary"
                      onClick={() => handleInstall(toolchain.id)}
                      disabled={busyId !== null || blocked}
                    >
                      {busy ? (
                        <Loader size={12} className="spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      {busy ? 'Instalando…' : toolchain.source === 'none' ? 'Instalar' : 'Instalar portátil'}
                    </button>
                  )}

                  {toolchain.canUninstall && confirmId !== toolchain.id && (
                    <button
                      className="toolchain-btn danger"
                      title="Desinstalar"
                      onClick={() => setConfirmId(toolchain.id)}
                      disabled={busyId !== null}
                    >
                      <Trash2 size={12} /> Desinstalar
                    </button>
                  )}

                  {confirmId === toolchain.id && (
                    <div className="toolchain-confirm">
                      <span>¿Eliminar {toolchain.name}?</span>
                      <button
                        className="toolchain-btn danger"
                        onClick={() => handleUninstall(toolchain.id)}
                      >
                        Sí
                      </button>
                      <button
                        className="toolchain-btn"
                        onClick={() => setConfirmId(null)}
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
      </div>

      <div className="toolchains-footer">
        <ShieldCheck size={11} />
        Se instala en tu carpeta de usuario, sin tocar el sistema.
      </div>

      <div className="toolchains-footer">
        <Code2 size={11} />
        IntelliSense de C#: abre una carpeta con un proyecto .csproj o .sln.
      </div>
    </div>
  );
}
