import { useCurrencyList } from '@openmsupply-client/system';

export const useCurrencyConversion = () => {
  const { data } = useCurrencyList();

  const getRate = (code: string) =>
    data?.nodes?.find(currency => currency.code === code)?.rate;

  const convertByRate = (
    value: number,
    fromCurrencyCode: string,
    toCurrencyCode: string
  ) => {
    const fromRate = getRate(fromCurrencyCode);
    const toRate = getRate(toCurrencyCode);
    if (!fromRate || !toRate) return value;
    return (value / fromRate) * toRate;
  };

  return {
    convertByRate,
  };
};
