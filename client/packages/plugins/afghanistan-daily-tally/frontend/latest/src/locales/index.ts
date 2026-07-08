import type { TOptions } from 'i18next';
import { useTranslation } from '@openmsupply-client/common';
import en from './en.json';

/**
 * Custom-translation namespace admins upload plugin overrides under (matches the
 * `plugin_code`). Also consumed by the upload-artifact generator
 * (`scripts/build-custom-translations.js`). This is the single place to adjust
 * if the host's plugin-namespace wiring changes.
 */
export const PLUGIN_NAMESPACE = 'afghanistan_plugins';

// Local copy of the host's plural-key normaliser (not exported from `common`
// yet — see https://github.com/msupply-foundation/open-msupply/issues/11923).
// Lets keys like `foo_one` / `foo_other` also satisfy the base key `foo`.
type WithOrWithoutPlural<K> =
  K extends `${infer B}_${'zero' | 'one' | 'two' | 'few' | 'many' | 'other'}`
    ? B | K
    : K;

/** Valid translation keys for this plugin, derived from `en.json`. */
export type PluginLocaleKey = WithOrWithoutPlural<keyof typeof en>;

const defaults = en as Record<string, string>;

/**
 * Typed translation hook for the plugin. Wraps the host `useTranslation` so that:
 * - call sites are type-checked against `PluginLocaleKey` (keys live in `en.json`);
 * - the bundled English from `en.json` is always supplied as the i18next
 *   `defaultValue`, so the plugin renders correctly even with no custom
 *   translations uploaded;
 * - when an admin uploads overrides (under the `PLUGIN_NAMESPACE` namespace),
 *   i18next returns those in preference to the bundled default.
 *
 * Interim until #11923 lands a host-provided `createPluginTranslation` helper;
 * the `en.json` keys carry over unchanged at that point.
 */
export const usePluginTranslation = () => {
  const t = useTranslation();
  return (key: PluginLocaleKey, options?: TOptions): string =>
    (t as unknown as (k: string, o?: TOptions) => string)(key, {
      defaultValue: defaults[key as string],
      ...options,
    });
};

/**
 * Translates a dynamic config label (demographic group name, counter name,
 * summary table title, etc.). Falls back to the raw string when no locale
 * entry matches so free-text admin labels are always displayed as entered.
 */
export const usePluginLabelTranslation = () => {
  const t = useTranslation();
  return (label: string): string =>
    (t as unknown as (k: string, o?: TOptions) => string)(label, {
      defaultValue: label,
    });
};
