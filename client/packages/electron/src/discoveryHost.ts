// This shell's half of the discovery host contract
// (frontend/src/discovery/hostContract.ts). The new front end's discovery page
// is the one screen no server can serve — it runs before a server is chosen —
// so this shell bundles it and answers the five primitives the page drives.
//
// Everything here is a FACT or a native capability. No policy: which
// announcements are listable, which server is this machine's own, what is
// remembered and the probe -> record -> navigate ordering all belong to the
// page (frontend/src/discovery/discovery.ts), so this shell and the Android
// one cannot drift apart on behaviour the way the hand-written screens did.
import { execSync } from 'child_process';
import fs from 'fs';
import http from 'http';
import https from 'https';
import os from 'os';
import path from 'path';

// Fixed, and deliberately not the new frontend's own shell port (8317): both
// can be installed during the transition, and each keeps its own origin — and
// with it the page's localStorage, where the remembered server and the chosen
// language live.
export const DISCOVERY_PAGE_PORT = 8318;
export const DISCOVERY_PAGE_ORIGIN = `http://127.0.0.1:${DISCOVERY_PAGE_PORT}`;

const PAGE = 'discovery.html';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

/** Where the page's files are.
 *
 * Packaged: `discovery-page/`, copied in as an extraResource by
 * forge.config.ts — the page's exact transitive slice of the new front end's
 * build, pruned by frontend/scripts/prune-discovery-dist.mjs, so the installer
 * carries the page and not the whole product.
 *
 * Unpackaged (`yarn start`): the repo's own frontend/dist, of which the page's
 * files are a subset — no prune needed to develop against it. */
const pageDir = (): string => {
  const packaged = path.join(process.resourcesPath ?? '', 'discovery-page');
  if (fs.existsSync(path.join(packaged, PAGE))) return packaged;
  return path.join(__dirname, '..', '..', '..', '..', '..', 'frontend', 'dist');
};

/** Serve the page over loopback HTTP, not file:// — the page hands the server
 * its own address so the login screen can offer a way back (AC-DT23), and that
 * address has to be http(s): the page's own validation drops anything else,
 * and a served page could not navigate to file:// even if it did. */
export const servePage = (): Promise<string> =>
  new Promise((resolve, reject) => {
    const dir = pageDir();
    const fallback = path.join(dir, PAGE);
    if (!fs.existsSync(fallback)) {
      reject(
        new Error(
          `${fallback} does not exist — build the new front end (cd frontend && pnpm build) or package with the discovery-page resource.`
        )
      );
      return;
    }
    const server = http.createServer((request, response) => {
      let file = fallback;
      try {
        const urlPath = decodeURIComponent(
          new URL(request.url ?? '/', 'http://x').pathname
        );
        file = path.normalize(path.join(dir, urlPath));
      } catch {
        // A malformed percent-sequence is just a bad request. Anything on this
        // machine can reach the loopback port, and an uncaught URIError here
        // would take the whole main process down.
      }
      // No traversal out of the bundle; a directory gets the page itself.
      if (!file.startsWith(dir + path.sep)) file = fallback;
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = fallback;
      }
      response.setHeader(
        'content-type',
        MIME[path.extname(file)] ?? 'application/octet-stream'
      );
      const stream = fs.createReadStream(file);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    });
    server.once('error', reject);
    // Loopback only: this server exists for this window, not for the network.
    server.listen(DISCOVERY_PAGE_PORT, '127.0.0.1', () =>
      resolve(`${DISCOVERY_PAGE_ORIGIN}/${PAGE}`)
    );
  });

/** This machine's id, read from the SAME OS sources the server's announced
 * `hardware_id` comes from (the machine_uid crate: IOPlatformUUID on macOS,
 * /var/lib/dbus/machine-id on Linux, the MachineGuid registry value on
 * Windows). That is what lets the page mark this machine's own server by
 * comparing ids rather than addresses — an address compare, which this shell
 * used to do, is defeated by any machine with more than one interface, because
 * its own announcement can resolve to any of them.
 *
 * '' when unreadable: the this-machine mark then simply never shows. */
let cachedMachineId: string | undefined;
export const machineId = (): string => {
  if (cachedMachineId !== undefined) return cachedMachineId;
  const read = (file: string): string => {
    try {
      return fs.readFileSync(file, 'utf8').trim();
    } catch {
      return '';
    }
  };
  try {
    if (process.platform === 'darwin') {
      const out = execSync('ioreg -rd1 -c IOPlatformExpertDevice', {
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString();
      cachedMachineId = /"IOPlatformUUID"\s*=\s*"([^"]+)"/.exec(out)?.[1] ?? '';
    } else if (process.platform === 'win32') {
      const out = execSync(
        'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
        { stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString();
      cachedMachineId = /MachineGuid\s+REG_SZ\s+(\S+)/.exec(out)?.[1] ?? '';
    } else {
      cachedMachineId =
        read('/var/lib/dbus/machine-id') || read('/etc/machine-id');
    }
  } catch {
    cachedMachineId = '';
  }
  return cachedMachineId;
};

/** Addresses OTHER machines can reach this one at — never loopback or
 * link-local. The page uses them to show its own server at an address it can
 * share (AC-DT22). May be empty (no network). */
export const lanAddresses = (): string[] =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i?.address ?? '')
    .filter(Boolean);

/** The bounded does-anything-answer check (AC-DT12). Host-side by necessity,
 * not convenience: a release server's CORS rejects unknown cross-origins and a
 * self-signed certificate needs host-side trust, so the page's own fetch
 * cannot do this. Any HTTP answer is true; a refusal or the timeout elapsing
 * is false; it never rejects. The timeout is the page's, clamped here only
 * against a nonsense value crossing the bridge. */
export const answers = (target: string, timeoutMs: number): Promise<boolean> =>
  new Promise(resolve => {
    if (!/^https?:\/\//.test(target)) {
      resolve(false);
      return;
    }
    const timeout = Math.min(Math.max(Number(timeoutMs) || 5000, 500), 30000);
    const lib = target.startsWith('https') ? https : http;
    try {
      const request = lib.get(
        target,
        { rejectUnauthorized: false, timeout },
        response => {
          response.resume();
          resolve(true);
        }
      );
      request.on('timeout', () => request.destroy(new Error('timeout')));
      request.on('error', () => resolve(false));
    } catch {
      // The scheme test above is not a parse: a manually entered
      // `http://a b` passes it and throws ERR_INVALID_URL right here, and the
      // contract says probe never rejects.
      resolve(false);
    }
  });
