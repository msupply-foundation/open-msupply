// DEV-ONLY mock of the desktop host bridge, so `pnpm dev` can render
// /discovery.html in a plain browser tab. Imported only from entry.tsx's
// statically-false-in-production branch — never part of a build the shell
// loads.
//
// As faithful to a real shell as a tab allows. A browser cannot browse mDNS,
// so instead of announcing invented LAN servers the mock probes this
// machine's usual dev backend ports and announces whatever answers — real
// servers, marked as this machine's own (they are). connectToServer runs the
// same bounded answer check a shell does: no answer resolves
// { success: false } and the window stays here (AC-DT12); an answer gets the
// real thing — the window navigates to THAT server's own address and path,
// landing on whatever UI that server serves (AC-DT19).
//
// Scenario switches (query params, composable with the page's own flags):
//   ?mock=none — nothing announces: the bounded wait's not-found outcome
//   ?mock=fail — every connection attempt refused: the failed-choice paths
import type { DesktopHostApi, FrontEndHost } from './hostBridge';
import { frontEndHostDisplay } from './discovery';

// Ports a dev backend habitually listens on in this repo's setups.
const LOCAL_CANDIDATE_PORTS = [8000, 8008, 8010];

// Bounded probe: does anything answer HTTP at this address? `no-cors` keeps a
// cross-origin server's opaque answer countable as "answered" — the mock only
// needs reachability, not a readable body (the shell's check is the same
// yes/no).
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
let started = false;
// Real local servers found by probing — announced once discovered.
const localServers: FrontEndHost[] = [];
let probed = false;

const probeLocalServers = () => {
  if (probed) return;
  probed = true;
  for (const port of LOCAL_CANDIDATE_PORTS) {
    void answers(`http://127.0.0.1:${port}/graphql`, 1500).then(up => {
      if (up)
        localServers.push({
          protocol: 'http',
          ip: '127.0.0.1',
          port,
          clientVersion: 'dev',
          hardwareId: `LOCAL-${port}`,
          isLocal: true,
        });
    });
  }
};

export const installDevHostMock = (): void => {
  const mock: DesktopHostApi = {
    startServerDiscovery: () => {
      started = true;
      if (scenario !== 'none') probeLocalServers();
    },
    discoveredServers: async () =>
      scenario === 'none' || !started
        ? { servers: [] }
        : { servers: [...localServers] },
    connectToServer: async server => {
      // The shell's bounded answer check.
      const reachable =
        scenario !== 'fail' &&
        (await answers(
          `${server.protocol}://${server.ip}:${server.port}/graphql`,
          1500
        ));
      if (!reachable)
        return { success: false, error: 'mock: server did not answer' };
      // Answered: navigate to THAT server's UI, as the shell does — after a
      // beat, so the page gets its turn to record the choice first.
      const destination = `${frontEndHostDisplay(server)}/${server.path ?? ''}`;
      console.info('[devHostMock] connected — navigating to', destination);
      setTimeout(() => window.location.assign(destination), 400);
      return { success: true };
    },
    connectedServer: async () => null,
    goBackToDiscovery: () => {},
  };
  window.electronNativeAPI = mock;
};
