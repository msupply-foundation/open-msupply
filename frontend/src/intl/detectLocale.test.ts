import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectLocale } from './detectLocale';

// detectLocale reads three browser globals; stub all of them for the node test
// environment (cf. dictionaryCache.test.ts). Each test sets only the signals it
// cares about — an unset one is absent, so resolution falls through to the
// next.
const store = new Map<string, string>();
const setUp = (opts: {
  search?: string;
  last?: string;
  browser?: string[];
}) => {
  store.clear();
  if (opts.last) store.set('oms_i18n_last_locale', opts.last);
  vi.stubGlobal('window', { location: { search: opts.search ?? '' } });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.stubGlobal('navigator', { languages: opts.browser ?? [] });
};

beforeEach(() => setUp({}));
afterEach(() => vi.unstubAllGlobals());

describe('detectLocale (AC-TR13/14/23)', () => {
  it('resolves in order: query, last-used, browser, default', () => {
    setUp({ search: '?lng=ru', last: 'pt', browser: ['es'] });
    expect(detectLocale()).toBe('ru');

    setUp({ last: 'pt', browser: ['es'] });
    expect(detectLocale()).toBe('pt');

    setUp({ browser: ['es'] });
    expect(detectLocale()).toBe('es');

    setUp({});
    expect(detectLocale()).toBe('en');
  });

  it('tolerates a regional tag on an unsupported variant', () => {
    setUp({ browser: ['pt-BR'] });
    expect(detectLocale()).toBe('pt');
  });

  it('prefers a supported regional variant over its base, in any casing', () => {
    setUp({ browser: ['fr-DJ'] });
    expect(detectLocale()).toBe('fr-DJ');

    setUp({ search: '?lng=fr-dj' });
    expect(detectLocale()).toBe('fr-DJ');
  });

  it('skips preferred languages it does not support', () => {
    setUp({ browser: ['de', 'zh-Hans', 'ru'] });
    expect(detectLocale()).toBe('ru');
  });
});
