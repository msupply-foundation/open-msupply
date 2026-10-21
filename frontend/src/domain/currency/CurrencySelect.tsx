import { type JSX } from 'solid-js';
import { t } from '../../intl';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { currenciesResource, type Currency } from './currencyResource';

export interface CurrencySelectProps {
  /** Selected currency id (undefined = none). */
  value?: string;
  /** The picked currency — with its rate, which follows the currency. */
  onChange: (currency: Currency | null) => void;
  label: string;
  hideLabel?: boolean;
  size?: 'default' | 'small';
  disabled?: boolean;
  /** `data-testid` for the text `<input>` (e2e/TESTIDS.md). */
  inputTestId?: string;
}

export const currencyLabel = (currency: Currency): string =>
  currency.isHomeCurrency
    ? `${currency.code} (${t('label.home')})`
    : currency.code;

export const CurrencySelect = (props: CurrencySelectProps): JSX.Element => (
  <Combobox<Currency>
    label={props.label}
    hideLabel={props.hideLabel}
    size={props.size}
    items={currenciesResource.noSuspense()}
    maxVisibleOptions={Infinity}
    loading={currenciesResource.loading()}
    itemToString={currencyLabel}
    itemToValue={currency => currency.id}
    value={props.value}
    disabled={props.disabled}
    inputTestId={props.inputTestId}
    onChange={currency => props.onChange(currency)}
  />
);
