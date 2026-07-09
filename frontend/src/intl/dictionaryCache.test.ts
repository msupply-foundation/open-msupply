import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readCache, writeCache, clearCache } from './dictionaryCache';

// dictionaryCache depends on two globals the browser supplies: localStorage and
// the webpack-injected LANG_VERSION. Stub both for the node test environment.
const store = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', localStorageStub);
  vi.stubGlobal('LANG_VERSION', 'v1');
});
afterEach(() => vi.unstubAllGlobals());

describe('dictionaryCache', () => {
  it('round-trips a dictionary', () => {
    writeCache('en', { 'login.title': 'Log in' });
    expect(readCache('en')).toEqual({ 'login.title': 'Log in' });
  });

  it('misses when LANG_VERSION changes', () => {
    writeCache('en', { 'login.title': 'Log in' });
    vi.stubGlobal('LANG_VERSION', 'v2'); // new build shipped
    expect(readCache('en')).toBeUndefined();
  });

  it('misses when the entry is older than the TTL', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    vi.spyOn(Date, 'now').mockReturnValueOnce(eightDaysAgo); // stamp the write
    writeCache('en', { 'login.title': 'Log in' });
    expect(readCache('en')).toBeUndefined();
  });

  it('clears an entry', () => {
    writeCache('fr', { 'login.title': 'Connexion' });
    clearCache('fr');
    expect(readCache('fr')).toBeUndefined();
  });
});
