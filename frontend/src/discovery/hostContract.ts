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
  /** What the LEGACY shell saved where this page cannot look — so that an
   * upgraded install does not re-pick answers it has already given.
   *
   * "Where this page cannot look" is per shell, and neither case is
   * localStorage as this page sees it:
   *
   * - the old ANDROID shell kept preferences in the device's native store
   *   (client/packages/common/src/hooks/useNativeClient/helpers.ts), so an
   *   upgraded tablet's remembered server and chosen mode are both invisible;
   * - the old ELECTRON shell kept the remembered server in its own main-process
   *   store, and its renderer's `preference/*` entries sit under a different
   *   origin from the loopback one this page is served on.
   *
   * Facts, verbatim and unvalidated — a host reads the raw stored strings and
   * says what it found; the page decides whether to adopt them
   * (./discovery.ts § adoptLegacyPreferences) and its own readers reject
   * anything unusable. Omitted entirely by a host with no legacy store to
   * read, which is both of the new shells. */
  legacy?: {
    /** The legacy `mode` preference as stored (JSON-encoded 'client' |
     * 'server' | 'none'). */
    mode?: string;
    /** The legacy `previousServer` record as stored (JSON). */
    previousServer?: string;
  };
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

/** Who the window is being navigated to, for the host's certificate trust
 * (see `navigate` below). Deliberately narrower than the page's own
 * FrontEndHost: only what a trust decision needs, so it stays obvious why
 * each field crosses the bridge. The URL carries the rest. */
export type ConnectedServer = {
  /** The server's announced `hardware_id` — with `port`, the key both legacy
   * shells store certificate fingerprints under, so an upgraded install still
   * recognises a server it already trusted.
   *
   * Not always an announced id. A MANUALLY entered server was never
   * announced, so the page mints one per attempt purely to key the list entry
   * (./discovery.ts § parseManualServer) and that is what arrives here — as it
   * did from the legacy screen, which minted one for the same reason
   * (client/packages/common/src/ui/discovery/ManualServerConfig.tsx). A host
   * therefore records a fresh fingerprint for each freshly typed server and
   * compares nothing; only once such a server is REMEMBERED does its key hold
   * still. Same behaviour as the shipping app, stated here because the key
   * looks stabler than it is. `''` for this install's own standalone server,
   * which is proved by `isLocal` and never keyed. */
  hardwareId: string;
  /** The server's port, the other half of that key. Passed rather than parsed
   * back out of the URL, where a default port is not written down. */
  port: number;
  /** This machine's own server (the page's hardware-id compare,
   * ./discovery.ts § isLocalServer). Picks exact-certificate proof over
   * trust-on-first-use — and means the host never has to recognise its own
   * server by address, which loopback-vs-hostname spellings make unreliable. */
  isLocal: boolean;
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
  /** Navigate this window/WebView to the URL, told which server it belongs
   * to. The page persists everything it needs BEFORE calling this
   * (./discovery.ts § connectToServer), so the host adds no delay and
   * resolves nothing.
   *
   * `server` is here because certificate trust is a host capability that
   * cannot be done blind. open-mSupply servers are self-signed, so every
   * connection raises a certificate error the shell — not the page — has to
   * answer, and the answer depends on WHICH server this is: this machine's
   * own can be proved exactly against the certificate it wrote to disk, while
   * anyone else's can only be trusted on first use, keyed by identity
   * (spec/android § connection trust, AC-AN8–11). A host handed only a URL
   * cannot tell those apart and cannot find what it recorded last time —
   * both legacy shells key their fingerprint store on hardware id and port
   * (spec/desktop/README.md § Status).
   *
   * This is still not policy: the page decides which server, whether it is
   * this machine's, and when to go. The host is told what it needs to do the
   * one job only it can do. */
  navigate: (url: string, server: ConnectedServer) => void;
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
