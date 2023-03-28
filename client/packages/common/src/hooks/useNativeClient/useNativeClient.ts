import { uniqWith } from '@common/utils';
import { useState, useEffect } from 'react';
import {
  getNativeAPI,
  getPreference,
  matchUniqueServer,
  setPreference,
} from './helpers';
import {
  DISCOVERED_SERVER_POLL,
  DISCOVERY_TIMEOUT,
  FrontEndHost,
  NativeAPI,
  NativeMode,
  PREVIOUS_SERVER_KEY,
} from './types';

declare global {
  interface Window {
    electronNativeAPI: NativeAPI;
  }
}

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
  const [nativeMode, setNativeMode] = useState(NativeMode.Client);
  const [previousServerJson, setPreviousServerJson] = useState('');
  getPreference('mode', '0').then(setNativeMode);
  getPreference('previousServer', '').then(setPreviousServerJson);
  // the desktop app only supports running in client mode
  const mode = !!window.electronNativeAPI ? NativeMode.Client : nativeMode;

  const setMode = (mode: NativeMode) =>
    setPreference('mode', mode).then(() =>
      setState(state => ({ ...state, mode }))
    );

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

  const readLog = async () => {
    const noResult = 'log unavailable';
    const result = await nativeAPI?.readLog();

    if (!result) return noResult;
    if (result.error) console.error(result.error);

    return result.log || noResult;
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
    readLog,
  };
};
