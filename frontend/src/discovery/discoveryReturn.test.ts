import { describe, expect, it } from 'vitest';
import {
  discoveryReturnUrl,
  handoffPath,
  rememberedDiscoveryReturn,
  withLng,
} from './discoveryReturn';

describe('handoffPath → discoveryReturnUrl round trip (AC-DT16)', () => {
  it('lands on login carrying the way back', () => {
    const path = handoffPath(
      'http://localhost:3005/discovery.html?autoconnect=false'
    );
    expect(path.startsWith('login?discovery-return=')).toBe(true);
    const search = path.slice('login'.length);
    expect(discoveryReturnUrl(search)).toBe(
      'http://localhost:3005/discovery.html?autoconnect=false'
    );
  });
});

describe('discoveryReturnUrl', () => {
  it('absent parameter reads as undefined', () => {
    expect(discoveryReturnUrl('')).toBeUndefined();
    expect(discoveryReturnUrl('?tab=ledger')).toBeUndefined();
  });

  it.each([
    ['script scheme', '?discovery-return=javascript%3Aalert(1)'],
    ['custom scheme', '?discovery-return=app%3A%2F%2Fdiscovery'],
    ['relative path', '?discovery-return=%2Fdiscovery.html'],
    ['garbage', '?discovery-return=not%20a%20url'],
  ])('drops a %s rather than rendering it', (_, search) => {
    expect(discoveryReturnUrl(search)).toBeUndefined();
  });

  // The parameter rides in a URL anyone can craft and share; the link it
  // renders sits on the server's own login screen, so an off-machine address
  // would be a "change server" affordance pointing anywhere.
  it.each([
    [
      'a public host',
      '?discovery-return=https%3A%2F%2Fevil.example%2Fdiscovery.html',
    ],
    [
      'a LAN host',
      '?discovery-return=http%3A%2F%2F192.168.1.9%3A8317%2Fdiscovery.html',
    ],
    [
      'a loopback-lookalike host',
      '?discovery-return=https%3A%2F%2Flocalhost.evil.example%2Fx',
    ],
  ])('drops %s — the way back is always loopback', (_, search) => {
    expect(discoveryReturnUrl(search)).toBeUndefined();
  });

  it.each([
    ["Electron's fixed loopback port", 'http://127.0.0.1:8317/discovery.html'],
    ["Android's capacitor local origin", 'https://localhost/discovery.html'],
    ['the dev server', 'http://localhost:3005/discovery.html'],
  ])('accepts %s', (_, url) => {
    expect(
      discoveryReturnUrl(`?discovery-return=${encodeURIComponent(url)}`)
    ).toBe(url);
  });
});

describe('language carried both ways', () => {
  it('the hand-off names the active language as ?lng=', () => {
    const path = handoffPath(
      'http://localhost:3005/discovery.html?autoconnect=false',
      'ar'
    );
    expect(path.endsWith('&lng=ar')).toBe(true);
    // and the return URL inside survives intact
    expect(discoveryReturnUrl('?' + path.split('?')[1])).toBe(
      'http://localhost:3005/discovery.html?autoconnect=false'
    );
  });

  it('omits lng when none is given', () => {
    expect(handoffPath('http://x.test/d.html')).not.toContain('lng=');
  });

  it('withLng sets the language on the way back, replacing a stale one', () => {
    expect(
      withLng('http://localhost:3005/discovery.html?autoconnect=false', 'prs')
    ).toBe('http://localhost:3005/discovery.html?autoconnect=false&lng=prs');
    expect(withLng('http://x.test/d.html?lng=ar', 'en')).toBe(
      'http://x.test/d.html?lng=en'
    );
  });

  it('withLng leaves an unparseable url alone', () => {
    expect(withLng('not a url', 'ar')).toBe('not a url');
  });
});

describe('rememberedDiscoveryReturn', () => {
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
  const arrival =
    '?discovery-return=http%3A%2F%2F127.0.0.1%3A8317%2Fdiscovery.html';
  const url = 'http://127.0.0.1:8317/discovery.html';

  it('survives the served app navigating away from the hand-off URL', () => {
    const storage = memoryStorage();
    expect(rememberedDiscoveryReturn(arrival, storage)).toBe(url);
    // the app has since routed elsewhere and, on sign-out, rendered login back
    // over a route with no query on it at all
    expect(rememberedDiscoveryReturn('', storage)).toBe(url);
    expect(rememberedDiscoveryReturn('?tab=ledger', storage)).toBe(url);
  });

  it('offers nothing when this window never arrived from discovery', () => {
    expect(rememberedDiscoveryReturn('', memoryStorage())).toBeUndefined();
  });

  it('a fresh arrival replaces what was remembered', () => {
    const storage = memoryStorage();
    rememberedDiscoveryReturn(arrival, storage);
    const other =
      '?discovery-return=http%3A%2F%2Flocalhost%3A8318%2Fdiscovery.html';
    expect(rememberedDiscoveryReturn(other, storage)).toBe(
      'http://localhost:8318/discovery.html'
    );
    expect(rememberedDiscoveryReturn('', storage)).toBe(
      'http://localhost:8318/discovery.html'
    );
  });

  it('re-validates what it stored, so a tampered store is no more trusted', () => {
    const storage = memoryStorage();
    storage.setItem('preference/discovery-return', 'https://evil.example/x');
    expect(rememberedDiscoveryReturn('', storage)).toBeUndefined();
    storage.setItem('preference/discovery-return', 'javascript:alert(1)');
    expect(rememberedDiscoveryReturn('', storage)).toBeUndefined();
  });

  // Passing `undefined` would select the default parameter and reach the real
  // sessionStorage, so a refusing one is how "storage is unavailable" gets
  // expressed — which is also the case that actually happens (private
  // browsing, blocked site data).
  it('survives a storage that refuses', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;

    // still answers from the URL it arrived on...
    expect(rememberedDiscoveryReturn(arrival, blocked)).toBe(url);
    // ...and simply has nothing to offer once that is gone
    expect(rememberedDiscoveryReturn('', blocked)).toBeUndefined();
  });
});
