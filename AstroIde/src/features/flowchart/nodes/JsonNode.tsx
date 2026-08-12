import { Handle, Position, type NodeProps } from '@xyflow/react';

export default function JsonNode({ data, selected }: NodeProps) {
  const nodeType = (data.nodeType as string) || 'value';
  const properties = (data.properties as Array<{ key: string; value: string }>) || [];
  const items = (data.items as string[]) || [];
  const valueType = (data.valueType as string) || 'string';

  return (
    <div className={`flow-node flow-node--json flow-node--json-${nodeType} ${selected ? 'flow-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="top-in" />

      {nodeType === 'object' && (
        <div className="json-content">
          <div className="json-header">
            <span className="json-bracket">{'{'}</span>
            <span className="json-title">{data.label as string}</span>
          </div>
          <div className="json-body">
            {properties.map((p, i) => (
              <div key={i} className="json-prop">
                <span className="json-key">"{p.key}"</span>
                <span className="json-colon">:</span>
                <span className="json-val">"{p.value}"</span>
              </div>
            ))}
          </div>
          <div className="json-footer"><span className="json-bracket">{'}'}</span></div>
        </div>
      )}

      {nodeType === 'array' && (
        <div className="json-content">
          <div className="json-header">
            <span className="json-bracket">{'['}</span>
            <span className="json-title">{data.label as string}</span>
          </div>
          <div className="json-body">
            {items.map((item, i) => (
              <div key={i} className="json-item">
                <span className="json-index">{i}</span>
                <span className="json-val">"{item}"</span>
              </div>
            ))}
          </div>
          <div className="json-footer"><span className="json-bracket">{']'}</span></div>
        </div>
      )}

      {nodeType === 'value' && (
        <div className="json-content json-content--value">
          <span className={`json-value-type json-value-type--${valueType}`}>
            {valueType === 'string' && `"${data.label}"`}
            {valueType === 'number' && '42'}
            {valueType === 'boolean' && 'true'}
            {valueType === 'null' && 'null'}
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom-out" />
    </div>
  );
}
