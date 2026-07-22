import { createSignal } from 'solid-js';
import { intlNumberFormat } from './formatNumber';
import type { SupportedLocale } from './locales';
import { LOCALE_META } from './locales';

/**
 * Currency display metadata, derived from Intl rather than a hand-maintained
 * table (old OMS kept one per currency and it drifted — its KMF entry said
 * 2 decimals; ISO 4217 says 0). `decimals` is the currency's minor units
 * (USD 2, JPY/XOF/KMF 0); `side` is where the symbol sits relative to the
 * digits in the given locale ("$1,234.56" en-prefix vs "1 234,56 €" fr-suffix).
 */
export type CurrencyInfo = {
  symbol: string;
  side: 'start' | 'end';
  decimals: number;
};

/** How the symbol renders: "$" / "US$" / "USD". */
export type CurrencyDisplay = 'narrowSymbol' | 'symbol' | 'code';

const infoCache = new Map<string, CurrencyInfo>();

export const getCurrencyInfo = (
  code: string,
  locale: SupportedLocale,
  display: CurrencyDisplay = 'narrowSymbol'
): CurrencyInfo => {
  const key = `${LOCALE_META[locale].numberLocale}|${code}|${display}`;
  const cached = infoCache.get(key);
  if (cached) return cached;

  let info: CurrencyInfo;
  try {
    const format = intlNumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: display,
    });
    const decimals = format.resolvedOptions().maximumFractionDigits ?? 2;
    const parts = format.formatToParts(1);
    const symbolIndex = parts.findIndex(p => p.type === 'currency');
    const digitIndex = parts.findIndex(p => p.type === 'integer');
    info = {
      symbol: parts[symbolIndex]?.value ?? code,
      side:
        symbolIndex !== -1 && digitIndex !== -1 && symbolIndex < digitIndex
          ? 'start'
          : 'end',
      decimals,
    };
  } catch {
    // Unknown/invalid ISO code (Intl throws RangeError): self-label with the
    // code and assume 2 minor units.
    info = { symbol: code, side: 'start', decimals: 2 };
  }
  infoCache.set(key, info);
  return info;
};

/**
 * The active store's home currency (ISO 4217) — what CurrencyField defaults
 * to. Currency is a STORE property, not a language property (a Lao deployment
 * runs an English UI with Kip): the locale drives only separators, digits and
 * symbol placement.
 *
 * TODO: wire to the real store — the schema already exposes
 * `UserStoreNode.homeCurrencyCode`; add it to the auth UserInfo fragment's
 * stores nodes (src/api/auth.graphql + pnpm codegen) and call
 * `setHomeCurrency(store.homeCurrencyCode)` from StoreGuardLayout's entry
 * effect. Until then this stays at the USD seed (the showcase drives it from
 * a mock selector).
 */
const [homeCurrency, setHomeCurrencySignal] = createSignal('USD');
export { homeCurrency };

export const setHomeCurrency = (code: string | null | undefined): void => {
  setHomeCurrencySignal(code || 'USD');
};
