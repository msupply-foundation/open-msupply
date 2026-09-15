import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  session,
  shell,
  webContents,
} from 'electron';
import dnssd from 'dnssd';
import type { MessageBoxOptions } from 'electron';
import { IPC_MESSAGES } from './shared';
import { createSharedPrompt } from './sharedPrompt';
import { address as getIpAddress, isV4Format } from 'ip';
import {
  FrontEndHost,
  frontEndHostUrl,
  isProtocol,
  BarcodeScanner,
  ScannerType,
  ConnectionResult,
  DEFAULT_LOCAL_SERVER,
} from '@openmsupply-client/common/src/hooks/useNativeClient';
import HID from 'node-hid';
import ElectronStore from 'electron-store';
import { KeyboardScanner } from './keyboardScanner/keyboardScanner';
import https from 'https';
import http from 'http';
import defaultTranslations from '../../common/src/intl/locales/en/desktop.json';
import fs from 'fs-extra';
import {
  answers,
  DISCOVERY_PAGE_ORIGIN,
  lanAddresses,
  machineId,
  servePage,
} from './discoveryHost';

// We'll lazy load, once we have the locale available
const importDesktopTranslations = async (locale: string) =>
  import(`../../common/src/intl/locales/${locale}/desktop.json`);

const SERVICE_TYPE = 'omsupply';
const PREVIOUS_SERVER_KEY = 'previous_server';
const PROTOCOL_KEY = 'protocol';
const CLIENT_VERSION_KEY = 'client_version';
const HARDWARE_ID_KEY = 'hardware_id';
const BARCODE_SCANNER_DEVICE_KEY = 'barcode_scanner_device';
const SCANNER_TYPE = 'scanner_type';
const DEVICE_CLOSE_DELAY = 5000;
const OMSUPPLY_BARCODE =
  '19,16,3,0,111,112,101,110,32,109,83,117,112,112,108,121,0,24,11';

class Scanner {
  device: HID.HID | undefined;
  barcodeScanner: BarcodeScanner | undefined;
  window: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.device = this.findDevice();
    this.window = window;
    const storedScanner = store.get(BARCODE_SCANNER_DEVICE_KEY, null);
    this.barcodeScanner = !storedScanner
      ? undefined
      : { ...JSON.parse(storedScanner), connected: false };
  }

  private findDevice() {
    if (this.barcodeScanner) {
      try {
        const hid = new HID.HID(
          this.barcodeScanner.vendorId,
          this.barcodeScanner.productId
        );
        this.barcodeScanner.connected = true;
        return hid;
      } catch (e) {
        console.error(e);
      }
    }
  }

  scanDevices(window: BrowserWindow) {
    const devices: BarcodeScanner[] = [];
    // if a scanner is already connected, we'll need to close it in order to open it
    if (this.device) {
      this.device?.close();
    }

    HID.devices().forEach(device => {
      devices.push({ ...device, connected: false });
      if (device.path) {
        try {
          const hid = new HID.HID(device.vendorId, device.productId);

          // close the devices after a delay
          const timeout = setTimeout(() => {
            try {
              hid.close();
            } catch {}
          }, DEVICE_CLOSE_DELAY);

          hid.on('data', data => {
            if (typeof data !== 'object') return;
            if (!Buffer.isBuffer(data)) return;

            const valid = data.subarray(0, 19).join(',') === OMSUPPLY_BARCODE;

            if (valid) {
              const scanner = { ...device, connected: true };
              store.set(BARCODE_SCANNER_DEVICE_KEY, JSON.stringify(scanner));
              window.webContents.send(IPC_MESSAGES.ON_DEVICE_MATCHED, scanner);
              clearTimeout(timeout);
              this.device = hid;
              this.barcodeScanner = scanner;
            }
          });
        } catch (e) {
          // keyboard devices are unable to be opened and will throw an error
          console.error(e);
        }
      }
    });
  }

  start() {
    if (!this.device) throw new Error('No scanners found');
    this.device?.on('data', data => {
      this.window.webContents.send(IPC_MESSAGES.ON_BARCODE_SCAN, data);
    });
  }

  stop() {
    try {
      this.device?.close();
      this.device = this.findDevice();
    } catch {}
  }

  linkedScanner() {
    return this.barcodeScanner;
  }
}

// the typescript typing for ElectronStore now requires us to build as ESM modules
// in order to get the ts defs for 'conf' which gives the get/set/clear methods
// because we aren't building ESM, have manually typed the class
const store = new ElectronStore() as unknown as {
  clear: () => void;
  get: (key: string, defaultValue: string | null) => string | null;
  set: (key: string, value: string | null) => void;
};

const storePreviousServer = (server: FrontEndHost) =>
  store.set(PREVIOUS_SERVER_KEY, JSON.stringify(server));

const getStoredPreviousServer = (): FrontEndHost | null => {
  const stored = store.get(PREVIOUS_SERVER_KEY, null);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Corrupt previous_server in electron-store, clearing:', e);
    store.set(PREVIOUS_SERVER_KEY, null);
    return null;
  }
};

const discovery = new dnssd.Browser(dnssd.tcp(SERVICE_TYPE));

// Set by the standalone Setup Factory installer's desktop shortcut.
// When true, the Electron client always connects to its bundled local server
// via 127.0.0.1 and auto-connects on startup if no server is configured.
const isStandalone = process.argv.includes('--standalone');

let connectedServer: FrontEndHost | null = null;
let discoveredServers: FrontEndHost[] = [];

// Announcements as heard, for the new front end's discovery page. Kept
// SEPARATELY from discoveredServers above, which the old front end drains and
// which has already had policy applied to it (locality, address rewriting).
// The contract wants them raw and accumulating: the page filters, dedupes and
// marks (frontend/src/discovery/discovery.ts), so no host does it twice.
type RawAnnouncement = {
  ip: string;
  port: number;
  protocol: string;
  clientVersion: string;
  hardwareId: string;
};
let announcements: RawAnnouncement[] = [];

// The server the discovery page chose (hostContract.ts § ConnectedServer).
// Certificate trust needs it and cannot be done blind: the page drives
// probe -> record -> navigate itself, so the fused CONNECT_TO_SERVER that used
// to set connectedServer never runs on that path.
//
// `origin`, not the URL that was navigated to, is what trust matches on: the
// certificate-error event fires per REQUEST, so the document, every script and
// style, and every GraphQL call each arrive separately. A rule scoped to the
// hand-off URL would answer the first and refuse the rest — and the old front
// end's path has always matched by origin (frontEndHostUrl).
let chosenServer: {
  origin: string;
  hardwareId: string;
  port: number;
  isLocal: boolean;
} | null = null;

// The same choice as a FrontEndHost — see the CONNECTED_SERVER handler for
// why the old front end needs it.
let chosenFrontEndHost: FrontEndHost | null = null;

// The served discovery page's URL, once the loopback server is listening.
let discoveryPageUrl = '';
let hasLoadingError = false;

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const getDebugHost = () => {
  const { ELECTRON_HOST } = process.env;
  return (typeof ELECTRON_HOST !== 'undefined' && ELECTRON_HOST) || '';
};

// The discovery screen is now the new front end's page, served over loopback
// by this shell (./discoveryHost.ts) instead of the webpack renderer below —
// one page for both shells, so they cannot drift. MAIN_WINDOW_WEBPACK_ENTRY is
// still the fallback until that server is listening, and the debug host serves
// the same page from a vite dev server.
//
// Can debug by opening chrome chrome://inspect and open inspect under 'devices'
const startUrl = () => {
  if (getDebugHost()) return `${getDebugHost()}/discovery.html`;
  return discoveryPageUrl || MAIN_WINDOW_WEBPACK_ENTRY;
};

// The origin the discovery page is actually served from — the loopback server
// normally, the dev server under ELECTRON_HOST. The preload exposes the host
// API on this origin and nowhere else (./preload.ts), so it has to follow
// startUrl(): pinned to loopback, a debug run would load the page from the dev
// server and find no host at all.
//
// Read from the URL the server reported rather than from the preferred port,
// because that port is only preferred (./discoveryHost.ts § servePage): a
// second window of this app serves the page on a free port instead, and a
// hard-coded origin would then gate the host API onto a page that is not
// there.
const pageOrigin = (): string => {
  const debugHost = getDebugHost();
  const served = discoveryPageUrl || DISCOVERY_PAGE_ORIGIN;
  if (!debugHost) {
    try {
      return new URL(served).origin;
    } catch {
      return DISCOVERY_PAGE_ORIGIN;
    }
  }
  try {
    return new URL(debugHost).origin;
  } catch {
    return DISCOVERY_PAGE_ORIGIN;
  }
};

const buildStartUrl = (extra: Record<string, string> = {}) => {
  const params = new URLSearchParams(extra);
  if (isStandalone) params.set('standalone', 'true');
  const qs = params.toString();
  const base = startUrl();
  return qs ? `${base}?${qs}` : base;
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const HEALTH_CHECK_TIMEOUT = 1500;

// Pure health check — no side effects, no auto-navigation.
const isServerAlive = (server: FrontEndHost): Promise<boolean> =>
  new Promise(resolve => {
    const lib = server.protocol === 'https' ? https : http;
    const request = lib.get(
      frontEndHostUrl(server),
      { rejectUnauthorized: false },
      response => resolve(response.statusCode === 200)
    );
    request.on('error', e => {
      console.error('Error received connecting to server:', e);
      resolve(false);
    });
    request.setTimeout(HEALTH_CHECK_TIMEOUT, () => {
      request.destroy();
      resolve(false);
    });
  });

// Health check + navigate. Used by the CONNECT_TO_SERVER IPC handler.
const tryToConnectToServer = async (
  window: BrowserWindow,
  server: FrontEndHost
): Promise<ConnectionResult> => {
  if (await isServerAlive(server)) {
    connectToServer(window, server);
    return { success: true };
  }
  return { success: false, error: 'Server not reachable' };
};

const connectToServer = (window: BrowserWindow, server: FrontEndHost) => {
  if (!isStandalone && server.isLocal && isLoopback(server.ip)) {
    // Non-standalone desktop: translate loopback to public IP so the QR code
    // and SiteInfo show an externally-reachable URL for clients like CCA.
    // Skipped in standalone mode so autoconnect to loopback survives network
    // changes (issue #10036) and discovery picks keep their announced IP.
    server = { ...server, ip: getIpAddress('public') };
  }
  discovery.stop();
  connectedServer = server;
  // This window is on THIS server now, so the page's earlier choice is no
  // longer where we are (§ CONNECTED_SERVER).
  chosenFrontEndHost = null;

  const url = getDebugHost() || frontEndHostUrl(server);
  window.loadURL(url);
};

const start = async (): Promise<void> => {
  // Serve the discovery page over loopback before anything loads. A failure
  // here is not fatal: the shell falls back to the old front end's own
  // discovery screen in the webpack renderer, so the app still starts.
  //
  // That fallback is a last resort, not a supported second path — nothing
  // exercises it, and the shell APIs underneath it keep moving — so the one
  // failure a user can actually cause, the preferred port being taken by a
  // second window, is handled inside servePage by taking a free port instead.
  // Getting here means the page is missing from the install.
  try {
    discoveryPageUrl = await servePage();
  } catch (error) {
    console.error(
      "Could not serve the discovery page — falling back to the old front end's discovery screen:",
      error
    );
  }

  // Create the browser window.
  const window = new BrowserWindow({
    height: 800,
    width: 1200,
    minWidth: 800,
    minHeight: 768,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      // The preload exposes the discovery host API on this origin only; it
      // reads the origin from here rather than working it out for itself.
      additionalArguments: [`--discovery-origin=${pageOrigin()}`],
    },
  });

  // Not using i18next here, as that needs more of the app to be initialised
  // than we have available at this point. We also don't need all the translations,
  // just the desktop ones, so we can import them directly.

  const appLocale = app.getLocale();

  // See if we have translations for the system language
  importDesktopTranslations(appLocale)
    // Some locales are in the format of 'fr-DJ', check if we have translations for the base (fr)
    .catch(() => importDesktopTranslations(appLocale.split('-')[0] ?? ''))
    .catch(() => {}) // swallow error, use default translations
    .then(translations => {
      // Merge the translations with the default translations
      const mergedTranslations = {
        ...defaultTranslations,
        ...translations,
      };
      // Configure app menus once we have translations available
      configureMenus(window, mergedTranslations);
    });

  ipcMain.on(IPC_MESSAGES.START_SERVER_DISCOVERY, () => {
    discovery.stop();
    discoveredServers = [];
    discovery.start();
  });

  ipcMain.on(IPC_MESSAGES.GO_BACK_TO_DISCOVERY, () => {
    window.loadURL(buildStartUrl({ autoconnect: 'false' }));
  });

  ipcMain.handle(
    IPC_MESSAGES.CONNECT_TO_SERVER,
    async (_event, server: FrontEndHost) => {
      const result = await tryToConnectToServer(window, server);
      if (result.success) storePreviousServer(server);
      return result;
    }
  );

  /**
   * Which server this window is on, for whichever front end is asking.
   *
   * The old front end asks so it can show the address and offer "change
   * server" beside it (host/src/components/SiteInfo.tsx renders that row only
   * when this answers). `connectedServer` is set only by the fused
   * CONNECT_TO_SERVER — which the discovery page never calls, since it drives
   * probe -> record -> navigate itself. So an old front end reached THROUGH
   * the page had no way back to discovery at all: no row, and nothing else on
   * its login screen offers one. Answer from the page's choice when the fused
   * path has not run. Matches the Android host (NativeApi.connectedServer).
   *
   * Whichever path navigated LAST wins, because the question is "where is this
   * window now". Preferring either variable outright answers with a stale
   * server: launch auto-connects to A (setting connectedServer), the user
   * changes server to B through the page (setting chosenFrontEndHost), and the
   * address shown beside the change-server button is still A's. So the page's
   * choice is cleared when the fused path runs (§ connectToServer) and takes
   * precedence here when it has not.
   */
  ipcMain.handle(
    IPC_MESSAGES.CONNECTED_SERVER,
    async () => chosenFrontEndHost ?? connectedServer
  );

  // --- The new front end's discovery host contract -------------------------
  // Facts and native capabilities only; every decision is the page's.
  // Answers are the same shape both shells give, so the page cannot tell them
  // apart (frontend/src/discovery/hostContract.ts).

  // The preload only reaches the page's own origin (./preload.ts), but a
  // renderer is the untrusted side of the bridge either way, and this window
  // goes on to load the connected server's UI through the same preload: every
  // handler answers the discovery page and nothing else. Matches the new
  // shell's gate (frontend/desktop/main.cjs § fromPage).
  const fromPage = (event: { senderFrame?: { url: string } | null }) => {
    try {
      return new URL(event.senderFrame?.url ?? '').origin === pageOrigin();
    } catch {
      return false;
    }
  };

  ipcMain.handle(IPC_MESSAGES.DISCOVERY_HOST_INFO, async event =>
    fromPage(event)
      ? {
          platform: 'electron',
          hardwareId: machineId(),
          lanAddresses: lanAddresses(),
          // What the LEGACY screen saved where the page cannot look
          // (hostContract.ts § HostInfo.legacy). On this shell that is not the
          // renderer's localStorage — the page is served from a loopback
          // origin of its own, so the legacy `preference/*` entries under the
          // webpack renderer's origin are invisible to it and unreadable from
          // here — but this shell's OWN electron-store record, written by every
          // successful CONNECT_TO_SERVER since the app shipped. Adopting it is
          // what stops an upgraded install re-picking a server it has used for
          // years. Handed over as stored: the page's readers validate it, and
          // the shape is the same FrontEndHost (useNativeClient/types.ts).
          //
          // `mode` is not reported: this install is a desktop client, which is
          // never offered the role question (no canhost flag), so there is
          // nothing for the page to do with it.
          legacy: {
            previousServer: store.get(PREVIOUS_SERVER_KEY, null) ?? undefined,
          },
        }
      : { platform: 'electron', hardwareId: '', lanAddresses: [] }
  );

  ipcMain.on(IPC_MESSAGES.DISCOVERY_START, event => {
    if (!fromPage(event)) return;
    discovery.stop();
    announcements = [];
    discoveredServers = [];
    discovery.start();
  });

  ipcMain.handle(IPC_MESSAGES.DISCOVERY_ANNOUNCEMENTS, async event => ({
    announcements: fromPage(event) ? announcements : [],
  }));

  ipcMain.handle(
    IPC_MESSAGES.DISCOVERY_PROBE,
    async (event, url: string, timeoutMs: number) =>
      fromPage(event) ? answers(url, timeoutMs) : false
  );

  ipcMain.on(
    IPC_MESSAGES.DISCOVERY_NAVIGATE,
    (
      _event,
      url: string,
      server: { hardwareId: string; port: number; isLocal: boolean }
    ) => {
      if (!/^https?:\/\//.test(String(url))) return;
      let target: URL;
      try {
        target = new URL(url);
      } catch {
        return;
      }
      // Remember whose server this is BEFORE navigating: the certificate error
      // arrives during the load, and the handler below needs the identity to
      // find the fingerprint recorded for it.
      chosenServer = { origin: target.origin, ...server };
      // And keep THIS shell's own launch record in step. It is consulted
      // before the page is ever loaded (§ start: a returning user goes
      // straight to their server), and it was previously written only by the
      // fused CONNECT_TO_SERVER — which the page never uses. Left unwritten,
      // an install that changes server here would be sent back to the old one
      // on every relaunch, with the page's own record never consulted.
      chosenFrontEndHost = {
        protocol: target.protocol === 'http:' ? 'http' : 'https',
        ip: target.hostname,
        port: server.port,
        // Not announced over the bridge; nothing this record is used for reads
        // it (§ isServerAlive, § connectToServer, § CONNECTED_SERVER).
        clientVersion: '',
        hardwareId: server.hardwareId,
        isLocal: server.isLocal,
      };
      storePreviousServer(chosenFrontEndHost);
      discovery.stop();
      window.loadURL(url);
    }
  );

  ipcMain.handle(IPC_MESSAGES.DISCOVERED_SERVERS, async () => {
    const servers = discoveredServers;
    discoveredServers = [];
    return { servers };
  });

  // BARCODES
  const serialScanner = new Scanner(window);
  const keyboardScanner = new KeyboardScanner(window);
  const getCurrentScanner = () =>
    store.get(SCANNER_TYPE, 'usb_serial') == 'usb_serial'
      ? serialScanner
      : keyboardScanner;

  ipcMain.on(
    IPC_MESSAGES.SET_SCANNER_TYPE,
    (_event, scannerType: ScannerType) => store.set(SCANNER_TYPE, scannerType)
  );
  ipcMain.handle(IPC_MESSAGES.LINKED_BARCODE_SCANNER_DEVICE, async () =>
    getCurrentScanner().linkedScanner()
  );
  ipcMain.handle(IPC_MESSAGES.START_BARCODE_SCAN, () =>
    getCurrentScanner().start()
  );
  ipcMain.handle(IPC_MESSAGES.STOP_BARCODE_SCAN, () =>
    getCurrentScanner().stop()
  );
  ipcMain.handle(IPC_MESSAGES.START_DEVICE_SCAN, () =>
    serialScanner.scanDevices(window)
  );
  ipcMain.handle(IPC_MESSAGES.GET_SCANNER_TYPE, async () =>
    store.get(SCANNER_TYPE, 'usb_serial')
  );

  // not currently implemented in the desktop implementation
  ipcMain.on(IPC_MESSAGES.READ_LOG, () => 'Not implemented');
  ipcMain.handle(IPC_MESSAGES.SAVE_FILE, async () => ({
    success: false,
    error: 'Not implemented',
  }));

  discovery.on('serviceUp', function ({ type, port, addresses, txt }) {
    if (type?.name !== SERVICE_TYPE) return;
    if (typeof txt != 'object') return;

    const protocol = txt[PROTOCOL_KEY];
    const clientVersion = txt[CLIENT_VERSION_KEY];
    const hardwareId = txt[HARDWARE_ID_KEY];

    if (!isProtocol(protocol)) return;
    if (!(typeof clientVersion === 'string')) return;
    if (!(typeof hardwareId === 'string')) return;

    const ip = addresses.find(isV4Format);
    if (!ip) return;

    discoveredServers.push({
      port,
      protocol,
      ip,
      clientVersion: clientVersion || '',
      isLocal: ip === getIpAddress() || isLoopback(ip),
      hardwareId,
    });

    // Verbatim, for the new front end's page: no filtering, no locality
    // marking, no address rewriting — all of that is the page's
    // (frontend/src/discovery/discovery.ts § toFrontEndHost).
    announcements.push({
      ip,
      port,
      protocol,
      clientVersion: clientVersion || '',
      hardwareId,
    });
  });

  // Clear auth state when the window is closed
  // so the user must log in again on next launch.
  // This runs while the app is still fully alive, which is more reliable
  // than clearing during the will-quit phase.
  let isClosing = false;
  window.on('close', event => {
    if (!isClosing) {
      isClosing = true;
      event.preventDefault();
      session.defaultSession
        .clearStorageData({ storages: ['cookies'] })
        .finally(() => {
          window.destroy();
        });
    }
  });

  window.webContents.on(
    'did-fail-load',
    (_event, _errorCode, errorDescription, validatedURL) => {
      // not strictly necessary, done to prevent an infinite loop if the loadFile fails
      if (hasLoadingError) return;

      hasLoadingError = true;

      // Host duty (frontend/src/discovery/hostContract.ts, AC-DT4): a server
      // that answered the reachability check but then fails to serve its UI
      // must land back on app-owned content — the discovery page, with the
      // could-not-connect notice seeded and auto-connect off — never on
      // Chromium's error page. A failure on the PAGE's own origin is a
      // packaging fault (or, under ELECTRON_HOST, a dev server that is not
      // running) which a reload cannot fix, so that keeps the error screen
      // rather than reloading the page that just failed.
      const failedTheServedPage = validatedURL.startsWith(pageOrigin());
      if (discoveryPageUrl && !failedTheServedPage) {
        hasLoadingError = false;
        window.loadURL(
          buildStartUrl({ autoconnect: 'false', timedout: 'true' })
        );
        return;
      }

      window.loadURL(
        `${startUrl()}#/error?error=Failed to load URL ${validatedURL} with error: ${errorDescription}`
      );
    }
  );

  // The same duty for a load that REACHED its address and was answered with an
  // error, which did-fail-load never reports. An address can pass the
  // reachability check and still have no app on it — the likeliest is the
  // server's own discovery port, at port + 1, which answers 404 to everything
  // but a POSTed query. Landing there is otherwise a dead end: the error page
  // is the server's own content, so it carries no way back, and the address is
  // remembered, so the next launch goes straight there again. Any error status
  // counts; none of them is an app.
  //
  // Scoped to a server the discovery PAGE chose: the old front end's connect
  // path has error handling of its own and must not be yanked to a screen it
  // never asked for.
  window.webContents.on('did-navigate', (_event, url, httpResponseCode) => {
    if (!httpResponseCode || httpResponseCode < 400) return;
    if (!discoveryPageUrl) return;
    if (!chosenServer || !url.startsWith(chosenServer.origin)) return;
    console.error(
      `${url} answered ${httpResponseCode} — no app is served there`
    );
    window.loadURL(buildStartUrl({ autoconnect: 'false', timedout: 'true' }));
  });

  // Attempt to connect directly to a known server before loading any URL so the
  // discovery screen is never shown to returning users or standalone installs.
  // IPC handlers must all be registered above before this point.
  const serverToTry = isStandalone
    ? DEFAULT_LOCAL_SERVER
    : getStoredPreviousServer();

  if (serverToTry) {
    const result = await tryToConnectToServer(window, serverToTry);
    if (!result.success) {
      window.loadURL(buildStartUrl({ autoconnect: 'false' }));
    }
    // success: connectToServer already called window.loadURL(serverUrl)
  } else {
    // No reachable known server — show discovery
    window.loadURL(buildStartUrl(isStandalone ? { autoconnect: 'false' } : {}));
  }
};

const isLoopback = (ip: string) =>
  ip === '127.0.0.1' ||
  ip.toLowerCase() === 'localhost' ||
  ip.toLowerCase() === '::1';

app.on('ready', start);

app.on('window-all-closed', () => {
  app.quit();
});

process.on('uncaughtException', error => {
  // See comment below
  if (error.message.includes('[this.constructor.name] is not a constructor')) {
    return;
  }

  // When running the barcode scanner discovery on windows, you can get this error which we want to ignore
  if (error.message === 'could not read from HID device') return;

  // TODO bugsnag ?
  dialog.showErrorBox('Error', error.stack || error.message);

  // The following error sometime occurs, it's dnssd related, it doesn't stop or break discovery, electron catching it and displays in error message, it's ignored by above if condition

  /* Uncaught Exception:
      TypeError: e[this.constructor.name] is not a constructor
      at t.value (..open mSupply-darwin-arm64/open mSupply.app/Contents/Resources/app/.webpack/main/index.js:8:77453)
      at ..open mSupply-darwin-arm64/open mSupply.app/Contents/Resources/app/.webpack/main/index.js:8:49749
      at Array.reduce (<anonymous>)
      at t.value (..open mSupply-darwin-arm64/open mSupply.app/Contents/Resources/app/.webpack/main/index.js:8:49606)
      at t.value (..open mSupply-darwin-arm64/open mSupply.app/Contents/Resources/app/.webpack/main/index.js:8:49025)
      at ..open mSupply.app/Contents/Resources/app/.webpack/main/index.js:8:104855
      at Array.forEach (<anonymous>)
      at t.value (..open mSupply-darwin-arm64/open mSupply.app/Contents/Resources/app/.webpack/main/index.js:8:104807)
      at t.value (..open mSupply-darwin-arm64/open mSupply.app/Contents/Resources/app/.webpack/main/index.js:8:104661)
      at t.enter (..open mSupply-darwin-arm64/open mSupply.app/Contents/Resources/app/.webpack/main/index.js:8:99043)
 */
});

// One prompt per server and certificate, however many requests raise the
// error. `certificate-error` fires per REQUEST — the document, every script
// and stylesheet, and every GraphQL call each arrive separately — so awaiting
// a message box in the handler stacks a dialog per request, and a changed
// certificate left the user dismissing dozens of identical windows one at a
// time (#544).
//
// Concurrent events share the FIRST event's answer: they await the same
// promise and then resolve their own callback with it, because each event has
// its own callback and every one of them has to be answered. Keyed by server
// AND fingerprint, so accepting one changed certificate does not silently
// accept a different one later. The entry lives only while the prompt is in
// flight — once it settles the stored fingerprint has been updated, so later
// events take the matches-the-store path and never ask again.
const sharedCertificatePrompt = createSharedPrompt<boolean>();

const acceptChangedCertificate = (
  parent: BrowserWindow | null,
  identifier: string,
  fingerprint: string
): Promise<boolean> =>
  // Keyed by server AND fingerprint, so accepting one changed certificate does
  // not silently accept a different one later.
  sharedCertificatePrompt(`${identifier}:${fingerprint}`, async () => {
    const options: MessageBoxOptions = {
      type: 'warning',
      buttons: ['No', 'Yes'],
      title: 'SSL Error',
      message:
        'The security certificate on the server has changed!\r\n\r\nThis can happen when the server is reinstalled, so may be normal, but please check with your IT department if you are unsure.\r\n\r\nWould you like to accept the new certificate? ',
    };

    // Parented to the window that raised the error, so the prompt is modal to
    // the app instead of floating free of it.
    const { response } = parent
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options);
    const accepted = response === 1;

    // Both of these happen ONCE for the shared answer, not once per event.
    if (accepted) {
      store.set(identifier, fingerprint);
    } else {
      ipcMain.emit(IPC_MESSAGES.GO_BACK_TO_DISCOVERY);
    }
    return accepted;
  });

app.addListener(
  'certificate-error',
  async (event, errorWebContents, url, error, certificate, callback) => {
    // We are only handling self signed certificate errors
    if (
      error != 'net::ERR_CERT_INVALID' &&
      error != 'net::ERR_CERT_AUTHORITY_INVALID'
    ) {
      return callback(false);
    }

    // Ignore SSL checks in debug mode
    if (getDebugHost()) {
      event.preventDefault();
      return callback(true);
    }

    // Which server this is, from whichever front end chose it. The old front
    // end connects through the fused CONNECT_TO_SERVER, which records
    // connectedServer; the new front end's discovery page drives
    // probe -> record -> navigate itself and states the identity through
    // navigate instead (hostContract.ts § ConnectedServer). Both ship, so both
    // are honoured — and trust needs the identity, not the address, because
    // the fingerprint is recorded per server rather than per URL.
    const chosen =
      chosenServer && url.startsWith(chosenServer.origin) ? chosenServer : null;
    const connected =
      connectedServer && url.startsWith(frontEndHostUrl(connectedServer))
        ? connectedServer
        : null;

    // Default behaviour when this is neither
    if (!chosen && !connected) return callback(false);

    // Match SSL fingerprint for server stored in app data

    // Match by hardware id and port
    const server = chosen ?? connected;
    const identifier = `${server?.hardwareId}-${server?.port}`;
    let storedFingerprint = store.get(identifier, null);

    // If fingerprint does not exists for server add it
    if (!storedFingerprint) {
      storedFingerprint = certificate.fingerprint;
      store.set(identifier, storedFingerprint);
      // If fingerprint does not match
    } else if (storedFingerprint != certificate.fingerprint) {
      // Ask once for this certificate, however many requests raised the
      // error, then answer every one of them with that same decision. The
      // prompt itself stores the new fingerprint or returns to discovery.
      const accepted = await acceptChangedCertificate(
        BrowserWindow.fromWebContents(errorWebContents),
        identifier,
        certificate.fingerprint
      );
      if (!accepted) return callback(false);
    }

    // storedFingerprint did not exist or it matched certificate fingerprint
    event.preventDefault();
    return callback(true);
  }
);

function configureMenus(
  window: BrowserWindow,
  translations: Record<keyof typeof defaultTranslations, string>
) {
  const t = (key: keyof typeof defaultTranslations) => translations[key] || key;

  // add a context menu which shows when the user right clicks
  window.webContents.on('context-menu', (_event, params) => {
    // Electron _should_ localise based on the roles... alas, at least for mac os: https://github.com/electron/electron/issues/26231
    const template: Electron.MenuItemConstructorOptions[] = [
      { role: 'cut', label: t('cut') },
      { role: 'copy', label: t('copy') },
      { role: 'paste', label: t('paste') },
      { role: 'selectAll', label: t('select-all') },
      { type: 'separator' },
      { role: 'reload', label: t('reload') },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window, x: params.x, y: params.y });
  });

  const fileMenu: MenuItemConstructorOptions = {
    label: t('file'),
    submenu: [{ role: 'quit', label: t('quit') }],
  };

  const helpMenu: MenuItemConstructorOptions = {
    label: t('help'),
    role: 'help',
    submenu: [
      {
        label: t('documentation'),
        click: async () => {
          await shell.openExternal(
            'https://docs.msupply.foundation/docs/introduction/introduction/'
          );
        },
      },
      {
        label: t('clear-data'),
        click: () => {
          dialog
            .showMessageBox({
              type: 'question',
              title: t('confirmation'),
              message: t('clear-data-confirm-message'),
              buttons: [t('yes'), t('no')],
            })
            .then(result => {
              // Bail if the user pressed "No" or escaped (ESC) from the dialog box
              if (result.response !== 0) {
                return;
              }
              store.clear();
              const userDataPath = app.getPath('userData');
              fs.removeSync(userDataPath);

              app.quit();
            });
        },
      },
      {
        label: t('developer-tools'),
        click: () => {
          const contents = webContents.getFocusedWebContents();
          if (contents) {
            contents.openDevTools();
          }
        },
      },
      { role: 'about', label: t('about-oms') },
    ],
  };

  const menu = Menu.buildFromTemplate([fileMenu, helpMenu]);

  Menu.setApplicationMenu(menu);
}
