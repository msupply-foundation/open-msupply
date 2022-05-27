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
  // When in discovery mode (initiated by startServerDiscovery) this event is emmited when server is discovered (existing or new)
  serverDiscovered: (eventInfo: ServerDiscovered) => void;
  // Starts server discovery (connectToServer stops server dsicovery)
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
    if (window?.electronAPI?.connectedServer) {
      window?.electronAPI
        ?.connectedServer()
        .then(server => setState({ ...state, ...{ connectedServer: server } }));
    }

    if (!discover) return;

    if (window?.electronAPI?.startServerDiscovery) {
      window.electronAPI.startServerDiscovery();
    }

    setTimeout(() => setTimedOut(true), DISCOVERY_TIMEOUT);
  }, []);

  useEffect(() => {
    if (timedOut && state.servers.length == 0) {
      setState({ ...state, ...{ discoveryTimedOut: true } });
    }
  }, [timedOut]);

  if (window?.electronAPI?.serverDiscovered) {
    window.electronAPI.serverDiscovered((_event, server) => {
      const newServer = !state.servers.some(
        s => s.port === server.port && s.ip === server.ip
      );

      if (newServer) {
        setState({
          ...state,
          ...{ servers: [...state.servers, server], discoveryTimedOut: false },
        });
      }
    });
  }

  return state;
};

export const frontEndHostUrl = ({ protocol, ip, port }: FrontEndHost) =>
  `${protocol}://${ip}:${port}`;

export const frontEndHostDisplay = (server: FrontEndHost) =>
  `${frontEndHostUrl(server)} ${server.isLocal ? '(local)' : '(remote)'}`;
