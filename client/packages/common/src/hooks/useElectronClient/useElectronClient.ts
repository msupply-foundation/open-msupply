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
  servers: { [key: string]: FrontEndHost };
  connectedServer: FrontEndHost | null;
  // Indicate that server discovery has taken too long without finding server
  discoveryTimedOut: boolean;
};

const initialDiscoveryState: ElectronClientState = {
  servers: {},
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

    if (!discover || timedOut) return;

    if (startServerDiscovery) {
      startServerDiscovery();
    }

    setTimeout(() => setTimedOut(true), DISCOVERY_TIMEOUT);

    if (serverDiscovered) {
      serverDiscovered((_event, server) => {
        setState(state => ({
          ...state,
          ...{
            servers: { ...state.servers, [JSON.stringify(server)]: server },
            discoveryTimedOut: false,
          },
        }));
      });
    }
  }, []);

  useEffect(() => {
    if (timedOut && Object.values(state.servers).length == 0) {
      setState(state => ({ ...state, ...{ discoveryTimedOut: true } }));
    }
  }, [timedOut, state]);

  return state;
};

export const frontEndHostUrl = ({ protocol, ip, port }: FrontEndHost) =>
  `${protocol}://${ip}:${port}`;
