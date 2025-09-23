import { Currencies, useCurrency } from '@openmsupply-client/common';
import { useCurrencyList } from '@openmsupply-client/system';

export const usePurchaseOrderFormatCurrency = (currencyId?: string | null) => {
  const { data } = useCurrencyList();
  const currency = data?.nodes.find(currency => currency.id === currencyId);
  const currencyCode = currency?.code ? currency?.code : 'USD';
  const { c, options } = useCurrency(currencyCode as Currencies);

  return {
    c: (value: number | null | undefined) => c(value ?? 0).format(),
    symbol: options.symbol,
  };
};
