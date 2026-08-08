import { useEffect, useState } from 'react';
import { Search, Download, CheckCircle, Trash2, Loader, ToggleLeft, ToggleRight, ArrowLeft, Star } from 'lucide-react';
import { useExtensionsCtx } from '../../../contexts/ExtensionsContext';
import type { VSXExtension } from '../../../types';
import './ExtensionsPanel.css';

export default function ExtensionsPanel() {
  const {
    searchResults, installed, selected, setSelected,
    loading, error, search,
    install, uninstall, toggleEnabled, getStatus,
  } = useExtensionsCtx();

  const [localQuery, setLocalQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'installed'>('search');

  // Load popular on mount
  useEffect(() => {
    search('');
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    search(localQuery || '');
  }

  return (
    <div className="extensions-panel">
      {selected ? (
        <ExtensionDetail ext={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
      <div className="extensions-header">
        <span className="extensions-title">EXTENSIONES</span>
      </div>

      {/* Search */}
      <form className="extensions-search" onSubmit={handleSearch}>
        <div className="extensions-input-wrap">
          <Search size={12} className="extensions-search-icon" />
          <input
            className="extensions-input"
            type="text"
            placeholder="Buscar en Open VSX..."
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
          />
        </div>
      </form>

      {/* Tabs */}
      <div className="extensions-tabs">
        <button
          className={`ext-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Marketplace
        </button>
        <button
          className={`ext-tab ${activeTab === 'installed' ? 'active' : ''}`}
          onClick={() => setActiveTab('installed')}
        >
          Instaladas ({installed.length})
        </button>
      </div>

      {error && <div className="ext-error">{error}</div>}

      {/* Content */}
      <div className="extensions-list">
        {activeTab === 'search' ? (
          loading ? (
            <div className="ext-loading"><Loader size={16} className="spin" /> Buscando...</div>
          ) : searchResults.length === 0 ? (
            <div className="ext-empty">Sin resultados</div>
          ) : (
            searchResults.map(ext => (
              <ExtensionCard
                key={`${ext.namespace}.${ext.name}`}
                ext={ext}
                status={getStatus(ext.namespace, ext.name)}
                onInstall={() => install(ext)}
                onSelect={() => setSelected(ext)}
              />
            ))
          )
        ) : (
          installed.length === 0 ? (
            <div className="ext-empty">No hay extensiones instaladas</div>
          ) : (
            installed.map(ext => (
              <InstalledCard
                key={ext.id}
                ext={ext}
                onUninstall={() => uninstall(ext.id)}
                onToggle={(enabled) => toggleEnabled(ext.id, enabled)}
              />
            ))
          )
        )}
      </div>
      </>
      )}
    </div>
  );
}

// ── Extension Card (search result) ──────────────────────────────────────────

function ExtensionCard({ ext, status, onInstall, onSelect }: {
  ext: VSXExtension;
  status: string;
  onInstall: () => void;
  onSelect: () => void;
}) {
  return (
    <div className="ext-card" onClick={onSelect}>
      <div className="ext-card-icon">
        {ext.icon ? (
          <img src={ext.icon} alt="" width={32} height={32} />
        ) : (
          <div className="ext-card-icon-placeholder" />
        )}
      </div>
      <div className="ext-card-info">
        <div className="ext-card-name">{ext.displayName}</div>
        <div className="ext-card-publisher">{ext.publisher.loginName}</div>
        <div className="ext-card-desc">{ext.description}</div>
        <div className="ext-card-meta">
          {ext.downloadCount !== undefined && (
            <span className="ext-meta-item">↓ {formatCount(ext.downloadCount)}</span>
          )}
          {ext.averageRating !== undefined && ext.averageRating > 0 && (
            <span className="ext-meta-item"><Star size={10} /> {ext.averageRating.toFixed(1)}</span>
          )}
        </div>
      </div>
      <div className="ext-card-action" onClick={e => { e.stopPropagation(); if (status === 'idle') onInstall(); }}>
        {status === 'idle' && <Download size={14} className="ext-action-btn" />}
        {status === 'downloading' && <Loader size={14} className="spin" />}
        {status === 'installing' && <Loader size={14} className="spin" />}
        {status === 'installed' && <CheckCircle size={14} className="ext-installed-icon" />}
        {status === 'error' && <span className="ext-error-icon">!</span>}
      </div>
    </div>
  );
}

// ── Installed Extension Card ─────────────────────────────────────────────────

function InstalledCard({ ext, onUninstall, onToggle }: {
  ext: any;
  onUninstall: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className={`ext-card ${!ext.enabled ? 'disabled' : ''}`}>
      <div className="ext-card-icon">
        <div className="ext-card-icon-placeholder" />
      </div>
      <div className="ext-card-info">
        <div className="ext-card-name">{ext.displayName || ext.name}</div>
        <div className="ext-card-publisher">{ext.publisher}</div>
        <div className="ext-card-desc">{ext.description}</div>
        <div className="ext-card-version">v{ext.version}</div>
      </div>
      <div className="ext-card-actions">
        <button className="ext-icon-btn" onClick={() => onToggle(!ext.enabled)} title={ext.enabled ? 'Deshabilitar' : 'Habilitar'}>
          {ext.enabled ? <ToggleRight size={14} className="ext-enabled" /> : <ToggleLeft size={14} />}
        </button>
        <button className="ext-icon-btn danger" onClick={onUninstall} title="Desinstalar">
          <Trash2 size={13} />
        </button>      </div>
    </div>
  );
}

// ── Extension Detail View ────────────────────────────────────────────────────

function ExtensionDetail({ ext, onBack }: { ext: VSXExtension; onBack: () => void }) {
  const { install, getStatus } = useExtensionsCtx();
  const status = getStatus(ext.namespace, ext.name);

  return (
    <div className="ext-detail">
      <div className="ext-detail-header">
        <button className="ext-back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Volver
        </button>
      </div>
      <div className="ext-detail-hero">
        {ext.icon ? (
          <img src={ext.icon} alt="" width={48} height={48} className="ext-detail-icon" />
        ) : (
          <div className="ext-detail-icon-placeholder" />
        )}
        <div>
          <div className="ext-detail-name">{ext.displayName}</div>
          <div className="ext-detail-publisher">{ext.publisher.loginName} · v{ext.version}</div>
        </div>
      </div>

      <button
        className={`ext-install-btn ${status !== 'idle' ? 'disabled' : ''}`}
        onClick={() => status === 'idle' && install(ext)}
        disabled={status !== 'idle'}
      >
        {status === 'idle' && <><Download size={13} /> Instalar</>}
        {(status === 'downloading' || status === 'installing') && <><Loader size={13} className="spin" /> Instalando...</>}
        {status === 'installed' && <><CheckCircle size={13} /> Instalada</>}
        {status === 'error' && 'Error al instalar'}
      </button>

      <div className="ext-detail-desc">{ext.description}</div>

      <div className="ext-detail-meta">
        {ext.downloadCount !== undefined && (
          <div className="ext-meta-row"><span>Descargas</span><span>{formatCount(ext.downloadCount)}</span></div>
        )}
        {ext.averageRating !== undefined && ext.averageRating > 0 && (
          <div className="ext-meta-row"><span>Rating</span><span>{ext.averageRating.toFixed(1)} ★</span></div>
        )}
        {ext.categories && ext.categories.length > 0 && (
          <div className="ext-meta-row"><span>Categorías</span><span>{ext.categories.join(', ')}</span></div>
        )}
      </div>

      {ext.tags && ext.tags.length > 0 && (
        <div className="ext-tags">
          {ext.tags.slice(0, 8).map(tag => (
            <span key={tag} className="ext-tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
