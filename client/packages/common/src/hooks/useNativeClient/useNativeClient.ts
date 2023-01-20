import { uniqWith } from 'lodash';
import { useState, useEffect } from 'react';
import { registerPlugin, Capacitor } from '@capacitor/core';

const DISCOVERY_TIMEOUT = 5000;
const DISCOVERED_SERVER_POLL = 1000;
const PREVIOUS_SERVER_KEY = '/discovery/previous-server';

export type Protocol = 'http' | 'https';
export const isProtocol = (value: any): value is Protocol =>
  value === 'http' || value === 'https';
// Should match server/server/src/discovery.rs (FrontEndHost)
export type FrontEndHost = {
  protocol: Protocol;
  port: number;
  ip: string;
  // Below come from TXT record
  clientVersion: string;
  hardwareId: string;
  // This one is set by NativeClient
  isLocal: boolean;
};

export interface NativeAPI {
  // Method used in polling for found servers
  discoveredServers: () => Promise<{ servers: FrontEndHost[] }>;
  // Starts server discovery (connectToServer stops server discovery)
  startServerDiscovery: () => void;
  // Asks client to connect to server (causing window to navigate to server url and stops discovery)
  connectToServer: (server: FrontEndHost) => void;
  // Will return currently connected client (to display in UI)
  connectedServer: () => Promise<FrontEndHost | null>;
  goBackToDiscovery: () => void;
  startBarcodeScan: () => Promise<number[]>;
  stopBarcodeScan: () => void;
}

declare global {
  interface Window {
    electronNativeAPI: NativeAPI;
  }
}

const androidNativeAPI = registerPlugin<NativeAPI>('NativeApi');

export const getNativeAPI = (): NativeAPI | null => {
  // Android
  if (Capacitor.isNativePlatform()) return androidNativeAPI;

  // Electron
  if (!!window.electronNativeAPI) return window.electronNativeAPI;

  return null;
};

type NativeClientState = {
  servers: FrontEndHost[];
  connectedServer: FrontEndHost | null;
  // Indicate that server discovery has taken too long without finding server
  discoveryTimedOut: boolean;
};

export const useNativeClient = ({
  autoconnect,
  discovery,
}: { discovery?: boolean; autoconnect?: boolean } = {}) => {
  const [timedOut, setTimedOut] = useState(false);
  const [previousServer, setPreviousServer] = useState<FrontEndHost | null>(
    null
  );
  const [nativeAPI, setNativeAPI] = useState<NativeAPI | null>(null);
  const [state, setState] = useState<NativeClientState>({
    servers: [],
    connectedServer: null,
    discoveryTimedOut: false,
  });

  const timers: { poll?: NodeJS.Timer; timeout?: NodeJS.Timer } = {};

  const connectToServer = (server: FrontEndHost) => {
    localStorage.setItem(PREVIOUS_SERVER_KEY, JSON.stringify(server));
    nativeAPI?.connectToServer(server);
  };

  const discover = () => {
    const nativeAPI = getNativeAPI();

    if (!nativeAPI) return;

    setNativeAPI(nativeAPI);

    // Can use localStorage
    const previousServerJson = localStorage.getItem(PREVIOUS_SERVER_KEY);
    if (previousServerJson) setPreviousServer(JSON.parse(previousServerJson));

    nativeAPI.connectedServer().then(connectedServer => {
      setState(state => ({ ...state, connectedServer }));
    });

    if (!discovery) return;

    clearTimeout(timers.timeout);
    clearTimeout(timers.poll);

    setState(state => {
      return {
        ...state,
        servers: [],
        discoveryTimedOut: false,
      };
    });

    nativeAPI.startServerDiscovery();

    const timeoutTimer = setTimeout(() => setTimedOut(true), DISCOVERY_TIMEOUT);

    timers.poll = setInterval(async () => {
      const servers = (await nativeAPI.discoveredServers()).servers;
      setState(state => {
        return {
          ...state,
          servers: uniqWith([...state.servers, ...servers], matchUniqueServer),
          discoveryTimedOut: false,
        };
      });

      clearTimeout(timeoutTimer);
    }, DISCOVERED_SERVER_POLL);
  };

  useEffect(() => {
    discover();
    return () => {
      clearTimeout(timers.timeout);
      clearTimeout(timers.poll);
    };
  }, []);

  // Auto connect if autoconnect=true and server found matching previousConnectedServer
  useEffect(() => {
    const { servers } = state;
    if (!nativeAPI) return;
    if (!autoconnect) return;
    if (!previousServer) return;

    const server = servers.find(server =>
      matchUniqueServer(server, previousServer)
    );
    if (server) connectToServer(server);
  }, [previousServer, state.servers, autoconnect]);

  useEffect(
    () => setState(state => ({ ...state, ...{ discoveryTimedOut: timedOut } })),
    [timedOut]
  );

  return {
    ...state,
    connectToServer,
    goBackToDiscovery: () => nativeAPI?.goBackToDiscovery(),
    discover,
  };
};

const matchUniqueServer = (a: FrontEndHost, b: FrontEndHost) =>
  // Allow port to run multiple instances on one machine (at least for dev)
  a.hardwareId === b.hardwareId && a.port === b.port;

export const frontEndHostUrl = ({ protocol, ip, port }: FrontEndHost) =>
  `${protocol}://${ip}:${port}`;

export const frontEndHostGraphql = (server: FrontEndHost) =>
  `${frontEndHostUrl(server)}/graphql`;

export const frontEndHostDisplay = ({ protocol, ip, port }: FrontEndHost) => {
  switch (protocol) {
    case 'https':
      return port === 443 ? `https://${ip}` : `https://${ip}:${port}`;
    default:
      return port === 80 ? `http://${ip}` : `http://${ip}:${port}`;
  }
};
