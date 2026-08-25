// Server discovery logic (spec/desktop/behaviours.md § server discovery /
// § server selection) — everything the page decides, kept pure so the
// acceptance-relevant behaviour is unit-testable without a shell: which
// announcements are listable, how the list accumulates, what a manual entry
// parses to, which server (if any) launch auto-connects to, and what is
// remembered between launches.
import type { FrontEndHost } from './hostBridge';

// The current shell's cadence (open-msupply useNativeClient/types.ts): poll
// found servers every 2 s; if nothing has landed after 7 s the bounded wait
// elapses and the page states no server was found (AC-DT9).
export const DISCOVERY_POLL_MS = 2000;
export const DISCOVERY_TIMEOUT_MS = 7000;

// A standalone install's own server: always reached at loopback, which
// survives the machine moving between networks (spec/desktop/behaviours.md §
// address rewriting, AC-DT21). Port 8000 is the server's default.
export const STANDALONE_LOCAL_SERVER: FrontEndHost = {
  protocol: 'https',
  port: 8000,
  ip: '127.0.0.1',
  clientVersion: '',
  hardwareId: '',
  isLocal: true,
};

// One entry per server (AC-DT8): the announcement's hardware id, plus port so
// several instances on one machine stay distinguishable (matches the current
// app's matchUniqueServer).
export const serverKey = (server: FrontEndHost): string =>
  `${server.hardwareId}:${server.port}`;

// AC-DT7: an announcement missing any identity attribute, or offering no
// address, is ignored rather than listed as an unusable entry. The host
// filters too — this is the page's defensive copy of the same rule, so a
// hole in one layer doesn't put an unconnectable row in front of the user.
export const isCompleteAnnouncement = (server: FrontEndHost): boolean =>
  (server.protocol === 'http' || server.protocol === 'https') &&
  server.ip !== '' &&
  Number.isInteger(server.port) &&
  server.port > 0 &&
  server.hardwareId !== '' &&
  server.clientVersion !== '';

// The list accumulates as announcements arrive and never shows the same
// server twice (AC-DT8). Returns `current` ITSELF when nothing new arrived,
// so a poll that found nothing fresh publishes no change (kdd/
// solid-reactivity-pitfalls §16 — identity churn re-runs every consumer).
export const mergeServers = (
  current: FrontEndHost[],
  incoming: FrontEndHost[]
): FrontEndHost[] => {
  const seen = new Set(current.map(serverKey));
  const fresh: FrontEndHost[] = [];
  for (const server of incoming) {
    if (!isCompleteAnnouncement(server)) continue;
    const key = serverKey(server);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(server);
  }
  return fresh.length === 0 ? current : [...current, ...fresh];
};

// Display form of a server's address: scheme + host, default ports elided —
// what the current app shows (frontEndHostDisplay) and what pre-fills manual
// entry.
export const frontEndHostDisplay = ({
  protocol,
  ip,
  port,
}: FrontEndHost): string => {
  const defaultPort = protocol === 'https' ? 443 : 80;
  return port === defaultPort || port === 0
    ? `${protocol}://${ip}`
    : `${protocol}://${ip}:${port}`;
};

// A directly entered server (spec § server selection: "enters one directly as
// a URL"). Undefined = not a usable server URL, shown as a field error rather
// than attempted. The caller supplies the hardware id (a fresh uuid — the
// machine's real one is unknowable from a URL, and the id only needs to key
// the entry).
export const parseManualServer = (
  value: string,
  hardwareId: string
): FrontEndHost | undefined => {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }
  const protocol = url.protocol.replace(':', '');
  if (protocol !== 'http' && protocol !== 'https') return undefined;
  if (url.hostname === '') return undefined;
  return {
    protocol,
    ip: url.hostname,
    port:
      url.port === '' ? (protocol === 'https' ? 443 : 80) : Number(url.port),
    clientVersion: 'unspecified',
    hardwareId,
    isLocal: false,
    path: 'login',
  };
};

// How the shell launched this page, carried as query parameters (the same
// contract the current shell's discovery screen reads):
// - autoconnect=false — the user chose to leave a server and return here
//   (AC-DT16), or the shell already failed its own launch check; either way
//   the page must not immediately reconnect.
// - timedout=true — the shell's bounded launch check on the remembered server
//   elapsed (AC-DT2): tell the user, and do not reconnect to it.
// - standalone=true — this install carries its own server (AC-DT20): connect
//   to it without asking, and never offer a choice.
export type DiscoveryFlags = {
  autoconnect: boolean;
  timedout: boolean;
  standalone: boolean;
};

export const parseDiscoveryFlags = (search: string): DiscoveryFlags => {
  const params = new URLSearchParams(search);
  return {
    autoconnect: params.get('autoconnect') !== 'false',
    timedout: params.get('timedout') === 'true',
    standalone: params.get('standalone') === 'true',
  };
};

// Which server (if any) this page-load connects to without being asked.
// - A standalone install always uses its own server (AC-DT20) — a remembered
//   record never redirects it elsewhere.
// - Otherwise the remembered previous server (AC-DT1) — the LAST successful
//   connection, chosen or manually entered alike (AC-DT13–15).
// - Never after a failed launch check (timedout) or an explicit return to
//   discovery (autoconnect=false): reconnecting immediately to the server the
//   user just left, or that just failed, is exactly what AC-DT2/AC-DT16
//   forbid.
export const autoconnectTarget = (
  flags: DiscoveryFlags,
  previous: FrontEndHost | undefined
): FrontEndHost | undefined => {
  if (!flags.autoconnect || flags.timedout) return undefined;
  if (flags.standalone) return STANDALONE_LOCAL_SERVER;
  return previous;
};

// Where a landing screen's "change server" link sends the user: back to THIS
// page, told not to bounce straight back to the server just left (AC-DT16) —
// and told the install's mode. standalone=true is a launch fact, not session
// state: without it the way back would land a standalone install in client
// mode and offer the chooser AC-DT20 forbids. timedout is deliberately NOT
// carried — it described the launch that brought the user here, not the
// return.
export const discoveryReturnAddress = (
  { origin, pathname }: { origin: string; pathname: string },
  flags: DiscoveryFlags
): string =>
  `${origin}${pathname}?autoconnect=false` +
  (flags.standalone ? '&standalone=true' : '');

// Standalone with no attempt to make this page-load (the user chose to come
// back, or the shell's own launch check already elapsed): the failure state
// is seeded so the page states it with a retry, symmetric with client mode's
// ?timedout seeding of the could-not-connect notice. Unseeded, the standalone
// arm would sit on a "connecting" spinner nothing is driving (spec §
// standalone auto-connection: say so, don't present a choice — and AC-DT9's
// bounded-wait principle: never an unbounded spinner).
export const standaloneSeededFailure = (flags: DiscoveryFlags): boolean =>
  flags.standalone && (!flags.autoconnect || flags.timedout);

// --- Previous server ------------------------------------------------------
// The remembered server is the last one SUCCESSFULLY connected to (spec §
// server selection) — recorded only after the host's answer check passes,
// never at the moment of choice. The current shell records at choice time, a
// known gap its spec capture says not to reproduce (spec/desktop/README.md §
// Status — "a server that never successfully connected can prefill manual
// entry and be auto-attempted").
//
// The storage key matches the current shell's discovery screen (its renderer
// falls back to localStorage under `preference/<key>` outside Capacitor), so
// an upgraded install keeps its remembered server.

const PREVIOUS_SERVER_KEY = 'preference/previousServer';

// Storage injectable for tests (vitest runs in node, which has no
// localStorage); never throws — a blocked or absent storage just means
// nothing is remembered.
const defaultStorage = (): Storage | undefined =>
  typeof localStorage === 'undefined' ? undefined : localStorage;

export const readPreviousServer = (
  storage = defaultStorage()
): FrontEndHost | undefined => {
  try {
    const raw = storage?.getItem(PREVIOUS_SERVER_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const host = parsed as FrontEndHost;
    // A record another build wrote could hold anything; only a usable server
    // is worth auto-attempting.
    return isCompleteAnnouncement({ ...host, isLocal: host.isLocal === true })
      ? host
      : undefined;
  } catch {
    return undefined;
  }
};

export const recordPreviousServer = (
  server: FrontEndHost,
  storage = defaultStorage()
): void => {
  try {
    storage?.setItem(PREVIOUS_SERVER_KEY, JSON.stringify(server));
  } catch {
    // Blocked storage only costs the next launch its auto-connect.
  }
};
