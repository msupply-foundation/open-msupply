// The currency domain module (kdd/domain-modules): the active-currencies
// cache and the lookup over it, shared by the invoice change-currency modal
// and the purchase-order toolbar.
export { CurrencySelect, currencyLabel } from './CurrencySelect';
export { currenciesResource, type Currency } from './currencyResource';
