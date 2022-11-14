import { NativeAPI } from '@common/hooks';
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_MESSAGES } from './shared';

const electronNativeAPI: NativeAPI = {
  startServerDiscovery: () =>
    ipcRenderer.send(IPC_MESSAGES.START_SERVER_DISCOVERY),
  connectedServer: () => ipcRenderer.invoke(IPC_MESSAGES.CONNECTED_SERVER),
  connectToServer: server =>
    ipcRenderer.send(IPC_MESSAGES.CONNECT_TO_SERVER, server),
  discoveredServers: () => ipcRenderer.invoke(IPC_MESSAGES.DISCOVERED_SERVERS),
  goBackToDiscovery: () => ipcRenderer.send(IPC_MESSAGES.GO_BACK_TO_DISCOVERY),
};

contextBridge.exposeInMainWorld('electronNativeAPI', electronNativeAPI);
