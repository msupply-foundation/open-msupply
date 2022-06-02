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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
