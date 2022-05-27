## Electron Client

When the server is running as an 'offline' sync server on the local network, there are a couple of problems which are a bit hard to solve with configuration:
* Discovery ( where is the server, and what if its local IP changes )
* SSL ( self-signed certificates do not play nicely with browsers )

The most robust way we've found to solve this issue is with a client app:
* Discover local servers with mDNS
* Trust certificates coming from the discovered server
* Display web content served by remote server (no need to upgrade client when server upgrades)
* Allow for future native functionality (potentialy can use another bundler when time comes to implement native functionality, like Tauri)

### Running

Make sure front end is built and run server (front end needs to be built because server, not webpack, will be serving front end to the client)

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

### Deving

In `packages/electron`

* `electron.ts:` entrypoint for electron app, opens `home` window, discovers servers with mDNS, exchanges IPC messages with browser window (for both `home` page and `login` page served by server)
* `preload.ts:` loads IPC interface to `window` so that front end can interact with electron client
* `rendered.ts`: electron will bundle one page that doesn't need connection to server, the `home.tsx` page, this page will show discovered servers and will allow user to connect to discovered servers. 

In `packages/common`

* `hooks/useElectronClient:` provides common types and interface for IPC communication with electron client (used both in `package/electron - ServerDiscovery` and in `packages/host - Login.tsx`, to display server info)

Since front end for client is server through remote server, it needs to be rebuilt if you are adding functionality that interacts with client, you can change  `ipcMain.on(IPC_MESSAGES.CONNECT_TO_SERVER` in `electron.ts`, see comment in code
