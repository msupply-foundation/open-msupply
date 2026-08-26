/*
 * The plugin i18n surface (spec/plugins/rules.md § internationalisation).
 *
 * A plugin's keys live under a namespace equal to its code, so plugins can
 * never collide with the host or each other. `pluginIntl(code)` is the whole
 * mechanism: it prefixes every lookup with `${code}:` and hands it to the
 * host's own translator, so a plugin string resolves through the same ladder as
 * a host one (active locale → English → the key itself) and re-renders on a
 * locale switch for free.
 *
 * Registering the plugin's bundled catalogues under that namespace is the
 * loader's job; until a catalogue is registered, `t()` renders the namespaced
 * key — visible, never blank (spec/i18n/behaviours.md § translating text).
 */
import {
  getCurrencyInfo,
  homeCurrency,
  locale,
  t,
  tPlural,
  type LocaleKey,
} from '../intl';

export interface PluginIntl {
  /** Translate one of the plugin's keys, interpolating `{{ tokens }}`. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Translate a pluralised key (the catalogue holds `${key}_${category}`). */
  tPlural: (
    key: string,
    count: number,
    vars?: Record<string, string | number>
  ) => string;
}

export const pluginIntl = (code: string): PluginIntl => {
  // `as LocaleKey` — the host's key union is generated from its own catalogue,
  // so a plugin key is never in it. Trusted-layer cast (kdd/type-safety): the
  // namespace prefix is what makes the widened key safe.
  const namespaced = (key: string) => `${code}:${key}` as LocaleKey;
  return {
    t: (key, vars) => t(namespaced(key), vars),
    tPlural: (key, count, vars) => tPlural(namespaced(key), count, vars),
  };
};

/*
 * Formatting and direction, re-exported unchanged: a plugin MUST format
 * numbers and dates through the host so digit systems and date order follow
 * the app's locale (sdk-contract § internationalisation), and `locale`/`isRtl`
 * are reactive accessors, so reading them inside a component tracks a switch.
 */
export {
  locale,
  isRtl,
  formatNumber,
  round,
  roundTo,
  localisedDate,
  localisedTime,
  localisedDateTime,
} from '../intl';
export type { SupportedLocale } from '../intl';

/*
 * The entered store's currency precision, as one accessor.
 *
 * The host's own currency layer takes three inputs (the store's home currency,
 * the active locale, and a display style) to produce symbol + side + decimals;
 * a plugin needs only the decimals, and should not have to know how the host
 * resolves them. Any plugin doing money arithmetic needs it: a figure it
 * STORES or compares must be rounded to the currency, and hard-coding 2 is
 * wrong for the zero-decimal currencies this product actually runs on (XOF in
 * Côte d'Ivoire, among others). Reactive — it reads `homeCurrency()` and
 * `locale()`, so a store switch or a language change reaches a plugin's
 * arithmetic without the plugin subscribing to anything.
 */
export const currencyDecimals = (): number =>
  getCurrencyInfo(homeCurrency(), locale()).decimals;
