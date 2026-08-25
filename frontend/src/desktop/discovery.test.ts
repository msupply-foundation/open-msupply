import { describe, expect, it } from 'vitest';
import type { FrontEndHost } from './hostBridge';
import {
  autoconnectTarget,
  discoveryReturnAddress,
  frontEndHostDisplay,
  isCompleteAnnouncement,
  mergeServers,
  parseDiscoveryFlags,
  parseManualServer,
  readPreviousServer,
  recordPreviousServer,
  serverKey,
  STANDALONE_LOCAL_SERVER,
  standaloneSeededFailure,
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
      path: 'login',
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
    });
  });

  it('reads the shell-set parameters', () => {
    expect(
      parseDiscoveryFlags('?autoconnect=false&timedout=true&standalone=true')
    ).toEqual({ autoconnect: false, timedout: true, standalone: true });
  });
});

describe('autoconnectTarget', () => {
  const flags = { autoconnect: true, timedout: false, standalone: false };
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
  const flags = { autoconnect: true, timedout: false, standalone: false };

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

  it('does not carry timedout — it described the arrival, not the return', () => {
    expect(
      discoveryReturnAddress(location, { ...flags, timedout: true })
    ).not.toContain('timedout');
  });
});

describe('standaloneSeededFailure', () => {
  const flags = { autoconnect: true, timedout: false, standalone: true };

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
      })
    ).toBe(false);
  });
});

describe('previous server persistence (AC-DT13–15)', () => {
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
