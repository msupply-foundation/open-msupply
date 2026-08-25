// The desktop shell (spec/desktop) — the host side of the split tabled in
// src/desktop/README.md: it serves the bundled discovery page, browses mDNS,
// answer-checks a chosen server, navigates the window, and owns the way back.
// The page (src/desktop/, built to dist-discovery/) owns everything the user
// sees and decides.
//
// Two gaps of the CURRENT product shell (open-msupply electron.ts), named in
// src/desktop/hostBridge.ts, are deliberately NOT reproduced here:
// - connectToServer honours the server's `path`, which carries the login
//   hand-off's discovery-return + lng parameters (AC-DT23/24);
// - a failed load falls back to discovery with ?timedout=true, so the
//   could-not-connect notice is seeded (AC-DT2, AC-DT4).
//
// The discovery page is served over LOOPBACK HTTP, not file:// — the page's
// return address must be an http(s) URL: its own validation drops other
// schemes, and a served app's page could not navigate to file:// anyway
// (Chromium blocks it). A fixed port keeps the origin — and with it the
// page's localStorage (the remembered server, the last language) — stable
// across launches.
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const os = require('node:os');
const { app, BrowserWindow, ipcMain, session } = require('electron');
const Bonjour = require('bonjour-service').Bonjour;

// Same IPC channel names as the current product shell's preload, so the two
// stay recognisably one contract.
const IPC = {
  START_SERVER_DISCOVERY: 'start-server-discovery',
  DISCOVERED_SERVERS: 'discovered-servers',
  CONNECT_TO_SERVER: 'connect-to-server',
  CONNECTED_SERVER: 'connected-server',
  GO_BACK_TO_DISCOVERY: 'go-back-to-discovery',
};

const DISCOVERY_PAGE_PORT = 8317; // fixed: the page's localStorage lives on this origin
const ANSWER_CHECK_TIMEOUT_MS = 5000; // the bounded launch/choice check (spec § launch)
const STANDALONE = process.argv.includes('--standalone');

// Packaged layout has dist-discovery beside main.cjs; a dev run
// (`pnpm electron`) uses the repo build one level up.
const DISCOVERY_DIR = fs.existsSync(path.join(__dirname, 'dist-discovery'))
  ? path.join(__dirname, 'dist-discovery')
  : path.join(__dirname, '..', 'dist-discovery');

// --- Serve the bundled discovery page over loopback ------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const servePage = () =>
  new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = path.normalize(path.join(DISCOVERY_DIR, urlPath));
      // no traversal outside the bundle; directories get the SPA index
      if (!file.startsWith(DISCOVERY_DIR)) file = path.join(DISCOVERY_DIR, 'index.html');
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
        file = path.join(DISCOVERY_DIR, 'index.html');
      res.setHeader('content-type', MIME[path.extname(file)] ?? 'application/octet-stream');
      fs.createReadStream(file).pipe(res);
    });
    server.once('error', reject);
    // loopback only: this server exists for this window, not the network
    server.listen(DISCOVERY_PAGE_PORT, '127.0.0.1', () =>
      resolve(`http://127.0.0.1:${DISCOVERY_PAGE_PORT}/index.html`)
    );
  });

// --- mDNS browse ------------------------------------------------------------

const bonjour = new Bonjour();
let browser;
let discovered = [];
let connectedServer = null;

const localAddresses = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4')
    .map(i => i.address);

const lanAddress = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .find(i => i && i.family === 'IPv4' && !i.internal)?.address;

// One announcement → the wire shape the page expects (FrontEndHost,
// src/desktop/hostBridge.ts). Identity comes from the TXT record; the page
// re-checks completeness, so a partial record can pass through as-is.
const toFrontEndHost = service => {
  const txt = service.txt ?? {};
  let ip = (service.addresses ?? []).find(a => /^\d+\.\d+\.\d+\.\d+$/.test(a));
  if (!ip) return undefined;
  // Address rewriting (AC-DT22): a loopback announcement on a CLIENT machine
  // is this machine's own server — display and share an address other
  // machines can reach.
  if (/^127\./.test(ip)) ip = lanAddress() ?? ip;
  return {
    protocol: txt.protocol === 'http' ? 'http' : 'https',
    port: service.port,
    ip,
    clientVersion: txt.client_version ?? '',
    hardwareId: txt.hardware_id ?? '',
    isLocal: localAddresses().includes(ip),
  };
};

const startDiscovery = () => {
  browser?.stop();
  discovered = [];
  browser = bonjour.find({ type: 'omsupply', protocol: 'tcp' }, service => {
    const host = toFrontEndHost(service);
    if (host) discovered.push(host);
  });
};

// --- The bounded answer check ------------------------------------------------

const serverUrl = s => `${s.protocol}://${s.ip}:${s.port}`;

// Does the server answer at all? Any HTTP response counts (the page lands on
// /login of whatever the server serves); certificates are accepted — the
// current shell's check does the same, a weakness spec/desktop's README
// carries as its open trust question rather than this shell deciding it.
const answers = target =>
  new Promise(resolve => {
    const lib = target.startsWith('https') ? https : http;
    const req = lib.get(
      target,
      { rejectUnauthorized: false, timeout: ANSWER_CHECK_TIMEOUT_MS },
      res => {
        res.resume();
        resolve(true);
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', () => resolve(false));
  });

// --- Window + wiring ---------------------------------------------------------

const discoveryQuery = extra => {
  const params = new URLSearchParams(extra);
  if (STANDALONE) params.set('standalone', 'true');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

const createWindow = async () => {
  const pageUrl = await servePage();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const loadDiscovery = extra => win.loadURL(pageUrl + discoveryQuery(extra));

  ipcMain.on(IPC.START_SERVER_DISCOVERY, startDiscovery);
  ipcMain.handle(IPC.DISCOVERED_SERVERS, () => ({ servers: discovered }));
  ipcMain.handle(IPC.CONNECTED_SERVER, () => connectedServer);
  ipcMain.on(IPC.GO_BACK_TO_DISCOVERY, () => {
    // The page told not to bounce straight back (AC-DT16); its own
    // discovery-return URL carries the same flags, this covers a
    // bridge-initiated return.
    void loadDiscovery({ autoconnect: 'false' });
  });
  ipcMain.handle(IPC.CONNECT_TO_SERVER, async (_event, server) => {
    if (!(await answers(`${serverUrl(server)}/graphql`)))
      return { success: false, error: 'server did not answer' };
    connectedServer = server;
    // Resolve first (the page records the choice), then navigate — WITH the
    // path: it carries the discovery-return + lng hand-off (AC-DT23/24).
    setTimeout(() => {
      void win.loadURL(`${serverUrl(server)}/${server.path ?? ''}`);
    }, 50);
    return { success: true };
  });

  // A server that answered the check but whose UI then fails to load stays in
  // app-owned content (AC-DT4): back to discovery, the failure named by the
  // seeded could-not-connect notice (AC-DT2's ?timedout).
  win.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
    if (!isMainFrame || code === -3 /* user-aborted */) return;
    void loadDiscovery({ autoconnect: 'false', timedout: 'true' });
  });

  // Closing the app ends the session (AC-DT18) — same mechanism as the
  // current shell: clear cookies while everything is still alive.
  let closing = false;
  win.on('close', event => {
    if (closing) return;
    closing = true;
    event.preventDefault();
    session.defaultSession
      .clearStorageData({ storages: ['cookies'] })
      .finally(() => win.destroy());
  });

  await loadDiscovery();
};

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  bonjour.destroy();
  app.quit();
});
