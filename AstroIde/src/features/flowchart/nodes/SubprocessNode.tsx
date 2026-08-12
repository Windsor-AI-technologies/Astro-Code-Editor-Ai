import { Handle, Position, type NodeProps } from '@xyflow/react';

export default function SubprocessNode({ data, selected }: NodeProps) {
  return (
    <div className={`flow-node flow-node--subprocess ${selected ? 'flow-node--selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <Handle type="target" position={Position.Left} id="left-in" />
      <div className="flow-node__label">{data.label as string}</div>
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" position={Position.Right} id="right-out" />
    </div>
  );
}
