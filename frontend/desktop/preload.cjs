// The shell half of the discovery host contract
// (src/discovery/hostContract.ts): expose the primitive surface the page
// drives. Nothing here decides anything — facts and capabilities cross the
// bridge, policy stays in the page.
//
// Exposed ONLY on the discovery page's own origin. A preload runs again for
// every document the window loads, so without this gate the connected
// server's UI — and anything that gets script into it — would keep the API
// after navigate(): hostInfo() states this machine's id and LAN addresses,
// probe() is an arbitrary-URL fetch from this machine with certificate
// checks off, and navigate() steers the window. Nothing past the hand-off
// uses it (the served login screen's way back is a plain link), so the gate
// costs nothing. main.cjs passes the origin rather than this file repeating
// the port.
const { contextBridge, ipcRenderer } = require('electron');

const originArg = process.argv.find(a => a.startsWith('--discovery-origin='));
const pageOrigin = originArg?.slice('--discovery-origin='.length);

if (pageOrigin && location.origin === pageOrigin) {
  contextBridge.exposeInMainWorld('discoveryHostApi', {
    hostInfo: () => ipcRenderer.invoke('discovery:host-info'),
    startDiscovery: () => ipcRenderer.send('discovery:start'),
    announcements: () => ipcRenderer.invoke('discovery:announcements'),
    probe: (url, timeoutMs) =>
      ipcRenderer.invoke('discovery:probe', url, timeoutMs),
    navigate: (url, server) =>
      ipcRenderer.send('discovery:navigate', url, server),
  });
}
