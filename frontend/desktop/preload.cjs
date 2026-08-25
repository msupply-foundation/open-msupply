// The shell half of the host bridge (src/desktop/hostBridge.ts): expose the
// typed surface the discovery page drives. Channel names match the current
// product shell's preload so the two stay one recognisable contract.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronNativeAPI', {
  startServerDiscovery: () => ipcRenderer.send('start-server-discovery'),
  discoveredServers: () => ipcRenderer.invoke('discovered-servers'),
  connectToServer: server => ipcRenderer.invoke('connect-to-server', server),
  connectedServer: () => ipcRenderer.invoke('connected-server'),
  goBackToDiscovery: () => ipcRenderer.send('go-back-to-discovery'),
});
