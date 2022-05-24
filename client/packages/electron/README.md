## Electron Client

When server is running as an `offline` sync server on local network there are a couple of problems that's a bit hard to solve with configurations: 
* Discovery (where is server, and what if it's local IP changes)
* SSL (self signed certs and browsers are not friendly)

It seems like the most robust way to solve this issue is with a client app:
* Discover server with mDNS
* Trust certificates coming from discovered server
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
