/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useEffect, useState } from "react";

export default function DashboardSection() {
  const [cpu, setCpu] = useState(12);
  const [mem, setMem] = useState(1.2);
  const [disk, setDisk] = useState(40);
  const [net, setNet] = useState(120);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCpu(Math.round(Math.random() * 100));
      setMem(Math.round(Math.random() * 80) / 10);
      setDisk(Math.round(Math.random() * 100));
      setNet(Math.round(Math.random() * 500));
      setUptime((u) => u + 2);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="dashboard">
      <div className="dash-head">
        <span className="status-dot online" />
        <strong>En línea</strong>
        <span className="dash-uptime">{uptime}s conectado</span>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span>CPU</span>
          <strong>{cpu}%</strong>
        </div>
        <div className="stat-card">
          <span>Memoria</span>
          <strong>{mem} GB</strong>
        </div>
        <div className="stat-card">
          <span>Disco</span>
          <strong>{disk}%</strong>
        </div>
        <div className="stat-card">
          <span>Red</span>
          <strong>{net} Mbps</strong>
        </div>
      </div>
    </section>
  );
}
