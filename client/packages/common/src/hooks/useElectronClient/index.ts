import { useState, useEffect } from 'react';

const DISCOVERY_TIMEOUT = 5000;

export type FrontEndHost = {
  protocol: 'http' | 'https';
  port: number;
  ip: string;
  name: string;
  clientVersion: string;
  isLocal: boolean;
};

type ServerDiscovered = (event: object, value: FrontEndHost) => void;
export type ElectronAPI = {
  serverDiscovered: (eventInfo: ServerDiscovered) => void;
  startServerDiscovery: () => void;
  connectToServer: (server: FrontEndHost) => void;
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

    setTimeout(() => {
      if (state.servers.length === 0)
        setState({ ...state, discoveryTimedOut: true });
    }, DISCOVERY_TIMEOUT);
  }, []);

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

export const formatServer = ({ ip, port, isLocal }: FrontEndHost) =>
  ` ${ip}:${port} ${isLocal ? '(local)' : '(remote)'}`;
