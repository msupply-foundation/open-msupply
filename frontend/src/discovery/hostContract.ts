// The discovery host contract (spec/desktop): the surface a shell exposes to
// the bundled discovery page. Discovery runs before any server is chosen, so
// the page cannot be served by a server — the shell on this machine bundles
// it (spec/desktop/README.md § How it fits together) and answers this API.
//
// Hosts provide PRIMITIVE FACTS and the capabilities only a shell can have
// (mDNS browsing, a trust-all reachability probe, window navigation). ALL
// policy lives in shared TS (./discovery.ts): which announcements are
// listable, which server is this machine's own and how its address is
// rewritten, the probe timeout, what is remembered, and the probe → record →
// navigate ordering of a connection. A host that computes policy is a bug:
// two hosts computing it is how the implementations drift apart.
//
// Beyond these methods a host owes three NON-CALLABLE duties, keyed to the
// spec (implemented in desktop/main.cjs and android/../MainActivity.java —
// see src/discovery/README.md § host duties):
// - A failed main-frame load of a CONNECTED server's UI must land back on
//   this page with `?autoconnect=false&timedout=true` (plus `&standalone=true`
//   if launched standalone), never on shell/browser error content (AC-DT4,
//   seeding the could-not-connect notice). A failure of the discovery page's
//   OWN origin is a packaging fault, not a server failure — surface a native
//   error instead of reloading in a loop.
// - The session ends with the app: closing the shell clears session cookies
//   (AC-DT18).
// - Where the platform has a back gesture (Android), `navigate` also pins the
//   back stack so hardware-back cannot re-enter this page without its flags
//   and bounce straight back to the server just left (AC-DT16).
//
// This contract replaces the legacy shell's `window.electronNativeAPI`
// (open-msupply client/packages/electron/src/preload.ts). Wire compatibility
// with that shell was deliberately retired: its fused check-and-navigate
// `connectToServer` drops the login hand-off path (AC-DT23/24), never seeds
// `?timedout=true`, and marks locality by address compare — three of the
// divergences this contract exists to make unrepresentable.

export type HostPlatform = 'electron' | 'android';

export type HostInfo = {
  platform: HostPlatform;
  /** This machine's id, in the SAME derivation as the local server's
   * announced hardware_id (server/server/src/lib.rs: machine_uid) — the
   * machine GUID on desktop, ANDROID_ID on Android. '' when unknowable; the
   * this-machine mark then simply never shows (./discovery.ts §
   * isLocalServer). */
  hardwareId: string;
  /** IPv4 addresses OTHER machines can reach this machine at — never
   * loopback or link-local. Preference order; may be empty (no network). */
  lanAddresses: string[];
};

/** One resolved mDNS announcement (`_omsupply._tcp`), verbatim: the resolved
 * address and port plus the TXT record's identity attributes
 * (server/server/src/discovery.rs). A missing TXT key is ''. No filtering,
 * no locality marking, no address rewriting — the page's policy does all of
 * that (./discovery.ts § toFrontEndHost). */
export type RawAnnouncement = {
  ip: string;
  port: number;
  /** TXT `protocol`. */
  protocol: string;
  /** TXT `client_version`. */
  clientVersion: string;
  /** TXT `hardware_id`. */
  hardwareId: string;
};

export type DiscoveryHostApi = {
  /** Static facts about this machine. Re-read per search — the network (and
   * with it lanAddresses) can change while the page is open. Never rejects. */
  hostInfo: () => Promise<HostInfo>;
  /** Start (or restart) browsing announcements, clearing prior results.
   * Fire-and-forget; results are polled via announcements(). */
  startDiscovery: () => void;
  /** Everything resolved since discovery last started, raw and unfiltered.
   * Accumulation and dedup are the page's job (./discovery.ts §
   * mergeServers). */
  announcements: () => Promise<{ announcements: RawAnnouncement[] }>;
  /** The bounded does-anything-answer check (AC-DT12). Host-side by
   * necessity, not convenience: the release server's CORS rejects unknown
   * cross-origins and a self-signed certificate needs host-side trust
   * (spec/desktop § connection trust — spike posture), so the page's own
   * fetch cannot do this. Any HTTP answer is true; refusal or the timeout
   * elapsing is false; never rejects. The timeout is the caller's
   * (./discovery.ts § ANSWER_CHECK_TIMEOUT_MS) so the constant exists once. */
  probe: (url: string, timeoutMs: number) => Promise<boolean>;
  /** Plain navigation of this window/WebView to the URL. The page persists
   * everything it needs BEFORE calling this (./discovery.ts §
   * connectToServer), so the host adds no delay and resolves nothing. */
  navigate: (url: string) => void;
};

declare global {
  interface Window {
    /** Injected by shells that can inject (the Electron preload; the dev
     * mock). The Android shell answers through a Capacitor plugin instead —
     * both are resolved by getDiscoveryHost()
     * (src/platform/discoveryHost.ts). */
    discoveryHostApi?: DiscoveryHostApi;
  }
}
