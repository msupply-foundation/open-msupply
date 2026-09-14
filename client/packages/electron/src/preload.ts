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

// The new front end's discovery host contract
// (frontend/src/discovery/hostContract.ts), exposed ONLY on the discovery
// page's own origin.
//
// A preload runs again for every document this window loads, and after a
// connection that document is the chosen server's UI. Without the gate that
// UI — and anything that gets script into it — would keep hostInfo (this
// machine's id and network addresses), probe (an arbitrary-URL fetch from this
// machine with certificate checks off) and navigate. Nothing past the hand-off
// uses this API: the served login screen's way back is a plain link.
//
// electronNativeAPI above is deliberately left as it was. The old front end is
// served by the connected server and needs it there, so narrowing it is a
// separate change with its own blast radius.
const originArgument = process.argv.find(argument =>
  argument.startsWith('--discovery-origin=')
);
const pageOrigin = originArgument?.slice('--discovery-origin='.length);

if (pageOrigin && location.origin === pageOrigin) {
  contextBridge.exposeInMainWorld('discoveryHostApi', {
    hostInfo: () => ipcRenderer.invoke(IPC_MESSAGES.DISCOVERY_HOST_INFO),
    startDiscovery: () => ipcRenderer.send(IPC_MESSAGES.DISCOVERY_START),
    announcements: () =>
      ipcRenderer.invoke(IPC_MESSAGES.DISCOVERY_ANNOUNCEMENTS),
    probe: (url: string, timeoutMs: number) =>
      ipcRenderer.invoke(IPC_MESSAGES.DISCOVERY_PROBE, url, timeoutMs),
    navigate: (url: string, server: unknown) =>
      ipcRenderer.send(IPC_MESSAGES.DISCOVERY_NAVIGATE, url, server),
  });
}
