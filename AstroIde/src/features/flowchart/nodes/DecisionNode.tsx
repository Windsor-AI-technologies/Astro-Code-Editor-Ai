import { Handle, Position, type NodeProps } from '@xyflow/react';

export default function DecisionNode({ data, selected }: NodeProps) {
  return (
    <div className={`flow-node flow-node--decision ${selected ? 'flow-node--selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node__diamond">
        <div className="flow-node__label">{data.label as string}</div>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" />
      <Handle type="source" position={Position.Right} id="no" />
      <Handle type="source" position={Position.Left} id="left" />
      <span className="flow-node__port-label flow-node__port-label--bottom">Yes</span>
      <span className="flow-node__port-label flow-node__port-label--right">No</span>
    </div>
  );
}
