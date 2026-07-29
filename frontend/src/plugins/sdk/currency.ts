/*
 * The entered store's currency precision, as one accessor.
 *
 * The host's own currency layer takes three inputs (the store's home currency,
 * the active locale, and a display style) to produce symbol + side + decimals;
 * a plugin needs only the decimals, and should not have to know how the host
 * resolves them. Reactive — it reads `homeCurrency()` and `locale()`, so a
 * store switch or a language change reaches a plugin's arithmetic without the
 * plugin subscribing to anything.
 */
import { getCurrencyInfo, homeCurrency, locale } from '../../intl';

export const currencyDecimals = (): number =>
  getCurrencyInfo(homeCurrency(), locale()).decimals;
