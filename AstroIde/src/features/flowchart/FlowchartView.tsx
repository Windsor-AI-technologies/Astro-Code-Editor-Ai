import { useState, useCallback, useMemo, useRef } from "react";
import ProcessNode from "./nodes/ProcessNode";
import DecisionNode from "./nodes/DecisionNode";
import StartEndNode from "./nodes/StartEndNode";
import IONode from "./nodes/IONode";
import DBTableNode from "./nodes/DBTableNode";
import CircuitNode from "./nodes/CircuitNode";
import JsonNode from "./nodes/JsonNode";
import SubprocessNode from "./nodes/SubprocessNode";
import NoteNode from "./nodes/NoteNode";
import DataStoreNode from "./nodes/DataStoreNode";
import { ReactFlow, Controls, Background, MiniMap, addEdge, useNodesState, useEdgesState,type Connection, type Edge, type Node, BackgroundVariant, Panel, type NodeChange} 
from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./FlowchartView.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileExport,
  faFileImport,
  faTrash,
  faBars,
} from "@fortawesome/free-solid-svg-icons";
import { MODE_CONFIG, DiagramMode, type NodeTemplate } from "./modeConfig";

// Custom nodes



let nodeId = 0;
const getId = () => `node_${++nodeId}`;

export default function FlowchartView() {
  const [mode, setMode] = useState<DiagramMode>("flowchart");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: mode === "circuit",
            style: { stroke: "var(--accent)", strokeWidth: 1.5 },
            type: "smoothstep",
          },
          eds,
        ),
      );
    },
    [setEdges, mode],
  );

  const nodeTypes = useMemo(
    () => ({
      process: ProcessNode,
      decision: DecisionNode,
      startEnd: StartEndNode,
      io: IONode,
      dbTable: DBTableNode,
      circuit: CircuitNode,
      json: JsonNode,
      subprocess: SubprocessNode,
      note: NoteNode,
      dataStore: DataStoreNode,
    }),
    [],
  );

  const addNodeFromTemplate = (template: NodeTemplate) => {
    const newNode: Node = {
      id: getId(),
      type: template.type,
      position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 150 },
      data: { label: template.label, ...(template.data || {}) },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Update node data (used from property panel)
  const updateNodeData = (nodeId: string, newData: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n,
      ),
    );
    // Also update selectedNode for the panel
    setSelectedNode((prev) =>
      prev && prev.id === nodeId
        ? { ...prev, data: { ...prev.data, ...newData } }
        : prev,
    );
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      // Keep selectedNode in sync
      const removeChange = changes.find((c) => c.type === "remove");
      if (
        removeChange &&
        selectedNode &&
        "id" in removeChange &&
        removeChange.id === selectedNode.id
      ) {
        setSelectedNode(null);
      }
    },
    [onNodesChange, selectedNode],
  );

  const deleteSelected = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id,
      ),
    );
    setSelectedNode(null);
  };

  const duplicateSelected = () => {
    if (!selectedNode) return;
    const newNode: Node = {
      ...selectedNode,
      id: getId(),
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40,
      },
      selected: false,
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Export/Import
  const exportDiagram = () => {
    const data = JSON.stringify({ nodes, edges, mode }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${mode}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDiagram = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        if (data.mode) setMode(data.mode);
      } catch {
        /* ignore parse errors */
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  };

  // Property panel rendering
  const renderPropertyPanel = () => {
    if (!selectedNode) {
      return (
        <div className="flow-props-empty">
          <p>Select a node to edit its properties</p>
        </div>
      );
    }

    const { data, type } = selectedNode;

    return (
      <div className="flow-props-content">
        <div className="flow-props-section">
          <label>Label</label>
          <input
            type="text"
            value={(data.label as string) || ""}
            onChange={(e) =>
              updateNodeData(selectedNode.id, { label: e.target.value })
            }
            className="flow-props-input"
          />
        </div>

        {type === "circuit" && (
          <div className="flow-props-section">
            <label>Value</label>
            <input
              type="text"
              value={(data.value as string) || ""}
              onChange={(e) =>
                updateNodeData(selectedNode.id, { value: e.target.value })
              }
              className="flow-props-input"
              placeholder="e.g. 10kΩ, 100µF"
            />
          </div>
        )}

        {type === "dbTable" && (
          <div className="flow-props-section">
            <label>Columns</label>
            <div className="flow-props-columns">
              {(
                (data.columns as Array<{
                  name: string;
                  type: string;
                  pk: boolean;
                }>) || []
              ).map((col, i) => (
                <div key={i} className="flow-props-col-row">
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => {
                      const cols = [
                        ...(data.columns as Array<{
                          name: string;
                          type: string;
                          pk: boolean;
                        }>),
                      ];
                      cols[i] = { ...cols[i], name: e.target.value };
                      updateNodeData(selectedNode.id, { columns: cols });
                    }}
                    className="flow-props-input flow-props-input--sm"
                    placeholder="name"
                  />
                  <input
                    type="text"
                    value={col.type}
                    onChange={(e) => {
                      const cols = [
                        ...(data.columns as Array<{
                          name: string;
                          type: string;
                          pk: boolean;
                        }>),
                      ];
                      cols[i] = { ...cols[i], type: e.target.value };
                      updateNodeData(selectedNode.id, { columns: cols });
                    }}
                    className="flow-props-input flow-props-input--sm"
                    placeholder="type"
                  />
                  <button
                    className="flow-props-btn-icon"
                    onClick={() => {
                      const cols = [
                        ...(data.columns as Array<{
                          name: string;
                          type: string;
                          pk: boolean;
                        }>),
                      ];
                      cols[i] = { ...cols[i], pk: !cols[i].pk };
                      updateNodeData(selectedNode.id, { columns: cols });
                    }}
                    title="Toggle Primary Key"
                  >
                    {col.pk ? "🔑" : "·"}
                  </button>
                  <button
                    className="flow-props-btn-icon flow-props-btn-icon--danger"
                    onClick={() => {
                      const cols = (
                        data.columns as Array<{
                          name: string;
                          type: string;
                          pk: boolean;
                        }>
                      ).filter((_, idx) => idx !== i);
                      updateNodeData(selectedNode.id, { columns: cols });
                    }}
                    title="Remove column"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="flow-props-btn"
                onClick={() => {
                  const cols = [
                    ...((data.columns as Array<{
                      name: string;
                      type: string;
                      pk: boolean;
                    }>) || []),
                    { name: "new_col", type: "VARCHAR", pk: false },
                  ];
                  updateNodeData(selectedNode.id, { columns: cols });
                }}
              >
                + Add Column
              </button>
            </div>
          </div>
        )}

        {type === "json" && data.nodeType === "object" && (
          <div className="flow-props-section">
            <label>Properties</label>
            <div className="flow-props-columns">
              {(
                (data.properties as Array<{ key: string; value: string }>) || []
              ).map((prop, i) => (
                <div key={i} className="flow-props-col-row">
                  <input
                    type="text"
                    value={prop.key}
                    onChange={(e) => {
                      const props = [
                        ...(data.properties as Array<{
                          key: string;
                          value: string;
                        }>),
                      ];
                      props[i] = { ...props[i], key: e.target.value };
                      updateNodeData(selectedNode.id, { properties: props });
                    }}
                    className="flow-props-input flow-props-input--sm"
                    placeholder="key"
                  />
                  <input
                    type="text"
                    value={prop.value}
                    onChange={(e) => {
                      const props = [
                        ...(data.properties as Array<{
                          key: string;
                          value: string;
                        }>),
                      ];
                      props[i] = { ...props[i], value: e.target.value };
                      updateNodeData(selectedNode.id, { properties: props });
                    }}
                    className="flow-props-input flow-props-input--sm"
                    placeholder="value"
                  />
                  <button
                    className="flow-props-btn-icon flow-props-btn-icon--danger"
                    onClick={() => {
                      const props = (
                        data.properties as Array<{ key: string; value: string }>
                      ).filter((_, idx) => idx !== i);
                      updateNodeData(selectedNode.id, { properties: props });
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="flow-props-btn"
                onClick={() => {
                  const props = [
                    ...((data.properties as Array<{
                      key: string;
                      value: string;
                    }>) || []),
                    { key: "newKey", value: "value" },
                  ];
                  updateNodeData(selectedNode.id, { properties: props });
                }}
              >
                + Add Property
              </button>
            </div>
          </div>
        )}

        {type === "json" && data.nodeType === "array" && (
          <div className="flow-props-section">
            <label>Items</label>
            <div className="flow-props-columns">
              {((data.items as string[]) || []).map((item, i) => (
                <div key={i} className="flow-props-col-row">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const items = [...(data.items as string[])];
                      items[i] = e.target.value;
                      updateNodeData(selectedNode.id, { items });
                    }}
                    className="flow-props-input flow-props-input--sm"
                  />
                  <button
                    className="flow-props-btn-icon flow-props-btn-icon--danger"
                    onClick={() => {
                      const items = (data.items as string[]).filter(
                        (_, idx) => idx !== i,
                      );
                      updateNodeData(selectedNode.id, { items });
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="flow-props-btn"
                onClick={() => {
                  const items = [
                    ...((data.items as string[]) || []),
                    "newItem",
                  ];
                  updateNodeData(selectedNode.id, { items });
                }}
              >
                + Add Item
              </button>
            </div>
          </div>
        )}

        <div className="flow-props-actions">
          <button className="flow-props-btn" onClick={duplicateSelected}>
            Duplicate
          </button>
          <button
            className="flow-props-btn flow-props-btn--danger"
            onClick={deleteSelected}
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flow-view">
      {/* Top bar: mode selector + actions */}
      <div className="flow-topbar">
        <div className="flow-modes">
          {(Object.keys(MODE_CONFIG) as DiagramMode[]).map((m) => (
            <button
              key={m}
              className={`flow-mode-btn ${mode === m ? "flow-mode-btn--active" : ""}`}
              onClick={() => setMode(m)}
            >
              <FontAwesomeIcon icon={MODE_CONFIG[m].icon} className="flow-mode-icon" />
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>
        <div className="flow-topbar-actions">
          <button
            onClick={exportDiagram}
            className="flow-action-btn"
            title="Export JSON"
          >
            <FontAwesomeIcon icon={faFileExport} /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flow-action-btn"
            title="Import JSON"
          >
            <FontAwesomeIcon icon={faFileImport} /> Import
          </button>
          <button
            onClick={clearAll}
            className="flow-action-btn flow-action-btn--danger"
            title="Clear all"
          >
            <FontAwesomeIcon icon={faTrash} /> Clear
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importDiagram}
            hidden
          />
        </div>
      </div>

      <div className="flow-body">
        {/* Left sidebar: elements palette */}
        {sidebarOpen && (
          <div className="flow-sidebar">
            <div className="flow-sidebar-header">
              <span>Elements</span>
              <button
                className="flow-sidebar-close"
                onClick={() => setSidebarOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="flow-sidebar-list">
              {MODE_CONFIG[mode].templates.map((t, i) => (
                <button
                  key={i}
                  className="flow-element-btn"
                  onClick={() => addNodeFromTemplate(t)}
                  title={`Add ${t.label}`}
                >
                  <FontAwesomeIcon icon={t.icon} className="flow-element-icon" />
                  <span className="flow-element-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!sidebarOpen && (
          <button
            className="flow-sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            title="Show elements"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        )}

        {/* Canvas */}
        <div className="flow-canvas-wrapper">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="flow-reactflow"
            proOptions={{ hideAttribution: true }}
            deleteKeyCode="Delete"
            multiSelectionKeyCode="Shift"
          >
            <Controls className="flow-controls" />
            <MiniMap
              className="flow-minimap"
              nodeColor={() => "var(--accent)"}
              maskColor="rgba(0,0,0,0.6)"
            />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--text-2)"
            />
            <Panel position="bottom-center" className="flow-hint">
              Drag from handles to connect • Click node to edit • Delete key to
              remove
            </Panel>
          </ReactFlow>
        </div>

        {/* Right panel: properties */}
        <div className="flow-props-panel">
          <div className="flow-props-header">Properties</div>
          {renderPropertyPanel()}
        </div>
      </div>
    </div>
  );
}
