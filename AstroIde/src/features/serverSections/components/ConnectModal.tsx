/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
interface ConnectModalProps {
  providers: string[];
  provider: string;
  onProviderChange: (p: string) => void;
  host: string;
  onHostChange: (v: string) => void;
  name: string;
  onNameChange: (v: string) => void;
  onConnect: () => void;
}

export default function ConnectModal({
  providers,
  provider,
  onProviderChange,
  host,
  onHostChange,
  name,
  onNameChange,
  onConnect,
}: ConnectModalProps) {


  function handlermantenimiento(){
    astro.notification.dynamic.island(`en mantenimiento ${provider}`)
  }
// () => onProviderChange(element)
  return (
    <div className="modal">
      <h2 className="modal-title">Conectar servidor</h2>

      <div className="provider-list">
        {providers.map((element) => (
          <button
            className={`button-provider${provider === element ? " active" : ""}`}
            key={element}
            onClick={() => {
              () => onProviderChange(element)
              handlermantenimiento()
            }}
            onDoubleClick={handlermantenimiento}
          >
            {element}
          </button>
        ))}
      </div>

      <label className="inputs-connection" htmlFor="server-host">
        Host
      </label>
      <input
        id="server-host"
        className="input-connections"
        type="text"
        placeholder="ej. 192.168.1.10"
        value={host}
        onChange={(e) => onHostChange(e.target.value)}
      />
      <label className="inputs-connection" htmlFor="server-pass">
        Password
      </label>
      <input
        id="server-pass"
        className="input-connections"
        type="password"
        placeholder="••••••••"
      />
      <label className="inputs-connection" htmlFor="server-name">
        Nombre
      </label>
      <input
        id="server-name"
        className="input-connections"
        type="text"
        placeholder="Mi servidor"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
      />

      <button className="button-connect" type="button" onClick={onConnect}>
        Conectar
      </button>
    </div>
  );
}
