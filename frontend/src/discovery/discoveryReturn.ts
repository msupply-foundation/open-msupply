// The discovery hand-off's return path (spec/desktop § server selection:
// "the user MUST be able to leave the current server and return to
// discovery", AC-DT16).
//
// The screen the hand-off LANDS on is the connected server's app, which may
// run under any shell or none and can't assume a host exists — so the way
// back is not a host capability at all. The discovery page names its own
// address in the hand-off URL: it connects to
// `login?discovery-return=<discovery page URL>`, and the pre-session screens
// (login, initialisation) that see the parameter offer "Change server" as a
// plain navigation back. The return URL carries `autoconnect=false`, so
// arriving back never bounces straight to the server just left (AC-DT16).
//
// Split from ./discovery.ts because BOTH pages read it: the discovery page
// writes the parameter, the app's login/initialisation screens read it — and
// this leaf (no imports) is the only discovery module in the served app's
// graph (kdd/bundle-size-by-pr.md).

export const DISCOVERY_RETURN_PARAM = 'discovery-return';

/** The path the discovery page connects with: the login screen, carrying the
 * way back — and the active language, as the `?lng=` parameter the app's
 * locale detection already honours for first paint (intl/detectLocale.ts).
 * The hand-off crosses origins, so the language chosen on discovery cannot
 * reach the served app any other way. */
export const handoffPath = (returnUrl: string, lng?: string): string =>
  `login?${DISCOVERY_RETURN_PARAM}=${encodeURIComponent(returnUrl)}` +
  (lng ? `&lng=${encodeURIComponent(lng)}` : '');

/** The return URL with the CURRENT language set — the way back carries the
 * language too (symmetric with handoffPath: the user may have changed it on
 * the landing screen, and the discovery page is another origin). */
export const withLng = (url: string, lng: string): string => {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('lng', lng);
    return parsed.href;
  } catch {
    return url;
  }
};

// Every real host serves this page from loopback: the Electron shell over
// its fixed 127.0.0.1 port (desktop/main.cjs), the Android shell from
// Capacitor's local origin (https://localhost), the dev server from
// localhost. So the way back is always a loopback address, and saying so is
// what keeps the parameter from being useful to anyone else.
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

/**
 * The validated return URL in a landing screen's query string, or undefined.
 *
 * A query parameter is attacker-writable in a shared link and this value
 * becomes an anchor's href on the server's own login screen, so it is
 * validated twice over: http(s) only, dropping anything that could run
 * script (javascript:) or leave the web (custom schemes); and loopback only,
 * so a crafted link cannot dress an outside site up as this app's "change
 * server" affordance. A hand-off from a real shell always passes both.
 */
export const discoveryReturnUrl = (search: string): string | undefined => {
  const value = new URLSearchParams(search).get(DISCOVERY_RETURN_PARAM);
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return LOOPBACK_HOSTS.includes(url.hostname.toLowerCase())
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
};

// --- Surviving the served app's own navigation -----------------------------

const RETURN_STORAGE_KEY = `preference/${DISCOVERY_RETURN_PARAM}`;

// Session-scoped on purpose: the way back belongs to the connection this
// window is currently on, so it should survive the app's own navigation and a
// reload, and die with the window rather than outliving the server it points
// away from. Injectable for tests (node has no sessionStorage); never throws.
const defaultSessionStorage = (): Storage | undefined =>
  typeof sessionStorage === 'undefined' ? undefined : sessionStorage;

/**
 * The hand-off's return address for as long as this window stays with the
 * server it arrived at.
 *
 * `discoveryReturnUrl` above only sees it while it is still on the URL, and
 * that is just the moment of arrival: the served app then routes within
 * itself, and a sign-out renders login back over whatever route the user was
 * on ([spec/startup] AC-SF2), by which point the query is long gone. So the
 * way back was offered on first boot and had quietly vanished by the time
 * anyone signed out and actually wanted it.
 *
 * Remembered on arrival, and re-validated on the way out through the same
 * check as the URL — one validation path, so a stored value is no more
 * trusted than a fresh one.
 */
export const rememberedDiscoveryReturn = (
  search: string,
  storage = defaultSessionStorage()
): string | undefined => {
  const arriving = discoveryReturnUrl(search);
  if (arriving) {
    try {
      storage?.setItem(RETURN_STORAGE_KEY, arriving);
    } catch {
      // Blocked storage only costs the link once the query is gone.
    }
    return arriving;
  }
  try {
    const stored = storage?.getItem(RETURN_STORAGE_KEY);
    if (!stored) return undefined;
    return discoveryReturnUrl(
      `?${DISCOVERY_RETURN_PARAM}=${encodeURIComponent(stored)}`
    );
  } catch {
    return undefined;
  }
};
