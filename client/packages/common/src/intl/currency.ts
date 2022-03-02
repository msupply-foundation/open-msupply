import currency from 'currency.js';
import { useCurrentLanguage } from './intlHelpers';

export const format: currency.Format = (
  currency,
  opts
  // opts: currency.Options & { groups: RegExp } - this is the correct type.
) => {
  if (!currency) return ':)';
  const {
    pattern = '',
    negativePattern = '',
    symbol = '$',
    separator = ',',
    decimal = '.',
    // Groups is in the options object, but the type is not right.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    groups = /(\d)(?=(\d{3})+\b)/g,
  } = opts ?? {};

  // Split the currency string into cents and dollars.
  const [dollars = '', cents = ''] = ('' + currency)
    .replace(/^-/, '')
    .split(decimal);

  // Add the separator to the end of each dollar group.
  const dollarsString = dollars.replace(groups, `$1${separator}`);
  const centsString = String(Number(`${decimal}${cents}`)).slice(1);

  // Combine together..
  const moneyString = `${dollarsString}${centsString}`;

  // Use either the positive or negative pattern.
  const replacePattern = currency.value >= 0 ? pattern : negativePattern;

  // Replace the ! with symbol and # with the full money string.
  return replacePattern.replace('!', symbol).replace('#', moneyString);
};

const currencyOptions = {
  en: {
    symbol: '$',
    separator: ',',
    decimal: '.',
    precision: 10,
    pattern: '!#',
    negativePattern: '-!#',
    format,
  },
  fr: {
    symbol: 'XOF',
    separator: '.',
    decimal: ',',
    precision: 2,
    pattern: '# !',
    negativePattern: '-# !',
    format,
  },
  ar: {
    symbol: 'ر.ق.',
    separator: ',',
    decimal: '.',
    precision: 2,
    pattern: '!#',
    negativePattern: '-!#',
    format,
  },
};

export const useCurrency = () => {
  const language = useCurrentLanguage();
  const options = currencyOptions[language];
  return {
    c: (value: currency.Any) => currency(value, options),
    options,
    language,
  };
};

export const useCurrencyFormat = (value: currency.Any) => {
  const { c } = useCurrency();
  return c(value).format();
};
