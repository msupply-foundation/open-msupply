## Electron Client

When the server is running as an 'offline' sync server on the local network, there are a couple of problems which are a bit hard to solve with configuration:
* Discovery ( where is the server, and what if its local IP changes )
* SSL ( self-signed certificates do not play nicely with browsers )

The most robust way we've found to solve this issue is with a client app:
* Discover local servers with DNS-SD
* Trust certificates coming from the discovered server
* Display web content served by remote server (no need to upgrade client when server upgrades)
* Allow for native functionality in the future (potentially we can use another bundler when time comes to implement native functionality, like Tauri)

### Running

Make sure front end is built and run the server (the front end needs to be built because the server, not webpack, will be serving front end to the client)

```bash
cd client
yarn build
cd ../server
cargo run
```

Run electron in another terminal

```bash
cd client 
yarn electron:start
```

### Developing

In `packages/electron`

* `electron.ts:` entrypoint for electron app, opens `home` window, discovers servers with DNS-SD, exchanges IPC messages with browser window (for both `home` page and `login` page served by server)
* `preload.ts:` loads IPC interface to `window` so that front end can interact with electron client
* `rendered.ts`: electron will bundle one page that doesn't need connection to server, the `home.tsx` page, this page will show discovered servers and will allow user to connect to discovered servers. 

In `packages/common`

* `hooks/useElectronClient:` provides common types and interface for IPC communication with electron client (used both in `package/electron - ServerDiscovery` and in `packages/host - Login.tsx`, to display server info)

Since front end for client is server through remote server, it needs to be rebuilt if you are adding functionality that interacts with client, you can change  `ipcMain.on(IPC_MESSAGES.CONNECT_TO_SERVER` in `electron.ts`, see comment in code

### Debugigng

Similar to [android](../android/README.MD#debugging), to speed up development we can serve both discovery and main web app through webpack server. Running `yarn start-local` and `yarn electron:start-local` from client would allow for hot reload and debugging typescript (can open developer tools with the same shortcut as chrome).

Please note that when debugging with live reload, connections to a discovered server will always go through to the webpack server (regardless of which server is being selected). 
Also the discovery may not show any servers when hot reloaded and may require stopping and starting electron

### Self signed cert SSL security

To avoid error being thrown by electron when certificate is self signed, we override certificate error listener and allow connection when:
* In debug mode (`yarn start-local`)
* For all connections to selected server where stored SSL fingerprint matches server fingerprint

For above to work we store SSL fingerprint when we first connect to the server and then check that fingerprint on consecutive connections. SSL fingeprint is stored in app data and is associated with `hardwareId` and `port` of the server.

To clear electron app data you would need to delete or edit `/Users/{user}/Library/Application Support/open mSupply/config.json`
