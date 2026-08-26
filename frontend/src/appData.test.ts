import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLastLoginUsername,
  getPreferredPageSize,
  getPreviousStoreId,
  recordLastLoginUsername,
  recordPreferredPageSize,
  recordPreviousStoreId,
} from './appData';

// A minimal in-memory localStorage: app data is one JSON blob under one key, so
// the store doubles as the assertion surface for "what actually persisted".
const makeLocalStorage = (backing = new Map<string, string>()) =>
  ({
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => void backing.set(k, String(v)),
    removeItem: (k: string) => void backing.delete(k),
    clear: () => backing.clear(),
    key: (i: number) => [...backing.keys()][i] ?? null,
    get length() {
      return backing.size;
    },
  }) as Storage;

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lastLoginUsername (spec/startup rules § authentication)', () => {
  it('is undefined until a login has been recorded', () => {
    expect(getLastLoginUsername()).toBeUndefined();
  });

  it('round-trips the recorded username', () => {
    recordLastLoginUsername('alice');
    expect(getLastLoginUsername()).toBe('alice');
  });

  it('replaces the previous username rather than accumulating', () => {
    recordLastLoginUsername('alice');
    recordLastLoginUsername('bob');
    expect(getLastLoginUsername()).toBe('bob');
  });

  // It is device-scoped, not user-keyed: the login page asks before any user is
  // known, so it must not disturb (or be disturbed by) the user-keyed entries.
  it('shares the app-data blob without clobbering user-keyed entries', () => {
    recordPreviousStoreId('u1', 's1');
    recordLastLoginUsername('alice');

    expect(getPreviousStoreId('u1')).toBe('s1');
    expect(getLastLoginUsername()).toBe('alice');

    recordPreviousStoreId('u2', 's2');
    expect(getLastLoginUsername()).toBe('alice');
  });
});

describe('preferredPageSize (conventions § View state; issue #680)', () => {
  it('is undefined until the user has chosen a page size', () => {
    expect(getPreferredPageSize('u1')).toBeUndefined();
  });

  it('round-trips the recorded size, replacing rather than accumulating', () => {
    recordPreferredPageSize('u1', 50);
    expect(getPreferredPageSize('u1')).toBe(50);
    recordPreferredPageSize('u1', 100);
    expect(getPreferredPageSize('u1')).toBe(100);
  });

  // The point of keying by user: a shared device must not leak one user's
  // choice to another (same shape as previousStoreIdByUserId).
  it('keeps each user’s choice separate on a shared device', () => {
    recordPreferredPageSize('u1', 50);
    recordPreferredPageSize('u2', 10);
    expect(getPreferredPageSize('u1')).toBe(50);
    expect(getPreferredPageSize('u2')).toBe(10);
  });

  it('shares the app-data blob without clobbering other entries', () => {
    recordPreviousStoreId('u1', 's1');
    recordPreferredPageSize('u1', 50);
    expect(getPreviousStoreId('u1')).toBe('s1');
    expect(getPreferredPageSize('u1')).toBe(50);
  });
});

describe('storage failures never reach the caller', () => {
  // Writes sit on the login path (authContext.login records the username), so a
  // private-mode / disabled / full localStorage must not break auth — it just
  // doesn't remember.
  it('swallows a throwing setItem', () => {
    const storage = makeLocalStorage();
    vi.stubGlobal('localStorage', {
      ...storage,
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });

    expect(() => recordLastLoginUsername('alice')).not.toThrow();
    expect(getLastLoginUsername()).toBeUndefined();
  });

  it('reads as empty when localStorage is absent entirely', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(getLastLoginUsername()).toBeUndefined();
    expect(() => recordLastLoginUsername('alice')).not.toThrow();
  });

  it('reads as empty over an unparseable blob', () => {
    const backing = new Map([['open-mSupply-app-data', 'not json']]);
    vi.stubGlobal('localStorage', makeLocalStorage(backing));
    expect(getLastLoginUsername()).toBeUndefined();
  });
});
