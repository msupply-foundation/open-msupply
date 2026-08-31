// Server discovery logic (spec/desktop/behaviours.md § server discovery /
// § server selection) — everything the page decides, kept pure so the
// acceptance-relevant behaviour is unit-testable without a shell: which
// announcements are listable, which server is this machine's own and at what
// address it is shown, how the list accumulates, what a manual entry parses
// to, which server (if any) launch auto-connects to, what is remembered
// between launches, and the ordering of a connection attempt. Hosts only
// supply facts and inherently-native capabilities (./hostContract.ts).
import type {
  ConnectedServer,
  DiscoveryHostApi,
  HostInfo,
  RawAnnouncement,
} from './hostContract';

// The current shell's cadence (open-msupply useNativeClient/types.ts): poll
// found servers every 2 s; if nothing has landed after 7 s the bounded wait
// elapses and the page states no server was found (AC-DT9).
export const DISCOVERY_POLL_MS = 2000;
export const DISCOVERY_TIMEOUT_MS = 7000;

// The bounded answer check's budget (AC-DT12) — the page's constant, passed
// to every host's probe(), so no host carries its own copy to drift.
export const ANSWER_CHECK_TIMEOUT_MS = 5000;

/** A listable server as the page computes it from a raw announcement plus
 * this machine's facts (§ toFrontEndHost below): identity attributes, the
 * this-machine marking, and the address the server is reached at. */
export type FrontEndHost = {
  protocol: 'http' | 'https';
  port: number;
  ip: string;
  // From the announcement's TXT record.
  clientVersion: string;
  hardwareId: string;
  // This server runs on this machine (AC-DT5) — a hardware-id match,
  // § isLocalServer below.
  isLocal: boolean;
};

// --- Announcement → listable server ----------------------------------------

// ONE locality predicate (spec/android § server discovery, AC-DT5): a server
// is this machine's own iff its announced hardware_id is this machine's —
// never an address compare, which any multi-interface machine defeats (its
// own announcement may resolve to any of its interfaces). Case-insensitive:
// the server's machine_uid and a shell's own reading of the same OS id can
// differ in casing. A host that cannot know its id ('' — the mark just never
// shows) or an announcement without one never matches.
export const isLocalServer = (
  announcement: RawAnnouncement,
  info: HostInfo
): boolean =>
  info.hardwareId !== '' &&
  announcement.hardwareId !== '' &&
  announcement.hardwareId.toLowerCase() === info.hardwareId.toLowerCase();

// ONE rewrite predicate (spec/desktop/behaviours.md § address rewriting,
// AC-DT22): this machine's own server must be shown — and remembered, and
// handed off — at an address OTHER machines can reach, so rewrite whenever
// the resolved address isn't already one of them. That covers both hosts'
// old special cases (a loopback resolution on desktop, an arbitrary-interface
// NsdManager resolution on Android) with no per-host code. With no reachable
// address to offer (offline), the resolved one is kept rather than nothing.
// A standalone install never passes through here — it connects to
// STANDALONE_LOCAL_SERVER at loopback deliberately (AC-DT21).
export const toFrontEndHost = (
  announcement: RawAnnouncement,
  info: HostInfo
): FrontEndHost => {
  const isLocal = isLocalServer(announcement, info);
  const ip =
    isLocal && !info.lanAddresses.includes(announcement.ip)
      ? (info.lanAddresses[0] ?? announcement.ip)
      : announcement.ip;
  return {
    // Completeness (isCompleteAnnouncement) rejects anything but http(s);
    // this narrowing only satisfies the type on the way there.
    protocol: announcement.protocol === 'http' ? 'http' : 'https',
    port: announcement.port,
    ip,
    clientVersion: announcement.clientVersion,
    hardwareId: announcement.hardwareId,
    isLocal,
  };
};

// --- Server URLs (single source — the page's, the mock's and every host's
// probe/navigate all receive these; no host builds its own) -----------------

export const serverUrl = ({ protocol, ip, port }: FrontEndHost): string =>
  `${protocol}://${ip}:${port}`;

/** What the answer check asks: does anything answer HTTP where the GraphQL
 * endpoint should be (AC-DT12). */
export const probeUrl = (server: FrontEndHost): string =>
  `${serverUrl(server)}/graphql`;

/** What the host is told about the server it is being pointed at, for its
 * certificate trust (hostContract.ts § ConnectedServer). Derived here, from
 * the same record the page decided everything else from, so no host ever
 * works out for itself whose server this is. */
export const connectedServer = ({
  hardwareId,
  port,
  isLocal,
}: FrontEndHost): ConnectedServer => ({ hardwareId, port, isLocal });

/** Where a successful connection navigates: the server's UI (AC-DT19) at the
 * given path — the login hand-off (./discoveryReturn.ts § handoffPath), an
 * argument rather than a FrontEndHost field because it is per-ATTEMPT data
 * (it carries the return URL and the language active at click time,
 * AC-DT23/24), never part of a server's identity or its remembered record. */
export const connectUrl = (server: FrontEndHost, path: string): string =>
  `${serverUrl(server)}/${path}`;

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
// address, is ignored rather than listed as an unusable entry. Hosts hand
// announcements over verbatim (hostContract.ts § RawAnnouncement), so this
// is THE filter, not a defensive copy of a host's.
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
// - canhost=true — this machine COULD run the server everyone uses, but which
//   role it plays has not been decided by the install (spec/android §
//   deployment modes: "the role is a deployment fact, not a build"). Only
//   then is the mode chooser offered, once, and the answer remembered
//   (§ install mode below). A desktop client install never sets it, so it
//   goes straight to the list as it always has (AC-DT3).
export type DiscoveryFlags = {
  autoconnect: boolean;
  timedout: boolean;
  standalone: boolean;
  canHostServer: boolean;
};

export const parseDiscoveryFlags = (search: string): DiscoveryFlags => {
  const params = new URLSearchParams(search);
  return {
    autoconnect: params.get('autoconnect') !== 'false',
    timedout: params.get('timedout') === 'true',
    standalone: params.get('standalone') === 'true',
    canHostServer: params.get('canhost') === 'true',
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
  (flags.standalone ? '&standalone=true' : '') +
  (flags.canHostServer ? '&canhost=true' : '');

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

// --- Install mode ---------------------------------------------------------
// Which role this install plays (spec/android § deployment modes): 'server' —
// this device runs the server other devices connect to — or 'client'.
// Undefined means nobody has said yet, which is what puts the chooser on
// screen, and only where the machine could actually be either
// (DiscoveryFlags.canHostServer).
//
// Page-owned, exactly like the remembered server above: the shell always
// boots this page and THIS decides what renders, so no host carries mode
// logic that could drift from the other's. The desktop's `standalone=true` is
// a different thing — a launch fact from an install built that way
// (AC-DT20) — and it always wins over anything stored here.
//
// Key and encoding match the legacy screen's (`preference/mode`, a
// JSON-encoded string), so an upgrade keeps its answer. The legacy 'none'
// simply fails the check below and the chooser is offered again.

export type InstallMode = 'client' | 'server';

const MODE_KEY = 'preference/mode';

export const readInstallMode = (
  storage = defaultStorage()
): InstallMode | undefined => {
  try {
    const raw = storage?.getItem(MODE_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return parsed === 'client' || parsed === 'server' ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const recordInstallMode = (
  mode: InstallMode,
  storage = defaultStorage()
): void => {
  try {
    storage?.setItem(MODE_KEY, JSON.stringify(mode));
  } catch {
    // Blocked storage only costs the next launch its chooser again.
  }
};

// --- Adopting what the legacy shell stored --------------------------------

/** Take over the legacy shell's saved answers, once.
 *
 * The legacy app stored preferences per platform: localStorage under
 * `preference/<key>` on the web and in Electron's renderer, but Android's
 * native Preferences (SharedPreferences) on a device
 * (client/packages/common/src/hooks/useNativeClient/helpers.ts). This page
 * can only read the former — so on an upgraded tablet the remembered server
 * and the chosen mode are both invisible, and the user re-picks each of them
 * for no reason.
 *
 * A host that can read that native store states the raw values as facts
 * (HostInfo.legacy) and this decides what to do with them: adopt only where
 * the page has written nothing itself, because anything the page wrote is by
 * definition the newer answer. Values are stored verbatim — the readers above
 * already reject anything unusable, so a stale or foreign record costs
 * nothing. One-way: nothing is ever written back to the legacy store. */
export const adoptLegacyPreferences = (
  legacy: HostInfo['legacy'],
  storage = defaultStorage()
): void => {
  if (!legacy || !storage) return;
  const adopt = (key: string, value: string | undefined) => {
    if (value && storage.getItem(key) === null) storage.setItem(key, value);
  };
  try {
    adopt(PREVIOUS_SERVER_KEY, legacy.previousServer);
    adopt(MODE_KEY, legacy.mode);
  } catch {
    // Blocked storage: the user re-picks once, as they would have anyway.
  }
};

// --- Connection attempt -----------------------------------------------------

/** One connection attempt, its ordering owned here so it is testable and no
 * host can get it wrong: probe first — a failed check resolves false and the
 * window stays on the page, list intact (AC-DT12); then record the choice —
 * only a server that ANSWERED is ever remembered (AC-DT13/14, and
 * spec/desktop/README.md § Status: the legacy shell's remember-at-choice gap,
 * deliberately not reproduced); then navigate. Recording BEFORE navigation is
 * the point: the old bridge resolved a fused check-and-navigate and every
 * host invented its own grace delay (50/0/400 ms) for the page to persist
 * under teardown — here there is nothing to race.
 *
 * `remember: false` is the standalone install's arm: it always reconnects to
 * its own server, so there is nothing to record (AC-DT20/21). */
export const connectToServer = async (
  host: Pick<DiscoveryHostApi, 'probe' | 'navigate'>,
  server: FrontEndHost,
  {
    path,
    remember,
    storage,
  }: { path: string; remember: boolean; storage?: Storage }
): Promise<boolean> => {
  const answered = await host
    .probe(probeUrl(server), ANSWER_CHECK_TIMEOUT_MS)
    .catch(() => false);
  if (!answered) return false;
  if (remember) recordPreviousServer(server, storage);
  host.navigate(connectUrl(server, path), connectedServer(server));
  return true;
};
