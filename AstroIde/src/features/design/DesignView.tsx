import { MousePointer2, Square, Type, Image, Layers, Move } from 'lucide-react';
import './DesignView.css';

export default function DesignView() {
  return (
    <div className="design-view">
      {/* Toolbar izquierda */}
      <div className="design-toolbar">
        <button className="design-tool active" title="Select"><MousePointer2 size={16} /></button>
        <button className="design-tool" title="Frame"><Square size={16} /></button>
        <button className="design-tool" title="Text"><Type size={16} /></button>
        <button className="design-tool" title="Image"><Image size={16} /></button>
        <button className="design-tool" title="Move"><Move size={16} /></button>
      </div>

      {/* Canvas */}
      <div className="design-canvas">
        <div className="design-canvas-inner">
          <div className="design-placeholder">
            <Layers size={48} className="design-placeholder-icon" />
            <h2>Design Mode</h2>
            <p>Drag & drop components to build UI visually</p>
            <div className="design-hints">
              <span>Drag from components panel</span>
              <span>Double-click to edit text</span>
              <span>Resize with handles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho — propiedades */}
      <div className="design-properties">
        <div className="design-prop-header">Properties</div>
        <div className="design-prop-empty">
          Select an element to edit its properties
        </div>

        <div className="design-prop-header" style={{ marginTop: 'auto' }}>Components</div>
        <div className="design-components">
          <div className="design-comp-item">Button</div>
          <div className="design-comp-item">Input</div>
          <div className="design-comp-item">Card</div>
          <div className="design-comp-item">Header</div>
          <div className="design-comp-item">Image</div>
          <div className="design-comp-item">Container</div>
        </div>
      </div>
    </div>
  );
}
