import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prefersOldUi, recordPrefersOldUi } from './preferredFrontend';

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

describe('prefersOldUi (spec/startup § old-UI switch)', () => {
  it('defaults to false — a device that has never switched shows the new UI', () => {
    expect(prefersOldUi()).toBe(false);
  });

  it('is true once the old-UI switch has been followed', () => {
    recordPrefersOldUi();
    expect(prefersOldUi()).toBe(true);
  });

  // A future old-UI-side "switch to new UI" link writes its own value into
  // this same key (deliberately not this app's format) rather than removing
  // it — anything other than the literal "old" must read back as false.
  it('treats any value other than the literal "old" as new', () => {
    localStorage.setItem('oms-preferred-frontend', 'new');
    expect(prefersOldUi()).toBe(false);
  });

  it('reads as false when localStorage is absent entirely', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(prefersOldUi()).toBe(false);
    expect(() => recordPrefersOldUi()).not.toThrow();
  });

  it('swallows a throwing setItem', () => {
    vi.stubGlobal('localStorage', {
      ...makeLocalStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });

    expect(() => recordPrefersOldUi()).not.toThrow();
  });
});
