import { ElectronAPI } from '@common/hooks';
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_MESSAGES } from './shared';

const electronAPI: ElectronAPI = {
  startServerDiscovery: () =>
    ipcRenderer.send(IPC_MESSAGES.START_SERVER_DISCOVERY),
  connectedServer: () => ipcRenderer.invoke(IPC_MESSAGES.CONNECTED_SERVER),
  connectToServer: server =>
    ipcRenderer.send(IPC_MESSAGES.CONNECT_TO_SERVER, server),
  serverDiscovered: callback =>
    ipcRenderer.on(IPC_MESSAGES.SERVER_DISCOVERED, callback),
  startBarcodeScan: () => ipcRenderer.invoke(IPC_MESSAGES.START_BARCODE_SCAN),
  stopBarcodeScan: () => ipcRenderer.send(IPC_MESSAGES.STOP_BARCODE_SCAN),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
