// DEV-ONLY mock of the discovery host, so `pnpm dev` can render
// /discovery.html in a plain browser tab. Imported only from entry.tsx's
// statically-false-in-production branch — never part of a build a shell
// loads.
//
// As faithful to a real shell as a tab allows, at the SAME contract
// (hostContract.ts): primitive facts and capabilities only, all policy left
// to the page. A browser cannot browse mDNS, so instead of announcing
// invented LAN servers the mock probes this machine's usual dev backend
// ports and announces whatever answers — real servers, announced with this
// mock-machine's own hardware id so the page's locality marking (a
// hardware-id compare, discovery.ts § isLocalServer) is exercised end to
// end. probe() is the shell's bounded answer check as a tab can do it;
// navigate() is immediate — the page persists before calling it, so a mock
// needing a grace delay here would be reproducing the race the contract
// removed.
//
// Scenario switches (query params, composable with the page's own flags):
//   ?mock=none — nothing announces: the bounded wait's not-found outcome
//   ?mock=fail — every probe refused: the failed-choice paths
import type { DiscoveryHostApi, RawAnnouncement } from './hostContract';

// Ports a dev backend habitually listens on in this repo's setups.
const LOCAL_CANDIDATE_PORTS = [8000, 8008, 8010];

// The mock machine's id — announced on every found server, so they all carry
// the this-machine mark (they ARE this machine's).
const DEV_HARDWARE_ID = 'DEV-LOCAL';

// Bounded probe: does anything answer HTTP at this address? `no-cors` keeps a
// cross-origin server's opaque answer countable as "answered" — reachability,
// not a readable body.
//
// Weaker than a real shell's on purpose, because a tab cannot do better: the
// hosts require a SUCCESSFUL status (hostContract.ts § probe) and an opaque
// response reports none, so this mock still accepts an address that answers
// 404. The one thing that costs — a server's discovery port passing the check
// — is a dev-mock-only difference; check that path against a shell.
const answers = async (url: string, timeoutMs: number): Promise<boolean> => {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    await fetch(url, { mode: 'no-cors', signal: abort.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const scenario = new URLSearchParams(window.location.search).get('mock');

// Real local servers found by probing — announced as they land.
let found: RawAnnouncement[] = [];

const probeLocalServers = () => {
  for (const port of LOCAL_CANDIDATE_PORTS) {
    void answers(`http://127.0.0.1:${port}/`, 1500).then(up => {
      if (up)
        found.push({
          protocol: 'http',
          ip: '127.0.0.1',
          port,
          clientVersion: 'dev',
          hardwareId: DEV_HARDWARE_ID,
        });
    });
  }
};

/** Install the mock as the injected host (the same slot an Electron preload
 * fills) and return it. */
export const installDevHostMock = (): DiscoveryHostApi => {
  const mock: DiscoveryHostApi = {
    hostInfo: async () => ({
      // 'electron' in the sense that matters: an injected-global host. A tab
      // has no reachable-by-others address to offer, so local servers stay
      // listed at loopback (toFrontEndHost keeps the resolved address when
      // lanAddresses is empty) — which in a tab they genuinely are.
      platform: 'electron',
      hardwareId: DEV_HARDWARE_ID,
      lanAddresses: [],
    }),
    startDiscovery: () => {
      // The host's half of a clean restart (hostContract.ts: "clearing prior
      // results"); the list's own reset is the page's (AC-DT11).
      found = [];
      if (scenario !== 'none') probeLocalServers();
    },
    announcements: async () => ({ announcements: [...found] }),
    probe: (url, timeoutMs) =>
      scenario === 'fail' ? Promise.resolve(false) : answers(url, timeoutMs),
    navigate: (url, server) => {
      console.info('[devHostMock] navigating to', url, server);
      window.location.assign(url);
    },
  };
  window.discoveryHostApi = mock;
  return mock;
};
