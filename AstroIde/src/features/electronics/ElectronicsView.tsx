import { Cpu, Zap, CircuitBoard, Gauge, Thermometer } from 'lucide-react';
import './ElectronicsView.css';

export default function ElectronicsView() {
  return (
    <div className="electronics-view">
      {/* Toolbar de componentes */}
      <div className="elec-sidebar">
        <div className="elec-sidebar-header">
          <CircuitBoard size={14} />
          <span>Components</span>
        </div>
        <div className="elec-comp-list">
          <div className="elec-comp"><Cpu size={12} /> Microcontroller</div>
          <div className="elec-comp"><Zap size={12} /> Resistor</div>
          <div className="elec-comp"><Gauge size={12} /> Capacitor</div>
          <div className="elec-comp"><Thermometer size={12} /> Sensor</div>
          <div className="elec-comp"><Zap size={12} /> LED</div>
          <div className="elec-comp"><CircuitBoard size={12} /> IC Chip</div>
        </div>
      </div>

      {/* Canvas del circuito */}
      <div className="elec-canvas">
        <div className="elec-canvas-inner">
          <div className="elec-placeholder">
            <CircuitBoard size={48} className="elec-placeholder-icon" />
            <h2>Electronics Mode</h2>
            <p>Design circuits and program microcontrollers</p>
            <div className="elec-hints">
              <span>Drag components to canvas</span>
              <span>Wire connections</span>
              <span>Simulate & upload</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de propiedades / serial monitor */}
      <div className="elec-panel">
        <div className="elec-panel-header">Serial Monitor</div>
        <div className="elec-serial">
          <div className="elec-serial-output">
            <span className="elec-serial-placeholder">No device connected</span>
          </div>
          <div className="elec-serial-input">
            <input placeholder="Send command..." />
            <button>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
