import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyUserLocale } from './changeLanguage';
import { locale, setLocale } from './intl';

// The asset loads are cache-first network reads, covered in their own tests;
// stubbed here so a switch only flips the signal and persists.
vi.mock('./loadDictionary', () => ({ loadDictionary: vi.fn() }));
vi.mock('./formatDateTime', () => ({ loadDateFnsLocale: vi.fn() }));

const store = new Map<string, string>();
const chooseFor = (username: string, chosen: string) =>
  store.set('oms_i18n_user_locale', JSON.stringify({ [username]: chosen }));

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  setLocale('en');
});
afterEach(() => vi.unstubAllGlobals());

describe('applyUserLocale (spec/i18n § choosing the locale)', () => {
  it("shows the profile's language when the user has chosen none", async () => {
    await applyUserLocale('alice', 'fr');

    expect(locale()).toBe('fr');
  });

  it("does not save the profile's language as the user's choice", async () => {
    await applyUserLocale('alice', 'fr');

    expect(store.get('oms_i18n_user_locale')).toBeUndefined();
    expect(store.get('oms_i18n_last_locale')).toBe('fr');
  });

  it("prefers the language the user chose in the app over the profile's", async () => {
    chooseFor('alice', 'pt');

    await applyUserLocale('alice', 'fr');

    expect(locale()).toBe('pt');
  });

  it("ignores another user's choice", async () => {
    chooseFor('bob', 'pt');

    await applyUserLocale('alice', 'fr');

    expect(locale()).toBe('fr');
  });

  it("keeps a regional variant of the profile's language", async () => {
    setLocale('fr-DJ');

    await applyUserLocale('alice', 'fr');

    expect(locale()).toBe('fr-DJ');
  });

  it('keeps the session language when the profile has none', async () => {
    setLocale('es');

    await applyUserLocale('alice', undefined);

    expect(locale()).toBe('es');
  });
});
