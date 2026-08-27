// The shell half of the discovery host contract
// (src/discovery/hostContract.ts): expose the primitive surface the page
// drives. Nothing here decides anything — facts and capabilities cross the
// bridge, policy stays in the page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('discoveryHostApi', {
  hostInfo: () => ipcRenderer.invoke('discovery:host-info'),
  startDiscovery: () => ipcRenderer.send('discovery:start'),
  announcements: () => ipcRenderer.invoke('discovery:announcements'),
  probe: (url, timeoutMs) =>
    ipcRenderer.invoke('discovery:probe', url, timeoutMs),
  navigate: url => ipcRenderer.send('discovery:navigate', url),
});
