/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useState } from "react";
import "./media/media.css";
import ConnectModal from "./components/ConnectModal";
import ServerSidebar, { type ServerSectionId } from "./components/ServerSidebar";
import DashboardSection from "./components/sections/DashboardSection";
import ConnectionSection from "./components/sections/ConnectionSection";
import SettingsSection from "./components/sections/SettingsSection";
import UsageSection from "./components/sections/UsageSection";
import ProfilesSection from "./components/sections/ProfilesSection";

const PROVIDERS = ["AWS", "AZURE"];

function BackgroundGlows() {
  return (
    <div className="orbits" aria-hidden="true">
      <div className="glow glow-red" />
      <div className="glow glow-yellow" />
      <div className="glow glow-blue" />
      <div className="glow glow-white" />
    </div>
  );
}

export default function ServerSection() {
  const [provider, setProvider] = useState<string>("AWS");
  const [host, setHost] = useState("");
  const [name, setName] = useState("");
  const [connected, setConnected] = useState(false);
  const [activeSection, setActiveSection] = useState<ServerSectionId>("dashboard");

  function handleConnect() {
    setConnected(true);
    astro.notification.dynamic.island(`Conectado a ${name || "Mi servidor"}`);
  }

  function handleDisconnect() {
    setConnected(false);
    astro.notification.dynamic.island("Desconectado");
  }

  if (connected) {
    return (
      <section className="server-view connected">
        <BackgroundGlows />

        <div className="server-layout">
          <ServerSidebar
            activeSection={activeSection}
            onSelect={setActiveSection}
            onDisconnect={handleDisconnect}
          />

          <div className="server-main">
            {activeSection === "dashboard" && <DashboardSection />}
            {activeSection === "connection" && (
              <ConnectionSection provider={provider} host={host} name={name} />
            )}
            {activeSection === "settings" && <SettingsSection />}
            {activeSection === "usage" && <UsageSection />}
            {activeSection === "profiles" && <ProfilesSection />}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="server-view">
      <BackgroundGlows />

      <ConnectModal
        providers={PROVIDERS}
        provider={provider}
        onProviderChange={setProvider}
        host={host}
        onHostChange={setHost}
        name={name}
        onNameChange={setName}
        onConnect={handleConnect}
      />
    </section>
  );
}

// Alias para compatibilidad con imports existentes
export const serverSections = ServerSection;
