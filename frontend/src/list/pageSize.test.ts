import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The helper resolves the current user itself; drive identity directly so the
// tests cover both the logged-in and no-user paths. Storage is the real
// appData module over a stubbed localStorage (as in appData.test.ts).
const currentUserId = vi.fn<() => string | undefined>(() => undefined);
vi.mock('@/auth/authContext', () => ({
  currentUserId: () => currentUserId(),
}));

import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from './pageSize';

const makeLocalStorage = () => {
  const backing = new Map<string, string>();
  return {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => void backing.set(k, String(v)),
    removeItem: (k: string) => void backing.delete(k),
    clear: () => backing.clear(),
    key: (i: number) => [...backing.keys()][i] ?? null,
    get length() {
      return backing.size;
    },
  } as Storage;
};

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage());
  currentUserId.mockReturnValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('rows-per-page preference (conventions § View state; issue #680)', () => {
  it('starts at the app default until the user has chosen', () => {
    currentUserId.mockReturnValue('u1');
    expect(initialPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });

  it('a choice seeds every later fresh visit for that user', () => {
    currentUserId.mockReturnValue('u1');
    rememberPageSize(50);
    expect(initialPageSize()).toBe(50);
    rememberPageSize(100);
    expect(initialPageSize()).toBe(100);
  });

  it('never leaks one user’s choice to another on a shared device', () => {
    currentUserId.mockReturnValue('u1');
    rememberPageSize(50);
    currentUserId.mockReturnValue('u2');
    expect(initialPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });

  // Shouldn't happen in-app, but the helper must not throw or persist
  // anywhere shared when no user is known.
  it('with no user, reads the default and remembers nothing', () => {
    expect(initialPageSize()).toBe(DEFAULT_PAGE_SIZE);
    expect(() => rememberPageSize(50)).not.toThrow();
    currentUserId.mockReturnValue('u1');
    expect(initialPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });
});
