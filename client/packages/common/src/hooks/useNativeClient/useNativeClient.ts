import uniqWith from 'lodash/uniqWith';
import { useState, useEffect } from 'react';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { useLocalStorage } from '../../localStorage';

const DISCOVERY_TIMEOUT = 5000;
const DISCOVERED_SERVER_POLL = 2000;
export const PREVIOUS_SERVER_KEY = '/discovery/previous-server';
export const NATIVE_MODE_KEY = '/native/mode';

export enum NativeMode {
  Client,
  Server,
}
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
  advertiseService?: () => void;
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
  // A previous server is set in local storage, but was not returned in the list of available servers
  connectToPreviousTimedOut: boolean;
  connectedServer: FrontEndHost | null;
  // Indicate that server discovery has taken too long without finding server
  discoveryTimedOut: boolean;
  isDiscovering: boolean;
  mode: NativeMode | null;
  previousServer: FrontEndHost | null;
  servers: FrontEndHost[];
};

export const useNativeClient = ({
  autoconnect,
  discovery,
}: { discovery?: boolean; autoconnect?: boolean } = {}) => {
  const nativeAPI = getNativeAPI();
  const [nativeMode, setNativeMode] = useLocalStorage(NATIVE_MODE_KEY);
  // the desktop app only supports running in client mode
  const mode = !!window.electronNativeAPI ? NativeMode.Client : nativeMode;
  const previousServerJson = localStorage.getItem(PREVIOUS_SERVER_KEY);

  const setMode = (mode: NativeMode) => {
    setNativeMode(mode);
    setState(state => ({ ...state, mode }));
  };
  const [state, setState] = useState<NativeClientState>({
    connectToPreviousTimedOut: false,
    connectedServer: null,
    discoveryTimedOut: false,
    isDiscovering: false,
    mode,
    previousServer: previousServerJson ? JSON.parse(previousServerJson) : null,
    servers: [],
  });

  const connectToServer = (server: FrontEndHost) => {
    localStorage.setItem(PREVIOUS_SERVER_KEY, JSON.stringify(server));
    nativeAPI?.connectToServer(server);
  };
  const stopDiscovery = () =>
    setState(state => ({ ...state, isDiscovering: false }));

  const startDiscovery = () => {
    if (!nativeAPI) return;

    nativeAPI.connectedServer().then(connectedServer => {
      setState(state => ({ ...state, connectedServer }));
    });

    if (!discovery) return;

    setState(state => ({
      ...state,
      servers: [],
      discoveryTimedOut: false,
      isDiscovering: true,
    }));

    nativeAPI.startServerDiscovery();
  };

  useEffect(() => {
    if (!state.isDiscovering) return;

    let connectToPreviousTimer: NodeJS.Timer | undefined = undefined;

    if (autoconnect) {
      connectToPreviousTimer = setTimeout(
        () =>
          setState(state => ({ ...state, connectToPreviousTimedOut: true })),
        DISCOVERY_TIMEOUT
      );
    }

    const timeoutTimer = setTimeout(() => {
      setState(state => ({
        ...state,
        discoveryTimedOut: true,
      }));
      clearInterval(pollInterval);
    }, DISCOVERY_TIMEOUT);

    const pollInterval = setInterval(async () => {
      const servers = (await nativeAPI?.discoveredServers())?.servers || [];
      if (servers.length === 0) return;

      setState(state => ({
        ...state,
        servers: uniqWith([...state.servers, ...servers], matchUniqueServer),
        discoveryTimedOut: false,
      }));

      clearTimeout(timeoutTimer);
    }, DISCOVERED_SERVER_POLL);

    return () => {
      clearTimeout(connectToPreviousTimer);
      clearTimeout(timeoutTimer);
      clearInterval(pollInterval);
    };
  }, [state.isDiscovering]);

  useEffect(() => {
    startDiscovery();
  }, []);

  // Auto connect if autoconnect=true and server found matching previousConnectedServer
  useEffect(() => {
    const { servers, previousServer } = state;
    if (!nativeAPI) return;
    if (!autoconnect) return;
    if (previousServer === null) return;

    const server = servers.find(server =>
      matchUniqueServer(server, previousServer)
    );
    if (server) {
      connectToServer(server);
    }
  }, [state.previousServer, state.servers, autoconnect]);

  return {
    ...state,
    connectToServer,
    goBackToDiscovery: nativeAPI?.goBackToDiscovery ?? (() => {}),
    advertiseService: nativeAPI?.advertiseService ?? (() => {}),
    startDiscovery,
    stopDiscovery,
    setMode,
  };
};

const matchUniqueServer = (a: FrontEndHost, b: FrontEndHost) =>
  // Allow port to run multiple instances on one machine (at least for dev)
  a.hardwareId === b.hardwareId && a.port === b.port;

export const frontEndHostUrl = ({ protocol, ip, port }: FrontEndHost) =>
  `${protocol}://${ip}:${port}`;

export const frontEndHostDiscoveryGraphql = (server: FrontEndHost) =>
  `${frontEndHostUrl({
    ...server,
    port: server.port + 1,
    protocol: 'http',
  })}/graphql`;

export const frontEndHostDisplay = ({ protocol, ip, port }: FrontEndHost) => {
  switch (protocol) {
    case 'https':
      return port === 443 ? `https://${ip}` : `https://${ip}:${port}`;
    default:
      return port === 80 ? `http://${ip}` : `http://${ip}:${port}`;
  }
};
