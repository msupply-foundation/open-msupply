// The desktop shell (spec/desktop) — the host side of the contract in
// src/discovery/hostContract.ts: it serves the bundled discovery page,
// browses mDNS and hands announcements over verbatim, states this machine's
// facts (hostInfo), answer-checks a URL on request (probe), and navigates
// the window (navigate). The page owns everything the user sees and every
// decision — locality marking, address rewriting, what is remembered, the
// probe → record → navigate ordering — so this file holds no policy.
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
const { execSync } = require('node:child_process');
const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const Bonjour = require('bonjour-service').Bonjour;

const IPC = {
  HOST_INFO: 'discovery:host-info',
  START: 'discovery:start',
  ANNOUNCEMENTS: 'discovery:announcements',
  PROBE: 'discovery:probe',
  NAVIGATE: 'discovery:navigate',
};

const DISCOVERY_PAGE_PORT = 8317; // fixed: the page's localStorage lives on this origin
const STANDALONE = process.argv.includes('--standalone');
const PAGE = 'discovery.html';

// Packaged layout has the pruned page bundle beside main.cjs
// (scripts/prune-discovery-dist.mjs — discovery.html + its transitive chunks
// out of the app build); a dev run (`pnpm electron`) serves the repo's full
// dist/, of which the page's files are a subset.
const DISCOVERY_DIR = fs.existsSync(path.join(__dirname, 'dist-discovery'))
  ? path.join(__dirname, 'dist-discovery')
  : path.join(__dirname, '..', 'dist');

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
      const fallback = path.join(DISCOVERY_DIR, PAGE);
      let file = fallback;
      try {
        const urlPath = decodeURIComponent(
          new URL(req.url, 'http://x').pathname
        );
        file = path.normalize(path.join(DISCOVERY_DIR, urlPath));
      } catch {
        // A malformed percent-sequence is just a bad request; anything on
        // this machine can hit the loopback port, and a URIError here would
        // take the whole main process down.
      }
      // no traversal outside the bundle; directories get the SPA page
      if (!file.startsWith(DISCOVERY_DIR + path.sep)) file = fallback;
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
        file = fallback;
      res.setHeader(
        'content-type',
        MIME[path.extname(file)] ?? 'application/octet-stream'
      );
      fs.createReadStream(file).pipe(res);
    });
    server.once('error', reject);
    // loopback only: this server exists for this window, not the network
    server.listen(DISCOVERY_PAGE_PORT, '127.0.0.1', () =>
      resolve(`http://127.0.0.1:${DISCOVERY_PAGE_PORT}/${PAGE}`)
    );
  });

// --- Host facts (hostInfo) ---------------------------------------------------

const lanAddresses = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);

// This machine's id, from the SAME OS sources the server's announced
// hardware_id comes from (the machine_uid crate: IOPlatformUUID on macOS,
// /var/lib/dbus/machine-id on Linux, the MachineGuid registry value on
// Windows) — so the page's hardware-id locality compare matches the local
// server's announcement. '' when unreadable: the this-machine mark just
// never shows.
let machineIdCached;
const machineId = () => {
  if (machineIdCached !== undefined) return machineIdCached;
  try {
    if (process.platform === 'darwin') {
      const out = execSync('ioreg -rd1 -c IOPlatformExpertDevice', {
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString();
      machineIdCached = /"IOPlatformUUID"\s*=\s*"([^"]+)"/.exec(out)?.[1] ?? '';
    } else if (process.platform === 'win32') {
      const out = execSync(
        'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
        { stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString();
      machineIdCached = /MachineGuid\s+REG_SZ\s+(\S+)/.exec(out)?.[1] ?? '';
    } else {
      const read = p => {
        try {
          return fs.readFileSync(p, 'utf8').trim();
        } catch {
          return '';
        }
      };
      machineIdCached =
        read('/var/lib/dbus/machine-id') || read('/etc/machine-id');
    }
  } catch {
    machineIdCached = '';
  }
  return machineIdCached;
};

// --- mDNS browse ------------------------------------------------------------

const bonjour = new Bonjour();
let browser;
let announcements = [];

// One resolved service → the verbatim announcement shape
// (hostContract.ts § RawAnnouncement): resolved IPv4 + TXT identity, nothing
// marked, nothing rewritten — locality and address policy are the page's.
const toAnnouncement = service => {
  const txt = service.txt ?? {};
  const ip = (service.addresses ?? []).find(a =>
    /^\d+\.\d+\.\d+\.\d+$/.test(a)
  );
  if (!ip) return undefined;
  return {
    ip,
    port: service.port,
    protocol: txt.protocol ?? '',
    clientVersion: txt.client_version ?? '',
    hardwareId: txt.hardware_id ?? '',
  };
};

const startDiscovery = () => {
  stopDiscovery();
  browser = bonjour.find({ type: 'omsupply', protocol: 'tcp' }, service => {
    const announcement = toAnnouncement(service);
    if (announcement) announcements.push(announcement);
  });
};

// Browsing stops when the page stops being on screen (navigate, below): mDNS
// is continuous multicast, and nothing polls announcements() once the window
// has left for a server. A return to discovery starts a fresh search of its
// own (DiscoveryPage § search).
const stopDiscovery = () => {
  browser?.stop();
  browser = undefined;
  announcements = [];
};

// --- The bounded answer check (probe) ----------------------------------------

// Does anything answer HTTP at this URL? Any response counts; certificates
// are accepted — the legacy shell's check does the same, a weakness
// spec/desktop's README carries as its open trust question rather than this
// shell deciding it. The timeout is the page's (clamped here only against a
// nonsense value crossing the bridge).
const answers = (target, timeoutMs) =>
  new Promise(resolve => {
    if (!/^https?:\/\//.test(target)) return resolve(false);
    const timeout = Math.min(Math.max(Number(timeoutMs) || 5000, 500), 30000);
    const lib = target.startsWith('https') ? https : http;
    try {
      const req = lib.get(
        target,
        { rejectUnauthorized: false, timeout },
        res => {
          res.resume();
          resolve(true);
        }
      );
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', () => resolve(false));
    } catch {
      // The scheme test above is not a parse: a manually entered
      // `http://a b` passes it and throws ERR_INVALID_URL right here. The
      // contract says probe never rejects (hostContract.ts), and the Android
      // host already answers false for the same input.
      resolve(false);
    }
  });

// --- Window + wiring ---------------------------------------------------------

const discoveryQuery = extra => {
  const params = new URLSearchParams(extra);
  if (STANDALONE) params.set('standalone', 'true');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

const fatal = (title, detail) => {
  dialog.showErrorBox(title, detail);
  app.quit();
};

const createWindow = async () => {
  if (!fs.existsSync(path.join(DISCOVERY_DIR, PAGE)))
    return fatal(
      'Open mSupply: discovery page missing',
      `${path.join(DISCOVERY_DIR, PAGE)} does not exist — run \`pnpm build\` first.`
    );

  let pageUrl;
  try {
    pageUrl = await servePage();
  } catch (e) {
    // Almost always EADDRINUSE — another instance, or another app, on the
    // fixed port. Without this the whenReady promise swallowed the rejection
    // and the process sat alive with no window and no message.
    return fatal(
      'Open mSupply: cannot serve the discovery page',
      `Port ${DISCOVERY_PAGE_PORT} on 127.0.0.1 is unavailable (${e.code ?? e.message}). Close the application using it and relaunch.`
    );
  }
  const pageOrigin = `http://127.0.0.1:${DISCOVERY_PAGE_PORT}`;

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // The preload exposes the host API on this origin only; it reads the
      // origin from here rather than repeating the port (preload.cjs).
      additionalArguments: [`--discovery-origin=${pageOrigin}`],
    },
  });

  const loadDiscovery = extra => win.loadURL(pageUrl + discoveryQuery(extra));

  // The preload only reaches the page's own origin, but a renderer is the
  // untrusted side of the bridge either way: every handler answers the
  // discovery page and nothing else.
  const fromPage = event => {
    try {
      return new URL(event.senderFrame?.url ?? '').origin === pageOrigin;
    } catch {
      return false;
    }
  };

  ipcMain.handle(IPC.HOST_INFO, event =>
    fromPage(event)
      ? {
          platform: 'electron',
          hardwareId: machineId(),
          lanAddresses: lanAddresses(),
        }
      : { platform: 'electron', hardwareId: '', lanAddresses: [] }
  );
  ipcMain.on(IPC.START, event => {
    if (fromPage(event)) startDiscovery();
  });
  ipcMain.handle(IPC.ANNOUNCEMENTS, event => ({
    announcements: fromPage(event) ? announcements : [],
  }));
  ipcMain.handle(IPC.PROBE, (event, url, timeoutMs) =>
    fromPage(event) ? answers(url, timeoutMs) : false
  );
  ipcMain.on(IPC.NAVIGATE, (_event, url, server) => {
    // Plain navigation, immediately: the page has already persisted what it
    // needs (record-before-navigate, src/discovery/discovery.ts), so the old
    // resolve-then-wait-50ms dance is gone. Scheme-checked because the URL
    // crosses the bridge.
    //
    // No fromPage() gate: a page navigating this window is something any
    // document can do with location.href, so refusing here would buy nothing.
    //
    // `server` (hostContract.ts § ConnectedServer) is accepted and unused:
    // this shell accepts any certificate, the weakness spec/desktop carries as
    // its open trust question. It is where a fingerprint check would key from
    // when that is answered — the legacy desktop shell stores fingerprints
    // under exactly this hardware id and port.
    void server;
    if (/^https?:\/\//.test(String(url))) {
      stopDiscovery();
      void win.loadURL(url);
    }
  });

  // Host duty (hostContract.ts, AC-DT4): a server that answered the probe but
  // whose UI then fails to load stays in app-owned content — back to
  // discovery, the failure named by the seeded could-not-connect notice
  // (?timedout). A failure on the page's OWN origin is a packaging fault, not
  // a server failure: reloading would just fail again forever, so say so and
  // stop.
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 /* user-aborted */) return;
    if (url.startsWith(pageOrigin))
      return fatal(
        'Open mSupply: discovery page failed to load',
        `${url} failed (${desc || code}).`
      );
    void loadDiscovery({ autoconnect: 'false', timedout: 'true' });
  });

  // Host duty (AC-DT18): closing the app ends the session — same mechanism as
  // the legacy shell: clear cookies while everything is still alive.
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

// One instance: the loopback port is per-machine, and a second instance would
// otherwise die on it invisibly. The first instance gets focused instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => {
    bonjour.destroy();
    app.quit();
  });
}
