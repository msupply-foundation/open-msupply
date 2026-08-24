import { describe, expect, it } from 'vitest';
import { discoveryReturnUrl, handoffPath, withLng } from './discoveryReturn';

describe('handoffPath → discoveryReturnUrl round trip (AC-DT16)', () => {
  it('lands on login carrying the way back', () => {
    const path = handoffPath('http://localhost:3005/discovery.html?autoconnect=false');
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
});

describe('language carried both ways', () => {
  it('the hand-off names the active language as ?lng=', () => {
    const path = handoffPath('http://localhost:3005/discovery.html?autoconnect=false', 'ar');
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
    expect(withLng('http://localhost:3005/discovery.html?autoconnect=false', 'prs')).toBe(
      'http://localhost:3005/discovery.html?autoconnect=false&lng=prs'
    );
    expect(withLng('http://x.test/d.html?lng=ar', 'en')).toBe(
      'http://x.test/d.html?lng=en'
    );
  });

  it('withLng leaves an unparseable url alone', () => {
    expect(withLng('not a url', 'ar')).toBe('not a url');
  });
});
