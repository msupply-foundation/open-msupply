import currency from 'currency.js';
import { IntlUtils } from '../utils';

const trimCents = (centsString: string) => {
  const trimmed = Number(`.${centsString}`);

  // If the result is an empty string, return .00
  if (!trimmed) {
    return '00';
  }

  // Trimmed is some number with just one decimal place.
  if (String(trimmed).length < 4) {
    return `${String(trimmed)[2]}0`;
  }

  // Other cases, return the full string, excluding the decimal
  return String(trimmed).slice(2);
};

/**
 * This custom formatter is a slight modification to the default within
 * currency.js here: https://github.com/scurker/currency.js/blob/66b7a0c6860d5d30efe8edbf4f8ea016149eab55/src/currency.js#L96-L105
 *
 * All it does differently is add the trimming of cents with trimCents.
 *
 * Without this, using a high precision i.e. 4, will have a currency formatter to always have
 * at least 4 decimal digits.
 *
 */

export const format: currency.Format = (
  currency,
  opts
  // opts: currency.Options & { groups: RegExp } - this is the correct type.
) => {
  if (!currency) return '';
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
    .split('.');

  // Add the separator to the end of each dollar group.
  const dollarsString = dollars.replace(groups, `$1${separator}`);
  const centsString = `${decimal}${trimCents(cents)}`;

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
    precision: 2,
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

export const useCurrency = (dp?: number) => {
  const language = IntlUtils.useCurrentLanguage();
  const options = currencyOptions[language];
  const precision = dp ?? options.precision;
  return {
    c: (value: currency.Any) => currency(value, { ...options, precision }),
    options,
    language
  }
};

export const useFormatCurrency = (dp?: number) => {
  const { c } = useCurrency(dp);
  return (value: currency.Any) => c(value).format();
};

export const useCurrencyFormat = (value: currency.Any) => {
  const { c } = useCurrency();
  return c(value).format();
};
