import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDictionary } from './loadDictionary';
import { dictionaries } from './intl';

/*
 * The dictionary half of the equal-data dedup (kdd/state-management decision
 * 5): the dict is rebuilt on every load, so `merge` compares structurally and
 * an unchanged reload publishes nothing — the `dictionaries` record keeps its
 * identity, so t()'s consumers are never notified. Distinct locales per test —
 * the dictionaries signal is module state. localStorage is absent in node, so
 * the cache is inert and every load takes the bundled+custom path.
 */

// Stub the custom-translations endpoint with one response per expected load.
// undefined → a not-ok response, which fetchCustomTranslations maps to {}.
const stubCustomTranslations = (
  bodies: (Record<string, string> | undefined)[]
) => {
  // 'dev' disables the localStorage cache outright (cacheEnabled), keeping
  // every load on the bundled+custom path this test exercises.
  vi.stubGlobal('LANG_VERSION', 'dev');
  const fetchMock = vi.fn();
  for (const body of bodies) {
    fetchMock.mockResolvedValueOnce(
      body === undefined
        ? { ok: false, status: 404 }
        : { ok: true, status: 200, json: async () => body }
    );
  }
  vi.stubGlobal('fetch', fetchMock);
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadDictionary', () => {
  it('an unchanged reload publishes nothing — the record keeps its identity', async () => {
    stubCustomTranslations([undefined, undefined]);
    await loadDictionary('fr');
    const held = dictionaries();
    await loadDictionary('fr');
    expect(dictionaries()).toBe(held);
  });

  it('a changed reload publishes — the locale entry updates', async () => {
    stubCustomTranslations([undefined, { 'custom.key': 'Hola' }]);
    await loadDictionary('es');
    const held = dictionaries();
    await loadDictionary('es');
    expect(dictionaries()).not.toBe(held);
    expect(dictionaries().es?.['custom.key']).toBe('Hola');
  });
});
