import { splitProps } from 'solid-js';
import { locale } from '../../../intl/intl';
import {
  getCurrencyInfo,
  homeCurrency,
  type CurrencyDisplay,
} from '../../../intl/currency';
import { NumberField, type NumberFieldProps } from './NumberField';

export interface CurrencyFieldProps extends Omit<
  NumberFieldProps,
  'noFormatting' | 'startAdornment' | 'endAdornment'
> {
  /**
   * ISO 4217 code, for amounts in a specific (e.g. foreign supplier)
   * currency. Defaults to the store's home currency.
   */
  currency?: string;
  /** Symbol style in the field chrome: "$" (default) / "US$" / "USD". */
  currencyDisplay?: CurrencyDisplay;
}

/*
 * Currency input — a NumberField whose decimal rules come from the currency
 * and whose symbol sits in the field chrome (TextField adornment), never in
 * the text: the input value stays a pure number, so the entire NumberField
 * machinery (gate, eager valid commits, blur canonicalisation, paste repair —
 * "$1,234.56" pastes fine) is inherited unchanged. Old OMS's CurrencyInput
 * was instead a second, parallel implementation over a third-party widget,
 * and its intermediate-state logic drifted (typing "20" never committed
 * eagerly — its trailing-zero check matched any zero); wrapping makes that
 * class of drift impossible.
 *
 * Per-currency behaviour is derived, not tabled (see getCurrencyInfo):
 * decimalLimit/decimalMin default to the currency's minor units — USD gets
 * 2 dp with "1" padding to "1.00" on blur; JPY/XOF get 0 dp and the decimal
 * point simply isn't typeable. Both stay overridable (unit costs at 4 dp are
 * a real OMS need: decimalLimit={4} keeps blur padding at the currency's 2).
 * The symbol side follows the locale ("$1,234.56" vs "1 234,56 €") and flips
 * logically under RTL; the amount's digits/separators follow the app locale
 * like every NumberField.
 *
 * TODO(home-currency): `currency` defaults to homeCurrency(), which is still
 * a USD-seeded signal — the real source is the entered store's
 * `UserStoreNode.homeCurrencyCode` (already in the schema, not yet fetched).
 * Wiring: add the field to the auth UserInfo fragment (src/api/auth.graphql +
 * pnpm codegen) and call setHomeCurrency(...) from StoreGuardLayout's entry
 * effect. See the matching TODO in src/intl/currency.ts.
 */
export const CurrencyField = (props: CurrencyFieldProps) => {
  const [local, rest] = splitProps(props, [
    'currency',
    'currencyDisplay',
    'decimalLimit',
    'decimalMin',
  ]);
  const info = () =>
    getCurrencyInfo(
      local.currency ?? homeCurrency(),
      locale(),
      local.currencyDisplay
    );
  const decimalLimit = () => local.decimalLimit ?? info().decimals;
  const decimalMin = () =>
    local.decimalMin ?? Math.min(info().decimals, decimalLimit());

  return (
    <NumberField
      {...rest}
      decimalLimit={decimalLimit()}
      decimalMin={decimalMin()}
      startAdornment={info().side === 'start' ? info().symbol : undefined}
      endAdornment={info().side === 'end' ? info().symbol : undefined}
    />
  );
};
