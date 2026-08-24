// The desktop host bridge (spec/desktop): the typed surface the bundled
// discovery page drives on the shell that hosts it. Discovery runs before any
// server is chosen, so the page cannot be served by a server — the shell on
// this machine bundles it (spec/desktop/README.md § How it fits together) and
// injects this API before the page's scripts run.
//
// The shape is wire-compatible with the CURRENT desktop shell's preload
// (open-msupply client/packages/electron/src/preload.ts exposes exactly this
// global), so that shell can host this page unmodified. Only the subset the
// discovery page uses is typed here — the shell's other capabilities (barcode
// scanning, file saving, log reading) belong to the host capability bridge
// (#977), not to this screen.
//
// What the host owns vs what the page owns:
// - The host browses mDNS announcements (`_omsupply._tcp`), filters incomplete
//   ones, marks a server on this machine (`isLocal`) and rewrites its loopback
//   address to the machine's network address in client mode
//   (spec/desktop/behaviours.md § address rewriting, AC-DT22) — the page only
//   renders what `discoveredServers()` returns (plus a defensive completeness
//   filter, AC-DT7).
// - `connectToServer` checks the server answers BEFORE navigating away; a
//   failed check resolves `{ success: false }` and the window stays on the
//   page (AC-DT12).
// - The page owns the remembered previous server (src/desktop/discovery.ts §
//   previous server) and the decision to auto-connect (AC-DT1, AC-DT13–15).

/** Matches server/server/src/discovery.rs (FrontEndHost) — the announcement's
 * identity attributes plus the host-side `isLocal` marking. */
export type FrontEndHost = {
  protocol: 'http' | 'https';
  port: number;
  ip: string;
  // From the announcement's TXT record.
  clientVersion: string;
  hardwareId: string;
  // Set by the host: this server's address belongs to this machine (AC-DT5).
  isLocal: boolean;
  // Optional path to land on after connecting (the page passes 'login').
  path?: string;
};

export type ConnectionResult = { success: boolean; error?: string };

export type DesktopHostApi = {
  /** Start (or restart) browsing announcements. Fire-and-forget; results are
   * polled via discoveredServers(). */
  startServerDiscovery: () => void;
  /** Everything found since discovery started. Accumulation and dedup are the
   * page's job (discovery.ts § mergeServers). */
  discoveredServers: () => Promise<{ servers: FrontEndHost[] }>;
  /** Check the server answers, and if so navigate this window to it. Resolves
   * BEFORE any navigation, so a success still gives the page a beat to record
   * the choice; a failure leaves the window here. */
  connectToServer: (server: FrontEndHost) => Promise<ConnectionResult>;
  /** The server this shell last navigated to, if any — display-only. */
  connectedServer: () => Promise<FrontEndHost | null>;
  /** Leave the connected server and return to this page (AC-DT16); the host
   * appends ?autoconnect=false so the page does not bounce straight back. */
  goBackToDiscovery: () => void;
};

declare global {
  interface Window {
    electronNativeAPI?: DesktopHostApi;
  }
}

// A function, not a module-scope const (same reasoning as src/platform/index):
// costs nothing and stays correct if a shell ever injects the bridge later
// than module evaluation. The typeof guard keeps it safe under vitest's node
// environment.
export const getDesktopHost = (): DesktopHostApi | undefined =>
  typeof window === 'undefined' ? undefined : window.electronNativeAPI;
