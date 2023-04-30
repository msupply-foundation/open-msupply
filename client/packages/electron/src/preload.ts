import { NativeAPI } from '@common/hooks';
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_MESSAGES } from './shared';

const electronNativeAPI: NativeAPI = {
  startServerDiscovery: () =>
    ipcRenderer.send(IPC_MESSAGES.START_SERVER_DISCOVERY),
  connectedServer: () => ipcRenderer.invoke(IPC_MESSAGES.CONNECTED_SERVER),
  connectToServer: server =>
    ipcRenderer.send(IPC_MESSAGES.CONNECT_TO_SERVER, server),
  startBarcodeScan: () => ipcRenderer.invoke(IPC_MESSAGES.START_BARCODE_SCAN),
  stopBarcodeScan: () => ipcRenderer.invoke(IPC_MESSAGES.STOP_BARCODE_SCAN),
  onBarcodeScan: callback => {
    ipcRenderer.removeAllListeners(IPC_MESSAGES.ON_BARCODE_SCAN);
    ipcRenderer.on(IPC_MESSAGES.ON_BARCODE_SCAN, callback);
  },
  discoveredServers: () => ipcRenderer.invoke(IPC_MESSAGES.DISCOVERED_SERVERS),
  goBackToDiscovery: () => ipcRenderer.send(IPC_MESSAGES.GO_BACK_TO_DISCOVERY),
  readLog: () => ipcRenderer.invoke(IPC_MESSAGES.READ_LOG),
};

contextBridge.exposeInMainWorld('electronNativeAPI', electronNativeAPI);
