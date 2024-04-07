import currency from 'currency.js';
import { useAuthContext } from '../../authentication';
import { MAX_FRACTION_DIGITS, useIntlUtils } from '../utils';

const trimCents = (centsString: string) => {
  const number = Number(`.${centsString}`);

  // If the result is an empty string, return .00
  if (!number) {
    return '00';
  }

  const trimmed = new Intl.NumberFormat('en', {
    maximumFractionDigits: MAX_FRACTION_DIGITS,
  }).format(number);
  // Trimmed is some number with just one decimal place.
  if (trimmed.length < 4) {
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

// Gets the canonical characters for number separator and decimal from
// Intl.NumberFormat. This is not always obvious (the " " used in French
// formatting, for example, is actual a "NARROW NO-BREAK SPACE" (CharCode 8239)
// even though it looks like a regular space (CharCode 32)), so for consistency
// this should be the source of truth.
const getSeparatorAndDecimal = (locale: string) => {
  const parts = new Intl.NumberFormat(locale).formatToParts(1000.1);
  const separator = parts.find(({ type }) => type === 'group')?.value ?? ',';
  const decimal = parts.find(({ type }) => type === 'decimal')?.value ?? '.';
  return { separator, decimal };
};

const getPatterns = (locale: string) => {
  switch (locale) {
    case 'fr-DJ':
    case 'fr':
    case 'ru':
      return { pattern: '# !', negativePattern: '-# !' };
    default:
      return { pattern: '!#', negativePattern: '-!#' };
  }
};

export type Currencies =
  | 'USD'
  | 'EUR'
  | 'NZD'
  | 'DJF'
  | 'QAR'
  | 'RUB'
  | 'SSP'
  | 'PGK'
  | 'COP'
  | 'SBD';

export const currencyOptions = (locale: string, code?: Currencies) => {
  switch (code) {
    case 'EUR':
      return {
        // eslint-disable-next-line no-irregular-whitespace
        // separator: " " decimal = ","
        ...getSeparatorAndDecimal(locale),
        ...getPatterns(locale),
        symbol: '€',
        precision: 2,
        format,
      };
    case 'DJF':
      return {
        // eslint-disable-next-line no-irregular-whitespace
        // separator: " " decimal = ","
        ...getSeparatorAndDecimal(locale),
        ...getPatterns(locale),
        symbol: 'DJF',
        precision: 0,
        format,
      };
    case 'QAR':
      return {
        // separator: "," decimal = "."
        ...getSeparatorAndDecimal(locale),
        ...getPatterns(locale),
        symbol: 'ر.ق.',
        precision: 2,
        format,
      };
    case 'RUB':
      return {
        // separator: "." decimal = ","
        ...getSeparatorAndDecimal(locale),
        ...getPatterns(locale),
        symbol: '₽',
        precision: 2,
        format,
      };
    case 'SSP': {
      return {
        // separator: "," decimal = "."
        ...getSeparatorAndDecimal(locale),
        ...getPatterns(locale),
        symbol: 'SSP',
        precision: 2,
        format,
      };
    }
    case 'PGK': {
      return {
        // separator: "." decimal = ","
        ...getSeparatorAndDecimal(locale),
        ...getPatterns(locale),
        symbol: 'K',
        precision: 2,
        format,
      };
    }
    case 'COP': {
      return {
        // separator: "." decimal = ","
        ...getSeparatorAndDecimal(locale),
        ...getPatterns(locale),
        symbol: '$',
        precision: 2,
        format,
      };
    }
    case 'SBD': {
      return {
        // separator: "," decimal = "."
        ...getSeparatorAndDecimal(locale),
        ...getPatterns(locale),
        symbol: 'SI$',
        precision: 2,
        format,
      };
    }
    case 'USD':
    case 'NZD':
    default:
      return {
        // separator: "," decimal = "."
        ...getSeparatorAndDecimal(locale),
        ...getPatterns(locale),
        symbol: '$',
        precision: 2,
        format,
      };
  }
};

export const useCurrency = (code?: Currencies) => {
  const { store } = useAuthContext();
  const { currentLanguage: language } = useIntlUtils();
  const currencyCode = code ? code : (store?.homeCurrencyCode as Currencies);

  const options = currencyOptions(language, currencyCode);
  return {
    c: (value: currency.Any, precision?: number) =>
      currency(value, {
        ...options,
        precision: precision ?? options.precision,
      }),
    options,
    currencyCode,
  };
};

export const useFormatCurrency = (code?: Currencies) => {
  const { c } = useCurrency(code);
  return (value: currency.Any) => c(value).format();
};
