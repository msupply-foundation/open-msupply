import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uniqWith } from '@common/utils';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';
import {
  getNativeAPI,
  getPreference,
  matchUniqueServer,
  setPreference,
} from './helpers';
import {
  ConnectionResult,
  DEFAULT_LOCAL_SERVER,
  DISCOVERED_SERVER_POLL,
  DISCOVERY_TIMEOUT,
  FileInfo,
  FrontEndHost,
  NativeAPI,
  NativeMode,
} from './types';
import { useAuthContext } from '../../authentication';

declare global {
  interface Window {
    electronNativeAPI?: NativeAPI;
  }
}

type NativeClientState = {
  // A previous server is set in local storage, but was not returned in the list of available servers
  connectToPreviousFailed: boolean;
  connectedServer: FrontEndHost | null;
  // Indicate that server discovery has taken too long without finding server
  discoveryTimedOut: boolean;
  isDiscovering: boolean;
  previousServer: FrontEndHost | null;
  servers: FrontEndHost[];
};

export const useNativeClient = ({
  autoconnect,
  discovery,
  standalone,
}: { discovery?: boolean; autoconnect?: boolean; standalone?: boolean } = {}) => {
  const nativeAPI = getNativeAPI();
  const { token } = useAuthContext();

  const setMode = (mode: NativeMode) =>
    setPreference('mode', mode).then(() =>
      setState(state => ({ ...state, mode }))
    );

  const [state, setState] = useState<NativeClientState>({
    connectToPreviousFailed: false,
    connectedServer: null,
    discoveryTimedOut: false,
    isDiscovering: false,
    previousServer: null,
    servers: [],
  });

  const connectToServer = (server: FrontEndHost): Promise<ConnectionResult> => {
    setPreference('previousServer', server);
    return (
      nativeAPI?.connectToServer(server) ?? Promise.resolve({ success: false })
    );
  };

  const handleConnectionResult = async (result: ConnectionResult) => {
    if (!result.success) {
      console.error('Connecting to previous server:', result.error);
    }
    setState(state => ({ ...state, connectToPreviousFailed: !result.success }));
  };

  // `connectToServer` will check to see if the server is alive and if so, connect to it
  // using `useMutation` here to handle multiple calls to `connectToServer`, though likely not be possible
  const { mutate: connectToPrevious } = useMutation({
    mutationFn: connectToServer,
    onSuccess: handleConnectionResult,
    onError: (e: Error) =>
      handleConnectionResult({ success: false, error: e.message }),
  });

  const stopDiscovery = () =>
    setState(state => ({ ...state, isDiscovering: false }));

  const startDiscovery = useCallback(() => {
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
  }, [discovery, nativeAPI]);

  const readLog = async () => {
    const noResult = 'log unavailable';
    const result = await nativeAPI?.readLog();

    if (!result) return noResult;
    if (result.error) console.error(result.error);

    return result.log || noResult;
  };

  const allowSleep = async () => {
    // Currently only supported on native platforms via capacitor
    if (!Capacitor.isNativePlatform()) return;

    try {
      const result = await KeepAwake.isSupported();
      if (result.isSupported) await KeepAwake.allowSleep();
      // If KeepAwake has errors, just swallow them
    } catch {}
  };

  const keepAwake = async () => {
    // Currently only supported on native platforms via capacitor
    if (!Capacitor.isNativePlatform()) return;

    try {
      const result = await KeepAwake.isSupported();
      if (result.isSupported) await KeepAwake.keepAwake();
      // If KeepAwake has errors, just swallow them
    } catch {}
  };

  const saveFile = async (fileInfo: FileInfo) => {
    const result = await nativeAPI?.saveFile(fileInfo);

    if (!result) {
      console.error('No result from nativeAPI.saveFile');
      return;
    }

    return result;
  };

  const saveDatabase = async () => {
    const result = await nativeAPI?.saveDatabase();

    if (!result) {
      console.error('No result from nativeAPI.saveDatabase');
      return;
    }

    return result;
  };

  const advertiseService = nativeAPI?.advertiseService ?? (() => {});

  const setServerMode = (
    handleConnectionResult: (result: ConnectionResult) => void
  ) => {
    advertiseService();
    // on first load, the login status is not checked correctly in the native app
    // and users are shown the dashboard even if they are not logged in
    // here we check the token and if invalid redirect to login
    const path = !token ? 'login' : '';
    connectToServer({ ...DEFAULT_LOCAL_SERVER, path })
      .then(handleConnectionResult)
      .catch(e => handleConnectionResult({ success: false, error: e.message }));
  };

  useEffect(() => {
    if (!state.isDiscovering) return;

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
      clearTimeout(timeoutTimer);
      clearInterval(pollInterval);
    };
  }, [nativeAPI, state.isDiscovering]);

  useEffect(() => {
    startDiscovery();
    getPreference('previousServer', '').then(server => {
      if (!!server) setState(state => ({ ...state, previousServer: server }));
    });
  }, [startDiscovery]);

  // Guard against re-firing the autoconnect on every state update — `state`
  // is a dep of the effect below and changes each mDNS poll.
  const hasAutoConnectedRef = useRef(false);

  // Auto connect if autoconnect=true and server found matching previousConnectedServer.
  // In standalone mode, also auto-connect directly to the bundled local server
  // at DEFAULT_LOCAL_SERVER when no server is configured (issue #10036).
  useEffect(() => {
    const { previousServer } = state;
    if (!nativeAPI) return;
    if (!autoconnect) return;
    if (hasAutoConnectedRef.current) return;

    getPreference('manualServer').then(manualServer => {
      if (manualServer) {
        hasAutoConnectedRef.current = true;
        connectToServer(manualServer).then(handleConnectionResult);
        return;
      }
      if (previousServer !== null) {
        hasAutoConnectedRef.current = true;
        connectToPrevious(previousServer);
        return;
      }
      if (standalone) {
        hasAutoConnectedRef.current = true;
        connectToServer({ ...DEFAULT_LOCAL_SERVER }).then(
          handleConnectionResult
        );
      }
    });
  }, [
    state.previousServer,
    autoconnect,
    standalone,
    nativeAPI,
    connectToPrevious,
  ]);

  return {
    ...state,
    connectToServer,
    goBackToDiscovery: nativeAPI?.goBackToDiscovery ?? (() => {}),
    advertiseService,
    startDiscovery,
    stopDiscovery,
    setMode,
    readLog,
    keepAwake,
    allowSleep,
    saveFile,
    saveDatabase,
    setServerMode,
  };
};

export const sendTabKeyPress = () =>
  (getNativeAPI()?.sendTabKeyPress ?? (() => {}))();
