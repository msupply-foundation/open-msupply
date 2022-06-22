import { useState, useEffect } from 'react';

const DISCOVERY_TIMEOUT = 5000;

// Should match server/server/src/discovery.rs (FrontEndHost)
export type FrontEndHost = {
  protocol: 'http' | 'https';
  port: number;
  ip: string;
  name: string;
  clientVersion: string;
  // This one is set by electron.ts
  isLocal: boolean;
};

type ServerDiscovered = (event: object, value: FrontEndHost) => void;
export type ElectronAPI = {
  // When in discovery mode (initiated by startServerDiscovery) this event is emitted when server is discovered (existing or new)
  serverDiscovered: (eventInfo: ServerDiscovered) => void;
  // Starts server discovery (connectToServer stops server discovery)
  startServerDiscovery: () => void;
  // Asks client to connect to server (causing window to navigate to server url and stops discovery)
  connectToServer: (server: FrontEndHost) => void;
  // Will return currently connected client (to display in UI)
  connectedServer: () => Promise<FrontEndHost | null>;
};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

type ElectronClientState = {
  servers: FrontEndHost[];
  connectedServer: FrontEndHost | null;
  // Indicate that server discovery has taken too long without finding server
  discoveryTimedOut: boolean;
};

const initialDiscoveryState: ElectronClientState = {
  servers: [],
  connectedServer: null,
  discoveryTimedOut: false,
};

export const useElectronClient = (discover = false) => {
  const [state, setState] = useState(initialDiscoveryState);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const { electronAPI } = window;

    if (!electronAPI) return;

    const { connectedServer, startServerDiscovery, serverDiscovered } =
      electronAPI;

    if (connectedServer) {
      connectedServer().then(server =>
        setState(state => ({ ...state, ...{ connectedServer: server } }))
      );
    }

    if (!discover) return;

    if (startServerDiscovery) {
      startServerDiscovery();
    }

    setTimeout(() => setTimedOut(true), DISCOVERY_TIMEOUT);

    if (serverDiscovered) {
      serverDiscovered((_event, server) =>
        setState(state =>
          state.servers.some(
            s => frontEndHostUrl(s) === frontEndHostUrl(server)
          )
            ? state
            : {
                ...state,
                servers: [...state.servers, server],
                discoveryTimedOut: false,
              }
        )
      );
    }
  }, []);

  useEffect(
    () => setState(state => ({ ...state, ...{ discoveryTimedOut: timedOut } })),
    [timedOut]
  );

  return state;
};

export const frontEndHostUrl = ({ protocol, ip, port }: FrontEndHost) =>
  `${protocol}://${ip}:${port}`;

export const frontEndHostDisplay = ({ protocol, ip, port }: FrontEndHost) => {
  switch (protocol) {
    case 'https':
      return port === 443 ? `https://${ip}` : `https://${ip}:${port}`;
    default:
      return port === 80 ? `http://${ip}` : `http://${ip}:${port}`;
  }
};
