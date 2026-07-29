import { beforeEach, describe, expect, it } from 'vitest';
import { setDictionaries, setLocale, t } from './intl';
import {
  clearPluginTranslations,
  registerPluginTranslations,
} from './pluginTranslations';

// The plugin dictionary layer (spec/plugins/rules.md § internationalisation,
// AC-PLUG-I1/I2). Keys are namespaced by plugin code — what `pluginIntl(code)`
// looks up — so these tests translate through the host's own `t()` with the
// namespaced key, exactly as a contribution does.
const key = (namespaced: string) => t(namespaced as never);

beforeEach(() => {
  clearPluginTranslations();
  setDictionaries({});
  setLocale('en');
});

describe('registerPluginTranslations', () => {
  it('resolves a plugin key in the active locale', () => {
    registerPluginTranslations('civ_plugins', { en: { amc: 'AMC' } });
    expect(key('civ_plugins:amc')).toBe('AMC');
  });

  it('renders the namespaced key itself when unregistered (AC-PLUG-I1)', () => {
    expect(key('civ_plugins:amc')).toBe('civ_plugins:amc');
    registerPluginTranslations('civ_plugins', { en: { amc: 'AMC' } });
    expect(key('civ_plugins:nope')).toBe('civ_plugins:nope');
  });

  it('falls back to the plugin`s English string for a locale it does not ship', () => {
    registerPluginTranslations('civ_plugins', { en: { amc: 'AMC' } });
    setLocale('fr');
    expect(key('civ_plugins:amc')).toBe('AMC');
  });

  it('prefers the active locale over the plugin`s English', () => {
    registerPluginTranslations('civ_plugins', {
      en: { amc: 'AMC' },
      fr: { amc: 'CMM' },
    });
    setLocale('fr');
    expect(key('civ_plugins:amc')).toBe('CMM');
    setLocale('en');
    expect(key('civ_plugins:amc')).toBe('AMC');
  });

  it('namespaces per plugin, so two plugins cannot collide', () => {
    registerPluginTranslations('alpha', { en: { label: 'Alpha' } });
    registerPluginTranslations('beta', { en: { label: 'Beta' } });
    expect(key('alpha:label')).toBe('Alpha');
    expect(key('beta:label')).toBe('Beta');
  });

  it('lets a host/custom entry for the same namespaced key WIN (AC-PLUG-I2)', () => {
    // A server custom translation arrives in the HOST dictionary; the plugin
    // layer sits beneath it, so the server's string is what renders.
    registerPluginTranslations('civ_plugins', { en: { amc: 'AMC' } });
    setDictionaries({ en: { 'civ_plugins:amc': 'CMM (deployment override)' } });
    expect(key('civ_plugins:amc')).toBe('CMM (deployment override)');
  });

  it('survives a locale switch replacing the whole host dictionary', () => {
    // `loadDictionary` merges with `{ ...previous, [locale]: dict }` — a WHOLE
    // per-locale replacement. Anything merged into the host dictionaries would be
    // lost here; a separate layer is not.
    registerPluginTranslations('civ_plugins', {
      en: { amc: 'AMC' },
      fr: { amc: 'CMM' },
    });
    setDictionaries({ en: { dashboard: 'Dashboard' } });
    expect(key('civ_plugins:amc')).toBe('AMC');

    // The locale switch: a fresh dictionary object for the new locale, exactly as
    // loadDictionary produces it.
    setDictionaries(previous => ({
      ...previous,
      fr: { dashboard: 'Tableau' },
    }));
    setLocale('fr');
    expect(t('dashboard')).toBe('Tableau');
    expect(key('civ_plugins:amc')).toBe('CMM');

    // …and back, including a cache-busting reload of the English dictionary.
    setDictionaries(previous => ({
      ...previous,
      en: { dashboard: 'Dashboard' },
    }));
    setLocale('en');
    expect(key('civ_plugins:amc')).toBe('AMC');
  });

  it('leaves host keys untouched', () => {
    registerPluginTranslations('civ_plugins', {
      en: { amc: 'AMC', dashboard: 'Should not shadow the host' },
    });
    setDictionaries({ en: { dashboard: 'Dashboard' } });
    // The plugin's own `dashboard` is namespaced, so it cannot shadow the host's.
    expect(t('dashboard')).toBe('Dashboard');
    expect(key('civ_plugins:dashboard')).toBe('Should not shadow the host');
  });

  it('ignores a plugin with no translations', () => {
    expect(() =>
      registerPluginTranslations('civ_plugins', undefined)
    ).not.toThrow();
    expect(key('civ_plugins:amc')).toBe('civ_plugins:amc');
  });

  it('re-registering one plugin only replaces its own keys', () => {
    registerPluginTranslations('alpha', { en: { label: 'Alpha' } });
    registerPluginTranslations('beta', { en: { label: 'Beta' } });
    registerPluginTranslations('alpha', { en: { label: 'Alpha v2' } });
    expect(key('alpha:label')).toBe('Alpha v2');
    expect(key('beta:label')).toBe('Beta');
  });
});
