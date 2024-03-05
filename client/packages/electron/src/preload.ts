import { FileInfo, NativeAPI } from '@common/hooks';
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_MESSAGES } from './shared';

const electronNativeAPI: NativeAPI = {
  startServerDiscovery: () =>
    ipcRenderer.send(IPC_MESSAGES.START_SERVER_DISCOVERY),
  connectedServer: () => ipcRenderer.invoke(IPC_MESSAGES.CONNECTED_SERVER),
  connectToServer: server =>
    ipcRenderer.invoke(IPC_MESSAGES.CONNECT_TO_SERVER, server),
  startBarcodeScan: () => ipcRenderer.invoke(IPC_MESSAGES.START_BARCODE_SCAN),
  stopBarcodeScan: () => ipcRenderer.invoke(IPC_MESSAGES.STOP_BARCODE_SCAN),
  onBarcodeScan: callback => {
    ipcRenderer.removeAllListeners(IPC_MESSAGES.ON_BARCODE_SCAN);
    ipcRenderer.on(IPC_MESSAGES.ON_BARCODE_SCAN, callback);
  },
  discoveredServers: () => ipcRenderer.invoke(IPC_MESSAGES.DISCOVERED_SERVERS),
  goBackToDiscovery: () => ipcRenderer.send(IPC_MESSAGES.GO_BACK_TO_DISCOVERY),
  readLog: () => ipcRenderer.invoke(IPC_MESSAGES.READ_LOG),
  linkedBarcodeScannerDevice: () =>
    ipcRenderer.invoke(IPC_MESSAGES.LINKED_BARCODE_SCANNER_DEVICE),
  startDeviceScan: () => ipcRenderer.invoke(IPC_MESSAGES.START_DEVICE_SCAN),
  onDeviceMatched: callback => {
    ipcRenderer.removeAllListeners(IPC_MESSAGES.ON_DEVICE_MATCHED);
    ipcRenderer.on(IPC_MESSAGES.ON_DEVICE_MATCHED, callback);
  },
  setScannerType: scannerType =>
    ipcRenderer.send(IPC_MESSAGES.SET_SCANNER_TYPE, scannerType),
  getScannerType: () => ipcRenderer.invoke(IPC_MESSAGES.GET_SCANNER_TYPE),
  saveFile: (fileInfo: FileInfo) =>
    ipcRenderer.invoke(IPC_MESSAGES.SAVE_FILE, fileInfo),
  saveDatabase: () => ipcRenderer.invoke(IPC_MESSAGES.SAVE_DATABASE),
};

contextBridge.exposeInMainWorld('electronNativeAPI', electronNativeAPI);
