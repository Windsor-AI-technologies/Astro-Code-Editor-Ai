import { useState } from "react";
import {
  Database,
  Table,
  Plus,
  Play,
  Server,
  RefreshCw,
  Download,
  X,
  ArrowUpDown,
  Loader,
} from "lucide-react";
import "./database.css";

type DBType = "supabase" | "mysql" | "sqlserver";

interface Connection {
  id: string;
  name: string;
  type: DBType;
  host: string;
  port: number;
  database: string;
  tables: string[];
  connected: boolean;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  time: number;
}

export default function DatabaseView() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConn, setActiveConn] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [queryMode, setQueryMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: "",
    type: "supabase" as DBType,
    host: "",
    port: 5432,
    database: "",
    user: "",
    password: "",
  });

  const currentConn = connections.find((c) => c.id === activeConn);

  async function handleConnect() {
    const newConn: Connection = {
      id: `conn-${Date.now()}`,
      name: modalForm.name || `${modalForm.type}@${modalForm.host}`,
      type: modalForm.type,
      host: modalForm.host,
      port: modalForm.port,
      database: modalForm.database,
      tables: ["users", "orders", "products"],
      connected: true,
    };
    setConnections((prev) => [...prev, newConn]);
    setActiveConn(newConn.id);
    setShowModal(false);
    setModalForm({
      name: "",
      type: "supabase",
      host: "",
      port: 5432,
      database: "",
      user: "",
      password: "",
    });
  }

  function handleSelectTable(table: string) {
    setSelectedTable(table);
    setQuery(`SELECT * FROM ${table} LIMIT 50;`);
    setQueryMode(true);
  }

  function handleDisconnect(connId: string) {
    setConnections((prev) => prev.filter((c) => c.id !== connId));
    if (activeConn === connId) {
      setActiveConn(null);
      setResults(null);
    }
  }

  async function handleRunQuery() {
    if (!query.trim() || !activeConn) return;
    setLoading(true);
    setTimeout(() => {
      setResults({
        columns: ["id", "name", "email", "created_at"],
        rows: [
          {
            id: 1,
            name: "Jeshua",
            email: "jeshua@astro.dev",
            created_at: "2024-01-15",
          },
          {
            id: 2,
            name: "Maria",
            email: "maria@email.com",
            created_at: "2024-02-20",
          },
        ],
        rowCount: 2,
        time: 12,
      });
      setLoading(false);
    }, 500);
  }

  return (
    <div className="db-view">
      {/* Sidebar */}
      <div className="db-sidebar">
        <div className="db-sidebar-top">
          <div className="db-sidebar-header">
            <Database size={14} />
            <span>Connections</span>
            <button
              className="db-sidebar-action"
              onClick={() => setShowModal(true)}
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
        <div className="db-table-list">
          {connections.length === 0 ? (
            <div className="db-empty-sidebar">
              <Server size={20} />
              <p>No connections</p>
              <button onClick={() => setShowModal(true)}>
                + Add connection
              </button>
            </div>
          ) : (
            connections.map((conn) => (
              <div key={conn.id} className="db-conn-group">
                <div
                  className={`db-conn-item ${activeConn === conn.id ? "active" : ""}`}
                  onClick={() => setActiveConn(conn.id)}
                >
                  <Server
                    size={12}
                    className={`db-conn-icon db-type-${conn.type}`}
                  />
                  <span className="db-conn-name">{conn.name}</span>
                  <button
                    className="db-conn-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDisconnect(conn.id);
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
                {activeConn === conn.id && (
                  <div className="db-conn-tables">
                    {conn.tables.map((t) => (
                      <div
                        key={t}
                        className={`db-table-item ${selectedTable === t ? "active" : ""}`}
                        onClick={() => handleSelectTable(t)}
                      >
                        <Table size={11} />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main */}
      <div className="db-main">
        {!activeConn ? (
          <div className="db-no-conn">
            <Database size={48} />
            <h2>Database</h2>
            <p>Connect to a database to start querying</p>
            <button
              className="db-connect-btn"
              onClick={() => setShowModal(true)}
            >
              <Plus size={14} /> New Connection
            </button>
          </div>
        ) : (
          <>
            <div className="db-topbar">
              <div className="db-topbar-left">
                <h3 className="db-table-title">
                  {selectedTable ?? currentConn?.database ?? "Query"}
                </h3>
                {results && (
                  <span className="db-row-count">
                    {results.rowCount} rows · {results.time}ms
                  </span>
                )}
              </div>
              <div className="db-topbar-actions">
                <button
                  className={`db-topbar-btn ${queryMode ? "active" : ""}`}
                  onClick={() => setQueryMode(!queryMode)}
                >
                  <Play size={13} /> SQL
                </button>
                <button className="db-topbar-btn">
                  <ArrowUpDown size={13} /> Sort
                </button>
                <button className="db-topbar-btn">
                  <Download size={13} /> Export
                </button>
                <button className="db-topbar-btn">
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {queryMode && (
              <div className="db-sql-editor">
                <textarea
                  className="db-sql-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SELECT * FROM ..."
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) handleRunQuery();
                  }}
                />
                <button
                  className="db-sql-run"
                  onClick={handleRunQuery}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader size={12} className="spin" />
                  ) : (
                    <Play size={12} />
                  )}{" "}
                  Run
                </button>
              </div>
            )}

            {results ? (
              <div className="db-spreadsheet">
                <table className="db-table">
                  <thead>
                    <tr>
                      {results.columns.map((col) => (
                        <th key={col}>
                          <div className="db-th-content">
                            <span className="db-th-name">{col}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.map((row, i) => (
                      <tr key={i}>
                        {results.columns.map((col) => (
                          <td key={col} className="db-cell">
                            {row[col] === null ? (
                              <span className="db-null">NULL</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="db-no-results">
                <p>Run a query or select a table</p>
              </div>
            )}

            {results && (
              <div className="db-bottombar">
                <span>
                  {results.rows.length} of {results.rowCount} rows
                </span>
                <span>{results.time}ms</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="db-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-header">
              <h3>New Connection</h3>
              <button
                className="db-modal-close"
                onClick={() => setShowModal(false)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="db-modal-body">
              <div className="db-field">
                <label>Name</label>
                <input
                  value={modalForm.name}
                  onChange={(e) =>
                    setModalForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="My Database"
                />
              </div>
              <div className="db-field">
                <label>Type</label>
                <div className="db-type-selector">
                  {(["supabase", "mysql", "sqlserver"] as DBType[]).map((t) => (
                    <button
                      key={t}
                      className={`db-type-btn ${modalForm.type === t ? "active" : ""}`}
                      onClick={() =>
                        setModalForm((p) => ({
                          ...p,
                          type: t,
                          port:
                            t === "mysql"
                              ? 3306
                              : t === "sqlserver"
                                ? 1433
                                : 5432,
                        }))
                      }
                    >
                      {t === "supabase" && "🟢 Supabase"}
                      {t === "mysql" && "🐬 MySQL"}
                      {t === "sqlserver" && "🔷 SQL Server"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="db-field-row">
                <div className="db-field flex-3">
                  <label>Host</label>
                  <input
                    value={modalForm.host}
                    onChange={(e) =>
                      setModalForm((p) => ({ ...p, host: e.target.value }))
                    }
                    placeholder="db.supabase.co"
                  />
                </div>
                <div className="db-field flex-1">
                  <label>Port</label>
                  <input
                    type="number"
                    value={modalForm.port}
                    onChange={(e) =>
                      setModalForm((p) => ({
                        ...p,
                        port: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="db-field">
                <label>Database</label>
                <input
                  value={modalForm.database}
                  onChange={(e) =>
                    setModalForm((p) => ({ ...p, database: e.target.value }))
                  }
                  placeholder="postgres"
                />
              </div>
              <div className="db-field-row">
                <div className="db-field flex-1">
                  <label>User</label>
                  <input
                    value={modalForm.user}
                    onChange={(e) =>
                      setModalForm((p) => ({ ...p, user: e.target.value }))
                    }
                    placeholder="postgres"
                  />
                </div>
                <div className="db-field flex-1">
                  <label>Password</label>
                  <input
                    type="password"
                    value={modalForm.password}
                    onChange={(e) =>
                      setModalForm((p) => ({ ...p, password: e.target.value }))
                    }
                    placeholder="••••••"
                  />
                </div>
              </div>
            </div>
            <div className="db-modal-footer">
              <button
                className="db-modal-cancel"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button className="db-modal-connect" onClick={handleConnect}>
                <Server size={12} /> Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
