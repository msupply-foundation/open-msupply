import { describe, expect, it, vi } from 'vitest';
import type { HostInfo, RawAnnouncement } from './hostContract';
import {
  adoptLegacyPreferences,
  ANSWER_CHECK_TIMEOUT_MS,
  autoconnectTarget,
  connectToServer,
  connectUrl,
  discoveryReturnAddress,
  frontEndHostDisplay,
  isCompleteAnnouncement,
  isLocalServer,
  mergeServers,
  parseDiscoveryFlags,
  parseManualServer,
  readInstallMode,
  recordInstallMode,
  probeUrl,
  readPreviousServer,
  recordPreviousServer,
  serverKey,
  STANDALONE_LOCAL_SERVER,
  standaloneSeededFailure,
  toFrontEndHost,
  type FrontEndHost,
} from './discovery';

const host = (overrides: Partial<FrontEndHost> = {}): FrontEndHost => ({
  protocol: 'https',
  port: 8000,
  ip: '192.168.1.10',
  clientVersion: '3.1.0',
  hardwareId: 'HW-A',
  isLocal: false,
  ...overrides,
});

describe('isCompleteAnnouncement (AC-DT7)', () => {
  it('accepts a complete announcement', () => {
    expect(isCompleteAnnouncement(host())).toBe(true);
  });

  it.each([
    ['missing hardware id', host({ hardwareId: '' })],
    ['missing client version', host({ clientVersion: '' })],
    ['missing address', host({ ip: '' })],
    ['port zero', host({ port: 0 })],
    ['fractional port', host({ port: 80.5 })],
    [
      'unknown protocol',
      host({ protocol: 'ftp' as unknown as FrontEndHost['protocol'] }),
    ],
  ])('ignores an announcement with %s', (_, incomplete) => {
    expect(isCompleteAnnouncement(incomplete)).toBe(false);
  });
});

describe('mergeServers', () => {
  it('accumulates fresh servers (AC-DT5)', () => {
    const merged = mergeServers([host()], [host({ hardwareId: 'HW-B' })]);
    expect(merged.map(serverKey)).toEqual(['HW-A:8000', 'HW-B:8000']);
  });

  it('never lists the same server twice (AC-DT8)', () => {
    const merged = mergeServers(
      [host()],
      [
        host(),
        host(),
        host({ hardwareId: 'HW-B' }),
        host({ hardwareId: 'HW-B' }),
      ]
    );
    expect(merged.map(serverKey)).toEqual(['HW-A:8000', 'HW-B:8000']);
  });

  it('keeps two instances on one machine apart (same hardware id, different port)', () => {
    const merged = mergeServers([host()], [host({ port: 8001 })]);
    expect(merged).toHaveLength(2);
  });

  it('drops incomplete announcements while keeping complete ones (AC-DT7)', () => {
    const merged = mergeServers(
      [],
      [host({ hardwareId: '' }), host({ hardwareId: 'HW-B' })]
    );
    expect(merged.map(serverKey)).toEqual(['HW-B:8000']);
  });

  it('returns the current array itself when nothing new arrived (no identity churn)', () => {
    const current = [host()];
    expect(mergeServers(current, [host()])).toBe(current);
    expect(mergeServers(current, [])).toBe(current);
  });
});

describe('frontEndHostDisplay', () => {
  it('shows scheme, host and port', () => {
    expect(frontEndHostDisplay(host())).toBe('https://192.168.1.10:8000');
  });

  it('elides default ports', () => {
    expect(frontEndHostDisplay(host({ port: 443 }))).toBe(
      'https://192.168.1.10'
    );
    expect(frontEndHostDisplay(host({ protocol: 'http', port: 80 }))).toBe(
      'http://192.168.1.10'
    );
  });
});

describe('parseManualServer (AC-DT14)', () => {
  it('parses a full URL', () => {
    expect(parseManualServer('https://10.1.1.5:8000', 'UUID-1')).toEqual({
      protocol: 'https',
      ip: '10.1.1.5',
      port: 8000,
      clientVersion: 'unspecified',
      hardwareId: 'UUID-1',
      isLocal: false,
    });
  });

  it('defaults the port by scheme when none is given', () => {
    expect(parseManualServer('https://oms.example.org', 'U')?.port).toBe(443);
    expect(parseManualServer('http://oms.example.org', 'U')?.port).toBe(80);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseManualServer('  https://10.1.1.5:8000  ', 'U')?.ip).toBe(
      '10.1.1.5'
    );
  });

  it.each([
    ['not a URL', 'demo server'],
    ['scheme only', 'https://'],
    ['non-http scheme', 'ftp://10.1.1.5'],
    ['empty', ''],
  ])('rejects %s', (_, value) => {
    expect(parseManualServer(value, 'U')).toBeUndefined();
  });
});

describe('parseDiscoveryFlags', () => {
  it('defaults: autoconnect on, nothing timed out, client mode', () => {
    expect(parseDiscoveryFlags('')).toEqual({
      autoconnect: true,
      timedout: false,
      standalone: false,
      canHostServer: false,
    });
  });

  it('reads canhost, the flag that offers the mode chooser (AC-AN21)', () => {
    expect(parseDiscoveryFlags('?canhost=true').canHostServer).toBe(true);
    // absent on every desktop client install, which goes straight to the list
    expect(parseDiscoveryFlags('').canHostServer).toBe(false);
    expect(parseDiscoveryFlags('?canhost=yes').canHostServer).toBe(false);
  });

  it('reads the shell-set parameters', () => {
    expect(
      parseDiscoveryFlags('?autoconnect=false&timedout=true&standalone=true')
    ).toEqual({
      autoconnect: false,
      timedout: true,
      standalone: true,
      canHostServer: false,
    });
  });
});

describe('autoconnectTarget', () => {
  const flags = {
    autoconnect: true,
    timedout: false,
    standalone: false,
    canHostServer: false,
  };
  const previous = host();

  it('goes to the remembered server without asking (AC-DT1)', () => {
    expect(autoconnectTarget(flags, previous)).toBe(previous);
  });

  it('a first launch stays on discovery (AC-DT3)', () => {
    expect(autoconnectTarget(flags, undefined)).toBeUndefined();
  });

  it('does not reconnect after the launch check failed (AC-DT2)', () => {
    expect(
      autoconnectTarget({ ...flags, timedout: true }, previous)
    ).toBeUndefined();
  });

  it('does not bounce back after an explicit return to discovery (AC-DT16)', () => {
    expect(
      autoconnectTarget({ ...flags, autoconnect: false }, previous)
    ).toBeUndefined();
  });

  it('a standalone install always uses its own server (AC-DT20)', () => {
    expect(autoconnectTarget({ ...flags, standalone: true }, previous)).toBe(
      STANDALONE_LOCAL_SERVER
    );
    expect(autoconnectTarget({ ...flags, standalone: true }, undefined)).toBe(
      STANDALONE_LOCAL_SERVER
    );
  });
});

describe('discoveryReturnAddress (AC-DT16, AC-DT20)', () => {
  const location = {
    origin: 'http://localhost:3007',
    pathname: '/discovery.html',
  };
  const flags = {
    autoconnect: true,
    timedout: false,
    standalone: false,
    canHostServer: false,
  };

  it('returns without auto-connection (AC-DT16)', () => {
    expect(discoveryReturnAddress(location, flags)).toBe(
      'http://localhost:3007/discovery.html?autoconnect=false'
    );
  });

  it('carries the standalone mode, so the way back never offers the chooser (AC-DT20)', () => {
    expect(
      discoveryReturnAddress(location, { ...flags, standalone: true })
    ).toBe(
      'http://localhost:3007/discovery.html?autoconnect=false&standalone=true'
    );
  });

  it('carries canhost, so the way back can still offer the chooser', () => {
    expect(
      discoveryReturnAddress(location, { ...flags, canHostServer: true })
    ).toContain('&canhost=true');
    expect(discoveryReturnAddress(location, flags)).not.toContain('canhost');
  });

  it('does not carry timedout — it described the arrival, not the return', () => {
    expect(
      discoveryReturnAddress(location, { ...flags, timedout: true })
    ).not.toContain('timedout');
  });
});

describe('standaloneSeededFailure', () => {
  const flags = {
    autoconnect: true,
    timedout: false,
    standalone: true,
    canHostServer: false,
  };

  it('a plain standalone launch attempts its own server — nothing seeded', () => {
    expect(standaloneSeededFailure(flags)).toBe(false);
  });

  it('states the failure when no attempt will be made, instead of an undriven spinner', () => {
    expect(standaloneSeededFailure({ ...flags, autoconnect: false })).toBe(
      true
    );
    expect(standaloneSeededFailure({ ...flags, timedout: true })).toBe(true);
  });

  it('client mode is never the standalone stated error', () => {
    expect(
      standaloneSeededFailure({
        autoconnect: false,
        timedout: true,
        standalone: false,
        canHostServer: false,
      })
    ).toBe(false);
  });
});

const memoryStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: key => void map.delete(key),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
};

describe('install mode (AC-AN21)', () => {
  it('round-trips the chosen role', () => {
    const storage = memoryStorage();
    recordInstallMode('server', storage);
    expect(readInstallMode(storage)).toBe('server');
    recordInstallMode('client', storage);
    expect(readInstallMode(storage)).toBe('client');
  });

  it('nothing chosen reads as undefined — that is what offers the chooser', () => {
    expect(readInstallMode(memoryStorage())).toBeUndefined();
  });

  it("the legacy screen's 'none' counts as undecided, not as a role", () => {
    const storage = memoryStorage();
    // exactly what the legacy setPreference wrote: JSON.stringify(NativeMode)
    storage.setItem('preference/mode', '"none"');
    expect(readInstallMode(storage)).toBeUndefined();
  });

  it('reads a role the legacy screen wrote, so an upgrade is not re-asked', () => {
    const storage = memoryStorage();
    storage.setItem('preference/mode', '"server"');
    expect(readInstallMode(storage)).toBe('server');
  });

  it('ignores anything else rather than rendering an impossible arm', () => {
    const storage = memoryStorage();
    for (const raw of ['not json', '"nonsense"', '42', 'null']) {
      storage.setItem('preference/mode', raw);
      expect(readInstallMode(storage)).toBeUndefined();
    }
  });

  it('survives an absent storage', () => {
    expect(readInstallMode(undefined)).toBeUndefined();
    expect(() => recordInstallMode('client', undefined)).not.toThrow();
  });
});

describe('adoptLegacyPreferences (Android upgrades)', () => {
  const legacyServer = JSON.stringify(host());

  it("takes over the legacy store's values when this page has none", () => {
    const storage = memoryStorage();
    adoptLegacyPreferences(
      { mode: '"client"', previousServer: legacyServer },
      storage
    );
    expect(readInstallMode(storage)).toBe('client');
    expect(readPreviousServer(storage)).toEqual(host());
  });

  it('never overwrites what this page already wrote — that answer is newer', () => {
    const storage = memoryStorage();
    recordInstallMode('server', storage);
    const chosen = parseManualServer('https://10.9.9.9:8000', 'U2')!;
    recordPreviousServer(chosen, storage);

    adoptLegacyPreferences(
      { mode: '"client"', previousServer: legacyServer },
      storage
    );

    expect(readInstallMode(storage)).toBe('server');
    expect(readPreviousServer(storage)?.ip).toBe('10.9.9.9');
  });

  it('a host with no legacy store to read changes nothing', () => {
    const storage = memoryStorage();
    adoptLegacyPreferences(undefined, storage);
    expect(readInstallMode(storage)).toBeUndefined();
    expect(readPreviousServer(storage)).toBeUndefined();
  });

  it('adopted junk is rejected by the readers, not by adoption', () => {
    const storage = memoryStorage();
    adoptLegacyPreferences(
      { mode: '"none"', previousServer: 'not json' },
      storage
    );
    expect(readInstallMode(storage)).toBeUndefined();
    expect(readPreviousServer(storage)).toBeUndefined();
  });

  it('survives an absent storage', () => {
    expect(() =>
      adoptLegacyPreferences({ mode: '"client"' }, undefined)
    ).not.toThrow();
  });
});

describe('previous server persistence (AC-DT13–15)', () => {
  it('round-trips the last successful connection', () => {
    const storage = memoryStorage();
    recordPreviousServer(host(), storage);
    expect(readPreviousServer(storage)).toEqual(host());
  });

  it('a later record wins — chosen or manual alike (AC-DT15)', () => {
    const storage = memoryStorage();
    recordPreviousServer(host(), storage);
    const manual = parseManualServer('https://10.9.9.9:8000', 'U2');
    recordPreviousServer(manual!, storage);
    expect(readPreviousServer(storage)?.ip).toBe('10.9.9.9');
  });

  it('nothing remembered reads as undefined', () => {
    expect(readPreviousServer(memoryStorage())).toBeUndefined();
  });

  it('ignores an unusable stored record rather than auto-attempting it', () => {
    const storage = memoryStorage();
    storage.setItem('preference/previousServer', '{"ip":""}');
    expect(readPreviousServer(storage)).toBeUndefined();
    storage.setItem('preference/previousServer', 'not json');
    expect(readPreviousServer(storage)).toBeUndefined();
    storage.setItem('preference/previousServer', '"a string"');
    expect(readPreviousServer(storage)).toBeUndefined();
  });

  it('survives an absent storage (node, blocked storage)', () => {
    expect(readPreviousServer(undefined)).toBeUndefined();
    expect(() => recordPreviousServer(host(), undefined)).not.toThrow();
  });
});

const announcement = (
  overrides: Partial<RawAnnouncement> = {}
): RawAnnouncement => ({
  protocol: 'https',
  port: 8000,
  ip: '192.168.1.10',
  clientVersion: '3.1.0',
  hardwareId: 'HW-A',
  ...overrides,
});

const info = (overrides: Partial<HostInfo> = {}): HostInfo => ({
  platform: 'electron',
  hardwareId: 'HW-THIS',
  lanAddresses: ['192.168.1.20'],
  ...overrides,
});

describe('isLocalServer (spec/android § server discovery, AC-DT5)', () => {
  it('marks a server by hardware id, never by address', () => {
    // Announced at loopback — an address compare would call this remote.
    expect(
      isLocalServer(
        announcement({ hardwareId: 'HW-THIS', ip: '127.0.0.1' }),
        info()
      )
    ).toBe(true);
    // Announced at this machine's own LAN address but a DIFFERENT machine's
    // id — an address compare would call this local.
    expect(isLocalServer(announcement({ ip: '192.168.1.20' }), info())).toBe(
      false
    );
  });

  it('matches case-insensitively (machine_uid vs a shell reading the same OS id)', () => {
    expect(
      isLocalServer(
        announcement({ hardwareId: 'ab-cd-ef' }),
        info({ hardwareId: 'AB-CD-EF' })
      )
    ).toBe(true);
  });

  it('never matches when either side has no id — the mark just never shows', () => {
    expect(
      isLocalServer(
        announcement({ hardwareId: 'HW-THIS' }),
        info({ hardwareId: '' })
      )
    ).toBe(false);
    expect(
      isLocalServer(announcement({ hardwareId: '' }), info({ hardwareId: '' }))
    ).toBe(false);
  });
});

describe('toFrontEndHost (AC-DT22 address rewriting)', () => {
  const local = { hardwareId: 'HW-THIS' };

  it("rewrites this machine's server to an address other machines can reach", () => {
    // Loopback (desktop's old special case) and an arbitrary interface's
    // address (Android's NsdManager resolution) rewrite alike.
    expect(
      toFrontEndHost(announcement({ ...local, ip: '127.0.0.1' }), info()).ip
    ).toBe('192.168.1.20');
    expect(
      toFrontEndHost(announcement({ ...local, ip: '10.0.0.9' }), info()).ip
    ).toBe('192.168.1.20');
  });

  it('keeps an already-reachable resolution', () => {
    const resolved = toFrontEndHost(
      announcement({ ...local, ip: '192.168.1.20' }),
      info()
    );
    expect(resolved.ip).toBe('192.168.1.20');
    expect(resolved.isLocal).toBe(true);
  });

  it('keeps the resolved address when there is nothing better to offer (offline)', () => {
    expect(
      toFrontEndHost(
        announcement({ ...local, ip: '127.0.0.1' }),
        info({ lanAddresses: [] })
      ).ip
    ).toBe('127.0.0.1');
  });

  it("never rewrites another machine's server", () => {
    expect(toFrontEndHost(announcement({ ip: '127.0.0.1' }), info()).ip).toBe(
      '127.0.0.1'
    );
  });

  it('carries the identity attributes verbatim', () => {
    expect(toFrontEndHost(announcement(), info())).toEqual({
      protocol: 'https',
      port: 8000,
      ip: '192.168.1.10',
      clientVersion: '3.1.0',
      hardwareId: 'HW-A',
      isLocal: false,
    });
  });
});

describe('server URLs (single source for every host)', () => {
  it('probes where the GraphQL endpoint should be (AC-DT12)', () => {
    expect(probeUrl(host())).toBe('https://192.168.1.10:8000/graphql');
  });

  it('connects to the hand-off path (AC-DT19/23)', () => {
    expect(connectUrl(host(), 'login?x=1')).toBe(
      'https://192.168.1.10:8000/login?x=1'
    );
  });
});

describe('connectToServer (probe → record → navigate)', () => {
  const memoryStorage = (): Storage => {
    const map = new Map<string, string>();
    return {
      getItem: key => map.get(key) ?? null,
      setItem: (key, value) => void map.set(key, value),
      removeItem: key => void map.delete(key),
      clear: () => map.clear(),
      key: () => null,
      get length() {
        return map.size;
      },
    };
  };

  it('a failed probe leaves the window here: no record, no navigation (AC-DT12)', async () => {
    const storage = memoryStorage();
    const navigate = vi.fn();
    const connected = await connectToServer(
      { probe: async () => false, navigate },
      host(),
      { path: 'login', remember: true, storage }
    );
    expect(connected).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(readPreviousServer(storage)).toBeUndefined();
  });

  it('records BEFORE navigating — the ordering that made every host grace-delay unnecessary (AC-DT13/14)', async () => {
    const storage = memoryStorage();
    const order: string[] = [];
    const connected = await connectToServer(
      {
        probe: async () => true,
        navigate: () => {
          order.push('navigate');
          // The record must already be readable at the moment the host is
          // asked to tear the page down.
          expect(readPreviousServer(storage)).toEqual(host());
        },
      },
      host(),
      { path: 'login', remember: true, storage }
    );
    expect(connected).toBe(true);
    expect(order).toEqual(['navigate']);
  });

  it('navigates to the hand-off path with the page-owned timeout on the probe', async () => {
    const probe = vi.fn(async () => true);
    const navigate = vi.fn();
    await connectToServer({ probe, navigate }, host(), {
      path: 'login?discovery-return=x',
      remember: false,
    });
    expect(probe).toHaveBeenCalledWith(
      'https://192.168.1.10:8000/graphql',
      ANSWER_CHECK_TIMEOUT_MS
    );
    expect(navigate).toHaveBeenCalledWith(
      'https://192.168.1.10:8000/login?discovery-return=x',
      { hardwareId: 'HW-A', port: 8000, isLocal: false }
    );
  });

  // The host cannot answer a self-signed server's certificate error without
  // knowing whose server it is: its own it can prove exactly, anyone else's it
  // can only trust on first use, keyed by hardware id and port
  // (hostContract.ts § ConnectedServer, spec/android § connection trust).
  it('tells the host whose server it is, for certificate trust', async () => {
    const navigate = vi.fn();
    await connectToServer(
      { probe: async () => true, navigate },
      host({ hardwareId: 'HW-MINE', port: 8001, isLocal: true }),
      { path: 'login', remember: false }
    );
    expect(navigate).toHaveBeenLastCalledWith(expect.any(String), {
      hardwareId: 'HW-MINE',
      port: 8001,
      isLocal: true,
    });
  });

  it('a manually entered server has no announced id to key on', async () => {
    const navigate = vi.fn();
    const manual = parseManualServer('https://10.9.9.9:8000', 'UUID-1')!;
    await connectToServer({ probe: async () => true, navigate }, manual, {
      path: 'login',
      remember: false,
    });
    // parseManualServer mints an id purely to key the list entry; it is not an
    // announced hardware_id, and the host must not treat it as one.
    expect(navigate).toHaveBeenLastCalledWith(expect.any(String), {
      hardwareId: 'UUID-1',
      port: 8000,
      isLocal: false,
    });
  });

  it('remember: false (standalone) records nothing (AC-DT20/21)', async () => {
    const storage = memoryStorage();
    await connectToServer(
      { probe: async () => true, navigate: () => {} },
      STANDALONE_LOCAL_SERVER,
      { path: 'login', remember: false, storage }
    );
    expect(readPreviousServer(storage)).toBeUndefined();
  });

  it('a probe that rejects counts as unanswered, never as a crash', async () => {
    const navigate = vi.fn();
    const connected = await connectToServer(
      { probe: async () => Promise.reject(new Error('boom')), navigate },
      host(),
      { path: 'login', remember: false }
    );
    expect(connected).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
