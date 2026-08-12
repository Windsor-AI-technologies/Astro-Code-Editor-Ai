import { Handle, Position, type NodeProps } from '@xyflow/react';

interface Column {
  name: string;
  type: string;
  pk: boolean;
}

export default function DBTableNode({ data, selected }: NodeProps) {
  const columns = (data.columns as Column[]) || [];
  const tableName = (data.label as string) || 'table';

  return (
    <div className={`flow-node flow-node--dbtable ${selected ? 'flow-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="top-in" />

      <div className="dbtable-header">
        <svg width="12" height="12" viewBox="0 0 16 16" className="dbtable-icon">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="1" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1"/>
          <line x1="1" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1"/>
          <line x1="6" y1="5" x2="6" y2="15" stroke="currentColor" strokeWidth="1"/>
        </svg>
        <span>{tableName}</span>
      </div>

      <div className="dbtable-columns">
        {columns.map((col, i) => (
          <div key={i} className={`dbtable-col ${col.pk ? 'dbtable-col--pk' : ''} ${col.type.includes('FK') ? 'dbtable-col--fk' : ''}`}>
            <span className="dbtable-col-icon">
              {col.pk ? '🔑' : col.type.includes('FK') ? '🔗' : '·'}
            </span>
            <span className="dbtable-col-name">{col.name}</span>
            <span className="dbtable-col-type">{col.type}</span>
          </div>
        ))}
        {columns.length === 0 && (
          <div className="dbtable-empty">No columns</div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom-out" />
    </div>
  );
}
