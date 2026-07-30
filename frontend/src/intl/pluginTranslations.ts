import { createSignal } from 'solid-js';
import type { FlatDict, SupportedLocale } from './locales';

/*
 * The plugin dictionary layer (spec/plugins/rules.md § internationalisation).
 *
 * A plugin's bundled catalogues are registered here at load, namespaced by the
 * plugin's code (`${code}:${key}` — what `pluginIntl(code)` looks up). They
 * live in their OWN signal rather than being merged into `dictionaries`, for
 * one mechanical reason: `loadDictionary` replaces a locale's dictionary WHOLE
 * (`{ ...previous, [locale]: dict }`), so anything merged into it is lost the
 * next time that locale reloads — a locale switch, or a post-sync
 * custom-translation refresh. A separate layer survives both.
 *
 * The layer sits UNDER the host dictionaries in `intl.ts`, which is what gives
 * AC-PLUG-I2 for free: a server custom translation for a plugin's namespaced
 * key arrives in the host dictionary and therefore wins.
 */

const [pluginDictionaries, setPluginDictionaries] = createSignal<
  Partial<Record<SupportedLocale, FlatDict>>
>({});

/** The registered plugin catalogues, per locale. Read by `intl.ts`'s merge. */
export { pluginDictionaries };

/**
 * Register one plugin's message catalogues under its namespace.
 *
 * Additive across plugins and across locales: each plugin's keys are prefixed
 * with its own code, so two plugins can never collide and re-registering one
 * (dev hot reload) only overwrites its own keys. A plugin shipping only English
 * still resolves under any locale — the merge in `intl.ts` layers the English
 * plugin catalogue beneath the active-locale one, the same ladder host strings
 * use, so an untranslated plugin key falls back to English and then to the
 * namespaced key itself (AC-PLUG-I1).
 */
export const registerPluginTranslations = (
  code: string,
  translations:
    | Partial<Record<SupportedLocale, Readonly<Record<string, string>>>>
    | undefined
): void => {
  if (!translations) return;
  setPluginDictionaries(current => {
    const next: Partial<Record<SupportedLocale, FlatDict>> = { ...current };
    for (const [locale, messages] of Object.entries(translations)) {
      if (!messages) continue;
      const namespaced: FlatDict = {};
      for (const [key, value] of Object.entries(messages)) {
        namespaced[`${code}:${key}`] = value;
      }
      next[locale as SupportedLocale] = {
        ...next[locale as SupportedLocale],
        ...namespaced,
      };
    }
    return next;
  });
};

/** Drop every registered plugin catalogue. Tests and the dev loader only. */
export const clearPluginTranslations = (): void => {
  setPluginDictionaries({});
};
